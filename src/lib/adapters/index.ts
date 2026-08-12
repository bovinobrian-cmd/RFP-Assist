// ---------------------------------------------------------------------------
// Adapter interfaces (PRD §8.1 Branding & Deployment).
// Production engineers swap the mock implementations for live connectors
// (Salesforce, CMS, RFP wires, compliance policy service) without touching
// UI code. Everything is async and returns plain domain objects.
// ---------------------------------------------------------------------------

import type {
  AdviserHistoryEntry,
  ComplianceFinding,
  ComplianceRule,
  CrmAccount,
  DraftAnswer,
  GenAiAction,
  IntakeItem,
  Persona,
  QaPair,
  Rfp,
  RfpQuestion,
} from "../types";

/** Salesforce (mocked): entity match, adviser assignment, relationship history. */
export interface CrmAdapter {
  getAccount(accountId: string): Promise<CrmAccount | null>;
  getAdviser(adviserId: string): Promise<Persona | null>;
  getAdviserHistory(adviserId: string): Promise<AdviserHistoryEntry[]>;
  /** Mandate wires awaiting intake — feeds the dashboard's Salesforce queue. */
  listIntakeQueue(): Promise<IntakeItem[]>;
}

/**
 * GenAI tonality service (mocked LLM). The four-tier invariant holds at this
 * seam: rewrites adjust length/tone only and may never alter substance, and
 * from-scratch drafts are unvalidated starting points with bracketed
 * placeholders — they lock export until an SME validates or replaces them.
 */
export interface TonalityAdapter {
  rewrite(
    action: GenAiAction,
    text: string,
    context: { adviser: Persona | null; toneVariant: string | null }
  ): Promise<string>;
  generateDraft(question: RfpQuestion): Promise<string>;
}

/** Governed golden-source content store (the CMS behind the Data Steward Hub). */
export interface ContentStoreAdapter {
  listQaPairs(): Promise<QaPair[]>;
  getQaPair(id: string): Promise<QaPair | null>;
}

/** RFP wire / consultant portal ingestion (mocked inbox). */
export interface RfpSourceAdapter {
  listRfps(): Promise<Rfp[]>;
  getRfp(id: string): Promise<Rfp | null>;
}

/** Supervisory rulebook source (structured config; production: policy service). */
export interface ComplianceAdapter {
  getRulebook(): Promise<{
    rulebookVersion: string;
    standardDisclosure: string;
    performanceDisclosure: string;
    rules: ComplianceRule[];
  }>;
  /** Runs the supervisory scan. Prototype: local rule engine over the draft. */
  review(
    rfp: Rfp,
    answers: DraftAnswer[],
    qaPairs: QaPair[]
  ): Promise<ComplianceFinding[]>;
}

export { mockCrmAdapter } from "./mockCrm";
export { mockContentStoreAdapter } from "./mockContentStore";
export { mockRfpSourceAdapter } from "./mockRfpSource";
export { mockComplianceAdapter } from "./mockCompliance";
export { mockTonalityAdapter } from "./mockTonality";
