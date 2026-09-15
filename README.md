# Rural Autonomous Vehicles — TRAVELS Literature Review

Interactive companion website for the TRAVELS Rural Autonomous Vehicle (RAV) literature review.

**Live site:** https://uga-mobility-lab.github.io/rav-literature-review/

**Current release:** Version 2.9 (August 8, 2026)

## Evidence base

- 118 real, verified references mapped to six RAV categories and 25 evidence sub-themes
- Every record resolves through Crossref DOI metadata, an arXiv record, or an authoritative source page
- Paper-level review coding for study type, rural relevance, evidence strength, and open-access status
- Separate source and Unpaywall audit files for traceability
- Five interactive stakeholder recommendations linked to their supporting evidence

## Interface

- A compact, expandable across-study synthesis links Tier 1, Tier 2, and field-pilot validation to consensus, contrasts, evidence gaps, and deployment implications; the narrative manuscript remains forthcoming
- Basic mode is the default reading path, while Advanced mode progressively reveals comparison, decision, and research-workspace tools
- Visible Evidence Map pin controls and direct pilot-location / show-all map controls
- Stable continuous year-range filtering and a Reference List expanded by default, with explicit expand/collapse controls
- Website-record exports in BibTeX, RIS, and EndNote XML; paper data export in CSV and BibTeX
- Scroll-to-top, responsive layouts, keyboard access, and reduced-motion handling

## Presentation speaker script

The English ten-minute script follows the website's eight presentation chapters and all 24 steps. It contains 1,226 spoken words with timed click cues, automatic left-pane navigation, and a live source-inspection demonstration.

- [Word speaker script](presentation/scripts/RAV_10_Minute_Web_Presentation_Script.docx)
- [Markdown speaker script and rehearsal notes](presentation/scripts/RAV_10_Minute_Web_Presentation_Script.md)

The files are separate rehearsal materials; the audience-facing presentation does not display the script. See the [presentation guide](presentation/README.md) for controls and the chapter sequence.

## Validation and updates

The site is plain HTML, CSS, and JavaScript; there is no build step. The formal narrative manuscript is still in preparation, so the site does not advertise a PDF or Word download.

```powershell
python tools/validate_site.py
python tools/check_links.py
python tools/enrich_reference_metadata.py --apply --fetch-oa
```

The GitHub Actions workflow validates every push and runs a scheduled source-link audit each Monday. See `CHANGELOG.md` for release history.

Haohua Que (Haohua.Que@uga.edu) · Tianle Zhu (Tianle.Zhu@uga.edu) · Handong Yao (Handong.Yao@uga.edu)

College of Engineering, University of Georgia · June 2026
