import io
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Type
from dotenv import load_dotenv
import cv2
import numpy as np
from PIL import Image, ImageOps
from crewai_tools import SerperDevTool
from pydantic import BaseModel, Field
from langchain_community.document_loaders import PyPDFLoader
from crewai.tools import BaseTool

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:
    pillow_heif = None

load_dotenv()

search_tool = SerperDevTool()

# 1. Blood Test Report Reading Tool
class BloodTestReportInput(BaseModel):
    path: str = Field(default='data/sample.pdf', description="Path to the PDF blood test report")

class BloodTestReportTool(BaseTool):
    name: str = "read_blood_test_report"
    description: str = "Reads and extracts data from a blood test report PDF file"
    args_schema: Type[BaseModel] = BloodTestReportInput

    def _run(self, path: str = 'data/sample.pdf') -> str:
        try:
            if not os.path.exists(path):
                return "Please upload a blood test report PDF file."

            if not path.lower().endswith('.pdf'):
                return "Invalid file type. Please upload a PDF."

            loader = PyPDFLoader(file_path=path)
            docs = loader.load()

            full_report = ""
            for doc in docs:
                content = doc.page_content
                content = re.sub(r'\n{2,}', '\n', content)
                content = re.sub(r' {2,}', ' ', content)
                full_report += content.strip() + "\n"

            if not full_report.strip():
                return "The uploaded PDF appears empty or unreadable."

            return full_report.strip()

        except Exception:
            return "Failed to read the blood test report. Make sure it is a valid PDF file."


#  2. Nutrition Recommendation Tool
class NutritionAnalysisInput(BaseModel):
    blood_report_data: str = Field(description="Blood report data to analyze")

class NutritionTool(BaseTool):
    name: str = "analyze_nutrition"
    description: str = "Analyzes blood test data and recommends nutrition"
    args_schema: Type[BaseModel] = NutritionAnalysisInput

    def _run(self, blood_report_data: str) -> str:
        if not blood_report_data or "please upload" in blood_report_data.lower():
            return "Upload your blood test report to get personalized nutrition advice."

        suggestions = []
        text = blood_report_data.lower()

        if 'hemoglobin' in text or 'hb' in text:
            suggestions.append("• Monitor iron intake with foods like spinach, meats, and lentils.")
        if 'cholesterol' in text:
            suggestions.append("• Choose heart-healthy fats like olive oil, and reduce saturated fats.")
        if 'glucose' in text or 'sugar' in text:
            suggestions.append("• Control sugar intake. Prefer complex carbs over simple sugars.")
        if 'vitamin' in text:
            suggestions.append("• Consider multivitamins or food-based vitamin sources.")

        if not suggestions:
            suggestions.append("• Maintain a balanced diet with fruits, vegetables, and whole grains.")

        disclaimer = "\n\nDISCLAIMER: This is educational content. Consult a registered dietitian for personalized advice."
        return "NUTRITION RECOMMENDATIONS:\n" + "\n".join(suggestions) + disclaimer


#  3. Exercise Plan Tool
class ExercisePlanInput(BaseModel):
    blood_report_data: str = Field(description="Blood report data to analyze")

class ExerciseTool(BaseTool):
    name: str = "create_exercise_plan"
    description: str = "Creates exercise recommendations based on blood report"
    args_schema: Type[BaseModel] = ExercisePlanInput

    def _run(self, blood_report_data: str) -> str:
        if not blood_report_data or "please upload" in blood_report_data.lower():
            return "Upload your blood test report to get exercise recommendations."

        plan = []
        text = blood_report_data.lower()

        if 'cholesterol' in text or 'lipid' in text:
            plan.append("• Do 150 mins/week of moderate cardio (e.g., brisk walking, cycling).")
        if 'glucose' in text or 'diabetes' in text:
            plan.append("• Add strength training twice a week to improve insulin response.")
        if 'blood pressure' in text or 'hypertension' in text:
            plan.append("• Engage in low-impact activities like swimming or walking.")

        plan.extend([
            "• Start slow and gradually increase intensity.",
            "• Alternate cardio and strength days.",
            "• Stay hydrated and listen to your body."
        ])

        disclaimer = "\n\nDISCLAIMER: Consult a healthcare provider before starting new exercises."
        return "EXERCISE PLAN:\n" + "\n".join(plan) + disclaimer


