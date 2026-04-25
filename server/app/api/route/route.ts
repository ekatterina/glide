import { NextResponse } from "next/server";
import {
  getWheelchairRoute,
  NoRouteError,
  UpstreamError,
  type LatLng,
} from "@/lib/routing";
import { scoreRoute } from "@/lib/accessibility";

const AMSTERDAM_BBOX = {
  minLat: 52.28,
  maxLat: 52.43,
  minLng: 4.72,
  maxLng: 5.08,
};

function isLatLng(v: unknown): v is LatLng {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

function inBbox([lat, lng]: LatLng): boolean {
  return (
    lat >= AMSTERDAM_BBOX.minLat &&
    lat <= AMSTERDAM_BBOX.maxLat &&
    lng >= AMSTERDAM_BBOX.minLng &&
    lng <= AMSTERDAM_BBOX.maxLng
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  const { from, to } = (body ?? {}) as { from?: unknown; to?: unknown };
  if (!isLatLng(from) || !isLatLng(to)) {
    return NextResponse.json(
      {
        error: "invalid_coordinates",
        expected: '{ from: [lat, lng], to: [lat, lng] }',
      },
      { status: 400 },
    );
  }

  if (!inBbox(from) || !inBbox(to)) {
    return NextResponse.json(
      {
        error: "out_of_bounds",
        message: "MVP only supports Amsterdam.",
        bbox: AMSTERDAM_BBOX,
      },
      { status: 400 },
    );
  }

  try {
    const orsRoutes = await getWheelchairRoute(from, to, {
      alternativeCount: 3,
    });
    const scored = orsRoutes
      .map(scoreRoute)
      .sort((a, b) => b.accessibility_score - a.accessibility_score);
    return NextResponse.json({ routes: scored });
  } catch (e) {
    if (e instanceof NoRouteError) {
      return NextResponse.json(
        {
          error: "no_accessible_route",
          reason: "constraints_unsatisfiable",
          message: e.message,
        },
        { status: 422 },
      );
    }
    if (e instanceof UpstreamError) {
      return NextResponse.json(
        { error: "upstream_error", upstream_status: e.status, body: e.body },
        { status: 502 },
      );
    }
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json(
      { error: "internal_error", message: msg },
      { status: 500 },
    );
  }
}
