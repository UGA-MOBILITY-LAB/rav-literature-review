"""Check all DOI, arXiv, and authoritative source links for permanent failures."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def papers() -> list[dict]:
    raw = (ROOT / "data.js").read_text(encoding="utf-8")
    match = re.search(r"var PAPERS = (\[.*\]);\s*$", raw, re.S)
    if not match:
        raise RuntimeError("Could not parse data.js")
    return json.loads(match.group(1))


def source_url(paper: dict) -> str:
    if paper.get("doi"):
        return f"https://doi.org/{paper['doi']}"
    if paper.get("arxiv"):
        return f"https://arxiv.org/abs/{paper['arxiv']}"
    return paper["url"]


def check(paper: dict) -> tuple[int, str, int | None, str]:
    url = source_url(paper)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "RAV-literature-review-link-audit/2.0"},
        method="HEAD",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return paper["n"], url, response.status, ""
    except urllib.error.HTTPError as exc:
        if exc.code in {403, 405, 429}:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "RAV-literature-review-link-audit/2.0",
                    "Range": "bytes=0-0",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=25) as response:
                    return paper["n"], url, response.status, ""
            except urllib.error.HTTPError as retry:
                return paper["n"], url, retry.code, str(retry)
            except urllib.error.URLError as retry:
                return paper["n"], url, None, str(retry)
        return paper["n"], url, exc.code, str(exc)
    except urllib.error.URLError as exc:
        return paper["n"], url, None, str(exc)


def main() -> None:
    records = papers()
    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(check, paper) for paper in records]
        for future in as_completed(futures):
            results.append(future.result())
    permanent = [result for result in results if result[2] in {404, 410}]
    transient = [result for result in results if result[2] is None or (result[2] or 0) >= 400]
    print(f"Checked {len(results)} source links; permanent failures={len(permanent)}; other warnings={len(transient) - len(permanent)}")
    for n, url, status, message in sorted(transient):
        print(f"[{n}] status={status or 'network'} {url} {message}")
    if permanent:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
