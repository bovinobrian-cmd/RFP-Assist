// ---------------------------------------------------------------------------
// Domain types for the Intelligent RFP Response Platform prototype.
// Q&A pair fields mirror PRD §9.1 (snake_case preserved deliberately so the
// seed JSON is a literal instance of the documented schema).
// ---------------------------------------------------------------------------

export type AssetClassCode = "fixed_income" | "global_equity" | "multi_asset" | "firmwide";

export const ASSET_CLASS_LABEL: Record<AssetClassCode, string> = {
  fixed_income: "Fixed Income",
  global_equity: "Global Equity",
  multi_asset: "Multi-Asset",
  firmwide: "Firmwide",
};

export type PersonaRole = "adviser" | "steward";

export interface Persona {
  id: string;
  name: string;
  role: PersonaRole;
  title: string;
  initials: string;
  /** Short description of the adviser's recognizable tonal style. */
  toneProfile?: string;
}

// --- CRM (mock Salesforce) ---------------------------------------------------

export interface CrmAccount {
  id: string;
  name: string;
  type: "client" | "prospect";
  segment: string;
  relationshipOwner: string;
  aumWithFirm: string | null;
  productsHeld: string[];
  lastInteraction: string;
  notes: string;
  pastRfps: { year: number; mandate: string; outcome: "won" | "lost" | "no decision" }[];
}

/** Salesforce intake queue item (mandate wire awaiting intake). */
export interface IntakeItem {
  id: string;
  kind: RfpKind;
  issuer: string;
  shortName: string;
  /** One-line description shown under the issuer in the intake queue. */
  detail: string;
  /** Salesforce mandate-wire reference, e.g. "SF-88412". */
  wireRef: string;
  mandate: string;
  assetClass: AssetClassCode;
  vehicle: string;
  aum: string;
  mandateSize: string;
  deadline: string; // ISO date
  consultant: string | null;
  contact: string;
  channel: string;
  crmAccountId: string;
  assignedAdviserId: string;
}

// --- RFP ----------------------------------------------------------------------

export type RfpKind = "RFP" | "DDQ";

/** PRD §8.1 inbox pipeline: New → In Review → Compliance → Approved → Exported */
export type RfpStatus = "new" | "in_review" | "compliance" | "approved" | "exported";

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  new: "New",
  in_review: "In Review",
  compliance: "Compliance",
  approved: "Approved",
  exported: "Exported",
};

export interface RfpQuestion {
  id: string;
  sectionId: string;
  number: string;
  text: string;
  /**
   * Normalized question+product fingerprint produced by parsing; drives the
   * tier-1 adviser-history exact-context match (PRD §7).
   */
  contextKey: string;
  /** Q&A pair the semantic-retrieval step matched, if any (simulated). */
  matchedGoldenId: string | null;
  /** Retrieval confidence 0–1; below threshold routes to NEEDS CONTENT. */
  matchConfidence: number;
  /** Specialist team a low-/medium-confidence answer routes to, if any. */
  specialist?: string;
  /** Why the answer should be routed — shown in the authoring side panel. */
  routingReason?: string;
}

/** Retrieval-confidence band (high ≥ 0.85, medium 0.6–0.85, low < 0.6 or tier 4). */
export type ConfidenceBand = "high" | "medium" | "low";

export interface RfpSection {
  id: string;
  title: string;
  questions: RfpQuestion[];
}

export interface Rfp {
  id: string;
  kind: RfpKind;
  issuer: string;
  shortName: string;
  mandate: string;
  assetClass: AssetClassCode;
  vehicle: string;
  aum: string;
  mandateSize: string;
  deadline: string; // ISO date
  received: string; // ISO date
  consultant: string | null;
  contact: string;
  channel: string;
  crmAccountId: string;
  assignedAdviserId: string;
  status: RfpStatus;
  sections: RfpSection[];
}

// --- Golden-source Q&A pair (PRD §9.1 schema) ----------------------------------

export interface DataPoint {
  claim: string;
  value: string;
  as_of: string; // ISO date
  refresh_cadence: "monthly" | "quarterly" | "annual";
  source: string;
}

export type QaStatus = "draft" | "in_review" | "approved" | "retired";

export interface VersionRecord {
  version: number;
  date: string;
  author: string;
  note: string;
}

export interface QaPair {
  id: string;
  version: number;
  status: QaStatus;
  question_canonical: string;
  question_variants: string[];
  answer_text: string;
  answer_summary: string;
  asset_class: AssetClassCode;
  products: string[];
  vehicle_types: string[];
  client_types: string[];
  regions: string[];
  compliance_tags: string[];
  required_disclosures: string[];
  data_points: DataPoint[];
  owner: string;
  approver: string | null;
  effective_date: string;
  review_by: string; // freshness SLA — mandatory
  supersedes: string | null;
  usage_stats: {
    retrievals_90d: number;
    downstream_edit_rate: number;
    /** Mock win/loss linkage powering Smart Enrichment (PRD §9.3 signal 2). */
    win_linked_uses: number;
    win_rate: number | null;
  };
  /** Prototype extension: full version trail rendered in the review workflow. */
  version_history: VersionRecord[];
  /**
   * Prototype extension: pre-authored tonality variants keyed by adviser id —
   * the simulated LLM output for tier 2. Substance matches answer_text.
   */
  tone_variants: Record<string, string>;
}

