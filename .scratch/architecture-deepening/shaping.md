# Shaping: Architecture Deepening

Status: selected
Phase: shaping
Parent: `.scratch/architecture-deepening/PRD.md`
Selected shape: A: SF2 Reliability Spine First

## Purpose

Shape the architecture-deepening backlog before shaping individual tickets. This document is the high-level ground truth for requirements, strategy shapes, and fit checks. The PRD and issue files should be updated after a shape is selected.

## Decision

Shape A is selected. The backlog should follow the SF2 reliability spine:

1. Shape and implement the Chapter Pressure Runtime Module first.
2. Shape and implement the Narrator Turn Context Module second.
3. Keep the four remaining findings discoverable with explicit pull-forward triggers.
4. Shape individual tickets only when they become next-up.

## R: Requirements

| Req | Requirement | Status |
| --- | --- | --- |
| R0 | Improve Module Depth, Locality, and Leverage around the architectural friction found in the review without turning the backlog into a broad rewrite. | Core goal |
| R1 | Preserve V1 streaming feel, roll-pause choreography, chapter close behavior, and browser save compatibility. | Must-have |
| R2 | Prioritize the current SF2 reliability agenda: computed pressure, bounded scene context, state over history, and validated writes. | Must-have |
| R3 | Make each selected slice independently verifiable with focused fixtures, replay fixtures, or deterministic module tests. | Must-have |
| R4 | Preserve the V1/SF2 distinction and Storyforge domain language in the PRD, shaping doc, and individual tickets. | Must-have |
| R5 | Prefer code-owned state, pacing, validation, and projection over prompt-only instructions when prompt drift has already shown up. | Must-have |
| R6 | Make dependencies explicit so individual tickets do not drift from the selected backlog strategy. | Must-have |
| R7 | Keep near-term work small enough for a solo local-play workflow: one deepening slice should be understandable and reviewable before starting the next. | Must-have |
| R8 | Keep all six architecture-review findings discoverable, even if some become deferred follow-up tickets. | Must-have |

## S: Shapes

## A: SF2 Reliability Spine First

| Part | Mechanism |
| --- | --- |
| A1 | Shape and implement the Chapter Pressure Runtime Module first, because pressure is the highest-leverage computed-pacing seam. |
| A2 | Shape the Narrator Turn Context Module second, because bounded scene context is the next highest-leverage SF2 reliability seam. |
| A3 | Update all six tickets after selecting this shape: pressure and Narrator context become active; V1 commit, roll transaction, save normalization, and canonical references stay discoverable with explicit pull-forward triggers. |
| A4 | Do not shape every ticket deeply now. Shape each ticket only when it becomes the next implementation candidate. |

## B: V1 Safety Spine First

| Part | Mechanism |
| --- | --- |
| B1 | Shape and implement the V1 Turn Commit Pipeline Module first, because it protects shipped turn behavior and save shape. |
| B2 | Shape the Roll Transaction Module second, because roll pauses and roll-first behavior are high-risk V1 integration surfaces. |
| B3 | Pull Save Normalization forward if commit or roll work exposes persistence fragility. |
| B4 | Defer SF2 pressure and Narrator context until the shipped V1 path feels safer. |

## C: Persistence And Reference Foundations First

| Part | Mechanism |
| --- | --- |
| C1 | Shape Save Normalization first, separating raw-save repair from browser storage and new-campaign creation. |
| C2 | Shape Canonical Reference Policy second, concentrating ID shape, reference resolution, placeholder rules, fallback owners, and coercion policy. |
| C3 | After the foundation slices, revisit pressure, Narrator context, V1 commit, and roll transaction tickets with cleaner state and reference assumptions. |
| C4 | Treat this as an infrastructure-first pass across both V1 and SF2. |

## D: Opportunistic Ticket Backlog

| Part | Mechanism |
| --- | --- |
| D1 | Keep all six tickets as independent `needs-triage` work items. |
| D2 | Shape each ticket only when active feature or bug work touches that area. |
| D3 | Avoid selecting a strategic order at the PRD level. |
| D4 | Use the PRD only as a memory aid, not as an implementation roadmap. |

## Fit Check

| Req | Requirement | Status | A | B | C | D |
| --- | --- | --- | --- | --- | --- | --- |
| R0 | Improve Module Depth, Locality, and Leverage around the architectural friction found in the review without turning the backlog into a broad rewrite. | Core goal | ✅ | ✅ | ✅ | ❌ |
| R1 | Preserve V1 streaming feel, roll-pause choreography, chapter close behavior, and browser save compatibility. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R2 | Prioritize the current SF2 reliability agenda: computed pressure, bounded scene context, state over history, and validated writes. | Must-have | ✅ | ❌ | ❌ | ❌ |
| R3 | Make each selected slice independently verifiable with focused fixtures, replay fixtures, or deterministic module tests. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R4 | Preserve the V1/SF2 distinction and Storyforge domain language in the PRD, shaping doc, and individual tickets. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R5 | Prefer code-owned state, pacing, validation, and projection over prompt-only instructions when prompt drift has already shown up. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R6 | Make dependencies explicit so individual tickets do not drift from the selected backlog strategy. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R7 | Keep near-term work small enough for a solo local-play workflow: one deepening slice should be understandable and reviewable before starting the next. | Must-have | ✅ | ✅ | ❌ | ✅ |
| R8 | Keep all six architecture-review findings discoverable, even if some become deferred follow-up tickets. | Must-have | ✅ | ✅ | ✅ | ✅ |

Notes:

- B fails R2 because it spends first capacity on shipped V1 hardening instead of the queued SF2 reliability agenda.
- C fails R2 because it starts with infrastructure foundations that help SF2 indirectly, but does not address computed pressure or bounded scene context first.
- C fails R7 because save normalization plus canonical reference policy is a wider cross-cutting start than a single SF2 reliability slice.
- D fails R0, R2, R3, R5, and R6 because it preserves memory but does not provide a coherent architecture strategy or test surface.

## Selected Shape

Selected: **A: SF2 Reliability Spine First**.

Rationale:

- It best matches Storyforge's current state: SF2 is where the architectural learning is happening, and pressure/context are the highest-leverage seams.
- It protects V1 by not touching shipped turn behavior until there is a specific reason.
- It keeps the other four findings discoverable without pretending they are all equally urgent.

## Decisions

1. A is the selected PRD-level shape.
2. The first ticket, Chapter Pressure Runtime Module, should be shaped next before implementation.
3. The PRD and all six issue files should carry selected-shape context so the deferred findings remain discoverable without appearing equally urgent.
