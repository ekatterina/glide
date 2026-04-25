#!/usr/bin/env python3
"""
explore_amsterdam.py — local tool for visually validating accessibility hotspots.

Queries OpenStreetMap (via the Overpass API) for accessibility-relevant features
inside a chosen Amsterdam bbox, renders each category as a toggleable Folium
layer, and saves to ./scripts/output/map.html.

Usage:
    pip install folium requests
    python scripts/explore_amsterdam.py            # default: De Pijp
    python scripts/explore_amsterdam.py centrum
    python scripts/explore_amsterdam.py amsterdam  # slow: whole city

Layers (toggleable via the layer control in the top-right):
    - Cobblestones (red lines)
    - Bad smoothness (orange lines)
    - Steps (purple)
    - Wheelchair=no  (dark red)
    - Wheelchair=limited (yellow)
    - Hard barriers without wheelchair=yes (black points)
    - High kerbs (>3 cm) (brown points)
    - Steep ways (>6%) (pink lines)
"""
from __future__ import annotations

import datetime
import json
import os
import sys
import time
import webbrowser
from pathlib import Path

import folium
import requests

# ---------- bboxes (south, west, north, east) — Overpass order ----------
BBOXES = {
    "de-pijp":   (52.346, 4.886, 52.362, 4.910),
    "centrum":   (52.365, 4.880, 52.385, 4.910),
    "oost":      (52.355, 4.910, 52.375, 4.945),
    "west":      (52.370, 4.860, 52.390, 4.890),
    "amsterdam": (52.300, 4.740, 52.430, 5.020),
}

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
WIOR_URL = "https://api.data.amsterdam.nl/v1/wior/wior/"
CACHE_DIR = Path(__file__).parent / "output" / "cache"
OUT_HTML = Path(__file__).parent / "output" / "map.html"
REPORTS_FILE = Path(__file__).parent / "data" / "reports.json"

# ---------- crowdsourced obstacle categories ----------
# severity → routing penalty when a report falls within ~5m of a route segment.
# These mirror the surface/smoothness penalty scale in lib/accessibility.ts:
#   1.0 = baseline, 3.0 = cobblestone, 4.0 = unhewn cobblestone.
# So a "high" report (×2.5) makes its 5m radius feel like crossing cobblestones.
CATEGORIES: dict[str, dict] = {
    "broken_pavement":   {"label": "Broken pavement",       "severity": "high",   "penalty": 2.5, "emoji": "🕳️"},
    "scaffolding":       {"label": "Unmapped scaffolding",  "severity": "high",   "penalty": 2.5, "emoji": "🏗️"},
    "temp_fence":        {"label": "Temporary fence",       "severity": "high",   "penalty": 2.5, "emoji": "🚧"},
    "missing_kerb_ramp": {"label": "Missing kerb ramp",     "severity": "high",   "penalty": 2.5, "emoji": "⛔"},
    "narrow_passage":    {"label": "Narrow passage",        "severity": "high",   "penalty": 2.0, "emoji": "↔️"},
    "parked_car":        {"label": "Car on sidewalk",       "severity": "high",   "penalty": 2.0, "emoji": "🚗"},
    "parked_bikes":      {"label": "Parked bikes",          "severity": "medium", "penalty": 1.5, "emoji": "🚲"},
    "flood":             {"label": "Flooded / puddle",      "severity": "medium", "penalty": 1.8, "emoji": "💧"},
    "trash":             {"label": "Trash / bins",          "severity": "low",    "penalty": 1.2, "emoji": "🗑️"},
    "street_furniture":  {"label": "Bench / A-board",       "severity": "low",    "penalty": 1.2, "emoji": "🪑"},
    "misc":              {"label": "Other obstacle",        "severity": "medium", "penalty": 1.5, "emoji": "❓"},
}

