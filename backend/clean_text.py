import re


def _is_table_separator(line: str) -> bool:
    cleaned = line.strip().strip("|").replace(" ", "")
    return "|" in line and "--" in cleaned and bool(
        re.fullmatch(r"[-:|]+", cleaned)
    )


def strip_ai_tables(text: str) -> str:
    """Remove markdown table separators and pipe formatting from AI output."""
    if not text:
        return text

    lines = []
    for line in text.splitlines():
        if _is_table_separator(line):
            continue
        if line.count("|") >= 2:
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            cells = [cell for cell in cells if cell]
            if cells:
                line = " · ".join(cells)
        lines.append(line)

    text = "\n".join(lines)
    text = text.replace("|", " ")
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text


def strip_markdown(text: str) -> str:
    """Remove markdown emphasis, headings, bullet asterisks, and tables from AI output."""
    if not text:
        return text

    text = strip_ai_tables(text)
    text = re.sub(r"(?m)^[ \t]*#{1,6}[ \t]*", "", text)
    text = re.sub(r"\*{1,3}([^*\n]+?)\*{1,3}", r"\1", text)
    text = re.sub(r"(?m)^[ \t]*\*[ \t]+", "", text)
    text = text.replace("*", "").replace("#", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sanitize_markdown(text: str) -> str:
    """Keep safe markdown formatting while removing HTML and table separators."""
    if not text:
        return text

    text = strip_ai_tables(text)
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\x00", "")
    return text.strip()


def sanitize_ai_data(value):
    """Recursively sanitize AI-generated strings inside dict/list payloads."""
    if isinstance(value, str):
        return sanitize_markdown(value)
    if isinstance(value, list):
        return [sanitize_ai_data(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_ai_data(item) for key, item in value.items()}
    return value
