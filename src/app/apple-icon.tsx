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
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #3b0764 100%)",
          borderRadius: "40px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "84px",
            height: "48px",
            borderRadius: "999px",
            border: "5px solid #a5b4fc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "999px",
              background: "#f43f5e",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "34px",
            fontWeight: 900,
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          Ocula
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
