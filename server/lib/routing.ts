export type LatLng = [number, number];

export type Position = [number, number] | [number, number, number];
export type LineString = { type: "LineString"; coordinates: Position[] };

export type ORSSegment = {
  start_index: number;
  end_index: number;
  length_m: number;
  midpoint: LatLng;
  surface?: string;
  smoothness?: string;
  incline_pct?: number;
  waycategory?: string;
  waytype?: string;
  roadaccessrestriction?: string;
};

export type ORSRoute = {
  geometry: LineString;
  distance_m: number;
  duration_s: number;
  segments: ORSSegment[];
};

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoRouteError";
  }
}

export class UpstreamError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`ORS upstream ${status}`);
    this.name = "UpstreamError";
    this.status = status;
    this.body = body;
  }
}

const ORS_URL =
  "https://api.openrouteservice.org/v2/directions/wheelchair/geojson";

const SURFACE_CODES: Record<number, string> = {
  0: "unknown",
  1: "paved",
  2: "unpaved",
  3: "asphalt",
  4: "concrete",
  5: "concrete:lanes",
  6: "concrete:plates",
  7: "paving_stones",
  8: "cobblestone",
  9: "metal",
  10: "wood",
  11: "compacted_gravel",
  12: "fine_gravel",
  13: "gravel",
  14: "dirt",
  15: "ground",
  16: "ice",
  17: "paving_stones:30",
  18: "sett",
  19: "unhewn_cobblestone",
  20: "grass",
  21: "grass_paver",
  22: "metal_grid",
  23: "pebblestone",
  24: "salt",
  25: "sand",
  26: "wood",
  27: "woodchips",
  28: "snow",
  29: "rock",
};

const SMOOTHNESS_CODES: Record<number, string> = {
  0: "unknown",
  1: "excellent",
  2: "good",
  3: "intermediate",
  4: "bad",
  5: "very_bad",
  6: "horrible",
  7: "very_horrible",
  8: "impassable",
};

const STEEPNESS_TO_PCT: Record<number, number> = {
  [-5]: -16,
  [-4]: -12,
  [-3]: -7,
  [-2]: -4,
  [-1]: -1.5,
  0: 0,
  1: 1.5,
  2: 4,
  3: 7,
  4: 12,
  5: 16,
};

const WAYCATEGORY_FLAGS: Record<number, string> = {
  1: "highway",
  2: "tollways",
  4: "steps",
  8: "ferries",
  16: "unpaved_roads",
  32: "tracks",
  64: "tunnels",
  128: "paved_roads",
  256: "fords",
};

const ROADACCESS_CODES: Record<number, string> = {
  0: "none",
  1: "no",
  2: "customers",
  4: "destination",
  8: "delivery",
  16: "private",
  32: "permissive",
};

const WAYTYPE_CODES: Record<number, string> = {
  0: "unknown",
  1: "state_road",
  2: "road",
  3: "street",
  4: "path",
  5: "track",
  6: "cycleway",
  7: "footway",
  8: "steps",
  9: "ferry",
  10: "construction",
};

