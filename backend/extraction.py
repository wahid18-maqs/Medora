import io
import json
import os
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator

STATUS_ORDER = {"high": 0, "low": 1, "normal": 2, "unknown": 3}
VALID_STATUSES = {"low", "high", "normal", "unknown"}
NUMBER_RE = re.compile(r"-?\d+(?:[.,]\d+)?")
RANGE_SEPARATOR_RE = re.compile(r"\s*(?:-|–|—|−|to|\.\.)\s*", re.IGNORECASE)
COMPARATOR_RE = re.compile(r"(<=|≥|≤|>=|<|>)")


def _number(token: str) -> Optional[float]:
    cleaned = (token or "").strip()
    if not cleaned:
        return None
    if "," in cleaned and "." not in cleaned:
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) == 3:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _numbers(text: str) -> List[float]:
    values = []
    for token in NUMBER_RE.findall((text or "").replace("−", "-")):
        value = _number(token)
        if value is not None:
            values.append(value)
    return values


def _stringify_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_reference_range(ref_raw: str) -> Optional[Dict[str, Optional[float]]]:
    text = (ref_raw or "").strip()
    if not text:
        return None

    numbers = _numbers(text)
    if not numbers:
        return None

    comparator_match = COMPARATOR_RE.search(text)
    comparator = comparator_match.group(1) if comparator_match else ""

    if len(numbers) >= 2:
        low, high = numbers[0], numbers[1]
        return {
            "ref_low": min(low, high),
            "ref_high": max(low, high),
        }

    value = numbers[0]
    if comparator in {"<", "<=", "≤"}:
        return {"ref_low": None, "ref_high": value}
    if comparator in {">", ">=", "≥"}:
        return {"ref_low": value, "ref_high": None}
    return None


def compute_status(
    value: Optional[float],
    ref_low: Optional[float],
    ref_high: Optional[float],
) -> str:
    if value is None or (ref_low is None and ref_high is None):
        return "unknown"
    if ref_low is not None and value < ref_low:
        return "low"
    if ref_high is not None and value > ref_high:
        return "high"
    return "normal"


def flag_to_status(flag: Optional[str]) -> Optional[str]:
    normalized = str(flag or "").strip().lower()
    if not normalized:
        return None
    if any(token in normalized for token in ("high", "above", "elevated", "↑", " h")):
        return "high"
    if any(token in normalized for token in ("low", "below", "decreased", "↓", " l")):
        return "low"
    if any(token in normalized for token in ("normal", "within", "negative", " n")):
        return "normal"
    return None


def plausibility_warning(name: str, value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    marker = (name or "").lower()
    limits = {
        "hemoglobin": (2.0, 25.0),
        "hb": (2.0, 25.0),
        "glucose": (10.0, 800.0),
        "cholesterol": (20.0, 800.0),
        "triglycerides": (10.0, 2000.0),
        "wbc": (0.1, 100.0),
        "platelet": (5.0, 1500.0),
        "vitamin d": (1.0, 300.0),
        "creatinine": (0.1, 20.0),
        "tsh": (0.001, 100.0),
    }
    for key, (low, high) in limits.items():
        if key in marker and (value < low or value > high):
            return "This value looks implausible; please verify it against the original report."
    return None


class Marker(BaseModel):
    name: str
    value: Optional[float] = None
    value_text: str = ""
    unit: str = ""
    ref_raw: str = ""
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    flag_in_report: Optional[str] = None
    page: Optional[int] = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    status: str = "unknown"
    needs_review: bool = False
    plausibility_warning: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: Any) -> str:
        normalized = str(value or "unknown").strip().lower()
        return normalized if normalized in VALID_STATUSES else "unknown"


class ExtractedReport(BaseModel):
    lab_name: Optional[str] = None
    report_date: Optional[str] = None
    markers: List[Marker] = Field(default_factory=list)


class RawMarker(BaseModel):
    name: str = ""
    marker: str = ""
    value: Any = None
    value_text: str = ""
    unit: str = ""
    ref_raw: str = ""
    reference_range: str = ""
    flag_in_report: Optional[str] = None
    page: Optional[int] = None
    confidence: float = 0.5

    def marker_name(self) -> str:
        return str(self.name or self.marker or "").strip()

    def reference_text(self) -> str:
        return str(self.ref_raw or self.reference_range or "").strip()


class ExtractionPayload(BaseModel):
    lab_name: Optional[str] = None
    report_date: Optional[str] = None
    markers: List[RawMarker] = Field(default_factory=list)


