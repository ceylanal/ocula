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
          background: "#B85D3B",
          borderRadius: "42px",
          color: "#F6F1E7",
        }}
      >
        {/* Minimalist Floating Focus Dot */}
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "999px",
            background: "#F6F1E7",
            marginBottom: "10px",
          }}
        />
        {/* Clean Open Book Silhouette */}
        <div
          style={{
            width: "96px",
            height: "54px",
            borderRadius: "14px",
            border: "8px solid #F6F1E7",
            background: "rgba(246, 241, 231, 0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "100%",
              background: "#F6F1E7",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
