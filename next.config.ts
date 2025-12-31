import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.www.nfl.com',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com', // <--- Added this one
      },
    ],
  },
};

export default nextConfig;