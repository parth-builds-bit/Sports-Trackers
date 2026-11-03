import { ImageResponse } from "next/og";

export const alt = "The Match Centre: football scores, fixtures, standings and top scorers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#09110d",
          color: "#ecf5ef",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 28,
              border: "8px solid #a3e635",
            }}
          />
          <div style={{ display: "flex", fontSize: 36, color: "#8aa395" }}>
            Football scores
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 100, fontWeight: 700 }}>
          <span style={{ whiteSpace: "nowrap" }}>The Match</span>
          <span style={{ whiteSpace: "nowrap", color: "#a3e635" }}>Centre</span>
        </div>

        <div style={{ display: "flex", marginTop: 30, fontSize: 40, color: "#8aa395" }}>
          Scores · Fixtures · Standings · Top scorers
        </div>
      </div>
    ),
    { ...size }
  );
}