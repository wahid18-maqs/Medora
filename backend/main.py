from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import re
import json
from dotenv import load_dotenv
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from crewai import Crew, Process
from agents import doctor, verifier, nutritionist, exercise_specialist, image_extractor
from task import help_patients, verification, nutrition_analysis, exercise_planning, image_extraction_task
from db import reports_collection
from clean_text import sanitize_markdown
from langchain_community.document_loaders import PyPDFLoader
from auth import router as auth_router
from profile import router as profile_router, get_current_user_email
from settings import router as settings_router
from support import router as support_router
from chat import router as chat_router
from tools import to_internal_marker

load_dotenv()

app = FastAPI(title="Blood Test Report Analyser")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(settings_router)
app.include_router(support_router)
app.include_router(chat_router)


class ConfirmedMarkerPayload(BaseModel):
    marker: str
    value: Any
    unit: str = ""
    reference_range: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    plausibility_warning: Optional[str] = None


class ConfirmImagePayload(BaseModel):
    markers: List[ConfirmedMarkerPayload] = Field(default_factory=list)
    lab_name: Optional[str] = None
    report_date: Optional[str] = None
    file_names: List[str] = Field(default_factory=list)
    query: str = "Summarise my Blood Test Report"


def extract_text_from_pdf(file_path: str) -> str:
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        return "\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print("Error reading PDF:", str(e))
        return ""

from store import IN_MEMORY_REPORTS

def extract_lab_name(text: str) -> str:
    """Best-effort extraction of a laboratory or diagnostic centre name."""
    for line in text.splitlines()[:30]:
        clean = " ".join(line.split()).strip(" :|-")
        if not (3 <= len(clean) <= 90):
            continue
        if re.search(r"\b(lab|laboratory|diagnostics?|pathology|hospital|clinic)\b", clean, re.IGNORECASE):
            return clean
    return "Not specified"


def parse_markers_from_text(text: str) -> List[Dict[str, Any]]:

    """Extract standard blood test markers using flexible regex parsing."""
    markers = []
    text_lower = text.lower()

    # Pattern matchers for common markers: (Name, regex_pattern, (low_ref, high_ref), default_unit)
    patterns = [
        ("Hemoglobin", r"(?:hemoglobin|hb)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(g/dl|g/l)?", (13.0, 17.0), "g/dL"),
        ("Fasting Glucose", r"(?:fasting glucose|glucose|blood sugar)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|mmol/l)?", (70.0, 99.0), "mg/dL"),
        ("Vitamin D", r"(?:vitamin d|25-oh vitamin d|vit d)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(ng/ml|nmol/l)?", (30.0, 100.0), "ng/mL"),
        ("Total Cholesterol", r"(?:total cholesterol|cholesterol)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|mmol/l)?", (125.0, 200.0), "mg/dL"),
        ("WBC", r"(?:wbc|white blood cell count|white blood cells)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(x10\^3/\xb5l|k/ul|10\^9/l)?", (4.5, 11.0), "x10^3/µL"),
        ("Platelets", r"(?:platelets|platelet count)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(x10\^3/\xb5l|k/ul)?", (150.0, 450.0), "x10^3/µL"),
        ("Triglycerides", r"(?:triglycerides)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl)?", (50.0, 150.0), "mg/dL"),
        ("Serum Iron", r"(?:iron|serum iron)\s*[:\-\=]?\s*(\d+(?:\.\d+)?)\s*(mcg/dl|\xb5g/dl)?", (60.0, 170.0), "mcg/dL"),
    ]

    for name, pattern, (low_ref, high_ref), default_unit in patterns:
        match = re.search(pattern, text_lower)
        if match:
            val = float(match.group(1))
            unit = match.group(2) if match.lastindex >= 2 and match.group(2) else default_unit
            status = "Normal"
            if val < low_ref:
                status = "Low"
            elif val > high_ref:
                status = "High"
            markers.append({
                "name": name,
                "value": val,
                "unit": unit,
                "range": [low_ref, high_ref],
                "status": status
            })

    return markers

