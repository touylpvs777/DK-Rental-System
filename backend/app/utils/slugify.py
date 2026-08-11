import re
import unicodedata


def slugify(text: str) -> str:
    """Convert arbitrary text (including non-ASCII) to a URL-safe slug.

    Lao script cannot transliterate cleanly to ASCII, so any character that
    survives the ASCII strip is used; everything else is replaced with hyphens.
    Callers should prefer passing the English name where a clean slug matters.
    """
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "item"


def unique_slug(base: str, existing: set[str]) -> str:
    """Return *base* if not in *existing*, otherwise append -2, -3, … until unique."""
    slug = base
    counter = 2
    while slug in existing:
        slug = f"{base}-{counter}"
        counter += 1
    return slug
