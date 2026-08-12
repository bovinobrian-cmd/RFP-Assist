"use client";

// ---------------------------------------------------------------------------
// Region 3 of the authoring workspace: the 420px side panel with two tabs.
// Tab A ("This answer") edits the selected question — GenAI tonality actions,
// specialist routing, the tier-4 AI-draft guardrail, and per-answer compliance.
// Tab B ("Document review") is document-level: the whole-document compliance
// agent, review progress, coverage, and the gated export actions.
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { ComplianceFinding, ExportFormat, Persona, Rfp } from "@/lib/types";
import { GEN_AI_ACTION_LABEL, type GenAiAction } from "@/lib/types";
import type { RfpWorkState } from "@/state/AppStateContext";
import { useAppState } from "@/state/AppStateContext";
import { ProvenanceChip, SeverityPill } from "@/components/ui";
import { confidenceBand, predictedBand } from "@/lib/generation";
import { overallOutcome } from "@/lib/compliance";
import { exportClientDocx, exportDocx, exportPdf } from "@/lib/export";
import { classNames } from "@/lib/util";
import rulebookData from "@/data/compliance-rules.json";
import { BAND_BG, BAND_LABEL, BAND_TEXT, BAND_TINT_BG } from "./confidence";

const GEN_AI_ACTIONS: GenAiAction[] = ["longer", "shorter", "polish", "match_voice"];

const WORKING_LABEL: Record<GenAiAction | "draft", string> = {
  longer: "Making it longer",
  shorter: "Making it shorter",
  polish: "Polishing",
  match_voice: "Rephrasing to your voice",
  draft: "Generating a starting-point draft",
};

export function SidePanel({
  rfp,
  work,
  adviser,
  onJump,
}: {
  rfp: Rfp;
  work: RfpWorkState;
  adviser: Persona | undefined;
  onJump: (questionId: string) => void;
}) {
  const { setPanelTab } = useAppState();
  const questions = rfp.sections.flatMap((s) => s.questions);
  const selected = questions.find((q) => q.id === work.selectedQuestionId) ?? questions[0];
  const openFindings = work.findings.filter(
    (f) => !f.resolved && !(f.severity === "Flag" && f.acknowledged)
  );

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto bg-paper">
      <div className="grid shrink-0 grid-cols-2 border-b border-hairline">
        <TabButton
          active={work.panelTab === "answer"}
          onClick={() => setPanelTab(rfp.id, "answer")}
          label={`THIS ANSWER · ${selected?.number ?? "—"}`}
        />
        <TabButton
          active={work.panelTab === "doc"}
          onClick={() => setPanelTab(rfp.id, "doc")}
          label={`DOCUMENT REVIEW${openFindings.length ? ` · ${openFindings.length} ⚑` : ""}`}
        />
      </div>
      {work.panelTab === "answer" ? (
        selected ? (
          <AnswerTab rfp={rfp} work={work} questionId={selected.id} />
        ) : (
          <p className="px-6 py-8 text-center text-sm italic text-ink-faint">
            Waiting for the questionnaire parse — select a question once it appears.
          </p>
        )
      ) : (
        <DocumentReviewTab rfp={rfp} work={work} adviser={adviser} onJump={onJump} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "border-b-2 py-[11px] text-xs font-semibold tracking-[0.04em]",
        active ? "border-accent bg-paper text-ink" : "border-transparent bg-canvas text-ink-faint"
      )}
    >
      {label}
    </button>
  );
}

// --- Tab A — This answer -------------------------------------------------------

