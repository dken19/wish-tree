import type { Metadata, Viewport } from "next";
import { Playfair_Display, Be_Vietnam_Pro, Dancing_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Font thư pháp/viết tay, hỗ trợ đầy đủ dấu tiếng Việt
const calli = Dancing_Script({
  variable: "--font-calli",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-bvp",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cây Ước Nguyện",
  description:
    "Thả một điều ước vào gió — cây ước nguyện 3D với hiệu ứng thời tiết Hà Nội.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#bcd6ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${playfair.variable} ${calli.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
