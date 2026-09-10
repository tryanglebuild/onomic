# Implementation Tracker (Fix) — Template & Guidelines

**Version:** 1.0
**Created:** 2026-07-15
**Last updated:** 2026-07-15

---

## Overview

An **implementation tracker** is a single *living document* that sits **on top of** one
or more `implementation-plan.md` files and acts as mission control for a large,
multi-phase **fix**. Where `current-state.md` answers *what is broken/why* and
`objective.md` answers *what "done" looks like*, and the plan answers *how* in full
technical detail, the tracker answers **"where are we, what's next, and what must never
regress"** — at a glance, across every phase.

It is optional. Use it only for fixes big enough that the three-document fix structure
alone stops being scannable (see *When to Use* below).

This is the **fix-specific** variant. For a feature initiative, use
[`../feature/implementation-tracker.TEMPLATE.md`](../feature/implementation-tracker.TEMPLATE.md).
It complements, and does not replace:

- `docs/fix/TEMPLATE.md` — the 3-document fix set (current-state + objective + plan)

```
docs/fix/<fix-slug>/
├── implementation-tracker.md        ← THIS artifact (the living map)
├── current-state.md                 ← diagnosis (what is broken, why)
├── objective.md                     ← target state + success metrics
├── implementation-plan.md           ← full technical detail, per phase
└── … (risk-analysis, notes)
```

---

## When to Use an Implementation Tracker (for a fix)

Create a tracker when **all** of the following hold:

- The fix spans **multiple phases** (roughly 4+ independently deployable steps), each of which could carry its own verification.
- The work will run across **many sessions / days** and needs a durable "where were we" anchor.
- There are **cross-cutting invariants** (do-not-regress rules, safe rollout order, data-migration safety) that every phase must respect.
- Progress and **success metrics** need to be visible without opening every document.

Do **not** create a tracker for:

- A small fix (the fix's `implementation-plan.md` *Phase Summary* table already tracks progress).
- A single-phase fix that fits one plan.

Rule of thumb: **one plan → no tracker; several coordinated phases with regression risk → one tracker above them.**

---

## How a Fix Tracker Differs from a Feature Tracker

| Aspect | Feature tracker | **Fix tracker (this template)** |
|---|---|---|
| Upstream docs | `feature-spec.md` (+ plan) | `current-state.md` + `objective.md` (+ plan) |
| Ordering rule | Dependency order (schema → RLS → types → API → UI) | **Impact-to-risk order** — highest impact, lowest risk first |
| Dashboard extra columns | Migration / Artifact | **Effort · Impact · Risk** per phase |
| Acceptance criteria mirror | plan "Verification" | plan "Expected result" **+ `objective.md` success metrics** |
| "Done" means | Feature is live | **Regression-free; metric hit and verified in production** |
| Cross-cutting rules focus | Security / scoping / secrets | **Do-not-regress invariants + safe rollout** |

Everything else (legend, change log, risks-to-watch, self-maintaining workflow) is the same shape.

---

## How to Create a Tracker

1. **Place it at the fix root:** `docs/fix/<fix-slug>/implementation-tracker.md`.
2. **Fill the header, cross-cutting rules, and dashboard first** — a returning reader hits these first.
3. **Add one section per phase** using the skeleton below. Each must have Objective · Expected result · Acceptance criteria (checkboxes) · Dependencies.
4. **Keep it alive:** phase starts → 🟡 + branch; phase finishes → tick every checkbox, flip to 🟢, append a **Change log** row with the *evidence* (metric before/after). Bump *Last updated* on every edit.
5. The acceptance-criteria checkboxes should **mirror the plan's "Expected result" and the `objective.md` success metrics**. They ARE the definition of "done" — do not flip a phase to 🟢 with unticked boxes (or annotate the exception explicitly).

---

## Anatomy — What Each Section Is For

| Section | Job it does | Rule |
|---|---|---|
| **Header + Global status** | One-line "state of the fix" for a returning reader | Always current; emoji state, one-line summary, *Last updated*, *Owner* |
| **How to use** | Encodes the workflow so anyone updates it consistently | Copy verbatim; it makes the doc self-maintaining |
| **Legend** | Fixes the meaning of the status emojis | Keep 🔴 🟡 🟢 ⚪ consistent across the whole doc |
| **Cross-cutting rules** | The fix's "constitution" — invariants every phase must uphold (no regressions, safe rollout order, backward-compatible migrations, no data loss) | Write once, reference from phases; they prevent the fix from causing new breakage |
| **Progress dashboard** | At-a-glance state of every phase + Effort/Impact/Risk + link to plan | One row per phase; the *State* cell carries a terse evidence note ("verified: p95 3.1s → 420ms") |
| **Per-phase sections** | The contract for each unit of work | Objective · Expected result · Acceptance criteria (checkboxes) · Dependencies |
| **Risks to watch** | Surfaces the known landmines so they are actively watched, not rediscovered | Each risk names the phase it threatens and the mitigation |
| **Change log** | The audit trail — what changed, when, by whom, with metric evidence | Append-only; every status flip and significant decision gets a dated row |

**Why this shape works for fixing:** the dashboard + checkboxes make progress objective
(no "mostly fixed" hand-waving); the cross-cutting rules keep the fix from introducing
regressions; and because criteria mirror the plan's expected results and the objective's
metrics, "fixed" is *provable* against a target, not asserted.

---

## The Skeleton (copy-paste)

> Replace every `<…>` placeholder. Delete guidance in _italics_. Author in your team's
> working language — keep headings and status vocabulary consistent within one tracker.

```markdown
# <Fix Name> — Implementation Tracker (living document)

**Global status:** 🔴 Not started · **Last updated:** YYYY-MM-DD · **Owner:** <Name>

This is the **living document** for the whole <fix> effort. As work progresses, update
the state of each phase and tick the acceptance criteria here. Full technical detail
(SQL/TS/diffs) lives in `implementation-plan.md`; the diagnosis lives in
`current-state.md`; the target and metrics live in `objective.md`. This file holds the
map, the expected outcome per phase, and the progress.

## How to use
- Every **phase** has: Objective · Expected result · Acceptance criteria (checkboxes) · Dependencies.
- Starting a phase → set state to 🟡 and create a branch.
- Finishing → tick every checkbox, set 🟢, and add a row to the **Change log** with the metric evidence.
- The checkboxes mirror the plan's "Expected result" + the objective's success metrics — they are the definition of "fixed".

**Legend:** 🔴 not started · 🟡 in progress · 🟢 done · ⚪ blocked/waiting

---

## Cross-cutting rules (apply to ALL phases)

1. **No regressions** — _each phase leaves the system in a valid state; existing behaviour X keeps working._
2. **Safe rollout order** — _highest impact-to-risk first; each phase independently deployable and revertible._
3. **Backward-compatible data changes** — _no destructive migration without a backfill/rollback plan; no data loss._
4. **No automatic git commits** — the developer controls all commits.

Reference docs: [`current-state`](./current-state.md) · [`objective`](./objective.md) · [`plan`](./implementation-plan.md)

---

## Progress dashboard

| # | Phase | Effort | Impact | Risk | State | Docs |
|---|---|---|---|---|---|---|
| 1 | <Immediate / stop-the-bleeding> | Low | High | Low | 🔴 | [plan](./implementation-plan.md#phase-1) |
| 2 | <Structural fix> | Med | High | Med | 🔴 | [plan](./implementation-plan.md#phase-2) |
| 3 | <Hardening / scale> | Med | Med | Low | 🔴 | |

**Implementation order:** 1 → 2 → 3 → …  _Ordered by impact-to-risk. State the rule and any phase that can be parallelised._

---

## Phase 1 — <Phase name> `🔴`

**Objective:** <one sentence — what this phase fixes>

**Expected result:** <the observable, testable state after this phase — e.g. "resumed sessions no longer 409; time is recorded">

**Acceptance criteria**
- [ ] <verifiable criterion mirroring the plan's "Expected result">
- [ ] **Metric:** <success metric from objective.md, e.g. "project page p95 < 500ms with 200 tasks">
- [ ] **No regression:** <criterion proving the do-not-regress rule holds here>

**Dependencies:** <none | prior phase | existing tables/components>

---

### Phase 2 — <Phase name> `🔴`
**Objective:** <one sentence>

**Expected result:** <observable state>

**Acceptance criteria**
- [ ] <criterion>
- [ ] **Metric:** <target from objective.md>
- [ ] **No regression:** <criterion>

**Dependencies:** <phase(s)>

_(repeat per phase; optional blocks below)_

**Design decisions (decided YYYY-MM-DD):** <non-obvious choice + link to objective/plan section>

> **Note:** <current status caveat — e.g. "code complete, tsc clean; pending production metric confirmation">

---

## Risks to watch during implementation
- **<Risk>:** <why it's dangerous — e.g. "backfill locks the table"> — <mitigation>. (<which phase>)
- **<Risk>:** <mitigation>. (<phase>)

---

## Change log
| Date | Phase | Change | By |
|---|---|---|---|
| YYYY-MM-DD | — | Living document created; diagnosis + objective reviewed, 0 blockers. | <Name> |
| YYYY-MM-DD | 1 | <what was done + metric evidence, e.g. "p95 3.1s → 420ms"> → Phase 1 🟢. | <Name> |
```

---

## Updating the Tracker Over Time

- A phase starts → set it 🟡, add a Change log row.
- A phase finishes → tick all its criteria, set 🟢, add a Change log row with the **metric evidence** ("verified: p95 3.1s → 420ms; no regression on dashboard").
- A design decision changes → update the phase's *Design decisions* note and the doc it points to; log it.
- A new risk appears → add it to *Risks to watch*.
- **Any edit** → bump *Last updated* in the header, and reflect the new state in the *Global status* line and the dashboard row.

When every phase is 🟢, set the *Global status* to complete and note any remaining
verification (e.g. "code complete; pending one week of production metrics").

---

## Relationship to the Other Templates

| Artifact | Answers | When |
|---|---|---|
| `current-state.md` + `objective.md` | What is broken / what "done" looks like | Before implementation |
| `implementation-plan.md` | How, in full detail, per phase | Before/during implementation |
| **`implementation-tracker.md`** (this template) | Where are we, what's next, what must not regress — across all of the above | Only for multi-phase fixes |

A tracker **links to** the plan; it never duplicates its SQL/TS/diffs. If you find
yourself pasting implementation detail into the tracker, it belongs in the plan instead.

---

## A Note on Language

The template system is written in English, and the platform's default UI language is
English (see `docs/fix/app-i18n-coverage/`). Author trackers in your team's working
language, but keep **headings and status vocabulary consistent** within a single tracker
so the dashboard and change log stay scannable.
