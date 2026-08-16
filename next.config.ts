import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { randomUUID } from "node:crypto";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  serverExternalPackages: ["pg", "pg-workflows", "ksuid", "@opentelemetry/api"],
  allowedDevOrigins: ['192.168.29.225', 'e272-2405-201-b-813d-54ad-470f-d2f6-debf.ngrok-free.app'],
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    // instrumentation.ts is compiled for node, edge, and browser. Replace the
    // Node-only workflow engine with a stub outside the nodejs runtime so
    // webpack does not try to resolve pg/ksuid/crypto in those bundles.
    if (!isServer || nextRuntime === "edge") {
      const engineStub = path.resolve(
        __dirname,
        "src/infrastructure/workflows/engine.stub.ts",
      );
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /(?:@\/|src\/)?infrastructure\/workflows\/engine$/,
          engineStub,
        ),
      );
    }

    return config;
  },
};
export default withSerwist(nextConfig);
