export const defaultSiteUrl = "https://epicgains.app";

/** Public origin for Open Graph, JSON-LD, and canonical URLs. */
export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? defaultSiteUrl;
}
