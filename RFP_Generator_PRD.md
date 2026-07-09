# Product Requirements Document
## Intelligent RFP Response Platform — J.P. Morgan Asset Management

**Author:** Brian Bovino
**Status:** Draft v1.0
**Audience:** Claude Code (prototype build) → JPMAM Engineering (productionalization)
**Last Updated:** July 2026

---

## 1. Executive Summary

J.P. Morgan Asset Management responds to a high volume of RFPs across institutional and retail distribution. Today, a team of ~70 RFP writers aligned to asset classes maintains a governed library of Q&A content and manually completes questionnaires through a workflow tool. This creates a bottleneck between opportunity arrival and response delivery, and puts the writers — not the salespeople — at the center of the workflow.

This platform reimagines the flow: **RFPs are ingested automatically, parsed, matched to CRM context, and pre-filled from the governed Q&A knowledge base — adjusted for the assigned client adviser's historical tonality — then routed through human review and an automated compliance gate before export.** Salespeople and their client advisers work from a dedicated dashboard embedded in Salesforce. RFP writers are repositioned as **RFP Data Stewards**: shifting from production labor to content governance — curating the golden-source Q&A library through a content management experience that enforces machine-readability standards and evolves answers based on win/loss outcomes (Smart Enrichment).

The document covers two delivery horizons:

- **Phase 1 — Prototype:** A standalone, Vercel-hosted demo (personal GitHub repo) with mock data, JPMAM branding, and the full end-to-end experience simulated. Built to be *embeddable-feeling* and demo-ready.
- **Phase 2 — Production:** The industrialized version brought inside the firm — real Salesforce embedding, live integrations, API contracts, resiliency, observability, and data governance. The prototype's architecture must not paint us into a corner; every mock is built behind an adapter interface that production engineers swap for real connectors.

---

## 2. Problem Statement

RFP response is a high-frequency, high-stakes workflow where speed and quality directly affect win rates. The current model routes every questionnaire through a centralized writer team, creating queue time, inconsistent tonality relative to how each client adviser communicates, and no systematic reuse of an adviser's own prior answers. Writers spend most of their capacity on repetitive assembly rather than improving the quality and coverage of the governed content library. There is no automated compliance gate — review is manual and late in the process.

**Cost of not solving:** slower response turnaround (lost or late bids), writer capacity consumed by low-value assembly, tonal inconsistency across client relationships, and compliance risk concentrated in manual review.

---

## 3. Goals

1. **Compress RFP turnaround time** from receipt to compliant, export-ready response — target 70%+ reduction in cycle time vs. the writer-mediated flow.
2. **Maximize first-pass answer quality** — 80%+ of auto-generated answers accepted with zero or tonality-only edits by the client adviser team.
3. **Preserve answer governance** — 100% of generated content traceable to an approved golden-source Q&A pair or a prior adviser-approved response. The system never free-generates substance.
4. **Shift writer capacity to governance** — writers manage content standards, freshness, and coverage in a purpose-built CMS rather than assembling responses.
5. **Embed compliance early** — every response passes an automated supervisory review before it can be exported, with a full audit trail.

## 4. Non-Goals

- **Autonomous submission.** The system never sends a response without human review and explicit approval. (Human-in-the-loop is a permanent design principle, not a v1 limitation.)
- **Free-form generative answers.** The LLM adjusts tonality and assembles governed content; it does not author new substantive claims about products, performance, or capabilities. Out of scope permanently as a guardrail.
- **Prototype: real system integrations.** No live Salesforce, CMS, RFP-wire, or compliance-policy connections in Phase 1. All mocked behind adapters.
- **Prototype: authentication/SSO, entitlements, PII handling.** Demo runs with mock users. Production section defines the real requirements.
- **Replacing the RFP writer function.** The role is repositioned to content governance, not eliminated. Change-management framing matters for adoption.

---

## 5. Personas

