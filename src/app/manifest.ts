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
    start_url: "/workouts",
    scope: "/",
    orientation: "portrait",
    id: "/workouts",
    lang: "en",
    dir: "auto",
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        src: "/logos/favicon_io/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logos/favicon_io/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logos/favicon_io/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "screenshots/img-find.jpeg",
        sizes: "780x1688",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Workouts",
      },
      {
        src: "screenshots/img-progress.jpeg",
        sizes: "780x1688",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Achievements",
      },
      {
        src: "screenshots/img-market.jpeg",
        sizes: "780x1688",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Profile",
      },
    ],
    categories: ["fitness", "health", "lifestyle"],
    prefer_related_applications: false,
    display_override: ["standalone", "fullscreen"],
    shortcuts: [
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
