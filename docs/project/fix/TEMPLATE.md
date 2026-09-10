# Fix Documentation — Template & Guidelines

**Version:** 1.1  
**Created:** 2026-07-03  
**Last updated:** 2026-07-29  

---

## Overview

This template defines the standard structure for documenting fixes in any project. Each fix lives in its own subfolder under `docs/fix/` and always contains exactly three documents:

```
docs/fix/
├── INDEX.md                        ← Living index of all fixes (always up to date)
├── TEMPLATE.md                     ← This file
├── 00-FIX-DONE/                    ← Archive of resolved fixes
│   └── <fix-slug>/                 ← moved here INTACT once complete & verified
│       ├── current-state.md
│       ├── objective.md
│       └── implementation-plan.md
└── <fix-slug>/                     ← active fix (Planned / In Progress)
    ├── current-state.md            ← What is broken and why
    ├── objective.md                ← What success looks like after the fix
    └── implementation-plan.md      ← How to get there, step by step
```

The `00-FIX-DONE/` folder is the **archive** for fixes that are complete and verified. Keeping resolved work out of the active list means `docs/fix/` always shows only what is still open. See [Archiving a Resolved Fix](#archiving-a-resolved-fix-00-fix-done) for the exact process.

The folder name (`<fix-slug>`) should be a short, lowercase, hyphen-separated descriptor of what is being fixed. Examples: `navigation-performance`, `auth-token-expiry`, `search-indexing-lag`.

> **Large, multi-phase fixes** (several coordinated phases with cross-cutting rules) may add an optional `implementation-tracker.md` on top of the three documents, to track progress across them. See [`../feature/implementation-tracker.TEMPLATE.md`](../feature/implementation-tracker.TEMPLATE.md).

---

## When to Create a Fix Document

Create a fix document when:
- A **systemic problem** has been identified (not a one-line bug — something that requires a multi-step plan)
- The fix will take more than a single development session
- The root cause has been diagnosed and is worth recording for future reference
- The fix touches more than one file or system boundary

Do NOT create a fix document for:
- A single-line typo or config change
- A bug that is fixed and closed in the same session without ongoing impact

---

## How to Create a New Fix

1. **Choose a slug** — short, lowercase, hyphen-separated. Describe the problem, not the solution. (`auth-slowness`, not `add-caching`)

2. **Create the folder:**
   ```
   docs/fix/<slug>/
   ```

3. **Create the three documents** using the templates below. Fill each section fully before moving to implementation.

4. **Update `INDEX.md`** — add a new entry with the fix name, slug, status, importance, and creation date. Keep the last-updated timestamp current throughout the life of the fix.

5. **Keep documents alive** — update `current-state.md` if new root causes are discovered, update `implementation-plan.md` as phases are completed or revised, and always bump the `Last updated` field.

---

## Document 1 — `current-state.md`

**Purpose:** A precise, technical snapshot of the problem as it exists today. Anyone reading this should understand exactly what is broken, where, and why — without needing to dig through code.

**Rules:**
- Write in the past tense of the current reality ("today, X happens")
- Be specific: include file paths, function names, query patterns
- Include code snippets where they clarify the problem
- Distinguish between what is working well and what is broken
- List every file that is involved in the problem
- Do not propose solutions here — only diagnose

**Required sections:**

```markdown
# Current State — <Fix Title>

**Status:** Diagnosis complete  
**Created:** YYYY-MM-DD  
**Last updated:** YYYY-MM-DD  
**Author:** <Name>

---

## 1. Context
Brief paragraph on what this part of the system does and why the problem matters.
Stack/architecture context relevant to this fix.

## 2. Root Cause
The specific mechanism causing the problem. Include code snippets.
Explain the chain of events: "X happens, which causes Y, which results in Z."

## 3. Problem Inventory
A detailed breakdown of each problematic pattern found.
Use tables or lists. Include file paths and line references where relevant.

### What is working well
List patterns or components that are correctly implemented — so they are not changed accidentally.

### What is broken
Table with: Pattern | Location | Impact (High / Medium / Low)

## 4. Observed Symptoms
What the end user experiences as a result of this problem.
Be concrete: "Page X takes 3 seconds to load" not "the app is slow."

## 5. Files Involved
A code block listing every file that is part of the problem.
```

---

## Document 2 — `objective.md`

**Purpose:** Define what "done" looks like. This document answers: after the fix is complete, what is different? It is the contract between diagnosis and implementation.

**Rules:**
- Write in future tense ("after this fix, X will...")
- Use concrete, measurable targets wherever possible
- Be explicit about what does NOT change (scope boundaries)
- Include a success metrics table
- Do not describe implementation steps here — only outcomes

**Required sections:**

```markdown
# Objective — <Fix Title>

**Status:** Planned | In Progress | Complete  
**Created:** YYYY-MM-DD  
**Last updated:** YYYY-MM-DD  
**Author:** <Name>

---

## 1. Primary Objective
One paragraph. The single sentence that captures what this fix achieves.
Explain the "before vs after" at the user experience level.

## 2. Expected Improvement Per Area
Use before/after tables for each affected area (page, API, component, etc.).
| Metric | Before | After |
|---|---|---|

## 3. Expected Impact on User Experience
Concrete description of what the user will notice. Avoid vague language ("faster", "better").
Prefer: "Opening a project page will go from 2–3 seconds to under 500ms."

## 4. What Does NOT Change
Explicit list of things that are out of scope.
This prevents scope creep and protects working systems from being touched unnecessarily.

## 5. Success Metrics
Table with: Metric | Target value
These should be verifiable after the fix is deployed.

## 6. Relationship to Other Systems
How this fix interacts with (or is isolated from) other parts of the application.
```

---

## Document 3 — `implementation-plan.md`

**Purpose:** A step-by-step technical plan for executing the fix. Each phase should be independently deployable and leave the system in a better state than before.

**Rules:**
- Lead with technical context (stack, files, constraints)
- Divide work into phases ordered by impact-to-risk ratio (highest impact, lowest risk first)
- Each phase must have: a goal, a clear result, and specific code changes
- Include actual code snippets showing the before/after diff for key changes
- End with open questions — unresolved decisions that must be answered before or during implementation
- Never include commit steps (the developer controls git)

**Required sections:**

```markdown
# Implementation Plan — <Fix Title>

**Status:** Planned | In Progress | Complete  
**Created:** YYYY-MM-DD  
**Last updated:** YYYY-MM-DD  
**Author:** <Name>

---

## Technical Context
- Stack and relevant versions
- Rendering model (SSR, CSR, etc.)
- Auth and caching mechanisms in play
- Primary files affected (code block)
- Any constraints (no migrations, no breaking changes, etc.)

---

## Phase N — <Phase Name>

**Goal:** One sentence on what this phase achieves.

**Expected result:** What the system looks like after this phase is complete.
This should be testable and observable.

### N.1 <Sub-task title>
File path and specific change.
Before/after code snippets for non-trivial changes.

### N.2 <Sub-task title>
...

---

## Phase Summary

| Phase | Effort | Impact | Risk |
|---|---|---|---|
| 1 — ... | Low / Medium / High | Low / Medium / High | Low / Medium / High |

**Recommended order:** Phase X → Phase Y → ...
Brief justification for the ordering choice.

---

## Open Questions
Numbered list of unresolved decisions or unknowns that must be addressed before or during implementation.
Each question should name who needs to answer it (developer, product, etc.).
```

---

## Updating Documents Over Time

Documents are not frozen. Update them when:
- A new root cause is discovered → update `current-state.md`
- A phase is completed → mark it in `implementation-plan.md` and update status
- The objective shifts → update `objective.md` and note why it changed
- Any document changes → bump `Last updated` at the top

When all phases in `implementation-plan.md` are complete, update the fix status to `Complete` in all three documents and in `INDEX.md`, then **archive the fix** (see the next section).

---

## Archiving a Resolved Fix (`00-FIX-DONE/`)

Once a fix is complete and verified in production, move it out of the active list into the archive folder. This keeps `docs/fix/` focused on open problems while preserving the full record of what was resolved.

**When to archive:**
- Every phase in the fix's `implementation-plan.md` is complete and its success metrics (in `objective.md`) are met and verified in production.
- For a multi-phase fix with an `implementation-tracker.md`, only when **every block** in the tracker is 🟢.

**How to archive:**

1. **Create the archive folder** if it does not exist yet:
   ```
   docs/fix/00-FIX-DONE/
   ```

2. **Move the entire fix folder into it, intact** — keep all three documents (`current-state.md`, `objective.md`, `implementation-plan.md`), plus the tracker if any. Never strip or summarise them; the archive is the reference record of what was fixed:
   ```
   docs/fix/<fix-slug>/   →   docs/fix/00-FIX-DONE/<fix-slug>/
   ```

3. **Update `INDEX.md`:**
   - Set the fix's status to 🟢 Complete and move its summary row to the **Resolved Fixes** section.
   - Repoint every link in its detail block from `./<fix-slug>/…` to `./00-FIX-DONE/<fix-slug>/…`.
   - Bump the index's `Last updated`.

4. **Bump `Last updated`** on any moved document you touch.

**Do NOT** archive a fix whose phases are not all verified in production — the archive is the source of truth for "what is actually resolved". If a fix regresses, move it back to an active `<fix-slug>/` and flip its INDEX status.

---

## Maintaining `INDEX.md`

`INDEX.md` is the entry point for the entire `docs/fix/` folder. Update it:
- When a new fix folder is created (add an entry)
- When a fix status changes (update the status field)
- When a significant update is made to any fix document (bump the index's `Last updated`)

The index entry for each fix must include:
- Fix title and link to its folder
- Current status
- A one-line importance statement (why does this fix matter to the project?)
- Created date
- Last updated date
