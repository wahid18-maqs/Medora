import io
import json
import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator

STATUS_ORDER = {"high": 0, "low": 1, "normal": 2, "unknown": 3}
VALID_STATUSES = {"low", "high", "normal", "unknown"}
NUMBER_RE = re.compile(r"-?\d+(?:[.,]\d+)*")
RANGE_SEPARATOR_RE = re.compile(r"\s*(?:-|–|—|−|to|\.\.)\s*", re.IGNORECASE)
COMPARATOR_RE = re.compile(r"(<=|≥|≤|>=|<|>)")

logger = logging.getLogger(__name__)

MARKER_ALIASES = {
    "sgot": "AST",
    "sgpt": "ALT",
    "hb": "Hemoglobin",
    "pcv": "Packed Cell Volume",
    "tlc": "Total Leukocyte Count",
}

STANDARD_RANGE_LABEL = "Standard range (not from report)"
STANDARD_RANGES = {
    "fasting glucose": (70.0, 99.0),
    "glucose fasting": (70.0, 99.0),
    "glucose, fasting": (70.0, 99.0),
    "hba1c": (4.0, 5.6),
    "cholesterol total": (0.0, 200.0),
    "total cholesterol": (0.0, 200.0),
    "triglycerides": (0.0, 150.0),
    "hdl cholesterol": (40.0, None),
    "ldl cholesterol": (0.0, 100.0),
    "tsh": (0.55, 4.78),
    "creatinine": (0.7, 1.3),
    "uric acid": (3.5, 7.2),
    "vitamin d": (30.0, 100.0),
}


def _number(token: str) -> Optional[float]:
    cleaned = re.sub(r"\s+", "", str(token or "")).replace("−", "-")
    if not cleaned:
        return None

    if "," in cleaned:
        if "." in cleaned:
            cleaned = cleaned.replace(",", "")
        else:
            parts = cleaned.split(",")
            indian_grouping = bool(
                re.fullmatch(r"\d{1,2}(?:,\d{2})+,\d{3}", cleaned)
            )
            thousands_grouping = len(parts) > 1 and all(
                len(part) == 3 for part in parts[1:]
            )
            if indian_grouping or thousands_grouping or len(parts) > 2:
                cleaned = cleaned.replace(",", "")
            elif len(parts) == 2 and len(parts[1]) == 3:
                cleaned = cleaned.replace(",", "")
            else:
                cleaned = cleaned.replace(",", ".")

    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_number(token: str) -> Optional[float]:
    return _number(token)


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

    lower_text = text.lower()
    comparator_match = COMPARATOR_RE.search(text)
    comparator = comparator_match.group(1) if comparator_match else ""

    if len(numbers) >= 2:
        low, high = numbers[0], numbers[1]
        return {
            "ref_low": min(low, high),
            "ref_high": max(low, high),
        }

    value = numbers[0]
    if comparator in {"<", "<=", "≤"} or re.search(
        r"\b(up\s*to|less\s+than|not\s+more\s+than|max(?:imum)?)\b",
        lower_text,
    ):
        return {"ref_low": None, "ref_high": value}
    if comparator in {">", ">=", "≥"} or re.search(
        r"\b(greater\s+than|not\s+less\s+than|min(?:imum)?)\b",
        lower_text,
    ):
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
    tokens = set(re.findall(r"[a-z]+|[↑↓]", normalized))
    if "high" in tokens or "above" in tokens or "elevated" in tokens or "↑" in tokens or normalized == "h":
        return "high"
    if "low" in tokens or "below" in tokens or "decreased" in tokens or "↓" in tokens or normalized == "l":
        return "low"
    if "normal" in tokens or "within" in tokens or "negative" in tokens or normalized == "n":
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
    range_source: Optional[str] = None

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


def _canonical_marker_name(name: str) -> str:
    cleaned = " ".join(str(name or "").split()).strip(" :.-")
    return MARKER_ALIASES.get(cleaned.lower(), cleaned)


def _standard_range(name: str) -> Optional[Tuple[Optional[float], Optional[float]]]:
    key = re.sub(r"\s+", " ", str(name or "").strip().lower())
    return STANDARD_RANGES.get(key)


def _standard_range_text(low: Optional[float], high: Optional[float]) -> str:
    low_text = _stringify_value(low)
    high_text = _stringify_value(high)
    if low is None and high is not None:
        return f"{STANDARD_RANGE_LABEL}: < {high_text}"
    if high is None and low is not None:
        return f"{STANDARD_RANGE_LABEL}: > {low_text}"
    return f"{STANDARD_RANGE_LABEL}: {low_text}–{high_text}"


