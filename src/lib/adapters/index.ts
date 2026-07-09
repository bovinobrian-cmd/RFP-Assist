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
  Persona,
  QaPair,
  Rfp,
} from "../types";

/** Salesforce (mocked): entity match, adviser assignment, relationship history. */
export interface CrmAdapter {
  getAccount(accountId: string): Promise<CrmAccount | null>;
  getAdviser(adviserId: string): Promise<Persona | null>;
  getAdviserHistory(adviserId: string): Promise<AdviserHistoryEntry[]>;
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