MAX_IMAGES = 6
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 2200
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

IMAGE_EXTRACTION_PROMPT = """You are a medical report transcription system. Read the uploaded blood test report image(s) and return ONLY valid JSON.

The JSON must use exactly this structure:
{
  "lab_name": "Laboratory or diagnostic centre name, or null",
  "report_date": "YYYY-MM-DD, or null",
  "markers": [
    {
      "marker": "Exact test/marker name",
      "value": "Printed result value",
      "unit": "Printed unit, or empty string",
      "reference_range": "Printed reference range exactly as shown, or empty string",
      "confidence": 0.0
    }
  ]
}

Rules:
- Transcribe only text that is visibly present in the image. Never guess or invent a value.
- Include every laboratory marker row you can read.
- `confidence` must be between 0 and 1 and reflect how clearly that row was read.
- If a field is missing, use null for lab/date and an empty string for unit/reference_range.
- Return JSON only. Do not include markdown, commentary, or code fences.
"""

IMAGE_RETRY_PROMPT = """Your previous response was not valid JSON. Return ONLY a valid JSON object matching the required schema.
Do not include markdown fences, commentary, or trailing text.
Required shape:
{"lab_name": string|null, "report_date": string|null, "markers":[{"marker":string,"value":string,"unit":string,"reference_range":string,"confidence":number}]}
"""


class ImageExtractionError(Exception):
    pass


class ExtractedImageMarker(BaseModel):
    marker: str
    value: Any
    unit: str = ""
    reference_range: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class ImageExtractionPayload(BaseModel):
    lab_name: Optional[str] = None
    report_date: Optional[str] = None
    markers: List[ExtractedImageMarker] = Field(default_factory=list)


def _file_extension(filename: str) -> str:
    return os.path.splitext((filename or "").lower())[1]


def validate_uploaded_images(files: List[Tuple[str, bytes, str]]) -> None:
    if not files:
        raise ImageExtractionError("Please add at least one report image.")
    if len(files) > MAX_IMAGES:
        raise ImageExtractionError(f"Please upload no more than {MAX_IMAGES} images.")

    for filename, content, content_type in files:
        if len(content) > MAX_FILE_SIZE:
            raise ImageExtractionError("Each image must be 10 MB or smaller.")
        extension = _file_extension(filename)
        mime = (content_type or "").lower()
        if extension not in ALLOWED_EXTENSIONS and mime not in ALLOWED_MIME_TYPES:
            raise ImageExtractionError("Please upload JPG, PNG, WebP, or HEIC images.")


def _open_image(content: bytes, filename: str) -> Image.Image:
    try:
        with Image.open(io.BytesIO(content)) as opened:
            image = ImageOps.exif_transpose(opened)
            image = image.convert("RGB")
            return image.copy()
    except Exception:
        raise ImageExtractionError(
            f"Could not read {filename or 'the image'}. Please upload a clear JPG, PNG, WebP, or HEIC photo."
        )


def _resize_for_analysis(image: Image.Image) -> Image.Image:
    width, height = image.size
    longest = max(width, height)
    if longest <= MAX_IMAGE_DIMENSION:
        return image
    scale = MAX_IMAGE_DIMENSION / float(longest)
    return image.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.LANCZOS)


def _quality_issue(image: Image.Image) -> Optional[str]:
    gray = np.array(image.convert("L"))
    brightness = float(gray.mean())
    if brightness < 45:
        return "too dark"
    if brightness > 248:
        return "too bright"

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_score < 45:
        return "too blurry"

    edges = cv2.Canny(gray, 60, 160)
    edge_ratio = float(np.count_nonzero(edges)) / float(edges.size)
    if edge_ratio < 0.003:
        return "no readable text"

    return None


