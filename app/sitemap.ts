import type { MetadataRoute } from "next";
import { latestWishes } from "@/lib/agentContent";

const BASE_URL = "https://cayuocnguyen.io.vn";

// Làm mới mỗi giờ (có trang riêng của các điều ước mới nhất).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  // trang chi tiết của tối đa 500 điều ước mới nhất -> agent/crawler tìm thấy link chia sẻ
  const wishes = (await latestWishes(500)).filter((w) => w.no);
  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "daily", // điều ước mới hiện realtime
      priority: 1,
    },
    {
      url: `${BASE_URL}/dieu-uoc`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/xam-xi`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/ky-nang`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/gioi-thieu`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/chinh-sach-bao-mat`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/lien-he`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/dieu-khoan`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...wishes.map((w) => ({
      url: `${BASE_URL}/dieu-uoc/${w.no}`,
      lastModified: w.createdAt ? new Date(w.createdAt) : lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
