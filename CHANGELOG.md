# Improvement changelog

Hackathon format: baseline → experiments → evidence → keep / revise / remove.

## Problem and user

**Who has this problem?** People who train from YouTube (home gym, rehab, follow-along creators) and anyone who wants an AI agent to import a video as a real workout and later recap what they actually logged.

**Bottleneck.** A saved video is a 40-minute blob. Manual import means typing every move and timestamp. A general agent with “create workout, then create each exercise” drops timing, uses coarse chapters (Warm-up 0:00–5:00), or half-finishes the job. Recaps then fan out into many `performance_data` calls and invent trends the logs do not support.

**Primary metric.** Follow-along import quality: timed moves that abut, start at chapter markers, and land in one transaction. Secondary: recap quality with one analytics call plus a fixed report skill, not a free-form dump of sets.

Same task for baseline and later stages: (1) import a chaptered follow-along video, (2) produce yesterday’s training pulse from logged sets.

---

## Progression

| Stage | What you tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| **Baseline** | General-purpose agent + CRUD: create a workout, then create exercises one by one. No import contract, no timestamp rules, no recap aggregation. Same as a careful human pasting into a spreadsheet. | Partial workouts; overlapping or missing time ranges; recaps needed 3–4 `performance_data` windows and still missed week-over-week. | Starting point. Piecemeal tools are the wrong unit of work for a follow-along video. |
| **Iteration 1** | Single-transaction `import_full_workout` and dropped separate create-workout / create-exercise tools. One video should be one atomic import. | Imports either completed with every move or failed together. No more “workout with two of twelve exercises.” | **Kept.** Atomic import is the main engineering contribution. |
| **Iteration 2** | MCP instructions: resolve URL, duration, and a *timed move list*; chapter time is the **start** of the move; `end = next start` (last move ends at duration); adjacent moves must abut. Agents were treating 0:00–5:00 Warm-up as one exercise. | Coarse section ranges stopped appearing when the agent followed the four-step procedure. Off-by-one (using T[i+1] as start of move i) still showed up until the tool description repeated the same rule. | **Kept and duplicated** into tool description + server instructions. Context in one place was not enough. |
| **Iteration 3** | Deduplicate: refuse a second import of the same video so the catalog stayed clean. | Users (and agents) could not re-import after a bad first parse. The failure was product, not data quality. | **Removed** (`import_full_workout` create-only; same video allowed again). Dedup fought the “fix the timestamps and retry” loop. Canonical *exercise names* still reuse. |
| **Iteration 4** | Richer import schema: muscle groups, key muscles, metric profile, channel URL. Recaps and filters need structure, not only titles. | Agents could tag moves; UI filters and later `muscleGroup` / `keyMuscle` on analytics had something to query. Garbage tags still possible if the transcript is vague. | **Kept.** Schema is a verifier: invalid payloads fail before write. |
| **Iteration 5** | `performance_data` only (sets in one calendar window). Recaps asked for day + this week + last week + 30 days. | Agents issued multiple calls, mixed windows, or skipped streaks/PRs/comments. | **Revised.** Kept the tool for set-level drill-down. |
| **Iteration 6** | `performance_metrics`: one call returns focal day, current/prior ISO week, 30-day window, deltas, streak, PRs, comments, daily rollup. Server instructions: do not fan out `performance_data` for recaps. | Recap path is one tool round-trip. Comments sit next to the exercise, so the pulse can cite notes instead of inventing them. | **Kept.** Better context in the payload beat extra orchestration. |
| **Iteration 7** | Skill `epic-gains-performance-summary`: when to call the tool, how to fill Verdict / Yesterday / Vs last week / Signals / Next, rest-day gotcha. MCP tools alone still produced unstructured essays. | Same metrics payload, consistent sections. Agents skipped the skill unless it was installed; trigger copy is part of the product. | **Kept.** Skill is the output verifier; MCP is the data contract. |
| **Iteration 8** | Social MCP (follow graph, private accounts, friend recaps via `username`). Pulse for “someone I train with.” | Recaps for another user require an accepted follow; otherwise the tool errors instead of leaking. | **Kept.** Privacy is a hard gate, not a prompt. |
| **Removed along the way** | Dashboard / rest-day shell as the home of the product. Aurora overlay on the play prompt (visual noise vs. the timed player). Dedup-on-video (iteration 3). | Dashboard competed with “workouts you imported and mastered.” Overlay did not help import or recap quality. | **Removed.** Agent value is import + pulse, not another home screen. |
| **Final** | MCP with import contract + timestamp procedure, `performance_metrics` + optional `performance_data`, performance-summary skill, privacy-aware social tools, OAuth/API keys so another client can reproduce. | End-to-end: paste/import a chaptered video → log sets in the app → ask the agent for yesterday’s pulse and get a structured report from one metrics call. | Main contribution: **make the unit of agent work match the unit of user work** (one video, one recap), then encode the failure modes in tools and skills so a general model cannot “almost” do it. |

---

## Baseline vs agent solution

Same two tasks: import a chaptered follow-along; recap yesterday from logs.

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Primary: import completeness | N sequential create calls; easy to stop mid-video | One `import_full_workout` transaction | All-or-nothing workout, not a stub |
| Primary: timestamp mapping | Agent infers ranges; often uses section ends as starts | Explicit T[i] → T[i+1] in instructions and tool text | Follow-along jumps match chapters |
| Recap tool calls | 3–4 `performance_data` windows, missing PRs/streak | One `performance_metrics` | Fewer hops, same windows every time |
| Recap shape | Free-form summary | Skill template (verdict, yesterday, vs week, signals, next) | Comparable day to day |
| Human time | Manual chapter list + spreadsheet | Agent + MCP; human still logs sets and reviews private follows | Import and recap automated; logging stays human |

Run this yourself: connect MCP, import one public YouTube workout with published chapters, log a session, then ask for the performance summary skill with yesterday’s date.

---

## Challenging case

A video whose YouTube chapters are **sections** (Warm-up, Strength, Cooldown) rather than **moves**. The timestamp procedure is correct and still produces three huge blocks. That is not an off-by-one bug; the source does not contain exercise-level times. The agent must pull a timed description or transcript, not trust chapters. This is the case that justified “never only coarse section ranges” in the instructions.

---

## What existed before vs what this work added

Scaffold, auth, and app shell existed. The agent path added MCP OAuth/API keys, `import_full_workout` and the timestamp contract, set logging schema, `performance_metrics` / `performance_data`, the performance-summary skill, and follow privacy on recaps.

---

## Main failure mode

If chapter metadata is coarse, a well-behaved agent still imports garbage timing. Verification today is schema + instructions, not a second pass that checks “this range looks like a single movement.” A human still has to reject a three-block import.

## Hot take

Do not add more agents until the **tool’s unit of work** matches the user’s. Orchestrating create-workout + create-exercise looks like agency and fails like a flaky script. One transactional import and one metrics payload beat a multi-agent plan. Put the lesson in the tool, then in the skill; the model will not remember a README. Deduplicating “the same video” felt clean and blocked the retry loop that actually fixes bad imports.
