// The guided route follows the visible Basic webpage from top to bottom.
const BEATS = [
  [
    ['What can AV research support in rural service?', 'This review connects rural mobility needs with technical capabilities, research evidence, and field pilots.', 'overview']
  ],
  [
    ['Rural conditions change the whole service', 'Sparse road guidance, intermittent connectivity, long distances, and thin demand shape both the technical design and the operating model.', 'findings'],
    ['Finding 1: keep the safety baseline onboard', 'A solid foundation in sensing, localization, and mapping, but the same stack still needs tests on rural roads.', 'finding:0'],
    ['Finding 2: connectivity adds support with limits', 'Connectivity can help, but may vary in rural areas.', 'finding:1'],
    ['Finding 3: the service model follows the setting', 'The deployment does not establish one universal rural service model.', 'finding:2'],
    ['Finding 4: direct rural evidence is still thin', 'Only 10% of records are directly rural. Most of the other studies were tested in different settings and may still be useful.', 'finding:3'],
    ['Finding 5: deployment needs integrated validation', 'No single study validates the integrated sequence from rural needs, resilient onboard baselines, infrastructure support, to field tests and demonstrations.', 'finding:4']
  ],
  [
    ['Tier 1 Existing RAV Tech ', 'Autonomous Driving keeps the vehicle moving safely. Fleet Management organizes dispatch, energy and service continuity.', 'tier:0'],
    ['Tier 2 Advanced RAV Tech', 'Infrastructure, Communication and Cooperative Driving add support to RAV.', 'tier:1'],
    ['Field Pilots', 'Field pilots test parts of the system under defined conditions.', 'thesis-detail']
  ],
  [
    ['Read the map as an evidence structure', 'The 25 sub-themes distinguish limitations, recommended directions and reusable baselines. Select a theme to see its evidence and rural implications.', 'evidence'],
    ['Trace a theme to a real source', 'Sources, definition, pros and cons, and guidance to RAV.', 'theme:Perception - multi-sensor fusion'],
    ['Follow the next validation question', 'The map links fusion to adverse-weather performance. Local conditions and combined sensor failures still need testing.', 'theme:Perception - adverse weather']
  ],
  [
    ['Start with the vehicle and the service', 'The first recommendations pair a resilient onboard stack with dispatch, charging and passenger support suited to thin demand.', 'recommendation:vehicle'],
    ['Target the road and communication gaps', 'Prioritize road improvements and digital information where they help. Measure connectivity and preserve safe behavior through disconnections.', 'recommendation:road'],
    ['Make pilot learning comparable', 'Program partners need explicit operating limits, staged evaluation and comparable safety, service and accessibility measures.', 'recommendation:pilot']
  ],
  [
    ['One operating logic: dispersed requests', 'goMARTI illustrates demand-responsive service in a rural community, with accessible support and supervised operation.', 'pilot:0'],
    ['Another operating logic: predictable circulation', 'ADASTEC, TEDDY and CASSI offer fixed-route park and public-site experience. Their operating contexts matter to interpretation.', 'pilot:1'],
    ['Read across the four programs', 'RAV is not a universal service mode for all. Compare service patterns, interruptions and support needs.', 'pilot:3']
  ],
  [
    ['Define what belongs in the review', 'The scope covers 2014–2026 road-vehicle research across five technical modules, plus evidence from field pilots.', 'method:0'],
    ['Search broadly, retain a documented connection', 'Scholarly sources, official program records and citation chaining identify candidates. Screening removes duplicates and unverifiable or unrelated work.', 'method:2'],
    ['Code what each source can actually tell us', 'The retained 118 records distinguish study design, rural relevance and evidence strength. Open access is recorded separately.', 'method:3']
  ],
  [
    ['The reference list keeps the claims inspectable', 'The full bibliography is grouped by module. Each record links its source, study design and rural relevance to the review.', 'papers'],
    ['Cite the website and retain its evidence boundaries', 'The page ends with citation formats and exports. Its contribution is a traceable design argument that still needs comparable rural operating data.', 'cite']
  ]
];
