# Medora

**AI-powered blood test report analyser.** Upload a lab report as a PDF or a photo, and Medora reads every marker, shows each one on a clear gauge, and writes a plain-language summary you can download and take to your doctor.

> Medora provides informational insights and does not replace professional medical advice. It is not a medical device and does not diagnose, prescribe or recommend medication.

<!-- Add screenshots here: docs/dashboard.png, docs/gauges.png, docs/health-profile.png -->

## Features

- **PDF and image upload.** Accepts PDF, JPG, PNG, WebP and HEIC. Multi-page reports and phone photos are supported.
- **Full marker extraction.** Reads every test row, not just common markers, and keeps unknown markers as printed.
- **Gauge indicators.** Each marker gets a semicircle gauge with low, normal and high zones and a needle at the measured value.
- **Uses the report's own reference ranges.** Ranges such as `70 - 99`, `< 200`, `> 40`, `Up to 4.0` and `Male: 30 - 400` are parsed in code. Standard ranges are used only when the report prints none.
- **Review before analysis.** Extracted values can be checked and corrected before the analysis runs.
- **Grounded AI recommendations.** Medical, Nutrition, Exercise and "Questions for your doctor" tabs. The AI may only mention markers that were extracted.
- **Summary PDF.** One click generates a CrewAI-written summary and downloads it as a PDF.
- **Report assistant.** A chat drawer that answers questions grounded in your report, with suggested questions based on flagged markers.
- **Reports history and health profile.** Past analyses, vitals, history, medications, allergies, and biomarker trends across reports.
- **Light and dark themes.** Light, Dark or System, set in Settings.
- **Data controls.** Export your data as JSON, or delete your account and all records.

## Working 

<img width="1917" height="915" alt="Screenshot 2026-11-11 193834" src="https://github.com/user-attachments/assets/5b59ac5a-8bbc-419a-b25a-aacb0434d0c5" />



https://github.com/user-attachments/assets/37f6315c-3db1-43e1-9f2f-9c0b3bce4993



## How it works

```
 PDF / image
     |
     v
 Text extraction (PDF text, OCR or vision LLM for scans and photos)
     |
     v
 LLM returns strict JSON: name, value, unit, printed reference range, flag
     |
     v
 Review step: user checks and edits extracted values
     |
     v
 CrewAI agents: interpretation, nutrition, exercise  ->  summary agent
     |
     v
 Dashboard: KPI cards, gauges, recommendations  ->  Summary PDF
```

**Why status is computed in code.** The table, the KPI cards, the gauges and the AI text must always agree. The LLM only reads the document; range parsing, status and gauge position are deterministic.

| Printed range | Parsed as | Example result |
|---|---|---|
| `30 - 100`, `0.45–4.5` | low and high limits | 25 is Low |
| `< 100`, `Up to 4.0` | high limit only | 128 is High |
| `> 40` | low limit only | 36 is Low |
| missing, or a non-numeric result | unknown | text only, no gauge, excluded from KPI counts |

Edge cases handled: thousands separators (`1,250`), en dashes, values exactly on a limit (Normal), duplicate rows across pages, and report flags that disagree with the computed status (shown with a "Check this value" hint).

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, `next-themes`
- **Backend:** Python, with extraction, parsing and PDF generation services
- **AI agents:** CrewAI (interpretation, nutrition, exercise, summary)
- **PDF:** text extraction with PyMuPDF or pdfplumber, summary PDF with ReportLab or WeasyPrint
- **Auth and storage:** your configured auth provider and database

> Adjust this section to match the exact libraries in your repository.

## Getting started

### Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- An API key for your LLM provider

### Install

```bash
git clone https://github.com/wahid18-maqs/Medora
cd medora

# frontend
cd frontend
npm install

# backend
cd ../backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Configure

Create the environment files and fill in your values. Names below are examples, so match them to your code.

```bash
# backend/.env
GOOGLE_API_KEY=your-key
GROQ_API_KEY=your-key
MONGODB_URI=your-database-url
JWT_SECRET=generate-a-random-string

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=generate-a-random-string
```

### Run

```bash
# terminal 1: backend
cd backend
# start your API server, for example: uvicorn main:app --reload --port 8000

# terminal 2: frontend
cd frontend
npm run dev
```

Open <http://localhost:3000>.

## Privacy and safety

- Original uploads are kept only as long as needed, and health values are never written to logs.
- Image extraction can contain errors, so values are reviewed before analysis.
- AI output is limited to extracted markers and avoids diagnoses, medication and dosage advice.
- Users can export or permanently delete their data from Settings.

## Known limitations

- Extraction quality depends on report layout and photo quality. Blurry, cropped or glare-covered photos are rejected or flagged.
- Reference ranges differ between labs, which is why Medora uses the range printed on the report.
- Medora does not replace a clinician. Always discuss results with a qualified healthcare professional.
