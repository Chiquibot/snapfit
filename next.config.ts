import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are resized on the phone before upload (src/lib/image.ts), which keeps
  // them far below Vercel's 4.5 MB request limit for functions.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
