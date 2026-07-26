# Rural Autonomous Vehicles — TRAVELS Literature Review

Interactive companion website for the TRAVELS Rural Autonomous Vehicle (RAV) literature review.

**Live site:** https://uga-mobility-lab.github.io/rav-literature-review/

## Evidence base

- 117 real, verified references mapped to six RAV categories and 26 evidence sub-themes
- Every record resolves through Crossref DOI metadata, an arXiv record, or an authoritative source page
- Paper-level review coding for study type, rural relevance, evidence strength, and open-access status
- Separate source and Unpaywall audit files for traceability
- Five interactive stakeholder recommendations linked to their supporting evidence

## Interface

- Interactive two-tier framework and mobile Evidence Map accordion
- Linked module, year, source, evidence, rural-relevance, strength, access, and text filters
- Interactive category/year charts, evidence profiles, and module-by-year heatmap
- Expandable paper summaries with RAV relevance, DOI copying, open-version links, CSV export, and BibTeX export
- Keyboard-accessible evidence scatter plot
- Citation remains the final main-page section

## Validation and updates

The site is plain HTML, CSS, and JavaScript; there is no build step.

```powershell
python tools/validate_site.py
python tools/check_links.py
python tools/enrich_reference_metadata.py --apply --fetch-oa
```

The GitHub Actions workflow validates every push and runs a scheduled source-link audit each Monday. See `CHANGELOG.md` for release history.

Haohua Que (Haohua.Que@uga.edu) · Tianle Zhu (Tianle.Zhu@uga.edu) · Handong Yao (Handong.Yao@uga.edu)

College of Engineering, University of Georgia · June 2026
