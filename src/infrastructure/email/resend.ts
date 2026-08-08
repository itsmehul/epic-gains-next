import "server-only";

import { getEnv } from "@/shared/env";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

/**
 * Resend-shaped email stub.
 * Logs in development when RESEND_API_KEY is missing; swap for real SDK later.
 */
export async function sendEmail(input: SendEmailInput) {
  const env = getEnv();
  const payload = {
    from: env.EMAIL_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  if (!env.RESEND_API_KEY) {
    console.info("[email:stub]", payload);
    return { id: `stub_${Date.now()}`, stub: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email send failed: ${response.status} ${body}`);
  }

  return (await response.json()) as { id: string };
}