def _to_raw_marker(item: Any) -> RawMarker:
    if isinstance(item, RawMarker):
        return item
    if isinstance(item, Marker):
        return RawMarker(
            name=item.name,
            value=item.value if item.value is not None else item.value_text,
            value_text=item.value_text,
            unit=item.unit,
            ref_raw=item.ref_raw,
            flag_in_report=item.flag_in_report,
            page=item.page,
            confidence=item.confidence,
        )
    if isinstance(item, dict):
        payload = dict(item)
        if "marker" not in payload and "name" in payload:
            payload["marker"] = payload["name"]
        return RawMarker.model_validate(payload)
    raise ValueError("Unsupported marker payload")


def normalize_marker(raw: Any, page: Optional[int] = None) -> Optional[Marker]:
    item = _to_raw_marker(raw)
    name = item.marker_name()
    if not name:
        return None

    value_text = _stringify_value(item.value_text or item.value)
    if not value_text:
        return None

    value = item.value if isinstance(item.value, (int, float)) else None
    if value is None:
        value = _numbers(value_text)[0] if _numbers(value_text) else None
    if value is not None:
        value = float(value)

    ref_raw = item.reference_text()
    parsed_range = parse_reference_range(ref_raw)
    ref_low = parsed_range.get("ref_low") if parsed_range else None
    ref_high = parsed_range.get("ref_high") if parsed_range else None
    status = compute_status(value, ref_low, ref_high)

    flagged_status = flag_to_status(item.flag_in_report)
    needs_review = bool(flagged_status and status != "unknown" and flagged_status != status)
    warning = plausibility_warning(name, value)
    if item.confidence < 0.6 or warning:
        needs_review = True

    return Marker(
        name=name,
        value=value,
        value_text=value_text,
        unit=str(item.unit or "").strip(),
        ref_raw=ref_raw,
        ref_low=ref_low,
        ref_high=ref_high,
        flag_in_report=item.flag_in_report,
        page=item.page if item.page is not None else page,
        confidence=round(float(item.confidence), 2),
        status=status if status in VALID_STATUSES else "unknown",
        needs_review=needs_review,
        plausibility_warning=warning,
    )


def marker_key(marker: Marker) -> Tuple[str, str]:
    normalized_name = re.sub(r"[^a-z0-9]+", "", marker.name.lower())
    normalized_value = (marker.value_text or _stringify_value(marker.value)).lower()
    return normalized_name, normalized_value


def dedupe_and_sort_markers(markers: Iterable[Marker]) -> List[Marker]:
    deduped: Dict[Tuple[str, str], Marker] = {}
    for marker in markers:
        key = marker_key(marker)
        if not key[0]:
            continue
        current = deduped.get(key)
        if current is None or marker.confidence > current.confidence:
            deduped[key] = marker
        elif current.page is None and marker.page is not None:
            current.page = marker.page

    return sorted(
        deduped.values(),
        key=lambda marker: (
            STATUS_ORDER.get(marker.status, STATUS_ORDER["unknown"]),
            marker.name.lower(),
        ),
    )


def marker_dicts(markers: Iterable[Marker]) -> List[Dict[str, Any]]:
    rows = []
    for marker in markers:
        row = marker.model_dump()
        if marker.ref_low is not None and marker.ref_high is not None:
            row["range"] = [marker.ref_low, marker.ref_high]
        rows.append(row)
    return rows


def build_marker_warning(markers: List[Any], page_count: int = 1) -> Optional[str]:
    count = len(markers)
    if page_count > 1 and count < 3:
        return (
            f"Only {count} marker{'s' if count != 1 else ''} could be read from "
            "this report. Results may be incomplete."
        )
    if count == 0:
        return "No markers could be read from this report. Results may be incomplete."
    if count == 1:
        return "Only 1 marker could be read from this report. Results may be incomplete."
    return None


def _strip_code_fences(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_extraction_payload(text: str) -> ExtractionPayload:
    cleaned = _strip_code_fences(text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    payload = json.loads(cleaned[start : end + 1])
    return ExtractionPayload.model_validate(payload)


EXTRACTION_PROMPT = """You are a medical report transcription system. Read the blood test report page and return ONLY valid JSON.

Required JSON shape:
{
  "lab_name": "Laboratory or diagnostic centre name, or null",
  "report_date": "YYYY-MM-DD, or null",
  "markers": [
    {
      "name": "Exact test or marker name",
      "value": "Printed result value",
      "value_text": "Printed result value exactly as shown",
      "unit": "Printed unit, or empty string",
      "ref_raw": "Printed reference range exactly as shown, or empty string",
      "flag_in_report": "Printed low/high/normal flag, or null",
      "page": 1,
      "confidence": 0.0
    }
  ]
}

Rules:
- Extract every laboratory marker row on this page, including rows in tables.
- Never invent, skip, merge, round, or change printed values, units, or reference ranges.
- Preserve exact numbers and reference range symbols such as <, >, <=, >=, and dashes.
- If a reference range is not printed, use an empty string for ref_raw. Do not guess a range.
- Use the printed page number in page.
- confidence must be between 0 and 1 and reflect how clearly the row was read.
- Return JSON only. Do not include markdown, commentary, or code fences.
"""

RETRY_PROMPT = """The previous answer was not valid JSON. Return ONLY one valid JSON object matching the required schema.
Do not include markdown fences, commentary, or trailing text.
Required shape:
{"lab_name":string|null,"report_date":string|null,"markers":[{"name":string,"value":string,"value_text":string,"unit":string,"ref_raw":string,"flag_in_report":string|null,"page":number,"confidence":number}]}
"""


def _gemini_text(prompt: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
        config=types.GenerateContentConfig(temperature=0.0),
    )
    return getattr(response, "text", "") or ""


def _gemini_image(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                ],
            )
        ],
        config=types.GenerateContentConfig(temperature=0.0),
    )
    return getattr(response, "text", "") or ""