// --- Adviser response history (tier 1) ------------------------------------------

export interface AdviserHistoryEntry {
  id: string;
  adviserId: string;
  contextKey: string;
  questionText: string;
  answerText: string;
  sourceRfp: string;
  clientName: string;
  approvedDate: string;
  outcome: "won" | "lost" | "pending";
}

// --- Generation (PRD §7 four-tier logic) -----------------------------------------

export type GenerationTier = 1 | 2 | 3 | 4;

export const TIER_CHIP: Record<GenerationTier, string> = {
  1: "ADVISER HISTORY — VERBATIM",
  2: "GOLDEN SOURCE — TONE ADJUSTED",
  3: "GOLDEN SOURCE — DEFAULT",
  4: "NEEDS CONTENT",
};

/** Lifecycle of a generated-from-scratch AI draft (tier-4 guardrail). */
export type AiDraftState = null | "unvalidated" | "pending_validation";

export interface DraftAnswer {
  questionId: string;
  tier: GenerationTier;
  text: string;
  /** Text before the last GenAI rewrite — enables one-click undo. */
  prevText: string | null;
  /** Canonical golden-source text, kept for the diff + one-click revert (tier 2). */
  goldenText: string | null;
  goldenId: string | null;
  historyId: string | null;
  edited: boolean;
  reverted: boolean;
  /** Adviser marked this answer reviewed (drives the % reviewed indicator). */
  accepted: boolean;
  /** Sent to the question's specialist (Steward Hub coverage-gap queue). */
  routed: boolean;
  /** Non-null while an AI starting-point draft is awaiting SME validation — locks export. */
  aiDraft: AiDraftState;
  provenanceNote: string;
}

// --- GenAI tonality actions -----------------------------------------------------

/** Substance-preserving rewrite actions offered in the authoring side panel. */
export type GenAiAction = "longer" | "shorter" | "polish" | "match_voice";

export const GEN_AI_ACTION_LABEL: Record<GenAiAction, string> = {
  longer: "Longer",
  shorter: "Shorter",
  polish: "Polish",
  match_voice: "Match voice",
};

// --- Export -------------------------------------------------------------------

export type ExportFormat = "client_docx" | "branded_docx" | "branded_pdf";

// --- Compliance supervisory agent (PRD §10) ---------------------------------------

export type ComplianceSeverity = "Block" | "Flag" | "Info";

export interface ComplianceRule {
  id: string;
  name: string;
  severity: ComplianceSeverity;
  kind:
    | "phrase"
    | "performance_disclosure"
    | "document_disclosure"
    | "stale_data"
    | "semantic_drift";
  patterns?: string[];
  requiredDisclosure?: string;
  maxAgeMonths?: number;
  rationale: string;
  suggestion: string;
}

export interface ComplianceFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: ComplianceSeverity;
  questionId: string | null; // null → document-level finding
  matchedText: string | null;
  rationale: string;
  suggestion: string;
  /** One-click remediation the UI can apply (replacement or append). */
  autoFix: { kind: "replace" | "append"; find?: string; text: string } | null;
  resolved: boolean;
  /** Flags require adviser acknowledgment with a reason (PRD §10). */
  acknowledged: boolean;
  ackReason: string | null;
}

export type ComplianceOutcome = "PASS" | "FLAG" | "BLOCK";

// --- Data Steward Hub ---------------------------------------------------------------

export interface CoverageGap {
  id: string;
  questionText: string;
  rfpId: string;
  rfpName: string;
  questionId: string;
  assetClass: AssetClassCode;
  raisedBy: string;
  raisedDate: string;
  status: "open" | "drafting" | "resolved";
}

/** PRD §9.3 enrichment prompt types. */
export type EnrichmentKind =
  | "promote_winning_variant"
  | "convergent_edit"
  | "underperforming_answer"
  | "coverage_gap"
  | "freshness_breach";

export const ENRICHMENT_KIND_LABEL: Record<EnrichmentKind, string> = {
  promote_winning_variant: "Promote winning variant",
  convergent_edit: "Convergent edit",
  underperforming_answer: "Underperforming answer",
  coverage_gap: "Coverage gap",
  freshness_breach: "Freshness breach",
};

export interface EnrichmentCard {
  id: string;
  kind: EnrichmentKind;
  title: string;
  rationale: string;
  qaId: string | null;
  proposedQuestion: string | null;
  proposedAnswer: string | null;
  proposedDataPoints: DataPoint[] | null;
  provenance: {
    sources: string[];
    sampleSize: string;
    signal: string;
  };
  status: "new" | "accepted" | "dismissed";
  dismissReason: string | null;
}

export interface ReviewItem {
  id: string;
  qaId: string | null;
  title: string;
  proposedQuestion: string;
  proposedAnswer: string;
  proposedDataPoints: DataPoint[];
  assetClass: AssetClassCode;
  submittedBy: string;
  submittedDate: string;
  origin: "editor" | "enrichment" | "coverage_gap";
  originDetail: string;
  status: "pending_review" | "approved" | "rejected";
}
