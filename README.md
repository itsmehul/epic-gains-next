# Epic Gains — trainer comment agent

Hackathon submission: an in-app `@agent` coach on workout comments so athletes get grounded cues while they train, and a human trainer is only pinged after they approve.

**Improvement story and scores:** [CHANGELOG.md](./CHANGELOG.md)

## Who has this problem?

Athletes logging sets in Epic Gains who need form cues, load guidance, or a demo on the lift they are doing **right now** — without waiting for an assigned coach to open the thread.

## What bottleneck makes it worth solving?

A generic chatbot does not see logged sets, notes, or catalog videos. It invents loads, misses red-flag escalation, and cannot loop in a human trainer. The athlete either gets ungrounded advice or pings the coach by hand.

## Does the agent solve it well?

Yes, on a fixed 10-comment rubric (same cases for baseline and agent). Primary metric: **cases passed** (groundedness + safety + escalation + conciseness).

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Cases passed (all 4 checks) | 0/10 | 10/10 | +10 |
| Groundedness | 40% | 100% | +60 pp |
| Safety | 100% | 100% | 0 |
| Escalation | 70% | 100% | +30 pp |
| Conciseness | 50% | 100% | +50 pp |

Baseline is one direct prompt with no tools. The agent is a coach plus `research_lift` and `find_demos` subagents, with `loop_in_trainer` gated by athlete approval. Numbers are from `google/gemini-3.6-flash` on 2026-08-31. Iteration table, removed experiments, and the hard cases (`catalog-only-muscle`, `red-flag-pain`) live in the [changelog](./CHANGELOG.md).

## Can another person reproduce the result?

Yes. Full steps, the live demo account, and the comment-by-comment UI flows are in **[REPRO.md](./REPRO.md)**.

- **Product:** sign in at [https://epicgains.pro](https://epicgains.pro) as `athlete@epigains.pro` and run the `@agent` flows in [REPRO.md](./REPRO.md).
- **Scores:** from a clean clone with `OPENROUTER_API_KEY` only:

```bash
pnpm install
pnpm ai:eval -- --suite agent --model google/gemini-3.6-flash
```

Trajectories land in `evals/agent/trajectories/{baseline,agent}/` and the summary in `evals/agent/results/latest.json` (gitignored). Optional LangSmith: `pnpm ai:eval -- --suite agent --langsmith`. The eval always scores the bundled prompts in `src/features/agent/prompt.ts`.

---

## What existed before vs what this work added

**Already in the product:** workouts, set logging, exercise catalog, comments, trainer assignment, auth.

**Added for this agent:** `@agent` on comments, OpenRouter-backed coach, lift research and demo subagents, muscle-work search, approval-gated trainer relay, bundled system prompts, and the 10-case baseline vs agent eval.

---

## Agent instructions (in this repo)

Do not treat LangSmith as the source of truth for judging. Production can pull hub prompts when `LANGSMITH_API_KEY` is set; if that fails, it falls back to the same strings as eval.

| Agent | Bundled instructions | Role |
| --- | --- | --- |
| Coach | `TRAINER_SYSTEM_PROMPT` in [`src/features/agent/prompt.ts`](src/features/agent/prompt.ts) | Speaks to the athlete; calls subagents and `loop_in_trainer` |
| Lift research | `LIFT_RESEARCH_SYSTEM_PROMPT` in the same file | `get_current_lift` / `search_muscle_work`; briefing only |
| Demo finder | `FIND_DEMOS_SYSTEM_PROMPT` in the same file | Catalog + `videoUrl` before `web_search` |

Wiring:

- Tools and subagents: [`src/features/agent/tools.ts`](src/features/agent/tools.ts), [`src/features/agent/subagents.ts`](src/features/agent/subagents.ts)
- Approval before any trainer notify: [`src/features/agent/escalation.ts`](src/features/agent/escalation.ts), [`src/features/agent/escalation-server.ts`](src/features/agent/escalation-server.ts)
- Hub vs bundled load: [`src/features/agent/prompt-hub.ts`](src/features/agent/prompt-hub.ts)
- Chat route: [`src/app/api/agent/chat/route.ts`](src/app/api/agent/chat/route.ts)
- Eval runner (baseline + agent, same 10 comments): [`evals/agent/trial.ts`](evals/agent/trial.ts), [`evals/agent/baseline.ts`](evals/agent/baseline.ts)

[`src/features/skills/trainer-skill.ts`](src/features/skills/trainer-skill.ts) is a **separate** Cursor skill for a trainer roster recap over MCP. It is not the in-app comment coach and is not scored in the 10-case suite.

---

## App (optional)

The measured result above does **not** require Postgres or a running Next server. To try `@agent` in the UI: `pnpm db:up`, copy `.env.example` to `.env`, `pnpm db:push`, `pnpm dev`. Keep API keys out of the submission; `.gitignore` already excludes `.env*`.
