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

  /* ---------- enrich papers ---------- */

  PAPERS.forEach(function (p) {
    p._vtype = p.vtype;
    p._link = paperLink(p);
    p._hash = hashKey(p.key);
    p._hay = (p.title + " " + p.authors + " " + p.venue).toLowerCase();
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

  var filters = { cat: new Set(), year: new Set(), vtype: new Set(), link: new Set() };
  var query = "";
  var hiddenCats = new Set();
  var hiddenTypes = new Set();
  var showEdges = true;
  var paperScope = null;
  var scopeLabel = "";

  function clearRecommendationActive() {
    var cards = document.querySelectorAll(".recommendation-card");
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
    if (filters.link.size && !filters.link.has((p.doi || p.arxiv || p.url) ? "has" : "none")) { return false; }
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
  var linkOptions = [
    { value: "has", label: "Has DOI / arXiv / source link" },
    { value: "none", label: "No direct link" }
  ];

  ddRow.insertBefore(createDropdown("cat", "Module", catOptions), resetBtn);
  ddRow.insertBefore(createDropdown("year", "Year", yearOptions), resetBtn);
  ddRow.insertBefore(createDropdown("vtype", "Source Type", typeOptions), resetBtn);
  ddRow.insertBefore(createDropdown("link", "Link", linkOptions), resetBtn);

  var searchInput = document.getElementById("search");
  searchInput.addEventListener("input", function () {
    query = searchInput.value.trim().toLowerCase();
    render();
  });

  resetBtn.addEventListener("click", function () {
    filters.cat.clear(); filters.year.clear(); filters.vtype.clear(); filters.link.clear();
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
  });

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

  function setRecommendationFilter(label, refs, activeCard) {
    filters.cat.clear();
    filters.year.clear();
    filters.vtype.clear();
    filters.link.clear();
    hiddenCats.clear();
    hiddenTypes.clear();
    showEdges = true;
    pinnedKey = null;
    query = "";
    searchInput.value = "";
    paperScope = new Set(refs);
    scopeLabel = "Recommendation / " + label;
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
    activeCard.classList.add("is-active");
    activeCard.setAttribute("aria-pressed", "true");
    render();
  }

  function setEvidenceFilter(label, refs) {
    filters.cat.clear();
    filters.year.clear();
    filters.vtype.clear();
    filters.link.clear();
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

  function pinFocus(p) { pinnedKey = p.key; applyFocus(p); updateCountLine(); }

  function unpinFocus() {
    if (!pinnedKey) { return; }
    pinnedKey = null;
    clearFocus();
    updateCountLine();
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
      var rows = byCat[c].slice().sort(function (a, b) {
        return (b.year - a.year) || a.title.localeCompare(b.title);
      });
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
        tr.appendChild(el("td", "t-title", p.title));
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
      });
    });
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

  function render() {
    currentFiltered = PAPERS.filter(passesFilters);
    renderScatter(currentFiltered);
    renderTables(currentFiltered);
    syncStatSelection();
    updateCountLine();
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

  /* ---------- stakeholder recommendations ---------- */

  (function () {
    var cards = document.querySelectorAll(".recommendation-card");
    cards.forEach(function (card) {
      var label = card.getAttribute("data-label");
      var refs = card.getAttribute("data-refs").split(",").map(function (n) { return Number(n); });
      function activate() {
        setRecommendationFilter(label, refs, card);
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
      "Communication": ["Tier 2 · Advanced", "RAV combines direct and network-based V2X with cellular and LEO satellite links, switches by coverage and latency, and maintains safe onboard operation during disconnections."],
      "Cooperative Driving": ["Tier 2 · Advanced", "Shared perception and coordinated control extend rural AVs to arterials, work and school zones, rail crossings, and extreme weather, with safety-critical computing retained onboard."],
      "Pilots": ["Field validation", "goMARTI (on-demand, ~97 stops, app or 211) and ADASTEC (fixed scenic route, ~4 round trips/day) validate the service models with safety operators on board. Click to see their references."]
    };
    var DEFAULT = ["Two tiers, one system", "Existing technology carries the service today; advanced, infrastructure-integrated technology extends it; two focal field pilots ground it in practice. Hover a module."];
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
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(s); }
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
        definition: "One modality, typically a monocular camera, turns raw output into detected lanes, obstacles, pedestrians, animals, and signs.",
        findings: "A single-sensor stack is inexpensive, computationally light, and simple to calibrate. Its view is narrow and easily degraded by limited range, glare, low light, occlusion, faded markings, and unpaved surfaces.",
        rav: "Treat single-sensor coverage as a baseline rather than the final solution. Direct rural evidence is scarce, so RAV must collect rural perception data and validate performance on its own roads."
      },
      {
        cat: "Autonomous Driving", title: "Perception - multi-sensor fusion", status: "m", refs: [2,17,18,19,20,56,57,58,59,63,64],
        definition: "Camera, radar, LiDAR, and IMU readings are combined into one detection set; some stacks fuse two modalities and others fuse all three plus IMU for ego-motion alignment.",
        findings: "Fusion adds range, weather robustness, 3-D geometry, and redundancy, and it outperforms any single sensor in complex scenes. The trade-off is higher sensor and compute cost plus calibration and synchronization effort.",
        rav: "Use camera plus radar as the lower-cost floor and add LiDAR where its 3-D geometry materially improves safety. Re-train and re-validate the models for sparse rural geometry."
      },
      {
        cat: "Autonomous Driving", title: "Perception - adverse weather", status: "m", refs: [3,21,22,58,61],
        definition: "Condition-specific methods and datasets keep onboard perception useful under glare, rain, fog, snow, dust, and related visibility loss.",
        findings: "Adverse-weather training can recover accuracy and dedicated datasets support benchmarking, but performance still degrades when several modalities are affected together.",
        rav: "Build a local adverse-weather dataset and validate fallback thresholds for the service area. Cooperative information may supplement the vehicle where infrastructure exists, but safe onboard behavior must remain available."
      },
      {
        cat: "Autonomous Driving", title: "Localization - GNSS/LiDAR limits", status: "m", refs: [1,2,61,62],
        definition: "GNSS/INS provides a global satellite position, while LiDAR localization matches live scans against known road geometry.",
        findings: "GNSS is affordable and globally referenced; LiDAR can be precise without satellite signals. GNSS drifts under canopy or in valleys, while sparse, repetitive rural geometry makes LiDAR-only matching ambiguous.",
        rav: "Do not depend on either source alone. RAV needs a fused position estimate that remains stable across canopy, valleys, weak features, and intermittent map matches."
      },
      {
        cat: "Autonomous Driving", title: "Localization - fusion with HD maps", status: "m", refs: [2,23,24,25,60],
        definition: "Vision and LiDAR are matched against an HD-map prior and fused with GNSS/INS into one pose estimate.",
        findings: "The fused stack can sustain lane-level to centimeter positioning in GNSS-challenged settings. Its dominant cost is the HD map that must be surveyed, verified, and continuously refreshed.",
        rav: "The localization stack transfers directly after RAV maps its own corridors. The project also needs a practical rural HD-map maintenance workflow linked to road and infrastructure updates."
      },
      {
        cat: "Autonomous Driving", title: "Data integration - onboard raw & semantic", status: "g", refs: [17,18,19,57,63],
        definition: "Raw camera, radar, and LiDAR streams are fused onboard and converted into semantic output such as detections, pose, trajectory, and control state.",
        findings: "This preserves the richest detail, low latency, and independence from network coverage. It also carries the highest bandwidth and compute load, and its quality remains bounded by sensor quality.",
        rav: "Reuse onboard raw-to-semantic fusion as the core perception and localization pipeline. It is the dependable backbone when rural communication is unavailable."
      },
      {
        cat: "Autonomous Driving", title: "Data integration - heterogeneous & aggregated", status: "r", refs: [2,19,25,56,59],
        definition: "The system reconciles inputs with different reliability, coordinate frames, and update rates; aggregated feeds add traffic, events, maps, weather, and fleet context.",
        findings: "Aggregated information adds context no single vehicle can sense, but edge and cloud feeds arrive with latency and depend on coverage that rural roads may not provide.",
        rav: "Keep onboard reconciliation authoritative and treat roadside, fleet, and cloud feeds as opportunistic additions. Engineer confidence checks and graceful degradation for delayed or missing inputs."
      },
      {
        cat: "Autonomous Driving", title: "Routing - energy & terrain aware", status: "m", refs: [1,4,26,27,65,66,67],
        definition: "Route cost includes grade, surface, vehicle dynamics, and effective battery range so every plan stays physically feasible.",
        findings: "Energy-aware routing protects range on hilly and unpaved roads, but it depends on calibrated terrain, surface, and consumption models that are rarely available for rural networks.",
        rav: "Use energy- and terrain-aware cost underneath every service mode, then calibrate it with grade, surface, weather, load, and energy data from RAV's own corridors."
      },
      {
        cat: "Autonomous Driving", title: "Routing - on-demand vs fixed route", status: "m", refs: [5,16,30,31,69,78],
        definition: "On-demand routing builds and sequences trips from rider requests; fixed-route operation repeats a preset line on a published timetable.",
        findings: "On-demand service reaches scattered riders but needs live demand and dispatch computing. Fixed routes are predictable and simple, but can waste capacity and miss riders away from the line.",
        rav: "Use on-demand routing for healthcare service and fixed routes for regular transit and park service, with range and terrain constraints applied to both."
      },
      {
        cat: "Fleet Management", title: "On-demand dispatch & ride-matching", status: "g", refs: [5,28,29,30,31,68,70,71,73,75],
        definition: "Riders request trips and the fleet assigns, matches, sequences, and rebalances vehicles in real time.",
        findings: "Reinforcement-learning and operations-research methods reduce waiting and empty travel for low-density demand. They require live requests, a matching engine, and enough vehicles to maintain acceptable waits.",
        rav: "Reuse proven dispatch and rider-app matching methods for RAV's on-demand service, then tune service zones, wait-time targets, and fleet size using local demand."
      },
      {
        cat: "Fleet Management", title: "Fixed-route dispatch & scheduling", status: "r", refs: [16,69,77,78],
        definition: "Vehicles repeat a route while headway and timetable planning determine when each run departs and how vehicles are spaced.",
        findings: "The service is predictable for riders and simple to operate, but thin demand can create long waits and poor vehicle utilization. The review found a pilot, not dedicated rural scheduling studies.",
        rav: "Develop and test headway, timetable, and fleet-allocation methods specifically for thin-demand rural runs."
      },
      {
        cat: "Fleet Management", title: "Fleet support - charging, monitoring & fares", status: "r", refs: [14,15,16,72,74,75,76,77],
        definition: "Fleet support keeps vehicles service-ready through charging and energy management, onboard health monitoring, maintenance coordination, and fare collection.",
        findings: "The rural pilots handle these functions operationally, but the review found no dedicated rural AV method or comparative evidence for them.",
        rav: "Treat these as engineering and data-collection functions in early deployment. Use pilot data to formalize charging plans, maintenance triggers, and rider payment policy."
      },
      {
        cat: "Fleet Management", title: "Remote monitoring & supervision", status: "r", refs: [14,15,16,79],
        definition: "An operations center tracks vehicle location, health, and service state while a human supervisor assists or intervenes when automation requests help.",
        findings: "One supervisor may support multiple vehicles, enabling scale without a driver in every seat. The model depends on telemetry and video links, and supervisor ratios and takeover procedures remain unsettled.",
        rav: "Define supervisor-to-vehicle ratios, degraded-link operating rules, intervention authority, and takeover procedures; then test them under weak rural connectivity."
      },
      {
        cat: "Infrastructure", title: "Physical road assessment", status: "m", refs: [39,46,47,48,49,80,81,82,83,84,85,86,87,88],
        definition: "UAV, smartphone, imaging, and mobile-LiDAR surveys detect pavement damage, markings, signs, geometry, and gravel-road surface condition.",
        findings: "The component methods are reusable and lower the cost of network inspection, but existing studies address individual features rather than one integrated rural upgrade workflow.",
        rav: "Validate the methods under local road, weather, and maintenance conditions, then combine results into segment-level priorities for physical upgrades."
      },
      {
        cat: "Infrastructure", title: "Digital road-information layer", status: "m", refs: [7,25,37,38,80,87,89,90,91],
        definition: "HD maps provide the spatial base, roadside sensing supplies changing observations, and a digital twin integrates both for vehicle and infrastructure decisions.",
        findings: "Demonstrations exist on highways, selected rural test sections, and controlled campuses, but they are highly instrumented or proof-of-concept.",
        rav: "Reuse the layered architecture while adapting it to incomplete maps, sparse sensors, intermittent communication, and low-cost rural updates."
      },
      {
        cat: "Communication", title: "Rural V2X", status: "r", refs: [9,50,51,52,92,93,95,96,97,98,103],
        definition: "Vehicle-to-vehicle, vehicle-to-infrastructure, and vehicle-to-network links exchange hazard, traffic, road-condition, and coordination information using C-V2X and 5G NR-V2X.",
        findings: "Rural measurements show weaker coverage and longer disconnections; related studies add interference, resource allocation, mobility, energy, and quality-of-service trade-offs.",
        rav: "Assume intermittent connectivity from the start. Combine direct and network-based links, monitor link quality, and preserve safe vehicle operation throughout disconnections."
      },
      {
        cat: "Communication", title: "Multi-channel connectivity", status: "m", refs: [8,92,93,94,103],
        definition: "C-V2X, public cellular, and LEO satellite interfaces are combined so another path can carry nonlocal information when one network is unavailable.",
        findings: "Multiple channels improve reach and resilience, but add hardware cost, switching complexity, energy use, and potentially satellite latency.",
        rav: "Measure coverage and latency along service corridors and switch channels by policy. Keep time-critical control onboard and use wide-area links for supplementary information."
      },
      {
        cat: "Communication", title: "V2X cybersecurity", status: "g", refs: [44,45,99,100,101,102],
        definition: "Authentication, encryption, integrity checks, and message verification protect V2X messages, networks, and devices.",
        findings: "The surveyed mechanisms address spoofing, manipulation, eavesdropping, and denial of service, although they add communication and computation overhead.",
        rav: "Apply security across every communication channel before field deployment and include certificate, key, logging, and incident-response operations in the system design."
      },
      {
        cat: "Cooperative Driving", title: "Cooperative perception", status: "m", refs: [10,35,104,105,106,108,109],
        definition: "Vehicles and roadside infrastructure share sensor data or detected objects to extend field of view and reduce blind spots.",
        findings: "Cooperation improves awareness under occlusion and adverse weather, but requires reliable links, accurate spatial and temporal alignment, roadside equipment, and protection from delayed or incorrect data.",
        rav: "Deploy roadside sensing only at conflict points where onboard perception needs help, and preserve a safe onboard fallback when shared data is unavailable."
      },
      {
        cat: "Cooperative Driving", title: "Infrastructure-assisted control & handover", status: "m", refs: [34,36,107,108,114,115],
        definition: "Nearby edge roadside units support cooperative driving services and can assist a vehicle when automation reaches an operational limit.",
        findings: "Experiments quantify safety and latency benefits, but the approach assumes dense and reliable roadside coverage that rural networks do not have.",
        rav: "Place edge support at a small number of high-risk locations, define handover authority and timing, and validate operation when the roadside unit or link fails."
      },
      {
        cat: "Cooperative Driving", title: "CACC & platooning", status: "m", refs: [40,41,110,111,112],
        definition: "Cooperative adaptive cruise control and platooning coordinate vehicle speed, spacing, and signal interaction using shared motion information.",
        findings: "Field studies demonstrate efficiency and coordination on urban or suburban arterials with steadier traffic and stronger infrastructure.",
        rav: "Adapt the methods to low-volume rural arterials with mixed conventional and automated vehicles, variable connectivity, and longer gaps between equipped intersections."
      },
      {
        cat: "Cooperative Driving", title: "Work & school zones", status: "r", refs: [11,113,115],
        definition: "Connected warnings and trajectory coordination help vehicles approach temporary work areas and school-zone conflict points.",
        findings: "Published methods focus on more structured or connected settings; passive and unsignalized rural interactions remain weakly studied.",
        rav: "Develop low-infrastructure warnings and operating rules for rural work and school zones, then field-test detection, yielding, and fallback behavior."
      },
      {
        cat: "Cooperative Driving", title: "Rail grade crossings", status: "m", refs: [42, 43],
        definition: "Vehicle-to-infrastructure warnings communicate train approach, crossing state, and violation risk to road vehicles.",
        findings: "Federal studies demonstrate warning applications at instrumented crossings, but many rural crossings are passive and lack communications equipment.",
        rav: "Extend warning logic to passive rural crossings and specify safe onboard behavior when no infrastructure message is available."
      },
      {
        cat: "Cooperative Driving", title: "Extreme-weather cooperation", status: "r", refs: [12, 13, 21],
        definition: "Road-weather information and cooperative perception support hazard sensing, lane closure, speed adjustment, and rerouting during rain, snow, and fog.",
        findings: "The methods can supplement degraded onboard sensing, but most demonstrations assume instrumented roads, reliable connectivity, and richer weather data.",
        rav: "Collect local weather evidence, identify risk thresholds, and test cooperative warning and rerouting while retaining safe onboard operation through infrastructure outages."
      },
      {
        cat: "Pilots", title: "goMARTI - on-demand", status: "g", refs: [14, 15],
        definition: "A door-to-door rural shuttle serves roughly 97 pick-up and drop-off points, with requests through an app or 211 and a safety operator onboard.",
        findings: "The pilot demonstrates accessible, low-speed, on-demand service within a geofence and provides real operating evidence for rider requests and fleet supervision.",
        rav: "Use it as the service-model baseline, then progress through safety gates toward longer range, higher speeds, and reduced onboard operator reliance."
      },
      {
        cat: "Pilots", title: "ADASTEC and public-lands shuttles - fixed route", status: "g", refs: [16,116,117],
        definition: "A scheduled automated bus runs a fixed scenic route for about four round trips per day with advance reservations and a safety operator onboard.",
        findings: "ADASTEC, TEDDY, and CASSI demonstrate predictable fixed-route service in remote parks and public sites. Across deployments, low speed, geofencing, weather or battery interruptions, and onboard supervision remain recurring constraints.",
        rav: "Reuse the fixed-route operating concept while adding rural headway, timetable, energy, and interruption planning, and progressively reduce operator dependence through explicit safety gates."
      }
    ];
    var STATUS = { g: ["Reusable now", "#4B8B3B"], m: ["Needs rural adaptation", "#D99114"], r: ["Open gap", "#BA0C2F"] };
    var byNum = {};
    PAPERS.forEach(function (p) { byNum[p.n] = p; });
    var initialTheme = null;
    CATEGORIES.forEach(function (c) {
      var row = el("div", "mrow");
      var lab = el("div", "mlab");
      var sw = el("span", "sw");
      sw.style.background = CAT_COLORS[c];
      lab.appendChild(sw);
      lab.appendChild(document.createTextNode(c));
      var cells = el("div", "mcells");
      THEMES.forEach(function (t) {
        if (t.cat !== c) { return; }
        var pill = el("button", "epill " + t.status, t.title);
        pill.type = "button";
        pill.setAttribute("aria-pressed", "false");
        pill.title = "Show definition, findings, rural gap, and RAV action";
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
      var grid = el("div", "ed-grid");
      [
        ["Definition", t.definition, "ed-definition"],
        ["Literature findings and trade-offs", t.findings, "ed-findings"],
        ["Rural gap and RAV action", t.rav, "ed-rav"]
      ].forEach(function (section) {
        var block = el("div", "ed-block " + section[2]);
        block.appendChild(el("span", "ed-label", section[0]));
        block.appendChild(el("p", null, section[1]));
        grid.appendChild(block);
      });
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

  buildLegend();
  buildGroups();
  renderCatBars();
  renderYearBars();
  render();
  spy();

  var focusParam = /[?&]focus=([A-Za-z0-9_]+)/.exec(window.location.search);
  if (focusParam && paperByKey[focusParam[1]] && markerPosByKey[focusParam[1]]) {
    pinFocus(paperByKey[focusParam[1]]);
  }
})();
