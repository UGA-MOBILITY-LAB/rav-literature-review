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


def parse_js_object(path: Path, variable: str) -> dict:
    raw = path.read_text(encoding="utf-8")
    match = re.search(rf"var {re.escape(variable)} = (\{{.*?\}});\s*(?=var |$)", raw, re.S)
    if not match:
        raise AssertionError(f"Could not parse {variable} in {path.name}")
    return json.loads(match.group(1))


def main() -> None:
    data_raw = (ROOT / "data.js").read_text(encoding="utf-8")
    meta_match = re.search(r"var SURVEY_META = (\{.*?\});", data_raw)
    assert meta_match
    meta = json.loads(meta_match.group(1))
    website_citation = parse_js_object(ROOT / "data.js", "WEBSITE_CITATION")
    papers = parse_js_array(ROOT / "data.js", "PAPERS")
    edges = parse_js_array(ROOT / "edges.js", "EDGES")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    style = (ROOT / "style.css").read_text(encoding="utf-8")
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

    required_website_fields = {
        "key", "title", "authors", "year", "month", "publisher", "type", "url"
    }
    assert required_website_fields <= set(website_citation)
    assert all(
        isinstance(website_citation[field], str) and website_citation[field].strip()
        for field in required_website_fields - {"authors", "year"}
    )
    assert website_citation["type"] == "WebSite"
    assert isinstance(website_citation["year"], int) and website_citation["year"] >= 2026
    assert isinstance(website_citation["authors"], list) and website_citation["authors"]
    assert all(
        isinstance(author, dict)
        and {"given", "family"} <= set(author)
        and all(isinstance(author[name], str) and author[name].strip() for name in ("given", "family"))
        for author in website_citation["authors"]
    )
    assert "var REVIEW_CITATION =" not in data_raw

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
    assert "findings" in section_ids
    all_ids = re.findall(r'\sid="([^"]+)"', index)
    assert len(all_ids) == len(set(all_ids))
    forthcoming_statuses = re.findall(
        r'class="[^"]*\bforthcoming-status\b[^"]*"', index, re.I
    )
    assert len(forthcoming_statuses) >= 2
    visible_text = re.sub(r"<[^>]+>", " ", index)
    visible_text = re.sub(r"\s+", " ", visible_text)
    assert re.search(
        r"narrative review.{0,180}(?:forthcoming|in preparation)", visible_text, re.I
    )
    assert not re.search(
        r'href=["\'][^"\']*rav-narrative-review\.(?:pdf|docx)["\']', index, re.I
    )
    nav_targets = re.findall(r'<a class="pill" href="#([^"]+)"', index)
    assert set(nav_targets) <= set(section_ids)
    theme_titles = set(re.findall(r'title: "([^"]+)", status:', app))
    progression_targets = set(re.findall(r'target: "([^"]+)"', app))
    assert progression_targets <= theme_titles
    retired_label = re.compile(r"\x70ick[\s_-]*u\x70.{0,8}dis\x70atch", re.I)
    assert not retired_label.search(app + index + data_raw)
    assert "v2x cybersecurity" not in (app + index).casefold()
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
    review_export_ids = re.findall(r'id="(cite-export-(?:bibtex|ris|xml))"', index)
    expected_review_export_ids = {
        "cite-export-bibtex", "cite-export-ris", "cite-export-xml"
    }
    assert len(review_export_ids) == len(set(review_export_ids)) == 3
    assert set(review_export_ids) == expected_review_export_ids
    assert all(f'getElementById("{export_id}")' in app for export_id in expected_review_export_ids)
    assert "WEBSITE_CITATION" in app and "REVIEW_CITATION" not in app
    assert all(
        f'rav-literature-review-website.{extension}' in app
        for extension in ("bib", "ris", "xml")
    )
    assert 'return "@misc{" + websiteCitation.key' in app
    assert 'var lines = ["TY  - ELEC"]' in app
    assert '<ref-type name=\\"Web Page\\">12</ref-type>' in app
    assert 'publisher = {' in app and 'month = {' in app
    assert '"DA  - " + websiteCitation.year' in app
    assert "<pub-dates><date>" in app and "<web-urls><url>" in app
    assert '"&": "\\\\&"' in app and "textasciitilde" in app
    assert app.count('title = {{') >= 2
    assert '.join(" and ")' in app
    assert '"@type": "WebSite"' in index
    required_interactions = {
        "journey-graph",
        "compare-grid",
        "gap-radar",
        "timeline-year",
        "stakeholder-view",
        "pilot-story-toggle",
        "pilot-corridor-toggle",
        "pilot-location-select",
        "pilot-location-view",
        "pilot-show-all",
        "command-palette",
        "reading-progress-bar",
        "scroll-to-top",
        "framework-flow-toggle",
        "evidence-multiselect",
        "scenario-comparison",
        "pilot-side-result",
        "year-brush-min",
        "year-brush-max",
        "year-brush-min-value",
        "year-brush-max-value",
        "year-brush-status",
        "stats-filter-summary",
        "research-workspace",
        "method-audit-trail",
        "references-expand-all",
        "references-collapse-all",
        "reference-list-summary",
    }
    assert all(f'id="{interaction_id}"' in index for interaction_id in required_interactions)
    assert 'details.open = true;' in app
    assert 'referenceGroups.push(details);' in app
    assert 'el("button", "epill-pin")' in app
    assert 'classList.toggle("is-visible", visible)' in app
    assert 'scrollTopButton.tabIndex = visible ? 0 : -1;' in app
    assert 'getElementById("pilot-show-all")' in app
    assert 'applyMapFilter("all")' in app
    assert 'getElementById("year-brush-status")' in app
    assert "formatYearSelection" in app and "clampYearBrush" in app
    assert "Version 2.8 feedback-led reading and navigation" in style
    assert ".epill-wrap" in style and ".scroll-to-top.is-visible" in style
    chart_summary_style = re.search(r"\.chart-card > summary\s*\{([^}]+)\}", style)
    assert chart_summary_style and "display: list-item" in chart_summary_style.group(1)
    assert 'class="scroll-to-top-label"' in index and ">Top</span>" in index
    assert len(theme_titles) == 25
    assert "Version 2.8" in index
    assert "Updated August 8, 2026" in index
    assert "app.js?v=20260808e" in index
    assert "style.css?v=20260808e" in index

    print(
        f"Validated {expected_count} papers, {len(theme_titles)} themes, "
        "review coding, forthcoming manuscript status, website citation exports, section order, and interaction hooks"
    )
    print("Category counts:", dict(category_counts))
    print("Evidence edges:", len(edges))


if __name__ == "__main__":
    main()
