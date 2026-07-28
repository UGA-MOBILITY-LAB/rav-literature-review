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
    oa_audit = json.loads((ROOT / "open-access-audit.json").read_text(encoding="utf-8"))

    expected_count = meta["paperCount"]
    assert len(papers) == expected_count
    assert audit["paperCount"] == audit["verifiedCount"] == expected_count
    assert audit["failedCount"] == 0
    assert [paper["n"] for paper in papers] == list(range(1, expected_count + 1))
    assert len({paper["key"] for paper in papers}) == expected_count
    assert len({paper["title"].casefold() for paper in papers}) == expected_count
    assert all(paper.get("doi") or paper.get("arxiv") or paper.get("url") for paper in papers)
    assert all(paper.get("authors") for paper in papers)
    required_coding = {"etype", "rural", "strength", "access", "focus", "rav"}
    assert all(required_coding <= set(paper) for paper in papers)
    assert {paper["strength"] for paper in papers} <= {"High", "Moderate", "Emerging"}
    assert {paper["rural"] for paper in papers} <= {
        "Direct rural evidence",
        "Transferable to rural",
        "Context-limited",
    }
    assert {paper["access"] for paper in papers} <= {"Open", "Restricted", "Unknown"}
    assert oa_audit["doiCount"] == sum(bool(paper.get("doi")) for paper in papers)
    assert oa_audit["verifiedCount"] == oa_audit["doiCount"]
    assert oa_audit["openCount"] == sum(
        paper.get("access") == "Open" and bool(paper.get("doi")) for paper in papers
    )

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
    assert "methodology" in section_ids
    assert "decision-lab" in section_ids
    all_ids = re.findall(r'\sid="([^"]+)"', index)
    assert len(all_ids) == len(set(all_ids))
    nav_targets = re.findall(r'<a class="pill" href="#([^"]+)"', index)
    assert set(nav_targets) <= set(section_ids)
    theme_titles = set(re.findall(r'title: "([^"]+)", status:', app))
    progression_targets = set(re.findall(r'target: "([^"]+)"', app))
    assert progression_targets <= theme_titles
    retired_label = re.compile(r"\x70ick[\s_-]*u\x70.{0,8}dis\x70atch", re.I)
    assert not retired_label.search(app + index + data_raw)
    assert "Haohua.Que@uga.edu" in index
    assert "Tianle.Zhu@uga.edu" in index
    assert "Handong.Yao@uga.edu" in index
    assert 'data-filter-key": "cat"' in app
    assert 'data-filter-key": "year"' in app
    assert 'createDropdown("access"' in app
    assert 'createDropdown("strength"' in app
    assert "renderHeatmap();" in app
    assert "export-bibtex" in index
    assert "qr-uga-mobility-lab.png" in index
    assert "syncStatSelection();" in app
    required_interactions = {
        "journey-graph",
        "compare-grid",
        "gap-radar",
        "timeline-year",
        "stakeholder-view",
        "pilot-story-toggle",
        "pilot-corridor-toggle",
        "command-palette",
        "reading-progress-bar",
    }
    assert all(f'id="{interaction_id}"' in index for interaction_id in required_interactions)
    assert "Version 2.6" in index
    assert "app.js?v=20260727k" in index
    assert "style.css?v=20260727k" in index

    print(
        f"Validated {expected_count} papers, {len(theme_titles)} themes, "
        "review coding, OA audit, cross-references, authors, section order, and interaction hooks"
    )
    print("Category counts:", dict(category_counts))
    print("Evidence edges:", len(edges))


if __name__ == "__main__":
    main()
