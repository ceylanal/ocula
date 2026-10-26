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
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #581c87 100%)",
          borderRadius: "40px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "9999px",
            background: "#fb7185",
            marginBottom: "6px",
          }}
        />
        <div
          style={{
            fontSize: "52px",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          KitUp
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