def _request_payload(prompt: str, image_bytes: Optional[bytes] = None, mime_type: str = "image/png") -> ExtractionPayload:
    for attempt in range(2):
        request_prompt = prompt if attempt == 0 else f"{prompt}\n\n{RETRY_PROMPT}"
        raw = (
            _gemini_image(request_prompt, image_bytes, mime_type)
            if image_bytes
            else _gemini_text(request_prompt)
        )
        try:
            return parse_extraction_payload(raw)
        except Exception:
            if attempt == 1:
                raise
    raise RuntimeError("Could not parse extraction response")


def _page_prompt(page_number: int, page_text: str, tables: List[List[List[Any]]]) -> str:
    table_text = ""
    if tables:
        table_text = "\n\nExtracted table rows:\n" + "\n".join(
            " | ".join("" if cell is None else str(cell).strip() for cell in row)
            for table in tables
            for row in table
        )
    return (
        f"{EXTRACTION_PROMPT}\n\nPage number: {page_number}\n\n"
        f"Page text:\n{page_text or '(no text layer)'}{table_text}"
    )


HEADER_ALIASES = {
    "name": ("test", "marker", "investigation", "parameter", "analyte", "description"),
    "value": ("result", "value", "observed", "reading", "patient"),
    "unit": ("unit", "units"),
    "ref": ("reference", "range", "ref", "normal", "biological"),
    "flag": ("flag", "status", "interpretation", "indicator"),
}


def _header_map(row: List[Any]) -> Optional[Dict[str, int]]:
    labels = [str(cell or "").strip().lower() for cell in row]
    mapping: Dict[str, int] = {}
    for index, label in enumerate(labels):
        for key, aliases in HEADER_ALIASES.items():
            if key not in mapping and any(alias in label for alias in aliases):
                mapping[key] = index
                break
    if "name" in mapping and "value" in mapping:
        return mapping
    return None


def _table_markers(tables: List[List[List[Any]]], page: int) -> List[Marker]:
    markers: List[Marker] = []
    for table in tables:
        mapping = None
        for row_index, row in enumerate(table):
            candidate = _header_map(row)
            if candidate:
                mapping = candidate
                start_index = row_index + 1
                break
        if not mapping:
            continue

        for row in table[start_index:]:
            if not row:
                continue
            name = str(row[mapping["name"]] or "").strip() if mapping["name"] < len(row) else ""
            value = str(row[mapping["value"]] or "").strip() if mapping["value"] < len(row) else ""
            if not name or not value:
                continue
            unit = (
                str(row[mapping["unit"]] or "").strip()
                if "unit" in mapping and mapping["unit"] < len(row)
                else ""
            )
            ref = (
                str(row[mapping["ref"]] or "").strip()
                if "ref" in mapping and mapping["ref"] < len(row)
                else ""
            )
            flag = (
                str(row[mapping["flag"]] or "").strip()
                if "flag" in mapping and mapping["flag"] < len(row)
                else None
            )
            marker = normalize_marker(
                {
                    "name": name,
                    "value": value,
                    "value_text": value,
                    "unit": unit,
                    "ref_raw": ref,
                    "flag_in_report": flag,
                    "page": page,
                    "confidence": 0.75,
                },
                page,
            )
            if marker:
                markers.append(marker)
    return markers


LINE_RE = re.compile(
    r"^\s*(?P<name>[A-Za-z][A-Za-z0-9 .()/%µμ^\-]{1,70}?)\s+"
    r"(?P<value>[<>≤≥]?\s*-?\d+(?:[.,]\d+)?)\s*"
    r"(?P<rest>.*)$"
)


