# 12 - Tight Game Loop and Chapter Close Experiment
Status: scaffolded Type: experiment design Area: SF2 prose-first prototype / pacing / chapter close / information economy
## Context
This builds on:

- `.scratch/sf2-tui/issues/09-roll-discipline-experiment.md`
  
- `.scratch/sf2-prose-first-narrator/PRD.md`
  
- `.scratch/sf2-narrative-tempo/PRD.md`
  
- `.scratch/sf2-stateful-procedure-layer/issues/14-objective-resolved-close-reframe-gate.md`
  

The prose-first prototype materially improves narrative quality, world texture, NPC voice, and player-responsive scene flow. The Forty Thousand browser run also exposed three loop failures:

1. Information is volunteered too easily.
  
2. Roll-worthy uncertainty is often resolved through narration instead of dice.
  
3. Chapter 1 did not close after 44 narrator turns, even after multiple natural close or reframe points.
  

The core product question is not "prompt or code?" It is: which smallest control surface tightens the loop without destroying the prose-first strengths?
## Requirements
| Req | Requirement | Status |
| --- | --- | --- |
| R0  | Preserve prose-first narrative quality: physical worldbuilding, NPC voice, warmth under pressure, and scope variance. | Core goal |
| R1  | Close or explicitly reframe when the chapter's foreground question has been answered, failed, or displaced. | Must-have |
| R2  | Keep information costly: key NPC intel, hidden facts, and technical certainty require a roll, concession, risk, time cost, or narrower answer. | Must-have |
| R3  | Maintain roll discipline without forcing cosmetic cadence rolls. | Must-have |
| R4  | Keep player agency: chapter close should feel like a dramatic consequence of play, not like the system cutting off live choice. | Must-have |
| R5  | Produce measurable evidence from repeatable scenarios, not only subjective transcript reads. | Must-have |
| R6  | Avoid reintroducing the full SF2 multi-role/scene-bundle architecture unless evidence shows the lighter controls fail. | Must-have |
| R7  | Make the experiment cheap enough to run across multiple variants and seeds. | Should-have |
## Formal Close Rule Under Test
Close a chapter when the story has breathed and the context has filled. The first is a narrative judgment. The second is a technical one. Both need to be true.

Close when three or more of the following signals are true, unless a "never close mid" condition is active.

Narrative signals:

- The player character is in a physically safe location: not mid-combat, not mid-infiltration.
  
- A major decision has been made that cannot be unmade.
  
- The immediate objective is resolved: succeeded, failed, or transformed into something new.
  
- A revelation has landed that needs space before the next one arrives.
  

Technical signals:

- The conversation is long enough that early context is being dropped or is visibly stale.
  
- The GM has made two or more factual errors requiring player correction in the same session.
  
- The established fact pool is large enough that holding it all in working context is creating compression errors.
  

Structural signals:

- The handover document would be clean: everything named, everything stable, no half-open thread that only makes sense if play continues immediately.
  
- The next chapter would begin with a clear first decision rather than mid-scene continuation.
  
- The player has reached a natural exhale: the pace has slowed and the immediate pressure is off.
  

Never close mid:

- Combat or physical confrontation.
  
- An active interrogation or negotiation.
  
- A revelation sequence that has not landed yet.
  
- A scene where an NPC is present and waiting for response.
  

Operational reading:

- When narrative judgment and technical judgment are both true, close.
  
- When only narrative judgment is true, continue if technical load is still manageable.
  
- When only technical judgment is true, steer toward the nearest narrative resting point instead of closing mid-scene.
  
- Close after a peak, not after a valley. When in doubt, close after the most significant scene rather than before the next one.
  
## Approaches Worth Testing
### A: Prompt-Only Chapter Contract
Add stronger narrator protocol text and/or brief text:

- Define a chapter job in plain prose: "Chapter 1 answers whether Rix takes the rotten job and at what cost."
  
- Name close triggers: "When the job is accepted/refused and immediate berth pressure is resolved, close or reframe."
  
