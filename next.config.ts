import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sweph'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/sweph/prebuilds/**/*'],
  },
};

export default nextConfig;
