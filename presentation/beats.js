// The guided route follows the visible Basic webpage from top to bottom.
const BEATS = [
  [
    ['How can existing AV research support rural mobility?', 'This review connects rural mobility needs with technical capabilities, research evidence, and field pilots.', 'overview']
  ],
  [
    ['Not a copy-and-paste from urban AV deployments', 'Focus on three topics: vehicle, infrastructure, and rural deployment.', 'findings'],
    ['Finding 1: keep the safety baseline onboard', 'Provide a solid foundation in sensing, localization, and mapping, but need testing on rural roads.', 'finding:0'],
    ['Finding 2: support with infrastructure and connectivity', 'Infrastructure, connectivity, and cooperative operation can help, but may vary in rural areas.', 'finding:1'],
    ['Finding 3: follow the actual needs', 'Do not establish one universal rural operating model but need both demand-responsive and fixed-route services.', 'finding:2'],
    ['Finding 4: lack direct rural evidence', 'Only 10% provide rural evidence. Most studies were tested in different settings and need further testing and revisions.', 'finding:3'],
    ['Finding 5: deploy based on integrated validation', 'No single study validates the integrated sequence from rural needs, resilient onboard baselines, infrastructure support, to demonstrations and deployments.', 'finding:4']
  ],
  [
    ['Tier 1 Existing RAV Tech', 'Autonomous Driving helps the vehicle sense, localize, and respond safely. Fleet Management handles dispatch, charging, and supervision.', 'tier:0'],
    ['Tier 2 Advanced RAV Tech', 'Infrastructure, Communication and Cooperative Driving can support RAV.', 'tier:1'],
    ['Tier 3 Field Pilots', 'Field pilots demonstrate how existing RAV tech works under defined conditions.', 'thesis-detail']
  ],
  [
    ['Read the map as an evidence structure', 'The evidence map connects each module to its supporting sources and the next module.', 'evidence'],
    ['Trace a theme to a real source', 'Sources, definition, pros and cons, and guidance to RAV.', 'theme:Perception - multi-sensor fusion'],
    ['Follow the next validation question', 'The map links fusion to adverse-weather performance. Local conditions and combined sensor failures still need testing.', 'theme:Perception - adverse weather']
  ],
  [
    ['AV operators and service providers', 'For AV operators and service providers, build a resilient onboard system with sensor fusion, data fusion, and fine-tuned models with rural datasets, and match operation models to local needs.', 'recommendation:vehicle'],
    ['Infrastructure and connectivity partners', 'Prioritize road improvements and digital information on high-risk areas. Measure connectivity and preserve safe behavior through disconnections.', 'recommendation:road'],
    ['Communities', 'Expand staged pilots and design comparable measures.', 'recommendation:pilot']
  ],
  [
    ['One operating logic: demand responsive service', 'goMARTI illustrates demand-responsive service at low speed in a rural community, with accessible support and supervised operation.', 'pilot:0'],
    ['Another operating logic: fixed-route service', 'ADASTEC, TEDDY and CASSI offer fixed-route park and public-site experience at low speed and geofenced routes. ', 'pilot:1'],
    ['Read across the four programs', 'Takeaways for RAV: resilient onboard safety system or safety operator; flexible with both demand responsive and fixed-route services.', 'pilot:3']
  ],
  [
    ['Define what belongs in the review', 'The scope covers 2014–2026 road-vehicle research across the above topics and modules related to rural areas or with similar settings.', 'method:0'],
    ['Search broadly, retain a documented connection', 'Scholarly sources, official program records and citation chaining identify candidates. Screening removes duplicates and unverifiable or unrelated work.', 'method:2'],
    ['Verify and review', '118 records were extracted for the literature review. Open access was recorded separately.', 'method:3']
  ],
  [
    ['The reference list keeps the claims inspectable', 'The full bibliography is grouped by module. Each record links its source, study design and rural relevance to the review.', 'papers'],
    ['Cite the website and retain its evidence boundaries', 'The page ends with citation formats and exports. Its contribution is a traceable design argument that still needs comparable rural operating data.', 'cite']
  ]
];
