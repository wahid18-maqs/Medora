from fastapi import APIRouter, HTTPException, Depends, Cookie
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import jwt
from auth import SECRET
from db import profiles_collection, reports_collection, users_collection
from store import IN_MEMORY_PROFILES, IN_MEMORY_USERS

# TODO: Confirm Mongo Atlas encryption-at-rest is enabled for the profiles_collection in production infrastructure config.

router = APIRouter()

def get_current_user_email(session: Optional[str] = Cookie(default=None)) -> str:
    """Resolve current user email securely from the session cookie only."""
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(session, SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session token")

class EmergencyContact(BaseModel):
    name: str = ""
    phone: str = ""

class InsuranceInfo(BaseModel):
    provider: str = ""
    memberId: str = ""

class VitalsInfo(BaseModel):
    weight: float = 0.0  # kg
    height: float = 0.0  # cm
    bloodType: str = ""
    systolicBP: int = 0
    diastolicBP: int = 0
    restingHeartRate: int = 0

    @property
    def bmi(self) -> float:
        """Compute BMI server-side from weight and height so it doesn't drift."""
        if self.height > 0:
            height_m = self.height / 100.0
            return round(self.weight / (height_m * height_m), 1)
        return 0.0

class MedicalConditionItem(BaseModel):
    id: Optional[str] = None
    name: str
    notes: str

class SurgicalHistoryItem(BaseModel):
    id: Optional[str] = None
    procedure: str
    date: str

class MedicationItem(BaseModel):
    id: Optional[str] = None
    name: str
    dosage: str
    schedule: str

class VaccinationItem(BaseModel):
    id: Optional[str] = None
    name: str
    date: str

class HealthProfileModel(BaseModel):
    name: str = ""
    age: int = 0
    dob: str = ""
    gender: str = ""
    phone: str = ""
    email: str = ""
    emergencyContact: EmergencyContact = Field(default_factory=EmergencyContact)
    insurance: InsuranceInfo = Field(default_factory=InsuranceInfo)
    vitals: VitalsInfo = Field(default_factory=VitalsInfo)
    medicalConditions: List[MedicalConditionItem] = Field(default_factory=list)
    surgeries: List[SurgicalHistoryItem] = Field(default_factory=list)
    medications: List[MedicationItem] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    vaccinations: List[VaccinationItem] = Field(default_factory=list)


def _resolve_user_name(user_email: str) -> str:
    try:
        user = users_collection.find_one({"email": user_email})
        if user:
            return user.get("name", "")
    except Exception as err:
        print("MongoDB user lookup error, falling back to memory:", str(err))
    user = IN_MEMORY_USERS.get(user_email)
    return user.get("name", "") if user else ""


@router.get("/profile")

def get_profile(user_email: str = Depends(get_current_user_email)):
    """GET user health profile, returning default structure if none exists yet."""
    print(f"FETCH_PROFILE: User email '{user_email}' requested health profile.")
    profile_data = None
    try:
        profile_doc = profiles_collection.find_one({"user_email": user_email})
        if profile_doc and "profile" in profile_doc:
            profile_data = profile_doc["profile"]
    except Exception as err:
        print("MongoDB profile fetch error, fallback to memory:", str(err))

    if not profile_data:
        profile_data = IN_MEMORY_PROFILES.get(user_email)

    if not profile_data:
        default_model = HealthProfileModel(name=_resolve_user_name(user_email), email=user_email)
        profile_data = default_model.dict()

    # Calculate server-side computed BMI
    w = profile_data.get("vitals", {}).get("weight", 0)
    h = profile_data.get("vitals", {}).get("height", 0)
    if h > 0:
        hm = h / 100.0
        profile_data["vitals"]["bmi"] = round(w / (hm * hm), 1)

    return profile_data

@router.put("/profile")
def update_profile(
    updated_profile: Dict[str, Any],
    user_email: str = Depends(get_current_user_email)
):
    """PUT update health profile for the authenticated user only."""
    print(f"UPDATE_PROFILE: Updating health profile for user email '{user_email}'.")
    existing_data = get_profile(user_email=user_email)
    
    # Merge existing and updated profile fields
    merged = {**existing_data, **updated_profile}
    
    # Validate against Pydantic model
    validated = HealthProfileModel(**merged)
    validated_dict = validated.dict()

    # Re-calculate server-side computed BMI
    w = validated_dict.get("vitals", {}).get("weight", 0)
    h = validated_dict.get("vitals", {}).get("height", 0)
    if h > 0:
        hm = h / 100.0
        validated_dict["vitals"]["bmi"] = round(w / (hm * hm), 1)

    try:
        profiles_collection.update_one(
            {"user_email": user_email},
            {"$set": {"user_email": user_email, "profile": validated_dict}},
            upsert=True
        )
    except Exception as db_err:
        print("MongoDB profile update error, updating memory store:", str(db_err))
        IN_MEMORY_PROFILES[user_email] = validated_dict

    return validated_dict

@router.get("/profile/biomarker-trend")
def get_biomarker_trend(
    marker: str = "Vitamin D",
    user_email: str = Depends(get_current_user_email)
):
    """GET chronological marker trend values derived from existing reports_collection."""
    print(f"FETCH_BIOMARKER_TREND: User '{user_email}' requested trend for '{marker}'.")
    trend_points = []
    
    try:
        records = list(reports_collection.find({"user_email": user_email}).sort("timestamp", 1))
        for r in records:
            markers = r.get("markers", [])
            for m in markers:
                if m.get("name", "").lower() == marker.lower():
                    trend_points.append({
                        "date": str(r.get("timestamp"))[:10],
                        "value": m.get("value"),
                        "unit": m.get("unit", ""),
                        "rawTimestamp": str(r.get("timestamp"))
                    })
    except Exception as db_err:
        print("MongoDB biomarker trend query error:", str(db_err))

    return {
        "marker": marker,
        "points": trend_points,
        "total": len(trend_points)
    }
