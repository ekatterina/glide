import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Category schema mirrors lib/obstacles.ts CATEGORIES — must stay in sync.
// Claude returns one of these literal strings; the routing-side report
// pipeline already knows how to render and score each one.
export const CATEGORY_KEYS = [
  "broken_pavement",
  "scaffolding",
  "temp_fence",
  "missing_kerb_ramp",
  "narrow_passage",
  "parked_car",
  "parked_bikes",
  "flood",
  "trash",
  "street_furniture",
  "misc",
] as const;

export const ClassificationSchema = z.object({
  category: z.enum(CATEGORY_KEYS),
  severity: z.enum(["low", "medium", "high"]),
  description: z
    .string()
    .min(1)
    .max(280)
    .describe("One factual sentence describing what is in the photo."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident the classification is, 0 to 1."),
});

export type Classification = z.infer<typeof ClassificationSchema>;

// System prompt is a single string so it can be cached as one block.
const SYSTEM_PROMPT = `You classify photos of sidewalk obstructions for an Amsterdam wheelchair-route planner.

Your job: look at the photo, decide which CATEGORY best describes the obstruction, judge SEVERITY for a manual wheelchair user, and write a one-sentence factual DESCRIPTION of what is visible.

CATEGORIES — pick exactly one:
- broken_pavement: heaved or sunken paving, tree-root damage, potholes, cracks
- scaffolding: scaffolding or building works not on the city's WIOR map
- temp_fence: temporary fencing for events, festivals, or security
- missing_kerb_ramp: a kerb without a dropped/ramped section where a crossing exists
- narrow_passage: bollards, planters, or features pinching effective width below 1.5m
- parked_car: a vehicle parked on the sidewalk
- parked_bikes: bicycles locked or piled up so they block sidewalk passage
- flood: standing water or puddles from poor drainage
- trash: waste bins, refuse bags, or piles obstructing the path
- street_furniture: cafe A-boards, benches, signs, planters reducing passable width
- misc: a real obstruction that doesn't match any of the above

If the photo shows no obstruction at all, still pick the closest category (usually "misc"), use severity "low", and describe what you actually see.

SEVERITY:
- low: minor inconvenience, easily passable
- medium: requires careful navigation but still passable
- high: blocks the entire sidewalk or creates a hard barrier

Be calibrated about CONFIDENCE: 0.9+ only if the obstruction type is unambiguous in the image; lower if the photo is dark, partial, or could plausibly be classified differently.`;

const client = new Anthropic();

const MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export type ClassifyInput = {
  // Either a base64-encoded image (from the frontend File API)…
  base64?: string;
  mediaTypeHint?: string; // "jpeg" | "png" | "gif" | "webp" or full mime
  // …or a publicly-reachable URL (used by the demo image path).
  url?: string;
};

export class ClassifyError extends Error {}

function resolveMediaType(hint?: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (!hint) return "image/jpeg";
  const lower = hint.toLowerCase();
  if (lower.startsWith("image/")) {
    if (lower === "image/jpeg" || lower === "image/png" || lower === "image/gif" || lower === "image/webp") {
      return lower;
    }
    return "image/jpeg";
  }
  return MEDIA_TYPES[lower] ?? "image/jpeg";
}

export async function classifyPhoto(input: ClassifyInput): Promise<Classification> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ClassifyError("ANTHROPIC_API_KEY not set");
  }

  const imageBlock =
    input.url
      ? ({
          type: "image" as const,
          source: { type: "url" as const, url: input.url },
        })
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: resolveMediaType(input.mediaTypeHint),
            data: input.base64!.replace(/^data:[^;]+;base64,/, ""),
          },
        });

  // Use messages.create with json_schema output_config — strict structured
  // output, validated client-side against the same Zod schema.
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }, // caches above ~4k tokens; harmless if it doesn't fire
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: { type: "string", enum: [...CATEGORY_KEYS] },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            description: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["category", "severity", "description", "confidence"],
        },
      },
    },
    messages: [
      {
        role: "user",
        content: [
          imageBlock,
          {
            type: "text",
            text: "Classify the obstruction in this photo and return JSON matching the schema.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ClassifyError("Model refused to classify this image.");
  }

  // Pull the first text block from the response. With json_schema output_config,
  // it's a JSON string matching our schema.
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    throw new ClassifyError("Model returned no text content.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(textBlock.text);
  } catch {
    throw new ClassifyError(`Model output was not valid JSON: ${textBlock.text.slice(0, 120)}`);
  }

  const result = ClassificationSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new ClassifyError(
      `Model output failed schema validation: ${result.error.message}`,
    );
  }

  return result.data;
}
