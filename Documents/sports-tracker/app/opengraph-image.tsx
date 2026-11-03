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
          alignItems: "center",
          justifyContent: "center",
          background: "#09110d",
          color: "#ecf5ef",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 32,
            border: "9px solid #a3e635",
            marginBottom: 30,
          }}
        />
        <div style={{ display: "flex", fontSize: 112, fontWeight: 700, whiteSpace: "nowrap" }}>
          The Match
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 112,
            fontWeight: 700,
            color: "#a3e635",
            whiteSpace: "nowrap",
          }}
        >
          Centre
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#8aa395" }}>
          Live football scores
        </div>
      </div>
    ),
    { ...size }
  );
}