import type { NextConfig } from "next";

// 1. Configure the PWA wrapper
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  importScripts: ["/custom-sw.js"], 
});

// 2. Your config with the FIX applied
const nextConfig: NextConfig = {
  images: {
    // THIS LINE SAVES YOUR VERCEL USAGE:
    unoptimized: true, 
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.www.nfl.com',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

// 3. Wrap and export
export default withPWA(nextConfig);