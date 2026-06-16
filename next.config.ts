import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx'],
  env: {
    EXCEL_FILE_PATH: 'E:\DoAnTotNghiep\code\hrm\HRM_mini_vn_2025-2026.xlsx',
  },
};

export default nextConfig;
