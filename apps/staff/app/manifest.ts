import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOP",
    short_name: "HOP",
    description: "Ask HOP for anything. We take care of the errands.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#012f6c",
    icons: [{ src: "/logo.png", sizes: "any", type: "image/png" }]
  };
}