def _prepare_images(files: List[Tuple[str, bytes, str]]) -> List[Image.Image]:
    validate_uploaded_images(files)
    images: List[Image.Image] = []
    for filename, content, _ in files:
        image = _open_image(content, filename)
        issue = _quality_issue(image)
        if issue:
            if issue == "no readable text":
                message = "One of your images has no readable text. Please upload a clearer photo of your report."
            else:
                message = f"One of your images is {issue}. Please upload a clearer, well-lit photo of your report."
            raise ImageExtractionError(message)
        images.append(_resize_for_analysis(image))
    return images


def _strip_code_fences(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_extraction_json(text: str) -> ImageExtractionPayload:
    cleaned = _strip_code_fences(text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")

    payload = json.loads(cleaned[start : end + 1])
    return ImageExtractionPayload.model_validate(payload)


def _call_gemini_vision(images: List[Image.Image], prompt: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise ImageExtractionError("Image extraction is not configured. Please contact support.")

    try:
        from google import genai
        from google.genai import types
    except Exception:
        raise ImageExtractionError("Image extraction is unavailable right now. Please try again later.")

    parts = [types.Part.from_text(text=prompt)]
    for image in images:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        parts.append(types.Part.from_bytes(data=buffer.getvalue(), mime_type="image/jpeg"))

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(temperature=0.1),
        )
        return getattr(response, "text", "") or ""
    except Exception:
        raise ImageExtractionError("Could not read the report image. Please try again with a clearer photo.")


def _normalize_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = str(value).strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y"):
        try:
            import datetime

            return datetime.datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return value


def _stringify_value(value: Any) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _plausibility_warning(marker: str, value_text: str) -> Optional[str]:
    match = re.search(r"-?\d+(?:\.\d+)?", value_text.replace(",", ""))
    if not match:
        return None
    value = float(match.group(0))
    name = marker.lower()

    limits = {
        "hemoglobin": (2.0, 25.0),
        "hb": (2.0, 25.0),
        "glucose": (10.0, 800.0),
        "cholesterol": (20.0, 800.0),
        "triglycerides": (10.0, 2000.0),
        "wbc": (0.1, 100.0),
        "platelets": (5.0, 1500.0),
        "vitamin d": (1.0, 300.0),
        "creatinine": (0.1, 20.0),
        "tsh": (0.001, 100.0),
    }
    for key, (low, high) in limits.items():
        if key in name and (value < low or value > high):
            return "This value looks implausible; please verify it against the original report."
    return None


def extract_report_images(files: List[Tuple[str, bytes, str]]) -> Dict[str, Any]:
    images = _prepare_images(files)

    raw_text = _call_gemini_vision(images, IMAGE_EXTRACTION_PROMPT)
    try:
        payload = _parse_extraction_json(raw_text)
    except Exception:
        raw_text = _call_gemini_vision(images, IMAGE_RETRY_PROMPT)
        try:
            payload = _parse_extraction_json(raw_text)
        except Exception:
            raise ImageExtractionError(
                "We could not read structured values from the image. Please upload a clearer photo."
            )

    markers: List[Dict[str, Any]] = []
    for item in payload.markers:
        marker_name = str(item.marker or "").strip()
        if not marker_name:
            continue
        value_text = _stringify_value(item.value)
        if not value_text:
            continue
        markers.append(
            {
                "marker": marker_name,
                "value": value_text,
                "unit": str(item.unit or "").strip(),
                "reference_range": str(item.reference_range or "").strip(),
                "confidence": round(float(item.confidence), 2),
                "plausibility_warning": _plausibility_warning(marker_name, value_text),
            }
        )

    if not markers:
        raise ImageExtractionError(
            "No lab values could be detected. Please upload a clearer photo of your report."
        )

    marker_warning = None
    if len(markers) <= 2:
        marker_warning = (
            f"Only {len(markers)} marker{'s' if len(markers) != 1 else ''} could be read from "
            f"this image. Results may be incomplete."
        )

    return {
        "status": "success",
        "lab_name": (payload.lab_name or "").strip() or None,
        "report_date": _normalize_date(payload.report_date),
        "markers": markers,
        "marker_warning": marker_warning,
        "file_names": [name for name, _, _ in files],
    }


def _first_number(text: str) -> Optional[float]:
    match = re.search(r"-?\d+(?:\.\d+)?", (text or "").replace(",", ""))
    return float(match.group(0)) if match else None


def parse_reference_range(text: str) -> Optional[Tuple[float, float]]:
    numbers = re.findall(r"\d+(?:\.\d+)?", (text or "").replace(",", ""))
    if len(numbers) >= 2:
        low, high = float(numbers[0]), float(numbers[1])
        return (min(low, high), max(low, high))
    return None


def default_reference_range(marker: str) -> Optional[Tuple[float, float]]:
    name = (marker or "").lower()
    defaults = [
        ("hemoglobin", (13.0, 17.0)),
        ("hb", (13.0, 17.0)),
        ("glucose", (70.0, 99.0)),
        ("vitamin d", (30.0, 100.0)),
        ("cholesterol", (125.0, 200.0)),
        ("wbc", (4.5, 11.0)),
        ("platelet", (150.0, 450.0)),
        ("triglyceride", (50.0, 150.0)),
        ("iron", (60.0, 170.0)),
        ("creatinine", (0.6, 1.3)),
        ("tsh", (0.4, 4.0)),
    ]
    for key, value in defaults:
        if key in name:
            return value
    return None


def to_internal_marker(marker: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name = str(marker.get("marker") or "").strip()
    value_text = _stringify_value(marker.get("value", ""))
    if not name or not value_text:
        return None

    value = _first_number(value_text)
    if value is None:
        return None

    reference_range = parse_reference_range(str(marker.get("reference_range") or ""))
    if not reference_range:
        reference_range = default_reference_range(name)
    if not reference_range:
        reference_range = (0.0, max(value * 1.5, value + 1.0))

    low, high = reference_range
    if value < low:
        status = "Low"
    elif value > high:
        status = "High"
    else:
        status = "Normal"

    return {
        "name": name,
        "value": value,
        "unit": str(marker.get("unit") or "").strip(),
        "range": [low, high],
        "status": status,
    }


class BloodReportImageInput(BaseModel):
    image_paths: str = Field(description="Newline-separated absolute paths to uploaded report images")


class BloodReportImageTool(BaseTool):
    name: str = "extract_blood_report_image"
    description: str = (
        "Preprocesses blood test report photos, checks image quality, and transcribes the lab "
        "values into strict JSON using a vision model."
    )
    args_schema: Type[BaseModel] = BloodReportImageInput

    def _run(self, image_paths: str) -> str:
        files: List[Tuple[str, bytes, str]] = []
        try:
            for path in [line.strip() for line in (image_paths or "").splitlines() if line.strip()]:
                if not os.path.exists(path):
                    raise ImageExtractionError("One of the uploaded images could not be read.")
                import mimetypes

                with open(path, "rb") as handle:
                    files.append((os.path.basename(path), handle.read(), mimetypes.guess_type(path)[0] or ""))
            return json.dumps(extract_report_images(files))
        except ImageExtractionError as error:
            return json.dumps({"status": "error", "message": str(error)})
        except Exception:
            return json.dumps(
                {
                    "status": "error",
                    "message": "Could not process the uploaded images. Please try again.",
                }
            )


blood_test_tool = BloodTestReportTool()
nutrition_tool = NutritionTool()
exercise_tool = ExerciseTool()
image_extraction_tool = BloodReportImageTool()