def _agent_outputs_from_crew(crew_output) -> Dict[str, str]:
    task_outputs = getattr(crew_output, "tasks_output", [])
    return {
        "medical": str(task_outputs[1]) if len(task_outputs) > 1 else str(crew_output),
        "verification": str(task_outputs[0]) if len(task_outputs) > 0 else "Verification completed.",
        "nutrition": str(task_outputs[2]) if len(task_outputs) > 2 else "Nutrition evaluation completed.",
        "exercise": str(task_outputs[3]) if len(task_outputs) > 3 else "Exercise evaluation completed."
    }


def _marker_findings(markers: List[Dict[str, Any]]) -> str:
    if not markers:
        return "No markers could be extracted from this report, so marker-specific findings are unavailable."
    return "\n".join(
        f"- **{m['name']}**: {m['value']} {m['unit']} — **{m['status']}** (reference {m['range'][0]}–{m['range'][1]})"
        for m in markers
    )


async def run_crew_async(query: str, report: str, markers: List[Dict[str, Any]]):
    from agents import gemini_llm, groq_fallback_llm, set_agents_llm

    markers_json = json.dumps(markers, indent=2) if markers else "[]"
    kickoff_inputs = {
        "query": query,
        "report": report,
        "markers_json": markers_json,
    }

    # Attempt 1: Primary Gemini
    if gemini_llm:
        try:
            print("Running Crew with Primary Gemini...")
            set_agents_llm(gemini_llm)
            medical_crew = Crew(
                agents=[verifier, doctor, nutritionist, exercise_specialist],
                tasks=[verification, help_patients, nutrition_analysis, exercise_planning],
                process=Process.sequential,
                verbose=False,
            )
            crew_output = await medical_crew.kickoff_async(kickoff_inputs)
            return _agent_outputs_from_crew(crew_output)
        except Exception as gemini_err:
            print("Gemini execution error, attempting fallback to Groq:", str(gemini_err))

    # Attempt 2: Fallback to Groq via CrewAI
    if groq_fallback_llm:
        try:
            print("Running Crew with Fallback Groq LLM...")
            set_agents_llm(groq_fallback_llm)
            medical_crew = Crew(
                agents=[verifier, doctor, nutritionist, exercise_specialist],
                tasks=[verification, help_patients, nutrition_analysis, exercise_planning],
                process=Process.sequential,
                verbose=False,
            )
            crew_output = await medical_crew.kickoff_async(kickoff_inputs)
            return _agent_outputs_from_crew(crew_output)
        except Exception as groq_err:
            print("Groq execution error, running direct specialized LLM generation:", str(groq_err))

    # Attempt 3: Direct Groq generation, still constrained to extracted markers
    try:
        import requests
        groq_key = os.getenv("GROQ_API_KEY", "")
        headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
        marker_context = (
            f"Extracted marker list (authoritative JSON):\n{markers_json}\n\n"
            f"Blood Report Data:\n{report}"
        )
        consistency_rules = (
            "\n\nRules: only mention tests present in the authoritative marker JSON; "
            "use the exact Low/Normal/High statuses in that JSON; if the list is short, say the analysis is limited; "
            "if the list is empty, say no markers were extracted; do not invent findings. "
            "Return concise markdown with a '## Key findings' section first. "
            "Do not use a letter, salutation, or sign-off."
        )

        def query_llm(sys_prompt: str) -> str:
            payload = {
                "model": "openai/gpt-oss-20b",
                "messages": [
                    {"role": "system", "content": sys_prompt + consistency_rules},
                    {"role": "user", "content": marker_context}
                ],
                "temperature": 0.4
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=25)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
            return ""

        print("Generating specialized agent analysis via direct Groq pipeline...")
        med = query_llm(
            "You are a Senior Experienced Doctor. Provide medical insight constrained to the extracted markers."
        )
        ver = query_llm(
            "You are a Blood Report Verifier. Produce 3-5 questions the patient should ask their doctor based on the extracted markers, plus a short completeness note."
        )
        nut = query_llm(
            "You are a Clinical Nutritionist. Provide nutrition guidance constrained to the extracted markers."
        )
        exe = query_llm(
            "You are an Exercise Physiologist. Provide a safe exercise plan constrained to the extracted markers."
        )

        if med and ver and nut and exe:
            return {
                "medical": med,
                "verification": ver,
                "nutrition": nut,
                "exercise": exe
            }
    except Exception as direct_err:
        print("Direct LLM generation error:", str(direct_err))

    # Static emergency fallback only if network is completely down
    findings = _marker_findings(markers)
    return {
        "medical": f"## Key findings\n{findings}\n\n## Medical interpretation\nReview these findings with a clinician; no network model was available for deeper interpretation.",
        "verification": f"## Questions for your doctor\n{findings}\n\nAsk your clinician to review the status of each extracted marker above.",
        "nutrition": f"## Key findings\n{findings}\n\n## Nutrition guidance\nBase any dietary changes on the markers above and confirm them with your clinician.",
        "exercise": f"## Key findings\n{findings}\n\n## Exercise plan\nChoose activity appropriate for the markers above and confirm safety with your clinician."
    }


