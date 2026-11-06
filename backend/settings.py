from fastapi import APIRouter, HTTPException, Depends, Response
import json, datetime
from profile import get_current_user_email
from db import profiles_collection, reports_collection
from store import IN_MEMORY_REPORTS, IN_MEMORY_PROFILES

router = APIRouter()


@router.get("/settings/export")
def export_user_data(user_email: str = Depends(get_current_user_email)):
    """Export all user reports and health profile as a downloadable JSON blob."""
    print(f"EXPORT_DATA: Exporting data package for user email '{user_email}'.")

    # Fetch profile (strip Mongo _id)
    profile_data = None
    try:
        p_doc = profiles_collection.find_one({"user_email": user_email}, {"_id": 0})
        if p_doc and "profile" in p_doc:
            profile_data = p_doc["profile"]
    except Exception as err:
        print("MongoDB profile export query error:", str(err))

    if not profile_data:
        profile_data = IN_MEMORY_PROFILES.get(user_email)

    # Fetch only this user's reports (strip Mongo _id)
    reports_data = []
    try:
        r_docs = list(reports_collection.find({"user_email": user_email}, {"_id": 0}))
        for r in r_docs:
            reports_data.append({
                "analysis_id": r.get("analysis_id"),
                "report_type": r.get("report_type"),
                "diagnostic_center": r.get("diagnostic_center"),
                "status": r.get("status"),
                "file_name": r.get("file_name"),
                "query": r.get("query"),
                "analysis": r.get("analysis"),
                "agents": r.get("agents"),
                "markers": r.get("markers"),
                "timestamp": str(r.get("timestamp"))
            })
    except Exception as err:
        print("MongoDB reports export query error:", str(err))

    if not reports_data:
        for r in IN_MEMORY_REPORTS:
            if r.get("user_email") != user_email:
                continue
            reports_data.append({
                "analysis_id": r.get("analysis_id"),
                "report_type": r.get("report_type"),
                "diagnostic_center": r.get("diagnostic_center"),
                "status": r.get("status"),
                "file_name": r.get("file_name"),
                "query": r.get("query"),
                "analysis": r.get("analysis"),
                "agents": r.get("agents"),
                "markers": r.get("markers"),
                "timestamp": str(r.get("timestamp"))
            })

    export_payload = {
        "exported_at": datetime.datetime.utcnow().isoformat(),
        "user_email": user_email,
        "profile": profile_data,
        "reports": reports_data
    }

    json_str = json.dumps(export_payload, indent=2)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=blood-test-analyser-export.json"}
    )

@router.delete("/settings/account")
def delete_account(response: Response, user_email: str = Depends(get_current_user_email)):
    """Permanently cascade-delete user profile and reports, then clear session cookie."""
    print(f"DELETE_ACCOUNT: Cascade deleting account for user email '{user_email}'.")

    errors = []

    # 1. Delete profile from MongoDB
    try:
        profiles_collection.delete_many({"user_email": user_email})
    except Exception as err:
        errors.append(f"Profile delete error: {str(err)}")

    if user_email in IN_MEMORY_PROFILES:
        del IN_MEMORY_PROFILES[user_email]

    # 2. Delete only this user's reports from MongoDB
    try:
        reports_collection.delete_many({"user_email": user_email})
    except Exception as err:
        errors.append(f"Reports delete error: {str(err)}")

    IN_MEMORY_REPORTS[:] = [r for r in IN_MEMORY_REPORTS if r.get("user_email") != user_email]

    if errors:
        raise HTTPException(
            status_code=500,
            detail=f"Partial failure during account deletion: {'; '.join(errors)}"
        )

    # 3. Clear auth session cookie on success
    response.delete_cookie("session")
    return {"status": "deleted"}

