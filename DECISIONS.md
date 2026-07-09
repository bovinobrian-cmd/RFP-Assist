# Build Decisions

Interpretation calls made where the PRD/kickoff brief left room, chosen to strengthen the
demo narrative (per the kickoff instruction). Reference: `RFP_Generator_PRD.md`.

## Process
1. **PRD timing.** The build started from the kickoff brief because `RFP_Generator_PRD.md`
   was not yet in the repo; the PRD arrived mid-build and the schema/status/outcome
   vocabularies were aligned to it (§9.1 field names, `draft|in_review|approved|retired`,
   `New → In Review → Compliance → Approved → Exported`, `PASS/FLAG/BLOCK`).

## Data & matching
2. **Retrieval simulation.** Semantic retrieval is simulated: each parsed question carries
   `matchedGoldenId` + `matchConfidence` produced "by parsing." The generation engine
   applies the four-tier logic over these signals plus adviser history `contextKey`
   matching. This keeps tier outcomes deterministic and demo-safe while preserving the
   production seam (swap the parse/retrieval step, keep the engine).
3. **Tonality simulation.** Tier-2 tone adjustments are pre-authored per-adviser variants
   stored on the Q&A pair (`tone_variants`, a documented prototype extension to §9.1).
   Substance is identical to `answer_text` by construction — no external model calls.
4. **Deliberate imperfections live in adviser history, not golden source.** Both seeded
   compliance Blocks (performance claim without disclosure; promissory "guarantee")
   originate from tier-1 verbatim adviser-history answers. Golden source stays clean,
   which reinforces the governance story: ungoverned reuse is where risk hides. The one
   golden-source soft issue is a superlative ("best-in-class" in the firmwide ESG answer)
   that surfaces as a Flag, plus stale AUM data points that trigger the stale-data Flag
   and the freshness-breach enrichment card.
5. **SCPERS is 29 questions** (brief allowed 25–40) across 7 sections; Northfield is 10.
   Tier mix on SCPERS: 2× tier 1, 4× tier 2, 20× tier 3, 3× tier 4 → 90% auto-filled,
   matching the PRD's ≥85% target for the seeded demo.

## Compliance
6. **FLAG acknowledgment.** Per §10, Flags require adviser acknowledgment with a reason;
   PASS is reached when no unresolved Blocks and no unacknowledged Flags remain. Info
   findings are informational and auto-resolved.
7. **Semantic drift check** (prototype form): edited golden-sourced answers that introduce
   figures absent from the source pair raise a Flag. Production replaces this heuristic
   with a real semantic comparison.
8. **Standard document disclosures** are appended automatically by the export template and
   surfaced as an Info finding rather than a Block — keeps the demo moving while showing
   the check exists.
9. **One finding per rule per answer** to keep the review pane readable.

## Steward hub
10. **§9.2 gate levels.** Hard blocks: required fields, compliance tags (auto-detected),
    atomicity, self-containment, data-point tagging, client specificity, duplicates
    (≥0.92 similarity), length bounds. Soft warnings: missing variants, tone-neutrality
    lint, acronym hygiene, missing summary. Duplicate similarity uses token overlap as
    the prototype stand-in for semantic similarity.
11. **Enrichment cards** cover all five §9.3 prompt types (one each), including the
    required loss-driven "underperforming answer" card. Every card shows sample sizes
    (n=) and "decision support, not causation" copy per the §9.3 guardrails. Accepting a
    card creates a `pending_review` item — nothing auto-publishes.
12. **Approval bumps version** on the target pair (with `supersedes` and version history)
    or creates a new v1 approved pair; the prototype collapses "second writer" identity
    to the active persona.

## Platform
13. **In-memory only.** All state in React context; a page refresh resets the demo — this
    is treated as a feature (repeatable demos), noted in the README.
14. **Export** uses client-side `docx` + `jspdf`. The branded header is text-only
    ("J.P. Morgan Asset Management") — logo assets deliberately excluded per §8.1
    (sourced from the internal brand portal before any external showing).
15. **All figures synthetic.** AUM, returns, fees, team counts, and personnel names are
    invented for the demo and resemble no real disclosure.
