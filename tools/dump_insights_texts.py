import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_FILE = ROOT / "js" / "ibba" / "ibba_insights_templates.js"
V2_FILE = ROOT / "js" / "ibba" / "ibba_insights_v2.js"
OUT_FILE = ROOT / "INSIGHTS_HE_LIST.md"


def parse_templates_js(path: Path):
    """
    Parse js/ibba/ibba_insights_templates.js (simple, line-based).
    Returns dict: {category: {type: [templates...]}}
    """
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    categories = {}
    current_category = None
    current_type = None
    collecting = False
    buf = []

    # Detect category headers like: team: {  / player: { / streaks: {
    cat_re = re.compile(r"^\s{2}([a-zA-Z0-9_]+)\s*:\s*\{\s*$")
    type_start_re = re.compile(r"^\s{4}([A-Z0-9_]+)\s*:\s*\[\s*$")
    str_re = re.compile(r'^\s{6}"(.*)"\s*,?\s*$')
    type_end_re = re.compile(r"^\s{4}\]\s*,?\s*$|^\s{4}\]\s*$")

    for line in lines:
        m_cat = cat_re.match(line)
        if m_cat:
            current_category = m_cat.group(1)
            categories.setdefault(current_category, {})
            current_type = None
            collecting = False
            buf = []
            continue

        m_type = type_start_re.match(line)
        if m_type and current_category:
            current_type = m_type.group(1)
            collecting = True
            buf = []
            continue

        if collecting and current_category and current_type:
            m_str = str_re.match(line)
            if m_str:
                buf.append(m_str.group(1))
                continue

            # End of array
            if line.strip().startswith("]"):
                categories[current_category][current_type] = buf[:]
                collecting = False
                current_type = None
                buf = []
                continue

    return categories


def parse_inline_texts_v2(path: Path):
    """
    Parse inline text/textShort literals inside js/ibba/ibba_insights_v2.js.
    Only captures when text/textShort is a string literal/backtick on the same line.
    Returns dict: {type: {'text': set([...]), 'textShort': set([...])}}
    """
    lines = path.read_text(encoding="utf-8").splitlines()

    # Match: type: 'XYZ'
    type_re = re.compile(r"type\s*:\s*'([A-Z0-9_]+)'\s*,?")
    # Match: text: `...`  OR text: "..." OR text: '...'
    text_re = re.compile(r"\btext\s*:\s*(`([^`]+)`|\"([^\"]+)\"|'([^']+)')\s*,?\s*$")
    short_re = re.compile(r"\btextShort\s*:\s*(`([^`]+)`|\"([^\"]+)\"|'([^']+)')\s*,?\s*$")

    out = {}
    current_type = None

    for line in lines:
        m_type = type_re.search(line)
        if m_type:
            current_type = m_type.group(1)
            out.setdefault(current_type, {"text": set(), "textShort": set()})

        if current_type:
            m_text = text_re.search(line)
            if m_text:
                val = m_text.group(2) or m_text.group(3) or m_text.group(4) or ""
                out[current_type]["text"].add(val)

            m_short = short_re.search(line)
            if m_short:
                val = m_short.group(2) or m_short.group(3) or m_short.group(4) or ""
                out[current_type]["textShort"].add(val)

        # Reset current_type when object likely ends (very rough, but avoids bleeding across functions)
        if line.strip() == "};":
            current_type = None

    # Drop types that only have empty captures
    cleaned = {}
    for t, payload in out.items():
        texts = {s for s in payload["text"] if s.strip()}
        shorts = {s for s in payload["textShort"] if s.strip()}
        if texts or shorts:
            cleaned[t] = {"text": texts, "textShort": shorts}
    return cleaned


def md_escape(s: str) -> str:
    # Keep as-is but avoid accidental markdown bullets inside templates
    return s.replace("\r", "")


def write_md(templates, inline_texts, out_path: Path):
    lines = []
    lines.append("## IBBA Insights – רשימת ניסוחים בעברית (Generated)")
    lines.append("")
    lines.append(f"- מקור טמפלטים: `{TEMPLATES_FILE.as_posix()}`")
    lines.append(f"- מקור טקסטים קשיחים: `{V2_FILE.as_posix()}`")
    lines.append("")

    # Templates section
    lines.append("## 1) טמפלטים דינמיים (8 וריאציות לכל סוג)")
    lines.append("")
    for category in sorted(templates.keys()):
        lines.append(f"### קטגוריה: `{category}`")
        lines.append("")
        for insight_type in sorted(templates[category].keys()):
            lines.append(f"- **{insight_type}**")
            for i, tpl in enumerate(templates[category][insight_type], start=1):
                lines.append(f"  - ({i}) `{md_escape(tpl)}`")
            lines.append("")

    # Inline section
    lines.append("## 2) טקסטים קשיחים בתוך `ibba_insights_v2.js`")
    lines.append("")
    for insight_type in sorted(inline_texts.keys()):
        lines.append(f"### {insight_type}")
        payload = inline_texts[insight_type]
        if payload["text"]:
            lines.append("")
            lines.append("- **text**")
            for s in sorted(payload["text"]):
                lines.append(f"  - `{md_escape(s)}`")
        if payload["textShort"]:
            lines.append("")
            lines.append("- **textShort**")
            for s in sorted(payload["textShort"]):
                lines.append(f"  - `{md_escape(s)}`")
        lines.append("")

    out_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main():
    if not TEMPLATES_FILE.exists():
        raise SystemExit(f"Templates file not found: {TEMPLATES_FILE}")
    if not V2_FILE.exists():
        raise SystemExit(f"V2 file not found: {V2_FILE}")

    templates = parse_templates_js(TEMPLATES_FILE)
    inline_texts = parse_inline_texts_v2(V2_FILE)
    write_md(templates, inline_texts, OUT_FILE)
    print(f"Wrote: {OUT_FILE}")
    print(f"Templates categories: {len(templates)}")
    print(f"Inline types captured: {len(inline_texts)}")


if __name__ == "__main__":
    main()


