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

const SITE_URL = "https://cayuocnguyen.io.vn";
const SITE_TITLE = "Cây Ước Nguyện";
const SITE_DESC =
  "Thả một điều ước vào gió — cây ước nguyện 3D với hiệu ứng thời tiết Hà Nội. Viết điều ước, treo lên cây, cùng ôn bài trong rừng trúc.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_TITLE}`,
  },
  description: SITE_DESC,
  applicationName: SITE_TITLE,
  keywords: [
    "cây ước nguyện",
    "điều ước",
    "wish tree",
    "3D",
    "Hà Nội",
    "chim Lạc",
    "ôn bài",
    "pomodoro",
  ],
  authors: [{ name: SITE_TITLE }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [
      {
        url: "/chim-lac.jpg",
        width: 1200,
        height: 630,
        alt: "Cây Ước Nguyện — hoạ tiết chim Lạc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/chim-lac.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Sau khi xác minh ở Google Search Console, dán mã vào đây:
  // verification: { google: "MÃ_XÁC_MINH_CỦA_BẠN" },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_TITLE,
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: "vi-VN",
  };

  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${playfair.variable} ${calli.variable}`}
    >
      <body>
        {/* Structured data cho Google + AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
