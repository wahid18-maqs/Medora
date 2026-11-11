from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import datetime, uuid
from bson.objectid import ObjectId
from crewai import Crew, Process
from agents import qa_agent
from task import qa_task
from db import reports_collection, chat_messages_collection
from clean_text import strip_markdown, sanitize_markdown
from profile import get_current_user_email
from store import IN_MEMORY_REPORTS

router = APIRouter()

# In-memory store fallback for chat messages when database is unreachable
IN_MEMORY_CHAT_MESSAGES: List[Dict[str, Any]] = []

class ChatMessagePayload(BaseModel):
    message: str = Field(..., min_length=1)

def find_report_document(report_id: str, user_email: str) -> Dict[str, Any]:
    """Find report document by analysis_id or Mongo ObjectId, scoped strictly to user."""
    report = None
    
    # Try finding by Mongo ObjectId if valid format
    if ObjectId.is_valid(report_id):
        try:
            report = reports_collection.find_one({"_id": ObjectId(report_id)})
        except Exception:
            pass

    # Try to find by analysis_id or file_name if not found by ObjectId
    if not report:
        try:
            report = reports_collection.find_one({
                "user_email": user_email,
                "$or": [
                    {"analysis_id": report_id},
                    {"file_name": report_id}
                ]
            })
        except Exception:
            pass

    # Fallback to IN_MEMORY_REPORTS if Mongo query yielded nothing
    if not report:
        for r in IN_MEMORY_REPORTS:
            if r.get("analysis_id") == report_id or r.get("file_name") == report_id or str(r.get("_id", "")) == report_id:
                report = r
                break

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Security ownership check: ensure report belongs to user if user_email is tagged
    doc_user = report.get("user_email")
    if doc_user and doc_user != user_email:
        raise HTTPException(status_code=403, detail="Access denied to this report")

    return report

@router.get("/reports/{report_id}/chat")
def get_chat_history(
    report_id: str,
    user_email: str = Depends(get_current_user_email)
):
    """GET full persisted message history for a report, sorted by timestamp ascending."""
    find_report_document(report_id, user_email)

    messages = []
    try:
        cursor = chat_messages_collection.find({"report_id": report_id, "user_email": user_email}).sort("timestamp", 1)
        for msg in cursor:
            messages.append({
                "id": str(msg.get("_id")),
                "report_id": msg.get("report_id"),
                "role": msg.get("role"),
                "content": strip_markdown(msg.get("content", "")) if msg.get("role") == "assistant" else msg.get("content"),
                "timestamp": msg.get("timestamp")
            })
    except Exception as err:
        print("MongoDB chat history fetch error, fallback to memory:", str(err))

    if not messages:
        for msg in IN_MEMORY_CHAT_MESSAGES:
            if msg.get("report_id") == report_id and msg.get("user_email") == user_email:
                messages.append({
                    "id": msg.get("id", str(uuid.uuid4())),
                    "report_id": msg.get("report_id"),
                    "role": msg.get("role"),
                    "content": strip_markdown(msg.get("content", "")) if msg.get("role") == "assistant" else msg.get("content"),
                    "timestamp": msg.get("timestamp")
                })

    return {"report_id": report_id, "messages": messages}


@router.get("/reports/{report_id}")
def get_report(report_id: str, user_email: str = Depends(get_current_user_email)):
    """Return a single saved analysis session for the authenticated user."""
    report = find_report_document(report_id, user_email)

    agents_raw = report.get("agents") if isinstance(report.get("agents"), dict) else {}
    agents = {
        key: sanitize_markdown(agents_raw.get(key)) if isinstance(agents_raw.get(key), str) else ""
        for key in ("medical", "verification", "nutrition", "exercise")
    }
    if not agents["medical"]:
        agents["medical"] = sanitize_markdown(report.get("analysis") or "")

    timestamp = report.get("timestamp")
    if isinstance(timestamp, datetime.datetime):
        timestamp = timestamp.isoformat()
    elif timestamp is not None:
        timestamp = str(timestamp)

    return {
        "analysis_id": report.get("analysis_id"),
        "report_type": report.get("report_type", "Routine"),
        "diagnostic_center": report.get("diagnostic_center", "Not specified"),
        "marker_warning": report.get("marker_warning"),
        "status": report.get("status", "Completed - Reviewed"),
        "file": report.get("file_name") or report.get("file") or "",
        "query": report.get("query", ""),
        "analysis": sanitize_markdown(report.get("analysis") or ""),
        "agents": agents,
        "markers": report.get("markers", []),
        "source_type": report.get("source_type", "PDF"),
        "report_date": report.get("report_date"),
        "timestamp": timestamp or "",
    }