| Persona | Role in Workflow | Primary Surface |
|---|---|---|
| **Salesperson (Client Adviser, senior)** | Owns the client relationship; sees incoming RFPs tied to their book; accountable for the response going out | RFP Dashboard (Salesforce-embedded) |
| **Junior Client Adviser** | Reviews, edits, and finalizes auto-generated responses; primary hands-on user | RFP Dashboard — Response Workspace |
| **RFP Data Steward** | Curates golden-source Q&A pairs; enforces content standards; monitors freshness and coverage | Content Management Hub |
| **Compliance Supervisory Agent (automated)** | Reviews final draft against compliance rules before export; flags or blocks | Compliance Review stage (system actor) |
| **Compliance Officer (production)** | Configures agent rulebook; handles escalated flags | Compliance console (Phase 2) |

---

## 6. User Stories

### Salesperson / Client Adviser team
- As a **salesperson**, I want incoming RFPs matched to my Salesforce opportunities and pre-filled automatically, so that my team starts from a 90% draft instead of a blank questionnaire.
- As a **junior client adviser**, I want to see *why* each answer looks the way it does — golden source, my adviser's historical answer, or a tonality adjustment — so I can review with judgment instead of re-checking everything.
- As a **junior client adviser**, I want a one-click option to revert any adjusted answer to the default golden-source version, so the governed content is always my safety net.
- As a **junior client adviser**, I want the compliance agent's findings shown inline with clear reasons, so I can resolve flags without a separate review cycle.
- As a **salesperson**, I want the final approved response as a polished, branded document I can download and email to the prospect, so delivery is immediate.

### RFP Data Steward
- As an **RFP data steward**, I want to create and edit Q&A pairs in a structured editor that validates required fields and quality standards on submit, so everything entering the library is machine-readable by construction.
- As an **RFP data steward**, I want to see which Q&A pairs are stale, unused, or frequently edited downstream by advisers, so I know where to focus curation effort.
- As an **RFP data steward**, I want a review/approval workflow with versioning, so nothing reaches "approved" golden-source status without a second set of eyes.

### Compliance
- As a **compliance officer** (production), I want the supervisory agent's rulebook sourced from our documented policies and procedures, and every review decision logged immutably, so the automated gate is auditable and defensible.

---

## 7. End-to-End Workflow

```
RFP Wire / Public Source
        │  (1) Ingest
        ▼
┌─────────────────┐   (2) Parse questions + metadata
│  Parsing Engine  │──────────────────────────────┐
└─────────────────┘                               ▼
        │                             ┌───────────────────────┐
        │ (3) Entity match            │  Structured RFP object │
        ▼                             └───────────────────────┘
┌─────────────────┐                               │
│ CRM (Salesforce) │  client vs. prospect,        │
│     Adapter      │  assigned adviser, history   │
└─────────────────┘                               ▼
                                      ┌───────────────────────┐
        (4) Answer generation ───────▶│   Generation Engine    │
                                      │  golden-source Q&A +   │
                                      │  adviser history +     │
                                      │  tonality profile      │
                                      └───────────────────────┘
                                                  │
                                    (5) Human review & edit
                                                  ▼
                                      ┌───────────────────────┐
                                      │  Response Workspace    │
                                      │  (provenance surfaced) │
                                      └───────────────────────┘
                                                  │
                                    (6) Compliance agent gate
                                                  ▼
                                      ┌───────────────────────┐
                                      │  Supervisory Review    │
                                      │  pass / flag / block   │
                                      └───────────────────────┘
                                                  │
                                    (7) Export & deliver
                                                  ▼
                                      Branded document (DOCX/PDF)
                                      downloaded + emailed by adviser
```

### Answer Generation Decision Logic (core guardrail)

For each parsed question, in strict priority order:

1. **Adviser history exact-context match.** If the *same assigned client adviser* has previously answered the *same question for the same product*, reuse that answer **verbatim** (cut-and-paste, no regeneration). Label: `ADVISER HISTORY — VERBATIM`.
2. **Golden-source match + tonality adjustment.** Match the question to an approved Q&A pair (semantic retrieval scoped by asset class/product metadata). Apply the adviser's tonality profile (derived from their response history) *without changing substance*. Label: `GOLDEN SOURCE — TONE ADJUSTED`, with a visible diff against the unmodified golden answer and a one-click "Use default" revert.
3. **Golden-source match, no adjustment.** If no adviser history exists, use the approved answer as-is. Label: `GOLDEN SOURCE — DEFAULT`.
4. **No confident match.** Do not generate. Mark the question `NEEDS CONTENT` and route it to the writer team as a coverage gap. This is a feature, not a failure state — it feeds the CMS backlog.

