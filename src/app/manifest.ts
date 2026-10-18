import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Snapfit",
    short_name: "Snapfit",
    description: "Snap your scale, meals and workouts. Snapfit logs them and coaches you.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1613",
    theme_color: "#0c7a62",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
