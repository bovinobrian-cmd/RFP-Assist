"use client";

// ---------------------------------------------------------------------------
// Region 1 of the authoring workspace: the client's questionnaire rendered as
// received — a white page on the desk surface, with answers drafted in place.
// Clicking a question selects it and drives the side panel.
// ---------------------------------------------------------------------------

import type { DraftAnswer, Rfp, RfpQuestion } from "@/lib/types";
import type { RfpWorkState } from "@/state/AppStateContext";
import { confidenceBand, predictedBand } from "@/lib/generation";
import { classNames, formatDate } from "@/lib/util";
import { BAND_BG, BAND_BORDER, BAND_LABEL } from "./confidence";

export function DocumentView({
  rfp,
  work,
  onSelect,
}: {
  rfp: Rfp;
  work: RfpWorkState;
  onSelect: (questionId: string) => void;
}) {
  const openFindingCount = (questionId: string) =>
    work.findings.filter((f) => f.questionId === questionId && !f.resolved).length;

  return (
    <div className="mx-auto max-w-[860px] border border-hairline bg-paper px-[72px] py-16 font-display shadow-raised">
      <p className="text-center font-sans text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        {rfp.kind === "DDQ" ? "Due Diligence Questionnaire" : "Request for Proposal"}
      </p>
      <h1 className="mt-2.5 text-center text-2xl font-normal leading-[1.3] text-ink">{rfp.issuer}</h1>
      <p className="mt-1.5 text-center text-[15px] italic text-ink-soft">
        {rfp.mandate} — Due {formatDate(rfp.deadline)}
      </p>
      <p className="mt-5 border-t border-hairline pt-5 text-center font-sans text-xs text-ink-faint">
        Questionnaire as received from {rfp.consultant ?? rfp.channel}
        {" · answers drafted in place — no cut & paste"}
      </p>

      {rfp.sections.length === 0 && (
        <p className="mt-11 text-center font-sans text-sm italic text-ink-faint animate-pulse">
          Parsing questionnaire — questions and pre-filled answers will appear here…
        </p>
      )}

      {rfp.sections.map((section) => (
        <section key={section.id}>
          <h2 className="mt-11 border-b-2 border-ink pb-1.5 text-base font-bold tracking-[0.03em] text-ink">
            {section.title}
          </h2>
          {section.questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              answer={work.answers[q.id]}
              selected={work.selectedQuestionId === q.id}
              generating={work.generatingQuestionId === q.id}
              generationRunning={work.generation === "running"}
              openFindings={openFindingCount(q.id)}
              onSelect={() => onSelect(q.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function QuestionBlock({
  question,
  answer,
  selected,
  generating,
  generationRunning,
  openFindings,
  onSelect,
}: {
  question: RfpQuestion;
  answer: DraftAnswer | undefined;
  selected: boolean;
  generating: boolean;
  generationRunning: boolean;
  openFindings: number;
  onSelect: () => void;
}) {
  const band = answer ? confidenceBand(question.matchConfidence, answer.tier) : predictedBand(question);
  const hasText = !!answer?.text.trim();

  return (
    <div
      id={`doc-q-${question.id}`}
      onClick={onSelect}
      className={classNames(
        "mt-[26px] cursor-pointer rounded-chip outline-2 outline-offset-8",
        selected ? "outline-accent" : "outline-transparent"
      )}
    >
      <p className="text-[14.5px] font-bold leading-[1.5] text-ink">
        <span className="mr-2">{question.number}</span>
        {question.text}
      </p>
      <div className={classNames("mt-2.5 border-l-4 py-0.5 pl-4", BAND_BORDER[band])}>
        {hasText ? (
          <p className="whitespace-pre-line text-sm leading-[1.75] text-ink">{answer!.text}</p>
        ) : answer && answer.tier === 4 ? (
          <p className="rounded-chip border border-dashed border-critical/40 bg-critical-tint/50 px-3.5 py-2.5 text-sm italic text-critical">
            {answer.routed
              ? `Awaiting new content from ${question.specialist ?? "the specialist team"}.`
              : "Needs content — no governed answer exists. Route to a specialist, or generate an AI draft to start from."}
          </p>
        ) : (
          <p className={classNames("font-sans text-sm italic text-ink-faint", (generating || generationRunning) && "animate-pulse")}>
            {generating ? "Matching governed content…" : "Queued for provenance-first generation…"}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans">
          <span className={classNames("h-2 w-2 rounded-full", BAND_BG[band])} aria-hidden />
          <span className="text-[11px] text-ink-faint">
            {BAND_LABEL[band]} confidence · {Math.round(question.matchConfidence * 100)}% match
          </span>
          {answer?.routed && (
            <span className="rounded-full bg-info-tint px-2 py-px text-[10px] font-semibold text-info">
              → Routed to {question.specialist ?? "specialist"}
            </span>
          )}
          {openFindings > 0 && (
            <span className="rounded-full bg-critical-tint px-2 py-px text-[10px] font-semibold text-critical">
              ⚑ {openFindings} compliance
            </span>
          )}
          {answer?.accepted && (
            <span className="rounded-full bg-positive-tint px-2 py-px text-[10px] font-semibold text-positive">
              ✓ Reviewed
            </span>
          )}
          {answer?.aiDraft && (
            <span className="rounded-full border border-dashed border-caution/50 bg-caution-tint px-2 py-px text-[10px] font-bold tracking-[0.04em] text-caution">
              ✦ AI DRAFT — PENDING SME VALIDATION
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
