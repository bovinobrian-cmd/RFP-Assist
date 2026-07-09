"use client";

import { useState } from "react";
import type { ComplianceFinding, DraftAnswer, RfpQuestion } from "@/lib/types";
import { Button, ProvenanceChip, SeverityPill } from "@/components/ui";
import { wordDiff } from "@/lib/diff";
import { classNames } from "@/lib/util";
import { useAppState } from "@/state/AppStateContext";

export function QuestionCard({
  rfpId,
  question,
  answer,
  findings,
  generating,
}: {
  rfpId: string;
  question: RfpQuestion;
  answer: DraftAnswer | undefined;
  findings: ComplianceFinding[];
  generating: boolean;
}) {
  const { updateAnswerText, revertAnswer, acceptAnswer, applyAutoFix, acknowledgeFlag } = useAppState();
  const [editing, setEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [ackDraft, setAckDraft] = useState<Record<string, string>>({});

  const activeFindings = findings.filter((f) => !f.resolved && !(f.severity === "Flag" && f.acknowledged));

  const diffSegments =
    answer?.goldenText && answer.tier === 2 ? wordDiff(answer.goldenText, answer.text) : null;

  return (
    <article
      id={`question-${question.id}`}
      className={classNames(
        "border-b border-hairline px-5 py-4 last:border-b-0",
        generating && "bg-accent-wash"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-3xl text-sm font-medium text-ink">
          <span className="mr-2 font-display text-ink-faint">{question.number}</span>
          {question.text}
        </p>
        {answer ? (
          <ProvenanceChip tier={answer.tier} />
        ) : generating ? (
          <span className="text-[11px] text-accent-deep animate-pulse">Matching governed content…</span>
        ) : (
          <span className="text-[11px] text-ink-faint">Queued</span>
        )}
      </div>

      {answer && (
        <div className="mt-3">
          {answer.tier === 4 ? (
            <div className="rounded-card border border-dashed border-tier4/40 bg-tier4-tint/50 px-4 py-3">
              <p className="text-sm text-tier4">
                No governed answer exists for this question. It has been routed to the Data Steward
                coverage-gap queue — nothing is generated without an approved source.
              </p>
              <p className="mt-1 text-[11px] text-ink-faint">{answer.provenanceNote}</p>
            </div>
          ) : (
            <>
              {editing ? (
                <div>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={Math.max(5, Math.ceil(draftText.length / 90))}
                    className="w-full rounded-card border border-hairline-strong bg-paper p-3 text-sm leading-relaxed text-ink focus:border-accent focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      onClick={() => {
                        updateAnswerText(rfpId, question.id, draftText);
                        setEditing(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : showDiff && diffSegments ? (
                <div className="rounded-card border border-tier2/30 bg-tier2-tint/40 p-4 text-sm leading-relaxed">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-tier2">
                    Tonality diff vs. golden source (substance unchanged)
                  </p>
                  <p>
                    {diffSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={
                          seg.kind === "added" ? "diff-added" : seg.kind === "removed" ? "diff-removed" : undefined
                        }
                      >
                        {seg.text}
                      </span>
                    ))}
                  </p>
                </div>
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{answer.text}</p>
              )}

              <p className="mt-2 text-[11px] italic text-ink-faint">{answer.provenanceNote}</p>

              {!editing && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant={answer.accepted ? "secondary" : "primary"}
                    onClick={() => acceptAnswer(rfpId, question.id, !answer.accepted)}
                  >
                    {answer.accepted ? "✓ Reviewed" : "Mark reviewed"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraftText(answer.text);
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                  {answer.tier === 2 && (
                    <>
                      <Button variant="secondary" onClick={() => setShowDiff((v) => !v)}>
                        {showDiff ? "Hide diff" : "View diff"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => revertAnswer(rfpId, question.id)}
                        title="Replace the tone-adjusted text with the unmodified golden-source answer"
                      >
                        Use default
                      </Button>
                    </>
                  )}
                  {answer.edited && <span className="text-[11px] text-ink-faint">Edited by adviser</span>}
                  {answer.reverted && <span className="text-[11px] text-positive">Reverted to golden source</span>}
                </div>
              )}
            </>
          )}

          {activeFindings.length > 0 && (
            <ul className="mt-3 space-y-2">
              {activeFindings.map((f) => (
                <li
                  key={f.id}
                  className={classNames(
                    "rounded-card border px-4 py-3",
                    f.severity === "Block" ? "border-critical/40 bg-critical-tint" : "border-caution/40 bg-caution-tint"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityPill severity={f.severity} />
                    <span className="text-sm font-medium text-ink">{f.ruleName}</span>
                    {f.matchedText && (
                      <code className="rounded bg-paper px-1.5 py-0.5 text-[11px] text-critical">
                        “{f.matchedText}”
                      </code>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{f.rationale}</p>
                  <p className="mt-1 text-xs text-ink">
                    <span className="font-medium">Suggested resolution:</span> {f.suggestion}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {f.autoFix && (
                      <Button onClick={() => applyAutoFix(rfpId, f.id)}>Apply suggested fix</Button>
                    )}
                    {f.severity === "Flag" && (
                      <div className="flex flex-1 min-w-[260px] items-center gap-2">
                        <input
                          value={ackDraft[f.id] ?? ""}
                          onChange={(e) => setAckDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                          placeholder="Reason to acknowledge (kept in the audit log)"
                          className="w-full flex-1 rounded border border-hairline-strong bg-paper px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
                        />
                        <Button
                          variant="secondary"
                          disabled={!(ackDraft[f.id] ?? "").trim()}
                          onClick={() => acknowledgeFlag(rfpId, f.id, ackDraft[f.id].trim())}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