def normalize_marker(raw: Any, page: Optional[int] = None) -> Optional[Marker]:
    item = _to_raw_marker(raw)
    name = _canonical_marker_name(item.marker_name())
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
    range_source = "report" if parsed_range else None
    if not parsed_range:
        standard = _standard_range(name)
        if standard:
            ref_low, ref_high_standard = standard
            parsed_range = {"ref_low": ref_low, "ref_high": ref_high_standard}
            ref_raw = _standard_range_text(ref_low, ref_high_standard)
            range_source = "standard"

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
        range_source=range_source,
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


def build_marker_warning(
    markers: List[Any], page_count: int = 1, candidate_count: Optional[int] = None
) -> Optional[str]:
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
    if candidate_count and candidate_count > 0 and count < candidate_count * 0.8:
        return (
            f"{count} of {candidate_count} results could be read. "
            "Results may be incomplete."
        )
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
- Extract every laboratory marker row on this page, including rows in tables. Do not stop early, even when the page contains many rows.
- Include every printed row, not only common or key markers. There is no whitelist.
- Include qualitative and text-only results such as Negative, Non-reactive, or Normal.
- Never invent, skip, merge, round, or change printed values, units, or reference ranges.
- Copy the printed reference range exactly. Preserve symbols such as <, >, <=, >=, Up to, and dashes. Do not substitute a standard or remembered range.
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
        config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=16384),
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
        config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=16384),
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


def _looks_like_merged_row(name: str, value: str, ref: str) -> bool:
    return len(_numbers(value)) > 1 or len(_numbers(ref)) > 2


def _infer_table_mapping(table: List[List[Any]]) -> Optional[Dict[str, int]]:
    for row in table[:3]:
        if len(row) < 3:
            continue
        if _numbers(str(row[1] or "")) or _numbers(str(row[2] or "")):
            return {"name": 0, "value": 1, "unit": 2, "ref": 3 if len(row) > 3 else 2}
    return None


def _table_markers(tables: List[List[List[Any]]], page: int) -> List[Marker]:
    markers: List[Marker] = []
    for table in tables:
        mapping = None
        start_index = 0
        for row_index, row in enumerate(table):
            candidate = _header_map(row)
            if candidate:
                mapping = candidate
                start_index = row_index + 1
                break
        if not mapping:
            mapping = _infer_table_mapping(table)
            start_index = 0
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
            if _looks_like_merged_row(name, value, ref):
                continue
            marker = normalize_marker(
                {
                    "name": name,
                    "value": value,
                    "value_text": value,
                    "unit": unit,
                    "ref_raw": ref,
                    "flag_in_report": flag,
                    "page": page,
                    "confidence": 0.78,
                },
                page,
            )
            if marker:
                markers.append(marker)
    return markers


