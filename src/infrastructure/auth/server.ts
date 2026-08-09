import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { mcp } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  MCP_OAUTH_DEFAULT_SCOPE,
  MCP_OAUTH_SCOPES,
} from "@/infrastructure/mcp/scopes";
import { getAppUrl, getEnv } from "@/shared/env";

const env = getEnv();
const appUrl = getAppUrl();
const googleClientId = env.GOOGLE_CLIENT_ID.trim();
const googleClientSecret = env.GOOGLE_CLIENT_SECRET.trim();
const isProd = env.NODE_ENV === "production";

function uniqueTrustedOrigins(origins: (string | undefined)[]): string[] {
  return [...new Set(origins.filter((o): o is string => Boolean(o)))];
}

function hostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * In dev, resolve baseURL from the request host so localhost, LAN IPs, and
 * ngrok all work. Fixed HTTPS BETTER_AUTH_URL forces __Secure- cookies that
 * browsers silently drop on http://192.168.* devices.
 */
const baseURL = isProd
  ? env.BETTER_AUTH_URL
  : {
      allowedHosts: uniqueTrustedOrigins([
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.*.*:3000",
        "10.*.*.*:3000",
        "172.*.*.*:3000",
        "*.ngrok-free.app",
        "*.ngrok.app",
        hostFromUrl(env.BETTER_AUTH_URL),
        hostFromUrl(env.NEXT_PUBLIC_APP_URL),
      ]),
      fallback: env.BETTER_AUTH_URL,
    };

const mcpScopes = [...MCP_OAUTH_SCOPES];

export const auth = betterAuth({
  appName: "Epic Gains",
  baseURL,
  trustedOrigins: uniqueTrustedOrigins([
    env.NEXT_PUBLIC_APP_URL,
    env.BETTER_AUTH_URL,
    ...(!isProd
      ? [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://192.168.*.*:3000",
          "http://10.*.*.*:3000",
          "http://172.*.*.*:3000",
        ]
      : []),
  ]),
  advanced: {
    // HTTPS BETTER_AUTH_URL (e.g. ngrok) would otherwise mint Secure cookies
    // that cannot be stored when browsing the app over LAN HTTP.
    useSecureCookies: isProd,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  plugins: [
    mcp({
      loginPage: "/sign-in",
      resource: `${appUrl}/api/mcp`,
      oidcConfig: {
        loginPage: "/sign-in",
        consentPage: "/oauth/consent",
        allowDynamicClientRegistration: true,
        defaultScope: MCP_OAUTH_DEFAULT_SCOPE,
        scopes: mcpScopes,
        metadata: {
          scopes_supported: mcpScopes,
        },
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
