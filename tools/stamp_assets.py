#!/usr/bin/env python3
"""Stamp local asset references with a content hash so browsers always fetch the current file.

GitHub Pages serves these files straight from the branch, and a browser that has already
cached `app.js?v=20260914e` keeps using it until that URL changes. Editing the file without
changing the query string leaves visitors on the old copy -- that is the failure this script
removes. Each reference gets `?v=<first 8 hex of the file's SHA-256>`, so the URL changes when,
and only when, the file's bytes change.

What it rewrites: `src=` / `href=` attributes in tracked HTML files, and the same pattern in
the small JS loaders, whenever the target is a local `.js` or `.css` file. Remote URLs
(`https://...`, `//...`) and files it cannot find on disk are left untouched.

Usage:
    python3 tools/stamp_assets.py            # rewrite in place
    python3 tools/stamp_assets.py --check    # exit 1 if any stamp is stale (for CI)
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Files whose references get stamped. Add new HTML/loader files here.
TARGETS = ["index.html", "presentation/index.html", "presentation/stage.html", "presentation/launch.js"]
ASSET = re.compile(r"""(?P<attr>\b(?:src|href)\s*=\s*|['"])(?P<quote>['"]?)(?P<path>[^'"\s>?]+\.(?:js|css))(?:\?v=[0-9a-zA-Z]+)?(?P<tail>['"])""")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def resolve(ref: str, source: Path) -> Path | None:
    """Map a reference such as ../data.js, seen inside presentation/stage.html, to a real file."""
    if ref.startswith(("http://", "https://", "//", "data:")):
        return None
    candidate = (source.parent / ref).resolve()
    if candidate.is_file() and ROOT in candidate.parents or candidate == ROOT:
        return candidate
    return candidate if candidate.is_file() else None


def stamp_file(source: Path, check: bool) -> list[str]:
    text = source.read_text(encoding="utf-8")
    changes: list[str] = []

    def replace(match: re.Match) -> str:
        ref = match.group("path")
        target = resolve(ref, source)
        if target is None:
            return match.group(0)
        want = digest(target)
        current = re.search(r"\?v=([0-9a-zA-Z]+)", match.group(0))
        if current and current.group(1) == want:
            return match.group(0)
        changes.append("%s -> %s?v=%s" % (source.relative_to(ROOT), ref, want))
        return "%s%s%s?v=%s%s" % (match.group("attr"), match.group("quote"), ref, want, match.group("tail"))

    updated = ASSET.sub(replace, text)
    if changes and not check:
        source.write_text(updated, encoding="utf-8")
    return changes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report stale stamps without rewriting; exit 1 if any")
    args = ap.parse_args(argv)

    all_changes: list[str] = []
    for name in TARGETS:
        path = ROOT / name
        if not path.is_file():
            print("skip (missing): %s" % name, file=sys.stderr)
            continue
        all_changes += stamp_file(path, args.check)

    if not all_changes:
        print("all asset stamps current")
        return 0
    verb = "stale" if args.check else "updated"
    print("%d %s stamp(s):" % (len(all_changes), verb))
    for line in all_changes:
        print("  " + line)
    if args.check:
        print("\nrun: python3 tools/stamp_assets.py", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
