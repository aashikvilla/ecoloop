import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EcoLoop · My kitchen",
    short_name: "EcoLoop",
    description: "A private household kitchen and shopping assistant.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3fbf6",
    theme_color: "#143529",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
