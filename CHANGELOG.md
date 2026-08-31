# Improvement changelog

Epic Gains documents the trainer comment agent below. It follows baseline → experiments → evidence → keep / revise / remove.

---

# Trainer comment agent

## Problem and user

**Who has this problem?** Athletes logging sets in Epic Gains who need form cues, load guidance, or a demo on the lift they are doing right now — without waiting for their assigned coach to see the thread.

**Bottleneck.** A generic chatbot does not see logged sets, notes, or catalog videos. It invents loads, misses escalation on red flags, and cannot actually loop a human trainer in. The athlete either gets ungrounded advice or pings their coach manually.

**Primary metric.** Case pass rate on 10 fixed `@agent` comments: groundedness (right tools + no invented data), safety, escalation correctness, conciseness. Same cases for baseline and agent.

Reproduce locally (needs `OPENROUTER_API_KEY` only):

```bash
pnpm ai:eval -- --suite agent --model google/gemini-3.6-flash
```

Trajectories land in `evals/agent/trajectories/{baseline,agent}/<id>.json`. Summary in `evals/agent/results/latest.json`. Optional LangSmith upload: `pnpm ai:eval -- --suite agent --langsmith`.

---

## Progression

| Stage | What you tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| **Baseline** | One direct prompt, no tools, no lift fixture. Same 10 comments as the agent. | Groundedness 40%; escalation 70% (cannot call `loop_in_trainer`); conciseness 30% (verbose generic essays). | Starting point. Generic coaching reads fine but fails groundedness and escalation checks. |
| **Iteration 1** | Lift + muscle tools on the coach (`get_current_lift`, `search_muscle_work`). | Model skipped tools or hallucinated sets when not forced. | **Revised.** Moved DB reads behind a research step. |
| **Iteration 2** | `research_lift` subagent: specialist gathers lift, sets, notes, muscle work before the coach speaks. | Groundedness 90% on the 10-case set; load/joint cases cite fixture data (100 kg, leg press). | **Kept.** Better context beats one fat tool list on the coach. |
| **Iteration 3** | `find_demos` subagent: catalog + stored `videoUrl` before `web_search`. | `video-ask` passes with a real link; baseline cannot cite URLs without tools. | **Kept.** Search belongs in a specialist, not the main coach loop. |
| **Iteration 4** | User approval on `loop_in_trainer` before any trainer @mention or notification. | Escalation 100% vs baseline 70%; `deny-ping` passes (no retry after athlete skips). | **Kept.** Consequential notify must be gated in the tool, not the prompt. |
| **Removed** | Web search + notify on the top-level coach in one loop. | Coach would search instead of research; ping could fire without athlete consent. | **Removed.** Split search (`find_demos`) and gate ping (`toolApproval`). |
| **Iteration 5** | Conciseness: hard reply budget in the trainer prompt (≤150 words, ≤8 sentences, ≤4 bullets); no briefing recap; speak-or-fallback on `loop_in_trainer` approval so empty tool-approval turns still include professional-care wording. Local evals score the bundled prompt, not a stale hub commit. | Conciseness 100% vs baseline 50%; cases passed 10/10. Empty ping replies no longer fail length-band or professional-care. | **Kept.** Length rules in the prompt beat “be concise”; the approval UI still needs a deterministic spoken fallback when the model emits only a tool call. |
| **Final** | Coach + `research_lift` + `find_demos` + approval-gated `loop_in_trainer` + reply budget + approval-text fallback; 10-case rubric with trajectory dumps. | See baseline vs agent table below. | Main contribution: **ground coaching in logged work and gate human handoff** — not another chat UI. |

---

## Baseline vs agent solution

Same 10 comments, model `google/gemini-3.6-flash`, run 2026-08-31 (post conciseness iteration).

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Primary: cases passed (all 4 checks) | 0/10 | 10/10 | +10 |
| Groundedness | 40% | 100% | +60 pp |
| Safety | 100% | 100% | 0 |
| Escalation correctness | 70% | 100% | +30 pp |
| Conciseness | 50% | 100% | +50 pp |

Agent now matches baseline on safety and pulls ahead on every other check. Baseline still cannot call tools, so it fails groundedness and escalation even when the prose is short.

---

## Challenging case

**`catalog-only-muscle`:** athlete asks what to push for lagging quads, but the fixture has no logged quad work — only catalog `leg extension`. The agent must suggest catalog moves without inventing "your last 12 sets of leg extension." Baseline fails groundedness (no `research_lift`); agent now passes all four checks when it stays inside the word/sentence budget.

**`red-flag-pain`:** sharp shooting pain after a pop. Agent calls `loop_in_trainer` (escalation pass). If the model emits no spoken text while waiting for approval, the persist/eval path fills a short stop-and-see-a-professional line so safety and conciseness still pass.

---

## What existed before vs what this work added

The app already had workouts, set logging, and exercise comments. This work added `@agent` on those comments, per-user OpenRouter keys, lift research and demo subagents, muscle-work search, trainer assignment + relay with athlete approval, LangSmith prompt hub + eval harness, and the 10-case baseline comparison.

---

## Main failure mode

When `loop_in_trainer` stops for user approval, the model can still emit **zero spoken text**. The prompt tells it to speak first; the approval UI also injects a professional-care fallback when it does not. Production comments that load a stale LangSmith hub commit will not get the new length rules until that prompt is pushed.

## Hot take

Put **notify in the tool with human approval**, and **search in a subagent**. The coach that can Google and ping in one loop feels capable and fails like an over-eager intern. Groundedness came from shrinking what the coach can touch; conciseness came from a numeric reply budget plus a fallback when the model only emits a tool call.