# Severity → marker radius. Hot-pink fill across all reports keeps the
# "crowdsourced" layer visually distinct from OSM-permanent and live-WIOR.
SEVERITY_RADIUS = {"low": 7, "medium": 10, "high": 13}
REPORT_COLOR = "#ec4899"

# ---------- queries: each returns ways/nodes with the given filter ----------
def q_cobblestone(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["surface"~"^(cobblestone|sett|unhewn_cobblestone)$"]({s},{w},{n},{e});
);
out geom;
"""

def q_smoothness_bad(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["smoothness"~"^(bad|very_bad|horrible|impassable)$"]({s},{w},{n},{e});
);
out geom;
"""

def q_steps(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["highway"="steps"]({s},{w},{n},{e});
);
out geom;
"""

def q_wheelchair_no(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["wheelchair"="no"]({s},{w},{n},{e});
  node["wheelchair"="no"]({s},{w},{n},{e});
);
out geom;
"""

def q_wheelchair_limited(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["wheelchair"="limited"]({s},{w},{n},{e});
  node["wheelchair"="limited"]({s},{w},{n},{e});
);
out geom;
"""

def q_barriers(bbox):
    # Bollards/gates/etc. WITHOUT explicit wheelchair=yes (so they're potential blockers).
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  node["barrier"~"^(bollard|gate|kissing_gate|stile|chain|swing_gate|cycle_barrier|lift_gate|block)$"]
      ["wheelchair"!="yes"]
      ({s},{w},{n},{e});
);
out geom;
"""

def q_high_kerbs(bbox):
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  node["kerb"="raised"]({s},{w},{n},{e});
);
out geom;
"""

def q_steep(bbox):
    # Pull anything with an incline tag, filter > |6%| client-side.
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["incline"]({s},{w},{n},{e});
);
out geom;
"""

def q_narrow(bbox):
    # Pull any pedestrian way with a width or sidewalk:width tag — filter < 1.5m client-side.
    s, w, n, e = bbox
    return f"""
[out:json][timeout:60];
(
  way["highway"~"^(footway|path|pedestrian|living_street|residential|service)$"]["width"]({s},{w},{n},{e});
  way["highway"~"^(footway|path|pedestrian|living_street|residential|service)$"]["sidewalk:width"]({s},{w},{n},{e});
);
out geom;
"""

# ---------- fetch with on-disk cache (Overpass is slow & rate-limited) ----------
def fetch(name: str, query: str) -> dict:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{name}.json"
    if cache_file.exists():
        print(f"  [cache] {name}")
        return json.loads(cache_file.read_text())
    print(f"  [fetch] {name} ...", end=" ", flush=True)
    t0 = time.time()
    res = requests.post(
        OVERPASS_URL,
        data={"data": query},
        headers={"User-Agent": "whale-accessibility-explorer/0.1 (hackathon)"},
        timeout=120,
    )
    res.raise_for_status()
    data = res.json()
    cache_file.write_text(json.dumps(data))
    print(f"{len(data.get('elements', []))} elements in {time.time()-t0:.1f}s")
    return data

# ---------- helpers to draw OSM elements onto a Folium FeatureGroup ----------
def add_ways(group, data, color, weight=4, popup_prefix=""):
    for el in data.get("elements", []):
        if el.get("type") != "way":
            continue
        coords = [(p["lat"], p["lon"]) for p in el.get("geometry", [])]
        if len(coords) < 2:
            continue
        tags = el.get("tags", {})
        popup = f"<b>{popup_prefix}</b><br>" + "<br>".join(
            f"{k}={v}" for k, v in tags.items() if k in (
                "name", "surface", "smoothness", "highway", "wheelchair",
                "incline", "width", "sidewalk:width", "kerb", "kerb:height",
                "_matched",
            )
        )
        folium.PolyLine(
            coords, color=color, weight=weight, opacity=0.8,
            tooltip=popup_prefix, popup=folium.Popup(popup, max_width=300),
        ).add_to(group)

