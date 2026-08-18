import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gói server thành 1 bundle gọn cho Docker, deploy riêng khỏi apps/api.
  output: 'standalone',
};

export default nextConfig;