function decodeWaycategory(code: number): string | undefined {
  const flags: string[] = [];
  for (const [bit, label] of Object.entries(WAYCATEGORY_FLAGS)) {
    if ((code & Number(bit)) !== 0) flags.push(label);
  }
  return flags.length > 0 ? flags.join(",") : undefined;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type ExtraTriplet = [number, number, number];

type ORSResponse = {
  features: Array<{
    geometry: LineString;
    properties: {
      summary: { distance: number; duration: number };
      extras?: {
        surface?: { values: ExtraTriplet[] };
        smoothness?: { values: ExtraTriplet[] };
        steepness?: { values: ExtraTriplet[] };
        waycategory?: { values: ExtraTriplet[] };
        waytype?: { values: ExtraTriplet[] };
        roadaccessrestrictions?: { values: ExtraTriplet[] };
      };
    };
  }>;
  error?: { code: number; message: string };
};

function buildSegments(
  coords: Position[],
  extras: ORSResponse["features"][number]["properties"]["extras"],
): ORSSegment[] {
  const breakpoints = new Set<number>();
  breakpoints.add(0);
  breakpoints.add(coords.length - 1);
  const lists = [
    extras?.surface?.values,
    extras?.smoothness?.values,
    extras?.steepness?.values,
    extras?.waycategory?.values,
    extras?.waytype?.values,
    extras?.roadaccessrestrictions?.values,
  ];
  for (const list of lists) {
    if (!list) continue;
    for (const [from, to] of list) {
      breakpoints.add(from);
      breakpoints.add(to);
    }
  }
  const sorted = [...breakpoints].sort((a, b) => a - b);

  const findExtra = (
    list: ExtraTriplet[] | undefined,
    idx: number,
  ): number | undefined => {
    if (!list) return undefined;
    for (const [from, to, val] of list) {
      if (idx >= from && idx < to) return val;
    }
    return undefined;
  };

  const segments: ORSSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    let length = 0;
    for (let j = start; j < end && j + 1 < coords.length; j++) {
      length += haversine(
        coords[j] as [number, number],
        coords[j + 1] as [number, number],
      );
    }
    const mid = coords[Math.floor((start + end) / 2)] as [number, number];
    const surfaceCode = findExtra(extras?.surface?.values, start);
    const smoothnessCode = findExtra(extras?.smoothness?.values, start);
    const steepnessCode = findExtra(extras?.steepness?.values, start);
    const waycategoryCode = findExtra(extras?.waycategory?.values, start);
    const waytypeCode = findExtra(extras?.waytype?.values, start);
    const roadaccessCode = findExtra(
      extras?.roadaccessrestrictions?.values,
      start,
    );
    segments.push({
      start_index: start,
      end_index: end,
      length_m: length,
      midpoint: [mid[1], mid[0]],
      surface: surfaceCode !== undefined ? SURFACE_CODES[surfaceCode] : undefined,
      smoothness:
        smoothnessCode !== undefined ? SMOOTHNESS_CODES[smoothnessCode] : undefined,
      incline_pct:
        steepnessCode !== undefined ? STEEPNESS_TO_PCT[steepnessCode] : undefined,
      waycategory:
        waycategoryCode !== undefined ? decodeWaycategory(waycategoryCode) : undefined,
      waytype: waytypeCode !== undefined ? WAYTYPE_CODES[waytypeCode] : undefined,
      roadaccessrestriction:
        roadaccessCode !== undefined ? ROADACCESS_CODES[roadaccessCode] : undefined,
    });
  }
  return segments;
}

export async function getWheelchairRoute(
  from: LatLng,
  to: LatLng,
  options: { alternativeCount?: number } = {},
): Promise<ORSRoute[]> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    throw new Error("ORS_API_KEY not set");
  }

  const altCount = options.alternativeCount ?? 1;

  const body: Record<string, unknown> = {
    coordinates: [
      [from[1], from[0]],
      [to[1], to[0]],
    ],
    preference: "recommended",
    extra_info: [
      "surface",
      "waycategory",
      "waytype",
      "steepness",
      "roadaccessrestrictions",
    ],
    instructions: false,
    options: {
      profile_params: {
        restrictions: {
          minimum_width: 1.5,
          maximum_sloped_kerb: 0.03,
          maximum_incline: 6,
        },
      },
    },
  };

  if (altCount > 1) {
    body.alternative_routes = {
      target_count: altCount,
      share_factor: 0.6,
      weight_factor: 1.6,
    };
  }

  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (res.status === 404) {
    throw new NoRouteError("ORS could not find a route under given constraints");
  }
  if (!res.ok) {
    let parsed: { error?: { message?: string } } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore
    }
    if (
      parsed?.error?.message &&
      /not found|could not find|no route/i.test(parsed.error.message)
    ) {
      throw new NoRouteError(parsed.error.message);
    }
    throw new UpstreamError(res.status, text);
  }

  const data = JSON.parse(text) as ORSResponse;
  const feats = data.features ?? [];
  if (feats.length === 0) {
    throw new NoRouteError("ORS returned no features");
  }

  return feats.map((feat) => {
    const coords = feat.geometry.coordinates as Position[];
    const segments = buildSegments(coords, feat.properties.extras);
    return {
      geometry: feat.geometry,
      distance_m: feat.properties.summary.distance,
      duration_s: feat.properties.summary.duration,
      segments,
    };
  });
}
