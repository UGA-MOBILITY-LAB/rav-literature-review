/* Rural Autonomous Vehicles — TRAVELS literature-review companion site logic.
   Plain vanilla JS, no dependencies. Reads SURVEY_META, PAPERS from data.js
   and EDGES from edges.js. */

(function () {
  "use strict";

  /* ---------- constants ---------- */

  var CATEGORIES = [
    "Autonomous Driving",
    "Fleet Management",
    "Infrastructure",
    "Communication",
    "Cooperative Driving",
    "Pilots"
  ];

  var CAT_COLORS = {
    "Autonomous Driving": "#1F4E94",
    "Fleet Management": "#00A3AD",
    "Infrastructure": "#BA0C2F",
    "Communication": "#E08A3C",
    "Cooperative Driving": "#7E6BB0",
    "Pilots": "#4B8B3B"
  };

  var VENUE_TYPES = ["Journal", "Conference", "Preprint", "Report", "Industry"];
  var EVIDENCE_TYPES = [
    "Review",
    "Empirical / testbed",
    "Modeling / simulation",
    "Field pilot / case",
    "System / method",
    "Policy / program report"
  ];
  var RURAL_LEVELS = ["Direct rural evidence", "Transferable to rural", "Context-limited"];
  var STRENGTH_LEVELS = ["High", "Moderate", "Emerging"];
  var ACCESS_LEVELS = ["Open", "Restricted", "Unknown"];

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- helpers ---------- */

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    if (attrs) { for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { el.setAttribute(k, attrs[k]); } } }
    return el;
  }

  function el(name, className, text) {
    var node = document.createElement(name);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function hashKey(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  function paperLink(p) {
    if (p.doi) { return "https://doi.org/" + p.doi; }
    if (p.arxiv) { return "https://arxiv.org/abs/" + p.arxiv; }
    if (p.url) { return p.url; }
    return "https://scholar.google.com/scholar?q=" + encodeURIComponent('"' + p.title + '"');
  }

  function linkLabel(p) {
    if (p.doi) { return "DOI"; }
    if (p.arxiv) { return "arXiv"; }
    if (p.url) { return "Source"; }
    return "Scholar";
  }

  function accessLink(p) {
    return p.oa_url || p._link;
  }

  /* ---------- compact navigation ---------- */

  var siteHeader = document.querySelector(".site-header");
  var navToggle = document.querySelector(".nav-toggle");
  var primaryNav = document.getElementById("primary-nav");
  function closeMobileNav() {
    if (!siteHeader || !navToggle) { return; }
    siteHeader.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  if (siteHeader && navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var opening = !siteHeader.classList.contains("nav-open");
      siteHeader.classList.toggle("nav-open", opening);
      navToggle.setAttribute("aria-expanded", opening ? "true" : "false");
    });
    primaryNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) { closeMobileNav(); }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeMobileNav(); }
    });
  }

  /* ---------- enrich papers ---------- */

  PAPERS.forEach(function (p) {
    p._vtype = p.vtype;
    p._link = paperLink(p);
    p._hash = hashKey(p.key);
    p._hay = [
      p.title, p.authors, p.venue, p.cat, p.vtype, p.etype,
      p.rural, p.strength, p.access, p.focus, p.rav
    ].join(" ").toLowerCase();
  });

  var catTotals = {};
  CATEGORIES.forEach(function (c) { catTotals[c] = 0; });
  PAPERS.forEach(function (p) { if (Object.prototype.hasOwnProperty.call(catTotals, p.cat)) { catTotals[p.cat]++; } });

  /* ---------- evidence-link edges (EDGES from edges.js) ---------- */

  var paperByKey = {};
  PAPERS.forEach(function (p) { paperByKey[p.key] = p; });

  var LINEAGE_EDGES = (typeof EDGES !== "undefined" ? EDGES : []).filter(function (e) {
    return paperByKey[e.from] && paperByKey[e.to];
  });
  var ADJ = {};
  LINEAGE_EDGES.forEach(function (e) {
    if (!ADJ[e.from]) { ADJ[e.from] = []; }
    if (!ADJ[e.to]) { ADJ[e.to] = []; }
    ADJ[e.from].push({ other: e.to, rel: e.rel, out: true });
    ADJ[e.to].push({ other: e.from, rel: e.rel, out: false });
  });

  /* ---------- state ---------- */

  var filters = {
    cat: new Set(),
    year: new Set(),
    vtype: new Set(),
    etype: new Set(),
    rural: new Set(),
    strength: new Set(),
    access: new Set()
  };
  var query = "";
  var sortMode = "year-desc";
  var hiddenCats = new Set();
  var hiddenTypes = new Set();
  var showEdges = true;
  var paperScope = null;
  var scopeLabel = "";
  var urlStateReady = false;
  var initialFocusKey = "";
  var URL_FILTER_KEYS = {
    cat: "module",
    year: "year",
    vtype: "source",
    etype: "evidence",
    rural: "rural",
    strength: "strength",
    access: "access"
  };

  function syncUrlState() {
    if (!urlStateReady || !window.history || !window.URLSearchParams) { return; }
    var params = new URLSearchParams(window.location.search);
    Object.keys(URL_FILTER_KEYS).forEach(function (key) {
      var parameter = URL_FILTER_KEYS[key];
      params.delete(parameter);
      filters[key].forEach(function (value) { params.append(parameter, value); });
    });
    ["q", "sort", "scope", "scopeLabel", "focus"].forEach(function (key) { params.delete(key); });
    if (query) { params.set("q", query); }
    if (sortMode !== "year-desc") { params.set("sort", sortMode); }
    if (paperScope && paperScope.size) {
      params.set("scope", Array.from(paperScope).sort(function (a, b) { return a - b; }).join(","));
      if (scopeLabel) { params.set("scopeLabel", scopeLabel); }
    }
    if (pinnedKey) { params.set("focus", pinnedKey); }
    var next = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
    window.history.replaceState(null, "", next);
  }

  function hydrateUrlState() {
    if (!window.URLSearchParams) { return; }
    var params = new URLSearchParams(window.location.search);
    Object.keys(URL_FILTER_KEYS).forEach(function (key) {
      params.getAll(URL_FILTER_KEYS[key]).forEach(function (value) {
        if (value) { filters[key].add(value); }
      });
    });
    query = (params.get("q") || "").trim().toLowerCase();
    var requestedSort = params.get("sort");
    if (["year-desc", "year-asc", "title", "strength", "number"].indexOf(requestedSort) !== -1) {
      sortMode = requestedSort;
    }
    var scope = (params.get("scope") || "").split(",").map(function (value) {
      return Number(value);
    }).filter(function (value) {
      return Number.isFinite(value) && value > 0;
    });
    if (scope.length) {
      paperScope = new Set(scope);
      scopeLabel = params.get("scopeLabel") || "Shared evidence selection";
    }
    initialFocusKey = params.get("focus") || "";
  }

  function clearRecommendationActive() {
    var cards = document.querySelectorAll(".recommendation-card, .pilot-card");
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove("is-active");
      cards[i].setAttribute("aria-pressed", "false");
    }
  }

  function passesFilters(p) {
    if (paperScope && !paperScope.has(p.n)) { return false; }
    if (filters.cat.size && !filters.cat.has(p.cat)) { return false; }
    if (filters.year.size && !filters.year.has(String(p.year))) { return false; }
    if (filters.vtype.size && !filters.vtype.has(p._vtype)) { return false; }
    if (filters.etype.size && !filters.etype.has(p.etype)) { return false; }
    if (filters.rural.size && !filters.rural.has(p.rural)) { return false; }
    if (filters.strength.size && !filters.strength.has(p.strength)) { return false; }
    if (filters.access.size && !filters.access.has(p.access)) { return false; }
    if (query && p._hay.indexOf(query) === -1) { return false; }
    return true;
  }

  /* ---------- meta fill ---------- */

  document.getElementById("stat-count").textContent = String(SURVEY_META.paperCount);
  document.getElementById("stat-cats").textContent = String(CATEGORIES.length - 1);
  document.getElementById("stat-years").textContent = SURVEY_META.yearMin + "–" + SURVEY_META.yearMax;
  var rangeText = SURVEY_META.yearMin + "~" + SURVEY_META.yearMax;
  ["stats-range", "explorer-range", "papers-range"].forEach(function (id) {
    var n = document.getElementById(id);
    if (n) { n.textContent = rangeText; }
  });

  /* ---------- filter dropdowns ---------- */

  var ddRow = document.getElementById("dd-row");
  var resetBtn = document.getElementById("reset-btn");
  var allDropdowns = [];

  function createDropdown(filterKey, label, options) {
    var wrap = el("div", "dropdown");
    var btn = el("button", "dd-btn");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    var panelId = "dd-panel-" + filterKey;
    btn.setAttribute("aria-controls", panelId);
    btn.appendChild(document.createTextNode(label));
    var countBadge = el("span", "dd-count");
    countBadge.hidden = true;
    btn.appendChild(countBadge);
    var caret = el("span", "caret");
    caret.setAttribute("aria-hidden", "true");
    btn.appendChild(caret);

    var panel = el("div", "dd-panel");
    panel.id = panelId;
    panel.hidden = true;
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", label + " filter options");

    options.forEach(function (opt) {
      var lab = el("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = opt.value;
      cb.addEventListener("change", function () {
        paperScope = null;
        scopeLabel = "";
        clearRecommendationActive();
        if (cb.checked) { filters[filterKey].add(opt.value); }
        else { filters[filterKey].delete(opt.value); }
        var n = filters[filterKey].size;
        countBadge.textContent = String(n);
        countBadge.hidden = (n === 0);
        render();
      });
      lab.appendChild(cb);
      if (opt.swatch) {
        var sw = el("span", "swatch");
        sw.style.background = opt.swatch;
        lab.appendChild(sw);
      }
      lab.appendChild(document.createTextNode(opt.label));
      panel.appendChild(lab);
    });

    function close() { btn.setAttribute("aria-expanded", "false"); panel.hidden = true; }
    function open() {
      allDropdowns.forEach(function (d) { d.close(); });
      btn.setAttribute("aria-expanded", "true");
      panel.hidden = false;
    }
    btn.addEventListener("click", function () {
      if (btn.getAttribute("aria-expanded") === "true") { close(); } else { open(); }
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { close(); btn.focus(); }
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    var dd = { root: wrap, close: close, panel: panel, badge: countBadge, key: filterKey };
    allDropdowns.push(dd);
    return wrap;
  }

  document.addEventListener("click", function (e) {
    allDropdowns.forEach(function (d) { if (!d.root.contains(e.target)) { d.close(); } });
  });

  var catOptions = CATEGORIES.map(function (c) { return { value: c, label: c, swatch: CAT_COLORS[c] }; });
  var yearsPresent = Array.from(new Set(PAPERS.map(function (p) { return p.year; })))
    .sort(function (a, b) { return b - a; });
  var yearOptions = yearsPresent.map(function (y) { return { value: String(y), label: String(y) }; });
  var typesPresent = VENUE_TYPES.filter(function (t) {
    return PAPERS.some(function (p) { return p._vtype === t; });
  });
  var typeOptions = typesPresent.map(function (t) { return { value: t, label: t }; });
  var evidenceTypeOptions = EVIDENCE_TYPES.filter(function (value) {
    return PAPERS.some(function (p) { return p.etype === value; });
  }).map(function (value) { return { value: value, label: value }; });
  var ruralOptions = RURAL_LEVELS.filter(function (value) {
    return PAPERS.some(function (p) { return p.rural === value; });
  }).map(function (value) { return { value: value, label: value }; });
  var strengthOptions = STRENGTH_LEVELS.filter(function (value) {
    return PAPERS.some(function (p) { return p.strength === value; });
  }).map(function (value) { return { value: value, label: value }; });
  var accessOptions = ACCESS_LEVELS.filter(function (value) {
    return PAPERS.some(function (p) { return p.access === value; });
  }).map(function (value) {
    return { value: value, label: value === "Open" ? "Open access" : value };
  });

  ddRow.insertBefore(createDropdown("cat", "Module", catOptions), resetBtn);
  ddRow.insertBefore(createDropdown("year", "Year", yearOptions), resetBtn);
  ddRow.insertBefore(createDropdown("vtype", "Source Type", typeOptions), resetBtn);
  ddRow.insertBefore(createDropdown("etype", "Evidence Type", evidenceTypeOptions), resetBtn);
  ddRow.insertBefore(createDropdown("rural", "Rural Relevance", ruralOptions), resetBtn);
  ddRow.insertBefore(createDropdown("strength", "Evidence Strength", strengthOptions), resetBtn);
  ddRow.insertBefore(createDropdown("access", "Access", accessOptions), resetBtn);

  var searchInput = document.getElementById("search");
  searchInput.addEventListener("input", function () {
    query = searchInput.value.trim().toLowerCase();
    render();
  });

  function resetAllFilters() {
    Object.keys(filters).forEach(function (key) { filters[key].clear(); });
    hiddenCats.clear(); hiddenTypes.clear();
    showEdges = true;
    pinnedKey = null;
    paperScope = null;
    scopeLabel = "";
    clearRecommendationActive();
    query = "";
    searchInput.value = "";
    allDropdowns.forEach(function (d) {
      d.badge.hidden = true;
      d.badge.textContent = "";
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      for (var i = 0; i < boxes.length; i++) { boxes[i].checked = false; }
    });
    var items = document.querySelectorAll(".legend-item");
    for (var i = 0; i < items.length; i++) { items[i].setAttribute("aria-pressed", "true"); }
    render();
  }

  resetBtn.addEventListener("click", resetAllFilters);
  var statsClear = document.getElementById("stats-clear");
  if (statsClear) { statsClear.addEventListener("click", resetAllFilters); }

  // Used by the framework diagram: select exactly one module and jump to explorer.
  function setCatFilter(cat) {
    paperScope = null;
    scopeLabel = "";
    clearRecommendationActive();
    filters.cat.clear();
    filters.cat.add(cat);
    allDropdowns.forEach(function (d) {
      if (d.key !== "cat") { return; }
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      var n = 0;
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].checked = (boxes[i].value === cat);
        if (boxes[i].checked) { n++; }
      }
      d.badge.textContent = String(n);
      d.badge.hidden = (n === 0);
    });
    render();
  }

  function syncDropdownFilter(filterKey) {
    allDropdowns.forEach(function (d) {
      if (d.key !== filterKey) { return; }
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      var n = 0;
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].checked = filters[filterKey].has(boxes[i].value);
        if (boxes[i].checked) { n++; }
      }
      d.badge.textContent = String(n);
      d.badge.hidden = (n === 0);
    });
  }

  // Statistics bars cross-filter the explorer and reference list. Selecting
  // the active bar again clears that dimension; category and year selections
  // can be combined.
  function setStatFilter(filterKey, value) {
    paperScope = null;
    scopeLabel = "";
    clearRecommendationActive();
    var active = filters[filterKey].size === 1 && filters[filterKey].has(value);
    filters[filterKey].clear();
    if (!active) { filters[filterKey].add(value); }
    syncDropdownFilter(filterKey);
    render();
    document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
  }

  function setStatPair(cat, year) {
    paperScope = null;
    scopeLabel = "";
    clearRecommendationActive();
    var alreadyActive = filters.cat.size === 1 && filters.cat.has(cat) &&
      filters.year.size === 1 && filters.year.has(String(year));
    filters.cat.clear();
    filters.year.clear();
    if (!alreadyActive) {
      filters.cat.add(cat);
      filters.year.add(String(year));
    }
    syncDropdownFilter("cat");
    syncDropdownFilter("year");
    render();
    document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
  }

  // Used by framework submodules: keep the parent category selected and
  // narrow the explorer to the references that support the chosen submodule.
  function setSubthemeFilter(cat, label, refs) {
    clearRecommendationActive();
    filters.cat.clear();
    filters.cat.add(cat);
    paperScope = new Set(refs);
    scopeLabel = cat + " / " + label;
    allDropdowns.forEach(function (d) {
      if (d.key !== "cat") { return; }
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      var n = 0;
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].checked = (boxes[i].value === cat);
        if (boxes[i].checked) { n++; }
      }
      d.badge.textContent = String(n);
      d.badge.hidden = (n === 0);
    });
    render();
  }

  function setRecommendationFilter(label, refs, activeCard, scopePrefix) {
    Object.keys(filters).forEach(function (key) { filters[key].clear(); });
    hiddenCats.clear();
    hiddenTypes.clear();
    showEdges = true;
    pinnedKey = null;
    query = "";
    searchInput.value = "";
    paperScope = new Set(refs);
    scopeLabel = (scopePrefix || "Recommendation") + " / " + label;
    allDropdowns.forEach(function (d) {
      d.badge.hidden = true;
      d.badge.textContent = "";
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      for (var i = 0; i < boxes.length; i++) { boxes[i].checked = false; }
    });
    var legendItems = document.querySelectorAll(".legend-item");
    for (var i = 0; i < legendItems.length; i++) {
      legendItems[i].setAttribute("aria-pressed", "true");
    }
    clearRecommendationActive();
    if (activeCard) {
      activeCard.classList.add("is-active");
      activeCard.setAttribute("aria-pressed", "true");
    }
    render();
  }

  function setEvidenceFilter(label, refs) {
    Object.keys(filters).forEach(function (key) { filters[key].clear(); });
    query = "";
    searchInput.value = "";
    paperScope = new Set(refs);
    scopeLabel = "Evidence Map / " + label;
    allDropdowns.forEach(function (d) {
      d.badge.hidden = true;
      d.badge.textContent = "";
      var boxes = d.panel.querySelectorAll("input[type=checkbox]");
      for (var i = 0; i < boxes.length; i++) { boxes[i].checked = false; }
    });
    clearRecommendationActive();
    render();
  }

  /* ---------- legend ---------- */

  function shapeGlyph(type, color, size) {
    var s = size || 14;
    var c = s / 2;
    var svg = svgEl("svg", { width: s, height: s, "aria-hidden": "true" });
    var shape;
    if (type === "Journal") {
      shape = svgEl("circle", { cx: c, cy: c, r: c - 2, fill: color });
    } else if (type === "Conference") {
      shape = svgEl("polygon", { points: c + ",1 " + (s - 1) + "," + (s - 1) + " 1," + (s - 1), fill: color });
    } else if (type === "Preprint") {
      shape = svgEl("rect", { x: 2, y: 2, width: s - 4, height: s - 4, fill: color });
    } else if (type === "Report") {
      shape = svgEl("polygon", { points: c + ",1 " + (s - 1) + "," + c + " " + c + "," + (s - 1) + " 1," + c, fill: color });
    } else {
      shape = svgEl("polygon", { points: "1,1 " + (s - 1) + ",1 " + c + "," + (s - 1), fill: color });
    }
    svg.appendChild(shape);
    return svg;
  }

  var legendBox = document.getElementById("legend");

  function buildLegend() {
    var catGroup = el("div", "legend-group");
    catGroup.appendChild(el("span", "legend-group-title", "RAV module"));
    CATEGORIES.forEach(function (c) {
      var b = el("button", "legend-item");
      b.type = "button";
      b.setAttribute("aria-pressed", "true");
      var sw = el("span", "swatch");
      sw.style.background = CAT_COLORS[c];
      b.appendChild(sw);
      b.appendChild(document.createTextNode(c + " "));
      b.appendChild(el("span", "legend-count", String(catTotals[c])));
      b.addEventListener("click", function () {
        if (hiddenCats.has(c)) { hiddenCats.delete(c); b.setAttribute("aria-pressed", "true"); }
        else { hiddenCats.add(c); b.setAttribute("aria-pressed", "false"); }
        renderScatter(currentFiltered);
      });
      catGroup.appendChild(b);
    });
    legendBox.appendChild(catGroup);

    var typeGroup = el("div", "legend-group");
    typeGroup.appendChild(el("span", "legend-group-title", "Source type"));
    typesPresent.forEach(function (t) {
      var b = el("button", "legend-item");
      b.type = "button";
      b.setAttribute("aria-pressed", "true");
      b.appendChild(shapeGlyph(t, "#444444", 13));
      b.appendChild(document.createTextNode(t));
      b.addEventListener("click", function () {
        if (hiddenTypes.has(t)) { hiddenTypes.delete(t); b.setAttribute("aria-pressed", "true"); }
        else { hiddenTypes.add(t); b.setAttribute("aria-pressed", "false"); }
        renderScatter(currentFiltered);
      });
      typeGroup.appendChild(b);
    });
    legendBox.appendChild(typeGroup);

    var edgeGroupBox = el("div", "legend-group");
    edgeGroupBox.appendChild(el("span", "legend-group-title", "Evidence"));
    var eb = el("button", "legend-item");
    eb.type = "button";
    eb.setAttribute("aria-pressed", "true");
    var glyph = svgEl("svg", { width: 18, height: 13, "aria-hidden": "true" });
    glyph.appendChild(svgEl("path", { d: "M 2 11 Q 9 1 16 11", fill: "none", stroke: "#9AA3AB", "stroke-width": 1.5 }));
    eb.appendChild(glyph);
    eb.appendChild(document.createTextNode("Evidence links "));
    eb.appendChild(el("span", "legend-count", String(LINEAGE_EDGES.length)));
    eb.addEventListener("click", function () {
      showEdges = !showEdges;
      eb.setAttribute("aria-pressed", showEdges ? "true" : "false");
      renderScatter(currentFiltered);
    });
    edgeGroupBox.appendChild(eb);
    legendBox.appendChild(edgeGroupBox);
  }

  /* ---------- scatter chart ---------- */

  var scatter = document.getElementById("scatter");
  var tooltip = document.getElementById("tooltip");
  var chartWrap = document.querySelector(".chart-wrap");
  var scatterSelection = document.getElementById("scatter-selection");

  var X_MIN = SURVEY_META.yearMin;
  var X_MAX = SURVEY_META.yearMax;
  var YEAR_W = 100;
  var LANE_H = 62;
  var MARGIN = { top: 14, right: 24, bottom: 38, left: 168 };
  var PLOT_W = (X_MAX - X_MIN + 1) * YEAR_W;
  var CHART_W = MARGIN.left + PLOT_W + MARGIN.right;
  var CHART_H = MARGIN.top + CATEGORIES.length * LANE_H + MARGIN.bottom;

  scatter.setAttribute("width", CHART_W);
  scatter.setAttribute("height", CHART_H);
  scatter.setAttribute("viewBox", "0 0 " + CHART_W + " " + CHART_H);

  function xPos(year) { return MARGIN.left + (year - X_MIN) * YEAR_W + YEAR_W / 2; }
  function laneCenter(i) { return MARGIN.top + i * LANE_H + LANE_H / 2; }

  function markerEl(p, x, y) {
    var color = CAT_COLORS[p.cat] || "#5F6A72";
    var shape;
    if (p._vtype === "Journal") {
      shape = svgEl("circle", { cx: x, cy: y, r: 5.5, fill: color });
    } else if (p._vtype === "Conference") {
      shape = svgEl("polygon", {
        points: x + "," + (y - 6.5) + " " + (x - 6) + "," + (y + 5) + " " + (x + 6) + "," + (y + 5),
        fill: color
      });
    } else if (p._vtype === "Preprint") {
      shape = svgEl("rect", { x: x - 5, y: y - 5, width: 10, height: 10, fill: color });
    } else if (p._vtype === "Report") {
      shape = svgEl("polygon", {
        points: x + "," + (y - 6.5) + " " + (x + 6.5) + "," + y + " " + x + "," + (y + 6.5) + " " + (x - 6.5) + "," + y,
        fill: color
      });
    } else {
      shape = svgEl("polygon", {
        points: (x - 6) + "," + (y - 5) + " " + (x + 6) + "," + (y - 5) + " " + x + "," + (y + 6.5),
        fill: color
      });
    }
    shape.setAttribute("class", "marker");
    return shape;
  }

  var renderedPapers = [];
  var renderedMarkers = [];
  var edgePathsByKey = {};
  var markerPosByKey = {};
  var focusLayerEl = null;

  function renderScatter(papers) {
    while (scatter.firstChild) { scatter.removeChild(scatter.firstChild); }
    renderedPapers = [];
    renderedMarkers = [];
    edgePathsByKey = {};
    markerPosByKey = {};
    hiPaths = [];
    hiMarkers = [];

    var i, y, x;

    // vertical gridlines + year tick labels (every year: the range is short)
    for (y = X_MIN; y <= X_MAX; y++) {
      x = xPos(y);
      scatter.appendChild(svgEl("line", {
        x1: x, y1: MARGIN.top, x2: x,
        y2: MARGIN.top + CATEGORIES.length * LANE_H,
        "class": "grid-line"
      }));
      var tick = svgEl("text", {
        x: x, y: MARGIN.top + CATEGORIES.length * LANE_H + 22,
        "text-anchor": "middle", "class": "tick-label"
      });
      tick.textContent = String(y);
      scatter.appendChild(tick);
    }

    // lane separators + labels
    for (i = 0; i <= CATEGORIES.length; i++) {
      scatter.appendChild(svgEl("line", {
        x1: MARGIN.left - 4, y1: MARGIN.top + i * LANE_H,
        x2: CHART_W - MARGIN.right, y2: MARGIN.top + i * LANE_H,
        "class": "lane-line"
      }));
    }
    CATEGORIES.forEach(function (c, idx) {
      var label = svgEl("text", {
        x: MARGIN.left - 12, y: laneCenter(idx) + 4,
        "text-anchor": "end", "class": "lane-label"
      });
      label.textContent = c;
      scatter.appendChild(label);
    });

    var edgeLayer = svgEl("g", { "class": "edge-layer" });
    scatter.appendChild(edgeLayer);
    focusLayerEl = svgEl("g", { "class": "focus-layer" });
    scatter.appendChild(focusLayerEl);
    var markerLayer = svgEl("g", { "class": "marker-layer" });
    scatter.appendChild(markerLayer);

    var laneIndex = {};
    CATEGORIES.forEach(function (c, idx) { laneIndex[c] = idx; });
    var markerPos = markerPosByKey;
    papers.forEach(function (p) {
      if (hiddenCats.has(p.cat) || hiddenTypes.has(p._vtype)) { return; }
      var li = laneIndex[p.cat];
      if (li === undefined) { return; }
      var dx = ((p._hash % 100) / 100 - 0.5) * (YEAR_W * 0.6);
      var dy = ((Math.floor(p._hash / 128) % 100) / 100 - 0.5) * (LANE_H * 0.6);
      var mx = xPos(p.year) + dx;
      var my = laneCenter(li) + dy;
      var m = markerEl(p, mx, my);
      m.setAttribute("data-i", String(renderedPapers.length));
      m.setAttribute("role", "button");
      m.setAttribute("tabindex", "0");
      m.setAttribute("aria-label", "Reference " + p.n + ". " + p.title + ". " +
        p.year + ", " + p.cat + ", " + p.etype + ", " + p.strength + " evidence. " +
        "Press Enter to pin or O to open.");
      var markerTitle = svgEl("title");
      markerTitle.textContent = "[" + p.n + "] " + p.title + " — " + p.year + ", " + p.etype;
      m.appendChild(markerTitle);
      renderedPapers.push(p);
      renderedMarkers.push(m);
      markerPos[p.key] = { x: mx, y: my };
      markerLayer.appendChild(m);
    });

    if (showEdges) {
      LINEAGE_EDGES.forEach(function (e) {
        var a = markerPos[e.from];
        var b = markerPos[e.to];
        if (!a || !b) { return; }
        var midX = (a.x + b.x) / 2;
        var span = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        var lift = Math.min(38, 10 + span * 0.14);
        var ctrlY = Math.min(a.y, b.y) - lift;
        var d = "M " + a.x.toFixed(1) + " " + a.y.toFixed(1) +
                " Q " + midX.toFixed(1) + " " + ctrlY.toFixed(1) +
                " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
        var path = svgEl("path", { d: d, "class": "edge", "data-from": e.from, "data-to": e.to });
        edgeLayer.appendChild(path);
        if (!edgePathsByKey[e.from]) { edgePathsByKey[e.from] = []; }
        if (!edgePathsByKey[e.to]) { edgePathsByKey[e.to] = []; }
        edgePathsByKey[e.from].push(path);
        edgePathsByKey[e.to].push(path);
      });
    }

    if (pinnedKey) {
      if (markerPosByKey[pinnedKey]) { applyFocus(paperByKey[pinnedKey]); }
      else { pinnedKey = null; }
      updateCountLine();
    }
  }

  function showTooltip(p, evt) {
    while (tooltip.firstChild) { tooltip.removeChild(tooltip.firstChild); }
    tooltip.appendChild(el("div", "tt-title", "[" + p.n + "] " + p.title));
    if (p.authors) { tooltip.appendChild(el("div", "tt-meta", p.authors)); }
    var venueLine = (p.venue ? p.venue + ", " : "") + p.year + " · " + p._vtype;
    tooltip.appendChild(el("div", "tt-meta", venueLine));
    if (p.mods && p.mods.length > 1) {
      tooltip.appendChild(el("div", "tt-meta", "Supports: " + p.mods.join(" · ")));
    }
    var adj = ADJ[p.key];
    if (adj && adj.length) {
      var themes = {};
      adj.forEach(function (a) { themes[a.rel] = true; });
      tooltip.appendChild(el("div", "tt-lineage",
        "Evidence links: " + adj.length + " co-cited reference" + (adj.length === 1 ? "" : "s") +
        " (" + Object.keys(themes).join("; ") + ")"));
    }
    tooltip.hidden = false;
    moveTooltip(evt);
  }

  function moveTooltip(evt) {
    var rect = chartWrap.getBoundingClientRect();
    var left = evt.clientX - rect.left + 16;
    var top = evt.clientY - rect.top + 16;
    if (left + tooltip.offsetWidth > chartWrap.clientWidth - 4) {
      left = evt.clientX - rect.left - tooltip.offsetWidth - 14;
      if (left < 4) { left = 4; }
    }
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  /* ---------- focus mode (hover = transient, click = pinned) ---------- */

  var hiPaths = [];
  var hiMarkers = [];
  var pinnedKey = null;

  function applyFocus(p) {
    clearFocus();
    var color = CAT_COLORS[p.cat] || "#5F6A72";
    var connected = {};
    connected[p.key] = true;

    var incident = edgePathsByKey[p.key] || [];
    incident.forEach(function (path) {
      path.classList.add("edge-hi");
      path.style.stroke = color;
      connected[path.getAttribute("data-from")] = true;
      connected[path.getAttribute("data-to")] = true;
      hiPaths.push(path);
    });

    if (!incident.length) { return; }
    renderedMarkers.forEach(function (m, i) {
      var key = renderedPapers[i].key;
      if (connected[key]) {
        if (key !== p.key) { m.classList.add("marker-connected"); hiMarkers.push(m); }
      } else {
        m.classList.add("marker-dim");
        hiMarkers.push(m);
      }
    });
  }

  function clearFocus() {
    hiPaths.forEach(function (path) {
      path.classList.remove("edge-hi");
      path.style.stroke = "";
    });
    hiMarkers.forEach(function (m) {
      m.classList.remove("marker-connected");
      m.classList.remove("marker-dim");
    });
    hiPaths = [];
    hiMarkers = [];
    if (focusLayerEl) {
      while (focusLayerEl.firstChild) { focusLayerEl.removeChild(focusLayerEl.firstChild); }
    }
  }

  function shortTitle(p) {
    var t = p.title;
    if (t.length <= 60) { return t; }
    return t.slice(0, 57).replace(/\s+\S*$/, "") + "…";
  }

  function describeMarker(p, pinned) {
    if (!scatterSelection) { return; }
    scatterSelection.textContent = (pinned ? "Pinned: " : "Focused: ") +
      "[" + p.n + "] " + p.title + " — " + p.etype + "; " + p.rural +
      "; " + p.strength + " evidence. Press O to open the source.";
  }

  function pinFocus(p) {
    pinnedKey = p.key;
    applyFocus(p);
    describeMarker(p, true);
    updateCountLine();
    syncUrlState();
  }

  function unpinFocus() {
    if (!pinnedKey) { return; }
    pinnedKey = null;
    clearFocus();
    if (scatterSelection) {
      scatterSelection.textContent = "Keyboard: Tab to a marker, Enter or Space to pin it, and O to open its source.";
    }
    updateCountLine();
    syncUrlState();
  }

  scatter.addEventListener("mouseover", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "") {
      var p = renderedPapers[Number(idx)];
      showTooltip(p, e);
      if (!pinnedKey) { applyFocus(p); }
    }
  });
  scatter.addEventListener("mousemove", function (e) {
    if (!tooltip.hidden) { moveTooltip(e); }
  });
  scatter.addEventListener("mouseout", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "") {
      tooltip.hidden = true;
      if (!pinnedKey) { clearFocus(); }
    }
  });
  scatter.addEventListener("click", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "") {
      pinFocus(renderedPapers[Number(idx)]);
    } else if (pinnedKey) {
      unpinFocus();
    }
  });
  scatter.addEventListener("dblclick", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "") {
      window.open(renderedPapers[Number(idx)]._link, "_blank", "noopener");
    }
  });
  scatter.addEventListener("focusin", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "") {
      var p = renderedPapers[Number(idx)];
      describeMarker(p, false);
      if (!pinnedKey) { applyFocus(p); }
    }
  });
  scatter.addEventListener("focusout", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx !== null && idx !== undefined && idx !== "" && !pinnedKey) {
      clearFocus();
    }
  });
  scatter.addEventListener("keydown", function (e) {
    var idx = e.target.getAttribute && e.target.getAttribute("data-i");
    if (idx === null || idx === undefined || idx === "") { return; }
    var p = renderedPapers[Number(idx)];
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pinFocus(p);
    } else if (e.key.toLowerCase() === "o") {
      e.preventDefault();
      window.open(p._link, "_blank", "noopener");
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { unpinFocus(); }
  });

  /* ---------- statistics charts ---------- */

  function renderCatBars() {
    var svg = document.getElementById("cat-bars");
    var rowH = 36;
    var W = 520;
    var H = CATEGORIES.length * rowH + 6;
    var labelX = 158;
    var barX = 168;
    var maxBar = W - barX - 46;
    var max = 0;
    CATEGORIES.forEach(function (c) { if (catTotals[c] > max) { max = catTotals[c]; } });
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    CATEGORIES.forEach(function (c, i) {
      var yTop = 4 + i * rowH;
      var n = catTotals[c];
      var w = max ? Math.max(2, (n / max) * maxBar) : 2;
      var group = svgEl("g", {
        "class": "stat-hit",
        "data-filter-key": "cat",
        "data-filter-value": c,
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Filter to " + c + ": " + n + " references"
      });
      group.appendChild(svgEl("rect", {
        x: 0, y: yTop, width: W, height: rowH - 2, "class": "stat-hitbox"
      }));
      var label = svgEl("text", { x: labelX, y: yTop + 18, "text-anchor": "end", "class": "bar-label" });
      label.textContent = c;
      group.appendChild(label);
      var bar = svgEl("rect", {
        x: barX, y: yTop + 5, width: w, height: 18, rx: 3,
        fill: CAT_COLORS[c], "class": "stat-bar"
      });
      var t = svgEl("title");
      t.textContent = c + ": " + n + " references. Select to filter.";
      bar.appendChild(t);
      group.appendChild(bar);
      var val = svgEl("text", { x: barX + w + 7, y: yTop + 18, "class": "bar-value" });
      val.textContent = String(n);
      group.appendChild(val);
      group.addEventListener("click", function () { setStatFilter("cat", c); });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setStatFilter("cat", c);
        }
      });
      svg.appendChild(group);
    });
  }

  function renderYearBars() {
    var svg = document.getElementById("year-bars");
    var W = 520;
    var H = 230;
    var x0 = 34;
    var baseline = 198;
    var plotH = 178;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var years = [];
    var counts = {};
    var y;
    for (y = SURVEY_META.yearMin; y <= SURVEY_META.yearMax; y++) { years.push(y); counts[y] = 0; }
    PAPERS.forEach(function (p) { if (counts[p.year] !== undefined) { counts[p.year]++; } });
    var max = 0;
    years.forEach(function (yy) { if (counts[yy] > max) { max = counts[yy]; } });
    var step = (W - x0 - 8) / years.length;
    var barW = Math.max(4, step - 8);
    svg.appendChild(svgEl("line", {
      x1: x0 - 4, y1: baseline, x2: W - 6, y2: baseline, stroke: "#D7D7D7", "stroke-width": 1
    }));
    years.forEach(function (yy, i) {
      var n = counts[yy];
      var h = max ? (n / max) * plotH : 0;
      if (n > 0 && h < 2) { h = 2; }
      var bx = x0 + i * step;
      var group = svgEl("g", {
        "class": "stat-hit",
        "data-filter-key": "year",
        "data-filter-value": String(yy),
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Filter to publication year " + yy + ": " + n +
          (n === 1 ? " reference" : " references")
      });
      group.appendChild(svgEl("rect", {
        x: bx - 3, y: 5, width: Math.max(barW + 6, step - 2),
        height: baseline + 20, "class": "stat-hitbox"
      }));
      var bar = svgEl("rect", {
        x: bx, y: baseline - h, width: barW, height: h,
        fill: "#BA0C2F", "class": "stat-bar"
      });
      var t = svgEl("title");
      t.textContent = yy + ": " + n + (n === 1 ? " reference" : " references") + ". Select to filter.";
      bar.appendChild(t);
      group.appendChild(bar);
      var lab = svgEl("text", {
        x: bx + barW / 2, y: baseline + 16, "text-anchor": "middle", "class": "axis-label"
      });
      lab.textContent = String(yy);
      group.appendChild(lab);
      if (n > 0) {
        var vv = svgEl("text", {
          x: bx + barW / 2, y: baseline - h - 5, "text-anchor": "middle", "class": "axis-label"
        });
        vv.textContent = String(n);
        group.appendChild(vv);
      }
      group.addEventListener("click", function () { setStatFilter("year", String(yy)); });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setStatFilter("year", String(yy));
        }
      });
      svg.appendChild(group);
    });
  }

  function renderHtmlBars(containerId, filterKey, values, colors) {
    var container = document.getElementById(containerId);
    if (!container) { return; }
    while (container.firstChild) { container.removeChild(container.firstChild); }
    var counts = {};
    var max = 0;
    values.forEach(function (value) { counts[value] = 0; });
    PAPERS.forEach(function (p) {
      if (counts[p[filterKey]] !== undefined) { counts[p[filterKey]]++; }
    });
    values.forEach(function (value) { if (counts[value] > max) { max = counts[value]; } });
    values.forEach(function (value, index) {
      if (!counts[value]) { return; }
      var button = el("button", "html-bar");
      button.type = "button";
      button.setAttribute("data-filter-key", filterKey);
      button.setAttribute("data-filter-value", value);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Filter to " + value + ": " + counts[value] + " references");
      button.appendChild(el("span", "html-bar-label", value));
      var track = el("span", "html-bar-track");
      var fill = el("span", "html-bar-fill");
      fill.style.width = ((counts[value] / max) * 100).toFixed(1) + "%";
      fill.style.background = colors[index % colors.length];
      track.appendChild(fill);
      button.appendChild(track);
      button.appendChild(el("span", "html-bar-value", String(counts[value])));
      button.addEventListener("click", function () { setStatFilter(filterKey, value); });
      container.appendChild(button);
    });
  }

  function renderHeatmap() {
    var box = document.getElementById("module-year-heatmap");
    if (!box) { return; }
    while (box.firstChild) { box.removeChild(box.firstChild); }
    var years = [];
    var counts = {};
    var max = 0;
    var year;
    for (year = SURVEY_META.yearMin; year <= SURVEY_META.yearMax; year++) { years.push(year); }
    PAPERS.forEach(function (p) {
      var key = p.cat + "|" + p.year;
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > max) { max = counts[key]; }
    });
    box.appendChild(el("span", "heatmap-label", "RAV module"));
    years.forEach(function (value) { box.appendChild(el("span", "heatmap-year", String(value))); });
    CATEGORIES.forEach(function (cat) {
      box.appendChild(el("span", "heatmap-label", cat));
      years.forEach(function (value) {
        var count = counts[cat + "|" + value] || 0;
        var button = el("button", "heatmap-cell", count ? String(count) : "·");
        button.type = "button";
        button.setAttribute("data-filter-key", "pair");
        button.setAttribute("data-cat", cat);
        button.setAttribute("data-year", String(value));
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", cat + ", " + value + ": " + count +
          (count === 1 ? " reference" : " references") + ". Select to filter.");
        var alpha = count ? 0.12 + (count / max) * 0.65 : 0.03;
        button.style.background = "rgba(31, 78, 148, " + alpha.toFixed(2) + ")";
        button.style.color = alpha > 0.48 ? "#FFFFFF" : "#1A1A1A";
        button.addEventListener("click", function () { setStatPair(cat, value); });
        box.appendChild(button);
      });
    });
    var mobile = document.getElementById("mobile-heatmap-list");
    if (mobile) {
      while (mobile.firstChild) { mobile.removeChild(mobile.firstChild); }
      CATEGORIES.forEach(function (cat) {
        var total = 0;
        var peakYear = years[0];
        var peakCount = -1;
        years.forEach(function (value) {
          var count = counts[cat + "|" + value] || 0;
          total += count;
          if (count > peakCount) {
            peakCount = count;
            peakYear = value;
          }
        });
        var row = el("button", "mobile-heatmap-row stat-hit");
        row.type = "button";
        row.setAttribute("data-filter-key", "cat");
        row.setAttribute("data-filter-value", cat);
        row.setAttribute("aria-pressed", "false");
        row.setAttribute("aria-label", cat + ": " + total + " references; peak year " + peakYear +
          " with " + peakCount + ". Select to filter.");
        row.appendChild(el("strong", null, cat));
        row.appendChild(el("span", null, "Peak " + peakYear + " · " + peakCount));
        row.appendChild(el("b", null, String(total)));
        row.addEventListener("click", function () {
          setStatFilter("cat", cat);
        });
        mobile.appendChild(row);
      });
    }
  }

  function syncStatSelection() {
    var hits = document.querySelectorAll(".stat-hit");
    for (var i = 0; i < hits.length; i++) {
      var hit = hits[i];
      var key = hit.getAttribute("data-filter-key");
      var value = hit.getAttribute("data-filter-value");
      var active = filters[key] && filters[key].has(value);
      hit.classList.toggle("is-active", Boolean(active));
      hit.setAttribute("aria-pressed", active ? "true" : "false");
    }
    var htmlHits = document.querySelectorAll(".html-bar");
    for (var j = 0; j < htmlHits.length; j++) {
      var htmlHit = htmlHits[j];
      var htmlKey = htmlHit.getAttribute("data-filter-key");
      var htmlValue = htmlHit.getAttribute("data-filter-value");
      var htmlActive = filters[htmlKey] && filters[htmlKey].has(htmlValue);
      htmlHit.setAttribute("aria-pressed", htmlActive ? "true" : "false");
    }
    var cells = document.querySelectorAll(".heatmap-cell");
    for (var k = 0; k < cells.length; k++) {
      var cell = cells[k];
      var cellActive = filters.cat.size === 1 &&
        filters.cat.has(cell.getAttribute("data-cat")) &&
        filters.year.size === 1 &&
        filters.year.has(cell.getAttribute("data-year"));
      cell.setAttribute("aria-pressed", cellActive ? "true" : "false");
    }
  }

  /* ---------- paper list ---------- */

  var groupsBox = document.getElementById("paper-groups");
  var groupRefs = {};

  function buildGroups() {
    CATEGORIES.forEach(function (c) {
      var details = el("details", "paper-group");
      var summary = el("summary");
      var dot = el("span", "dot");
      dot.style.background = CAT_COLORS[c];
      summary.appendChild(dot);
      summary.appendChild(document.createTextNode(c));
      var badge = el("span", "badge", String(catTotals[c]));
      summary.appendChild(badge);
      summary.appendChild(el("span", "chevron"));
      details.appendChild(summary);

      var scrollBox = el("div", "table-scroll");
      var table = el("table", "paper-table");
      var thead = el("thead");
      var hr = el("tr");
      ["Ref", "Title", "Authors / Source", "Venue", "Year", "Link"].forEach(function (h) {
        hr.appendChild(el("th", null, h));
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el("tbody");
      table.appendChild(tbody);
      scrollBox.appendChild(table);
      details.appendChild(scrollBox);
      groupsBox.appendChild(details);
      groupRefs[c] = { tbody: tbody, badge: badge };
    });
  }

  function renderTables(filtered) {
    var byCat = {};
    CATEGORIES.forEach(function (c) { byCat[c] = []; });
    filtered.forEach(function (p) { if (byCat[p.cat]) { byCat[p.cat].push(p); } });
    CATEGORIES.forEach(function (c) {
      var rows = sortPapers(byCat[c].slice());
      var ref = groupRefs[c];
      var total = catTotals[c];
      ref.badge.textContent = (rows.length === total) ? String(total) : rows.length + " of " + total;
      var tbody = ref.tbody;
      while (tbody.firstChild) { tbody.removeChild(tbody.firstChild); }
      if (!rows.length) {
        var tr = el("tr", "empty-row");
        var td = el("td", null, "No references match the current filters.");
        td.colSpan = 6;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      rows.forEach(function (p) {
        var tr = el("tr");
        tr.appendChild(el("td", "t-year", "[" + p.n + "]"));
        var tdTitle = el("td", "t-title");
        var titleButton = el("button", "paper-title-button", p.title);
        titleButton.type = "button";
        titleButton.setAttribute("aria-expanded", "false");
        titleButton.setAttribute("aria-controls", "paper-detail-" + p.n);
        tdTitle.appendChild(titleButton);
        tr.appendChild(tdTitle);
        tr.appendChild(el("td", "t-authors", p.authors || "—"));
        tr.appendChild(el("td", "t-venue", p.venue || "—"));
        tr.appendChild(el("td", "t-year", String(p.year)));
        var tdLink = el("td", "t-link");
        var a = el("a", null, linkLabel(p));
        a.href = p._link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", "Open: " + p.title);
        tdLink.appendChild(a);
        tr.appendChild(tdLink);
        tbody.appendChild(tr);

        var detailRow = el("tr", "paper-detail-row");
        detailRow.id = "paper-detail-" + p.n;
        detailRow.hidden = true;
        var detailCell = el("td");
        detailCell.colSpan = 6;
        var detail = el("div", "paper-detail");
        var tags = el("div", "paper-tags");
        [p.etype, p.rural, p.strength + " evidence", p.access + " access"].forEach(function (tagText) {
          tags.appendChild(el("span", "paper-tag", tagText));
        });
        detail.appendChild(tags);
        var focus = el("p");
        focus.appendChild(el("strong", null, "Review coding: "));
        focus.appendChild(document.createTextNode(p.focus));
        detail.appendChild(focus);
        var rav = el("p");
        rav.appendChild(el("strong", null, "RAV relevance: "));
        rav.appendChild(document.createTextNode(p.rav));
        detail.appendChild(rav);
        var access = el("p");
        access.appendChild(el("strong", null, "Access check: "));
        access.appendChild(document.createTextNode(
          p.access === "Open"
            ? "An open version was verified through arXiv, an authoritative page, or Unpaywall."
            : "The DOI was verified, but Unpaywall did not identify an open version at the audit date."
        ));
        detail.appendChild(access);
        var actions = el("div", "paper-actions");
        var open = el("a", "paper-action", p.access === "Open" ? "Open available version" : "Open source record");
        open.href = p.access === "Open" ? accessLink(p) : p._link;
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        actions.appendChild(open);
        if (p.doi) {
          var copyDoi = el("button", "paper-action", "Copy DOI");
          copyDoi.type = "button";
          copyDoi.addEventListener("click", function () {
            copyText(p.doi, copyDoi, "Copy DOI");
          });
          actions.appendChild(copyDoi);
        }
        var copyReference = el("button", "paper-action", "Copy reference");
        copyReference.type = "button";
        copyReference.addEventListener("click", function () {
          copyText(formatReference(p), copyReference, "Copy reference");
        });
        actions.appendChild(copyReference);
        var saveReference = el(
          "button",
          "paper-action workspace-save",
          window.isPaperSaved && window.isPaperSaved(p.n) ? "Saved to Citation Cart" : "Save to Citation Cart"
        );
        saveReference.type = "button";
        saveReference.classList.toggle("workspace-saved", Boolean(window.isPaperSaved && window.isPaperSaved(p.n)));
        saveReference.addEventListener("click", function () {
          if (window.toggleWorkspacePaper) { window.toggleWorkspacePaper(p.n, saveReference); }
        });
        actions.appendChild(saveReference);
        detail.appendChild(actions);
        detailCell.appendChild(detail);
        detailRow.appendChild(detailCell);
        tbody.appendChild(detailRow);
        titleButton.addEventListener("click", function () {
          var opening = detailRow.hidden;
          detailRow.hidden = !opening;
          titleButton.setAttribute("aria-expanded", opening ? "true" : "false");
        });
      });
    });
  }

  function sortPapers(papers) {
    var strengthOrder = { High: 0, Moderate: 1, Emerging: 2 };
    return papers.sort(function (a, b) {
      if (sortMode === "year-asc") {
        return (a.year - b.year) || a.title.localeCompare(b.title);
      }
      if (sortMode === "title") { return a.title.localeCompare(b.title); }
      if (sortMode === "strength") {
        return (strengthOrder[a.strength] - strengthOrder[b.strength]) ||
          (b.year - a.year) || a.title.localeCompare(b.title);
      }
      if (sortMode === "number") { return a.n - b.n; }
      return (b.year - a.year) || a.title.localeCompare(b.title);
    });
  }

  var citationStyle = "apa";
  function formatReference(p) {
    var authors = p.authors || "Author information unavailable";
    var identifier = p.doi ? "https://doi.org/" + p.doi :
      (p.arxiv ? "https://arxiv.org/abs/" + p.arxiv : p._link);
    if (citationStyle === "ieee") {
      return authors + ', "' + p.title + '," ' + (p.venue || "") + ", " + p.year + ". " + identifier;
    }
    if (citationStyle === "chicago") {
      return authors + '. "' + p.title + '." ' + (p.venue || "") + " (" + p.year + "). " + identifier;
    }
    return authors + " (" + p.year + "). " + p.title + ". " + (p.venue || "") + ". " + identifier;
  }
  window.formatPaperCitation = formatReference;

  function copyText(text, button, originalLabel) {
    function flash(label) {
      button.textContent = label;
      setTimeout(function () { button.textContent = originalLabel; }, 1500);
    }
    function legacy() {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(area);
      flash(ok ? "Copied!" : "Copy failed");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash("Copied!"); }, legacy);
    } else {
      legacy();
    }
  }

  /* ---------- main render ---------- */

  var countBox = document.getElementById("count");
  var currentFiltered = PAPERS;

  function updateCountLine() {
    if (pinnedKey && paperByKey[pinnedKey]) {
      var p = paperByKey[pinnedKey];
      var adj = ADJ[pinnedKey] || [];
      countBox.textContent = "Focused: [" + p.n + "] " + shortTitle(p) +
        " — " + adj.length + " evidence link" + (adj.length === 1 ? "" : "s") + " (Esc to exit)";
    } else {
      countBox.textContent = "Showing " + currentFiltered.length + " of " +
        SURVEY_META.paperCount + " references" + (scopeLabel ? " · " + scopeLabel : "");
    }
  }

  function updateStatsSummary() {
    var summary = document.getElementById("stats-filter-summary");
    if (!summary) { return; }
    var labels = {
      cat: "Module",
      year: "Year",
      vtype: "Source",
      etype: "Evidence type",
      rural: "Rural relevance",
      strength: "Strength",
      access: "Access"
    };
    var parts = [];
    Object.keys(filters).forEach(function (key) {
      if (filters[key].size) {
        parts.push(labels[key] + ": " + Array.from(filters[key]).join(", "));
      }
    });
    if (query) { parts.push("Search: “" + query + "”"); }
    if (scopeLabel) { parts.push(scopeLabel); }
    summary.textContent = currentFiltered.length + " of " + SURVEY_META.paperCount +
      " references" + (parts.length ? " — " + parts.join(" · ") : " — all evidence");
  }

  function render() {
    currentFiltered = PAPERS.filter(passesFilters);
    renderScatter(currentFiltered);
    renderTables(currentFiltered);
    syncStatSelection();
    if (window.syncYearBrushFromFilters) { window.syncYearBrushFromFilters(); }
    updateCountLine();
    updateStatsSummary();
    syncUrlState();
  }

  var sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      sortMode = sortSelect.value;
      renderTables(currentFiltered);
      syncUrlState();
    });
  }

  function downloadText(filename, text, type) {
    var blob = new Blob([text], { type: type + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    return '"' + String(value === undefined ? "" : value).replace(/"/g, '""') + '"';
  }

  var exportCsv = document.getElementById("export-csv");
  if (exportCsv) {
    exportCsv.addEventListener("click", function () {
      var headers = [
        "Reference", "Title", "Authors", "Venue", "Year", "Module", "Source type",
        "Evidence type", "Rural relevance", "Evidence strength", "Access", "DOI", "arXiv",
        "Source URL", "Review coding", "RAV relevance"
      ];
      var rows = [headers.map(csvCell).join(",")];
      sortPapers(currentFiltered.slice()).forEach(function (p) {
        rows.push([
          p.n, p.title, p.authors, p.venue, p.year, p.cat, p.vtype, p.etype,
          p.rural, p.strength, p.access, p.doi || "", p.arxiv || "", p.url || "",
          p.focus, p.rav
        ].map(csvCell).join(","));
      });
      downloadText("rav-literature-review.csv", "\uFEFF" + rows.join("\r\n"), "text/csv");
    });
  }

  function bibValue(value) {
    return String(value || "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }

  var exportBibtex = document.getElementById("export-bibtex");
  if (exportBibtex) {
    exportBibtex.addEventListener("click", function () {
      var entries = sortPapers(currentFiltered.slice()).map(function (p) {
        var entryType = p.vtype === "Journal" ? "article" :
          (p.vtype === "Conference" ? "inproceedings" : "misc");
        var key = "rav" + p.year + "ref" + p.n;
        var fields = [
          "  title = {" + bibValue(p.title) + "}",
          "  year = {" + p.year + "}",
          "  note = {" + bibValue(p.venue) + "}"
        ];
        if (p.authors) { fields.splice(1, 0, "  author = {" + bibValue(p.authors) + "}"); }
        if (p.doi) { fields.push("  doi = {" + bibValue(p.doi) + "}"); }
        if (p.arxiv) { fields.push("  eprint = {" + bibValue(p.arxiv) + "}", "  archivePrefix = {arXiv}"); }
        if (!p.doi && p._link) { fields.push("  url = {" + bibValue(p._link) + "}"); }
        return "@" + entryType + "{" + key + ",\n" + fields.join(",\n") + "\n}";
      });
      downloadText("rav-literature-review.bib", entries.join("\n\n") + "\n", "application/x-bibtex");
    });
  }

  /* ---------- citation copy ---------- */

  var copyBtn = document.getElementById("copy-cite");
  var citeBlock = document.getElementById("cite-text");
  var siteCitations = {
    apa: "Que, H., Zhu, T., & Yao, H. (2026). Rural autonomous vehicles: A literature review linking RAV challenges to research evidence and AV pilots. College of Engineering, University of Georgia.",
    ieee: 'H. Que, T. Zhu, and H. Yao, "Rural Autonomous Vehicles: A Literature Review Linking RAV Challenges to Research Evidence and AV Pilots," College of Engineering, University of Georgia, 2026.',
    chicago: 'Que, Haohua, Tianle Zhu, and Handong Yao. "Rural Autonomous Vehicles: A Literature Review Linking RAV Challenges to Research Evidence and AV Pilots." College of Engineering, University of Georgia, 2026.'
  };
  var citationButtons = document.querySelectorAll("[data-citation-style]");
  function applyCitationStyle(style) {
    citationStyle = siteCitations[style] ? style : "apa";
    citeBlock.textContent = siteCitations[citationStyle];
    citationButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-citation-style") === citationStyle ? "true" : "false");
    });
    try { window.localStorage.setItem("rav-citation-style", citationStyle); } catch (err) { /* optional */ }
    if (Object.keys(groupRefs).length) { renderTables(currentFiltered); }
  }
  citationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyCitationStyle(button.getAttribute("data-citation-style"));
    });
  });
  try {
    var storedCitationStyle = window.localStorage.getItem("rav-citation-style");
    if (siteCitations[storedCitationStyle]) { applyCitationStyle(storedCitationStyle); }
  } catch (err) { /* storage is optional */ }
  copyBtn.addEventListener("click", function () {
    var text = citeBlock.textContent;
    function flash(msg) {
      copyBtn.textContent = msg;
      setTimeout(function () { copyBtn.textContent = "Copy citation"; }, 1600);
    }
    function legacyCopy() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) { flash("Copied!"); return; }
      } catch (err) { /* fall through */ }
      flash("Press Ctrl+C");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash("Copied!"); }, legacyCopy);
    } else { legacyCopy(); }
  });

  /* ---------- interactive review methodology ---------- */

  (function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".method-card[data-method-step]"));
    var detail = document.getElementById("method-detail");
    if (!cards.length || !detail) { return; }
    var METHODS = [
      {
        title: "Define scope",
        summary: "Establish what counts as usable evidence before searching so the review remains focused and reproducible.",
        rule: "Include road-vehicle research with direct rural relevance or a documented pathway to rural RAV service.",
        evidence: "2014–2026 research across five technical modules plus operational field-pilot validation.",
        output: "A review framework linking technology, fleet operations, infrastructure, connectivity, cooperation, and pilots.",
        query: "(rural OR low-density OR remote) AND (automated vehicle OR autonomous shuttle) AND road transport",
        checks: ["Road-vehicle scope is explicit", "Rural relevance is direct or traceable", "Publication window and module are coded"],
        example: "A primarily urban method is retained only when the review records a defensible transfer pathway to rural operation.",
        artifact: "Scope statement, five-module framework, and inclusion boundary."
      },
      {
        title: "Search and identify",
        summary: "Use complementary discovery channels so engineering research and operational deployments are both represented.",
        rule: "Combine topic and module keywords, then use backward and forward citation chaining to fill sub-theme gaps.",
        evidence: "Crossref and arXiv metadata; U.S. DOT, state DOT, university, agency, and official pilot sources.",
        output: "A candidate source pool spanning peer-reviewed research, preprints, public reports, and deployment pages.",
        query: '("autonomous driving" OR "automated shuttle") AND (perception OR fleet OR infrastructure OR V2X OR cooperative)',
        checks: ["Metadata matches the source record", "DOI or arXiv identifier resolves", "Pilot evidence comes from an authoritative owner"],
        example: "Backward and forward chaining connects a foundational method to newer rural adaptations and deployment evidence.",
        artifact: "Search-source audit and candidate-source pool."
      },
      {
        title: "Screen and deduplicate",
        summary: "Apply the same relevance test to every candidate and keep one verified record for each distinct work.",
        rule: "Retain direct rural studies or clearly transferable AV evidence; exclude unrelated modes, corrections, withdrawn items, duplicates, and unverifiable records.",
        evidence: "Titles, abstracts, study context, source type, deployment setting, and version relationships.",
        output: "A unique retained set whose rural relevance is explicit rather than inferred from urban evidence.",
        query: "retain = road_vehicle AND verified_source AND (direct_rural OR documented_transfer_path)",
        checks: ["Duplicate title and identifier review", "Transport mode and deployment context check", "Correction, withdrawal, and version check"],
        example: "A conference paper and its journal extension are linked; only distinct evidence is counted as a separate record.",
        artifact: "Deduplicated retained set with exclusion reasons."
      },
      {
        title: "Verify and code",
        summary: "Resolve every retained item to a real source and apply a consistent evidence taxonomy for the interactive review.",
        rule: "Require a working DOI, arXiv record, or authoritative source page before a record enters the evidence database.",
        evidence: "92 DOI records, 14 arXiv records, and 12 authoritative pages; 85 records are openly accessible.",
        output: "118 verified records coded by RAV module, study design, rural relevance, evidence strength, year, and access status.",
        query: "DOI resolves OR arXiv resolves OR official program page resolves",
        checks: ["Identifier and destination agree", "All coding fields are populated", "Open-access status is recorded separately from quality"],
        example: "Official deployment pages are used for pilot operations when a peer-reviewed evaluation is not available.",
        artifact: "Verified reference database plus DOI, access, and source audit."
      }
    ];
    var step = detail.querySelector(".method-detail-step");
    var title = detail.querySelector("h3");
    var summary = detail.querySelector(".method-detail-head p");
    var values = detail.querySelectorAll(".method-detail-grid p");
    var auditQuery = document.getElementById("method-audit-query");
    var auditChecks = document.getElementById("method-audit-checks");
    var auditExample = document.getElementById("method-audit-example");
    var auditArtifact = document.getElementById("method-audit-artifact");
    function showMethod(index) {
      var method = METHODS[index];
      if (!method) { return; }
      step.textContent = "Step " + (index + 1) + " of " + METHODS.length;
      title.textContent = method.title;
      summary.textContent = method.summary;
      values[0].textContent = method.rule;
      values[1].textContent = method.evidence;
      values[2].textContent = method.output;
      if (auditQuery) { auditQuery.textContent = method.query; }
      if (auditChecks) {
        while (auditChecks.firstChild) { auditChecks.removeChild(auditChecks.firstChild); }
        method.checks.forEach(function (check) { auditChecks.appendChild(el("li", null, check)); });
      }
      if (auditExample) { auditExample.textContent = method.example; }
      if (auditArtifact) { auditArtifact.textContent = method.artifact; }
      cards.forEach(function (card, cardIndex) {
        var active = cardIndex === index;
        card.classList.toggle("is-active", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
    cards.forEach(function (card, index) {
      card.addEventListener("click", function () { showMethod(index); });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showMethod(index);
        }
      });
    });
    showMethod(0);
  })();

  /* ---------- scenario planner ---------- */

  (function () {
    var root = document.getElementById("scenario-planner");
    if (!root) { return; }
    var allowed = {
      road: ["paved", "unpaved", "park"],
      weather: ["normal", "adverse", "winter"],
      connectivity: ["reliable", "intermittent", "dead-zones"],
      demand: ["fixed", "thin", "on-demand"]
    };
    var state = {
      road: "paved",
      weather: "normal",
      connectivity: "intermittent",
      demand: "thin"
    };
    var initialParams = new URLSearchParams(window.location.search);
    Object.keys(state).forEach(function (key) {
      var requested = initialParams.get(key);
      if (allowed[key].indexOf(requested) !== -1) { state[key] = requested; }
    });
    var scoreBox = document.getElementById("planner-score");
    var posture = document.getElementById("planner-posture");
    var summary = document.getElementById("planner-summary");
    var stackBox = document.getElementById("planner-stack");
    var actionBox = document.getElementById("planner-actions");
    var evidenceButton = document.getElementById("planner-evidence");
    var shareButton = document.getElementById("planner-share");
    var saveAButton = document.getElementById("planner-save-a");
    var saveBButton = document.getElementById("planner-save-b");
    var clearComparisonButton = document.getElementById("planner-clear-comparison");
    var comparisonGrid = document.getElementById("scenario-comparison-grid");
    var currentRefs = [];
    var currentLabel = "";
    var currentSnapshot = null;
    var scenarioA = null;
    var scenarioB = null;

    function addUnique(target, values) {
      values.forEach(function (value) {
        if (target.indexOf(value) === -1) { target.push(value); }
      });
    }

    function writeScenarioUrl() {
      var params = new URLSearchParams(window.location.search);
      Object.keys(state).forEach(function (key) { params.set(key, state[key]); });
      var next = window.location.pathname + "?" + params.toString() + window.location.hash;
      window.history.replaceState(null, "", next);
    }

    function renderPlanner(updateUrl) {
      var score = 82;
      var stacks = ["Camera + radar baseline", "GNSS/INS + map prior"];
      var actions = ["Validate the onboard fallback on the target route before adding infrastructure support."];
      var refs = [1,2,17,18,19,20,23,24,56,57,58,60,61,62,63,64];

      if (state.road === "unpaved") {
        score -= 20;
        addUnique(stacks, ["Local surface dataset", "Road-condition assessment"]);
        addUnique(actions, [
          "Survey gravel condition, geometry, signs, and markings before defining the operational design domain.",
          "Retrain perception and localization on sparse geometry and unpaved surfaces."
        ]);
        addUnique(refs, [39,46,47,48,49,80,83,84,85,86,88]);
      } else if (state.road === "park") {
        score -= 8;
        addUnique(stacks, ["Geofenced route plan", "Onboard supervision"]);
        addUnique(actions, [
          "Use explicit stop, interruption, charging, and visitor-interaction procedures.",
          "Treat the fixed route as a controlled learning environment, not proof of open-road readiness."
        ]);
        addUnique(refs, [16,77,116,117]);
      } else {
        addUnique(stacks, ["Selective roadside support"]);
        addUnique(actions, ["Instrument only high-risk conflict points and segments with a demonstrated onboard sensing gap."]);
        addUnique(refs, [37,38,80,81,82,84,87,118]);
      }

      if (state.weather === "adverse") {
        score -= 14;
        addUnique(stacks, ["Adverse-weather perception", "Risk-triggered fallback"]);
        addUnique(actions, ["Calibrate visibility and sensor-degradation thresholds for local rain, fog, and glare."]);
        addUnique(refs, [3,12,13,21,22,58,61]);
      } else if (state.weather === "winter") {
        score -= 19;
        addUnique(stacks, ["Winter sensor fusion", "Road-weather feed", "Minimum-risk stop"]);
        addUnique(actions, [
          "Validate combined snow, low-light, occlusion, and road-surface degradation.",
          "Preserve a safe onboard response when road-weather information is unavailable."
        ]);
        addUnique(refs, [3,12,13,21,22,58,61,86]);
      } else {
        addUnique(actions, ["Retain weather fallback criteria even if the initial pilot operates in fair conditions."]);
      }

      if (state.connectivity === "reliable") {
        score -= 3;
        addUnique(stacks, ["V2X + edge support"]);
        addUnique(actions, ["Keep safety-critical control onboard even when the route has reliable communications."]);
        addUnique(refs, [9,50,51,52,92,93,95,96,97,98,103]);
      } else if (state.connectivity === "intermittent") {
        score -= 13;
        addUnique(stacks, ["Multi-channel communications", "Store-and-forward telemetry"]);
        addUnique(actions, ["Switch among direct V2X, cellular, and satellite support using measured coverage and latency."]);
        addUnique(refs, [8,50,79,92,93,94,103]);
      } else {
        score -= 24;
        addUnique(stacks, ["Onboard safety core", "Delayed fleet synchronization"]);
        addUnique(actions, [
          "Design the service to remain safe through extended network loss.",
          "Use remote supervision only within a verified latency and video-quality envelope."
        ]);
        addUnique(refs, [8,50,79,92,93,94,103]);
      }

      if (state.demand === "fixed") {
        score -= 4;
        addUnique(stacks, ["Fixed-route scheduler", "Energy + headway plan"]);
        addUnique(actions, ["Plan headways, charging, and service recovery for thin rural demand."]);
        addUnique(refs, [16,69,77,78,116,117]);
      } else if (state.demand === "on-demand") {
        score -= 7;
        addUnique(stacks, ["Ride matching", "Accessible booking", "Dynamic dispatch"]);
        addUnique(actions, ["Calibrate service zones, fleet size, wait-time targets, and non-app booking support."]);
        addUnique(refs, [5,14,15,28,29,30,31,68,70,71,73,75]);
      } else {
        score -= 10;
        addUnique(stacks, ["Demand-responsive scheduling", "Fleet rebalancing"]);
        addUnique(actions, ["Test whether a hybrid scheduled and on-demand service avoids low utilization and long waits."]);
        addUnique(refs, [5,28,29,30,31,68,69,70,73,75,78]);
      }

      score = Math.max(22, Math.min(88, score));
      var postureText;
      var summaryText;
      var scoreColor;
      if (score >= 72) {
        postureText = "Pilot-ready with safeguards";
        summaryText = "The scenario can start with existing technology, route-specific validation, and explicit safety gates.";
        scoreColor = "#4B8B3B";
      } else if (score >= 48) {
        postureText = "Adapt before deployment";
        summaryText = "Use a resilient onboard core, close the highlighted rural gaps, and validate them in a supervised pilot.";
        scoreColor = "#D99114";
      } else {
        postureText = "High-assurance pilot only";
        summaryText = "The combined road, weather, communications, and service risks require a tightly scoped operational design domain.";
        scoreColor = "#BA0C2F";
      }

      scoreBox.style.setProperty("--score-angle", score + "%");
      scoreBox.style.setProperty("--score-color", scoreColor);
      scoreBox.querySelector("strong").textContent = String(score);
      posture.textContent = postureText;
      summary.textContent = summaryText;
      while (stackBox.firstChild) { stackBox.removeChild(stackBox.firstChild); }
      stacks.forEach(function (item) { stackBox.appendChild(el("span", null, item)); });
      while (actionBox.firstChild) { actionBox.removeChild(actionBox.firstChild); }
      actions.slice(0, 5).forEach(function (item) { actionBox.appendChild(el("li", null, item)); });
      currentRefs = refs.sort(function (a, b) { return a - b; });
      currentLabel = state.road + " / " + state.weather + " / " + state.connectivity + " / " + state.demand;
      currentSnapshot = {
        state: Object.assign({}, state),
        label: currentLabel,
        score: score,
        posture: postureText,
        summary: summaryText,
        stacks: stacks.slice(),
        actions: actions.slice(0, 5),
        refs: currentRefs.slice()
      };
      evidenceButton.textContent = "Explore " + currentRefs.length + " supporting references";
      root.querySelectorAll("[data-planner-key]").forEach(function (button) {
        var active = state[button.getAttribute("data-planner-key")] === button.getAttribute("data-planner-value");
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (updateUrl) { writeScenarioUrl(); }
    }

    function persistScenarioComparison() {
      try {
        window.localStorage.setItem("rav-scenario-comparison", JSON.stringify({ a: scenarioA, b: scenarioB }));
      } catch (err) { /* optional */ }
    }

    function scenarioCard(snapshot, slot) {
      var card = el("article", "scenario-snapshot");
      card.style.setProperty("--snapshot-color", snapshot.score >= 72 ? "#4B8B3B" : (snapshot.score >= 48 ? "#D99114" : "#BA0C2F"));
      card.appendChild(el("span", "scenario-label", "Scenario " + slot));
      card.appendChild(el("h5", null, snapshot.label.replace(/\//g, " · ")));
      var score = el("p", "scenario-score-line");
      score.appendChild(el("strong", null, String(snapshot.score)));
      score.appendChild(el("span", null, snapshot.posture));
      card.appendChild(score);
      var stackList = el("ul");
      snapshot.stacks.slice(0, 4).forEach(function (item) { stackList.appendChild(el("li", null, item)); });
      card.appendChild(stackList);
      var load = el("button", "paper-action", "Load scenario " + slot);
      load.type = "button";
      load.addEventListener("click", function () {
        state = Object.assign({}, snapshot.state);
        renderPlanner(true);
      });
      card.appendChild(load);
      return card;
    }

    function renderScenarioComparison() {
      if (!comparisonGrid) { return; }
      while (comparisonGrid.firstChild) { comparisonGrid.removeChild(comparisonGrid.firstChild); }
      if (!scenarioA && !scenarioB) {
        comparisonGrid.appendChild(el("p", "scenario-empty", "Save the current configuration to A or B to compare readiness, stack requirements, and evidence."));
        return;
      }
      if (scenarioA) { comparisonGrid.appendChild(scenarioCard(scenarioA, "A")); }
      if (scenarioB) { comparisonGrid.appendChild(scenarioCard(scenarioB, "B")); }
      if (scenarioA && scenarioB) {
        var shared = scenarioA.stacks.filter(function (item) { return scenarioB.stacks.indexOf(item) !== -1; });
        var uniqueA = scenarioA.stacks.filter(function (item) { return scenarioB.stacks.indexOf(item) === -1; });
        var uniqueB = scenarioB.stacks.filter(function (item) { return scenarioA.stacks.indexOf(item) === -1; });
        var delta = el("article", "scenario-comparison-delta");
        delta.appendChild(el("strong", null, Math.abs(scenarioA.score - scenarioB.score) + "-point readiness difference"));
        delta.appendChild(el("p", null, shared.length + " shared stack elements · " + uniqueA.length + " unique to A · " + uniqueB.length + " unique to B"));
        var combinedRefs = Array.from(new Set(scenarioA.refs.concat(scenarioB.refs))).sort(function (a, b) { return a - b; });
        var evidence = el("button", "paper-action", "Explore " + combinedRefs.length + " combined references");
        evidence.type = "button";
        evidence.addEventListener("click", function () {
          setRecommendationFilter("Scenario A/B comparison", combinedRefs, null, "Scenario comparison");
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        });
        delta.appendChild(evidence);
        comparisonGrid.appendChild(delta);
      }
    }

    root.querySelectorAll("[data-planner-key]").forEach(function (button) {
      button.addEventListener("click", function () {
        state[button.getAttribute("data-planner-key")] = button.getAttribute("data-planner-value");
        renderPlanner(true);
      });
    });
    evidenceButton.addEventListener("click", function () {
      setRecommendationFilter(currentLabel, currentRefs, null, "Scenario planner");
      document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
    });
    shareButton.addEventListener("click", function () {
      writeScenarioUrl();
      var done = function () {
        shareButton.textContent = "Scenario link copied";
        window.setTimeout(function () { shareButton.textContent = "Copy scenario link"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(done);
      } else {
        var input = el("textarea");
        input.value = window.location.href;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        done();
      }
    });
    if (saveAButton) {
      saveAButton.addEventListener("click", function () {
        scenarioA = JSON.parse(JSON.stringify(currentSnapshot));
        persistScenarioComparison();
        renderScenarioComparison();
      });
    }
    if (saveBButton) {
      saveBButton.addEventListener("click", function () {
        scenarioB = JSON.parse(JSON.stringify(currentSnapshot));
        persistScenarioComparison();
        renderScenarioComparison();
      });
    }
    if (clearComparisonButton) {
      clearComparisonButton.addEventListener("click", function () {
        scenarioA = null;
        scenarioB = null;
        persistScenarioComparison();
        renderScenarioComparison();
      });
    }
    try {
      var storedComparison = JSON.parse(window.localStorage.getItem("rav-scenario-comparison") || "{}");
      scenarioA = storedComparison.a || null;
      scenarioB = storedComparison.b || null;
    } catch (err) { scenarioA = null; scenarioB = null; }
    renderPlanner(false);
    renderScenarioComparison();
  })();

  /* ---------- field-pilot map ---------- */

  (function () {
    var mapElement = document.getElementById("pilot-map");
    if (!mapElement) { return; }
    var programs = [
      {
        key: "gomarti",
        label: "goMARTI",
        name: "goMARTI",
        location: "Grand Rapids, Minnesota",
        coords: [47.2372, -93.5302],
        mode: "on-demand",
        modeLabel: "On-demand",
        refs: [14,15],
        summary: "Accessible demand-responsive service across a dispersed rural community.",
        frame: "Low-speed, geofenced service with an onboard safety operator.",
        lesson: "Pair flexible booking with explicit safety gates and accessible rider support."
      },
      {
        key: "adastec",
        label: "ADASTEC at Sleeping Bear Dunes",
        name: "ADASTEC",
        location: "Sleeping Bear Dunes, Michigan",
        coords: [44.8561, -86.0581],
        mode: "fixed",
        modeLabel: "Fixed route",
        refs: [16],
        summary: "A scheduled automated bus in a remote public-land setting.",
        frame: "Defined geofenced route with supervised operation.",
        lesson: "Predictable routes simplify deployment but still require energy and interruption planning."
      },
      {
        key: "teddy",
        label: "TEDDY at Yellowstone",
        name: "TEDDY",
        location: "Yellowstone National Park",
        coords: [44.4280, -110.5885],
        mode: "fixed",
        modeLabel: "Fixed route",
        refs: [116],
        summary: "Visitor shuttle evidence from a remote national-park environment.",
        frame: "Low-speed, geofenced operation with onboard supervision.",
        lesson: "Plan weather, communications, energy, and service interruption as one operating system."
      },
      {
        key: "cassi",
        label: "CASSI in North Carolina",
        name: "CASSI",
        location: "Wright Brothers Memorial + N.C. sites",
        coords: [36.0161, -75.6693],
        mode: "fixed",
        modeLabel: "Fixed route",
        refs: [116,117],
        summary: "Automated shuttle demonstrations across remote and public sites in North Carolina.",
        frame: "Geofenced routes with onboard safety operators.",
        lesson: "Comparable reporting across sites exposes repeatable operational barriers."
      }
    ];
    var detailName = document.getElementById("map-detail-name");
    var detailMode = document.getElementById("map-detail-mode");
    var detailLocation = document.getElementById("map-detail-location");
    var detailSummary = document.getElementById("map-detail-summary");
    var detailFrame = document.getElementById("map-detail-frame");
    var detailLesson = document.getElementById("map-detail-lesson");
    var detailEvidence = document.getElementById("map-detail-evidence");
    var selected = programs[0];
    var markers = {};
    var map = null;
    var storyButton = document.getElementById("pilot-story-toggle");
    var storyPrevious = document.getElementById("pilot-story-prev");
    var storyNext = document.getElementById("pilot-story-next");
    var storyStatus = document.getElementById("pilot-story-status");
    var storyActive = false;
    var storyIndex = 0;
    var storyTimer = null;
    var corridorButton = document.getElementById("pilot-corridor-toggle");
    var corridorNote = document.getElementById("map-corridor-note");
    var corridorLayer = null;
    var corridorVisible = false;
    var compareA = document.getElementById("pilot-compare-a");
    var compareB = document.getElementById("pilot-compare-b");
    var compareRun = document.getElementById("pilot-compare-run");
    var compareResult = document.getElementById("pilot-side-result");

    function populatePilotCompare() {
      if (!compareA || !compareB) { return; }
      programs.forEach(function (program, index) {
        var optionA = el("option", null, program.name);
        optionA.value = program.key;
        compareA.appendChild(optionA);
        var optionB = el("option", null, program.name);
        optionB.value = program.key;
        compareB.appendChild(optionB);
        if (index === 1) { optionB.selected = true; }
      });
    }

    function pilotCompareCard(program) {
      var card = el("article", "pilot-compare-card");
      card.appendChild(el("span", "scenario-slot", program.modeLabel));
      card.appendChild(el("h5", null, program.name));
      card.appendChild(el("p", "pilot-compare-location", program.location));
      card.appendChild(el("p", null, program.frame));
      var lesson = el("p");
      lesson.appendChild(el("strong", null, "Transfer lesson: "));
      lesson.appendChild(document.createTextNode(program.lesson));
      card.appendChild(lesson);
      var evidence = el("button", "paper-action", "Open " + program.refs.length + " source record" + (program.refs.length === 1 ? "" : "s"));
      evidence.type = "button";
      evidence.addEventListener("click", function () {
        setRecommendationFilter(program.label, program.refs, programCard(program), "Pilot comparison");
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      card.appendChild(evidence);
      return card;
    }

    function renderPilotComparison() {
      if (!compareA || !compareB || !compareResult) { return; }
      var first = programs.find(function (program) { return program.key === compareA.value; }) || programs[0];
      var second = programs.find(function (program) { return program.key === compareB.value; }) || programs[1];
      while (compareResult.firstChild) { compareResult.removeChild(compareResult.firstChild); }
      compareResult.appendChild(pilotCompareCard(first));
      compareResult.appendChild(pilotCompareCard(second));
      var insight = el("article", "pilot-shared");
      insight.appendChild(el("span", "scenario-slot", "Shared lesson"));
      insight.appendChild(el("h5", null, first.mode === second.mode ? "Comparable service models" : "Different service models, shared safety constraints"));
      insight.appendChild(el("p", null,
        first.mode === second.mode
          ? "Compare route context, interruptions, and operator dependence without changing the basic service model."
          : "Demand-responsive and fixed-route service organize riders differently, but both remain geofenced, supervised, and dependent on explicit fallback procedures."
      ));
      compareResult.appendChild(insight);
      if (map) {
        map.fitBounds(L.latLngBounds([first.coords, second.coords]).pad(.45), { maxZoom: 6, animate: true });
      }
    }
    populatePilotCompare();
    if (compareRun) { compareRun.addEventListener("click", renderPilotComparison); }
    if (compareA) { compareA.addEventListener("change", renderPilotComparison); }
    if (compareB) { compareB.addEventListener("change", renderPilotComparison); }
    renderPilotComparison();

    function programCard(program) {
      return document.querySelector('.pilot-card[data-label="' + program.label + '"]');
    }

    function updateSelection(program, shouldFly) {
      selected = program;
      detailName.textContent = program.name;
      detailMode.textContent = program.modeLabel;
      detailLocation.textContent = program.location;
      detailSummary.textContent = program.summary;
      detailFrame.textContent = program.frame;
      detailLesson.textContent = program.lesson;
      detailEvidence.textContent = "Explore " + program.refs.length + " source record" + (program.refs.length === 1 ? "" : "s");
      programs.forEach(function (item) {
        var card = programCard(item);
        if (card) { card.classList.toggle("map-selected", item.key === program.key); }
        var marker = markers[item.key];
        if (marker && marker.getElement()) {
          var dot = marker.getElement().querySelector(".pilot-marker");
          if (dot) { dot.classList.toggle("is-selected", item.key === program.key); }
        }
      });
      if (map && markers[program.key] && map.hasLayer(markers[program.key]) && shouldFly) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          map.setView(program.coords, 6, { animate: false });
        } else {
          map.flyTo(program.coords, 6, { duration: .65 });
        }
      }
      if (storyActive && storyStatus) {
        storyIndex = programs.indexOf(program);
        storyStatus.textContent = (storyIndex + 1) + " of " + programs.length + " · " + program.name;
      }
      if (corridorVisible) { renderConceptCorridor(false); }
    }

    detailEvidence.addEventListener("click", function () {
      setRecommendationFilter(selected.label, selected.refs, programCard(selected), "Pilot program");
      document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
    });

    if (typeof L === "undefined") {
      mapElement.innerHTML = '<p class="pilot-map-loading">The interactive map could not load. The accessible pilot cards below remain available.</p>';
      if (storyButton) { storyButton.disabled = true; storyButton.textContent = "Story unavailable"; }
      if (corridorButton) { corridorButton.disabled = true; corridorButton.textContent = "Corridor unavailable"; }
      updateSelection(programs[0], false);
      return;
    }

    mapElement.innerHTML = "";
    map = L.map(mapElement, {
      center: [39.4, -97.2],
      zoom: 4,
      minZoom: 3,
      maxZoom: 9,
      scrollWheelZoom: true,
      keyboard: true,
      zoomControl: true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    function conceptCorridor(program) {
      var latitude = program.coords[0];
      var longitude = program.coords[1];
      return [
        [latitude - .055, longitude - .09],
        [latitude - .025, longitude - .035],
        [latitude, longitude],
        [latitude + .028, longitude + .045],
        [latitude + .05, longitude + .095]
      ];
    }
    function renderConceptCorridor(shouldFit) {
      if (corridorLayer) { map.removeLayer(corridorLayer); corridorLayer = null; }
      if (!corridorVisible) { return; }
      corridorLayer = L.polyline(conceptCorridor(selected), {
        color: "#BA0C2F",
        weight: 5,
        opacity: .78,
        dashArray: "10 8",
        lineCap: "round",
        interactive: false
      }).addTo(map);
      if (shouldFit) {
        map.fitBounds(corridorLayer.getBounds().pad(.55), { maxZoom: 9, animate: true });
      }
    }
    corridorButton.addEventListener("click", function () {
      corridorVisible = !corridorVisible;
      corridorButton.setAttribute("aria-pressed", corridorVisible ? "true" : "false");
      corridorButton.textContent = corridorVisible ? "Hide concept corridor" : "Show concept corridor";
      corridorNote.hidden = !corridorVisible;
      renderConceptCorridor(corridorVisible);
    });

    programs.forEach(function (program, index) {
      var color = program.mode === "on-demand" ? "#00A3AD" : "#4B8B3B";
      var icon = L.divIcon({
        className: "pilot-marker-icon",
        html: '<span class="pilot-marker" style="--marker-color:' + color + '"><b>' + (index + 1) + '</b></span>',
        iconSize: [40, 40],
        iconAnchor: [20, 38]
      });
      var marker = L.marker(program.coords, {
        icon: icon,
        keyboard: true,
        title: program.name + " — " + program.location,
        alt: program.name + " pilot location"
      }).addTo(map);
      marker.bindTooltip(program.name + " · " + program.modeLabel, { direction: "top", offset: [0, -30] });
      marker.on("click", function () { updateSelection(program, true); });
      markers[program.key] = marker;
      var card = programCard(program);
      if (card) {
        card.addEventListener("focus", function () { updateSelection(program, false); });
        card.addEventListener("click", function () { updateSelection(program, false); });
      }
    });

    function applyMapFilter(mode) {
      var visible = programs.filter(function (program) { return mode === "all" || program.mode === mode; });
      programs.forEach(function (program) {
        var show = visible.indexOf(program) !== -1;
        var marker = markers[program.key];
        var card = programCard(program);
        if (show && marker && !map.hasLayer(marker)) { marker.addTo(map); }
        if (!show && marker && map.hasLayer(marker)) { marker.removeFrom(map); }
        if (card) { card.hidden = !show; }
      });
      document.querySelectorAll(".pilot-map-filter").forEach(function (button) {
        var active = button.getAttribute("data-pilot-filter") === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (visible.indexOf(selected) === -1) { updateSelection(visible[0], false); }
      var bounds = L.latLngBounds(visible.map(function (program) { return program.coords; }));
      map.fitBounds(bounds.pad(mode === "all" ? .18 : .45), { maxZoom: mode === "all" ? 4 : 6, animate: true });
      window.setTimeout(function () { map.invalidateSize(); }, 120);
    }

    document.querySelectorAll(".pilot-map-filter").forEach(function (button) {
      button.addEventListener("click", function () {
        stopStory();
        applyMapFilter(button.getAttribute("data-pilot-filter"));
      });
    });

    function clearStoryTimer() {
      if (storyTimer) { window.clearInterval(storyTimer); storyTimer = null; }
    }
    function showStoryStep(index) {
      storyIndex = (index + programs.length) % programs.length;
      updateSelection(programs[storyIndex], true);
    }
    function startStory() {
      storyActive = true;
      clearStoryTimer();
      applyMapFilter("all");
      document.querySelector(".pilot-map-shell").classList.add("is-story-mode");
      storyButton.setAttribute("aria-pressed", "true");
      storyButton.textContent = "Stop story";
      storyPrevious.hidden = false;
      storyNext.hidden = false;
      storyStatus.hidden = false;
      showStoryStep(programs.indexOf(selected) >= 0 ? programs.indexOf(selected) : 0);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        storyTimer = window.setInterval(function () { showStoryStep(storyIndex + 1); }, 7000);
      }
    }
    function stopStory() {
      if (!storyActive) { return; }
      storyActive = false;
      clearStoryTimer();
      document.querySelector(".pilot-map-shell").classList.remove("is-story-mode");
      storyButton.setAttribute("aria-pressed", "false");
      storyButton.textContent = "Start story";
      storyPrevious.hidden = true;
      storyNext.hidden = true;
      storyStatus.hidden = true;
    }
    storyButton.addEventListener("click", function () {
      if (storyActive) { stopStory(); } else { startStory(); }
    });
    storyPrevious.addEventListener("click", function () {
      clearStoryTimer();
      showStoryStep(storyIndex - 1);
    });
    storyNext.addEventListener("click", function () {
      clearStoryTimer();
      showStoryStep(storyIndex + 1);
    });
    updateSelection(programs[0], false);
    applyMapFilter("all");
  })();

  /* ---------- stakeholder briefing view ---------- */

  (function () {
    var root = document.getElementById("stakeholder-view");
    if (!root) { return; }
    var cards = Array.prototype.slice.call(document.querySelectorAll(".recommendation-card[data-stakeholder-card]"));
    var summary = document.getElementById("stakeholder-summary");
    var referenceLine = document.getElementById("stakeholder-reference-line");
    var printButton = document.getElementById("stakeholder-print");
    var stakeholderCopy = {
      all: "Showing the complete staged deployment strategy across all stakeholder groups.",
      vehicle: "RAV team: prioritize multi-sensor perception, fused localization, rural training data, and onboard fallback.",
      fleet: "Fleet operator: align dispatch, charging, supervision, and service recovery with thin rural demand.",
      road: "DOT & planners: assess roads first, upgrade selectively, and maintain shared digital road information.",
      connect: "Connectivity partners: design for dead zones, combine resilient channels, and keep safety-critical control onboard.",
      pilot: "Program & community partners: use explicit safety gates, accessible service design, and comparable public reporting."
    };
    var activeStakeholder = "all";
    function setStakeholder(value) {
      activeStakeholder = value;
      root.querySelectorAll("[data-stakeholder]").forEach(function (button) {
        button.setAttribute("aria-pressed",
          button.getAttribute("data-stakeholder") === value ? "true" : "false");
      });
      cards.forEach(function (card) {
        var focused = value === "all" || card.getAttribute("data-stakeholder-card") === value;
        card.classList.toggle("is-deemphasized", !focused);
        card.classList.toggle("is-stakeholder-focus", value !== "all" && focused);
      });
      summary.textContent = stakeholderCopy[value];
      if (value === "all") {
        referenceLine.textContent = "Choose one perspective to include its supporting reference numbers in the printable brief.";
      } else {
        var focusedCard = cards.find(function (card) {
          return card.getAttribute("data-stakeholder-card") === value;
        });
        var refs = focusedCard ? focusedCard.getAttribute("data-refs").split(",") : [];
        referenceLine.textContent = "Supporting references: " + refs.map(function (number) {
          return "[" + number + "]";
        }).join(" ");
      }
    }
    root.querySelectorAll("[data-stakeholder]").forEach(function (button) {
      button.addEventListener("click", function () { setStakeholder(button.getAttribute("data-stakeholder")); });
    });
    printButton.addEventListener("click", function () {
      document.body.classList.add("brief-print-mode");
      window.print();
      window.setTimeout(function () { document.body.classList.remove("brief-print-mode"); }, 500);
    });
    window.addEventListener("afterprint", function () { document.body.classList.remove("brief-print-mode"); });
    setStakeholder(activeStakeholder);
  })();

  /* ---------- stakeholder recommendations ---------- */

  (function () {
    var cards = document.querySelectorAll(".recommendation-card, .pilot-card");
    cards.forEach(function (card) {
      var label = card.getAttribute("data-label");
      var refs = card.getAttribute("data-refs").split(",").map(function (n) { return Number(n); });
      function activate() {
        var prefix = card.classList.contains("pilot-card") ? "Pilot program" : "Recommendation";
        setRecommendationFilter(label, refs, card, prefix);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      }
      card.addEventListener("click", activate);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  })();

  /* ---------- nav scroll spy ---------- */

  var sections = Array.prototype.slice.call(document.querySelectorAll("main > section[id]"));
  var navLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll(".nav-pills a"), function (a) {
    navLinks[a.getAttribute("href").slice(1)] = a;
  });

  var spyPending = false;
  function spy() {
    spyPending = false;
    var activeId = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 110) { activeId = sections[i].id; }
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      activeId = sections[sections.length - 1].id;
    }
    for (var id in navLinks) {
      if (Object.prototype.hasOwnProperty.call(navLinks, id)) {
        navLinks[id].classList.toggle("active", id === activeId);
      }
    }
  }
  window.addEventListener("scroll", function () {
    if (!spyPending) { spyPending = true; window.requestAnimationFrame(spy); }
  }, { passive: true });

  /* ---------- framework diagram ---------- */

  (function () {
    var detail = document.getElementById("thesis-detail");
    var pillars = document.querySelectorAll(".fw-pillar");
    var subpillars = document.querySelectorAll(".fw-subpillar");
    if (!detail || !pillars.length) { return; }
    var card = document.querySelector(".thesis-card");
    var flowToggle = document.getElementById("framework-flow-toggle");
    var flowPath = document.getElementById("framework-flow-path");
    var openEvidence = document.getElementById("framework-open-evidence");
    var openReferences = document.getElementById("framework-open-references");
    var flowMode = true;
    var flowLocked = false;
    var selectedFlow = { cat: null, subcat: null, refs: [], theme: null };
    if (card) { card.classList.add("flow-mode"); }
    var INFO = {
      "Autonomous Driving": ["Tier 1 · Existing", "Four linked submodules carry rural driving: perception, localization, heterogeneous data integration, and route planning. Rural data and field validation remain the shared gap."],
      "Perception": ["Autonomous Driving submodule", "Camera, radar, LiDAR, and IMU fusion improves coverage and redundancy. RAV must retrain and validate the stack on faded markings, unpaved roads, occlusion, and adverse weather."],
      "Localization": ["Autonomous Driving submodule", "GNSS/INS, vision, LiDAR, and an HD-map prior sustain lane-level positioning. The dominant rural gap is building and maintaining the HD maps."],
      "Data Integration": ["Autonomous Driving submodule", "Onboard fusion reconciles raw sensor streams, detections, pose, and map priors into one real-time estimate; edge and cloud feeds remain opportunistic under patchy coverage."],
      "Route Planning": ["Autonomous Driving submodule", "Energy- and terrain-aware planning supports both on-demand healthcare trips and fixed transit or park routes, but needs locally calibrated grade, surface, range, and demand data."],
      "Fleet Management": ["Tier 1 · Existing", "On-demand dispatch and ride-matching are reusable. Thin-demand fixed-route scheduling, charging and service monitoring, and remote supervision over weak rural links remain the principal gaps."],
      "Dispatch & Matching": ["Fleet Management submodule", "Reinforcement-learning dispatch, operations-research methods, and rider-app matching support scattered, thin rural demand."],
      "Remote Supervision": ["Fleet Management submodule", "RAV must define supervisor-to-vehicle ratios, takeover procedures, and resilient monitoring when telemetry or video links degrade."],
      "Fixed-Route Scheduling": ["Fleet Management submodule", "Headway and timetable design for thin-demand fixed routes remains a rural research and implementation gap."],
      "Fleet Support": ["Fleet Management submodule", "Charging, onboard monitoring, and fare collection are currently engineering and data-collection functions supported mainly by pilot experience."],
      "Infrastructure": ["Tier 2 · Advanced", "UAV, smartphone, mobile-LiDAR, and imaging surveys identify physical upgrades; HD maps, roadside sensing, and digital twins form the shared digital road layer."],
      "Physical Road Assessment": ["Infrastructure submodule", "Vehicle- and UAV-based sensing detects pavement damage, lane markings, signs, geometry, and gravel-road condition. RAV must validate the survey methods locally and combine their results into physical-upgrade priorities."],
      "Digital Infrastructure": ["Infrastructure submodule", "HD maps provide the spatial base, roadside sensing supplies changing road and environmental observations, and digital twins combine both layers. RAV needs lower-cost updates that tolerate incomplete maps, sparse sensing, and intermittent connectivity."],
      "Communication": ["Tier 2 · Advanced", "RAV combines direct and network-based V2X with cellular and LEO satellite links, switches by coverage and latency, and maintains safe onboard operation during disconnections."],
      "Rural V2X Communication": ["Communication submodule", "V2V, V2I, and V2N exchange over C-V2X and 5G NR-V2X extends awareness beyond onboard sensing. Rural deployment must tolerate dead zones, long disconnections, sparse roadside units, and variable quality of service."],
      "Multi-Channel Communication": ["Communication submodule", "C-V2X, public cellular, and LEO satellite links improve reach and resilience when one network fails. RAV must decide when to switch links, what each should carry, and which safety-critical functions must remain onboard."],
      "Cooperative Driving": ["Tier 2 · Advanced", "Shared perception and coordinated control extend rural AVs to arterials, work and school zones, rail crossings, and extreme weather, with safety-critical computing retained onboard."],
      "Cooperative Perception": ["Cooperative Driving submodule", "Vehicles and roadside infrastructure share sensor data, features, or detected objects to extend field of view and reduce blind spots. RAV must tolerate sparse sensors, delayed messages, and incomplete shared information."],
      "Rural-Arterial Control": ["Cooperative Driving submodule", "CACC, platooning, and edge roadside-unit support coordinate speed and traffic interaction on arterials. RAV must adapt these methods to low-volume mixed traffic, intermittent links, selective RSU placement, and onboard safety-critical control."],
      "Work & School Zones and Handover": ["Cooperative Driving submodule", "Connected warnings and trajectory guidance address temporary work-zone changes and child-focused, reduced-speed school zones; infrastructure-assisted handover supports vehicles at automation limits. Rural sites need low-infrastructure warnings and carefully scoped support."],
      "Rail Grade Crossings": ["Cooperative Driving submodule", "V2I warnings communicate train approach, crossing state, and violation risk. RAV must extend the approach beyond instrumented crossings to passive, unconnected rural sites."],
      "Cooperative Response to Extreme Weather": ["Cooperative Driving submodule", "Road-weather observations and cooperative perception provide earlier hazard warnings and support speed adjustment or rerouting. RAV must work with sparse weather sensors and preserve safe onboard operation when infrastructure information disappears."],
      "Pilots": ["Field validation", "Five source records cover four named programs: goMARTI in Grand Rapids, ADASTEC at Sleeping Bear Dunes, TEDDY at Yellowstone, and CASSI at Wright Brothers and four other N.C. project sites. Together they provide on-demand and fixed-route operating evidence with safety operators on board. Click to see their references."]
    };
    var FLOW = {
      "Perception": { path: "Single-sensor limits → multi-sensor fusion → adverse-weather validation", theme: "Perception - single-sensor limitations", related: ["Perception", "Data Integration"] },
      "Localization": { path: "GNSS / LiDAR limits → multi-source localization → locally maintained map prior", theme: "Localization - GNSS/LiDAR limits", related: ["Localization", "Digital Infrastructure"] },
      "Data Integration": { path: "Raw streams → onboard reconciliation → optional fleet and roadside context", theme: "Data integration - onboard raw & semantic", related: ["Data Integration", "Digital Infrastructure"] },
      "Route Planning": { path: "Terrain and energy constraints → feasible route → calibrated rural service", theme: "Routing - energy & terrain aware", related: ["Route Planning"] },
      "Dispatch & Matching": { path: "Rider request → vehicle matching → dynamic dispatch → fleet oversight", theme: "On-demand dispatch & ride-matching", related: ["Dispatch & Matching", "Fleet Support", "Remote Supervision"] },
      "Remote Supervision": { path: "Vehicle alert → remote assessment → bounded intervention → safe fallback", theme: "Remote monitoring & supervision", related: ["Remote Supervision", "Fleet Support"] },
      "Fixed-Route Scheduling": { path: "Thin demand → headway and energy plan → service recovery", theme: "Fixed-route dispatch & scheduling", related: ["Fixed-Route Scheduling", "Fleet Support"] },
      "Fleet Support": { path: "Vehicle health → charging and maintenance → service readiness", theme: "Fleet support - charging, monitoring & fares", related: ["Fleet Support"] },
      "Physical Road Assessment": { path: "Corridor survey → segment condition → targeted physical upgrade", theme: "Physical road assessment", related: ["Physical Road Assessment", "Digital Infrastructure"] },
      "Digital Infrastructure": { path: "Map and roadside observations → digital road layer → selective vehicle support", theme: "Digital Infrastructure", related: ["Digital Infrastructure"] },
      "Rural V2X Communication": { path: "Measured corridor coverage → direct / network exchange → onboard fallback", theme: "Rural V2X Communication", related: ["Rural V2X Communication", "Multi-Channel Communication"] },
      "Multi-Channel Communication": { path: "Link degradation → channel switch → delayed noncritical synchronization", theme: "Multi-Channel Communication", related: ["Multi-Channel Communication"] },
      "Cooperative Perception": { path: "Onboard blind spot → shared observation → confidence check → safe fallback", theme: "Cooperative perception", related: ["Cooperative Perception", "Rural-Arterial Control"] },
      "Rural-Arterial Control": { path: "Shared awareness → selective roadside assistance → coordinated motion", theme: "Infrastructure-assisted control & handover", related: ["Rural-Arterial Control"] },
      "Work & School Zones and Handover": { path: "Temporary conflict → connected warning → low-speed response → fallback", theme: "Work & school zones", related: ["Work & School Zones and Handover"] },
      "Rail Grade Crossings": { path: "Crossing state → early warning → onboard stop decision", theme: "Rail grade crossings", related: ["Rail Grade Crossings"] },
      "Cooperative Response to Extreme Weather": { path: "Weather observation → cooperative warning → speed adjustment or rerouting", theme: "Cooperative Response to Extreme Weather", related: ["Cooperative Response to Extreme Weather"] }
    };
    var DEFAULT = ["Two tiers, one system", "Existing technology carries the service today; advanced, infrastructure-integrated technology extends it; four named field-pilot programs ground it in practice. Hover a module."];
    var tagEl = detail.querySelector(".td-tag");
    var txtEl = detail.querySelector(".td-text");
    function show(stage, substage) {
      var key = substage || stage;
      var d = INFO[key] || DEFAULT;
      tagEl.textContent = d[0] + " · " + key;
      txtEl.textContent = d[1];
      var flow = FLOW[substage] || null;
      selectedFlow = { cat: stage, subcat: substage || null, refs: [], theme: flow ? flow.theme : null };
      if (substage) {
        subpillars.forEach(function (node) {
          if (node.getAttribute("data-subcat") === substage) {
            selectedFlow.refs = node.getAttribute("data-refs").split(",").map(Number);
          }
        });
      }
      if (flowPath) { flowPath.textContent = flow ? flow.path : stage + " → supporting evidence → rural validation"; }
      if (openEvidence) { openEvidence.disabled = !selectedFlow.theme; }
      pillars.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-cat") === stage); });
      subpillars.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-subcat") === substage); });
      if (flowMode) {
        var related = flow ? flow.related : [];
        pillars.forEach(function (p) {
          p.classList.toggle("flow-dim", p.getAttribute("data-cat") !== stage);
          p.classList.toggle("flow-active", p.getAttribute("data-cat") === stage);
        });
        subpillars.forEach(function (p) {
          var active = related.indexOf(p.getAttribute("data-subcat")) !== -1;
          p.classList.toggle("flow-active", active);
          p.classList.toggle("flow-dim", related.length > 0 && !active);
        });
      }
    }
    function clear() {
      tagEl.textContent = DEFAULT[0];
      txtEl.textContent = DEFAULT[1];
      pillars.forEach(function (p) { p.classList.remove("active"); });
      subpillars.forEach(function (p) { p.classList.remove("active"); });
      pillars.forEach(function (p) { p.classList.remove("flow-dim", "flow-active"); });
      subpillars.forEach(function (p) { p.classList.remove("flow-dim", "flow-active"); });
      if (flowPath) { flowPath.textContent = "Select a submodule to reveal its evidence-to-action path."; }
      selectedFlow = { cat: null, subcat: null, refs: [], theme: null };
      flowLocked = false;
      if (openEvidence) { openEvidence.disabled = true; }
    }
    pillars.forEach(function (p) {
      var s = p.getAttribute("data-cat");
      p.addEventListener("mouseenter", function () { show(s); });
      p.addEventListener("focus", function () { show(s); });
      p.addEventListener("click", function () {
        show(s);
        flowLocked = true;
        if (!flowMode) {
          setCatFilter(s);
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        }
      });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show(s);
          flowLocked = true;
          if (!flowMode) {
            setCatFilter(s);
            document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });
    subpillars.forEach(function (p) {
      var cat = p.getAttribute("data-cat");
      var subcat = p.getAttribute("data-subcat");
      var refs = p.getAttribute("data-refs").split(",").map(function (n) { return Number(n); });
      p.addEventListener("mouseenter", function () { show(cat, subcat); });
      p.addEventListener("focus", function () { show(cat, subcat); });
      p.addEventListener("click", function () {
        show(cat, subcat);
        selectedFlow.refs = refs;
        flowLocked = true;
        if (!flowMode) {
          setSubthemeFilter(cat, subcat, refs);
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        }
      });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show(cat, subcat);
          selectedFlow.refs = refs;
          flowLocked = true;
          if (!flowMode) {
            setSubthemeFilter(cat, subcat, refs);
            document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });
    if (flowToggle) {
      flowToggle.addEventListener("click", function () {
        flowMode = !flowMode;
        if (card) { card.classList.toggle("flow-mode", flowMode); }
        flowToggle.setAttribute("aria-pressed", flowMode ? "true" : "false");
        flowToggle.textContent = flowMode ? "Flow mode on" : "Flow mode off";
        if (!flowMode) { clear(); }
      });
    }
    if (openEvidence) {
      openEvidence.disabled = true;
      openEvidence.addEventListener("click", function () {
        if (selectedFlow.theme && window.openEvidenceTheme) { window.openEvidenceTheme(selectedFlow.theme, true); }
      });
    }
    if (openReferences) {
      openReferences.addEventListener("click", function () {
        if (!selectedFlow.cat) { return; }
        if (selectedFlow.subcat && selectedFlow.refs.length) {
          setSubthemeFilter(selectedFlow.cat, selectedFlow.subcat, selectedFlow.refs);
        } else {
          setCatFilter(selectedFlow.cat);
        }
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
    }
    if (card) {
      card.addEventListener("mouseleave", function () {
        if (!flowMode || !flowLocked) { clear(); }
      });
    }
  })();

  /* ---------- evidence map ---------- */

  (function () {
    var emap = document.getElementById("emap");
    var edetail = document.getElementById("emap-detail");
    if (!emap || !edetail) { return; }
    var pinnedThemes = [];
    var selectedCount = document.getElementById("evidence-selected-count");
    var overlapSummary = document.getElementById("evidence-overlap-summary");
    var compareSelected = document.getElementById("evidence-compare-selected");
    var clearSelected = document.getElementById("evidence-clear-selected");
    var THEMES = [
      {
        cat: "Autonomous Driving", title: "Perception - single-sensor limitations", status: "r", refs: [1,18,20,64],
        progression: [
          { label: "Limitation motivates", target: "Perception - multi-sensor fusion" }
        ],
        definition: ["Uses one sensor modality, typically a monocular camera.", "Detects lanes, obstacles, pedestrians, animals, and signs."],
        pros: ["Low sensor and compute cost.", "Simple calibration and lightweight processing."],
        cons: ["Limited range and field of view.", "Sensitive to glare, low light, occlusion, faded markings, and unpaved surfaces."],
        rav: ["Use single-sensor coverage only as a low-cost baseline.", "Let its failure modes define the multi-sensor fusion and fallback requirements.", "Collect rural perception data and validate the combined stack on local roads."]
      },
      {
        cat: "Autonomous Driving", title: "Perception - multi-sensor fusion", status: "m", refs: [2,17,18,19,20,56,57,58,59,63,64],
        progression: [
          { label: "Must be validated under", target: "Perception - adverse weather" }
        ],
        definition: ["Combines camera, radar, LiDAR, and IMU data.", "Produces one aligned detection set for ego motion and scene understanding."],
        pros: ["Improves range, weather robustness, 3-D geometry, and redundancy.", "Outperforms a single sensor in complex scenes."],
        cons: ["Raises sensor and compute cost.", "Requires careful calibration, timing, and synchronization."],
        rav: ["Use camera plus radar as the minimum stack.", "Add LiDAR where 3-D geometry improves safety.", "Retrain and validate models on sparse rural geometry."]
      },
      {
        cat: "Autonomous Driving", title: "Perception - adverse weather", status: "m", refs: [3,21,22,58,61],
        definition: ["Uses condition-specific methods and datasets.", "Targets glare, rain, fog, snow, dust, and other visibility loss."],
        pros: ["Condition-specific training can recover accuracy.", "Dedicated datasets support consistent benchmarking."],
        cons: ["Performance still degrades when several modalities are affected together.", "Training may not generalize to combined rain, fog, snow, or glare."],
        rav: ["Build a local adverse-weather dataset.", "Set fallback thresholds for the service area.", "Keep safe onboard behavior when cooperative information is unavailable."]
      },
      {
        cat: "Autonomous Driving", title: "Localization - GNSS/LiDAR limits", status: "r", refs: [1,2,61,62],
        progression: [
          { label: "Limitation motivates", target: "Localization - fusion with HD maps" }
        ],
        definition: ["GNSS/INS provides a global satellite position.", "LiDAR matches live scans against known road geometry."],
        pros: ["GNSS is affordable and globally referenced.", "LiDAR can remain precise without satellite signals."],
        cons: ["GNSS drifts under canopy and in valleys.", "Sparse or repetitive rural geometry makes LiDAR-only matching ambiguous."],
        rav: ["Fuse GNSS/INS and LiDAR; do not depend on either source alone.", "Test positioning under canopy, in valleys, with weak features, and through map-match interruptions."]
      },
      {
        cat: "Autonomous Driving", title: "Localization - fusion with HD maps", status: "m", refs: [2,23,24,25,60],
        definition: ["Matches vision and LiDAR against an HD-map prior.", "Fuses the result with GNSS/INS into one pose estimate."],
        pros: ["Supports lane-level to centimeter positioning.", "Improves continuity in GNSS-challenged settings."],
        cons: ["Requires an HD map to be surveyed and verified.", "Maps must be continuously refreshed as roads change."],
        rav: ["Map the RAV service corridors.", "Create a rural HD-map maintenance workflow tied to road and infrastructure updates."]
      },
      {
        cat: "Autonomous Driving", title: "Data integration - onboard raw & semantic", status: "g", refs: [17,18,19,57,63],
        progression: [
          { label: "Extends toward", target: "Data integration - heterogeneous & aggregated" }
        ],
        definition: ["Fuses raw camera, radar, and LiDAR streams onboard.", "Produces detections, pose, trajectory, and control state."],
        pros: ["Preserves rich sensor detail with low latency.", "Operates independently of network coverage."],
        cons: ["Carries the highest onboard bandwidth and compute load.", "Output quality remains bounded by sensor quality."],
        rav: ["Use onboard raw-to-semantic fusion as the core perception and localization pipeline.", "Keep the pipeline operational when rural connectivity is unavailable."]
      },
      {
        cat: "Autonomous Driving", title: "Data integration - heterogeneous & aggregated", status: "r", refs: [2,19,25,56,59],
        definition: ["Reconciles inputs with different reliability, coordinate frames, and update rates.", "Adds traffic, event, map, weather, and fleet feeds."],
        pros: ["Adds traffic, event, map, weather, and fleet context.", "Reveals conditions that one vehicle cannot sense alone."],
        cons: ["Edge and cloud feeds introduce latency.", "Coverage-dependent inputs may be unavailable on rural roads."],
        rav: ["Keep onboard reconciliation authoritative.", "Use roadside, fleet, and cloud feeds as optional additions.", "Add confidence checks and graceful degradation for delayed or missing inputs."]
      },
      {
        cat: "Autonomous Driving", title: "Routing - energy & terrain aware", status: "m", refs: [1,4,26,27,65,66,67],
        definition: ["Adds grade, surface, vehicle dynamics, and effective battery range to route cost.", "Rejects routes that are not physically feasible."],
        pros: ["Protects usable range on hilly and unpaved roads.", "Keeps routes feasible under terrain and battery constraints."],
        cons: ["Depends on calibrated terrain, surface, and consumption models.", "Suitable rural-network models and data are rarely available."],
        rav: ["Apply energy- and terrain-aware cost to every service mode.", "Calibrate it with local grade, surface, weather, load, and energy data."]
      },
      {
        cat: "Autonomous Driving", title: "Routing - on-demand vs fixed route", status: "m", refs: [5,16,30,31,69,78],
        definition: ["On-demand routing sequences live rider requests.", "Fixed-route service repeats a preset line and timetable."],
        pros: ["On-demand service reaches scattered riders.", "Fixed routes are predictable and simple to operate."],
        cons: ["On-demand service needs live requests and dispatch computing.", "Fixed routes can waste capacity and miss off-route riders."],
        rav: ["Use on-demand routing for healthcare service.", "Use fixed routes for regular transit and park service.", "Apply range and terrain constraints to both modes."]
      },
      {
        cat: "Fleet Management", title: "On-demand dispatch & ride-matching", status: "g", refs: [5,28,29,30,31,68,70,71,73,75],
        progression: [
          { label: "Requires an operations layer", target: "Fleet support - charging, monitoring & fares" },
          { label: "Requires an oversight layer", target: "Remote monitoring & supervision" }
        ],
        definition: ["Uses incoming rider requests and live fleet status.", "Assigns, matches, sequences, and rebalances vehicles in real time."],
        pros: ["Reduces rider waiting and empty vehicle travel.", "Supports vehicle assignment under low-density demand."],
        cons: ["Requires live requests and a reliable matching engine.", "Needs enough vehicles to maintain acceptable wait times."],
        rav: ["Reuse dispatch and rider-app matching methods.", "Tune service zones, wait-time targets, and fleet size using local demand."]
      },
      {
        cat: "Fleet Management", title: "Fixed-route dispatch & scheduling", status: "r", refs: [16,69,77,78],
        progression: [
          { label: "Requires an operations layer", target: "Fleet support - charging, monitoring & fares" },
          { label: "Requires an oversight layer", target: "Remote monitoring & supervision" }
        ],
        definition: ["Vehicles repeat a preset route.", "Headway and timetable planning set departure times and vehicle spacing."],
        pros: ["Predictable for riders.", "Operationally simple on a repeated route."],
        cons: ["Thin demand can create long waits and poor utilization.", "Fixed schedules adapt poorly to day-to-day demand variation."],
        rav: ["Develop headway, timetable, and fleet-allocation rules for thin-demand routes.", "Test rider wait time and vehicle utilization in rural service."]
      },
      {
        cat: "Fleet Management", title: "Fleet support - charging, monitoring & fares", status: "r", refs: [14,15,16,72,74,75,76,77],
        definition: ["Coordinates charging, health monitoring, maintenance, and fare collection.", "Keeps vehicles service-ready."],
        pros: ["Centralizes vehicle readiness and service continuity.", "Coordinated charging and monitoring can reduce downtime."],
        cons: ["Charging can remove vehicles from service during peak demand.", "Maintenance and fare systems add cost and staffing needs."],
        rav: ["Collect charging, maintenance, monitoring, and payment data during early deployment.", "Use the results to define charging plans, maintenance triggers, and rider payment policy."]
      },
      {
        cat: "Fleet Management", title: "Remote monitoring & supervision", status: "r", refs: [14,15,16,79],
        definition: ["An operations center tracks vehicle location, health, and service state.", "A human supervisor assists when automation requests help."],
        pros: ["One supervisor may support multiple vehicles.", "Enables scale without placing a driver in every seat."],
        cons: ["Depends on reliable telemetry and video links.", "Supervisor ratios and takeover procedures remain unsettled."],
        rav: ["Define supervisor-to-vehicle ratios and intervention authority.", "Test takeover and degraded-link rules under weak rural connectivity."]
      },
      {
        cat: "Infrastructure", title: "Physical road assessment", status: "m", refs: [39,46,47,48,49,80,81,82,83,84,85,86,87,88],
        progression: [
          { label: "Survey data enables", target: "Digital Infrastructure" }
        ],
        definition: ["Uses UAV, smartphone, imaging, and mobile-LiDAR surveys.", "Detects pavement damage, markings, signs, geometry, and gravel-road condition."],
        pros: ["Reusable survey methods can lower network-inspection cost.", "UAV, smartphone, imaging, and mobile LiDAR cover complementary road features."],
        cons: ["Separate survey tools can produce fragmented road-condition data.", "Integration and prioritization add workflow and data-management complexity."],
        rav: ["Validate survey tools under local road, weather, and maintenance conditions.", "Combine results into segment-level physical-upgrade priorities."]
      },
      {
        cat: "Infrastructure", title: "Digital Infrastructure", status: "m", refs: [7,25,37,38,80,87,89,90,91,118],
        definition: ["HD maps provide the spatial base.", "Roadside sensing updates conditions, while a digital twin combines the layers."],
        pros: ["Combines static maps with changing roadside observations.", "Supports shared vehicle and infrastructure decisions."],
        cons: ["Requires instrumented corridors and ongoing data maintenance.", "Implementation cost rises with sensor density and update frequency."],
        rav: ["Adapt the layered architecture to incomplete maps, sparse sensors, and intermittent communication.", "Use low-cost methods for rural updates."]
      },
      {
        cat: "Communication", title: "Rural V2X Communication", status: "r", refs: [9,50,51,52,92,93,95,96,97,98,103],
        progression: [
          { label: "Coverage limits motivate", target: "Multi-Channel Communication" }
        ],
        definition: ["V2V, V2I, and V2N links exchange hazard, traffic, road-condition, and coordination data.", "Uses C-V2X and 5G NR-V2X."],
        pros: ["Enables direct and network-based exchange of hazards and road conditions.", "Supports coordination beyond onboard sensing range."],
        cons: ["Rural measurements show weaker coverage and longer disconnections.", "Interference, mobility, energy, and resource allocation affect quality of service."],
        rav: ["Assume intermittent connectivity from the start.", "Combine direct and network-based links and monitor link quality.", "Preserve safe vehicle operation throughout disconnections."]
      },
      {
        cat: "Communication", title: "Multi-Channel Communication", status: "m", refs: [8,92,93,94,103],
        definition: ["Combines C-V2X, public cellular, and LEO satellite interfaces.", "Uses an alternate path when one network is unavailable."],
        pros: ["Improves communication reach and resilience.", "Provides an alternate path when one network is unavailable."],
        cons: ["Adds hardware cost, switching complexity, and energy use.", "Satellite links may introduce additional latency."],
        rav: ["Measure coverage and latency along service corridors.", "Switch channels by policy.", "Keep time-critical control onboard and use wide-area links for supplementary information."]
      },
      {
        cat: "Cooperative Driving", title: "Cooperative perception", status: "m", refs: [10,35,104,105,106,108,109],
        progression: [
          { label: "Shared awareness enables", target: "Infrastructure-assisted control & handover" }
        ],
        definition: ["Vehicles and roadside infrastructure share sensor data or detected objects.", "Extends field of view and reduces blind spots."],
        pros: ["Extends awareness through occlusion and adverse weather.", "Reduces blind spots by sharing vehicle and roadside observations."],
        cons: ["Requires reliable links and accurate spatial-temporal alignment.", "Roadside equipment and delayed or incorrect data create additional risks."],
        rav: ["Deploy roadside sensing only at high-value conflict points.", "Preserve a safe onboard fallback when shared data is unavailable."]
      },
      {
        cat: "Cooperative Driving", title: "Infrastructure-assisted control & handover", status: "m", refs: [34,36,107,108,114,115],
        progression: [
          { label: "Applied to coordinated motion", target: "CACC & platooning" },
          { label: "Applied at conflict points", target: "Work & school zones" },
          { label: "Applied at conflict points", target: "Rail grade crossings" },
          { label: "Applied during disruptions", target: "Cooperative Response to Extreme Weather" }
        ],
        definition: ["Edge roadside units support cooperative driving services.", "Assists vehicles when automation reaches an operational limit."],
        pros: ["Can reduce response latency.", "Can assist vehicles at known high-risk locations."],
        cons: ["Assumes dense and reliable roadside coverage.", "Rural networks may not justify or maintain that infrastructure density."],
        rav: ["Place edge support at high-risk locations.", "Define handover authority and timing.", "Test operation when the roadside unit or link fails."]
      },
      {
        cat: "Cooperative Driving", title: "CACC & platooning", status: "m", refs: [40,41,110,111,112],
        definition: ["Coordinates vehicle speed, spacing, and signal interaction.", "Uses shared motion information for CACC and platooning."],
        pros: ["Can improve traffic efficiency and coordinated motion.", "Platooning can improve spacing control and energy use."],
        cons: ["Performance can degrade with mixed traffic and unstable links.", "Requires compatible vehicles and consistent message timing."],
        rav: ["Adapt CACC and platooning to low-volume rural arterials.", "Test mixed traffic, variable connectivity, and long gaps between equipped intersections."]
      },
      {
        cat: "Cooperative Driving", title: "Work & school zones", status: "r", refs: [11,113,115],
        definition: ["Connected warnings flag work-zone and school-zone conflicts.", "Trajectory coordination guides vehicle approach."],
        pros: ["Warns vehicles about temporary conflicts earlier.", "Coordinates approach speed and trajectory."],
        cons: ["Depends on connected signs, devices, or messages.", "Passive and unsignalized rural zones may remain undetected."],
        rav: ["Develop low-infrastructure warnings and operating rules.", "Field-test detection, yielding, and fallback behavior."]
      },
      {
        cat: "Cooperative Driving", title: "Rail grade crossings", status: "m", refs: [42, 43],
        definition: ["V2I warnings communicate train approach, crossing state, and violation risk.", "Sends the hazard state directly to approaching vehicles."],
        pros: ["Provides early warning of train approach and crossing violations.", "Instrumented crossings can transmit hazard state directly."],
        cons: ["Many rural crossings are passive.", "Communications equipment is absent at numerous rural sites."],
        rav: ["Extend warning logic to passive rural crossings.", "Specify safe onboard behavior when no infrastructure message is available."]
      },
      {
        cat: "Cooperative Driving", title: "Cooperative Response to Extreme Weather", status: "r", refs: [12, 13, 21],
        definition: ["Combines road-weather data with cooperative perception.", "Supports hazard sensing, lane closure, speed adjustment, and rerouting."],
        pros: ["Supplements degraded onboard sensing.", "Supports hazard warnings, speed adjustment, and rerouting."],
        cons: ["Depends on roadside sensors and reliable connectivity.", "Sparse rural weather data can delay or weaken warnings."],
        rav: ["Collect local weather data and define risk thresholds.", "Test cooperative warning and rerouting.", "Maintain safe operation during infrastructure outages."]
      },
      {
        cat: "Pilots", title: "goMARTI - on-demand", status: "g", refs: [14, 15],
        definition: ["Door-to-door rural shuttle with roughly 97 boarding and drop-off locations.", "Accepts requests through an app or 211; uses a safety operator onboard."],
        pros: ["Offers accessible on-demand trips across a rural community.", "App and 211 booking support riders with different access needs."],
        cons: ["Operation remains low-speed and geofenced.", "An onboard safety operator is still required."],
        rav: ["Use the on-demand model as a service baseline.", "Progress through safety gates toward longer range, higher speeds, and reduced operator reliance."]
      },
      {
        cat: "Pilots", title: "ADASTEC, TEDDY & CASSI - fixed route", status: "g", refs: [16,116,117],
        definition: ["Scheduled fixed-route shuttles served Sleeping Bear Dunes, Yellowstone, and Wright Brothers.", "Additional deployments operated at other North Carolina sites.", "Uses safety operators onboard."],
        pros: ["Fixed routes are predictable for riders and operators.", "Geofenced service simplifies route control in remote public sites."],
        cons: ["Low speed, geofencing, and weather or battery interruptions constrain service.", "Onboard supervision remains a recurring requirement."],
        rav: ["Reuse the fixed-route operating concept.", "Add rural headway, timetable, energy, and interruption planning.", "Reduce operator dependence through explicit safety gates."]
      }
    ];
    window.RAV_THEMES = THEMES;
    var STATUS = {
      g: ["Reusable baseline", "#4B8B3B"],
      m: ["Recommended direction — rural validation needed", "#D99114"],
      r: ["Limitation / unresolved RAV problem", "#BA0C2F"]
    };
    var STATUS_SHORT = { g: "Baseline", m: "Direction", r: "Limitation" };
    var byNum = {};
    PAPERS.forEach(function (p) { byNum[p.n] = p; });
    var themeCount = document.getElementById("theme-count");
    if (themeCount) { themeCount.textContent = THEMES.length + " sub-themes · 118 references"; }
    var initialTheme = null;
    CATEGORIES.forEach(function (c, categoryIndex) {
      var row = el("div", "mrow");
      if (categoryIndex === 0) { row.classList.add("is-open"); }
      var lab = el("div", "mlab");
      var toggle = el("button", "mlab-toggle");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", categoryIndex === 0 ? "true" : "false");
      var cellsId = "evidence-cells-" + categoryIndex;
      toggle.setAttribute("aria-controls", cellsId);
      var sw = el("span", "sw");
      sw.style.background = CAT_COLORS[c];
      toggle.appendChild(sw);
      toggle.appendChild(document.createTextNode(c));
      lab.appendChild(toggle);
      var cells = el("div", "mcells");
      cells.id = cellsId;
      toggle.addEventListener("click", function () {
        if (!window.matchMedia("(max-width: 720px)").matches) { return; }
        var opening = !row.classList.contains("is-open");
        row.classList.toggle("is-open", opening);
        toggle.setAttribute("aria-expanded", opening ? "true" : "false");
      });
      THEMES.forEach(function (t) {
        if (t.cat !== c) { return; }
        var pill = el("button", "epill " + t.status);
        pill.type = "button";
        pill.appendChild(document.createTextNode(t.title));
        pill.appendChild(el("span", "status-mini", STATUS_SHORT[t.status]));
        pill.appendChild(el("span", "e-count", String(t.refs.length)));
        pill.setAttribute("aria-pressed", "false");
        pill.setAttribute("data-theme-title", t.title);
        pill.setAttribute("aria-label", t.title + ": " + STATUS[t.status][0] + "; " +
          t.refs.length + " supporting references");
        pill.title = t.refs.length + " supporting references. Show definition, pros, cons, rural gap, and RAV action.";
        pill.addEventListener("mouseenter", function () { showDetail(t, pill); });
        pill.addEventListener("focus", function () { showDetail(t, pill); });
        pill.addEventListener("click", function (event) {
          showDetail(t, pill);
          if (event.shiftKey || event.ctrlKey || event.metaKey) { togglePinnedTheme(t, pill); }
        });
        cells.appendChild(pill);
        if (!initialTheme) { initialTheme = { theme: t, pill: pill }; }
      });
      row.appendChild(lab);
      row.appendChild(cells);
      emap.appendChild(row);
    });
    function showDetail(t, pill) {
      var st = STATUS[t.status];
      var pills = emap.querySelectorAll(".epill.on");
      for (var i = 0; i < pills.length; i++) {
        pills[i].classList.remove("on");
        pills[i].setAttribute("aria-pressed", "false");
      }
      pill.classList.add("on");
      pill.setAttribute("aria-pressed", "true");
      while (edetail.firstChild) { edetail.removeChild(edetail.firstChild); }
      edetail.style.borderLeftColor = st[1];
      var heading = el("div", "ed-heading");
      var tag = el("span", "ed-tag", st[0]);
      tag.style.background = st[1];
      heading.appendChild(tag);
      heading.appendChild(el("strong", null, t.title + " | " + t.cat));
      edetail.appendChild(heading);
      var refsRow = el("div", "ed-row");
      refsRow.appendChild(document.createTextNode("References: "));
      t.refs.forEach(function (n) {
        var p = byNum[n];
        var a = el("a", "ed-ref", "[" + n + "]");
        a.href = p ? p._link : "#";
        a.target = "_blank";
        a.rel = "noopener";
        if (p) { a.title = p.title; }
        refsRow.appendChild(a);
        refsRow.appendChild(document.createTextNode(" "));
      });
      edetail.appendChild(refsRow);
      var strengthCounts = { High: 0, Moderate: 0, Emerging: 0 };
      var directRural = 0;
      t.refs.forEach(function (n) {
        var paper = byNum[n];
        if (!paper) { return; }
        if (strengthCounts[paper.strength] !== undefined) { strengthCounts[paper.strength]++; }
        if (paper.rural === "Direct rural evidence") { directRural++; }
      });
      var profile = el("div", "evidence-profile");
      profile.setAttribute("aria-label", "Evidence profile");
      profile.appendChild(el("span", null, t.refs.length + " references"));
      STRENGTH_LEVELS.forEach(function (level) {
        if (strengthCounts[level]) {
          profile.appendChild(el("span", null, strengthCounts[level] + " " + level.toLowerCase()));
        }
      });
      profile.appendChild(el("span", null, directRural + " directly rural"));
      edetail.appendChild(profile);
      var grid = el("div", "ed-grid");
      var definitionBlock = el("div", "ed-block ed-definition");
      definitionBlock.appendChild(el("span", "ed-label", "Definition"));
      var definitionList = el("ul", "detail-list definition-list");
      t.definition.forEach(function (item) {
        definitionList.appendChild(el("li", null, item));
      });
      definitionBlock.appendChild(definitionList);
      grid.appendChild(definitionBlock);
      var tradeoffBlock = el("div", "ed-block ed-findings");
      tradeoffBlock.appendChild(el("span", "ed-label", "Pros and Cons"));
      var tradeoffGrid = el("div", "tradeoff-grid");
      [
        ["Pros", "pros", t.pros],
        ["Cons", "cons", t.cons]
      ].forEach(function (group) {
        var groupEl = el("div", "tradeoff-group " + group[1]);
        groupEl.appendChild(el("span", "tradeoff-title", group[0]));
        var list = el("ul", "tradeoff-list");
        group[2].forEach(function (item) {
          list.appendChild(el("li", null, item));
        });
        groupEl.appendChild(list);
        tradeoffGrid.appendChild(groupEl);
      });
      tradeoffBlock.appendChild(tradeoffGrid);
      grid.appendChild(tradeoffBlock);
      var ravBlock = el("div", "ed-block ed-rav");
      ravBlock.appendChild(el("span", "ed-label", "Rural gap and RAV action"));
      var ravList = el("ul", "detail-list action-list");
      t.rav.forEach(function (item) {
        ravList.appendChild(el("li", null, item));
      });
      ravBlock.appendChild(ravList);
      grid.appendChild(ravBlock);
      edetail.appendChild(grid);
      if (t.progression && t.progression.length) {
        var bridgeGroup = el("div", "evidence-bridges" + (t.progression.length === 1 ? " single" : ""));
        bridgeGroup.appendChild(el("span", "evidence-bridges-label", "Evidence progression"));
        t.progression.forEach(function (link) {
          var nextTheme = THEMES.find(function (candidate) { return candidate.title === link.target; });
          var nextPill = emap.querySelector('[data-theme-title="' + link.target + '"]');
          if (!nextTheme || !nextPill) { return; }
          var bridge = el("button", "evidence-bridge");
          bridge.type = "button";
          bridge.appendChild(el("span", null, link.label));
          bridge.appendChild(el("strong", null, link.target));
          bridge.appendChild(el("b", null, "→"));
          bridge.setAttribute("aria-label", link.label + ": open " + link.target);
          bridge.addEventListener("click", function () {
            showDetail(nextTheme, nextPill);
            nextPill.scrollIntoView({ behavior: "smooth", block: "center" });
          });
          bridgeGroup.appendChild(bridge);
        });
        if (bridgeGroup.children.length > 1) {
          edetail.appendChild(bridgeGroup);
        }
      }
      var compareButton = el("button", "ed-compare", "Add to Compare Board");
      compareButton.type = "button";
      compareButton.addEventListener("click", function () {
        if (window.addThemeToCompare) { window.addThemeToCompare(t.title, true); }
      });
      edetail.appendChild(compareButton);
      var pinButton = el("button", "ed-compare", pinnedThemes.indexOf(t.title) === -1 ? "Pin for multi-select" : "Unpin theme");
      pinButton.type = "button";
      pinButton.addEventListener("click", function () {
        togglePinnedTheme(t, pill);
        pinButton.textContent = pinnedThemes.indexOf(t.title) === -1 ? "Pin for multi-select" : "Unpin theme";
      });
      edetail.appendChild(pinButton);
      var explore = el("button", "ed-explore", "Explore " + t.refs.length + " supporting reference" + (t.refs.length === 1 ? "" : "s") + " in the literature explorer");
      explore.type = "button";
      explore.addEventListener("click", function () {
        setEvidenceFilter(t.title, t.refs);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      edetail.appendChild(explore);
    }
    function updatePinnedThemes() {
      var selected = THEMES.filter(function (theme) { return pinnedThemes.indexOf(theme.title) !== -1; });
      emap.querySelectorAll(".epill").forEach(function (pill) {
        pill.classList.toggle("is-pinned", pinnedThemes.indexOf(pill.getAttribute("data-theme-title")) !== -1);
      });
      if (selectedCount) { selectedCount.textContent = String(selected.length); }
      if (compareSelected) { compareSelected.disabled = selected.length < 2; }
      if (clearSelected) { clearSelected.disabled = selected.length === 0; }
      if (!overlapSummary) { return; }
      if (!selected.length) {
        overlapSummary.textContent = "Shift-click themes, or use Pin in the detail card, to compare evidence overlap.";
        return;
      }
      var union = [];
      selected.forEach(function (theme) {
        theme.refs.forEach(function (ref) { if (union.indexOf(ref) === -1) { union.push(ref); } });
      });
      var intersection = selected[0].refs.filter(function (ref) {
        return selected.every(function (theme) { return theme.refs.indexOf(ref) !== -1; });
      });
      overlapSummary.textContent = union.length + " unique references · " + intersection.length +
        " shared across every pinned theme";
    }
    function togglePinnedTheme(theme, pill) {
      var index = pinnedThemes.indexOf(theme.title);
      if (index === -1) { pinnedThemes.push(theme.title); } else { pinnedThemes.splice(index, 1); }
      if (pill) { pill.classList.toggle("is-pinned", index === -1); }
      updatePinnedThemes();
    }
    if (compareSelected) {
      compareSelected.addEventListener("click", function () {
        pinnedThemes.slice(0, 4).forEach(function (title, index, values) {
          if (window.addThemeToCompare) { window.addThemeToCompare(title, index === values.length - 1); }
        });
      });
    }
    if (clearSelected) {
      clearSelected.addEventListener("click", function () {
        pinnedThemes = [];
        updatePinnedThemes();
      });
    }
    window.openEvidenceTheme = function (title, shouldScroll) {
      var theme = THEMES.find(function (candidate) { return candidate.title === title; });
      var pill = emap.querySelector('[data-theme-title="' + title + '"]');
      if (!theme || !pill) { return; }
      var row = pill.closest(".mrow");
      if (row && window.matchMedia("(max-width: 720px)").matches) {
        row.classList.add("is-open");
        var rowToggle = row.querySelector(".mlab-toggle");
        if (rowToggle) { rowToggle.setAttribute("aria-expanded", "true"); }
      }
      showDetail(theme, pill);
      if (shouldScroll !== false) {
        document.getElementById("evidence").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    updatePinnedThemes();
    if (initialTheme) { showDetail(initialTheme.theme, initialTheme.pill); }
  })();

  /* ---------- evidence journey and decision lab ---------- */

  (function () {
    var root = document.getElementById("decision-lab");
    var graph = document.getElementById("journey-graph");
    var themes = window.RAV_THEMES || [];
    if (!root || !graph || !themes.length) { return; }

    var statusMeta = {
      g: { label: "Reusable baseline", short: "Baseline", color: "#4B8B3B" },
      m: { label: "Recommended direction", short: "Direction", color: "#D99114" },
      r: { label: "Limitation / unresolved problem", short: "Limitation", color: "#BA0C2F" }
    };
    var paperByNumber = {};
    PAPERS.forEach(function (paper) { paperByNumber[paper.n] = paper; });
    var themeByTitle = {};
    themes.forEach(function (theme) { themeByTitle[theme.title] = theme; });

    function activateLabTab(name, focusTab) {
      root.querySelectorAll("[data-lab-tab]").forEach(function (button) {
        var active = button.getAttribute("data-lab-tab") === name;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
        if (active && focusTab) { button.focus(); }
      });
      ["journey", "compare", "intelligence"].forEach(function (panelName) {
        var panel = document.getElementById("lab-" + panelName);
        if (panel) { panel.hidden = panelName !== name; }
      });
    }
    root.querySelectorAll("[data-lab-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        activateLabTab(button.getAttribute("data-lab-tab"), false);
      });
      button.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") { return; }
        event.preventDefault();
        var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-lab-tab]"));
        var direction = event.key === "ArrowRight" ? 1 : -1;
        var nextIndex = (tabs.indexOf(button) + direction + tabs.length) % tabs.length;
        activateLabTab(tabs[nextIndex].getAttribute("data-lab-tab"), true);
      });
    });

    var nodePositions = {
      "Perception - single-sensor limitations": [190, 70],
      "Perception - multi-sensor fusion": [520, 70],
      "Perception - adverse weather": [850, 70],
      "Localization - GNSS/LiDAR limits": [190, 160],
      "Localization - fusion with HD maps": [520, 160],
      "Data integration - onboard raw & semantic": [190, 250],
      "Data integration - heterogeneous & aggregated": [520, 250],
      "On-demand dispatch & ride-matching": [160, 355],
      "Fixed-route dispatch & scheduling": [410, 355],
      "Fleet support - charging, monitoring & fares": [735, 330],
      "Remote monitoring & supervision": [1010, 380],
      "Physical road assessment": [190, 455],
      "Digital Infrastructure": [520, 455],
      "Rural V2X Communication": [190, 550],
      "Multi-Channel Communication": [520, 550],
      "Cooperative perception": [160, 665],
      "Infrastructure-assisted control & handover": [445, 665],
      "CACC & platooning": [760, 610],
      "Work & school zones": [1015, 625],
      "Rail grade crossings": [760, 710],
      "Cooperative Response to Extreme Weather": [1015, 725]
    };
    var laneLabels = [
      ["PERCEPTION", 70],
      ["LOCALIZATION", 160],
      ["DATA", 250],
      ["FLEET", 355],
      ["ROAD", 455],
      ["CONNECT", 550],
      ["COOPERATE", 665]
    ];
    var journeyEdges = [];
    themes.forEach(function (theme) {
      (theme.progression || []).forEach(function (link) {
        if (nodePositions[theme.title] && nodePositions[link.target]) {
          journeyEdges.push({ from: theme.title, to: link.target, label: link.label });
        }
      });
    });

    var defs = svgEl("defs");
    var marker = svgEl("marker", {
      id: "journey-arrow",
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse"
    });
    marker.appendChild(svgEl("path", { d: "M0 0 L10 5 L0 10 z", fill: "#A4ABB2" }));
    defs.appendChild(marker);
    graph.appendChild(defs);
    var background = svgEl("rect", { x: "0", y: "0", width: "1200", height: "790", fill: "transparent" });
    graph.appendChild(background);
    laneLabels.forEach(function (lane) {
      var line = svgEl("line", {
        x1: "110", y1: String(lane[1] + 38), x2: "1170", y2: String(lane[1] + 38),
        stroke: "#E4E7EA", "stroke-width": "1"
      });
      graph.appendChild(line);
      var text = svgEl("text", { x: "18", y: String(lane[1] + 4), "class": "journey-lane" });
      text.textContent = lane[0];
      graph.appendChild(text);
    });

    function edgePath(from, to) {
      var start = nodePositions[from];
      var end = nodePositions[to];
      var startX = start[0] + 108;
      var endX = end[0] - 108;
      var middle = startX + (endX - startX) * .5;
      return "M" + startX + "," + start[1] + " C" + middle + "," + start[1] + " " +
        middle + "," + end[1] + " " + endX + "," + end[1];
    }
    journeyEdges.forEach(function (edge) {
      var path = svgEl("path", {
        d: edgePath(edge.from, edge.to),
        "class": "journey-edge",
        "data-from": edge.from,
        "data-to": edge.to,
        "marker-end": "url(#journey-arrow)"
      });
      path.appendChild(svgEl("title"));
      path.firstChild.textContent = edge.label;
      graph.appendChild(path);
    });

    function labelLines(title) {
      var normalized = title.replace(" - ", ": ");
      if (normalized.length <= 27) { return [normalized]; }
      var words = normalized.split(" ");
      var lines = [""];
      words.forEach(function (word) {
        var current = lines[lines.length - 1];
        if ((current + " " + word).trim().length > 26 && lines.length < 2) {
          lines.push(word);
        } else {
          lines[lines.length - 1] = (current + " " + word).trim();
        }
      });
      if (lines[1] && lines[1].length > 29) { lines[1] = lines[1].slice(0, 27) + "…"; }
      return lines;
    }

    function themeProfile(theme) {
      var papers = theme.refs.map(function (number) { return paperByNumber[number]; }).filter(Boolean);
      return {
        papers: papers,
        direct: papers.filter(function (paper) { return paper.rural === "Direct rural evidence"; }).length,
        high: papers.filter(function (paper) { return paper.strength === "High"; }).length,
        field: papers.filter(function (paper) {
          return paper.etype === "Field pilot / case" || paper.etype === "Empirical / testbed";
        }).length,
        earliest: Math.min.apply(null, papers.map(function (paper) { return paper.year; }))
      };
    }

    Object.keys(nodePositions).forEach(function (title) {
      var theme = themeByTitle[title];
      if (!theme) { return; }
      var position = nodePositions[title];
      var meta = statusMeta[theme.status];
      var profile = themeProfile(theme);
      var group = svgEl("g", {
        "class": "journey-node",
        transform: "translate(" + position[0] + " " + position[1] + ")",
        tabindex: "0",
        role: "button",
        "aria-label": title + ", " + meta.label + ", " + theme.refs.length + " references",
        "data-theme-title": title,
        "data-earliest-year": String(profile.earliest)
      });
      group.appendChild(svgEl("rect", {
        x: "-108", y: "-28", width: "216", height: "56", rx: "9",
        stroke: meta.color
      }));
      var statusText = svgEl("text", { x: "0", y: "-12", "class": "node-status", fill: meta.color });
      statusText.textContent = meta.short;
      group.appendChild(statusText);
      var lines = labelLines(title);
      var label = svgEl("text", { x: "0", y: lines.length === 1 ? "10" : "5" });
      lines.forEach(function (lineText, index) {
        var span = svgEl("tspan", { x: "0", dy: index === 0 ? "0" : "15" });
        span.textContent = lineText;
        label.appendChild(span);
      });
      group.appendChild(label);
      group.addEventListener("click", function () { selectJourneyTheme(theme); });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectJourneyTheme(theme);
        }
      });
      graph.appendChild(group);
    });

    var journeyDetail = document.getElementById("journey-detail");
    function selectJourneyTheme(theme) {
      var meta = statusMeta[theme.status];
      var profile = themeProfile(theme);
      graph.querySelectorAll(".journey-node").forEach(function (node) {
        node.classList.toggle("is-active", node.getAttribute("data-theme-title") === theme.title);
      });
      graph.querySelectorAll(".journey-edge").forEach(function (edge) {
        edge.classList.toggle("is-active",
          edge.getAttribute("data-from") === theme.title || edge.getAttribute("data-to") === theme.title);
      });
      while (journeyDetail.firstChild) { journeyDetail.removeChild(journeyDetail.firstChild); }
      journeyDetail.style.borderTopColor = meta.color;
      journeyDetail.appendChild(el("p", "journey-detail-kicker", meta.label));
      journeyDetail.appendChild(el("h3", null, theme.title));
      journeyDetail.appendChild(el("p", null, theme.cat));
      var profileRow = el("div", "journey-profile");
      profileRow.appendChild(el("span", null, theme.refs.length + " references"));
      profileRow.appendChild(el("span", null, profile.direct + " directly rural"));
      profileRow.appendChild(el("span", null, profile.high + " high-strength"));
      profileRow.appendChild(el("span", null, "Evidence since " + profile.earliest));
      journeyDetail.appendChild(profileRow);
      var actionLabel = el("strong", null, "Priority RAV action");
      actionLabel.className = "journey-detail-kicker";
      journeyDetail.appendChild(actionLabel);
      var actionList = el("ul", "journey-detail-list");
      theme.rav.slice(0, 3).forEach(function (item) { actionList.appendChild(el("li", null, item)); });
      journeyDetail.appendChild(actionList);
      var actions = el("div", "journey-detail-actions");
      var evidenceButton = el("button", "btn-primary", "Open full Evidence Map detail");
      evidenceButton.type = "button";
      evidenceButton.addEventListener("click", function () { window.openEvidenceTheme(theme.title, true); });
      var compareButton = el("button", "utility-btn", "Add to Compare Board");
      compareButton.type = "button";
      compareButton.addEventListener("click", function () { window.addThemeToCompare(theme.title, true); });
      var papersButton = el("button", "utility-btn", "Explore " + theme.refs.length + " supporting papers");
      papersButton.type = "button";
      papersButton.addEventListener("click", function () {
        setEvidenceFilter(theme.title, theme.refs);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      actions.appendChild(evidenceButton);
      actions.appendChild(compareButton);
      actions.appendChild(papersButton);
      journeyDetail.appendChild(actions);
    }

    var journeyView = { x: 0, y: 0, width: 1200, height: 790 };
    function applyJourneyView() {
      graph.setAttribute("viewBox", [journeyView.x, journeyView.y, journeyView.width, journeyView.height].join(" "));
    }
    function zoomJourney(factor, anchorX, anchorY) {
      var nextWidth = Math.max(620, Math.min(1600, journeyView.width * factor));
      var nextHeight = nextWidth * (790 / 1200);
      var ratioX = anchorX === undefined ? .5 : anchorX;
      var ratioY = anchorY === undefined ? .5 : anchorY;
      journeyView.x += (journeyView.width - nextWidth) * ratioX;
      journeyView.y += (journeyView.height - nextHeight) * ratioY;
      journeyView.width = nextWidth;
      journeyView.height = nextHeight;
      applyJourneyView();
    }
    document.getElementById("journey-zoom-in").addEventListener("click", function () { zoomJourney(.82); });
    document.getElementById("journey-zoom-out").addEventListener("click", function () { zoomJourney(1.18); });
    document.getElementById("journey-zoom-reset").addEventListener("click", function () {
      journeyView = { x: 0, y: 0, width: 1200, height: 790 };
      applyJourneyView();
    });
    graph.addEventListener("wheel", function (event) {
      event.preventDefault();
      var box = graph.getBoundingClientRect();
      zoomJourney(event.deltaY > 0 ? 1.1 : .9,
        (event.clientX - box.left) / box.width,
        (event.clientY - box.top) / box.height);
    }, { passive: false });
    var panState = null;
    graph.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".journey-node")) { return; }
      panState = {
        clientX: event.clientX,
        clientY: event.clientY,
        x: journeyView.x,
        y: journeyView.y
      };
      graph.setPointerCapture(event.pointerId);
      document.getElementById("journey-viewport").classList.add("is-dragging");
    });
    graph.addEventListener("pointermove", function (event) {
      if (!panState) { return; }
      var box = graph.getBoundingClientRect();
      journeyView.x = panState.x - (event.clientX - panState.clientX) * journeyView.width / box.width;
      journeyView.y = panState.y - (event.clientY - panState.clientY) * journeyView.height / box.height;
      applyJourneyView();
    });
    function stopPan(event) {
      if (!panState) { return; }
      panState = null;
      document.getElementById("journey-viewport").classList.remove("is-dragging");
      if (event && graph.hasPointerCapture(event.pointerId)) { graph.releasePointerCapture(event.pointerId); }
    }
    graph.addEventListener("pointerup", stopPan);
    graph.addEventListener("pointercancel", stopPan);

    window.updateJourneyYear = function (year) {
      graph.querySelectorAll(".journey-node").forEach(function (node) {
        node.classList.toggle("is-future", Number(node.getAttribute("data-earliest-year")) > year);
      });
    };
    applyJourneyView();
    selectJourneyTheme(themeByTitle["Perception - single-sensor limitations"]);

    /* compare board */
    var compareSelect = document.getElementById("compare-theme-select");
    var compareGrid = document.getElementById("compare-grid");
    var compareStatus = document.getElementById("compare-status");
    var compareTitles = [];
    themes.forEach(function (theme) {
      var option = el("option", null, theme.cat + " — " + theme.title);
      option.value = theme.title;
      compareSelect.appendChild(option);
    });

    function saveComparison() {
      try { window.localStorage.setItem("rav-theme-comparison", JSON.stringify(compareTitles)); } catch (ignore) {}
    }
    function renderComparison() {
      while (compareGrid.firstChild) { compareGrid.removeChild(compareGrid.firstChild); }
      if (!compareTitles.length) {
        compareGrid.appendChild(el("div", "compare-empty", "Add two to four themes to compare their evidence, trade-offs, and RAV actions."));
      }
      compareTitles.forEach(function (title) {
        var theme = themeByTitle[title];
        if (!theme) { return; }
        var meta = statusMeta[theme.status];
        var profile = themeProfile(theme);
        var card = el("article", "card compare-card");
        card.style.setProperty("--theme-color", meta.color);
        var head = el("div", "compare-card-head");
        var heading = el("div");
        heading.appendChild(el("h3", null, theme.title));
        heading.appendChild(el("p", "compare-category", theme.cat + " · " + meta.short));
        var remove = el("button", "compare-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remove " + theme.title + " from comparison");
        remove.addEventListener("click", function () {
          compareTitles = compareTitles.filter(function (candidate) { return candidate !== title; });
          saveComparison();
          renderComparison();
        });
        head.appendChild(heading);
        head.appendChild(remove);
        card.appendChild(head);
        var metrics = el("div", "compare-metrics");
        metrics.appendChild(el("span", null, theme.refs.length + " references"));
        metrics.appendChild(el("span", null, profile.direct + " directly rural"));
        metrics.appendChild(el("span", null, profile.high + " high-strength"));
        metrics.appendChild(el("span", null, profile.field + " empirical / field"));
        card.appendChild(metrics);
        var columns = el("div", "compare-columns");
        [["Pros", theme.pros], ["Cons", theme.cons]].forEach(function (column) {
          var part = el("div");
          part.appendChild(el("h4", null, column[0]));
          var list = el("ul");
          column[1].forEach(function (item) { list.appendChild(el("li", null, item)); });
          part.appendChild(list);
          columns.appendChild(part);
        });
        card.appendChild(columns);
        var action = el("div", "compare-action");
        action.appendChild(el("strong", null, "RAV action"));
        var actionList = el("ul");
        theme.rav.slice(0, 2).forEach(function (item) { actionList.appendChild(el("li", null, item)); });
        action.appendChild(actionList);
        card.appendChild(action);
        var open = el("button", "compare-open", "Open Evidence Map detail →");
        open.type = "button";
        open.addEventListener("click", function () { window.openEvidenceTheme(theme.title, true); });
        card.appendChild(open);
        compareGrid.appendChild(card);
      });
      compareStatus.textContent = compareTitles.length + " of 4 themes selected" +
        (compareTitles.length > 1 ? " — compare the evidence profiles below." : ".");
    }

    window.addThemeToCompare = function (title, openBoard) {
      if (!themeByTitle[title]) { return; }
      if (compareTitles.indexOf(title) === -1) {
        if (compareTitles.length >= 4) {
          compareStatus.textContent = "Comparison is full. Remove a theme before adding another.";
        } else {
          compareTitles.push(title);
          saveComparison();
          renderComparison();
        }
      }
      if (openBoard) {
        activateLabTab("compare", false);
        document.getElementById("decision-lab").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    document.getElementById("compare-add").addEventListener("click", function () {
      window.addThemeToCompare(compareSelect.value, false);
    });
    document.getElementById("compare-clear").addEventListener("click", function () {
      compareTitles = [];
      saveComparison();
      renderComparison();
    });
    try {
      var savedComparison = JSON.parse(window.localStorage.getItem("rav-theme-comparison") || "[]");
      compareTitles = savedComparison.filter(function (title) { return themeByTitle[title]; }).slice(0, 4);
    } catch (ignore) {
      compareTitles = [];
    }
    if (!compareTitles.length) {
      compareTitles = ["Perception - single-sensor limitations", "Perception - multi-sensor fusion"];
    }
    renderComparison();

    /* research gap radar */
    var radar = document.getElementById("gap-radar");
    var radarLegend = document.getElementById("radar-legend");
    var radarSummary = document.getElementById("radar-summary");
    var radarModules = CATEGORIES.filter(function (category) { return category !== "Pilots"; });
    var radarAxes = ["Evidence volume", "Direct rural", "High-strength", "Empirical / field", "Recent evidence"];
    var rawProfiles = {};
    radarModules.forEach(function (category) {
      var papers = PAPERS.filter(function (paper) {
        return paper.cat === category || (paper.mods && paper.mods.indexOf(category) !== -1);
      });
      rawProfiles[category] = {
        papers: papers,
        count: papers.length,
        direct: papers.filter(function (paper) { return paper.rural === "Direct rural evidence"; }).length,
        high: papers.filter(function (paper) { return paper.strength === "High"; }).length,
        empirical: papers.filter(function (paper) {
          return paper.etype === "Empirical / testbed" || paper.etype === "Field pilot / case";
        }).length,
        recent: papers.filter(function (paper) { return paper.year >= 2022; }).length
      };
    });
    var maxVolume = Math.max.apply(null, radarModules.map(function (category) { return rawProfiles[category].count; }));
    function radarValues(profile) {
      return [
        profile.count / maxVolume * 100,
        profile.count ? profile.direct / profile.count * 100 : 0,
        profile.count ? profile.high / profile.count * 100 : 0,
        profile.count ? profile.empirical / profile.count * 100 : 0,
        profile.count ? profile.recent / profile.count * 100 : 0
      ];
    }
    var radarCenter = [250, 214];
    var radarRadius = 150;
    function radarPoint(axisIndex, value) {
      var angle = -Math.PI / 2 + axisIndex * Math.PI * 2 / radarAxes.length;
      var radius = radarRadius * value / 100;
      return [radarCenter[0] + Math.cos(angle) * radius, radarCenter[1] + Math.sin(angle) * radius];
    }
    [25, 50, 75, 100].forEach(function (level) {
      var points = radarAxes.map(function (_, index) { return radarPoint(index, level).join(","); }).join(" ");
      radar.appendChild(svgEl("polygon", { points: points, "class": "radar-grid" }));
    });
    radarAxes.forEach(function (label, index) {
      var outer = radarPoint(index, 100);
      radar.appendChild(svgEl("line", {
        x1: radarCenter[0], y1: radarCenter[1], x2: outer[0], y2: outer[1], "class": "radar-axis"
      }));
      var labelPoint = radarPoint(index, 118);
      var labelNode = svgEl("text", { x: labelPoint[0], y: labelPoint[1] + 4, "class": "radar-label" });
      labelNode.textContent = label;
      radar.appendChild(labelNode);
    });
    var activeRadarModule = radarModules[0];
    radarModules.forEach(function (category) {
      var values = radarValues(rawProfiles[category]);
      var polygon = svgEl("polygon", {
        points: values.map(function (value, index) { return radarPoint(index, value).join(","); }).join(" "),
        "class": "radar-shape",
        "data-radar-module": category,
        stroke: CAT_COLORS[category],
        fill: CAT_COLORS[category]
      });
      radar.appendChild(polygon);
      values.forEach(function (value, index) {
        var point = radarPoint(index, value);
        radar.appendChild(svgEl("circle", {
          cx: point[0], cy: point[1], r: "4", fill: CAT_COLORS[category],
          "class": "radar-dot", "data-radar-module": category
        }));
      });
      var legendButton = el("button");
      legendButton.type = "button";
      legendButton.style.setProperty("--module-color", CAT_COLORS[category]);
      legendButton.setAttribute("data-radar-module", category);
      legendButton.setAttribute("aria-pressed", category === activeRadarModule ? "true" : "false");
      legendButton.appendChild(el("i"));
      legendButton.appendChild(el("span", null, category));
      legendButton.appendChild(el("b", null, rawProfiles[category].count));
      legendButton.addEventListener("click", function () { selectRadarModule(category); });
      radarLegend.appendChild(legendButton);
    });
    var radarExplore = el("button", "utility-btn", "Explore selected module");
    radarExplore.type = "button";
    radarSummary.insertAdjacentElement("afterend", radarExplore);
    function selectRadarModule(category) {
      activeRadarModule = category;
      radar.querySelectorAll("[data-radar-module]").forEach(function (shape) {
        shape.classList.toggle("is-muted", shape.getAttribute("data-radar-module") !== category);
      });
      radarLegend.querySelectorAll("button").forEach(function (button) {
        button.setAttribute("aria-pressed",
          button.getAttribute("data-radar-module") === category ? "true" : "false");
      });
      var profile = rawProfiles[category];
      var weakest = [
        ["direct rural evidence", profile.direct / Math.max(1, profile.count)],
        ["high-strength synthesis", profile.high / Math.max(1, profile.count)],
        ["empirical or field validation", profile.empirical / Math.max(1, profile.count)]
      ].sort(function (a, b) { return a[1] - b[1]; })[0][0];
      radarSummary.textContent = category + ": " + profile.count + " linked references, " +
        profile.direct + " directly rural, " + profile.high + " high-strength, and " +
        profile.empirical + " empirical / field records. The thinnest dimension is " + weakest + ".";
      radarExplore.textContent = "Explore " + category + " evidence";
    }
    radarExplore.addEventListener("click", function () {
      setStatFilter("cat", activeRadarModule);
      document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
    });
    selectRadarModule(activeRadarModule);

    /* timeline playback */
    var timelineInput = document.getElementById("timeline-year");
    var timelineValue = document.getElementById("timeline-year-value");
    var timelineBars = document.getElementById("timeline-bars");
    var timelineTotal = document.getElementById("timeline-total");
    var timelineMilestone = document.getElementById("timeline-milestone");
    var timelinePlay = document.getElementById("timeline-play");
    var timelineExplore = document.getElementById("timeline-explore");
    var timelineTimer = null;
    var timelineMaxByCategory = {};
    CATEGORIES.forEach(function (category) {
      timelineMaxByCategory[category] = PAPERS.filter(function (paper) { return paper.cat === category; }).length;
    });
    function milestoneFor(year) {
      if (year <= 2017) { return "The corpus begins with infrastructure-focused evidence."; }
      if (year <= 2019) { return "Perception, communications, and cooperative-driving evidence enters the review."; }
      if (year <= 2021) { return "Coverage broadens across the full RAV technology stack."; }
      if (year <= 2023) { return "Cooperative driving and field-operational evidence accelerate."; }
      if (year <= 2025) { return "Recent work deepens sensing, infrastructure, communications, and pilot coverage."; }
      return "Full review coverage across 118 verified references.";
    }
    function updateTimeline() {
      var year = Number(timelineInput.value);
      timelineValue.textContent = String(year);
      var available = PAPERS.filter(function (paper) { return paper.year <= year; });
      timelineTotal.textContent = available.length + " reference" + (available.length === 1 ? "" : "s") + " available";
      timelineMilestone.textContent = milestoneFor(year);
      timelineExplore.textContent = "Explore papers from " + year;
      while (timelineBars.firstChild) { timelineBars.removeChild(timelineBars.firstChild); }
      CATEGORIES.forEach(function (category) {
        var count = available.filter(function (paper) { return paper.cat === category; }).length;
        var row = el("div", "timeline-bar");
        row.appendChild(el("span", null, category));
        var track = el("span", "timeline-bar-track");
        var fill = el("span", "timeline-bar-fill");
        fill.style.setProperty("--bar-width", (count / Math.max(1, timelineMaxByCategory[category]) * 100) + "%");
        fill.style.setProperty("--bar-color", CAT_COLORS[category]);
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("b", null, String(count)));
        timelineBars.appendChild(row);
      });
      if (window.updateJourneyYear) { window.updateJourneyYear(year); }
    }
    function stopTimeline() {
      if (timelineTimer) { window.clearInterval(timelineTimer); timelineTimer = null; }
      timelinePlay.textContent = "Play";
      timelinePlay.setAttribute("aria-pressed", "false");
    }
    timelineInput.addEventListener("input", updateTimeline);
    timelinePlay.addEventListener("click", function () {
      if (timelineTimer) { stopTimeline(); return; }
      if (Number(timelineInput.value) >= Number(timelineInput.max)) { timelineInput.value = timelineInput.min; }
      timelinePlay.textContent = "Pause";
      timelinePlay.setAttribute("aria-pressed", "true");
      updateTimeline();
      timelineTimer = window.setInterval(function () {
        var next = Number(timelineInput.value) + 1;
        if (next > Number(timelineInput.max)) { stopTimeline(); return; }
        timelineInput.value = String(next);
        updateTimeline();
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 650);
    });
    timelineExplore.addEventListener("click", function () {
      var year = timelineInput.value;
      filters.year.clear();
      filters.year.add(year);
      paperScope = null;
      scopeLabel = "";
      clearRecommendationActive();
      syncDropdownFilter("year");
      render();
      document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
    });
    updateTimeline();
  })();

  /* ---------- global command search and reading progress ---------- */

  (function () {
    var dialog = document.getElementById("command-palette");
    var openButton = document.getElementById("command-open");
    var closeButton = document.getElementById("command-close");
    var input = document.getElementById("command-input");
    var resultsBox = document.getElementById("command-results");
    if (!dialog || !openButton || !input || !resultsBox) { return; }
    var resultItems = [];
    var activeIndex = 0;
    var sectionItems = Array.prototype.slice.call(document.querySelectorAll(".nav-pills a")).map(function (link) {
      return {
        type: "Section",
        title: link.textContent.trim(),
        detail: "Jump to " + link.textContent.trim(),
        hay: link.textContent.toLowerCase(),
        action: function () {
          var target = document.querySelector(link.getAttribute("href"));
          if (target) { target.scrollIntoView({ behavior: "smooth", block: "start" }); }
        }
      };
    });
    var pilotItems = [
      { title: "goMARTI", detail: "On-demand · Grand Rapids, Minnesota", refs: [14,15], label: "goMARTI" },
      { title: "ADASTEC", detail: "Fixed route · Sleeping Bear Dunes", refs: [16], label: "ADASTEC at Sleeping Bear Dunes" },
      { title: "TEDDY", detail: "Fixed route · Yellowstone National Park", refs: [116], label: "TEDDY at Yellowstone" },
      { title: "CASSI", detail: "Fixed route · North Carolina", refs: [116,117], label: "CASSI in North Carolina" }
    ].map(function (pilot) {
      return {
        type: "Pilot",
        title: pilot.title,
        detail: pilot.detail,
        hay: (pilot.title + " " + pilot.detail).toLowerCase(),
        action: function () {
          setRecommendationFilter(pilot.label, pilot.refs, null, "Pilot program");
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        }
      };
    });
    function themeItems() {
      return (window.RAV_THEMES || []).map(function (theme) {
        return {
          type: "Theme",
          title: theme.title,
          detail: theme.cat + " · " + theme.refs.length + " references",
          hay: (theme.title + " " + theme.cat + " " + theme.definition.join(" ") + " " + theme.rav.join(" ")).toLowerCase(),
          action: function () { window.openEvidenceTheme(theme.title, true); }
        };
      });
    }
    var paperItems = PAPERS.map(function (paper) {
      return {
        type: "Reference",
        title: "[" + paper.n + "] " + paper.title,
        detail: paper.authors + " · " + paper.year,
        hay: paper._hay,
        action: function () {
          setEvidenceFilter("Reference [" + paper.n + "]", [paper.n]);
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        }
      };
    });

    function closeCommand() {
      if (typeof dialog.close === "function" && dialog.open) { dialog.close(); }
      else { dialog.removeAttribute("open"); }
    }
    function openCommand() {
      if (typeof dialog.showModal === "function") { dialog.showModal(); }
      else { dialog.setAttribute("open", ""); }
      input.value = "";
      renderCommandResults("");
      window.setTimeout(function () { input.focus(); }, 20);
    }
    function scoreItem(item, terms) {
      var score = 0;
      terms.forEach(function (term) {
        var title = item.title.toLowerCase();
        if (title.indexOf(term) === 0) { score += 8; }
        else if (title.indexOf(term) !== -1) { score += 5; }
        else if (item.hay.indexOf(term) !== -1) { score += 2; }
        else { score -= 100; }
      });
      if (item.type === "Theme") { score += 2; }
      if (item.type === "Section") { score += 1; }
      return score;
    }
    function setCommandActive(index) {
      if (!resultItems.length) { return; }
      activeIndex = (index + resultItems.length) % resultItems.length;
      resultsBox.querySelectorAll(".command-result").forEach(function (button, buttonIndex) {
        var active = buttonIndex === activeIndex;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        if (active) { button.scrollIntoView({ block: "nearest" }); }
      });
    }
    function renderCommandResults(value) {
      var queryText = value.trim().toLowerCase();
      var terms = queryText.split(/\s+/).filter(Boolean);
      var pool = sectionItems.concat(themeItems(), pilotItems, paperItems);
      if (!terms.length) {
        resultItems = sectionItems.concat(themeItems().slice(0, 5));
      } else {
        resultItems = pool.map(function (item) {
          return { item: item, score: scoreItem(item, terms) };
        }).filter(function (entry) {
          return entry.score > -50;
        }).sort(function (a, b) {
          return b.score - a.score || a.item.title.localeCompare(b.item.title);
        }).slice(0, 14).map(function (entry) { return entry.item; });
      }
      while (resultsBox.firstChild) { resultsBox.removeChild(resultsBox.firstChild); }
      if (!resultItems.length) {
        resultsBox.appendChild(el("p", "command-empty", "No matching theme, pilot, paper, or section."));
        return;
      }
      resultItems.forEach(function (item, index) {
        var button = el("button", "command-result");
        button.type = "button";
        button.setAttribute("role", "option");
        button.appendChild(el("span", "command-result-type", item.type));
        button.appendChild(el("strong", null, item.title));
        button.appendChild(el("b", null, "→"));
        button.appendChild(el("small", null, item.detail));
        button.addEventListener("mouseenter", function () { setCommandActive(index); });
        button.addEventListener("click", function () {
          closeCommand();
          item.action();
        });
        resultsBox.appendChild(button);
      });
      setCommandActive(0);
    }
    openButton.addEventListener("click", openCommand);
    closeButton.addEventListener("click", closeCommand);
    input.addEventListener("input", function () { renderCommandResults(input.value); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandActive(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandActive(activeIndex - 1);
      } else if (event.key === "Enter" && resultItems[activeIndex]) {
        event.preventDefault();
        closeCommand();
        resultItems[activeIndex].action();
      }
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) { closeCommand(); }
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.open) { closeCommand(); } else { openCommand(); }
      }
    });

    var progressBar = document.getElementById("reading-progress-bar");
    var progressPending = false;
    function updateProgress() {
      progressPending = false;
      var available = document.documentElement.scrollHeight - window.innerHeight;
      var progress = available > 0 ? Math.max(0, Math.min(1, window.scrollY / available)) : 0;
      progressBar.style.transform = "scaleX(" + progress + ")";
    }
    window.addEventListener("scroll", function () {
      if (!progressPending) {
        progressPending = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    updateProgress();
  })();

  /* ---------- statistics year-range brush ---------- */

  (function () {
    var minInput = document.getElementById("year-brush-min");
    var maxInput = document.getElementById("year-brush-max");
    var minValue = document.getElementById("year-brush-min-value");
    var maxValue = document.getElementById("year-brush-max-value");
    if (!minInput || !maxInput) { return; }
    var earliest = Math.min.apply(null, yearsPresent);
    var latest = Math.max.apply(null, yearsPresent);
    [minInput, maxInput].forEach(function (input) {
      input.min = String(earliest);
      input.max = String(latest);
    });
    minInput.value = String(earliest);
    maxInput.value = String(latest);

    function updateLabels() {
      if (minValue) { minValue.textContent = minInput.value; }
      if (maxValue) { maxValue.textContent = maxInput.value; }
    }
    function applyYearBrush(event) {
      var minimum = Number(minInput.value);
      var maximum = Number(maxInput.value);
      if (minimum > maximum) {
        if (event && event.target === minInput) { maxInput.value = String(minimum); maximum = minimum; }
        else { minInput.value = String(maximum); minimum = maximum; }
      }
      filters.year.clear();
      if (minimum !== earliest || maximum !== latest) {
        yearsPresent.forEach(function (year) {
          if (year >= minimum && year <= maximum) { filters.year.add(String(year)); }
        });
      }
      paperScope = null;
      scopeLabel = "";
      clearRecommendationActive();
      syncDropdownFilter("year");
      updateLabels();
      render();
    }
    window.syncYearBrushFromFilters = function () {
      if (!filters.year.size) {
        minInput.value = String(earliest);
        maxInput.value = String(latest);
      } else {
        var selectedYears = Array.from(filters.year).map(Number);
        minInput.value = String(Math.min.apply(null, selectedYears));
        maxInput.value = String(Math.max.apply(null, selectedYears));
      }
      updateLabels();
    };
    minInput.addEventListener("input", applyYearBrush);
    maxInput.addEventListener("input", applyYearBrush);
    updateLabels();
  })();

  /* ---------- research workspace / citation cart ---------- */

  (function () {
    var count = document.getElementById("workspace-count");
    var toggle = document.getElementById("workspace-toggle");
    var panel = document.getElementById("workspace-panel");
    var list = document.getElementById("workspace-list");
    var related = document.getElementById("workspace-related");
    var filterButton = document.getElementById("workspace-filter");
    var copyButton = document.getElementById("workspace-copy");
    var exportButton = document.getElementById("workspace-export");
    var clearButton = document.getElementById("workspace-clear");
    if (!count || !toggle || !panel || !list) { return; }
    var saved = new Set();
    try {
      JSON.parse(window.localStorage.getItem("rav-citation-cart") || "[]").forEach(function (number) {
        if (PAPERS.some(function (paper) { return paper.n === Number(number); })) { saved.add(Number(number)); }
      });
    } catch (err) { saved = new Set(); }

    function savedPapers() {
      return sortPapers(PAPERS.filter(function (paper) { return saved.has(paper.n); }));
    }
    function persist() {
      try { window.localStorage.setItem("rav-citation-cart", JSON.stringify(Array.from(saved))); } catch (err) { /* optional */ }
    }
    function updateWorkspaceButtons() {
      var disabled = saved.size === 0;
      [filterButton, copyButton, exportButton, clearButton].forEach(function (button) {
        if (button) { button.disabled = disabled; }
      });
    }
    function renderWorkspace() {
      var papers = savedPapers();
      count.textContent = String(papers.length);
      count.setAttribute("aria-label", papers.length + " saved reference" + (papers.length === 1 ? "" : "s"));
      while (list.firstChild) { list.removeChild(list.firstChild); }
      if (!papers.length) {
        list.appendChild(el("p", "workspace-empty", "Open a reference and choose Save to Citation Cart."));
      } else {
        papers.forEach(function (paper) {
          var item = el("article", "workspace-item");
          item.appendChild(el("span", "workspace-ref", "[" + paper.n + "]"));
          var text = el("div");
          text.appendChild(el("strong", null, paper.title));
          text.appendChild(el("small", null, paper.cat + " · " + paper.year));
          item.appendChild(text);
          var remove = el("button", "paper-action", "×");
          remove.type = "button";
          remove.setAttribute("aria-label", "Remove reference " + paper.n + " from Citation Cart");
          remove.addEventListener("click", function () { window.toggleWorkspacePaper(paper.n); });
          item.appendChild(remove);
          list.appendChild(item);
        });
      }
      if (related) {
        while (related.firstChild) { related.removeChild(related.firstChild); }
        var links = LINEAGE_EDGES.filter(function (edge) {
          var from = paperByKey[edge.from];
          var to = paperByKey[edge.to];
          return from && to && saved.has(from.n) && saved.has(to.n);
        });
        related.appendChild(el("strong", null, links.length ? links.length + " mapped relationship" + (links.length === 1 ? "" : "s") : "No mapped relationships inside this cart yet"));
        links.slice(0, 8).forEach(function (edge) {
          related.appendChild(el("p", "workspace-relation", "[" + paperByKey[edge.from].n + "] ↔ [" + paperByKey[edge.to].n + "] · " + edge.rel));
        });
      }
      updateWorkspaceButtons();
    }
    window.isPaperSaved = function (number) { return saved.has(Number(number)); };
    window.toggleWorkspacePaper = function (number, button) {
      number = Number(number);
      if (saved.has(number)) { saved.delete(number); } else { saved.add(number); }
      persist();
      renderWorkspace();
      if (button) {
        button.textContent = saved.has(number) ? "Saved to Citation Cart" : "Save to Citation Cart";
        button.classList.toggle("workspace-saved", saved.has(number));
      }
    };
    toggle.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      toggle.textContent = panel.hidden ? "Open workspace" : "Close workspace";
    });
    if (filterButton) {
      filterButton.addEventListener("click", function () {
        var numbers = Array.from(saved).sort(function (a, b) { return a - b; });
        if (!numbers.length) { return; }
        setRecommendationFilter("Citation Cart", numbers, null, "Research workspace");
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
    }
    if (copyButton) {
      copyButton.addEventListener("click", function () {
        copyText(savedPapers().map(formatReference).join("\n\n"), copyButton, "Copy citations");
      });
    }
    if (exportButton) {
      exportButton.addEventListener("click", function () {
        var entries = savedPapers().map(function (paper) {
          var type = paper.vtype === "Journal" ? "article" : (paper.vtype === "Conference" ? "inproceedings" : "misc");
          var fields = [
            "  title = {" + bibValue(paper.title) + "}",
            "  author = {" + bibValue(paper.authors) + "}",
            "  year = {" + paper.year + "}",
            "  note = {" + bibValue(paper.venue) + "}"
          ];
          if (paper.doi) { fields.push("  doi = {" + bibValue(paper.doi) + "}"); }
          else if (paper._link) { fields.push("  url = {" + bibValue(paper._link) + "}"); }
          return "@" + type + "{rav" + paper.year + "ref" + paper.n + ",\n" + fields.join(",\n") + "\n}";
        });
        downloadText("rav-citation-cart.bib", entries.join("\n\n") + "\n", "application/x-bibtex");
      });
    }
    if (clearButton) {
      clearButton.addEventListener("click", function () {
        saved.clear();
        persist();
        renderWorkspace();
        renderTables(currentFiltered);
      });
    }
    renderWorkspace();
  })();

  /* ---------- init ---------- */

  hydrateUrlState();
  if (searchInput) { searchInput.value = query; }
  Object.keys(filters).forEach(syncDropdownFilter);
  if (sortSelect) { sortSelect.value = sortMode; }
  var chartDetails = document.querySelector(".chart-card");
  if (chartDetails && window.matchMedia("(max-width: 720px)").matches) {
    chartDetails.removeAttribute("open");
  }
  urlStateReady = true;

  buildLegend();
  buildGroups();
  renderCatBars();
  renderYearBars();
  renderHtmlBars(
    "type-bars",
    "etype",
    EVIDENCE_TYPES,
    ["#1F4E94", "#00A3AD", "#7E6BB0", "#4B8B3B", "#E08A3C", "#BA0C2F"]
  );
  renderHtmlBars(
    "rural-bars",
    "rural",
    RURAL_LEVELS,
    ["#4B8B3B", "#D99114", "#8B949E"]
  );
  renderHeatmap();
  render();
  spy();

  var copyFilterLink = document.getElementById("copy-filter-link");
  if (copyFilterLink) {
    copyFilterLink.addEventListener("click", function () {
      syncUrlState();
      var text = window.location.href;
      var done = function () {
        copyFilterLink.textContent = "Link copied";
        window.setTimeout(function () { copyFilterLink.textContent = "Copy filter link"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
      } else {
        var input = el("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        done();
      }
    });
  }

  if (initialFocusKey && paperByKey[initialFocusKey] && markerPosByKey[initialFocusKey]) {
    pinFocus(paperByKey[initialFocusKey]);
  }
})();
