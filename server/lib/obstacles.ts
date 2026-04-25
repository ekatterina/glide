/**
 * Obstacle data — crowdsourced reports + live WIOR construction.
 *
 * Single source of truth for the category taxonomy + severity/penalty
 * multipliers. Mirrored in scripts/explore_amsterdam.py CATEGORIES.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export type Severity = "low" | "medium" | "high";

export type CategoryKey =
  | "broken_pavement"
  | "scaffolding"
  | "temp_fence"
  | "missing_kerb_ramp"
  | "narrow_passage"
  | "parked_car"
  | "parked_bikes"
  | "flood"
  | "trash"
  | "street_furniture"
  | "misc";

export type CategoryMeta = {
  label: string;
  severity: Severity;
  penalty: number;
  emoji: string;
};

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  broken_pavement: { label: "Broken pavement", severity: "high", penalty: 2.5, emoji: "🕳️" },
  scaffolding: { label: "Unmapped scaffolding", severity: "high", penalty: 2.5, emoji: "🏗️" },
  temp_fence: { label: "Temporary fence", severity: "high", penalty: 2.5, emoji: "🚧" },
  missing_kerb_ramp: { label: "Missing kerb ramp", severity: "high", penalty: 2.5, emoji: "⛔" },
  narrow_passage: { label: "Narrow passage", severity: "high", penalty: 2.0, emoji: "↔️" },
  parked_car: { label: "Car on sidewalk", severity: "high", penalty: 2.0, emoji: "🚗" },
  parked_bikes: { label: "Parked bikes", severity: "medium", penalty: 1.5, emoji: "🚲" },
  flood: { label: "Flooded / puddle", severity: "medium", penalty: 1.8, emoji: "💧" },
  trash: { label: "Trash / bins", severity: "low", penalty: 1.2, emoji: "🗑️" },
  street_furniture: { label: "Bench / A-board", severity: "low", penalty: 1.2, emoji: "🪑" },
  misc: { label: "Other obstacle", severity: "medium", penalty: 1.5, emoji: "❓" },
};

export const SEVERITY_RADIUS: Record<Severity, number> = {
  low: 7,
  medium: 10,
  high: 13,
};

export const REPORT_COLOR = "#ec4899"; // hot pink
export const CONSTRUCTION_COLOR = "#f59e0b"; // amber

export type Report = {
  id: string;
  lat: number;
  lng: number;
  category: CategoryKey;
  note?: string;
  reported_at?: string;
};

export type ConstructionZone = {
  id: string;
  project_name: string;
  description: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

const REPORTS_PATH = path.join(process.cwd(), "scripts", "data", "reports.json");
const WIOR_URL = "https://api.data.amsterdam.nl/v1/wior/wior/";

export async function loadReports(): Promise<Report[]> {
  try {
    const raw = await readFile(REPORTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as { reports?: Report[] };
    const valid: Report[] = [];
    for (const r of parsed.reports ?? []) {
      if (!CATEGORIES[r.category]) continue;
      valid.push(r);
    }
    return valid;
  } catch {
    return [];
  }
}

let wiorCache: { fetched_at: number; date: string; data: ConstructionZone[] } | null = null;
const WIOR_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function fetchActiveConstruction(): Promise<ConstructionZone[]> {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  if (
    wiorCache &&
    wiorCache.date === today &&
    now - wiorCache.fetched_at < WIOR_TTL_MS
  ) {
    return wiorCache.data;
  }

  const all: ConstructionZone[] = [];
  let url: string | null =
    `${WIOR_URL}?_format=geojson&_pageSize=500` +
    `&datumStartUitvoering[lte]=${today}&datumEindeUitvoering[gte]=${today}`;
  let pages = 0;
  while (url && pages < 30) {
    const res = await fetch(url, {
      headers: { "User-Agent": "whale-accessible-route/0.1" },
    });
    if (!res.ok) break;
    const json = (await res.json()) as {
      features?: Array<{
        id: string;
        geometry: ConstructionZone["geometry"];
        properties: Record<string, unknown>;
      }>;
      _links?: Array<{ rel: string; href: string }>;
    };
    for (const f of json.features ?? []) {
      const p = f.properties;
      all.push({
        id: String(p.id ?? f.id),
        project_name: String(p.projectnaam ?? ""),
        description: String(p.beschrijving ?? ""),
        type: String(p.typeWerkzaamheden ?? ""),
        status: String(p.hoofdstatus ?? ""),
        start_date: String(p.datumStartUitvoering ?? ""),
        end_date: String(p.datumEindeUitvoering ?? ""),
        geometry: f.geometry,
      });
    }
    const next = json._links?.find((l) => l.rel === "next");
    url = next?.href ?? null;
    pages++;
  }

  wiorCache = { fetched_at: now, date: today, data: all };
  return all;
}
