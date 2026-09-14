# Guided presentation

The normal GitHub Pages entry remains the literature-review homepage. Its **Presentation view** button opens a full-window, two-column view without leaving the page. **Back to review** closes that view and restores the existing reading position.

- Left: the original review, loaded from the same GitHub Pages repository in **Basic** mode so the visible section order matches the presentation.
- Right: eight English chapters following the Basic webpage from top to bottom: Overview, What the Literature Says, Framework, Evidence Map, Recommendations, Field pilots, Review Methodology, then References & citation.
- **Follow explanation: on** automatically scrolls the left column to the current step's source section. Relevant synthesis sections open, methodology cards select the corresponding review step, and the evidence walkthrough opens its actual theme detail. Recommendation steps scroll to their corresponding cards without activating them or switching to Advanced mode. Turn follow off for independent browsing; **Locate in review** remains a manual option.
- The divider or width slider resizes the columns. **Expand explanation** temporarily hides the review.
- Eight chapters contain 24 audience-facing steps, distributed as 1 / 6 / 3 / 3 / 3 / 3 / 3 / 2. Use the visible previous/next buttons or arrow keys to advance at your speaking pace. The timing bands total ten minutes, including pauses and interaction. No speaker script or Notes interface is included.
- Narrow screens switch between the review and explanation instead of squeezing both into unreadable columns.

The standalone fallback entry is `presentation/index.html`. It also includes a return-to-review control. The embedded review hides its own launch button to prevent nested presentation windows.

The default forward sequence follows the document order. It finishes at the citation section, where **Back to review** closes the presentation. The closing contribution stays with the citation section; advancing does not jump to an earlier conclusion or restart the presentation. Previous-step and chapter controls remain available for intentional navigation.

## Ten-minute sequence

| Time | Chapter | Steps | What it explains |
| --- | --- | --- | --- |
| 0:00–0:40 | Overview | 1 | The rural-service question, research platforms and purpose of the review. |
| 0:40–3:00 | What the Literature Says | 6 | The section heading and three overview statements first, then the onboard core, connectivity limits, service choices, limited direct rural evidence and staged validation. Each step follows the corresponding finding on the left. |
| 3:00–4:15 | Framework | 3 | Tier 1, Tier 2, then the connections between capabilities and supporting evidence. |
| 4:15–5:30 | Evidence Map | 3 | The map's three evidence roles, a multi-sensor-fusion source trail and its adverse-weather validation question. |
| 5:30–6:40 | Recommendations | 3 | Vehicle and fleet responsibilities, road and connectivity support, then program and pilot evaluation. |
| 6:40–8:00 | Field pilots | 3 | Demand-responsive and fixed-route precedents, then comparison across the four programs. |
| 8:00–9:10 | Review Methodology | 3 | Scope, search and screening, then source verification and evidence coding. |
| 9:10–10:00 | References & citation | 2 | Trace a bibliography entry to its source, then cite the website and retain the review's evidence boundaries. |

The Evidence Map chapter starts at the map, automatically opens **Perception - multi-sensor fusion**, then opens **Perception - adverse weather** in the same detail area. Reference **[2]** demonstrates study-design, strength and rural-relevance coding; reference **[3]** supports the adverse-weather walkthrough. The theme names on the right also locate their corresponding left-side detail.

Recommendations locate the vehicle, road and program/pilot cards in page order. Each step explains the related stakeholder responsibilities without triggering a reference filter or a mode change. Later, the methodology chapter selects the left review's scope, screening and verification cards; search and screening are explained together within one presentation step. The final chapter proceeds from the Reference List to Citation.

Evidence points and source details read the existing `../data.js`; the presentation does not maintain a second reference database. The current corpus contains 118 records: 12 direct rural, 99 transferable and 7 context-limited. The verification routes are 92 DOI records, 14 arXiv records and 12 authoritative pages. Update fixed narrative totals if the evidence corpus changes. Evidence-strength labels are review-team coding, not formal risk-of-bias or deployment-readiness scores. The staged deployment sequence is a synthesis across sources, not a result established by one study. Pilot descriptions concern the periods covered by their source records. The original review retains its existing external map dependencies.

No build step or additional hosting service is required.

External pilot photographs are embedded from May Mobility, ADASTEC and the National Park Service. Each image links to its original page and names its credit. The ADASTEC image is from its 2024 announcement; the park images depict the 2021 pilots. Remote photos require network access; if unavailable the source link remains visible.

## Supplied TRAVELS media

The opening places the UGA research vehicle and UW–Madison research van side by side, from slide 4 of the March 30, 2026 TRAVELS kickoff deck. Both transparent PNGs are preserved unchanged and presented on white, with each university named. The UW van retains its Dataspeed branding and attribution. Service concepts (healthcare, work/daily needs, tourism/events) come from slides 12–14. The images introduce the research platforms supporting the service-level question; they do not identify a rural deployment or a test location.

The opening occupies one step at the overview. Continuing first locates the What the Literature Says heading and overview, then follows all five findings in their webpage order. No detailed demo routes, addresses, speeds or mileage appear.

Drone communications footage is excluded because it does not substantiate the ground-vehicle networking finding. Connectivity is explained through the review's cited evidence and its implications, with no video or simulated connection-loss demonstration. Campus videos and detailed route maps also remain excluded. Original source decks and extracted media are preserved locally.

Asset provenance and exclusions are in `assets/SOURCES.md`. No speaker script, internal database screenshot or development schedule is included.
