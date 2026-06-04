import type { MetadataRoute } from "next";

const BASE_URL = "https://cayuocnguyen.io.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
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
      url: `${BASE_URL}/ky-nang`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}
