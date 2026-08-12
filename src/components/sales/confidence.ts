// ---------------------------------------------------------------------------
// Confidence-band and pipeline-stage presentation maps shared by the intake
// dashboard and the authoring workspace. Bands map onto the existing semantic
// tokens: high → positive, medium → caution, low → critical.
// ---------------------------------------------------------------------------

import type { ConfidenceBand, RfpStatus } from "@/lib/types";
import { RFP_STATUS_LABEL } from "@/lib/types";

export const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const BAND_TEXT: Record<ConfidenceBand, string> = {
  high: "text-positive",
  medium: "text-caution",
  low: "text-critical",
};

export const BAND_BG: Record<ConfidenceBand, string> = {
  high: "bg-positive",
  medium: "bg-caution",
  low: "bg-critical",
};

export const BAND_TINT_BG: Record<ConfidenceBand, string> = {
  high: "bg-positive-tint",
  medium: "bg-caution-tint",
  low: "bg-critical-tint",
};

export const BAND_BORDER: Record<ConfidenceBand, string> = {
  high: "border-positive",
  medium: "border-caution",
  low: "border-critical",
};

/** PRD §8.1 pipeline order, drives the five-segment stage stepper. */
export const STAGE_ORDER: RfpStatus[] = ["new", "in_review", "compliance", "approved", "exported"];

export const STAGE_LABEL = RFP_STATUS_LABEL;

export const STAGE_TEXT: Record<RfpStatus, string> = {
  new: "text-info",
  in_review: "text-accent-deep",
  compliance: "text-caution",
  approved: "text-positive",
  exported: "text-ink",
};

export const STAGE_BG: Record<RfpStatus, string> = {
  new: "bg-info",
  in_review: "bg-accent-deep",
  compliance: "bg-caution",
  approved: "bg-positive",
  exported: "bg-ink",
};
