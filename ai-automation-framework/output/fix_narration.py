import json
from pathlib import Path


def main():
    path = Path("output/narration.json")
    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data:
        slide_num = item.get("index", 0) + 1  # 1-based
        if 5 <= slide_num <= 21:
            for key in ("narration", "transition"):
                if key not in item:
                    continue
                txt = item[key]
                if txt.startswith("Finally, "):
                    txt = "Next we move on to " + txt[len("Finally, ") :]
                txt = txt.replace("Finally, let's review", "Next we move on to")
                txt = txt.replace("Finally, let's explore", "Next we move on to")
                txt = txt.replace("Finally, let's move to", "Next we move on to")
                txt = txt.replace("Finally, let's check", "Next we move on to")
                if txt.startswith("Finally"):
                    txt = txt.replace("Finally", "Next we move on to", 1)
                # Clean up double phrasing created by replacements
                txt = txt.replace("Next we move on to let's review", "Next we move on to")
                txt = txt.replace("Next we move on to let's explore", "Next we move on to")
                txt = txt.replace("Next we move on to let's move to", "Next we move on to")
                txt = txt.replace("Next we move on to let's check", "Next we move on to")
                item[key] = txt

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
