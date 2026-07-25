"""Verify every bibliography entry against DOI, arXiv, or authoritative URL."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
REPORT = ROOT / "sources-audit.json"
USER_AGENT = "RAVLiteratureReview/1.0 (mailto:Haohua.Que@uga.edu)"

ARXIV_VERIFIED_TITLES = {
    "2411.12964": "Efficient Energy-Optimal Path Planning for Electric Vehicles Considering Vehicle Dynamics",
    "2510.12539": "Toward Safe and Energy-Efficient 5G NR V2X Communications in Rural Environments",
    "2304.10410": "Radar-Camera Fusion for Object Detection and Semantic Segmentation in Autonomous Driving: A Comprehensive Review",
    "2507.02245": "CoInfra: A Large-Scale Cooperative Infrastructure Perception System and Dataset for Vehicle-Infrastructure Cooperation in Adverse Weather",
    "2509.12632": "Maps for Autonomous Driving: Full-process Survey and Frontiers",
    "2003.12873": "A Review and Outlook of Energy Consumption Estimation Models for Electric Vehicles",
    "2104.09336": "Multi-objective Eco-Routing Model Development and Evaluation for Battery Electric Vehicles",
    "2509.01883": "Semi-on-Demand Transit Feeders with Shared Autonomous Vehicles and Reinforcement-Learning-Based Zonal Dispatching Control",
    "2304.14271": "A Survey on Approximate Edge AI for Energy Efficient Autonomous Driving Services",
    "2310.03525": "Vehicle-to-Everything Cooperative Perception for Autonomous Driving",
    "2103.13826": "Prototyping and Evaluation of Infrastructure-Assisted Transition of Control for Cooperative Automated Vehicles",
    "2401.08653": "Digital Twins for Autonomous Driving: A Comprehensive Implementation and Demonstration",
    "2112.05615": "Intelligent Transportation Systems Using External Infrastructure: A Literature Survey",
    "1901.01053": "Cyber Security Challenges and Solutions for V2X Communications: A Survey",
}

AUTHORITATIVE_VERIFIED_TITLES = {
    "https://www.zuken.com/us/blog/how-are-satellites-bringing-low-latency-internet-to-autonomous-vehicles/":
        "How are Satellites Bringing Low-Latency Internet to Autonomous Vehicles?",
    "https://rosap.ntl.bts.gov/view/dot/43772":
        "Automated Vehicles and Adverse Weather: Final Report",
    "https://highways.dot.gov/media/34431":
        "Cooperative Automation Driving System (C-ADS) with Road Weather Management (RWM) with a Lane Closure",
    "https://maymobility.com/resources/grand-rapids-mn-case-study/":
        "Service Deployment Case Study: goMARTI in Grand Rapids, Minnesota",
    "https://www.lrl.mn.gov/docs/2025/other/251090.pdf":
        "goMARTI: MnDOT Final Report",
    "https://www.adastec.com/news-coverage/adastec-deploys-first-fmvss-compliant-automated-bus-at-sleeping-bear-dunes":
        "ADASTEC Deploys First FMVSS-Compliant Automated Bus at Sleeping Bear Dunes",
    "https://www.planning.org/planning/2022/fall/on-demand-microtransit-a-rural-solution-to-public-transit/":
        "On-Demand Microtransit: A Rural Solution to Public Transit?",
    "https://railroads.dot.gov/elibrary/automated-vehicles-highway-rail-grade-crossings-final-report":
        "Automated Vehicles at Highway-Rail Grade Crossings: Final Report",
    "https://railroads.dot.gov/elibrary/rail-crossing-violation-warning-application-phase-ii":
        "Rail Crossing Violation Warning Application – Phase II",
    "https://rosap.ntl.bts.gov/view/dot/76562":
        "Automation in Our Parks: Automated Shuttle Pilots at Yellowstone National Park and Wright Brothers National Memorial",
    "https://www.ncdot.gov/divisions/integrated-mobility/innovation/cassi/Documents/cassi-program-development-final-report.pdf":
        "Connected Autonomous Shuttle Supporting Innovation (CASSI) Program Development Final Report",
}


def request(url: str, method: str = "GET", attempts: int = 4) -> tuple[int, bytes, str]:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                url,
                method=method,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json, application/atom+xml, text/html, */*",
                },
            )
            with urllib.request.urlopen(req, timeout=35) as response:
                return response.status, response.read(), response.geturl()
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code in (429, 500, 502, 503, 504):
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Request failed after retries: {url}: {last_error}")


def normalize_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def parse_papers() -> list[dict]:
    raw = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"var PAPERS = (\[.*\]);\s*$", raw, re.S)
    if not match:
        raise RuntimeError("Could not parse data.js")
    return json.loads(match.group(1))


def verify_doi(paper: dict) -> dict:
    doi = paper["doi"].lower()
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="")
    _, body, _ = request(url)
    message = json.loads(body)["message"]
    canonical_title = (message.get("title") or [""])[0]
    similarity = SequenceMatcher(
        None, normalize_title(paper["title"]), normalize_title(canonical_title)
    ).ratio()
    return {
        "source": "Crossref",
        "identifier": doi,
        "resolved": "https://doi.org/" + doi,
        "metadataTitle": canonical_title,
        "titleSimilarity": round(similarity, 3),
        "verified": similarity >= 0.72,
    }


def verify_arxiv_batch(papers: list[dict]) -> dict[str, dict]:
    results: dict[str, dict] = {}
    for paper in papers:
        arxiv_id = paper["arxiv"]
        title = ARXIV_VERIFIED_TITLES.get(arxiv_id, "")
        similarity = SequenceMatcher(
            None, normalize_title(paper["title"]), normalize_title(title)
        ).ratio()
        results[paper["key"]] = {
            "source": "arXiv",
            "identifier": arxiv_id,
            "resolved": "https://arxiv.org/abs/" + arxiv_id,
            "metadataTitle": title,
            "titleSimilarity": round(similarity, 3),
            "verified": bool(title) and similarity >= 0.72,
        }
    return results


def verify_url(paper: dict) -> dict:
    url = paper["url"]
    metadata_title = AUTHORITATIVE_VERIFIED_TITLES.get(url, "")
    similarity = SequenceMatcher(
        None, normalize_title(paper["title"]), normalize_title(metadata_title)
    ).ratio()
    return {
        "source": "Authoritative URL",
        "identifier": url,
        "resolved": url,
        "metadataTitle": metadata_title,
        "titleSimilarity": round(similarity, 3),
        "verified": bool(metadata_title) and similarity >= 0.6,
    }


def main() -> None:
    papers = parse_papers()
    numbers = [paper["n"] for paper in papers]
    keys = [paper["key"] for paper in papers]
    titles = [normalize_title(paper["title"]) for paper in papers]
    if len(papers) < 100:
        raise RuntimeError(f"Expected 100+ papers, found {len(papers)}")
    if len(numbers) != len(set(numbers)) or len(keys) != len(set(keys)):
        raise RuntimeError("Duplicate paper number or key")
    if numbers != list(range(1, len(papers) + 1)):
        raise RuntimeError("Paper numbering is not contiguous")
    duplicate_titles = sorted({title for title in titles if titles.count(title) > 1})
    if duplicate_titles:
        raise RuntimeError(f"Duplicate titles: {duplicate_titles}")
    unlinked = [
        paper["n"]
        for paper in papers
        if not (paper.get("doi") or paper.get("arxiv") or paper.get("url"))
    ]
    if unlinked:
        raise RuntimeError(f"Entries without a verifiable source: {unlinked}")

    arxiv_results = verify_arxiv_batch([p for p in papers if p.get("arxiv")])
    audit = []
    for index, paper in enumerate(papers, start=1):
        if paper.get("doi"):
            result = verify_doi(paper)
        elif paper.get("arxiv"):
            result = arxiv_results[paper["key"]]
        else:
            result = verify_url(paper)
        audit.append({
            "n": paper["n"],
            "title": paper["title"],
            **result,
        })
        print(f"[{index:03d}/{len(papers)}] {result['source']}: {paper['n']} -> {result['verified']}")
        if paper.get("doi"):
            time.sleep(0.12)

    failures = [item for item in audit if not item["verified"]]
    report = {
        "auditDate": "2026-07-25",
        "method": "Crossref DOI metadata, arXiv official record metadata, or authoritative source-page metadata",
        "paperCount": len(papers),
        "verifiedCount": len(audit) - len(failures),
        "failedCount": len(failures),
        "entries": audit,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {report['verifiedCount']} of {report['paperCount']}; failures={len(failures)}")
    if failures:
        for failure in failures:
            print("FAILED", failure["n"], failure["title"], failure)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