@router.post("/reports/{report_id}/chat")
async def post_chat_message(
    report_id: str,
    payload: ChatMessagePayload,
    user_email: str = Depends(get_current_user_email)
):
    """POST a question against a report. Runs qa_agent + qa_task and persists Q&A pair."""
    report = find_report_document(report_id, user_email)

    # Assemble full context from all agents and markers
    context_sections = []
    
    # 1. Markers
    markers = report.get("markers", [])
    if markers:
        marker_lines = [f"- {m.get('name')}: {m.get('value')} {m.get('unit')} (Normal: {m.get('range', [])}, Status: {m.get('status')})" for m in markers]
        context_sections.append("Extracted Blood Markers:\n" + "\n".join(marker_lines))

    # 2. Agent findings
    agents_dict = report.get("agents", {})
    if agents_dict:
        for k in ["medical", "verification", "nutrition", "exercise"]:
            if agents_dict.get(k):
                context_sections.append(f"{k.capitalize()} Summary:\n{agents_dict[k]}")
    elif report.get("analysis"):
        context_sections.append(f"Analysis Summary:\n{report['analysis']}")

    report_text = "\n\n".join(context_sections) if context_sections else report.get("analysis", "No detailed report text available.")

    # 1. Fetch past conversation history
    history_res = get_chat_history(report_id, user_email)
    existing_messages = history_res.get("messages", [])

    # Guardrail:(sliding window)
    windowed_messages = existing_messages[-15:]
    history_str_list = [f"{m['role'].capitalize()}: {m['content']}" for m in windowed_messages]
    formatted_history = "\n".join(history_str_list) if history_str_list else "No prior conversation."

    # 2. Run Crew kickoff
    from agents import gemini_llm, groq_fallback_llm

    assistant_reply = None

    # Attempt 1: Gemini 3.5 Flash
    if gemini_llm:
        try:
            qa_agent.llm = gemini_llm
            qa_crew = Crew(
                agents=[qa_agent],
                tasks=[qa_task],
                process=Process.sequential,
                verbose=False
            )
            crew_result = await qa_crew.kickoff_async({
                "report_text": report_text,
                "conversation_history": formatted_history,
                "question": payload.message
            })
            assistant_reply = str(crew_result).strip()
        except Exception as gemini_err:
            print("Chat Gemini execution error, attempting fallback to Groq:", str(gemini_err))

    # Attempt 2: Groq Fallback
    if not assistant_reply and groq_fallback_llm:
        try:
            qa_agent.llm = groq_fallback_llm
            qa_crew = Crew(
                agents=[qa_agent],
                tasks=[qa_task],
                process=Process.sequential,
                verbose=False
            )
            crew_result = await qa_crew.kickoff_async({
                "report_text": report_text,
                "conversation_history": formatted_history,
                "question": payload.message
            })
            assistant_reply = str(crew_result).strip()
        except Exception as groq_err:
            print("Chat Groq execution error:", str(groq_err))

    # Attempt 3: Static fallback only if both APIs fail
    if not assistant_reply:
        assistant_reply = f"I evaluated your question regarding '{payload.message}'. Based on the report findings: {report_text[:200]}..."

    assistant_reply = strip_markdown(assistant_reply)

    now = datetime.datetime.utcnow().isoformat()

    # 3. Store user message in Memory
    user_doc = {
        "report_id": report_id,
        "user_email": user_email,
        "role": "user",
        "content": payload.message,
        "timestamp": now
    }

    # 4. Store assistant reply inMemory
    assistant_doc = {
        "report_id": report_id,
        "user_email": user_email,
        "role": "assistant",
        "content": assistant_reply,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

    try:
        chat_messages_collection.insert_one(user_doc)
        chat_messages_collection.insert_one(assistant_doc)
    except Exception as db_err:
        print("MongoDB chat insert fallback to memory:", str(db_err))
        IN_MEMORY_CHAT_MESSAGES.append(user_doc)
        IN_MEMORY_CHAT_MESSAGES.append(assistant_doc)

    return {
        "report_id": report_id,
        "user_message": payload.message,
        "reply": assistant_reply,
        "timestamp": now
    }
