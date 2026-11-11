from io import BytesIO
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from summary import ReportSummary

FOOTER_TEXT = "Medora provides informational insights and does not replace professional medical advice."
STATUS_COLORS = {
    "low": colors.HexColor("#1d4ed8"),
    "high": colors.HexColor("#b91c1c"),
    "normal": colors.HexColor("#047857"),
}
STATUS_BACKGROUNDS = {
    "low": colors.HexColor("#eff6ff"),
    "high": colors.HexColor("#fef2f2"),
    "normal": colors.HexColor("#ecfdf5"),
}


def _section(title: str, styles: Dict[str, ParagraphStyle]) -> List[Any]:
    return [Spacer(1, 5 * mm), Paragraph(escape(title), styles["section"]), Spacer(1, 2 * mm)]


def _bullet_list(items: List[str], styles: Dict[str, ParagraphStyle]) -> List[Any]:
    if not items:
        return [Paragraph("None listed.", styles["body"])]
    return [
        Paragraph(f"• {escape(item)}", styles["bullet"])
        for item in items
        if str(item).strip()
    ]


def _marker_table(summary: ReportSummary, styles: Dict[str, ParagraphStyle]) -> Table:
    header = ["Marker", "Value", "Unit", "Reference range", "Status"]
    rows = [[Paragraph(escape(cell), styles["tableHeader"]) for cell in header]]
    status_rows = []

    for row_number, marker in enumerate(summary.markers, start=1):
        status = marker.status.lower()
        status_rows.append((row_number, status))
        rows.append(
            [
                Paragraph(escape(marker.name), styles["tableCell"]),
                Paragraph(escape(str(marker.value)), styles["tableCell"]),
                Paragraph(escape(marker.unit or "—"), styles["tableCell"]),
                Paragraph(escape(marker.reference_range or "—"), styles["tableCell"]),
                Paragraph(status.title(), styles[f"status_{status}"]),
            ]
        )

    if len(rows) == 1:
        rows.append(
            [
                Paragraph("No markers were extracted.", styles["tableCell"]),
                "",
                "",
                "",
                "",
            ]
        )

    table = Table(rows, colWidths=[44 * mm, 26 * mm, 24 * mm, 44 * mm, 24 * mm], repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_number, status in status_rows:
        commands.append(
            ("BACKGROUND", (0, row_number), (-1, row_number), STATUS_BACKGROUNDS.get(status, colors.white))
        )
    table.setStyle(TableStyle(commands))
    return table


def build_summary_pdf(
    summary: ReportSummary,
    report_id: str,
    report_date: Optional[str] = None,
    diagnostic_center: Optional[str] = None,
) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title="Medora Health Report Summary",
        author="Medora",
    )

    base = getSampleStyleSheet()
    styles = {
        "brand": ParagraphStyle(
            "Brand",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=colors.HexColor("#0f766e"),
            alignment=TA_LEFT,
            spaceAfter=1 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=1 * mm,
            spaceAfter=1 * mm,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155"),
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            leftIndent=3 * mm,
            firstLineIndent=-3 * mm,
            textColor=colors.HexColor("#334155"),
            spaceAfter=1.5 * mm,
        ),
        "tableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=colors.HexColor("#334155"),
        ),
        "tableCell": ParagraphStyle(
            "TableCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=10.5,
            textColor=colors.HexColor("#334155"),
        ),
    }
    for status in ("low", "normal", "high"):
        styles[f"status_{status}"] = ParagraphStyle(
            f"Status{status.title()}",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10.5,
            textColor=STATUS_COLORS[status],
        )

    def footer(canvas, doc) -> None:
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
        canvas.setLineWidth(0.4)
        canvas.line(20 * mm, 16 * mm, A4[0] - 20 * mm, 16 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(20 * mm, 11 * mm, FOOTER_TEXT)
        canvas.restoreState()

    story: List[Any] = [
        Paragraph("Medora", styles["brand"]),
        Paragraph("Personal health report summary", styles["subtitle"]),
        Spacer(1, 3 * mm),
        Paragraph(
            f"Report ID: {escape(str(report_id))} &nbsp;&nbsp;|&nbsp;&nbsp; Report date: {escape(str(report_date or 'Not specified'))}",
            styles["subtitle"],
        ),
    ]
    if diagnostic_center:
        story.append(Paragraph(f"Laboratory: {escape(str(diagnostic_center))}", styles["subtitle"]))

    story.extend(_section("Overview", styles))
    story.append(Paragraph(escape(summary.overview), styles["body"]))

    story.extend(_section("Markers", styles))
    story.append(_marker_table(summary, styles))

    story.extend(_section("Key findings", styles))
    story.extend(_bullet_list(summary.key_findings, styles))

    story.extend(_section("Lifestyle notes", styles))
    story.extend(_bullet_list(summary.lifestyle_notes, styles))

    story.extend(_section("Questions for your doctor", styles))
    story.extend(_bullet_list(summary.questions_for_doctor, styles))

    story.extend(_section("Limitations", styles))
    story.append(
        Paragraph(
            escape(summary.limitations or "No additional limitations were provided."),
            styles["body"],
        )
    )

    story.append(Spacer(1, 8 * mm))
    story.append(
        KeepTogether(
            [
                Paragraph(
                    "This summary was generated from the extracted report data. "
                    "Always review the original laboratory report and your results with a qualified clinician.",
                    styles["subtitle"],
                )
            ]
        )
    )

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
