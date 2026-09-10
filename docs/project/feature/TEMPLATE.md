# Feature Documentation — Template & Guidelines

**Version:** 1.1  
**Created:** 2026-07-06  
**Last updated:** 2026-07-29  

---

## Overview

This template defines the standard structure for documenting features in any project. Each feature lives in its own subfolder under `docs/feature/` and always contains exactly two documents:

```
docs/feature/
├── INDEX.md                        ← Living index of all features (always up to date)
├── TEMPLATE.md                     ← This file
├── 00-FEATURE-DONE/                ← Archive of completed (shipped) features
│   └── <feature-slug>/             ← moved here INTACT once fully implemented & verified
│       ├── feature-spec.md
│       └── implementation-plan.md
└── <feature-slug>/                 ← active feature (Draft / Planned / In Progress)
    ├── feature-spec.md             ← What the feature is and why it exists
    └── implementation-plan.md      ← How to build it, step by step
```

The `00-FEATURE-DONE/` folder is the **archive** for features whose implementation is complete and verified. Keeping shipped work out of the active list means `docs/feature/` always shows only what is still in flight. See [Archiving a Completed Feature](#archiving-a-completed-feature-00-feature-done) for the exact process.

The folder name (`<feature-slug>`) should be a short, lowercase, hyphen-separated descriptor of the feature. It should describe what the feature does from the user's perspective. Examples: `google-meet-import`, `tracking-project-hours`, `export-to-pdf`, `team-invitations`.

> **Large, multi-phase initiatives** (several sub-features under one umbrella) may add a third, optional artifact — an `implementation-tracker.md` that coordinates all their plans. See [`implementation-tracker.TEMPLATE.md`](./implementation-tracker.TEMPLATE.md). Example: `zoho-connection/implementation-tracker.md`.

---

## When to Create a Feature Document

Create a feature document when:
- A **new capability** is being added to the product (not a bug fix or refactor)
- The feature requires more than a single development session to implement
- The feature introduces new UI, new database tables, new API routes, or new integrations
- The feature needs to be communicated to stakeholders or reviewed before implementation begins

Do NOT create a feature document for:
- A bug fix (use `docs/fix/` instead)
- A pure refactor with no user-visible change (use `docs/fix/` instead)
- A single-line configuration change

---

## How to Create a New Feature

1. **Choose a slug** — short, lowercase, hyphen-separated. Describe what the feature does from the user's point of view, not the technical approach. (`calendar-sync`, not `add-google-oauth-scopes`)

2. **Create the folder:**
   ```
   docs/feature/<slug>/
   ```

3. **Create the two documents** using the templates below. The feature spec should be written and reviewed before the implementation plan is started.

4. **Update `INDEX.md`** — add a new entry with the feature name, slug, status, description, and creation date. Keep the last-updated timestamp current throughout the feature's lifecycle.

5. **Keep documents alive** — update `feature-spec.md` when design decisions change, update `implementation-plan.md` as phases are completed, and always bump the `Last updated` field on any document that changes.

---

## Document 1 — `feature-spec.md`

**Purpose:** A complete description of the feature from the product perspective. Anyone reading this should understand what the feature does, why it exists, how the user interacts with it, and what architectural decisions have been made. This document is written before implementation begins and updated whenever decisions change.

**Rules:**
- Focus on the **what** and the **why**, not the **how** (implementation details go in the plan)
- Use the present tense for decisions already made ("the feature uses OAuth"), future tense for intent ("the user will be able to...")
- Be explicit about what is out of scope for v1 — this prevents scope creep
- Include a confirmed decisions table for any design question that was actively resolved
- Include UI entry points even if the UI is simple — it anchors the feature in the product
- Write for a developer who has never seen the codebase

**Required sections:**

```markdown
# Feature Spec — <Feature Title>

**Status:** Draft | In Review | Approved | In Progress | Complete  
**Created:** YYYY-MM-DD  
**Last updated:** YYYY-MM-DD  
**Author:** <Name>

---

## 1. Overview
2–3 paragraphs. What does this feature do? What problem does it solve?
What is the core value for the user? What already exists that this builds on?

## 2. Core Objective
One sentence: the single thing this feature must achieve.
Format: "Automate/Enable/Allow [user] to [action] without [friction/manual step]."

## 3. Context: How This Area Currently Works
A table or description of the existing system this feature extends or connects to.
Include relevant table names, component names, and API routes already in place.
This section makes clear what the feature does NOT need to build from scratch.

## 4. User Flow
A numbered, step-by-step description of the full user journey.
Start from the trigger (what causes the user to engage with this feature?)
End at the outcome (what has changed when the user is done?).
Use a code block for the flow — it forces clarity and scanability.

## 5. Confirmed Design Decisions
A table of every significant design question and its resolved answer.
| Question | Decision |
|---|---|
Include the reasoning for non-obvious decisions as a note below the table.

## 6. Key Entities
For each new database table or significant data structure introduced:
- Column name, type, and purpose
- Foreign keys and their cascade behaviour
- Any constraints or enums

## 7. Out of Scope (v1)
A bulleted list of things that were explicitly considered and deferred.
These are not "maybe later" items — they are deliberate exclusions with a reason.

## 8. Security Considerations
What data is sensitive? How is it protected?
What permissions are required? What could go wrong?
Cover: auth, RLS, secrets, external API access, data exposure risks.

## 9. UI Entry Points
A table of every place the feature appears in the UI.
| Location | What appears |
|---|---|
Even if the UI is minimal, document where the user finds this feature.

## 10. Relationship to Existing Features
How does this feature connect to or depend on other parts of the product?
Use a simple diagram or a written description.
What existing pipeline or flow does this feature feed into?
```

---

## Document 2 — `implementation-plan.md`

**Purpose:** A step-by-step technical guide for building the feature. It translates the spec into concrete, ordered phases of work — each independently deployable and each leaving the system in a valid state.

**Rules:**
- Lead with a reference to the feature spec and a technical context block
- Divide work into phases — backend first (schema → RLS → types → API), then frontend
- Each phase must have: a goal, concrete steps with file paths, and code snippets for non-trivial changes
- Include verification steps at the end of each phase
- End with open questions — unresolved decisions that must be answered before or during implementation
- Never include commit steps (the developer controls git)
- If a phase introduces a migration, include the full SQL

**Required sections:**

```markdown
# Implementation Plan — <Feature Title>

**Feature spec:** docs/feature/<slug>/feature-spec.md  
**Status:** Planned | In Progress | Complete  
**Created:** YYYY-MM-DD  
**Last updated:** YYYY-MM-DD  
**Author:** <Name>

---

## Overview
Brief summary of the implementation approach.
How many phases? What is the MVP cut-off (which phases must ship together)?
State the ordering rule: "Phases must be completed in order" or "Phases X and Y can be parallelised."

---

## Technical Context
- Stack and relevant conventions (e.g., "Server Components preferred, use client only when needed")
- Auth and RLS model
- Naming conventions (table names, component names, route names)
- Environment variables that will be needed
- Any third-party services or APIs involved
- Primary files to read before starting (existing code relevant to this feature)

---

## Phase N — <Phase Name>

**Goal:** One sentence.

### Step N.1 — <Step name>
**File:** `path/to/file.ts` (new) or (existing)

Description of the change. For non-trivial logic, include a code snippet:

\```typescript
// or sql, or bash, etc.
\```

### Step N.2 — <Step name>
...

**Verification:**
How to confirm this phase works correctly before moving to the next.
Include: what to check in the browser, what to check in Supabase, what to run in the terminal.

---

## Phase Summary

| Phase | Builds | Status |
|---|---|---|
| 1 | Database foundation | ⬜ Not started |
| 2 | ... | ⬜ Not started |

**MVP boundary:** Phases 1–N must ship together. Phases N+1 onwards are enhancements.

---

## Environment Variables Required
| Variable | Where to get it | Used in |
|---|---|---|

---

## Open Questions
Numbered list of unresolved decisions or unknowns.
Each should name what needs to be decided, not just what is unknown.
```

---

## Updating Documents Over Time

Feature documents evolve with the feature. Update them when:
- A design decision changes → update `feature-spec.md` and note the change
- A phase is completed → mark it in `implementation-plan.md`
- New decisions are made during implementation → add them to the confirmed decisions table in `feature-spec.md`
- Any document changes → bump `Last updated` at the top

When all phases are complete and the feature is live, update the status to `Complete` in all documents and in `INDEX.md`, then **archive the feature** (see the next section).

---

## Archiving a Completed Feature (`00-FEATURE-DONE/`)

Once a feature is fully implemented and verified, move it out of the active list into the archive folder. This keeps `docs/feature/` focused on work still in flight while preserving the full record of what shipped.

**When to archive:**
- Every phase in the feature's `implementation-plan.md` is complete and its verification steps pass (all Phase Tracker rows ✅).
- For a multi-sub-feature **initiative**, only when **every block** in its `implementation-tracker.md` is 🟢.

**How to archive:**

1. **Create the archive folder** if it does not exist yet:
   ```
   docs/feature/00-FEATURE-DONE/
   ```

2. **Move the entire feature folder into it, intact** — never strip or summarise the documents (the archive is the reference record of what shipped). Move the tracker too, if the feature is an initiative:
   ```
   docs/feature/<feature-slug>/   →   docs/feature/00-FEATURE-DONE/<feature-slug>/
   ```

3. **Update `INDEX.md`:**
   - Set the feature's status to 🟢 Shipped and move its summary row to the **Shipped Features** section.
   - Repoint every link in its detail block from `./<feature-slug>/…` to `./00-FEATURE-DONE/<feature-slug>/…`.
   - Bump the index's `Last updated`.

4. **Bump `Last updated`** on any moved document you touch.

**Do NOT** archive a feature whose phases are not all verified — the archive is the source of truth for "what is actually live". A feature only leaves `00-FEATURE-DONE/` again if it is reopened for new work (move it back to an active `<feature-slug>/` and flip its INDEX status).

---

## Maintaining `INDEX.md`

`INDEX.md` is the entry point for the entire `docs/feature/` folder. Update it:
- When a new feature folder is created (add an entry)
- When a feature status changes (update the status field)
- When a significant design decision is made or changed (bump the index's `Last updated`)

The index entry for each feature must include:
- Feature title and link to its folder
- Current status
- A one-line description of what the feature enables for the user
- Created date and last updated date
