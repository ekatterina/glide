import type { LatLng, LineString, ORSRoute, ORSSegment } from "./routing";

export type WarningType =
  | "cobblestone"
  | "smoothness"
  | "incline"
  | "wheelchair_limited"
  | "edge_case";

export type Warning = {
  type: WarningType;
  message: string;
  location: LatLng;
  length_m?: number;
};

export type WaytypeBreakdown = Record<string, { length_m: number; pct: number }>;

export type ScoredRoute = {
  geometry: LineString;
  distance_m: number;
  duration_s: number;
  accessibility_score: number;
  warnings: Warning[];
  waytype_breakdown: WaytypeBreakdown;
};

const SURFACE_PENALTY: Record<string, number> = {
  asphalt: 1.0,
  concrete: 1.0,
  "concrete:lanes": 1.0,
  "concrete:plates": 1.0,
  paved: 1.0,
  paving_stones: 1.3,
  "paving_stones:30": 1.3,
  metal: 1.5,
  wood: 1.5,
  cobblestone: 3.0,
  sett: 3.0,
  unhewn_cobblestone: 4.0,
  compacted_gravel: 2.0,
  fine_gravel: 2.5,
  gravel: 3.0,
  pebblestone: 3.0,
  unpaved: 2.5,
  dirt: 3.5,
  ground: 3.0,
  grass: 4.0,
  grass_paver: 2.0,
  sand: 4.0,
  mud: 5.0,
  ice: 5.0,
  snow: 4.0,
};

const ROUGH_SURFACES = new Set([
  "compacted_gravel",
  "fine_gravel",
  "gravel",
  "pebblestone",
  "unpaved",
  "dirt",
  "ground",
  "grass",
  "sand",
]);

const SMOOTHNESS_PENALTY: Record<string, number> = {
  excellent: 1.0,
  good: 1.0,
  intermediate: 1.5,
  bad: 3.0,
  very_bad: 3.5,
  horrible: 4.0,
};

const COBBLESTONE_SURFACES = new Set([
  "cobblestone",
  "sett",
  "unhewn_cobblestone",
]);

const WARNING_MIN_LENGTH_M = 30;

function inclinePenalty(pct: number | undefined): number {
  if (pct === undefined) return 1.0;
  const abs = Math.abs(pct);
  if (abs <= 3) return 1.0;
  if (abs <= 6) return 1 + (abs - 3) / 10;
  return 2.0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

type Group = {
  type: WarningType;
  start: number;
  end: number;
  length_m: number;
  midpoint: LatLng;
  detail?: string;
};

function classifySegment(seg: ORSSegment): WarningType | null {
  if (seg.surface && COBBLESTONE_SURFACES.has(seg.surface)) return "cobblestone";
  if (seg.surface && ROUGH_SURFACES.has(seg.surface)) return "smoothness";
  if (
    seg.smoothness &&
    (seg.smoothness === "bad" ||
      seg.smoothness === "very_bad" ||
      seg.smoothness === "horrible")
  ) {
    return "smoothness";
  }
  // Tier-1 already blocks >6%. Warn on sustained 3–6% noticeable climbs.
  if (seg.incline_pct !== undefined && Math.abs(seg.incline_pct) >= 3) {
    return "incline";
  }
  if (
    seg.roadaccessrestriction &&
    seg.roadaccessrestriction !== "none" &&
    seg.roadaccessrestriction !== "permissive"
  ) {
    return "wheelchair_limited";
  }
  if (seg.waycategory && /steps|ferries|fords/.test(seg.waycategory)) {
    return "edge_case";
  }
  return null;
}

function buildWarnings(segments: ORSSegment[]): Warning[] {
  const groups: Group[] = [];
  let cur: Group | null = null;

  for (const seg of segments) {
    const type = classifySegment(seg);
    if (type === null) {
      if (cur) {
        groups.push(cur);
        cur = null;
      }
      continue;
    }
    const detail =
      type === "cobblestone"
        ? seg.surface
        : type === "smoothness"
          ? (seg.surface ?? seg.smoothness)
          : type === "incline"
            ? `${Math.round(seg.incline_pct ?? 0)}%`
            : type === "wheelchair_limited"
              ? seg.roadaccessrestriction
              : seg.waycategory;

    if (cur && cur.type === type && cur.detail === detail) {
      cur.end = seg.end_index;
      cur.length_m += seg.length_m;
      cur.midpoint = seg.midpoint;
    } else {
      if (cur) groups.push(cur);
      cur = {
        type,
        start: seg.start_index,
        end: seg.end_index,
        length_m: seg.length_m,
        midpoint: seg.midpoint,
        detail,
      };
    }
  }
  if (cur) groups.push(cur);

  const warnings: Warning[] = [];
  for (const g of groups) {
    if (g.length_m < WARNING_MIN_LENGTH_M && g.type !== "edge_case") continue;
    const lenLabel = `${Math.round(g.length_m)} m`;
    let message: string;
    switch (g.type) {
      case "cobblestone":
        message = `${lenLabel} ${g.detail ?? "cobblestone"} surface`;
        break;
      case "smoothness":
        message = `${lenLabel} ${g.detail && g.detail !== "unknown" ? `${g.detail} ` : ""}rough surface`;
        break;
      case "incline":
        message = `${lenLabel} incline ${g.detail}`;
        break;
      case "wheelchair_limited":
        message = `${lenLabel} restricted access (${g.detail})`;
        break;
      case "edge_case":
        message = `Crossing ${g.detail}`;
        break;
    }
    warnings.push({
      type: g.type,
      message,
      location: g.midpoint,
      length_m: Math.round(g.length_m),
    });
  }
  return warnings;
}

export function scoreRoute(route: ORSRoute): ScoredRoute {
  let raw = 0;
  let penalized = 0;
  const waytypeLen: Record<string, number> = {};

  for (const seg of route.segments) {
    const sP = seg.surface ? (SURFACE_PENALTY[seg.surface] ?? 1.0) : 1.0;
    const smP = seg.smoothness ? (SMOOTHNESS_PENALTY[seg.smoothness] ?? 1.0) : 1.0;
    const iP = inclinePenalty(seg.incline_pct);
    const limP =
      seg.roadaccessrestriction &&
      seg.roadaccessrestriction !== "none" &&
      seg.roadaccessrestriction !== "permissive"
        ? 1.5
        : 1.0;
    raw += seg.length_m;
    penalized += seg.length_m * sP * smP * iP * limP;

    const wt = seg.waytype ?? "unknown";
    waytypeLen[wt] = (waytypeLen[wt] ?? 0) + seg.length_m;
  }

  const score = penalized > 0 ? clamp(Math.round((100 * raw) / penalized), 0, 100) : 100;

  const waytype_breakdown: WaytypeBreakdown = {};
  if (raw > 0) {
    for (const [k, v] of Object.entries(waytypeLen)) {
      waytype_breakdown[k] = {
        length_m: Math.round(v),
        pct: Math.round((100 * v) / raw),
      };
    }
  }

  return {
    geometry: route.geometry,
    distance_m: Math.round(route.distance_m),
    duration_s: Math.round(route.duration_s),
    accessibility_score: score,
    warnings: buildWarnings(route.segments),
    waytype_breakdown,
  };
}
