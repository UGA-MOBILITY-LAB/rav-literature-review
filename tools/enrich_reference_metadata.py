"""Add reproducible review coding and verified open-access metadata to data.js.

The coding is intentionally conservative: it describes study design and likely
RAV transferability from bibliographic metadata. It does not claim paper-level
findings and is not a formal risk-of-bias assessment.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.js"
OA_AUDIT_PATH = ROOT / "open-access-audit.json"
EMAIL = "Haohua.Que@uga.edu"

# Crossref author metadata used to complete the four records that were missing
# author strings in the original review table.
AUTHOR_COMPLETIONS = {
    "10.3390/app15084195": "Melika Ansarinejad, Kian Ansarinejad, Pan Lu, Ying Huang, Denver Tolliver",
    "10.3390/s25072004": (
        "Ashok Kumar Patil, Bhargav Punugupati, Himanshi Gupta, Niranjan S. Mayur, "
        "Srivatsa Ramesh, Prasad B. Honnavalli"
    ),
    "10.3390/s22218317": "Karina Meneses-Cime, Bilin Aksun Guvenc, Levent Guvenc",
    "10.1016/j.isci.2024.109751": (
        "Yangjie Ji, Zewei Zhou, Ziru Yang, Yanjun Huang, Yuanjian Zhang, "
        "Wanting Zhang, Lu Xiong, Zhuoping Yu"
    ),
}


def read_data() -> tuple[dict, list[dict]]:
    raw = DATA_PATH.read_text(encoding="utf-8")
    meta_match = re.search(r"var SURVEY_META = (\{.*?\});", raw)
    papers_match = re.search(r"var PAPERS = (\[.*\]);\s*$", raw, re.S)
    if not meta_match or not papers_match:
        raise RuntimeError("Could not parse data.js")
    return json.loads(meta_match.group(1)), json.loads(papers_match.group(1))


def study_type(paper: dict) -> str:
    text = f"{paper['title']} {paper.get('venue', '')}".casefold()
    if re.search(r"\b(systematic review|literature review|survey|review|overview|taxonomy)\b", text):
        return "Review"
    if paper["cat"] == "Pilots" or re.search(
        r"\b(pilot|deployment|demonstration|case study|field operational|test route)\b", text
    ):
        return "Field pilot / case"
    if paper.get("vtype") == "Report" or re.search(
        r"\b(guidance|policy|program|roadmap|standards?|framework report)\b", text
    ):
        return "Policy / program report"
    if re.search(
        r"\b(simulation|modeling|modelling|optimization|optimisation|routing|scheduling|"
        r"algorithm|control|planning|prediction|digital twin)\b",
        text,
    ):
        return "Modeling / simulation"
    if re.search(
        r"\b(experiment|evaluation|testbed|dataset|benchmark|measurement|field test|"
        r"validation|prototype|performance analysis)\b",
        text,
    ):
        return "Empirical / testbed"
    return "System / method"


def rural_relevance(paper: dict) -> str:
    text = f"{paper['title']} {paper.get('venue', '')}".casefold()
    direct = (
        "rural",
        "unpaved",
        "low-volume road",
        "public lands",
        "national park",
        "grand rapids",
        "sleeping bear",
        "yellowstone",
        "wright brothers",
        "gomarti",
        "adast",
        "cassie",
        "teddy",
    )
    limited = (
        "urban",
        "metropolitan",
        "city-scale",
        "smart city",
        "parking",
        "signalized intersection",
    )
    if paper["cat"] == "Pilots" or any(term in text for term in direct):
        return "Direct rural evidence"
    if any(term in text for term in limited):
        return "Context-limited"
    return "Transferable to rural"


def evidence_strength(paper: dict, kind: str) -> str:
    text = paper["title"].casefold()
    if kind == "Review" and paper.get("vtype") == "Journal":
        return "High"
    if "systematic review" in text or "meta-analysis" in text:
        return "High"
    if paper.get("vtype") in {"Journal", "Report"} or kind in {
        "Empirical / testbed",
        "Field pilot / case",
    }:
        return "Moderate"
    return "Emerging"


def focus_area(paper: dict) -> str:
    text = paper["title"].casefold()
    category_topics = {
        "Fleet Management": "fleet operations and service planning",
        "Infrastructure": "road readiness and infrastructure",
        "Communication": "connectivity and cybersecurity",
        "Cooperative Driving": "cooperative driving",
        "Pilots": "field deployment and service delivery",
    }
    if paper["cat"] == "Autonomous Driving":
        rules = [
            (("perception", "sensor", "lidar", "radar", "camera", "weather"), "perception and sensing"),
            (("localization", "localisation", "mapping", "gnss", "positioning"), "localization and mapping"),
            (("route", "routing", "path planning", "energy"), "routing, planning, and energy"),
        ]
        topic = next(
            (label for terms, label in rules if any(term in text for term in terms)),
            "autonomous driving systems",
        )
    else:
        topic = category_topics[paper["cat"]]
    prefix = {
        "Review": "Synthesis of",
        "Field pilot / case": "Operational evidence on",
        "Policy / program report": "Program or policy evidence on",
        "Modeling / simulation": "Model-based evidence on",
        "Empirical / testbed": "Empirical evidence on",
        "System / method": "Technical method for",
    }[study_type(paper)]
    return f"{prefix} {topic}."


RAV_RELEVANCE = {
    "Autonomous Driving": (
        "Informs the onboard perception, localization, integration, or route-planning "
        "stack that must remain safe when rural infrastructure and connectivity are sparse."
    ),
    "Fleet Management": (
        "Informs fleet sizing, dispatch, scheduling, remote supervision, and service "
        "support for geographically dispersed, low-density demand."
    ),
    "Infrastructure": (
        "Informs selective road upgrades, condition assessment, mapping, and digital "
        "infrastructure for rural corridors."
    ),
    "Communication": (
        "Informs multi-channel connectivity, edge support, cybersecurity, and graceful "
        "operation through rural coverage gaps."
    ),
    "Cooperative Driving": (
        "Informs roadside-assisted sensing, warnings, coordination, and safe fallback "
        "when cooperative services are unavailable."
    ),
    "Pilots": (
        "Provides operational precedent for rural or remote automated service and helps "
        "define deployment gates, measures, and stakeholder responsibilities."
    ),
}


def fetch_unpaywall(doi: str) -> dict:
    encoded = urllib.parse.quote(doi, safe="")
    url = f"https://api.unpaywall.org/v2/{encoded}?email={urllib.parse.quote(EMAIL)}"
    request = urllib.request.Request(url, headers={"User-Agent": "RAV-literature-review/2.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = json.load(response)
            best = payload.get("best_oa_location") or {}
            return {
                "doi": doi,
                "verified": True,
                "isOa": bool(payload.get("is_oa")),
                "status": payload.get("oa_status") or "closed",
                "oaUrl": best.get("url_for_pdf") or best.get("url") or "",
            }
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt == 2:
                return {"doi": doi, "verified": False, "error": str(exc)}
            time.sleep(0.8 * (attempt + 1))
    raise AssertionError("unreachable")


def build_oa_audit(papers: list[dict], fetch: bool) -> dict[str, dict]:
    cached: dict[str, dict] = {}
    if OA_AUDIT_PATH.exists():
        prior = json.loads(OA_AUDIT_PATH.read_text(encoding="utf-8"))
        cached = {entry["doi"].casefold(): entry for entry in prior.get("entries", [])}
    dois = sorted({paper["doi"] for paper in papers if paper.get("doi")})
    missing = [
        doi for doi in dois
        if doi.casefold() not in cached or not cached[doi.casefold()].get("verified")
    ]
    if fetch and missing:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(fetch_unpaywall, doi): doi for doi in missing}
            for future in as_completed(futures):
                result = future.result()
                cached[result["doi"].casefold()] = result
    entries = [cached[doi.casefold()] for doi in dois if doi.casefold() in cached]
    audit = {
        "auditDate": "2026-07-25",
        "provider": "Unpaywall API",
        "contact": EMAIL,
        "doiCount": len(dois),
        "verifiedCount": sum(bool(entry.get("verified")) for entry in entries),
        "openCount": sum(bool(entry.get("isOa")) for entry in entries),
        "entries": entries,
    }
    OA_AUDIT_PATH.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return cached


def enrich(papers: list[dict], oa: dict[str, dict]) -> list[dict]:
    enriched = []
    for source in papers:
        paper = dict(source)
        if not paper.get("authors") and paper.get("doi") in AUTHOR_COMPLETIONS:
            paper["authors"] = AUTHOR_COMPLETIONS[paper["doi"]]
        kind = study_type(paper)
        paper["etype"] = kind
        paper["rural"] = rural_relevance(paper)
        paper["strength"] = evidence_strength(paper, kind)
        paper["focus"] = focus_area(paper)
        paper["rav"] = RAV_RELEVANCE[paper["cat"]]
        if paper.get("arxiv") or paper.get("url"):
            paper["access"] = "Open"
        elif paper.get("doi"):
            record = oa.get(paper["doi"].casefold(), {})
            if record.get("verified"):
                paper["access"] = "Open" if record.get("isOa") else "Restricted"
                if record.get("oaUrl"):
                    paper["oa_url"] = record["oaUrl"]
            else:
                paper["access"] = "Unknown"
        enriched.append(paper)
    return enriched


def write_data(meta: dict, papers: list[dict]) -> None:
    lines = [
        "var SURVEY_META = " + json.dumps(meta, ensure_ascii=False) + ";",
        "",
        "var PAPERS = [",
    ]
    for index, paper in enumerate(papers):
        suffix = "," if index < len(papers) - 1 else ""
        lines.append("  " + json.dumps(paper, ensure_ascii=False) + suffix)
    lines.append("];")
    DATA_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write enriched fields to data.js")
    parser.add_argument("--fetch-oa", action="store_true", help="Query Unpaywall for uncached DOIs")
    args = parser.parse_args()
    meta, papers = read_data()
    oa = build_oa_audit(papers, args.fetch_oa)
    enriched = enrich(papers, oa)
    if args.apply:
        write_data(meta, enriched)
    counts: dict[str, int] = {}
    for paper in enriched:
        counts[paper["access"]] = counts.get(paper["access"], 0) + 1
    print(f"Coded {len(enriched)} references; access={counts}")


if __name__ == "__main__":
    main()
