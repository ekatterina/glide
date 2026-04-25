import { NextResponse } from "next/server";
import {
  CATEGORIES,
  fetchActiveConstruction,
  loadReports,
} from "@/lib/obstacles";
import {
  fetchOsmObstacles,
  OSM_LAYER_META,
  type OsmObstacleSet,
} from "@/lib/osm-obstacles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeOsm = searchParams.get("osm") === "1";

  const [reports, construction, osm] = await Promise.all([
    loadReports(),
    fetchActiveConstruction().catch(() => []),
    includeOsm
      ? fetchOsmObstacles().catch(() => null as OsmObstacleSet | null)
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    reports,
    construction,
    categories: CATEGORIES,
    osm,
    osm_meta: includeOsm ? OSM_LAYER_META : null,
  });
}