**Invariant:** substance always originates from an approved golden-source pair or a previously approved adviser response. The model's degrees of freedom are limited to tone, phrasing, and assembly.

---

## 8. Requirements

### 8.1 Phase 1 — Prototype (P0)

**RFP Ingestion & Parsing**
- [ ] Ingest a sample RFP from a mock "wire" inbox; include at least one real-world-style public example (e.g., a public pension plan's investment manager search questionnaire) to demonstrate parsing credibility.
- [ ] Parse into a structured object: full question list (sections, question numbers, types) **plus metadata** — issuing entity, mandate/asset class, vehicle, AUM/mandate size, submission deadline, consultant (if any), contact.
- [ ] Metadata drives downstream matching; render it as an RFP header card.

**CRM Context (mocked)**
- [ ] Mock Salesforce adapter returns: existing client vs. prospect vs. past prospect; assigned client adviser; opportunity record; relationship history summary.
- [ ] Prospect/client status and adviser assignment visible on the RFP card.

**Answer Generation**
- [ ] Implements the four-tier decision logic above against a mock golden-source Q&A library (~30–50 seeded pairs across 2–3 asset classes) and mock adviser response history (seed at least two advisers with distinct, recognizable tonal styles).
- [ ] Every answer carries a provenance chip (`ADVISER HISTORY — VERBATIM` / `GOLDEN SOURCE — TONE ADJUSTED` / `GOLDEN SOURCE — DEFAULT` / `NEEDS CONTENT`).
- [ ] Tone-adjusted answers show an inline diff vs. golden source and a "Use default" revert.

**Demo Navigation — two primary tabs (P0)**
- [ ] The prototype presents two top-level workspaces in a persistent tab bar:
  - **Sales Workspace** — RFP inbox, response workspace, compliance review, export (salesperson / client adviser persona).
  - **Data Steward Hub** — golden-source library, validated editor, review workflow, coverage-gap queue, and Smart Enrichment feed (data steward persona).
- [ ] A lightweight persona switcher (mock users) makes the demo narrative explicit: same platform, two operating roles.

**Response Workspace (Dashboard)**
- [ ] RFP inbox: list of incoming RFPs with status (New → In Review → Compliance → Approved → Exported), deadline countdown, client/prospect badge, assigned adviser.
- [ ] Response workspace: question-by-question review pane; edit in place; accept/revert per answer; progress indicator (% reviewed).
- [ ] Standalone web app that *feels* embeddable — clean, panel-based layout consistent with a Salesforce Lightning container; no dependency on Salesforce for the demo.

**Compliance Supervisory Agent (mocked rulebook)**
- [ ] After adviser review, a rule-based agent scans the full draft: flags promissory/guarantee language, performance claims without required disclosures, missing standard disclosures, superlatives, stale data references.
- [ ] Findings rendered inline with severity (Block / Flag / Info) and plain-English rationale; blocked items must be resolved before export.
- [ ] Rulebook stored as a structured config file — the production analog is the firm's documented supervisory procedures.

**Export**
- [ ] Generate a polished, JPMAM-branded response document (DOCX and PDF) the adviser downloads and emails to the prospect.
- [ ] Export blocked until compliance status is green.

**Data Steward Hub (prototype scope)**
- [ ] Steward-facing UI: Q&A library browser (filter by asset class, product, status, freshness), structured editor, validation on submit (see §9), review/approve workflow with version history, and a "coverage gaps" queue fed by `NEEDS CONTENT` questions.
- [ ] **Smart Enrichment feed (P0 for demo):** a prioritized queue of AI-generated content-evolution prompts driven by mock win/loss outcome data (see §9.3). Seed 4–6 realistic enrichment cards (e.g., "This variant of the ESG integration answer appeared in 4 of the last 5 winning fixed income mandates — promote to golden source?") with accept / edit / dismiss actions and full provenance.

**Branding & Deployment**
- [ ] Visual identity aligned to J.P. Morgan Asset Management: restrained institutional palette (near-black/white foundation, J.P. Morgan brown accent), confident typography, generous whitespace. Use placeholder brand tokens in a single theme file; exact hex values and logo assets to be sourced from the internal brand portal before any external showing.
- [ ] Codebase in Brian's personal GitHub; deployed to Vercel. Recommended stack: Next.js (App Router) + TypeScript + Tailwind; mock data as seed JSON; all external systems behind adapter interfaces (`CrmAdapter`, `ContentStoreAdapter`, `RfpSourceAdapter`, `ComplianceAdapter`) with mock implementations.
- [ ] **No proprietary JPMC data, code, or documents in the public prototype.** All content synthetic.

### 8.2 Phase 2 — Production (P0 for industrialization)

**Salesforce embedding**
- Deliver as a Lightning Web Component / Lightning Out surface inside the adviser's Salesforce workspace; SSO via firm identity provider; entitlements scoped to book of business.

**Live integrations**
- RFP wire APIs (ingestion), Salesforce CRM (opportunity/client match, adviser assignment), the existing content management system (ingest + enrich the current Q&A library into the governed schema), document generation service, email delivery via firm-approved channels.

**API contracts (all internal services)**
- OpenAPI 3.1 specs for every service boundary. Core resources: `POST /rfps` (ingest), `POST /rfps/{id}/parse`, `GET /rfps/{id}/questions`, `POST /answers/generate` (batch, idempotent), `GET/POST/PATCH /qa-pairs` (+ versioned), `POST /compliance/reviews`, `POST /exports`.
- Standards: OAuth2 client-credentials between services; idempotency keys on all mutating calls; cursor pagination; RFC 7807 problem-details error model; explicit versioning (`/v1`); rate limits and quotas per consumer; correlation IDs propagated end to end.

**Resiliency & operations**
- Async, queue-based parsing and generation (RFP ingest is bursty); retries with exponential backoff and dead-letter queues; circuit breakers on all external dependencies; graceful degradation (if tonality service is down, fall back to golden-source default — never block on the enhancement layer).
- SLOs: 99.9% availability on the dashboard; parse P95 < 2 min for a 200-question RFP; generation P95 < 5 min end-to-end.
- Observability: distributed tracing, structured logs, RED metrics per service, alerting on SLO burn.
- DR: multi-AZ, RTO/RPO per firm standards for a Tier 2 application (to be confirmed with app risk classification).

**Security & data governance**
- Client and prospect data classified and handled per firm policy; encryption in transit and at rest; no client-identifying data sent to any model endpoint not approved by the firm's AI governance process; model calls via the firm's approved LLM gateway.
- **Immutable audit trail:** every generated answer, edit, provenance decision, compliance finding, and export logged with actor, timestamp, and content hash. Books-and-records retention per supervision requirements.

**Model governance**
- Generation and tonality models registered with firm model risk management; documented evaluation set (answer fidelity vs. golden source — substance must not drift); periodic revalidation; kill switch to golden-source-only mode.

### 8.3 Nice-to-Have (P1)
- Steward analytics dashboard: downstream edit rates, usage frequency, staleness heatmap (Smart Enrichment surfaces the prompts; this adds the exploratory view).
- Adviser tonality profiles as inspectable, editable artifacts (not a black box) — adviser can view and tune their profile.
- Bulk import (CSV/JSON) into the CMS with the same validation gates, for migrating the legacy library.
- Deadline-driven prioritization and workload view across the RFP inbox.

### 8.4 Future Considerations (P2)
- Consultant-database (eVestment-style) questionnaire auto-maintenance from the same golden source.
- Multi-language response generation with jurisdiction-aware compliance rulebooks.
- Advanced outcome modeling: move beyond correlation cards to segment-level win-driver analysis across the full response corpus (builds on the Smart Enrichment pipeline).

---

## 9. Content Management Hub — Golden Source Governance

The CMS is a first-class architectural component, not an admin panel. Its purpose: **every Q&A pair in the library is maximally machine-readable, so retrieval and generation are consistent and reliable by construction.**

### 9.1 Q&A Pair Schema

```json
{
  "id": "qa_000123",
  "version": 4,
  "status": "approved",            // draft | in_review | approved | retired
  "question_canonical": "Describe your firm's approach to ESG integration in fixed income portfolios.",
  "question_variants": [
    "How do you incorporate ESG factors into fixed income?",
    "What is your ESG process for bond strategies?"
  ],
  "answer_text": "...",             // self-contained, tone-neutral prose
  "answer_summary": "One-sentence abstract for retrieval ranking.",
  "asset_class": "fixed_income",    // controlled vocabulary
  "products": ["core_bond", "global_agg"],
  "vehicle_types": ["mutual_fund", "sma", "cit"],
  "client_types": ["institutional"],
  "regions": ["us", "emea"],
  "compliance_tags": ["esg_claims", "requires_disclosure:esg_standard"],
  "required_disclosures": ["disc_esg_01"],
  "data_points": [
    { "claim": "ESG-integrated AUM", "value": "$XXXbn", "as_of": "2026-03-31", "refresh_cadence": "quarterly", "source": "firm_reporting" }
  ],
  "owner": "writer_id",
  "approver": "senior_writer_id",
  "effective_date": "2026-04-15",
  "review_by": "2026-10-15",        // freshness SLA — mandatory
  "supersedes": "qa_000123@v3",
  "usage_stats": { "retrievals_90d": 41, "downstream_edit_rate": 0.12 }
}
```

### 9.2 Validation Gates (enforced on submit — hard blocks unless noted)

**Required-field completeness**
1. Canonical question, answer text, asset class, ≥1 product, client type(s), owner, effective date, and `review_by` date — all mandatory.
2. Compliance tags mandatory whenever the answer contains performance references, forward-looking language, or ESG/sustainability claims (auto-detected, writer confirms).

**Machine-readability & quality standards**
3. **Atomicity:** one question, one answer. Compound questions rejected with a prompt to split.
4. **Self-containment:** no unresolved references ("as noted above," "see Section 3," dangling pronouns). Lint on submit.
5. **Canonical + variants:** at least one phrasing variant encouraged (soft warning) — improves semantic retrieval recall.
6. **Data-point tagging:** every number, AUM figure, headcount, or date in the answer must be captured as a structured `data_point` with an `as_of` date and refresh cadence. This is what keeps generated responses from shipping stale figures.
7. **Tone neutrality:** golden source is written in house-neutral tone; tonality is applied downstream per adviser. Style lint flags first-person flourishes and superlatives.
8. **No client-specific content:** entity names, client-confidential terms, and one-off pricing rejected from golden source (client specificity lives in adviser history, not the library).
9. **Acronym hygiene:** acronyms defined on first use or present in the controlled glossary.
10. **Duplicate detection:** semantic-similarity check against existing approved pairs; near-duplicates (≥0.92 similarity) require the writer to merge, differentiate, or justify.
11. **Length bounds:** answer between 40 and 600 words (configurable per question type); summaries ≤ 30 words.

**Lifecycle**
12. New/edited pairs enter `in_review`; approval by a second writer promotes to `approved`; all versions retained; `retired` pairs excluded from retrieval but preserved for audit.
13. Pairs past `review_by` are flagged stale, surfaced on the writer dashboard, and demoted in retrieval ranking (production: optionally excluded).

### 9.3 Smart Enrichment — Win-Driven Content Evolution

The library must not be static. Smart Enrichment closes the loop between **outcomes** (wins, losses, adviser edits) and **content** (golden-source Q&A pairs), and it does so *through* the steward — never around them.

**Signal sources**
1. **Win/loss outcomes:** RFP results ingested from Salesforce (mocked in prototype). Each submitted response's answer set is linked to the opportunity outcome.
2. **Answer-level outcome correlation:** for questions with multiple observed variants (golden source vs. adviser-edited versions), track which variants appear disproportionately in winning responses, controlling for asset class and client type.
3. **Downstream edit patterns:** when advisers repeatedly make the same substantive edit to a golden-source answer, that convergent edit is itself an enrichment signal.
4. **Freshness and usage:** stale, unused, or high-edit-rate pairs surface for retirement or rework.

**Enrichment prompt types (steward-facing cards)**
| Prompt | Trigger | Proposed Action |
|---|---|---|
| **Promote winning variant** | An edited variant outperforms golden source in win-linked responses | Draft an updated golden-source pair from the winning variant, with diff |
| **Convergent edit** | ≥3 advisers make substantively similar edits to the same pair | Propose incorporating the common edit |
| **Underperforming answer** | Pair appears disproportionately in losses for a segment | Flag for rework; suggest segment-specific variant |
| **Coverage gap** | `NEEDS CONTENT` cluster from live RFP flow | Draft a candidate pair for steward authorship |
| **Freshness breach** | `review_by` passed or `data_point` past refresh cadence | Prompt review with pre-filled updated data points |

**Governance guardrails (non-negotiable)**
- Enrichment suggestions **never auto-publish**. Every accepted card enters the standard `in_review` → approval workflow, passes all §9.2 validation gates, and preserves/re-evaluates compliance tags.
- Every enrichment card carries provenance: which RFPs, outcomes, and edits generated the signal, with sample sizes shown (no correlation theater — a "4 of 5 wins" card must say n=5).
- Outcome correlation is decision support, not causation. UI copy reflects this; stewards remain the editorial authority.
- Losses are as valuable as wins: the system explicitly mines losing responses for underperforming content, not just winners for promotion.

**Why this matters strategically:** this converts the steward team from librarians into a performance function — the content library compounds in quality with every mandate contested, which is the mechanism that scales response capacity without scaling headcount.

---

## 10. Compliance Supervisory Agent

- **Input:** the full assembled response (post-human-edit), question-level provenance, and RFP metadata.
- **Rulebook:** structured configuration derived from the desk's written supervisory procedures (prototype: representative mock rules).
- **Checks (representative):** guarantee/promissory language; performance claims without required disclosures; missing boilerplate disclosures for the vehicle/jurisdiction; superlative and unverifiable claims; stale `as_of` data relative to refresh cadence; deviations from golden source beyond tonality (semantic drift check between generated answer and source pair).
- **Outcomes:** `PASS`, `FLAG` (adviser must acknowledge with reason), `BLOCK` (must fix; export disabled).
- **Audit:** every finding and resolution logged; production log is immutable and retention-managed.

---

## 11. Success Metrics

**Leading (prototype demo → pilot)**
- % of questions auto-filled with confident provenance (target ≥ 85% on seeded demo; ≥ 70% in pilot on real RFPs).
- % of auto-filled answers accepted with zero or tonality-only edits (target ≥ 80%).
- End-to-end cycle time, RFP receipt → export-ready (target ≥ 70% reduction vs. baseline).
- Compliance findings caught pre-export per RFP (evidence the gate works), and false-flag rate (< 10%).

**Lagging (production)**
- Writer hours shifted from assembly to governance (capacity mix).
- Content freshness: % of approved pairs within `review_by` SLA (target ≥ 95%).
- RFP participation rate (can we bid on more) and win-rate trend on responded mandates.
- Downstream edit rate per Q&A pair trending down (content quality flywheel).
- Smart Enrichment adoption: % of enrichment prompts actioned (accepted/edited/dismissed with reason) within SLA; % of golden-source pairs updated via win-driven enrichment per quarter.

---

## 12. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | Which RFP wires/consultant platforms are in scope for direct API ingestion, and what are their contract/API terms? | Distribution + Procurement | Phase 2 |
| 2 | What is the system of record for the current Q&A library, and what's the migration/enrichment path into the governed schema? | Writer team + Engineering | Phase 2 |
| 3 | Which supervisory procedures govern RFP responses, and who owns translating them into the agent rulebook? | Compliance | Phase 2 |
| 4 | Salesforce embedding approach — LWC vs. Lightning Out vs. Canvas — given firm platform standards? | Salesforce platform team | Phase 2 |
| 5 | Approved LLM gateway and model list for client-adjacent content generation; model risk classification for tonality adjustment? | AI governance / MRM | Phase 2 |
| 6 | Books-and-records treatment of generated drafts vs. final responses (what must be retained)? | Compliance / Records | Phase 2 |
| 7 | Adviser tonality profile: derived purely from their prior responses, or adviser-configurable from day one? | Product | No — prototype derives from history |

---

## 13. Delivery Plan

**Phase 1 — Prototype (personal GitHub → Vercel)**
1. Repo scaffold: Next.js + TypeScript + Tailwind; theme file with JPMAM-aligned brand tokens; adapter interfaces with mock implementations; seed data (2 sample RFPs incl. one public-style pension search, 30–50 Q&A pairs, 2 advisers with distinct tonal histories, mock Salesforce records).
2. RFP inbox + parsing view (structured questions + metadata header).
3. Generation engine with four-tier provenance logic; response workspace with chips, diffs, revert.
4. Compliance agent + inline findings; export to branded DOCX/PDF.
5. Content Management Hub: library, validated editor, review workflow, coverage-gap queue.
6. Demo polish: guided happy path, realistic latency, empty/error states.

**Phase 2 — Productionalization (inside the firm)**
Pull the codebase in; swap adapters for live connectors (Salesforce, CMS, RFP wires, LLM gateway); implement API contracts per §8.2; stand up async pipeline, observability, and audit trail; complete model-risk and app-risk onboarding; pilot with one asset-class desk before scaling.

---

## Appendix A — Provenance Labels (UI copy)

| Chip | Meaning | Adviser Action |
|---|---|---|
| `ADVISER HISTORY — VERBATIM` | Your prior approved answer for this product, reused exactly | Confirm still current |
| `GOLDEN SOURCE — TONE ADJUSTED` | Approved answer, rephrased to your voice; substance unchanged | Review diff; revert available |
| `GOLDEN SOURCE — DEFAULT` | Approved answer, unmodified | Review |
| `NEEDS CONTENT` | No governed answer exists | Route to writer team |

---

## Appendix B — Competitive Landscape & Positioning (July 2026)

**Market structure.** The RFP software category splits into two tiers. Legacy content-library platforms — Responsive (formerly RFPIO), Loopio, and Qvidian (Upland) — center on searchable answer libraries with workflow and collaboration; Qvidian is the incumbent with financial-services heritage and formal review workflows. AI-native challengers — Tribble, Arphie, Inventive AI, AutoRFP.ai, AutogenAI — are built around retrieval-augmented generation, source attribution, and confidence scoring, and claim 70–90% first-draft automation. The known weakness of the legacy tier is that libraries demand constant manual maintenance and their AI is bolt-on; the known weakness of the challenger tier is thinner enterprise governance and integration depth.

**Closest analogs to Smart Enrichment.** Tribble's analytics layer ("Tribblytics") tracks which answers appear in winning vs. losing proposals and feeds gaps back to the knowledge base — the nearest existing implementation of outcome-driven content learning (vendor-claimed +25% win-rate improvement; treat as marketing until validated). Ombud curates reusable content based on cross-deal performance. Outcome learning is therefore *emerging* in the market — but no vendor combines it with a governed golden-source model and a steward approval gate the way this design does.

**Where this design is differentiated (no observed vendor parity):**
1. **Golden-source-only generation with provenance chips.** Market tools generate from broad document corpora with confidence scores; none enforce the invariant that substance may only originate from an approved pair or a prior adviser-approved response, with the provenance visible per answer.
2. **Adviser-level tonality personalization + verbatim-reuse guardrail.** Vendors personalize to *brand* voice; none personalize to the *individual assigned client adviser* with an exact-context verbatim rule.
3. **Automated compliance supervisory gate as a blocking stage,** with a rulebook derived from written supervisory procedures and semantic-drift checks vs. golden source. Vendors offer audit trails and approval workflows; none ship a supervisory agent as a hard pre-export gate.
4. **Structured data-point tagging (`as_of` + refresh cadence)** enabling automated staleness detection at the claim level — market staleness checks operate at document/answer level at best.
5. **Steward-gated enrichment.** Tribble's outcome loop feeds analytics; this design routes every win-driven suggestion through human editorial approval and full validation gates — the governance posture a regulated asset manager requires.

**Where the market is at parity or ahead (build accordingly, don't reinvent):** semantic retrieval with confidence scoring, multi-format ingestion (DOCX/XLSX/portals), SME routing via Slack/Teams, and procurement-portal browser extensions are table stakes among AI-native vendors. Phase 2 should meet these baselines rather than treat them as differentiators.

**Positioning statement.** *Existing tools make RFP teams faster librarians. This platform makes the response process a closed-loop, governed system: substance locked to golden source, voice personalized to the adviser, compliance automated as a gate, and content that provably improves with every mandate contested — inside Salesforce, where the sales team already lives.*
