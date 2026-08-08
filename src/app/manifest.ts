import type { MetadataRoute } from "next";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  APP_THEME_COLOR,
} from "@/shared/pwa/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    display: "standalone",
    start_url: "/dashboard",
    scope: "/",
    orientation: "portrait",
    id: "/dashboard",
    lang: "en",
    dir: "auto",
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "icons/icon512_maskable.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "icons/icon512_rounded.png",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "screenshots/img-find.jpeg",
        sizes: "320x711",
        type: "image/jpeg",
      },
      {
        src: "screenshots/img-progress.jpeg",
        sizes: "320x711",
        type: "image/jpeg",
      },
      {
        src: "screenshots/img-market.jpeg",
        sizes: "320x711",
        type: "image/jpeg",
      },
    ],
    categories: ["fitness", "health", "lifestyle"],
    prefer_related_applications: false,
    display_override: ["standalone", "fullscreen"],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "Open your dashboard",
      },
      {
        name: "Workouts",
        url: "/workouts",
        description: "Open your workouts",
      },
    ],
    related_applications: [],
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
  };
}
