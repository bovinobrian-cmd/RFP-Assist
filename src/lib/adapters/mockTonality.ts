// ---------------------------------------------------------------------------
// Mock GenAI tonality service. Rewrites are deterministic text transforms so
// the demo never invents substance: "longer" appends supporting boilerplate,
// "shorter" trims trailing sentences, "polish" normalizes whitespace, and
// "match voice" swaps in the pre-authored per-adviser tone variant (the same
// simulated LLM output used by tier-2 generation).
//
// From-scratch drafts (tier-4 guardrail) are pre-authored per contextKey with
// bracketed placeholders standing in for real data — they are flagged
// unvalidated by the caller and lock export until an SME validates them.
// ---------------------------------------------------------------------------

import type { TonalityAdapter } from "./index";
import { simulateLatency } from "../util";

const LONGER_ADDITION =
  "Supporting detail, exhibits, and the relevant appendix references are included to give the Board and its consultant a complete picture.";

const DRAFT_TEMPLATES: Record<string, string> = {
  "core_bond.team.departures":
    "Over the past five years the core fixed income team has experienced [N] portfolio manager departures. [For each: name/role, year, reason — retirement, internal transfer, resignation — and the succession arrangement, including transition overlap period.] Portfolio continuity was maintained in each case through the team-based decision structure and documented succession planning.",
  "core_bond.references":
    "We would be pleased to provide three client references for core fixed income separate accounts comparable to this mandate in size and structure. [Reference 1: public pension plan, ~$500–750M, relationship length]. [Reference 2]. [Reference 3]. Contact information will be provided upon shortlisting, with each client's prior consent.",
  "core_bond.esg.climate_reporting":
    "The firm conducts climate scenario analysis using [platform/methodology] across transition and physical risk pathways, including [scenario set, e.g. NGFS scenarios]. At the mandate level we can provide [portfolio carbon metrics, scenario results, TCFD-aligned reporting frequency]. [Confirm current mandate-level TCFD reporting capability with the sustainable investing team.]",
  "global_select_equity.reporting.data_feed":
    "The firm delivers daily position-level data feeds via [delivery mechanism — SFTP or API] in [formats], with a reporting portal refreshed [frequency]. [Confirm feed specifications, cut-off times, and integration support for the endowment's internal risk system with Client Reporting & Data Services.]",
};

export const mockTonalityAdapter: TonalityAdapter = {
  async rewrite(action, text, context) {
    await simulateLatency(750);
    switch (action) {
      case "longer":
        return `${text.trim()} ${LONGER_ADDITION}`;
      case "shorter": {
        const sentences = text.trim().split(". ");
        return sentences.length <= 2 ? text.trim() : `${sentences.slice(0, 2).join(". ")}.`;
      }
      case "polish":
        return text.replace(/\s+/g, " ").trim();
      case "match_voice":
        return context.toneVariant ?? text;
    }
  },

  async generateDraft(question) {
    await simulateLatency(1000);
    return (
      DRAFT_TEMPLATES[question.contextKey] ??
      `[Draft starting point — replace every bracketed item with validated data before routing.] In response to "${question.text}": [key facts]. [Supporting detail]. [Relevant policy or process reference.]`
    );
  },
};