- Ban late expansion: "After a close trigger, do not introduce a new chapter-scale truth unless it is the next chapter hook."
  
- Add a target: "Most chapters are 10-18 meaningful player turns after setup."
  

Why test it:

- Cheapest and least invasive.
  
- Establishes whether prose-first can self-regulate with better craft instructions.
  

Risk:

- Prior SF2 evidence says prompt-only often loses to local scene momentum.
  
- The model may recite the contract but still keep escalating.
  
### B: Prompt Plus Hidden Self-Check Annotation
Require the narrator to emit hidden per-turn metadata after the prose:

```json
{
  "chapter_status": {
    "phase": "opening|pressure|decision|aftermath|close_candidate|closed|reframed",
    "foreground_question": "...",
    "answered": false,
    "close_candidate": false,
    "next_required_delta": "...",
    "should_not_do_next": "..."
  }
}
```

The app records this for diagnostics but does not enforce it.

Why test it:

- Gives the model a lightweight reflective checkpoint without adding another role.
  
- Creates analyzable telemetry: did it know a close was due and ignore it, or fail to recognize the close?
  

Risk:

- Self-report can be performative. The model may mark "close_candidate: true" and still continue.
  
- Adds protocol surface to a path that currently relies on prose naturalism.
  
### C: Deterministic Advisory Layer
Reuse the SF2 narrative-tempo and objective-resolved-close ideas as private guidance, not enforcement.

Code computes a per-turn advisory from simple observable signals:

- turn count after setup
  
- current location/scope band
  
- accepted/refused/deferred foreground decision
  
- open immediate pressure clocks
  
- number of major deltas since chapter start
  
- repeated scene predicates with no material delta
  
- whether the chapter has crossed its brief-defined scope boundary
  

The narrator receives a private directive:

```text
CHAPTER LOOP ADVISORY:
- Phase: close_candidate
- Foreground question answered: Rix accepted the broker job and secured departure path.
- Required next delta: close Chapter 1, or explicitly reframe to Chapter 2: The Sable Corridor.
- Forbidden repeat: do not add more Gannett lien/manifest/inspection friction.
```

Why test it:

- This is the lightest code-owned version of the SF2 tempo work.
  
- It preserves model ownership of prose while making the loop state harder to miss.
  

Risk:

- Guidance may still be ignored under strong local scene momentum.
  
- Computing objective state from prose-first transcript may be noisy without structured annotations.
  
### D: Deterministic Close/Reframe Gate
Code computes a close/reframe gate. When it fires, the next narrator call must either:

- close the chapter and emit a chapter-close signal, or
  
- explicitly reframe with a new foreground question and successor chapter label.
  

If the narrator continues ordinary play, the route retries once with a stronger directive or quarantines the output as non-compliant.

Why test it:

- Directly tests whether reliability requires enforcement rather than advice.
  
- Mirrors the verified core SF2 objective-resolved close/reframe pattern.
  

Risk:

- Can feel abrupt if the gate fires at the wrong time.
  
- May create "system-y" chapter endings if the narrator is boxed too tightly.
  
### E: Hybrid Controller-Lite
Combine B and C:

- The narrator emits hidden chapter status.
  
- Code computes an independent advisory.
  
- If both agree that a close is due, the next turn is a strong close directive.
  
- If they disagree, log the disagreement and keep the directive advisory-only.
  
- After repeated disagreement or a hard scope boundary crossing, escalate to D.
  

Why test it:

- Best fit for prose-first: model keeps literary judgment, code catches drift.
  
- Disagreement telemetry shows where the close model is weak.
  

Risk:

- More moving parts than A-C.
  
- Requires a clear escalation policy to avoid vague "almost close" states.
  
### F: Scene Break Mini-Debrief
At scene transitions or every 8-10 turns, run a short internal debrief:

- What question did this scene answer?
  
- What is now the chapter foreground question?
  
- Is this a close candidate?
  
- What must the next scene not repeat?
  

The debrief feeds the next narrator call and the eventual handover.

