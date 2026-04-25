import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const year = searchParams.get("year");
  const radius = searchParams.get("radius") ?? "25";

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing required query params: lat, lng" },
      { status: 400 },
    );
  }

  const upstream = new URL("https://api.data.amsterdam.nl/panorama/panoramas/");
  upstream.searchParams.set("near", `${lng},${lat}`);
  upstream.searchParams.set("srid", "4326");
  upstream.searchParams.set("radius", radius);
  upstream.searchParams.set("limit_results", "1");
  // The API's mission_year param is ignored — use tags=mission-YYYY instead.
  if (year) upstream.searchParams.set("tags", `mission-${year}`);
  else upstream.searchParams.set("newest_in_range", "true");

  const res = await fetch(upstream.toString());
  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream error ${res.status}`, upstream_url: upstream.toString() },
      { status: 502 },
    );
  }

  const data = await res.json();
  const pano = data?._embedded?.panoramas?.[0];

  if (!pano) {
    return NextResponse.json({
      found: false,
      query: { lat, lng, year, radius },
      upstream_url: upstream.toString(),
    });
  }

  return NextResponse.json({
    found: true,
    query: { lat, lng, year, radius },
    panorama_id: pano.pano_id,
    timestamp: pano.timestamp,
    mission_year: pano.mission_year,
    geometry: pano.geometry,
    images: {
      equirectangular_full: pano._links?.equirectangular_full?.href,
      equirectangular_medium: pano._links?.equirectangular_medium?.href,
      equirectangular_small: pano._links?.equirectangular_small?.href,
      cubic_img_preview: pano._links?.cubic_img_preview?.href,
      thumbnail: pano._links?.thumbnail?.href,
    },
    upstream_url: upstream.toString(),
  });
}
