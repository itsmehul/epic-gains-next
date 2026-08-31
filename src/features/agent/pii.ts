import type { LanguageModelMiddleware } from "ai";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const PHONE_RE =
  /(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}\b/g;
const CARD_CANDIDATE_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const API_KEY_RE =
  /\b(?:sk-|or-|AIza)[A-Za-z0-9_-]{16,}\b/g;

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function redactCards(text: string): string {
  return text.replace(CARD_CANDIDATE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;
    return luhnOk(digits) ? "[CARD]" : match;
  });
}

/** Strip emails, phones, SSNs, payment cards, and API-key-like tokens. */
export function redactPii(text: string): string {
  return redactCards(text)
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(SSN_RE, "[SSN]")
    .replace(PHONE_RE, "[PHONE]")
    .replace(API_KEY_RE, "[SECRET]");
}

export function hasPii(text: string): boolean {
  return redactPii(text) !== text;
}

/** Recursively redact string leaves. */
export function redactPiiDeep<T>(value: T): T {
  if (typeof value === "string") {
    return redactPii(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPiiDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = redactPiiDeep(child);
    }
    return next as T;
  }
  return value;
}

/** Redact PII in prompts before they leave the app (model + native web search). */
export function piiGuardMiddleware(): LanguageModelMiddleware {
  return {
    specificationVersion: "v4",
    transformParams: async ({ params }) => redactPiiDeep(params),
  };
}
