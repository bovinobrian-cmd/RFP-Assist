# Intelligent RFP Response Platform — Prototype

A demo-ready prototype of a governed, provenance-first RFP response workflow for
J.P. Morgan Asset Management, built to the Phase 1 scope of
[`RFP_Generator_PRD.md`](./RFP_Generator_PRD.md). Interpretation calls are logged in
[`DECISIONS.md`](./DECISIONS.md).

**All data is synthetic.** No proprietary JPMC data, code, or documents. Figures,
personnel, clients, and performance numbers are invented for the demo.

## What it demonstrates

**Sales Workspace** — RFP inbox (status pipeline, deadline countdown, client/prospect
badge, assigned adviser) → RFP detail with parsed metadata header and Salesforce match
panel → provenance-first draft generation → question-by-question review → automated
compliance gate → branded DOCX/PDF export.

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

1. **Sales Workspace** → open the SCPERS RFP and watch it pre-fill with visible provenance (90% auto-filled).
2. On **C.1** (philosophy), click *View diff* to see the tonality adjustment, then *Use default* to revert to golden source.
3. Click *Run compliance review* → two Blocks surface in the adviser-history answers (E.1, E.3). Click *Apply suggested fix* on each; acknowledge the two Flags with a reason → **PASS**.
4. *Download DOCX* / *Download PDF* — the branded response document.
5. Switch to the **Data Steward Hub** → *Smart Enrichment* → accept the win-driven "Winning variant" card → it appears in the *Review Queue* → open it, view the diff, *Approve* → golden source version bumps with full history.
6. *Coverage Gaps* now contains the three `NEEDS CONTENT` questions routed from SCPERS.

State is in-memory by design — refresh the page to reset and re-run the demo.

## Stack & architecture

- Next.js (App Router) + TypeScript + Tailwind CSS 4. No backend; all data from seed JSON.
- Every external system sits behind an adapter interface (`src/lib/adapters/`):
  `CrmAdapter`, `ContentStoreAdapter`, `RfpSourceAdapter`, `ComplianceAdapter` — mock
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
