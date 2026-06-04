import { ImageResponse } from "next/og";

// Icon cho màn hình chính iOS (apple-touch-icon). 180×180 PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: "linear-gradient(160deg, #bcd6ef 0%, #e6f0d8 100%)",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
          <path d="M32 54 V32" stroke="#6b4a2b" strokeWidth={5} strokeLinecap="round" />
          <circle cx="32" cy="26" r="17" fill="#69a948" />
          <circle cx="22" cy="30" r="9" fill="#6aa84f" />
          <circle cx="43" cy="29" r="8" fill="#74b352" />
          <circle cx="32" cy="20" r="8" fill="#84c563" />
          <rect x="23.5" y="35" width="7" height="9" rx="2" fill="#d2392a" />
          <rect x="36.5" y="32" width="7" height="9" rx="2" fill="#e0533f" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