Why test it:

- Close decisions may improve if the model periodically steps out of line-level prose.
  
- Aligns with prose-first PRD mini-debriefs.
  

Risk:

- Extra model calls.
  
- May help memory/handover more than immediate close discipline.
  
### G: Player-Facing Close Affordance
When code detects a close candidate, suggested actions include an explicit close option:

- "Close Chapter 1: Depart Gannett with the deal sealed."
  
- "Reframe to Chapter 2: The Sable Corridor."
  

Why test it:

- Lets the player participate in pacing.
  
- Good fallback when the model hesitates to end.
  

Risk:

- Makes chapter structure visible in a way that may feel less like fiction.
  
- Does not solve narrator-initiated chapter drift unless the player selects the close.
  
## Recommended Experiment Arms
Do not test every combination first. Start with five arms:

| Arm | Name | Mechanism |
| --- | --- | --- |
| V0  | Baseline | Current prose-first protocol. |
| V1  | Prompt-only | A: stronger chapter contract and information-cost language. |
| V2  | Self-check | A + B: prompt contract plus hidden chapter status annotation. |
| V3  | Code advisory | A + C: prompt contract plus deterministic private advisory. |
| V4  | Hybrid controller-lite | A + B + C + escalation to D only after clear repeated drift. |

Hold G as a later UX experiment. Hold F unless V2/V3 show that the narrator recognizes close candidates only when reflecting.
## Test Design
Use two layers: close probes and scripted mini-runs.
### Layer 1: Close Probes
Build on the 09 harness pattern: extract self-contained narrator calls from a real transcript prefix. Each probe runs one to three continuation turns under each variant and records whether the narrator closes, reframes, or continues ordinary play.

Use the Forty Thousand 44-turn export as the first source.

Positive close/reframe probes

| Probe | Prefix | Expected behavior |
| --- | --- | --- |
| P1  | After the player seals the Davan/Kes arrangement and heads to the broker. | Do not close immediately, but compress toward the broker decision. |
| P2  | After the broker job is accepted, manifest plan exists, and the 40k resolution path is documented. | Close Chapter 1 within 1-2 turns, or explicitly reframe to departure pressure. |
| P3  | After Khe'Voz is told the truth and Slink is emotionally resolved. | If still Chapter 1, close/reframe before adding more Gannett tasks. |
| P4  | After undock from Gannett. | Must close or mark Chapter 2. Continuing Chapter 1 into corridor transit is failure. |
| P5  | After hold cooling is cut and route choices collapse around Ossel. | If this is Chapter 2, close/reframe at route commitment; if still Chapter 1, this is already a boundary failure. |

Negative probes

| Probe | Prefix | Expected behavior |
| --- | --- | --- |
| N1  | Early broker conversation before the job terms are understood. | Do not close. Keep the offer and debt pressure live. |
| N2  | Player says "okay" or asks for time without making a decision. | Do not close. Produce a concrete next pressure or choice. |
| N3  | Player investigates an alternative job before knowing the passenger posting relevance. | Do not close. Gate or price the information. |
### Layer 2: Scripted Mini-Runs
Run a deterministic 12-18 turn script from after character creation. This tests whether the variant can manage live accumulation, not only one-turn probes.

Use fixed player actions that intentionally hit the chapter boundary:

1. Ask broker if they filed the lien.
  
2. Hear the offer.
  
3. Press on true cargo and client.
  
4. Ask MIRA for risk assessment.
  
5. Seek alternatives at Harbour Office.
  
6. Accept temporary deferral.
  
7. Meet Gate C passengers.
  
8. Propose carrying both cargo and passengers.
  
9. Negotiate broker terms.
  
10. Document resolution with Harbour Office.
  
11. Tell Khe'Voz the truth.
  
12. Talk to Slink as captain, not interrogator.
  
13. Preflight and depart.
  

Expected chapter shape:

- Chapter 1 should close between steps 10 and 13.
  
- Best close point: after step 12, with the ship committed and crew cohesion tested.
  
