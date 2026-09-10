# Implementation Tracker (Feature) — Template & Guidelines

**Version:** 1.1
**Created:** 2026-07-14
**Last updated:** 2026-07-15

---

## Overview

An **implementation tracker** is a single *living document* that sits **on top of** one
or more `implementation-plan.md` files and acts as mission control for a large,
multi-phase initiative. Where a feature spec answers *what/why* and an implementation
plan answers *how* in full technical detail, the tracker answers **"where are we, what's
next, and what must never break"** — at a glance, across every sub-feature.

It is optional. Use it only for initiatives big enough that the per-doc feature/fix
structure alone stops being scannable (see *When to Use* below). It is the pattern used
by `docs/feature/zoho-connection/implementation-tracker.md`, which coordinates a plugin
foundation plus three sub-features (integration, time write-back, Cliq), each with its
own plan.

This is the **feature-specific** variant — for a feature initiative decomposed into
ordered blocks/phases with acceptance criteria. For a large multi-phase **fix**, use the
dedicated [`../fix/implementation-tracker.TEMPLATE.md`](../fix/implementation-tracker.TEMPLATE.md)
instead (same shape, tuned for impact-to-risk ordering and regression safety).

It complements, and does not replace:

- `docs/feature/TEMPLATE.md` — the 2-document feature set (spec + plan)

```
docs/feature/<initiative-slug>/
├── implementation-tracker.md        ← THIS artifact (the living map)
├── <sub-feature-a>/implementation-plan.md   ← full technical detail
├── <sub-feature-b>/implementation-plan.md
└── … (spec, ADRs, risk-analysis, README)
```

---

## When to Use an Implementation Tracker

Create a tracker when **all** of the following hold:

- The initiative spans **multiple sub-features or phases** (roughly 4+ deployable units), each of which could have its own `implementation-plan.md`.
- The work will run across **many sessions / days** and needs a durable "where were we" anchor.
- There are **cross-cutting rules** (security, scoping, ordering) that every phase must respect — a place to write the initiative's "constitution."
- Progress and **acceptance criteria** need to be visible to a reader without opening every plan.

Do **not** create a tracker for:

