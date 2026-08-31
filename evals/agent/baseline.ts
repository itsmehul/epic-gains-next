import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import type { AgentEvalCase } from "./cases";
import { caseMessages } from "./shared";
import type { AgentEvalOutputs } from "./score-agent";

export const BASELINE_SYSTEM_PROMPT = `You are a helpful fitness coach in a workout app comment thread.
Be concise and practical. Focus on form cues, warm-ups, regressions, and progressions.
Do not invent logged sets, loads, or accessory work you cannot see.
Do not invent personal medical advice; suggest seeing a professional for pain or injury red flags.
If the athlete asks for their coach or human trainer, say you would notify them — you cannot actually ping anyone.
Format replies in compact Markdown (short paragraphs, **bold** cues, lists when you have 2+ tips).`;

/** One direct prompt with basic instructions — no tools, no lift fixture. */
export async function runBaselineEvalTrial(
  item: AgentEvalCase,
  model: string,
): Promise<AgentEvalOutputs> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");

  const openrouter = createOpenRouter({ apiKey });
  const generated = await generateText({
    model: openrouter(model),
    system: BASELINE_SYSTEM_PROMPT,
    messages: caseMessages(item.inputs),
    maxOutputTokens: 2048,
    topP: 0.95,
    providerOptions: {
      openrouter: { reasoning: { effort: "minimal" } },
    },
  });

  return {
    text: generated.text,
    toolsCalled: [],
    requestedLoopInTrainer: false,
    loopInTrainerCalls: 0,
    steps: [],
    approvalRequested: false,
  };
}
