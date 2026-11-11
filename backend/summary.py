import re
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class MarkerSummary(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = "normal"
    note: str

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: Any) -> str:
        normalized = str(value or "normal").strip().lower()
        if normalized in {"low", "high", "normal"}:
            return normalized
        return "normal"


class ReportSummary(BaseModel):
    overview: str
    key_findings: List[str] = Field(default_factory=list)
    markers: List[MarkerSummary] = Field(default_factory=list)
    lifestyle_notes: List[str] = Field(default_factory=list)
    questions_for_doctor: List[str] = Field(default_factory=list)
    limitations: str = ""


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def validate_summary(
    summary: ReportSummary,
    markers: List[Dict[str, Any]],
    expected_min_markers: int = 1,
) -> List[str]:
    allowed = {_normalize_name(marker.get("name", "")) for marker in markers}
    errors = []

    for marker in summary.markers:
        if _normalize_name(marker.name) not in allowed:
            errors.append(f"Summary mentions an unknown marker: {marker.name}")

    if len(markers) < expected_min_markers and not summary.limitations.strip():
        errors.append("Summary did not explain the limited marker count")

    return errors


def _marker_rows(markers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for marker in markers:
        value = marker.get("value")
        unit = marker.get("unit") or None
        reference = marker.get("range")
        reference_range = None
        if isinstance(reference, (list, tuple)) and len(reference) == 2:
            reference_range = f"{reference[0]}–{reference[1]}"

        status = str(marker.get("status", "Normal")).lower()
        value_text = str(value)
        note = f"{marker.get('name', 'Marker')} is {status}."
        if reference_range and status in {"low", "high"}:
            note = f"{marker.get('name', 'Marker')} is {status} relative to the reference range."
        rows.append(
            {
                "name": str(marker.get("name") or "Marker"),
                "value": value_text,
                "unit": unit,
                "reference_range": reference_range,
                "status": status if status in {"low", "normal", "high"} else "normal",
                "note": note,
            }
        )
    return rows


def _first_sentences(value: Any, limit: int = 3) -> List[str]:
    if not isinstance(value, str):
        return []
    items = []
    for line in value.splitlines():
        cleaned = re.sub(r"^[#*\-\s]+", "", line).strip()
        if not cleaned or cleaned.endswith(":"):
            continue
        items.append(cleaned)
        if len(items) >= limit:
            break
    return items


def merge_limitation(summary: ReportSummary, marker_warning: Optional[str]) -> ReportSummary:
    if marker_warning and marker_warning.lower() not in summary.limitations.lower():
        summary.limitations = f"{summary.limitations} {marker_warning}".strip()
    return summary


def build_fallback_summary(
    markers: List[Dict[str, Any]],
    agents: Optional[Dict[str, Any]] = None,
    marker_warning: Optional[str] = None,
) -> ReportSummary:
    rows = _marker_rows(markers)
    abnormal = [row for row in rows if row["status"] != "normal"]
    rows.sort(key=lambda row: row["status"] == "normal")

    if rows:
        overview = (
            f"This report contains {len(rows)} extracted marker"
            f"{'' if len(rows) == 1 else 's'}. "
            "The summary is limited to the values shown in the table, and any concerns should be "
            "discussed with your doctor."
        )
    else:
        overview = (
            "No laboratory markers could be summarized from this report. "
            "Please discuss the original report with your doctor."
        )

    if abnormal:
        key_findings = [
            f"{row['name']} is {row['status']} at {row['value']} {row['unit'] or ''}".strip()
            for row in abnormal[:5]
        ]
    elif rows:
        key_findings = ["All extracted markers were within their reference ranges."]
    else:
        key_findings = []

    lifestyle_notes = []
    if agents:
        lifestyle_notes.extend(_first_sentences(agents.get("nutrition"), 2))
        lifestyle_notes.extend(_first_sentences(agents.get("exercise"), 2))
    if not lifestyle_notes:
        lifestyle_notes = ["Discuss any diet or exercise changes with your healthcare professional."]

    questions = [
        f"What do my {row['name']} results mean for my health?" for row in abnormal[:4]
    ]
    if not questions:
        questions = ["What follow-up, if any, do you recommend based on these results?"]

    limitations = marker_warning or ""
    if not limitations and len(rows) < 3:
        limitations = (
            f"Only {len(rows)} marker{'' if len(rows) == 1 else 's'} could be read from this report."
        )

    return ReportSummary(
        overview=overview,
        key_findings=key_findings,
        markers=[MarkerSummary(**row) for row in rows],
        lifestyle_notes=lifestyle_notes[:5],
        questions_for_doctor=questions[:5],
        limitations=limitations,
    )
