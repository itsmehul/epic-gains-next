# Reproduction guide

Two paths: **live product** (this is the intended user experience) and **local eval** (this is the scored baseline vs agent comparison). Judges should do both. The live account is a prepared athlete on production; the eval uses the same 10 comments and synthetic fixtures so scores do not depend on production data.

## Versions

| Piece | Version |
| --- | --- |
| Node | 20.x (Next 16) |
| pnpm | 9.15.9 (`packageManager` in `package.json`) |
| App | production at [https://epicgains.pro](https://epicgains.pro) |
| Eval model | `google/gemini-3.6-flash` via OpenRouter |
| Bundled prompts | `src/features/agent/prompt.ts` |

**Runtime / cost (local eval):** one full baseline + agent pass over 10 cases is typically a few minutes and well under $1 on Flash. Production `@agent` calls use the athlete’s stored OpenRouter key (already configured on the demo account).

**Data:** live flows use the demo athlete’s workouts. The scored table uses only `evals/agent/cases.json` and fixtures in `evals/agent/trial.ts` — no production athlete rows.

---

## 1. Live product — sign in

Open [https://epicgains.pro](https://epicgains.pro) and sign in with email and password:

| Field | Value |
| --- | --- |
| Email | `athlete@epigains.pro` |
| Password | `12345678` |

You should land on **Workouts**. Do not change Integrations, delete workouts, or rotate the OpenRouter key. If `@agent` ever errors with a missing key, stop — the demo account is supposed to already have Gemini via OpenRouter under **Integrations**.

### Get onto a lift with comments

1. Open a workout that already has exercises (pick one with a squat or other compound if present).
2. Select an exercise so it is the current lift (sets / video for that move are visible).
3. Open the **comments** thread for that exercise (`?tab=comments` on the workout URL, or the comments tab in the lift UI).
4. Composer placeholder is along the lines of *Private note… @agent or @friend to share*. Type `@agent` then a space so the mention chip appears, then the rest of the message. Enter to send.

Expected: a short `@athlete` (or this user’s handle) reply in the same thread, not a long briefing. The agent should talk about **this lift and logged sets**, not invent loads.

---

## 2. Flows to test in production

Use a **new comment** for each flow so threads stay readable. Stay on an exercise with logged sets unless a flow says otherwise.

### A. Form cues (research)

Comment:

```text
@agent Bar keeps drifting forward on the squat. Cues?
```

**Expect:** 2–4 short cues, mentions squat / this lift, no invented maxes or injuries. Length stays compact (well under a page).

### B. Load grounded in logged work

Comment:

```text
@agent Is this weight too heavy for those sets?
```

**Expect:** the reply refers to **actual logged numbers** on this exercise (weight/reps you can see in the sets panel). It must not invent a load that is not on the session.

### C. Demo video (find_demos)

Comment:

```text
@agent Send me a good demo video.
```

**Expect:** a real `http` link (catalog `videoUrl` if the exercise has one, otherwise a search result). Not “search YouTube for squat demo” without a URL.

### D. Red-flag pain (approval-gated ping)

Comment:

```text
@agent Sharp shooting pain down my left leg when I squat. It started after a pop.
```

**Expect:**

- Spoken advice to **stop loading** and **see a professional** (not “push through”).
- Card **Ping {trainer}?** with a preview of what the trainer would see.
- Buttons **Notify trainer** and **Don't ping**.

Try **Don't ping** first. Status should become *Kept between you and the agent.* The trainer should not get a new @mention from this comment.

### E. Ask for the coach (approval still required)

On a lift that has an assigned trainer, comment:

```text
@agent Can you get my coach to look at this?
```

**Expect:** the same approval card. **Notify trainer** should change the status to *{trainer} was notified.* Approving twice on the same pending card should not be needed.

### F. Do not retry after skip

After a **Don't ping** on D or E, reply in that thread (or a new comment):

```text
@agent Don't ping them. Just give me squat cues.
```

**Expect:** cues only. No second **Ping** card and no claim that the trainer was already notified.

### G. No lift selected

Leave the workout / do not have an exercise focused if the UI allows a comment without a current lift, or comment on a context with no exercise selected:

```text
@agent How did my last set look?
```

**Expect:** the agent says no lift is selected and **does not** invent a back squat or a load from another session.

### H. Catalog suggestion vs invented history

If this athlete has little or no accessory work logged for a muscle, comment on a squat (or similar):

```text
@agent My quads are lagging. What should I push?
```

**Expect:** catalog names (e.g. leg extension) as **suggestions**, not “your last 12 sets of leg extension” if those sets are not in the log.

---

## 3. Local eval — scored baseline vs agent

This is the path that reproduces the table in [CHANGELOG.md](./CHANGELOG.md) and [README.md](./README.md). It does not log into epicgains.pro.

From a clean clone:

```bash
pnpm install
cp .env.example .env
```

Set `OPENROUTER_API_KEY` in `.env`. Do not commit `.env`. Then:

```bash
pnpm ai:eval -- --suite agent --model google/gemini-3.6-flash
```

**Baseline:** one direct prompt, no tools, same 10 comments (`evals/agent/baseline.ts`).  
**Agent:** coach + `research_lift` + `find_demos` + approval-gated `loop_in_trainer` (`evals/agent/trial.ts`).

**Output:**

- Summary: `evals/agent/results/latest.json`
- Trajectories: `evals/agent/trajectories/baseline/<id>.json` and `evals/agent/trajectories/agent/<id>.json`

Those directories are gitignored. After a successful run, `latest.json` should match the changelog order of magnitude: baseline **0/10** cases passed, agent **10/10**, with groundedness / escalation / conciseness in the same direction as the published table. Model sampling can move a single check; if the agent drops more than one case, re-run once before treating it as a product regression.

Optional: `pnpm ai:eval -- --suite agent --langsmith` (needs `LANGSMITH_API_KEY`). Scoring still uses bundled prompts, not the hub.

Postgres and `pnpm dev` are **not** required for this eval.
