// ---------------------------------------------------------------------------
// Generation engine — PRD §7 four-tier answer decision logic.
//
// Invariant (PRD §7): substance always originates from an approved golden-
// source pair or a previously approved adviser response. Tone variants are
// pre-authored per adviser in seed data (simulated LLM output) — nothing here
// composes new substantive text.
// ---------------------------------------------------------------------------

import type {
  AdviserHistoryEntry,
  DraftAnswer,
  GenerationTier,
  QaPair,
  RfpQuestion,
} from "./types";

/** Below this retrieval confidence, a question routes to NEEDS CONTENT. */
export const MATCH_CONFIDENCE_THRESHOLD = 0.6;

export function generateAnswer(
  question: RfpQuestion,
  adviserId: string,
  adviserHistory: AdviserHistoryEntry[],
  qaPairs: QaPair[]
): DraftAnswer {
  // Tier 1 — adviser history exact-context match: same adviser, same
  // question+product fingerprint. Verbatim reuse, no regeneration.
  const historyHit = adviserHistory.find(
    (h) => h.adviserId === adviserId && h.contextKey === question.contextKey
  );
  if (historyHit) {
    return draft(question, 1, historyHit.answerText, {
      historyId: historyHit.id,
      provenanceNote: `Reused verbatim from your approved answer for ${historyHit.clientName} (${historyHit.sourceRfp.match(/\((\d{4})\)/)?.[1] ?? historyHit.approvedDate.slice(0, 4)}) — outcome: ${historyHit.outcome}.`,
    });
  }

  // Tiers 2/3 require a confident golden-source retrieval match against an
  // APPROVED pair (retired/in-review content is excluded from retrieval).
  const golden =
    question.matchedGoldenId && question.matchConfidence >= MATCH_CONFIDENCE_THRESHOLD
      ? qaPairs.find((p) => p.id === question.matchedGoldenId && p.status === "approved")
      : undefined;

  if (golden) {
    // Tier 2 — tonality adjustment exists for the assigned adviser.
    const toneVariant = golden.tone_variants[adviserId];
    if (toneVariant) {
      return draft(question, 2, toneVariant, {
        goldenId: golden.id,
        goldenText: golden.answer_text,
        provenanceNote: `Golden source ${golden.id} (v${golden.version}), rephrased to your voice. Substance unchanged — review the diff or revert to default.`,
      });
    }
    // Tier 3 — golden source as-is.
    return draft(question, 3, golden.answer_text, {
      goldenId: golden.id,
      goldenText: golden.answer_text,
      provenanceNote: `Approved golden source ${golden.id} (v${golden.version}), used unmodified. Match confidence ${(question.matchConfidence * 100).toFixed(0)}%.`,
    });
  }

  // Tier 4 — no confident match. Do not generate; route as a coverage gap.
  return draft(question, 4, "", {
    provenanceNote: `No governed answer met the confidence threshold (best match ${(question.matchConfidence * 100).toFixed(0)}%). Routed to the Data Steward coverage-gap queue.`,
  });
}

function draft(
  question: RfpQuestion,
  tier: GenerationTier,
  text: string,
  extra: Partial<DraftAnswer>
): DraftAnswer {
  return {
    questionId: question.id,
    tier,
    text,
    goldenText: null,
    goldenId: null,
    historyId: null,
    edited: false,
    reverted: false,
    accepted: false,
    provenanceNote: "",
    ...extra,
  };
}
