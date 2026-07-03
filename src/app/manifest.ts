import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Project Invest AI",
    short_name: "Invest AI",
    description:
      "Chat-centrische analyseomgeving voor Belgische vastgoedinvesteerders.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5efe3",
    theme_color: "#15352a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