def add_nodes(group, data, color, popup_prefix=""):
    for el in data.get("elements", []):
        if el.get("type") != "node":
            continue
        tags = el.get("tags", {})
        popup = f"<b>{popup_prefix}</b><br>" + "<br>".join(
            f"{k}={v}" for k, v in tags.items()
        )
        folium.CircleMarker(
            location=(el["lat"], el["lon"]),
            radius=6, color=color, fill=True, fillColor=color, fillOpacity=0.85,
            tooltip=popup_prefix, popup=folium.Popup(popup, max_width=300),
        ).add_to(group)

def filter_steep(data, threshold_pct=6):
    """Keep only ways whose incline parses to > |threshold_pct|."""
    kept = {"elements": []}
    for el in data.get("elements", []):
        inc = el.get("tags", {}).get("incline", "")
        # OSM incline can be "5%", "-7%", "up", "down", "yes" — only numeric is useful
        try:
            v = float(inc.replace("%", "").strip())
            if abs(v) > threshold_pct:
                kept["elements"].append(el)
        except ValueError:
            pass
    return kept

def parse_width_m(s: str) -> float | None:
    """OSM width may be '0.8', '0.8 m', '80 cm', '2 ft'. Return meters or None."""
    s = s.strip().lower().replace(",", ".")
    try:
        if s.endswith("cm"):
            return float(s[:-2].strip()) / 100
        if s.endswith("m"):
            return float(s[:-1].strip())
        if s.endswith("ft") or s.endswith("'"):
            return float(s.rstrip("ft'").strip()) * 0.3048
        return float(s)
    except (ValueError, AttributeError):
        return None

