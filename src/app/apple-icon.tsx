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
          background: "#F6F1E7",
          border: "6px solid #DFD5C3",
          borderRadius: "40px",
          color: "#2C2520",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "52px",
            borderRadius: "14px",
            background: "#EFE8DA",
            border: "4px solid #4A5D4E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "999px",
              background: "#E6D2B5",
              border: "4px solid #B85D3B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: "#B85D3B",
              }}
            />
          </div>
        </div>
        <div
          style={{
            fontSize: "30px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          <span style={{ color: "#2C2520" }}>Okur</span>
          <span style={{ color: "#B85D3B" }}>Lab</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
