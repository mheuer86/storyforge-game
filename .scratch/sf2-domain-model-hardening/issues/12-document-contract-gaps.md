# Close remaining Document contract gaps

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Document review

## What to build

Audit and close the remaining gaps in the `Sf2Document` contract. Documents already have a useful first-class shape: closed type/status enums, locked original attribution, current summary revisions, subject ids, and replay fixtures. This issue should not re-invent the document entity. It should decide which weak fields are intentional and harden only the parts that still cause drift or over-capture.

## Acceptance criteria

- [ ] Document remains reserved for named artifacts whose authority, attribution, contents, or provenance matter in future play
- [ ] The document lifecycle table is documented in scratch or source comments with allowed transitions by type
- [ ] Free-string `additionalParties.role` is either intentionally kept open or replaced with a small enum plus escape hatch
- [ ] Document-vs-clue guidance is verified: document records the artifact; clue records what the PC learned from it
- [ ] Retrieval surfaces active/relevant documents with enough attribution to prevent signer/filer drift
- [ ] Drift flags around protected attribution fields have a clear observe/enforce story
- [ ] Replay fixtures cover the remaining chosen gaps, or the issue records why existing fixtures are sufficient

## Blocked by

None - can start immediately

## Comments

Current implementation already covers a lot:

- `Sf2DocumentType` and `Sf2DocumentStatus` are closed enums
- `DOCUMENT_VALID_TRANSITIONS` constrains terminal lifecycle transitions
- `originalSummary`, `filedByEntityId`, `signedByEntityId`, and `type` are protected after creation
- document updates are amendment-only and append revisions
- existing fixtures cover attribution creation, amendment locking, illegal transitions, duplicate create rejection, auto ids, synthesized-id recovery, and protected-field updates

Open design questions:

- Should documents be allowed to concern only NPCs/factions, or should subject references also support locations, operations, threads, and the PC?
- Should `accessLevel` remain optional flavor, or become load-bearing for retrieval/scene permissions?
- Are document drift findings only Archivist notes, or should some become display/repair enforcement?

## Agent Brief

**Category:** architecture
**Summary:** Close the last Document contract gaps without replacing the existing useful model.

**Current behavior:** Documents are already first-class and partially hardened, but some fields remain free-form or policy-only.

**Desired behavior:** Documents have a clear source-of-truth contract: artifact identity, attribution baseline, amendment lifecycle, and retrieval/drift behavior are explicit and fixture-backed.

**Key interfaces:** `Sf2Document`, `Sf2DocumentType`, `Sf2DocumentStatus`, `DOCUMENT_VALID_TRANSITIONS`, `checkDocument`, `apply-patch.ts`, Archivist prompt/tool schemas, document replay fixtures, retrieval scene packet.

**Out of scope:** Turning every written mention or clue into a document.
