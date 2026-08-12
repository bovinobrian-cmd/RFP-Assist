"use client";

// ---------------------------------------------------------------------------
// Region 2 of the authoring workspace: the 44px confidence heatmap rail — one
// cell per question in document order. Click to select + smooth-scroll the
// document to the question.
// ---------------------------------------------------------------------------

import type { Rfp } from "@/lib/types";
import type { RfpWorkState } from "@/state/AppStateContext";
import { confidenceBand, predictedBand } from "@/lib/generation";
import { classNames } from "@/lib/util";
import { BAND_BG } from "./confidence";

export function ConfidenceRail({
  rfp,
  work,
  onJump,
}: {
  rfp: Rfp;
  work: RfpWorkState;
  onJump: (questionId: string) => void;
}) {
  const questions = rfp.sections.flatMap((s) => s.questions);

  return (
    <div className="flex flex-col items-center overflow-y-auto border-x border-hairline bg-canvas py-5">
      <p className="mb-2.5 text-[9px] uppercase tracking-[0.1em] text-ink-faint [writing-mode:vertical-rl]">
        Confidence map
      </p>
      <div className="flex flex-col gap-[3px]">
        {questions.map((q) => {
          const answer = work.answers[q.id];
          const band = answer ? confidenceBand(q.matchConfidence, answer.tier) : predictedBand(q);
          return (
            <button
              key={q.id}
              onClick={() => onJump(q.id)}
              title={`${q.number} · ${Math.round(q.matchConfidence * 100)}%`}
              aria-label={`Jump to question ${q.number}`}
              className={classNames(
                "h-[13px] w-4 rounded-[2px] border-2 transition-transform hover:scale-125",
                BAND_BG[band],
                work.selectedQuestionId === q.id ? "border-ink" : "border-transparent"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
