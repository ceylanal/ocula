import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
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
          background: "#F2EBD9",
          border: "6px solid #D5C5AA",
          borderRadius: "40px",
          color: "#382618",
          fontFamily: "serif",
        }}
      >
        {/* Terracotta Focus Ring & Dot */}
        <div
          style={{
            width: "54px",
            height: "54px",
            borderRadius: "999px",
            border: "5px solid #B85D3B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "999px",
              background: "#B85D3B",
            }}
          />
        </div>
        {/* Wordmark */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          <span style={{ color: "#382618" }}>Okur</span>
          <span style={{ color: "#B85D3B", fontWeight: 400 }}>Lab</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
