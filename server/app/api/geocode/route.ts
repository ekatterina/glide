import { NextResponse } from "next/server";

const AMSTERDAM_VIEWBOX = "4.72,52.43,5.08,52.28"; // lng_left, lat_top, lng_right, lat_bottom

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing_q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "nl");
  url.searchParams.set("viewbox", AMSTERDAM_VIEWBOX);
  url.searchParams.set("bounded", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "whale-accessible-route-planner/0.1 (hackathon)",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "upstream_error", upstream_status: res.status },
      { status: 502 },
    );
  }

  const hits = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = hits[0];
  if (!hit) {
    return NextResponse.json({ error: "no_match", q }, { status: 404 });
  }

  return NextResponse.json({
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    display_name: hit.display_name,
  });
}
