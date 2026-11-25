import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CHỈ dev: cho phép mở bản dev từ điện thoại cùng mạng LAN (192.168.x.x / 10.x.x.x).
  // Thiếu dòng này Next chặn tài nguyên dev từ IP lạ -> trang kẹt ở màn chờ.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