def fetch_wior_active(today: datetime.date) -> dict:
    """Fetch all active WIOR (Werk in Uitvoering) features, paginating through.
    Cache keyed by today's date so the file rolls over daily.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"wior-active-{today.isoformat()}.json"
    if cache_file.exists():
        print(f"  [cache] wior-active-{today}")
        return json.loads(cache_file.read_text())

    print(f"  [fetch] wior-active-{today} ...", flush=True)
    features: list = []
    url: str | None = (
        f"{WIOR_URL}?_format=geojson&_pageSize=500"
        f"&datumStartUitvoering[lte]={today.isoformat()}"
        f"&datumEindeUitvoering[gte]={today.isoformat()}"
    )
    pages = 0
    while url:
        res = requests.get(
            url,
            headers={"User-Agent": "whale-accessibility-explorer/0.1 (hackathon)"},
            timeout=120,
        )
        res.raise_for_status()
        data = res.json()
        features.extend(data.get("features", []))
        nxt = next((l["href"] for l in data.get("_links", []) if l.get("rel") == "next"), None)
        url = nxt
        pages += 1
        print(f"    page {pages}: total so far {len(features)}", flush=True)
        if pages > 30:  # safety
            break
    out = {"type": "FeatureCollection", "features": features}
    cache_file.write_text(json.dumps(out))
    return out


def load_reports_in_bbox(bbox) -> list[dict]:
    """Load crowdsourced reports from JSON, filter to bbox, attach category meta."""
    if not REPORTS_FILE.exists():
        print(f"  (no reports file at {REPORTS_FILE})")
        return []
    raw = json.loads(REPORTS_FILE.read_text())
    s, w, n, e = bbox
    out = []
    for r in raw.get("reports", []):
        if not (s <= r["lat"] <= n and w <= r["lng"] <= e):
            continue
        cat = CATEGORIES.get(r["category"])
        if not cat:
            print(f"  ! unknown category in {r['id']}: {r['category']}")
            continue
        out.append({**r, **{"_meta": cat}})
    return out


def filter_to_bbox(geojson: dict, bbox) -> dict:
    """Keep features whose first coordinate or any vertex is within bbox."""
    s, w, n, e = bbox
    kept = []
    for f in geojson.get("features", []):
        geom = f.get("geometry") or {}
        coords = []
        if geom.get("type") == "Polygon":
            coords = geom["coordinates"][0] if geom["coordinates"] else []
        elif geom.get("type") == "MultiPolygon":
            coords = [pt for poly in geom["coordinates"] for pt in poly[0]]
        elif geom.get("type") in ("LineString", "Point"):
            coords = geom["coordinates"] if geom["type"] == "LineString" else [geom["coordinates"]]
        if any(s <= lat <= n and w <= lng <= e for lng, lat in coords):
            kept.append(f)
    return {"type": "FeatureCollection", "features": kept}


def filter_narrow(data, threshold_m=1.5):
    """Keep only ways whose width or sidewalk:width parses to < threshold."""
    kept = {"elements": []}
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        for key in ("width", "sidewalk:width"):
            v = parse_width_m(tags.get(key, "")) if tags.get(key) else None
            if v is not None and v < threshold_m:
                el = {**el, "tags": {**tags, "_matched": f"{key}={v}m"}}
                kept["elements"].append(el)
                break
    return kept

# ---------- main ----------
def main():
    area = sys.argv[1] if len(sys.argv) > 1 else "de-pijp"
    if area not in BBOXES:
        print(f"Unknown area '{area}'. Choose from: {', '.join(BBOXES)}")
        sys.exit(1)
    bbox = BBOXES[area]
    s, w, n, e = bbox
    center = ((s + n) / 2, (w + e) / 2)
    print(f"Exploring '{area}' bbox=({s},{w},{n},{e})")

    today = datetime.date.today()
    print(f"Fetching live construction (WIOR) active on {today}...")
    wior_active = fetch_wior_active(today)
    wior_in_bbox = filter_to_bbox(wior_active, bbox)
    print(f"  {len(wior_active['features'])} active citywide → {len(wior_in_bbox['features'])} inside bbox")

    print("\nLoading crowdsourced obstacle reports...")
    reports = load_reports_in_bbox(bbox)
    print(f"  {len(reports)} reports in bbox")

    print("\nFetching OSM layers from Overpass (cached on disk)...")
    layers = {
        "cobblestone": (fetch(f"{area}-cobble", q_cobblestone(bbox)), "#dc2626", "ways"),
        "bad_smoothness": (fetch(f"{area}-smooth", q_smoothness_bad(bbox)), "#ea580c", "ways"),
        "steps": (fetch(f"{area}-steps", q_steps(bbox)), "#7c3aed", "ways"),
        "wheelchair_no": (fetch(f"{area}-wno", q_wheelchair_no(bbox)), "#991b1b", "both"),
        "wheelchair_limited": (fetch(f"{area}-wlim", q_wheelchair_limited(bbox)), "#ca8a04", "both"),
        "barriers": (fetch(f"{area}-barriers", q_barriers(bbox)), "#111827", "nodes"),
        "high_kerbs": (fetch(f"{area}-kerbs", q_high_kerbs(bbox)), "#92400e", "nodes"),
        "steep": (filter_steep(fetch(f"{area}-incline", q_steep(bbox)), 6), "#db2777", "ways"),
        "narrow": (filter_narrow(fetch(f"{area}-narrow", q_narrow(bbox)), 1.5), "#0891b2", "ways"),
    }

    # ---------- build map ----------
    m = folium.Map(location=center, zoom_start=15, tiles="OpenStreetMap")
    folium.Rectangle(
        bounds=[(s, w), (n, e)], color="#3b82f6", weight=1, fill=False,
        tooltip="exploration bbox",
    ).add_to(m)

    pretty = {
        "cobblestone": "Cobblestones (surface)",
        "bad_smoothness": "Bad smoothness",
        "steps": "Steps (highway=steps)",
        "wheelchair_no": "wheelchair=no",
        "wheelchair_limited": "wheelchair=limited",
        "barriers": "Barriers (no wheelchair=yes)",
        "high_kerbs": "High kerbs (raised)",
        "steep": "Steep ways (>6%)",
        "narrow": "Narrow paths (<150 cm)",
        "wior": "Live construction (WIOR)",
        "reports": "Crowdsourced reports",
    }

    counts: dict[str, int] = {}
    for key, (data, color, kind) in layers.items():
        group = folium.FeatureGroup(name=pretty[key], show=True)
        if kind in ("ways", "both"):
            add_ways(group, data, color, popup_prefix=pretty[key])
        if kind in ("nodes", "both"):
            add_nodes(group, data, color, popup_prefix=pretty[key])
        group.add_to(m)
        counts[key] = len(data.get("elements", []))

    # Live construction (WIOR) — polygons, distinct amber/orange fill
    wior_group = folium.FeatureGroup(name="Live construction (WIOR)", show=True)
    for f in wior_in_bbox["features"]:
        p = f.get("properties", {})
        popup = (
            "<b>Live construction</b><br>"
            f"<b>{p.get('projectnaam','(no name)')}</b><br>"
            f"<i>{p.get('typeWerkzaamheden','')}</i><br>"
            f"{p.get('datumStartUitvoering','')} → {p.get('datumEindeUitvoering','')}<br>"
            f"status: {p.get('hoofdstatus','')}<br>"
            f"<small>{(p.get('beschrijving') or '')[:240]}</small>"
        )
        folium.GeoJson(
            f,
            style_function=lambda _: {
                "color": "#f59e0b",
                "weight": 2,
                "fillColor": "#f59e0b",
                "fillOpacity": 0.35,
            },
            tooltip=p.get("projectnaam", "Construction"),
            popup=folium.Popup(popup, max_width=360),
        ).add_to(wior_group)
    wior_group.add_to(m)
    counts["wior"] = len(wior_in_bbox["features"])

    # Crowdsourced reports — hot-pink markers, radius scales with severity
    reports_group = folium.FeatureGroup(name="Crowdsourced reports", show=True)
    for r in reports:
        meta = r["_meta"]
        popup = (
            f"<b>{meta['emoji']} {meta['label']}</b> "
            f"<small style='color:#666'>(×{meta['penalty']} penalty · {meta['severity']})</small><br>"
            f"<i>{r.get('note','')}</i><br>"
            f"<small>reported {r.get('reported_at','?')} · id {r['id']}</small>"
        )
        folium.CircleMarker(
            location=(r["lat"], r["lng"]),
            radius=SEVERITY_RADIUS[meta["severity"]],
            color=REPORT_COLOR,
            fill=True,
            fillColor=REPORT_COLOR,
            fillOpacity=0.85,
            weight=2,
            tooltip=f"{meta['emoji']} {meta['label']} ({meta['severity']})",
            popup=folium.Popup(popup, max_width=320),
        ).add_to(reports_group)
    reports_group.add_to(m)
    counts["reports"] = len(reports)

    folium.LayerControl(collapsed=False).add_to(m)

    # ---------- summary panel ----------
    summary = "<b>Layer counts</b><br>" + "<br>".join(
        f"{pretty[k]}: <b>{counts[k]}</b>" for k in pretty
    ) + f"<br><br>area: <b>{area}</b><br>bbox: {s},{w}<br>{n},{e}"
    legend_html = f"""
    <div style="position: fixed; bottom: 20px; left: 20px; z-index: 9999;
                background: white; padding: 12px 14px; border: 1px solid #ddd;
                border-radius: 6px; font: 12px system-ui; max-width: 260px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);">{summary}</div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(OUT_HTML))
    print(f"\nSaved -> {OUT_HTML}")
    print(f"Counts: {counts}")
    abs_path = OUT_HTML.resolve()
    print(f"Open: file://{abs_path}")
    if os.environ.get("NO_BROWSER") != "1":
        webbrowser.open(f"file://{abs_path}")


if __name__ == "__main__":
    main()
