import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { randomUUID } from "node:crypto";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
});

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
