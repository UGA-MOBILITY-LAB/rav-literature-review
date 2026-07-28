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

  function formatReference(p) {
    var authors = p.authors || "Author information unavailable";
    var identifier = p.doi ? " https://doi.org/" + p.doi :
      (p.arxiv ? " https://arxiv.org/abs/" + p.arxiv : " " + p._link);
    return authors + " (" + p.year + "). " + p.title + ". " + (p.venue || "") + "." + identifier;
  }

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
        output: "A review framework linking technology, fleet operations, infrastructure, connectivity, cooperation, and pilots."
      },
      {
        title: "Search and identify",
        summary: "Use complementary discovery channels so engineering research and operational deployments are both represented.",
        rule: "Combine topic and module keywords, then use backward and forward citation chaining to fill sub-theme gaps.",
        evidence: "Crossref and arXiv metadata; U.S. DOT, state DOT, university, agency, and official pilot sources.",
        output: "A candidate source pool spanning peer-reviewed research, preprints, public reports, and deployment pages."
      },
      {
        title: "Screen and deduplicate",
        summary: "Apply the same relevance test to every candidate and keep one verified record for each distinct work.",
        rule: "Retain direct rural studies or clearly transferable AV evidence; exclude unrelated modes, corrections, withdrawn items, duplicates, and unverifiable records.",
        evidence: "Titles, abstracts, study context, source type, deployment setting, and version relationships.",
        output: "A unique retained set whose rural relevance is explicit rather than inferred from urban evidence."
      },
      {
        title: "Verify and code",
        summary: "Resolve every retained item to a real source and apply a consistent evidence taxonomy for the interactive review.",
        rule: "Require a working DOI, arXiv record, or authoritative source page before a record enters the evidence database.",
        evidence: "92 DOI records, 14 arXiv records, and 12 authoritative pages; 85 records are openly accessible.",
        output: "118 verified records coded by RAV module, study design, rural relevance, evidence strength, year, and access status."
      }
    ];
    var step = detail.querySelector(".method-detail-step");
    var title = detail.querySelector("h3");
    var summary = detail.querySelector(".method-detail-head p");
    var values = detail.querySelectorAll(".method-detail-grid p");
    function showMethod(index) {
      var method = METHODS[index];
      if (!method) { return; }
      step.textContent = "Step " + (index + 1) + " of " + METHODS.length;
      title.textContent = method.title;
      summary.textContent = method.summary;
      values[0].textContent = method.rule;
      values[1].textContent = method.evidence;
      values[2].textContent = method.output;
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
    var currentRefs = [];
    var currentLabel = "";

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
      evidenceButton.textContent = "Explore " + currentRefs.length + " supporting references";
      root.querySelectorAll("[data-planner-key]").forEach(function (button) {
        var active = state[button.getAttribute("data-planner-key")] === button.getAttribute("data-planner-value");
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (updateUrl) { writeScenarioUrl(); }
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
    renderPlanner(false);
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
        map.flyTo(program.coords, 6, { duration: .65 });
      }
    }

    detailEvidence.addEventListener("click", function () {
      setRecommendationFilter(selected.label, selected.refs, programCard(selected), "Pilot program");
      document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
    });

    if (typeof L === "undefined") {
      mapElement.innerHTML = '<p class="pilot-map-loading">The interactive map could not load. The accessible pilot cards below remain available.</p>';
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
        applyMapFilter(button.getAttribute("data-pilot-filter"));
      });
    });
    updateSelection(programs[0], false);
    applyMapFilter("all");
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

  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
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
      "V2X Cybersecurity": ["Communication submodule", "Authentication, encryption, integrity checks, and message verification protect vehicles, infrastructure, and shared data. The mechanisms must remain effective under constrained bandwidth and intermittent connectivity."],
      "Cooperative Driving": ["Tier 2 · Advanced", "Shared perception and coordinated control extend rural AVs to arterials, work and school zones, rail crossings, and extreme weather, with safety-critical computing retained onboard."],
      "Cooperative Perception": ["Cooperative Driving submodule", "Vehicles and roadside infrastructure share sensor data, features, or detected objects to extend field of view and reduce blind spots. RAV must tolerate sparse sensors, delayed messages, and incomplete shared information."],
      "Rural-Arterial Control": ["Cooperative Driving submodule", "CACC, platooning, and edge roadside-unit support coordinate speed and traffic interaction on arterials. RAV must adapt these methods to low-volume mixed traffic, intermittent links, selective RSU placement, and onboard safety-critical control."],
      "Work & School Zones and Handover": ["Cooperative Driving submodule", "Connected warnings and trajectory guidance address temporary work-zone changes and child-focused, reduced-speed school zones; infrastructure-assisted handover supports vehicles at automation limits. Rural sites need low-infrastructure warnings and carefully scoped support."],
      "Rail Grade Crossings": ["Cooperative Driving submodule", "V2I warnings communicate train approach, crossing state, and violation risk. RAV must extend the approach beyond instrumented crossings to passive, unconnected rural sites."],
      "Cooperative Response to Extreme Weather": ["Cooperative Driving submodule", "Road-weather observations and cooperative perception provide earlier hazard warnings and support speed adjustment or rerouting. RAV must work with sparse weather sensors and preserve safe onboard operation when infrastructure information disappears."],
      "Pilots": ["Field validation", "Five source records cover four named programs: goMARTI in Grand Rapids, ADASTEC at Sleeping Bear Dunes, TEDDY at Yellowstone, and CASSI at Wright Brothers and four other N.C. project sites. Together they provide on-demand and fixed-route operating evidence with safety operators on board. Click to see their references."]
    };
    var DEFAULT = ["Two tiers, one system", "Existing technology carries the service today; advanced, infrastructure-integrated technology extends it; four named field-pilot programs ground it in practice. Hover a module."];
    var tagEl = detail.querySelector(".td-tag");
    var txtEl = detail.querySelector(".td-text");
    function show(stage, substage) {
      var key = substage || stage;
      var d = INFO[key] || DEFAULT;
      tagEl.textContent = d[0] + " · " + key;
      txtEl.textContent = d[1];
      pillars.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-cat") === stage); });
      subpillars.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-subcat") === substage); });
    }
    function clear() {
      tagEl.textContent = DEFAULT[0];
      txtEl.textContent = DEFAULT[1];
      pillars.forEach(function (p) { p.classList.remove("active"); });
      subpillars.forEach(function (p) { p.classList.remove("active"); });
    }
    pillars.forEach(function (p) {
      var s = p.getAttribute("data-cat");
      p.addEventListener("mouseenter", function () { show(s); });
      p.addEventListener("focus", function () { show(s); });
      p.addEventListener("click", function () {
        setCatFilter(s);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show(s);
          setCatFilter(s);
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
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
        setSubthemeFilter(cat, subcat, refs);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSubthemeFilter(cat, subcat, refs);
          document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
        }
      });
    });
    var card = document.querySelector(".thesis-card");
    if (card) { card.addEventListener("mouseleave", clear); }
  })();

  /* ---------- evidence map ---------- */

  (function () {
    var emap = document.getElementById("emap");
    var edetail = document.getElementById("emap-detail");
    if (!emap || !edetail) { return; }
    var THEMES = [
      {
        cat: "Autonomous Driving", title: "Perception - single sensor", status: "r", refs: [1,18,20,64],
        definition: ["Uses one sensor modality, typically a monocular camera.", "Detects lanes, obstacles, pedestrians, animals, and signs."],
        pros: ["Low sensor and compute cost.", "Simple calibration and lightweight processing."],
        cons: ["Limited range and field of view.", "Sensitive to glare, low light, occlusion, faded markings, and unpaved surfaces."],
        rav: ["Use single-sensor coverage only as a baseline.", "Collect rural perception data and validate performance on local roads."]
      },
      {
        cat: "Autonomous Driving", title: "Perception - multi-sensor fusion", status: "m", refs: [2,17,18,19,20,56,57,58,59,63,64],
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
        cat: "Autonomous Driving", title: "Localization - GNSS/LiDAR limits", status: "m", refs: [1,2,61,62],
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
        definition: ["Uses incoming rider requests and live fleet status.", "Assigns, matches, sequences, and rebalances vehicles in real time."],
        pros: ["Reduces rider waiting and empty vehicle travel.", "Supports vehicle assignment under low-density demand."],
        cons: ["Requires live requests and a reliable matching engine.", "Needs enough vehicles to maintain acceptable wait times."],
        rav: ["Reuse dispatch and rider-app matching methods.", "Tune service zones, wait-time targets, and fleet size using local demand."]
      },
      {
        cat: "Fleet Management", title: "Fixed-route dispatch & scheduling", status: "r", refs: [16,69,77,78],
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
        cat: "Communication", title: "V2X cybersecurity", status: "g", refs: [44,45,99,100,101,102],
        definition: ["Uses authentication, encryption, integrity checks, and message verification.", "Protects V2X messages, networks, and devices."],
        pros: ["Addresses spoofing, message manipulation, eavesdropping, and denial of service.", "Improves trust across connected vehicles and infrastructure."],
        cons: ["Adds communication and computation overhead.", "Requires ongoing certificate, key, logging, and incident-response operations."],
        rav: ["Apply security across every communication channel before deployment.", "Plan certificate, key, logging, and incident-response operations."]
      },
      {
        cat: "Cooperative Driving", title: "Cooperative perception", status: "m", refs: [10,35,104,105,106,108,109],
        definition: ["Vehicles and roadside infrastructure share sensor data or detected objects.", "Extends field of view and reduces blind spots."],
        pros: ["Extends awareness through occlusion and adverse weather.", "Reduces blind spots by sharing vehicle and roadside observations."],
        cons: ["Requires reliable links and accurate spatial-temporal alignment.", "Roadside equipment and delayed or incorrect data create additional risks."],
        rav: ["Deploy roadside sensing only at high-value conflict points.", "Preserve a safe onboard fallback when shared data is unavailable."]
      },
      {
        cat: "Cooperative Driving", title: "Infrastructure-assisted control & handover", status: "m", refs: [34,36,107,108,114,115],
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
    var STATUS = { g: ["Reusable now", "#4B8B3B"], m: ["Needs rural adaptation", "#D99114"], r: ["Open gap", "#BA0C2F"] };
    var STATUS_SHORT = { g: "Reusable", m: "Adapt", r: "Gap" };
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
        pill.setAttribute("aria-label", t.title + ": " + STATUS[t.status][0] + "; " +
          t.refs.length + " supporting references");
        pill.title = t.refs.length + " supporting references. Show definition, pros, cons, rural gap, and RAV action.";
        pill.addEventListener("mouseenter", function () { showDetail(t, pill); });
        pill.addEventListener("focus", function () { showDetail(t, pill); });
        pill.addEventListener("click", function () { showDetail(t, pill); });
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
      var explore = el("button", "ed-explore", "Explore " + t.refs.length + " supporting reference" + (t.refs.length === 1 ? "" : "s") + " in the literature explorer");
      explore.type = "button";
      explore.addEventListener("click", function () {
        setEvidenceFilter(t.title, t.refs);
        document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
      });
      edetail.appendChild(explore);
    }
    if (initialTheme) { showDetail(initialTheme.theme, initialTheme.pill); }
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
