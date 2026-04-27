import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hanap-Bidet: UPD Edition",
    short_name: "Hanap-Bidet",
    description:
      "A guide to comfort room locations across UP Diliman — bidet availability, gender access, and walking directions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#F7F4EE",
    theme_color: "#7B1113",
    categories: ["maps", "navigation", "education"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
