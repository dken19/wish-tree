import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CHỈ dev: cho phép mở bản dev từ điện thoại cùng mạng LAN (192.168.x.x / 10.x.x.x).
  // Thiếu dòng này Next chặn tài nguyên dev từ IP lạ -> trang kẹt ở màn chờ.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Đường dẫn quen thuộc mà công cụ tìm kiếm / AI agent hay dò (trust pages) -> trang tiếng Việt tương ứng.
  async redirects() {
    return [
      { source: "/about", destination: "/gioi-thieu", permanent: true },
      { source: "/contact", destination: "/lien-he", permanent: true },
      { source: "/privacy", destination: "/chinh-sach-bao-mat", permanent: true },
      { source: "/terms", destination: "/dieu-khoan", permanent: true },
    ];
  },
};

export default nextConfig;
