"""Static consistency checks for the RAV literature-review website."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_js_array(path: Path, variable: str) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    match = re.search(rf"var {variable} = (\[.*\]);\s*$", raw, re.S)
    if not match:
        raise AssertionError(f"Could not parse {variable} in {path.name}")
    return json.loads(match.group(1))


def main() -> None:
    data_raw = (ROOT / "data.js").read_text(encoding="utf-8")
    meta_match = re.search(r"var SURVEY_META = (\{.*?\});", data_raw)
    assert meta_match
    meta = json.loads(meta_match.group(1))
    papers = parse_js_array(ROOT / "data.js", "PAPERS")
    edges = parse_js_array(ROOT / "edges.js", "EDGES")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    audit = json.loads((ROOT / "sources-audit.json").read_text(encoding="utf-8"))

    assert len(papers) == meta["paperCount"] == 117
    assert audit["paperCount"] == audit["verifiedCount"] == 117
    assert audit["failedCount"] == 0
    assert [paper["n"] for paper in papers] == list(range(1, 118))
    assert len({paper["key"] for paper in papers}) == 117
    assert len({paper["title"].casefold() for paper in papers}) == 117
    assert all(paper.get("doi") or paper.get("arxiv") or paper.get("url") for paper in papers)

    category_counts = Counter(paper["cat"] for paper in papers)
    expected_categories = {
        "Autonomous Driving",
        "Fleet Management",
        "Infrastructure",
        "Communication",
        "Cooperative Driving",
        "Pilots",
    }
    assert set(category_counts) == expected_categories
    assert min(category_counts.values()) >= 5

    keys = {paper["key"] for paper in papers}
    assert all(edge["from"] in keys and edge["to"] in keys for edge in edges)
    assert len(edges) == len({(edge["from"], edge["to"], edge["rel"]) for edge in edges})

    valid_numbers = {paper["n"] for paper in papers}
    refs = re.findall(r"(?:refs: \[|data-refs=\")([0-9, ]+)", app + index)
    for raw_refs in refs:
        assert all(int(value) in valid_numbers for value in raw_refs.split(",") if value.strip())

    section_ids = re.findall(r'<section id="([^"]+)"', index)
    assert section_ids[-1] == "cite"
    assert "Pick-up & Dispatch" not in (app + index + data_raw)
    assert "Haohua.Que@uga.edu" in index
    assert "Tianle.Zhu@uga.edu" in index
    assert "Handong.Yao@uga.edu" in index
    assert 'data-filter-key": "cat"' in app
    assert 'data-filter-key": "year"' in app
    assert "syncStatSelection();" in app

    print("Validated 117 papers, 6 categories, all cross-references, authors, citation order, and statistics hooks")
    print("Category counts:", dict(category_counts))
    print("Evidence edges:", len(edges))


if __name__ == "__main__":
    main()