function AnswerTab({ rfp, work, questionId }: { rfp: Rfp; work: RfpWorkState; questionId: string }) {
  const {
    updateAnswerText,
    acceptAnswer,
    runGenAi,
    undoGenAi,
    generateAiDraft,
    routeQuestion,
  } = useAppState();

  const question = rfp.sections.flatMap((s) => s.questions).find((q) => q.id === questionId)!;
  const answer = work.answers[questionId];
  const band = answer ? confidenceBand(question.matchConfidence, answer.tier) : predictedBand(question);
  const findings = work.findings.filter((f) => f.questionId === questionId);
  const working = work.genAiWorking;

  const hasEditor = !!answer && (answer.tier !== 4 || answer.aiDraft !== null);
  const canGenerate = !!answer && answer.tier === 4 && answer.aiDraft === null && !answer.routed;

  return (
    <>
      {/* Header: number, confidence, question, provenance */}
      <div className="border-b border-hairline px-6 py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Answer · {question.number}
          </p>
          <span
            className={classNames(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold",
              BAND_TINT_BG[band],
              BAND_TEXT[band]
            )}
          >
            <span className={classNames("h-[7px] w-[7px] rounded-full", BAND_BG[band])} aria-hidden />
            {BAND_LABEL[band]} · {Math.round(question.matchConfidence * 100)}% match confidence
          </span>
        </div>
        <p className="mt-2 font-display text-[15px] leading-[1.5] text-ink">{question.text}</p>
        {answer ? (
          <>
            <ProvenanceChip tier={answer.tier} className="mt-2.5" />
            <p className="mt-2 text-[11px] italic text-ink-faint">{answer.provenanceNote}</p>
          </>
        ) : (
          <p className="mt-2.5 text-[11px] italic text-ink-faint animate-pulse">
            Matching governed content…
          </p>
        )}
      </div>

      {/* Editor + GenAI actions */}
      {hasEditor && (
        <div className="border-b border-hairline px-6 py-[18px]">
          <textarea
            value={answer.text}
            onChange={(e) => updateAnswerText(rfp.id, questionId, e.target.value)}
            rows={Math.max(5, Math.ceil(answer.text.length / 60))}
            className="w-full resize-y rounded-md border border-hairline-strong bg-paper p-3 font-display text-[13px] leading-[1.7] text-ink focus:border-accent focus:outline-none"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => acceptAnswer(rfp.id, questionId, !answer.accepted)}
              className={classNames(
                "inline-flex items-center gap-[5px] rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                answer.accepted ? "bg-positive-tint text-positive" : "bg-ink text-paper hover:bg-ink-soft"
              )}
            >
              {answer.accepted ? "✓ Reviewed" : "Mark reviewed"}
            </button>
            <span className="h-[18px] w-px bg-hairline" aria-hidden />
            {GEN_AI_ACTIONS.map((action) => (
              <button
                key={action}
                disabled={!!working}
                onClick={() => void runGenAi(rfp.id, questionId, action)}
                className="inline-flex items-center gap-[5px] rounded-full border border-hairline-strong bg-accent-wash px-3 py-[5px] text-xs font-medium text-accent-deep transition-colors hover:border-accent hover:bg-accent-tint disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✦ {GEN_AI_ACTION_LABEL[action]}
              </button>
            ))}
          </div>
          {working && (
            <p className="mt-2.5 text-xs text-accent animate-shimmer">
              ✦ {WORKING_LABEL[working]} — substance stays locked to golden source…
            </p>
          )}
          {work.lastGenAiNote && !working && (
            <p className="mt-2.5 text-xs text-positive">
              ✦ {work.lastGenAiNote} ·{" "}
              <button onClick={() => undoGenAi(rfp.id, questionId)} className="cursor-pointer text-accent-deep underline">
                Undo
              </button>
            </p>
          )}
        </div>
      )}

      {/* Specialist routing */}
      {question.specialist && answer && (
        <div className="border-b border-hairline bg-accent-wash px-6 py-[18px]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Specialist routing</p>
          {question.routingReason && (
            <p className="mt-2 text-xs leading-[1.6] text-ink-soft">{question.routingReason}</p>
          )}
          {answer.aiDraft !== null && (
            <div className="mt-2.5 rounded-md border border-dashed border-caution/50 bg-caution-tint px-3 py-2.5">
              <p className="text-[11px] font-bold tracking-[0.04em] text-caution">
                ✦ AI DRAFT — STARTING POINT ONLY
              </p>
              <p className="mt-[5px] text-[11px] leading-[1.6] text-ink-soft">
                This text was generated, not retrieved from governed content. Bracketed items need real
                data. It cannot be exported until {question.specialist} validates or replaces it.
              </p>
            </div>
          )}
          {answer.routed ? (
            <p className="mt-2.5 text-xs font-medium text-info">
              → Sent to {question.specialist} · they&apos;ll be notified in the Steward Hub
            </p>
          ) : (
            <>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  onClick={() => routeQuestion(rfp.id, questionId)}
                  className="inline-flex items-center gap-1.5 rounded-chip bg-info px-3.5 py-[7px] text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
                >
                  {answer.aiDraft !== null
                    ? `Send draft to ${question.specialist} for validation →`
                    : `Route to ${question.specialist} →`}
                </button>
                {canGenerate && (
                  <button
                    disabled={!!working}
                    onClick={() => void generateAiDraft(rfp.id, questionId)}
                    className="inline-flex items-center gap-1.5 rounded-chip border border-dashed border-caution/60 bg-paper px-3.5 py-1.5 text-[13px] font-medium text-caution transition-colors hover:bg-caution-tint disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✦ Generate AI draft to start from
                  </button>
                )}
              </div>
              {canGenerate && (
                <p className="mt-2 text-[11px] text-ink-faint">
                  Guardrail: an AI draft is marked unvalidated, locks export, and must be approved by
                  the SME before it counts as content.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Compliance on this answer */}
      {findings.length > 0 && (
        <div className="border-b border-hairline px-6 py-[18px]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Compliance on this answer
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {findings.map((f) => (
              <FindingCard key={f.id} rfp={rfp} finding={f} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// --- Tab B — Document review -----------------------------------------------------

function DocumentReviewTab({
  rfp,
  work,
  adviser,
  onJump,
}: {
  rfp: Rfp;
  work: RfpWorkState;
  adviser: Persona | undefined;
  onJump: (questionId: string) => void;
}) {
  const { markExported } = useAppState();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const questions = rfp.sections.flatMap((s) => s.questions);
  const answers = Object.values(work.answers);
  const pass = work.scanState === "done" && overallOutcome(work.findings) === "PASS";
  const openCount = work.findings.filter(
    (f) => !f.resolved && !(f.severity === "Flag" && f.acknowledged)
  ).length;

  const reviewable = answers.filter((a) => a.tier !== 4);
  const reviewed = reviewable.filter((a) => a.accepted).length;
  const reviewedPct = reviewable.length ? Math.round((100 * reviewed) / reviewable.length) : 0;

  const counts = { high: 0, medium: 0, low: 0 };
  for (const q of questions) {
    const a = work.answers[q.id];
    counts[a ? confidenceBand(q.matchConfidence, a.tier) : predictedBand(q)] += 1;
  }
  const pct = (n: number) => (questions.length ? Math.round((100 * n) / questions.length) : 0);

  const draftsAwaiting = answers.filter((a) => a.aiDraft !== null).length;
  const exportReady = pass && draftsAwaiting === 0 && answers.length > 0;
  const lockedLabel = !pass
    ? "Export locked — resolve compliance findings"
    : `Export locked — ${draftsAwaiting} AI draft${draftsAwaiting === 1 ? "" : "s"} awaiting SME validation`;

  const doExport = async (format: ExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      const input = {
        rfp,
        answers: work.answers,
        adviser: adviser ?? null,
        standardDisclosure: `${rulebookData.standardDisclosure} ${rulebookData.performanceDisclosure}`,
      };
      if (format === "client_docx") await exportClientDocx(input);
      else if (format === "branded_docx") await exportDocx(input);
      else await exportPdf(input);
      markExported(rfp.id);
    } catch {
      setExportError("Document generation failed — please retry. Nothing was sent externally.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="border-b border-hairline px-6 py-[18px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Compliance agent · whole document
          </p>
          <span
            className={classNames(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              work.scanState !== "done"
                ? "bg-canvas text-ink-faint"
                : openCount === 0
                  ? "bg-positive-tint text-positive"
                  : work.findings.some((f) => f.severity === "Block" && !f.resolved)
                    ? "bg-critical-tint text-critical"
                    : "bg-caution-tint text-caution"
            )}
          >
            {work.scanState !== "done"
              ? work.scanState === "running"
                ? "Scanning…"
                : "Standing by"
              : openCount === 0
                ? "PASS"
                : `${openCount} finding${openCount === 1 ? "" : "s"}`}
          </span>
        </div>
        {work.scanState === "running" && (
          <p className="mt-3 text-xs text-caution animate-shimmer">
            Supervisory agent scanning the full draft…
          </p>
        )}
        {work.scanState === "done" && (
          <ul className="mt-3 flex flex-col gap-2">
            {work.findings.map((f) => (
              <FindingCard key={f.id} rfp={rfp} finding={f} onJump={onJump} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto px-6 py-[18px]">
        <div className="flex justify-between text-xs text-ink-soft">
          <span>Reviewed</span>
          <span>
            {reviewed} / {reviewable.length}
          </span>
        </div>
        <div className="mt-1.5 mb-3 h-1.5 overflow-hidden rounded-full bg-accent-tint">
          <div className="h-full bg-accent transition-all" style={{ width: `${reviewedPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-ink-soft">
          <span>Document coverage</span>
          <span>
            {counts.high} high · {counts.medium} medium · {counts.low} routed
          </span>
        </div>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-accent-tint">
          <div className="h-full bg-positive" style={{ width: `${pct(counts.high)}%` }} />
          <div className="h-full bg-caution" style={{ width: `${pct(counts.medium)}%` }} />
          <div className="h-full bg-critical" style={{ width: `${pct(counts.low)}%` }} />
        </div>

        {!exportReady && (
          <p className="mt-3.5 rounded-md bg-canvas px-3 py-2 text-center text-[11px] text-ink-faint">
            🔒 {lockedLabel}
          </p>
        )}
        <div className="mt-3.5 flex flex-col gap-2">
          <button
            disabled={!exportReady || exporting !== null}
            onClick={() => void doExport("client_docx")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-chip bg-ink px-3.5 py-[9px] text-[13px] font-medium text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-hairline-strong"
          >
            {exporting === "client_docx" ? "Generating…" : "Export in client's format (DOCX)"}
          </button>
          <div className="flex gap-2">
            <button
              disabled={!exportReady || exporting !== null}
              onClick={() => void doExport("branded_docx")}
              className="inline-flex flex-1 justify-center rounded-chip border border-hairline-strong px-3.5 py-[7px] text-xs font-medium text-ink transition-colors hover:bg-accent-wash disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent"
            >
              {exporting === "branded_docx" ? "Generating…" : "Branded response (DOCX)"}
            </button>
            <button
              disabled={!exportReady || exporting !== null}
              onClick={() => void doExport("branded_pdf")}
              className="inline-flex flex-1 justify-center rounded-chip border border-hairline-strong px-3.5 py-[7px] text-xs font-medium text-ink transition-colors hover:bg-accent-wash disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent"
            >
              {exporting === "branded_pdf" ? "Generating…" : "Branded response (PDF)"}
            </button>
          </div>
        </div>
        {exportError && <p className="mt-2 text-[11px] text-critical">{exportError}</p>}
        {rfp.status === "exported" && !exportError && (
          <p className="mt-2 text-[11px] text-positive">
            ✓ Exported. The adviser downloads and emails the document — the platform never sends
            responses autonomously.
          </p>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          {exportReady
            ? "Client's format writes answers into the questionnaire exactly as received — original numbering, headings, and layout. Standard disclosures appended."
            : pass && draftsAwaiting > 0
              ? "AI drafts never leave the building unvalidated — the assigned SME approves or replaces each one."
              : "The compliance agent re-checks every edit. Export unlocks at PASS."}
        </p>
      </div>
    </>
  );
}

// --- Shared finding card -----------------------------------------------------------

function FindingCard({
  rfp,
  finding,
  onJump,
}: {
  rfp: Rfp;
  finding: ComplianceFinding;
  onJump?: (questionId: string) => void;
}) {
  const { applyAutoFix, acknowledgeFlag } = useAppState();
  const [ackReason, setAckReason] = useState("");

  const handled = finding.resolved || (finding.severity === "Flag" && finding.acknowledged);
  const questionNumber = finding.questionId
    ? rfp.sections.flatMap((s) => s.questions).find((q) => q.id === finding.questionId)?.number
    : null;
  const needsAck =
    finding.severity === "Flag" && !finding.autoFix && !finding.resolved && !finding.acknowledged;

  return (
    <li
      className={classNames(
        "rounded-md border px-3 py-2.5",
        handled
          ? "border-hairline bg-paper opacity-55"
          : finding.severity === "Block"
            ? "border-critical/40 bg-critical-tint"
            : finding.severity === "Flag"
              ? "border-caution/40 bg-caution-tint"
              : "border-info/30 bg-info-tint"
      )}
    >
      <div className="flex items-center gap-2">
        <SeverityPill severity={finding.severity} />
        <span
          onClick={onJump && finding.questionId ? () => onJump(finding.questionId!) : undefined}
          className={classNames(
            "text-xs font-medium text-ink",
            handled && "line-through",
            onJump && finding.questionId && "cursor-pointer hover:text-accent-deep"
          )}
        >
          {finding.ruleName}
          {questionNumber ? ` — ${questionNumber}` : ""}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-[1.6] text-ink-soft">
        {finding.matchedText ? `“${finding.matchedText}” — ` : ""}
        {finding.rationale}
      </p>
      {!handled && finding.autoFix && finding.questionId && (
        <button
          onClick={() => applyAutoFix(rfp.id, finding.id)}
          className="mt-2 rounded-chip bg-ink px-3 py-[5px] text-[11px] font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          Apply suggested fix
        </button>
      )}
      {needsAck && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={ackReason}
            onChange={(e) => setAckReason(e.target.value)}
            placeholder="Reason to acknowledge (kept in the audit log)"
            className="w-full flex-1 rounded border border-hairline-strong bg-paper px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none"
          />
          <button
            disabled={!ackReason.trim()}
            onClick={() => acknowledgeFlag(rfp.id, finding.id, ackReason.trim())}
            className="rounded-chip border border-hairline-strong px-3 py-[5px] text-[11px] font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            Acknowledge
          </button>
        </div>
      )}
      {handled && (
        <p className="mt-1.5 text-[11px] text-positive">
          ✓ {finding.resolved ? "Resolved" : "Acknowledged"}
        </p>
      )}
    </li>
  );
}
