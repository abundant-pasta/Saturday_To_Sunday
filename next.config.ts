import type { NextConfig } from "next";

// 1. Configure the PWA wrapper
// We use require() here because next-pwa doesn't always play nice with ES imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in local dev to save cache headaches
  
  // 2. THIS IS THE CRITICAL NEW LINE:
  importScripts: ["/custom-sw.js"], 
});

// 3. Your existing config
const nextConfig: NextConfig = {
  images: {
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

// 4. Wrap and export
export default withPWA(nextConfig);