"use client";

import { useState } from "react";

type PanoramaResponse =
  | {
      found: true;
      query: { lat: string; lng: string; year: string | null; radius: string };
      panorama_id: string;
      timestamp: string;
      mission_year: string;
      geometry: unknown;
      images: {
        equirectangular_full?: string;
        equirectangular_medium?: string;
        equirectangular_small?: string;
        cubic_img_preview?: string;
        thumbnail?: string;
      };
      upstream_url: string;
    }
  | {
      found: false;
      query: { lat: string; lng: string; year: string | null; radius: string };
      upstream_url: string;
    }
  | { error: string };

export default function Home() {
  const [lat, setLat] = useState("52.3551");
  const [lng, setLng] = useState("4.8904");
  const [year, setYear] = useState("2024");
  const [radius, setRadius] = useState("25");
  const [data, setData] = useState<PanoramaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ lat, lng, radius });
    if (year) params.set("year", year);
    const res = await fetch(`/api/panorama?${params}`);
    const json = (await res.json()) as PanoramaResponse;
    setData(json);
    setLoading(false);
  }

  const previewSrc =
    data && "found" in data && data.found
      ? data.images.equirectangular_small ?? data.images.equirectangular_medium
      : null;

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        Amsterdam Panorama API — MVP
      </h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Defaults to Albert Cuypstraat. Try year 2018 / 2020 / 2022 / 2024.
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr) auto",
          gap: 12,
          alignItems: "end",
          marginBottom: 24,
        }}
      >
        <Field label="Latitude">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Longitude">
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Mission year (optional)">
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            style={inputStyle}
          />
        </Field>
        <Field label="Radius (m)">
          <input
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            background: "#111",
            color: "white",
            border: 0,
            borderRadius: 6,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Fetching…" : "Fetch panorama"}
        </button>
      </form>

      {previewSrc && (
        <div style={{ marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Panorama preview"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          />
        </div>
      )}

      {data && (
        <pre
          style={{
            background: "#0b0b0b",
            color: "#e7e7e7",
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            overflow: "auto",
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ color: "#555" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
};
