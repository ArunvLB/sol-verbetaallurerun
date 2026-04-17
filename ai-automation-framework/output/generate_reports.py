import json
from pathlib import Path


def load_json(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def build_reports():
    slides = load_json("output/presentation.json")["slides"]
    narr = load_json("output/narration.json")
    narr_map = {item["slide"]: item for item in narr}

    for with_narr, dest in [(True, "output/report_with_narration.txt"), (False, "output/report_without_narration.txt")]:
        lines = [
            "AI Automation Framework - Presentation Report",
            "Website: https://beta.solwerindia.com/",
            f"With Narration: {'Yes' if with_narr else 'No'}",
            "==================================================",
            "",
        ]

        for idx, slide in enumerate(slides, 1):
            lines.append(f"Slide {idx}: {slide.get('title', '')}")
            if "page" in slide:
                lines.append(f"  Page: {slide['page']}")
            if "content" in slide:
                lines.append(f"  Content: {slide['content']}")
            for bullet in slide.get("bullets", []):
                lines.append(f"  - {bullet}")
            ni = narr_map.get(slide.get("title"))
            if with_narr and ni:
                lines.append(f"  Narration: {ni.get('narration', '')}")
                transition = ni.get("transition")
                if transition:
                    lines.append(f"  Transition: {transition}")
            elif not with_narr and ni:
                # Keep the same layout as the narrative report but omit the actual narration text.
                lines.append("  Narration: (omitted)")
                if ni.get("transition"):
                    lines.append("  Transition: (omitted)")
            lines.append("")

        Path(dest).write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build_reports()
