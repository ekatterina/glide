/**
 * OSM permanent-obstacle layers, fetched via Overpass.
 *
 * Mirrors scripts/explore_amsterdam.py. Disk-cached in scripts/output/cache/
 * so the Python explorer and this module share cached responses.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_DIR = path.join(process.cwd(), "scripts", "output", "cache");

// Fixed demo bbox: De Pijp + Centrum + Vondelpark + Oost.
// Covers most realistic demo routes; small enough to be Overpass-friendly.
export const DEMO_BBOX: Bbox = [52.345, 4.86, 52.385, 4.95];

export type Bbox = [number, number, number, number]; // [s, w, n, e]

export type OsmElement = {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

export type OsmLayerKey =
  | "cobblestone"
  | "bad_smoothness"
  | "steps"
  | "wheelchair_no"
  | "wheelchair_limited"
  | "barriers"
  | "high_kerbs"
  | "steep"
  | "narrow";

export const OSM_LAYER_META: Record<
  OsmLayerKey,
  { label: string; color: string }
> = {
  cobblestone: { label: "Cobblestones", color: "#dc2626" },
  bad_smoothness: { label: "Bad smoothness", color: "#ea580c" },
  steps: { label: "Steps", color: "#7c3aed" },
  wheelchair_no: { label: "wheelchair=no", color: "#991b1b" },
  wheelchair_limited: { label: "wheelchair=limited", color: "#ca8a04" },
  barriers: { label: "Barriers", color: "#111827" },
  high_kerbs: { label: "High kerbs", color: "#92400e" },
  steep: { label: "Steep ways (>6%)", color: "#db2777" },
  narrow: { label: "Narrow paths (<150 cm)", color: "#0891b2" },
};

const queries: Record<OsmLayerKey, (b: Bbox) => string> = {
  cobblestone: ([s, w, n, e]) => `
[out:json][timeout:60];
( way["surface"~"^(cobblestone|sett|unhewn_cobblestone)$"](${s},${w},${n},${e}); );
out geom;`,
  bad_smoothness: ([s, w, n, e]) => `
[out:json][timeout:60];
( way["smoothness"~"^(bad|very_bad|horrible|impassable)$"](${s},${w},${n},${e}); );
out geom;`,
  steps: ([s, w, n, e]) => `
[out:json][timeout:60];
( way["highway"="steps"](${s},${w},${n},${e}); );
out geom;`,
  wheelchair_no: ([s, w, n, e]) => `
[out:json][timeout:60];
(
  way["wheelchair"="no"](${s},${w},${n},${e});
  node["wheelchair"="no"](${s},${w},${n},${e});
);
out geom;`,
  wheelchair_limited: ([s, w, n, e]) => `
[out:json][timeout:60];
(
  way["wheelchair"="limited"](${s},${w},${n},${e});
  node["wheelchair"="limited"](${s},${w},${n},${e});
);
out geom;`,
  barriers: ([s, w, n, e]) => `
[out:json][timeout:60];
(
  node["barrier"~"^(bollard|gate|kissing_gate|stile|chain|swing_gate|cycle_barrier|lift_gate|block)$"]
      ["wheelchair"!="yes"](${s},${w},${n},${e});
);
out geom;`,
  high_kerbs: ([s, w, n, e]) => `
[out:json][timeout:60];
( node["kerb"="raised"](${s},${w},${n},${e}); );
out geom;`,
  steep: ([s, w, n, e]) => `
[out:json][timeout:60];
( way["incline"](${s},${w},${n},${e}); );
out geom;`,
  narrow: ([s, w, n, e]) => `
[out:json][timeout:60];
(
  way["highway"~"^(footway|path|pedestrian|living_street|residential|service)$"]["width"](${s},${w},${n},${e});
  way["highway"~"^(footway|path|pedestrian|living_street|residential|service)$"]["sidewalk:width"](${s},${w},${n},${e});
);
out geom;`,
};

function bboxKey(bbox: Bbox): string {
  return createHash("sha1").update(JSON.stringify(bbox)).digest("hex").slice(0, 8);
}

async function readCache(file: string): Promise<{ elements: OsmElement[] } | null> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(file: string, data: { elements: OsmElement[] }) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
}

async function fetchLayer(
  layer: OsmLayerKey,
  bbox: Bbox,
): Promise<{ elements: OsmElement[] }> {
  const key = bboxKey(bbox);
  const cachePath = path.join(CACHE_DIR, `osm-${layer}-${key}.json`);
  const cached = await readCache(cachePath);
  if (cached) return cached;

  const body = new URLSearchParams({ data: queries[layer](bbox) });
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": "whale-accessible-route/0.1",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) return { elements: [] };
  const data = (await res.json()) as { elements: OsmElement[] };
  await writeCache(cachePath, data);
  return data;
}

function parseWidthM(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.trim().toLowerCase().replace(",", ".");
  try {
    if (t.endsWith("cm")) return parseFloat(t.slice(0, -2)) / 100;
    if (t.endsWith("m")) return parseFloat(t.slice(0, -1));
    return parseFloat(t);
  } catch {
    return null;
  }
}

function filterSteep(data: { elements: OsmElement[] }, threshold = 6) {
  return {
    elements: data.elements.filter((el) => {
      const inc = el.tags?.incline ?? "";
      const v = parseFloat(inc.replace("%", "").trim());
      return Number.isFinite(v) && Math.abs(v) > threshold;
    }),
  };
}

function filterNarrow(data: { elements: OsmElement[] }, threshold = 1.5) {
  return {
    elements: data.elements.filter((el) => {
      const w =
        parseWidthM(el.tags?.width) ?? parseWidthM(el.tags?.["sidewalk:width"]);
      return w !== null && w < threshold;
    }),
  };
}

export type OsmObstacleSet = Record<OsmLayerKey, { elements: OsmElement[] }>;

export async function fetchOsmObstacles(
  bbox: Bbox = DEMO_BBOX,
): Promise<OsmObstacleSet> {
  const layers = Object.keys(queries) as OsmLayerKey[];
  const results = await Promise.all(layers.map((l) => fetchLayer(l, bbox)));
  const out: Partial<OsmObstacleSet> = {};
  for (let i = 0; i < layers.length; i++) {
    out[layers[i]] = results[i];
  }
  out.steep = filterSteep(out.steep!);
  out.narrow = filterNarrow(out.narrow!);
  return out as OsmObstacleSet;
}