def _cluster_word_lines(words: List[Dict[str, Any]], tolerance: float = 2.5) -> List[List[Dict[str, Any]]]:
    lines: List[List[Dict[str, Any]]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not lines or abs(word["top"] - lines[-1][0]["top"]) > tolerance:
            lines.append([word])
        else:
            lines[-1].append(word)
    for line in lines:
        line.sort(key=lambda item: item["x0"])
    return lines


def _header_positions(line: List[Dict[str, Any]]) -> Optional[Tuple[float, float, float]]:
    positions: Dict[str, float] = {}
    for word in line:
        text = str(word["text"]).strip().lower()
        if text.startswith("result") and "value" not in positions:
            positions["value"] = float(word["x0"])
        elif text.startswith("unit") and "unit" not in positions:
            positions["unit"] = float(word["x0"])
        elif text in {"ref", "ref.", "bio", "bio."} or text.startswith("reference"):
            if "ref" not in positions:
                positions["ref"] = float(word["x0"])
    if len(positions) == 3:
        return positions["value"], positions["unit"], positions["ref"]
    return None


def _looks_like_section_heading(text: str) -> bool:
    cleaned = " ".join(str(text or "").split()).strip()
    if not cleaned:
        return False
    if re.search(r"\b(note|interpretation|reference group|factors? that|method|comment)\b", cleaned, re.I):
        return True
    if len(cleaned) > 3 and cleaned.upper() == cleaned and re.search(r"[A-Z]", cleaned):
        return True
    if re.search(r"\b(panel|profile|screen|complete blood count|cbc)\b", cleaned, re.I) and not re.search(r"\d", cleaned):
        return True
    return False


def _clean_marker_name(text: str) -> str:
    cleaned = re.sub(r"\*\d+\*", " ", str(text or ""))
    return " ".join(cleaned.split()).strip(" :.-")


def _looks_like_prose(text: str) -> bool:
    cleaned = _clean_marker_name(text)
    if not cleaned:
        return False
    if cleaned.startswith(("|", "·", "-", "•")):
        return True
    if re.match(r"^(\d+[.)]\s|dr\.?\s|end\s+of\s+report)", cleaned, re.I):
        return True
    if "=" in cleaned or "|" in cleaned:
        return True
    if cleaned.lower() in {"samples", "least", "values", "minimum", "maximum", "note", "comments"}:
        return True
    if re.search(r"\b(sector|address|road|street|block|pin\s*code)\b", cleaned, re.I):
        return True
    if re.search(r"\b(as per|risk group|treatment goal|optional goal)\b", cleaned, re.I):
        return True
    if len(cleaned) > 90 or len(cleaned.split()) > 9:
        return True
    if cleaned.endswith(".") or cleaned.endswith(":"):
        return True
    return bool(
        re.search(
            r"\b(is|are|was|were|has|have|can|should|will|may|used|recommended|"
            r"reported|requires?|between|than|about|kindly|submit|within|"
            r"calculated using|best determined|due to|promotes|deficiency|"
            r"concentration|measured|obtained|considered|indicates|increases|"
            r"decreases|associated)\b",
            cleaned,
            re.I,
        )
    )


def _is_result_value(value: str) -> bool:
    cleaned = " ".join(str(value or "").split()).strip()
    if not cleaned:
        return False
    if re.search(r"\d", cleaned):
        return True
    if len(cleaned) <= 24 and len(cleaned.split()) <= 2:
        return bool(
            re.fullmatch(
                r"negative|non[- ]?reactive|reactive|positive|normal|abnormal|"
                r"borderline|equivocal|trace|nil|absent|present|[a-z]+\d+",
                cleaned,
                re.I,
            )
        )
    return False


def _join_text(left: str, right: str) -> str:
    left = (left or "").strip()
    right = (right or "").strip()
    if not left:
        return right
    if not right:
        return left
    if right[0] in "(,.;:)]":
        return f"{left}{right}"
    return f"{left} {right}"


def _layout_page_markers(page: Any, page_number: int) -> List[Marker]:
    words = page.extract_words(x_tolerance=1, y_tolerance=1) or []
    if not words:
        return []

    lines = _cluster_word_lines(words)
    boundaries: Optional[Tuple[float, float, float]] = None
    header_top: Optional[float] = None
    for line in lines:
        positions = _header_positions(line)
        if positions:
            boundaries = positions
            header_top = float(line[0]["top"])
            break
    if not boundaries or header_top is None:
        return []

    value_x, unit_x, ref_x = boundaries
    name_limit = value_x - 12.0
    value_limit = (value_x + unit_x) / 2.0
    unit_limit = (unit_x + ref_x) / 2.0

    rows: List[Dict[str, str]] = []
    current: Optional[Dict[str, str]] = None

    def finish() -> None:
        nonlocal current
        if (
            current
            and current.get("name")
            and _is_result_value(current.get("value", ""))
            and not _looks_like_prose(current.get("name", ""))
        ):
            rows.append(current)
        current = None

    for line in lines:
        if float(line[0]["top"]) <= header_top:
            continue
        columns: Dict[str, List[str]] = {"name": [], "value": [], "unit": [], "ref": []}
        for word in line:
            x = float(word["x0"])
            text = str(word["text"]).strip()
            if not text:
                continue
            if x < name_limit:
                columns["name"].append(text)
            elif x < value_limit:
                columns["value"].append(text)
            elif x < unit_limit:
                columns["unit"].append(text)
            else:
                columns["ref"].append(text)

        name = _clean_marker_name(" ".join(columns["name"]))
        value = " ".join(columns["value"]).strip()
        unit = " ".join(columns["unit"]).strip()
        ref = " ".join(columns["ref"]).strip()
        line_text = " ".join(str(word["text"]) for word in line).strip()
        valid_value = _is_result_value(value)

        if _looks_like_section_heading(line_text):
            finish()
            continue

        if not value and not unit and not ref:
            if not name or _looks_like_prose(name):
                finish()
                continue
            if current is None:
                continue
            if len(columns["name"]) <= 4:
                current["name"] = _join_text(current.get("name", ""), name)
            continue

        if valid_value and not name and current and not current.get("value"):
            current["value"] = value
            current["unit"] = _join_text(current.get("unit", ""), unit)
            current["ref"] = _join_text(current.get("ref", ""), ref)
            continue

        if not name or not valid_value:
            finish()
            continue
        finish()
        current = {"name": name, "value": value, "unit": unit, "ref": ref}

    finish()

    markers: List[Marker] = []
    for row in rows:
        name = _clean_marker_name(row["name"])
        if not name or _looks_like_prose(name):
            continue
        marker = normalize_marker(
            {
                "name": name,
                "value": row["value"],
                "value_text": row["value"],
                "unit": row["unit"],
                "ref_raw": row["ref"],
                "page": page_number,
                "confidence": 0.8,
            },
            page_number,
        )
        if marker:
            markers.append(marker)
    return markers


def _extract_layout_pages(path: str) -> List[List[Marker]]:
    try:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            return [
                _layout_page_markers(page, index)
                for index, page in enumerate(pdf.pages, start=1)
            ]
    except Exception:
        return []


def _log_markers(stage: str, page_number: int, markers: List[Marker]) -> None:
    logger.info(
        "PDF extraction stage=%s page=%s count=%s names=%s",
        stage,
        page_number,
        len(markers),
        [marker.name for marker in markers][:80],
    )


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
        if not name or _looks_like_prose(name) or _looks_like_section_heading(name):
            continue
        if re.search(r"\b(page|report|date|patient|doctor|address|phone|email)\b", name, re.I):
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
        if not ref_raw and not unit and not flag_to_status(flag_part):
            continue

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


def _candidate_count(markers_by_page: Iterable[Iterable[Marker]]) -> int:
    keys = set()
    for markers in markers_by_page:
        for marker in markers:
            name = re.sub(r"[^a-z0-9]+", "", marker.name.lower())
            value = (marker.value_text or _stringify_value(marker.value)).lower()
            if name and value:
                keys.add((name, value))
    return len(keys)


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
    date_pattern = r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})"
    source = text or ""
    for label in (
        r"reported",
        r"report\s*date",
        r"collected",
        r"collection\s*date",
        r"sample\s*date",
        r"test\s*date",
    ):
        match = re.search(label, source, re.IGNORECASE)
        if not match:
            continue
        window = source[match.end() : match.end() + 120]
        date_match = re.search(date_pattern, window)
        if date_match:
            normalized = _normalize_date(date_match.group(1))
            if normalized:
                return normalized
    date_match = re.search(date_pattern, source)
    if date_match:
        return _normalize_date(date_match.group(1))
    return None


