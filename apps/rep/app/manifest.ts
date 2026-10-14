import type { MetadataRoute } from "next";

/** Lets reps "Add to Home Screen" and open the app full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOP Rep",
    short_name: "HOP Rep",
    description: "Your jobs from HOP dispatch.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ee",
    theme_color: "#012f6c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
