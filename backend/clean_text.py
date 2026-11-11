import re

def strip_markdown(text: str) -> str:
    """Remove markdown emphasis, headings, and bullet asterisks from AI output."""
    if not text:
        return text

    text = re.sub(r"(?m)^[ \t]*#{1,6}[ \t]*", "", text)
    text = re.sub(r"\*{1,3}([^*\n]+?)\*{1,3}", r"\1", text)
    text = re.sub(r"(?m)^[ \t]*\*[ \t]+", "", text)
    text = text.replace("*", "").replace("#", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sanitize_markdown(text: str) -> str:
    """Keep safe markdown formatting while removing executable HTML."""
    if not text:
        return text

    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\x00", "")
    return text.strip()
