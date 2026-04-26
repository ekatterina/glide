import { NextResponse } from "next/server";
import {
  classifyPhoto,
  ClassifyError,
  CATEGORY_KEYS,
  type Classification,
} from "@/lib/classify";
import { appendReport, type Report } from "@/lib/obstacles";

const DEMO_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Bicycles_parked_along_the_canals_of_Amsterdam_%282%29.jpg/640px-Bicycles_parked_along_the_canals_of_Amsterdam_%282%29.jpg";

const AMSTERDAM_BBOX = {
  minLat: 52.28,
  maxLat: 52.43,
  minLng: 4.72,
  maxLng: 5.08,
};

function inAmsterdam(lat: number, lng: number): boolean {
  return (
    lat >= AMSTERDAM_BBOX.minLat &&
    lat <= AMSTERDAM_BBOX.maxLat &&
    lng >= AMSTERDAM_BBOX.minLng &&
    lng <= AMSTERDAM_BBOX.maxLng
  );
}

type ClassifyBody = {
  action: "classify";
  photo_base64?: string;
  media_type?: string;
  use_demo?: boolean;
};

type SaveBody = {
  action: "save";
  classification: Classification;
  lat: number;
  lng: number;
  note?: string;
};

type Body = ClassifyBody | SaveBody;

function isClassify(b: Body): b is ClassifyBody {
  return b.action === "classify";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (isClassify(body)) {
    return await handleClassify(body);
  }

  if (body.action === "save") {
    return await handleSave(body);
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

async function handleClassify(body: ClassifyBody) {
  if (!body.use_demo && !body.photo_base64) {
    return NextResponse.json(
      { error: "missing_photo", message: "Provide photo_base64 or use_demo: true" },
      { status: 400 },
    );
  }

  try {
    const classification = body.use_demo
      ? await classifyPhoto({ url: DEMO_IMAGE_URL })
      : await classifyPhoto({
          base64: body.photo_base64,
          mediaTypeHint: body.media_type,
        });
    return NextResponse.json({ classification });
  } catch (e) {
    if (e instanceof ClassifyError) {
      return NextResponse.json(
        { error: "classification_failed", message: e.message },
        { status: 422 },
      );
    }
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json(
      { error: "internal_error", message: msg },
      { status: 500 },
    );
  }
}

async function handleSave(body: SaveBody) {
  const { classification, lat, lng, note } = body;

  if (
    !classification ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return NextResponse.json(
      { error: "invalid_body", expected: "{classification, lat, lng, note?}" },
      { status: 400 },
    );
  }

  if (!CATEGORY_KEYS.includes(classification.category as (typeof CATEGORY_KEYS)[number])) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  if (!inAmsterdam(lat, lng)) {
    return NextResponse.json(
      { error: "out_of_bounds", message: "Coordinates must be within Amsterdam." },
      { status: 400 },
    );
  }

  const id = `r-${Date.now().toString(36)}`;
  const combinedNote = note?.trim()
    ? `${classification.description} — ${note.trim()}`
    : classification.description;

  const newReport: Report = {
    id,
    lat,
    lng,
    category: classification.category as Report["category"],
    note: combinedNote,
    reported_at: new Date().toISOString().slice(0, 10),
  };

  await appendReport(newReport);

  return NextResponse.json({ report: newReport, classification });
}