- A single feature that fits one `implementation-plan.md` (the plan's own *Phase Summary* is enough).
- A small fix (the fix's `implementation-plan.md` phase table already tracks progress).

Rule of thumb: **one plan → no tracker; several coordinated plans → one tracker above them.**

---

## How to Create a Tracker

1. **Place it at the initiative root:** `docs/feature/<initiative-slug>/implementation-tracker.md`. _(For a large fix, use the [fix tracker template](../fix/implementation-tracker.TEMPLATE.md) under `docs/fix/<slug>/` instead.)_
2. **Fill the header, cross-cutting rules, and dashboard first** — these are the parts a returning reader hits first.
3. **Add one section per block/phase** using the skeleton below. Each must have Objective · Deliverables · Acceptance criteria (checkboxes) · Dependencies.
4. **Keep it alive as the single source of truth:** when a phase starts → 🟡 + branch; when it finishes → tick every checkbox, flip to 🟢, and append a **Change log** row. Bump *Last updated* on every edit.
5. The acceptance-criteria checkboxes should **mirror the "Verification" section** of the corresponding `implementation-plan.md`. They ARE the definition of "done" — do not flip a phase to 🟢 with unticked boxes (or annotate the exception explicitly).

---

## Anatomy — What Each Section Is For

The tracker's usefulness comes from each section doing a distinct job. Do not drop
sections; an initiative that "doesn't need risks yet" still benefits from an empty,
named placeholder.

| Section | Job it does | Rule |
|---|---|---|
| **Header + Global status** | One-line "state of the initiative" for a returning reader | Always current; includes an emoji state, a one-line summary, *Last updated*, and *Owner* |
| **How to use** | Encodes the workflow so anyone (or a future you) updates it consistently | Copy the workflow verbatim; it makes the doc self-maintaining |
| **Legend** | Fixes the meaning of the status emojis | Keep 🔴 🟡 🟢 ⚪ consistent across the whole doc |
| **Cross-cutting rules** | The initiative's "constitution" — invariants every phase must uphold (security, scoping, secrets, git policy, architectural decisions) | Write these once, reference them from phases; they prevent regressions no single plan would catch |
| **Progress dashboard** | At-a-glance state of every block/phase + which migration/artifact + link to its plan | One row per block and per phase; the *State* cell carries a terse evidence note ("verified: 14 projects mirrored") |
| **Per-phase sections** | The contract for each unit of work | Objective · Deliverables · Acceptance criteria (checkboxes) · Dependencies. Optionally a *Design decisions* note and a status *Note* block |
| **Risks to watch** | Surfaces the known landmines so they are actively watched, not rediscovered | Each risk names the phase it threatens and the mitigation |
| **Change log** | The audit trail — what changed, when, and by whom; the decision history | Append-only; every status flip and significant decision gets a dated row |

**Why this shape works for building a feature:** the dashboard + checkboxes make
progress objective (no "90% done" hand-waving); the cross-cutting rules keep parallel
work safe; the change log turns the doc into a decision record you can hand to anyone;
and because criteria mirror the plans' verification steps, "done" is provable, not
asserted. _(The fix variant applies the same shape with impact-to-risk ordering and
do-not-regress rules — see [`../fix/implementation-tracker.TEMPLATE.md`](../fix/implementation-tracker.TEMPLATE.md).)_

---

## The Skeleton (copy-paste)

> Replace every `<…>` placeholder. Delete guidance in _italics_. Author in your team's
> working language — the platform default is English (see the i18n note at the end).

```markdown
# <Initiative Name> — Implementation Tracker (living document)

**Global status:** 🔴 Not started · **Last updated:** YYYY-MM-DD · **Owner:** <Name>

This is the **living document** for the whole <initiative> effort. As work progresses,
update the state of each phase and tick the acceptance criteria here. Full technical
detail (SQL/TS) lives in each sub-feature's `implementation-plan.md` — this file holds
the map, the expected outcome per phase, and the progress.

## How to use
- Every **phase** has: Objective · Deliverables · Acceptance criteria (checkboxes) · Dependencies.
- Starting a phase → set state to 🟡 and create a branch.
- Finishing → tick every checkbox, set 🟢, and add a row to the **Change log** at the end.
- The checkboxes mirror the "Verification" sections of the plans — they are the definition of "done".

**Legend:** 🔴 not started · 🟡 in progress · 🟢 done · ⚪ blocked/waiting

---

## Cross-cutting rules (apply to ALL phases)

1. **<Invariant 1>** — _e.g. security/scoping rule enforced across every phase._
2. **<Invariant 2>** — _e.g. "read-only until phase X", "secrets server-side only"._
3. **No automatic git commits** — the developer controls all commits.
4. **<Architectural decision / ADR reference>**

Reference docs: [`spec`](./…) · [`risk-analysis`](./…) · [ADR-00X](../../../.project/decisions/…)

---

## Progress dashboard

| # | Block / Phase | Migration / Artifact | State | Docs |
|---|---|---|---|---|
| **0** | **<Foundation block>** | — | 🔴 | [plan](./…) |
| **A** | **<Block A name>** (N phases) | `<migration_file>.sql` | 🔴 | [plan](./…) |
| A.1 | <Phase name> | ↑ | 🔴 | |
| A.2 | <Phase name> | ↑ | 🔴 | |
| **B** | **<Block B name>** | `<migration_file>.sql` | 🔴 | [plan](./…) |

**Implementation order:** 0 → A (1→N) → B → …  _State the ordering rule and any parallelism._

---

## Block 0 — <Foundation> `🔴`

**Objective:** <one sentence>

**Deliverables**
- `<path>` — <what it is>
- <artifact> — <what it is>

**Acceptance criteria**
- [ ] <verifiable criterion mirroring the plan's Verification>
- [ ] <verifiable criterion>

**Dependencies:** <none | prior phase | existing tables/components>

---

### A.1 — <Phase name> `🔴`
**Objective:** <one sentence>

**Deliverables:** <files, routes, functions, tables>

**Acceptance criteria**
- [ ] <criterion>
- [ ] <criterion>
- [ ] **Scoping/security:** <criterion that proves the cross-cutting rule holds here>

**Dependencies:** <phase(s)>

_(repeat per phase; optional blocks below)_

**Design decisions (decided YYYY-MM-DD):** <non-obvious choice + link to spec section>

> **Note:** <current status caveat — e.g. "code complete, tsc clean; pending live verification">

---

## Risks to watch during implementation
- **<Risk>:** <why it's dangerous> — <mitigation>. (<which phase>)
- **<Risk>:** <mitigation>. (<phase>)

---

## Change log
| Date | Block/Phase | Change | By |
|---|---|---|---|
| YYYY-MM-DD | — | Living document created; plans reviewed, 0 blockers. | <Name> |
| YYYY-MM-DD | A.1 | <what was done + evidence> → A.1 🟢. | <Name> |
```

---

## Updating the Tracker Over Time

- A phase starts → set it 🟡, add a Change log row.
- A phase finishes → tick all its criteria, set 🟢, add a Change log row with the **evidence** ("verified: 135 tasks, idempotent").
- A design decision changes → update the phase's *Design decisions* note and the spec it points to; log it.
- A new risk appears → add it to *Risks to watch*.
- **Any edit** → bump *Last updated* in the header, and reflect the new state in the *Global status* line and the dashboard row.

When every block is 🟢, set the *Global status* to complete and note any remaining
verification (e.g. "code complete; pending production click-through").

Once the whole initiative is 🟢 and verified, **archive it**: move the entire initiative
folder (tracker + all sub-feature/sub-fix docs, intact) into the archive folder for its
type — `00-FEATURE-DONE/<initiative-slug>/` for a feature initiative, or
`00-FIX-DONE/<initiative-slug>/` for a fix initiative — then update the relevant `INDEX.md`
and repoint its links. See the archiving section in the matching `TEMPLATE.md`
([feature](./TEMPLATE.md#archiving-a-completed-feature-00-feature-done) ·
[fix](../fix/TEMPLATE.md#archiving-a-resolved-fix-00-fix-done)).

---

## Relationship to the Other Templates

| Artifact | Answers | When |
|---|---|---|
| `feature-spec.md` | What & why | Before implementation |
| `implementation-plan.md` | How, in full detail, per sub-feature | Before/during implementation |
| **`implementation-tracker.md`** (this template) | Where are we, what's next, what must not break — across all of the above | Only for multi-phase feature initiatives |

> For a large **fix**, the equivalent tracker is [`../fix/implementation-tracker.TEMPLATE.md`](../fix/implementation-tracker.TEMPLATE.md) (it sits on top of `current-state.md` + `objective.md` + `implementation-plan.md`).

A tracker **links to** the plans; it never duplicates their SQL/TS. If you find yourself
pasting implementation detail into the tracker, it belongs in the plan instead.

---

## A Note on Language

The existing template system (`docs/feature/TEMPLATE.md`, `docs/fix/TEMPLATE.md`) is
written in English, and the platform's default UI language is English (see
`docs/fix/app-i18n-coverage/`). Author trackers in your team's working language, but keep
**headings and status vocabulary consistent** within a single tracker so the dashboard and
change log stay scannable.
