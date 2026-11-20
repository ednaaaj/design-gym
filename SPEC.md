# DesignGym — v0.1 Spec

Hands-on training lab for design engineers. **20% learning, 80% practice.**
Loop for every exercise: Observe → Decide → Experiment → Feedback → Improve → Repeat.

## Scope

v0.1 ships four things, built in this order. Each ships alone and is testable alone.

1. Visual Eye Trainer
2. Dashboard (progress)
3. Design System Playground
4. Motion Lab (mode inside Playground workspace)

Plus a 3-day guided path that strings them together, with a pre/post test.

### Out of scope (v0.1)
Backend, auth, accounts, sync. Social, leaderboards, subscriptions, collaboration. Figma-style editor. AI design reviewer. Critique/portfolio project (Feature 4 → v0.2). Dark mode in Playground. Dialogs, dropdowns, shadows tokens. Named multi-save systems.

## Tech decisions

- Static web app, React + Vite + TypeScript, plain CSS variables for tokens.
- Persistence: `localStorage` only, one versioned key (`designgym:v1`). Wrap reads/writes in try/catch; app must work with storage blocked.
- Exercises are **live HTML/CSS components with parametric flaws**, not screenshots. Corrected version = same component with flaw params reset. Spot-the-difference, find-the-mistake and which-is-better all reuse this.

## 1. Visual Eye Trainer

**Goal:** user spots good vs bad UI fast.

**Types (v0.1):**
| Type | Interaction |
|---|---|
| Find the Mistake | Click problem areas on a flawed UI; mark which flaws exist |
| Which Is Better | Pick A or B, then pick the reason from a short list |
| Spot the Difference | Two near-identical UIs; click each differing region |

**Content:** 12 exercises (4 per type). Each tagged with one skill: `hierarchy | spacing | alignment | typography | color`.

**Per-exercise flow:** one challenge → answer → Submit → immediate feedback panel → Hint (max 2, each costs nothing but is recorded) → Reveal corrected → Next.

**Feedback rule:** concrete numbers, not labels.
Bad: "Incorrect spacing." Good: "Card uses 12px left, 24px right. Use equal padding."
For subjective comparisons (Which Is Better) show trade-offs, not a single "correct" claim, unless the flaw is objective (contrast < 4.5:1).

### Exercise schema

```ts
type Skill = 'hierarchy' | 'spacing' | 'alignment' | 'typography' | 'color';

type Exercise = {
  id: string;
  type: 'find-mistake' | 'which-better' | 'spot-diff';
  skill: Skill;
  difficulty: 1 | 2 | 3;
  title: string;
  objective: string;                 // one line shown to user
  // component rendered live; flaws are params
  component: string;                 // key into component registry
  base: Record<string, unknown>;     // correct params
  flaws: Flaw[];                     // applied on top of base for the "bad" render
  variantB?: Record<string, unknown>; // which-better only
  hints: [string, string?];
  principle: string;                 // 1-2 sentence explanation of why
  tradeoffs?: string;                // subjective items only
};

type Flaw = {
  id: string;
  label: string;                     // "Unequal horizontal padding"
  region: { x: number; y: number; w: number; h: number }; // % of preview, click target
  param: string;                     // which param it overrides
  badValue: unknown;
  explanation: string;               // must include actual numbers
};
```

**Scoring:** per-exercise correct/partial/wrong (flaws found / flaws total, minus false positives). Accuracy per skill = rolling last 5 attempts. "Weak skill" = lowest accuracy among skills with ≥ 3 attempts; otherwise show "not enough data".

## 2. Dashboard

Single screen. Shows:
- Current path day + **Continue** button (primary action)
- Accuracy per skill (5 bars, "not enough data" state)
- Pre/post test delta once both exist
- Last 5 completed exercises
- Playground and Motion Lab progress counts

Empty state (first visit): one headline, one button → "Start 5-question baseline test". No other widgets.

## 3. Design System Playground

Layout: left = foundations, center = live preview, right = instructions + feedback.

**Editable tokens:** color (primary, neutral, surface, error), type scale (base size, ratio, weights, line height), spacing scale (base unit), radius (sharp/subtle/round).

**Components (3):** Button, Input, Card. States: default, hover, focus, active, disabled, error. State switcher forces the state for inspection.

**Behavior:** changing a token updates all components instantly (CSS variables). "Compare" toggles original vs. current.

**Challenges (3):**
1. Make the spacing consistent on an 8-point scale (given 5 off-scale values).
2. Fix inconsistent typography (3 sizes that don't belong to one scale).
3. Fix focus/disabled/error states so they meet contrast and visibility.

**Checks (automatic, objective only):** spacing values on scale, type sizes on scale, WCAG contrast ratios for text and focus ring. Aesthetic quality is never auto-scored.

**Save:** one slot. "Save my system" stores tokens to localStorage.

## 4. Motion Lab

Mode toggle inside the Playground workspace. Same layout: controls left, preview center, guidance right.

**Exercises (3):** button hover/press, modal enter/exit, animated tabs indicator.

**Controls:** duration, delay, easing (preset list + cubic-bezier), distance, scale, opacity.

**Playback:** play, replay, 0.25x / 0.5x / 1x.

**Guidance per exercise:** side-by-side of too slow, too abrupt, polished. One-line reason each. Reduced-motion toggle previews the alternative (opacity only, no transform).

**Complete when:** user sets values within the exercise's acceptable ranges (e.g. button press 100–200ms, modal 150–300ms ease-out) and the reduced-motion variant is defined.

## 5. Guided path (3 days)

| Day | Focus | Work |
|---|---|---|
| 1 | Eye | Baseline test (5 Qs) + hierarchy/spacing exercises |
| 2 | Systems | Playground challenges 1–3 |
| 3 | Motion | Motion Lab 1–3 + **post test (same 5 Qs)** |

Each day: ≤ 2 min lesson text, interactive work, checkpoint. Path stays open after completion for repeats.

## Success criteria (testable)

1. First-time user reaches the first exercise in ≤ 2 clicks, no signup.
2. All 12 exercises render and score correctly with no placeholder content.
3. Changing any Playground token updates all 3 components in the same frame.
4. Playground contrast and scale checks flag the seeded errors and pass the fixed version.
5. Motion exercises can be played, slowed, compared and reduced-motion previewed.
6. Day 1 baseline and Day 3 post test use the same questions; delta shows on dashboard.
7. Reload keeps all progress and the saved system. App still runs with localStorage blocked.

## Build order and milestones

1. **M1:** Exercise registry + schema + 1 working exercise per type. Practice Arena screen.
2. **M2:** Remaining 9 exercises, feedback panel, hints, per-skill accuracy, localStorage.
3. **M3:** Dashboard + baseline test.
4. **M4:** Playground tokens, 3 components, states, checks, 3 challenges.
5. **M5:** Motion Lab.
6. **M6:** 3-day path wiring, post test, polish.

## Open questions
- Name and visual identity (spec uses working name DesignGym).
- Mobile support in v0.1, or desktop-only? Recommend desktop-only; exercises need large previews.
- Inspiration (Can't Unsee-style mechanic): use the mechanic only, original content and branding.