- Latest acceptable close point: immediately after undock.
  
- Anything after the first corridor tactical problem should be Chapter 2.
  
### Optional Branch Scripts
Add these only after the first pass:

- Fast acceptance branch: player accepts the broker job early.
  
- Refusal branch: player rejects the job and tries to contest the lien.
  
- Digging branch: player over-investigates every NPC before deciding.
  

These test whether the close controller handles different player styles without forcing one canonical path.
## Metrics
### Hard Metrics
| Metric | Target |
| --- | --- |
| Close-candidate compliance | >= 80 percent of positive probes close or reframe within 2 turns. |
| False close rate | 0 closes on negative probes. |
| Chapter boundary discipline | 0 runs keep Chapter 1 after undock plus one additional live turn. |
| Roll-gate hit rate | >= 80 percent of expected roll gates call `request_roll` or explicitly price information without full disclosure. |
| Information-free reveal count | Down by >= 50 percent from baseline. |
| Avg narrator words per turn | Lower than baseline without becoming terse; target 400-650 for this hook. |
| New chapter-scale truths after close candidate | 0 unless framed as next-chapter hook. |
| Handover availability | 100 percent of closed runs produce handover inputs. |
### Qualitative Rubric
Score each run 1-5:

- Ending feels earned, not abrupt.
  
- Chapter title/meaning is clear.
  
- Player choice caused the close.
  
- NPC voices remain distinct.
  
- Genre texture remains strong.
  
- Consequences are preserved rather than skipped.
  
- The next chapter has a compelling opening question.
  
## Judging Outcomes
### If V1 works
Prefer prompt-only for now. Add the chapter contract and information-cost language to briefs/protocol, then gather cross-genre evidence.
### If V2 works but V1 does not
Add hidden chapter-status annotation. Use it for diagnostics first, then decide whether it should feed handover and close UI.
### If V3 works but V1/V2 do not
Adopt deterministic advisory. This is the likely minimum code-owned control surface.
### If V4 is the only reliable variant
Adopt hybrid controller-lite. Keep escalation narrow: only objective answered, hard scope boundary crossed, or repeated close-candidate drift.
### If all variants hurt prose quality
Do not promote prose-first yet. Test F mini-debrief and G player-facing close affordance before considering a larger conductor.
## First Implementation Slice
No production behavior change. The scaffold lives under `.scratch/sf2-prose-first-narrator/close-loop*`.

1. Extend the 09 experiment harness concept from single-turn roll probes to close probes. Done in `.scratch/sf2-prose-first-narrator/close-loop-experiment.mjs`.
  
2. Extract positive and negative close probes from the Forty Thousand export. Done in `.scratch/sf2-prose-first-narrator/close-loop/extract-probes.mjs`.
  
3. Add protocol/advisory variants V0-V4 as swappable prompt/control inputs. Done in `.scratch/sf2-prose-first-narrator/close-loop/variants.mjs`.
  
4. Run probes first; only run full scripted mini-runs for variants that pass probe thresholds.
  
5. Produce a comparison report with transcript snippets and metrics.
  

Dry run:

```bash
node .scratch/sf2-prose-first-narrator/close-loop-experiment.mjs \
  --export /path/to/prose-first-export.json \
  --dry-run --verbose
```

Live comparison:

```bash
node .scratch/sf2-prose-first-narrator/close-loop-experiment.mjs \
  --export /path/to/prose-first-export.json \
  --compare v0,v1,v2,v3,v4 \
  --probe-mode all
```
## Open Questions
1. Should the first experiment define chapter close as a hidden narrator signal only, or should it actually invoke the handover compiler?
  
2. Should "undock from Gannett" be a hard scope boundary for Forty Thousand Chapter 1?
  
3. Should code infer objective resolution from transcript/status annotations, or require the brief to provide structured close triggers?
  
4. How visible should chapter close be to the player in the prototype UI?
  
5. Should information-cost failures count as chapter-loop failures, or be kept as a parallel roll-discipline metric?