def _line_markers(text: str, page: int) -> List[Marker]:
    markers: List[Marker] = []
    for line in (text or "").splitlines():
        cleaned = " ".join(line.split()).strip()
        if len(cleaned) < 5:
            continue
        match = LINE_RE.match(cleaned)
        if not match:
            continue
        name = match.group("name").strip(" :.-")
        value = match.group("value").strip()
        rest = match.group("rest").strip()
        if not name or re.search(r"\b(page|report|date|patient|doctor|address)\b", name, re.I):
            continue

        unit_match = re.match(r"(?P<unit>[A-Za-z%/µμ^0-9.*]+)?", rest)
        unit = (unit_match.group("unit") or "").strip() if unit_match else ""
        remainder = rest[len(unit) :].strip()
        if not unit or unit.lower() in {"normal", "high", "low"}:
            remainder = rest
            unit = ""

        range_match = re.search(
            r"(?P<ref>(?:<=|>=|<|>|≤|≥)?\s*-?\d+(?:[.,]\d+)?"
            r"(?:\s*(?:-|–|—|−|to)\s*(?:<=|>=|<|>|≤|≥)?\s*-?\d+(?:[.,]\d+)?)?)",
            remainder,
            re.IGNORECASE,
        )
        ref_raw = range_match.group("ref").strip() if range_match else ""
        flag_part = remainder[range_match.end() :].strip() if range_match else remainder

        marker = normalize_marker(
            {
                "name": name,
                "value": value,
                "value_text": value,
                "unit": unit,
                "ref_raw": ref_raw,
                "flag_in_report": flag_part or None,
                "page": page,
                "confidence": 0.55,
            },
            page,
        )
        if marker:
            markers.append(marker)
    return markers


def _normalize_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y"):
        try:
            import datetime

            return datetime.datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    match = re.search(r"\d{1,4}[./-]\d{1,2}[./-]\d{1,4}", text)
    if match:
        return _normalize_date(match.group(0))
    return None


def _date_from_text(text: str) -> Optional[str]:
    patterns = [
        r"(?:report|collection|collected|sample|test|date)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
        r"(\d{4}-\d{2}-\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "", re.IGNORECASE)
        if match:
            return _normalize_date(match.group(1))
    return None


def _lab_from_text(text: str) -> Optional[str]:
    for line in (text or "").splitlines()[:35]:
        clean = " ".join(line.split()).strip(" :|-")
        if 3 <= len(clean) <= 90 and re.search(
            r"\b(lab|laboratory|diagnostics?|pathology|hospital|clinic)\b",
            clean,
            re.IGNORECASE,
        ):
            return clean
    return None


def _extract_plumber_pages(path: str) -> List[List[List[List[Any]]]]:
    try:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            return [page.extract_tables() or [] for page in pdf.pages]
    except Exception:
        return []


def _extract_fitz_pages(path: str) -> List[Tuple[str, Optional[bytes]]]:
    try:
        import fitz

        pages = []
        with fitz.open(path) as document:
            for page in document:
                text = page.get_text("text") or ""
                image = None
                if len(text.strip()) < 40:
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    image = pixmap.tobytes("png")
                pages.append((text, image))
        return pages
    except Exception:
        return []


def extract_pdf_report(path: str) -> Dict[str, Any]:
    pages = _extract_fitz_pages(path)
    if not pages:
        try:
            from pypdf import PdfReader

            reader = PdfReader(path)
            pages = [((page.extract_text() or ""), None) for page in reader.pages]
        except Exception:
            pages = []

    plumber_pages = _extract_plumber_pages(path)
    all_markers: List[Marker] = []
    lab_name = None
    report_date = None
    report_text_parts: List[str] = []

    for index, (page_text, page_image) in enumerate(pages, start=1):
        tables = plumber_pages[index - 1] if index - 1 < len(plumber_pages) else []
        report_text_parts.append(page_text)
        page_markers: List[Marker] = []

        try:
            payload = _request_payload(
                _page_prompt(index, page_text, tables),
                image_bytes=page_image,
                mime_type="image/png",
            )
            lab_name = lab_name or payload.lab_name
            report_date = report_date or _normalize_date(payload.report_date)
            for raw in payload.markers:
                marker = normalize_marker(raw, page=index)
                if marker:
                    page_markers.append(marker)
        except Exception:
            page_markers = []

        if not page_markers:
            page_markers = _table_markers(tables, index)
        if not page_markers:
            page_markers = _line_markers(page_text, index)

        all_markers.extend(page_markers)

    full_text = "\n".join(part for part in report_text_parts if part.strip())
    lab_name = lab_name or _lab_from_text(full_text)
    report_date = report_date or _date_from_text(full_text)
    markers = dedupe_and_sort_markers(all_markers)

    return {
        "report_text": full_text,
        "markers": marker_dicts(markers),
        "lab_name": lab_name or "Not specified",
        "report_date": report_date,
        "page_count": max(len(pages), len(plumber_pages), 1),
    }
