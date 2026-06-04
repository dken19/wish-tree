import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Ảnh xem trước khi share (Facebook/Zalo/Twitter). 1200×630.
// Vẽ bằng satori: trời Hà Nội + cây treo giấy ước đỏ + chim Lạc + đồng cỏ.
export const alt =
  "Cây Ước Nguyện — viết điều ước, treo lên cây 3D, thả vào gió Hà Nội";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [semibold, regular] = await Promise.all([
    readFile(join(process.cwd(), "app/_fonts/BeVietnamPro-SemiBold.ttf")),
    readFile(join(process.cwd(), "app/_fonts/BeVietnamPro-Regular.ttf")),
  ]);

  // Giấy ước đỏ treo trên cây: vị trí + độ nghiêng khác nhau cho tự nhiên.
  const wishes = [
    { x: 712, y: 196, r: -8 },
    { x: 812, y: 150, r: 6 },
    { x: 902, y: 214, r: -5 },
    { x: 778, y: 286, r: 9 },
    { x: 882, y: 320, r: -7 },
    { x: 990, y: 300, r: 5 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Be Vietnam Pro",
          // Trời Hà Nội: xanh nhạt → kem ấm
          backgroundImage:
            "linear-gradient(160deg, #bcd6ef 0%, #d9e7f3 38%, #f3ead6 100%)",
          overflow: "hidden",
        }}
      >
        {/* Quầng nắng góc trên-phải */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 460,
            height: 460,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(255,243,205,0.95) 0%, rgba(255,243,205,0) 70%)",
            display: "flex",
          }}
        />

        {/* Chim Lạc bay (silhouette tối giản) */}
        <svg
          width={1200}
          height={630}
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <g stroke="#3a566e" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.5}>
            <path d="M486 104 q34 -30 64 0 q30 -30 64 0" />
            <path d="M626 78 q26 -22 50 0 q22 -22 48 0" />
            <path d="M566 156 q22 -18 42 0 q18 -18 40 0" />
          </g>
        </svg>

        {/* Đồng cỏ dưới chân */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 150,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, #9ccb6a 0%, #74ab4e 100%)",
            borderTopLeftRadius: "50% 60px",
            borderTopRightRadius: "50% 60px",
          }}
        />

        {/* Cây + giấy ước đỏ */}
        <svg
          width={560}
          height={560}
          viewBox="0 0 560 560"
          style={{ position: "absolute", right: 36, bottom: 84 }}
        >
          {/* Thân + cành */}
          <path
            d="M286 540 C 280 430 274 360 280 300 C 240 270 214 240 206 196 M280 300 C 322 268 352 240 372 198 M280 330 C 250 312 226 296 214 268 M280 360 C 312 344 338 326 352 300"
            stroke="#6b4a2b"
            strokeWidth={18}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Tán lá nhiều lớp */}
          <g>
            <circle cx={250} cy={170} r={92} fill="#5f9e44" />
            <circle cx={336} cy={150} r={86} fill="#74b352" />
            <circle cx={300} cy={210} r={104} fill="#69a948" />
            <circle cx={200} cy={210} r={72} fill="#7cbb58" />
            <circle cx={392} cy={206} r={70} fill="#5f9e44" />
            <circle cx={300} cy={120} r={70} fill="#84c563" />
          </g>
        </svg>

        {/* Giấy ước đỏ treo (overlay HTML để có bóng đổ mềm) */}
        {wishes.map((w, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `rotate(${w.r}deg)`,
            }}
          >
            <div style={{ width: 2, height: 22, background: "#7a3b2a", display: "flex" }} />
            <div
              style={{
                width: 46,
                height: 60,
                borderRadius: 8,
                backgroundImage: "linear-gradient(160deg, #e0533f 0%, #c5331f 100%)",
                boxShadow: "0 6px 14px rgba(150,30,20,0.35)",
                display: "flex",
              }}
            />
          </div>
        ))}

        {/* Khối chữ bên trái */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 70px",
            maxWidth: 720,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#4d7a3f",
              marginBottom: 18,
              display: "flex",
            }}
          >
            cayuocnguyen.io.vn
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 600,
              lineHeight: 1.04,
              color: "#9a2b1c",
              display: "flex",
            }}
          >
            Cây Ước Nguyện
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1.4,
              color: "#4a3b2e",
              marginTop: 22,
              display: "flex",
              maxWidth: 560,
            }}
          >
            Viết điều ước · treo lên cây 3D · thả vào gió Hà Nội
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Be Vietnam Pro", data: semibold, style: "normal", weight: 600 },
        { name: "Be Vietnam Pro", data: regular, style: "normal", weight: 400 },
      ],
    }
  );
}
