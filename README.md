# Intelligent RFP Response Platform — Prototype

A demo-ready prototype of a governed, provenance-first RFP response workflow for
J.P. Morgan Asset Management, built to the Phase 1 scope of
[`RFP_Generator_PRD.md`](./RFP_Generator_PRD.md). Interpretation calls are logged in
[`DECISIONS.md`](./DECISIONS.md).

**All data is synthetic.** No proprietary JPMC data, code, or documents. Figures,
personnel, clients, and performance numbers are invented for the demo.

## What it demonstrates

**Sales Workspace** — intake dashboard fed by Salesforce (stat cards, mandate-wire
intake queue with one-click *Start intake*, pipeline list with stage stepper, confidence
coverage bars, and deadline AT RISK / WATCH / ON TRACK status) → document-first
authoring workspace: the client's questionnaire rendered as received with answers
drafted in place, a per-question confidence heatmap rail, and a side panel with
substance-preserving GenAI actions (Longer / Shorter / Polish / Match voice), specialist
routing, a tier-4 AI-draft guardrail, an always-on compliance agent, and export gated
behind PASS — including export in the client's own format.

Every answer carries a provenance chip from the PRD §7 four-tier decision logic:

1. `ADVISER HISTORY — VERBATIM` — the assigned adviser's prior approved answer, reused exactly
2. `GOLDEN SOURCE — TONE ADJUSTED` — approved answer in the adviser's voice, with inline diff and one-click "Use default" revert
3. `GOLDEN SOURCE — DEFAULT` — approved answer, unmodified
4. `NEEDS CONTENT` — no governed answer exists; routed to the steward coverage-gap queue

Invariant: substance only ever originates from golden source or prior adviser-approved
answers. The prototype's "tonality model" is pre-authored variant text in seed data —
no external model calls.

**Data Steward Hub** — golden-source Q&A library (filters, freshness/staleness, version
history), structured editor enforcing all PRD §9.2 validation gates on submit,
second-steward review/approval workflow, coverage-gap queue fed by live `NEEDS CONTENT`
routing, and the Smart Enrichment feed (§9.3) with win-driven, loss-driven, convergent-
edit, coverage-gap, and freshness cards — accept/edit/dismiss with full provenance and
sample sizes; accepted cards flow into the review workflow, never straight to publish.

**Compliance supervisory agent** — rule-based scan from a structured rulebook config
(`src/data/compliance-rules.json`): promissory language, performance claims without
disclosures, superlatives, stale as-of data, semantic drift from golden source, standard
disclosures. Findings render inline with Block / Flag / Info severity; export stays
locked until the outcome is PASS (Blocks fixed, Flags acknowledged with a reason).

## Suggested demo path (~3 minutes)

1. **Sales Workspace** → click *Start intake* on a Salesforce mandate wire and watch it join the pipeline, then open the SCPERS RFP: the questionnaire pre-fills in place with visible provenance, and the supervisory agent scans automatically.
2. Click **E.3** (fees) in the document or the confidence heatmap → try *✦ Shorter* or *✦ Match voice* (substance stays locked to golden source; one-click *Undo*), then *Route to Fee Committee*.
3. On **E.4** (client references, `NEEDS CONTENT`), click *✦ Generate AI draft to start from* — the bracketed draft locks export until the SME validates it; *Send draft for validation*.
4. Open the **Document review** tab → *Apply suggested fix* on the Blocks, acknowledge the Flags with a reason → **PASS** → *Export in client's format (DOCX)*, or the branded DOCX/PDF.
5. Switch to the **Data Steward Hub** → *Smart Enrichment* → accept the win-driven "Winning variant" card → it appears in the *Review Queue* → open it, view the diff, *Approve* → golden source version bumps with full history.
6. *Coverage Gaps* now contains the three `NEEDS CONTENT` questions routed from SCPERS.

State is in-memory by design — refresh the page to reset and re-run the demo.

## Stack & architecture

- Next.js (App Router) + TypeScript + Tailwind CSS 4. No backend; all data from seed JSON.
- Every external system sits behind an adapter interface (`src/lib/adapters/`):
  `CrmAdapter`, `ContentStoreAdapter`, `RfpSourceAdapter`, `ComplianceAdapter`,
  `TonalityAdapter` (GenAI rewrites + AI drafts) — mock
  implementations only, with seams shaped for production connectors (async, domain-typed).
- Brand tokens live in a single theme file: `src/theme/theme.css`. No hardcoded colors elsewhere.
- Q&A seed data (`src/data/golden-source.json`) is a literal instance of the PRD §9.1 schema.
- Core logic: `src/lib/generation.ts` (four-tier engine), `src/lib/compliance.ts`
  (supervisory scan), `src/lib/validation.ts` (§9.2 gates), `src/lib/diff.ts` (word diff),
  `src/lib/export.ts` (client-side DOCX via `docx`, PDF via `jspdf`).

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Framework preset: **Next.js** (auto-detected). No environment variables required.
3. Deploy. Every push to the default branch redeploys.

Or with the CLI: `npx vercel` from the repo root, accept the defaults.