def _lab_from_text(text: str) -> Optional[str]:
    source = text or ""
    header_end = re.search(r"\b(test\s+report|test\s+name|results\s+units)\b", source, re.I)
    header = source[: header_end.start()] if header_end else "\n".join(source.splitlines()[:60])
    for line in header.splitlines():
        clean = " ".join(line.split()).strip(" :|-")
        if re.match(
            r"^(lab\s*(no|id|#)|patient|name|ref|date|report|collected|processed)\b",
            clean,
            re.I,
        ):
            continue
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
    layout_pages = _extract_layout_pages(path)
    all_markers: List[Marker] = []
    local_markers_by_page: List[List[Marker]] = []
    lab_name = None
    report_date = None
    report_text_parts: List[str] = []

    for index, (page_text, page_image) in enumerate(pages, start=1):
        tables = plumber_pages[index - 1] if index - 1 < len(plumber_pages) else []
        layout_markers = layout_pages[index - 1] if index - 1 < len(layout_pages) else []
        report_text_parts.append(page_text)

        llm_markers: List[Marker] = []
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
                    llm_markers.append(marker)
        except Exception as exc:
            logger.info("PDF extraction LLM unavailable page=%s error=%s", index, type(exc).__name__)
        _log_markers("llm", index, llm_markers)

        table_markers = _table_markers(tables, index)
        _log_markers("table", index, table_markers)
        _log_markers("layout", index, layout_markers)

        local_markers = [*table_markers, *layout_markers]
        line_markers = _line_markers(page_text, index)
        _log_markers("line", index, line_markers)
        known_names = {
            re.sub(r"[^a-z0-9]+", "", marker.name.lower())
            for marker in [*llm_markers, *local_markers]
        }
        line_supplement = [
            marker
            for marker in line_markers
            if re.sub(r"[^a-z0-9]+", "", marker.name.lower()) not in known_names
        ]
        local_markers_by_page.append([*local_markers, *line_supplement])
        page_markers = [*llm_markers, *local_markers, *line_supplement]
        _log_markers("page_merged", index, page_markers)
        all_markers.extend(page_markers)

    full_text = "\n".join(part for part in report_text_parts if part.strip())
    lab_name = lab_name or _lab_from_text(full_text)
    report_date = report_date or _date_from_text(full_text)
    _log_markers("before_dedupe", 0, all_markers)
    markers = dedupe_and_sort_markers(all_markers)
    _log_markers("final", 0, markers)

    return {
        "report_text": full_text,
        "markers": marker_dicts(markers),
        "lab_name": lab_name or "Not specified",
        "report_date": report_date,
        "page_count": max(len(pages), len(plumber_pages), 1),
        "marker_candidate_count": _candidate_count(local_markers_by_page),
    }