def _parse_json_payload(text: str) -> Dict[str, Any]:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    decoder = json.JSONDecoder()
    for index, character in enumerate(cleaned):
        if character != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(cleaned[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            return payload
    raise ValueError("No JSON object found")


def _marker_warning(markers: List[Dict[str, Any]], source_label: str) -> Optional[str]:
    if len(markers) == 1:
        return f"Only 1 marker could be read from this {source_label}. Results may be incomplete."
    if len(markers) == 0:
        return f"No markers could be read from this {source_label}. Results may be incomplete."
    return None


async def _complete_analysis(
    query: str,
    report_text: str,
    markers: List[Dict[str, Any]],
    user_email: str,
    file_name: str,
    diagnostic_center: str,
    source_type: str,
    report_date: Optional[str] = None,
) -> Dict[str, Any]:
    marker_warning = _marker_warning(markers, "image" if source_type == "Image" else "report")

    agent_outputs = await run_crew_async(
        query=query.strip() or "Summarise my Blood Test Report",
        report=report_text,
        markers=markers,
    )
    agent_outputs = {key: sanitize_markdown(value) for key, value in agent_outputs.items()}

    now = datetime.datetime.utcnow()
    year = now.year
    try:
        db_count = reports_collection.count_documents({"user_email": user_email})
    except Exception:
        db_count = len([r for r in IN_MEMORY_REPORTS if r.get("user_email") == user_email])
    seq_num = (db_count + 1) % 1000
    analysis_id = f"BTA-{year}-{seq_num:03d}"

    doc = {
        "analysis_id": analysis_id,
        "user_email": user_email,
        "report_type": "Routine",
        "diagnostic_center": diagnostic_center or "Not specified",
        "status": "Completed - Reviewed",
        "query": query.strip() or "Summarise my Blood Test Report",
        "analysis": agent_outputs["medical"],
        "agents": agent_outputs,
        "markers": markers,
        "marker_warning": marker_warning,
        "file_name": file_name,
        "source_type": source_type,
        "timestamp": now.isoformat(),
    }
    if report_date:
        doc["report_date"] = report_date

    try:
        reports_collection.insert_one(doc)
    except Exception as db_err:
        print("MongoDB insert fallback to memory:", str(db_err))
        IN_MEMORY_REPORTS.insert(0, doc)

    return {
        "status": "success",
        "analysis_id": analysis_id,
        "report_type": doc["report_type"],
        "diagnostic_center": doc["diagnostic_center"],
        "query": doc["query"],
        "analysis": agent_outputs["medical"],
        "agents": agent_outputs,
        "markers": markers,
        "marker_warning": marker_warning,
        "file_processed": file_name,
        "source_type": source_type,
        "report_date": report_date,
        "timestamp": now.isoformat(),
    }

# Root health check
@app.get("/")
async def root():
    return {"message": "Blood Test Report Analyser API is running"}

@app.post("/analyze")
async def analyze_blood_report(
    file: UploadFile = File(...),
    query: str = Form(default="Summarise my Blood Test Report"),
    user_email: str = Depends(get_current_user_email),
):
    file_id = str(uuid.uuid4())
    file_path = f"data/blood_test_report_{file_id}.pdf"

    try:
        os.makedirs("data", exist_ok=True)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        if not query.strip():
            query = "Summarise my Blood Test Report"

        report_text = extract_text_from_pdf(file_path)

        if not report_text.strip():
            return {
                "status": "error",
                "message": "The PDF appears to be empty or unreadable."
            }

        markers = parse_markers_from_text(report_text)
        diagnostic_center = extract_lab_name(report_text)

        return await _complete_analysis(
            query=query,
            report_text=report_text,
            markers=markers,
            user_email=user_email,
            file_name=file.filename or "blood_test_report.pdf",
            diagnostic_center=diagnostic_center,
            source_type="PDF",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass


@app.post("/api/analyze/image")
async def extract_image_report(
    files: List[UploadFile] = File(...),
    query: str = Form(default="Summarise my Blood Test Report"),
    user_email: str = Depends(get_current_user_email),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please add at least one report image.")
    if len(files) > 6:
        raise HTTPException(status_code=400, detail="Please upload no more than 6 images.")

    os.makedirs("data", exist_ok=True)
    temp_paths: List[str] = []
    original_names: List[str] = []

    try:
        for upload in files:
            content = await upload.read()
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Each image must be 10 MB or smaller.")

            original_name = upload.filename or "report-image"
            extension = os.path.splitext(original_name.lower())[1] or ".jpg"
            if extension not in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}:
                raise HTTPException(
                    status_code=400,
                    detail="Please upload JPG, PNG, WebP, or HEIC images.",
                )

            temp_path = f"data/report_image_{uuid.uuid4()}{extension}"
            with open(temp_path, "wb") as handle:
                handle.write(content)
            temp_paths.append(temp_path)
            original_names.append(original_name)

        from agents import gemini_llm, groq_fallback_llm, set_agents_llm

        set_agents_llm(gemini_llm or groq_fallback_llm)
        extraction_crew = Crew(
            agents=[image_extractor],
            tasks=[image_extraction_task],
            process=Process.sequential,
            verbose=False,
        )
        crew_output = await extraction_crew.kickoff_async(
            {"image_paths": "\n".join(temp_paths)}
        )

        try:
            result = _parse_json_payload(str(crew_output))
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="We could not read structured values from the image. Please upload a clearer photo.",
            )

        if result.get("status") == "error":
            raise HTTPException(
                status_code=400,
                detail=result.get("message") or "Could not read the report image. Please try again.",
            )

        result["file_names"] = original_names
        result["query"] = query.strip() or "Summarise my Blood Test Report"
        return result
    finally:
        for temp_path in temp_paths:
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/analyze/confirm")
async def analyze_confirmed_image(
    payload: ConfirmImagePayload,
    user_email: str = Depends(get_current_user_email),
):
    internal_markers: List[Dict[str, Any]] = []
    for row in payload.markers:
        marker = to_internal_marker(row.model_dump())
        if marker:
            internal_markers.append(marker)

    if not internal_markers:
        raise HTTPException(
            status_code=400,
            detail="Please keep at least one marker with a readable numeric value.",
        )

    lab_name = (payload.lab_name or "").strip() or "Not specified"
    report_date = (payload.report_date or "").strip() or None
    file_name = ", ".join([name for name in payload.file_names if name]) or "Report images"
    report_lines = [
        "Report source: image upload",
        f"Laboratory: {lab_name}",
        f"Report date: {report_date or 'Not specified'}",
        "Confirmed markers:",
    ]
    for marker in internal_markers:
        report_lines.append(
            f"- {marker['name']}: {marker['value']} {marker['unit']} "
            f"(reference {marker['range'][0]}-{marker['range'][1]}, status {marker['status']})"
        )

    return await _complete_analysis(
        query=payload.query,
        report_text="\n".join(report_lines),
        markers=internal_markers,
        user_email=user_email,
        file_name=file_name,
        diagnostic_center=lab_name,
        source_type="Image",
        report_date=report_date,
    )


@app.get("/history")
async def get_history(
    page: int = 1,
    page_size: int = 10,
    search: str = "",
    q: str = "",
    report_type: str = "All Reports",
    user_email: str = Depends(get_current_user_email),
):
    history_items = []
    total_count = 0

    # Support both 'search' and 'q' query parameters
    query_str = (q or search).strip()
    skip = (page - 1) * page_size

    # Build Mongo filter scoped to the authenticated user
    mongo_filter = {"user_email": user_email}
    if query_str:
        mongo_filter["$or"] = [
            {"file_name": {"$regex": query_str, "$options": "i"}},
            {"query": {"$regex": query_str, "$options": "i"}},
            {"analysis": {"$regex": query_str, "$options": "i"}},
            {"analysis_id": {"$regex": query_str, "$options": "i"}},
            {"agents.medical": {"$regex": query_str, "$options": "i"}}
        ]
    if report_type and report_type != "All Reports":
        mongo_filter["report_type"] = report_type

    try:
        total_count = reports_collection.count_documents(mongo_filter)
        records = list(reports_collection.find(mongo_filter).sort("timestamp", -1).skip(skip).limit(page_size))
        for r in records:
            agents_dict = r.get("agents", {})
            if isinstance(agents_dict, dict) and "medical" not in agents_dict:
                agents_dict["medical"] = r.get("analysis", "")

            history_items.append({
                "analysis_id": r.get("analysis_id", "BTA-2026-001"),
                "report_type": r.get("report_type", "Routine"),
                "diagnostic_center": r.get("diagnostic_center", "Not specified"),
                "marker_warning": r.get("marker_warning"),
                "status": r.get("status", "Completed - Reviewed"),
                "file": r.get("file_name"),
                "query": r.get("query"),
                "analysis": r.get("analysis", ""),
                "agents": agents_dict,
                "markers": r.get("markers", []),
                "source_type": r.get("source_type", "PDF"),
                "report_date": r.get("report_date"),
                "timestamp": r.get("timestamp").isoformat() if isinstance(r.get("timestamp"), datetime.datetime) else str(r.get("timestamp"))
            })
    except Exception as e:
        print("MongoDB history fetch skipped/error:", str(e))

    # Fallback to IN_MEMORY_REPORTS if Mongo fetch produced nothing
    if not history_items and not total_count:
        filtered_mem = [r for r in IN_MEMORY_REPORTS if r.get("user_email") == user_email]
        if query_str:
            s = query_str.lower()
            filtered_mem = [
                r for r in filtered_mem
                if s in r.get("file_name", "").lower()
                or s in r.get("query", "").lower()
                or s in r.get("analysis", "").lower()
                or s in r.get("analysis_id", "").lower()
                or s in r.get("agents", {}).get("medical", "").lower()
            ]
        if report_type and report_type != "All Reports":
            filtered_mem = [r for r in filtered_mem if r.get("report_type") == report_type]

        total_count = len(filtered_mem)
        for idx, r in enumerate(filtered_mem[skip:skip + page_size]):
            seq = total_count - (skip + idx)
            agents_dict = r.get("agents", {})
            if isinstance(agents_dict, dict) and "medical" not in agents_dict:
                agents_dict["medical"] = r.get("analysis", "")

            history_items.append({
                "analysis_id": r.get("analysis_id", f"BTA-2026-{seq:03d}"),
                "report_type": r.get("report_type", "Routine"),
                "diagnostic_center": r.get("diagnostic_center", "Not specified"),
                "marker_warning": r.get("marker_warning"),
                "status": r.get("status", "Completed - Reviewed"),
                "file": r.get("file_name"),
                "query": r.get("query"),
                "analysis": r.get("analysis", ""),
                "agents": agents_dict,
                "markers": r.get("markers", []),
                "source_type": r.get("source_type", "PDF"),
                "report_date": r.get("report_date"),
                "timestamp": str(r.get("timestamp"))
            })

    import math
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1

    return {
        "items": history_items,
        "results": history_items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "pages": total_pages
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


