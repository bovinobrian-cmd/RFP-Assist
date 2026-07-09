"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { Button, EmptyState, Panel, PanelHeader } from "@/components/ui";
import { wordDiff } from "@/lib/diff";
import { ASSET_CLASS_LABEL } from "@/lib/types";
import { classNames, formatDate } from "@/lib/util";

export function ReviewQueue() {
  const { reviewQueue, qaPairs, personas, activePersonaId, approveReviewItem, rejectReviewItem } = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);
  const approverName = personas.find((p) => p.id === activePersonaId)?.name ?? "Second Steward";

  const pending = reviewQueue.filter((i) => i.status === "pending_review");
  const decided = reviewQueue.filter((i) => i.status !== "pending_review");

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Pending review"
          subtitle="Nothing reaches approved golden-source status without a second set of eyes"
        />
        {pending.length === 0 ? (
          <EmptyState
            title="Review queue is clear"
            body="Submissions from the editor, coverage-gap drafts, and accepted enrichment cards land here."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {pending.map((item) => {
              const open = openId === item.id;
              const current = item.qaId ? qaPairs.find((p) => p.id === item.qaId) : null;
              return (
                <li key={item.id}>
                  <button className="w-full px-5 py-4 text-left hover:bg-accent-wash transition-colors" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={classNames("rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", item.origin === "enrichment" ? "bg-accent-tint text-accent-deep" : item.origin === "coverage_gap" ? "bg-info-tint text-info" : "bg-canvas text-ink-soft")}>
                        {item.origin === "enrichment" ? "Smart Enrichment" : item.origin === "coverage_gap" ? "Coverage gap" : "Editor"}
                      </span>
                      <span className="rounded-chip bg-canvas px-2 py-0.5 text-[10px] text-ink-soft">{ASSET_CLASS_LABEL[item.assetClass]}</span>
                      {item.qaId ? (
                        <code className="text-[11px] text-ink-faint">updates {item.qaId}</code>
                      ) : (
                        <span className="text-[11px] text-ink-faint">new pair</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Submitted by {item.submittedBy} · {formatDate(item.submittedDate)} · {item.originDetail}
                    </p>
                  </button>

                  {open && (
                    <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                      <p className="text-xs font-medium text-ink">{item.proposedQuestion}</p>
                      {current ? (
                        <DiffBlock oldText={current.answer_text} newText={item.proposedAnswer} version={current.version} />
                      ) : (
                        <p className="mt-2 whitespace-pre-line rounded-card border border-hairline bg-paper p-4 text-sm leading-relaxed text-ink">
                          {item.proposedAnswer}
                        </p>
                      )}
                      {item.proposedDataPoints.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {item.proposedDataPoints.map((dp) => (
                            <li key={dp.claim} className="text-xs text-ink-soft">
                              <span className="font-medium text-ink">{dp.claim}:</span> {dp.value} · as of {formatDate(dp.as_of)} · {dp.refresh_cadence} · {dp.source}
                            </li>
                          ))}
                        </ul>
                      )}
                      {current && (
                        <div className="mt-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Version history</p>
                          <ul className="mt-1 space-y-0.5">
                            {current.version_history.slice(0, 4).map((v) => (
                              <li key={v.version} className="text-xs text-ink-soft">
                                v{v.version} · {formatDate(v.date)} · {v.author} — {v.note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => approveReviewItem(item.id, approverName)}>
                          Approve → golden source {current ? `(v${current.version + 1})` : "(v1)"}
                        </Button>
                        <Button variant="secondary" onClick={() => rejectReviewItem(item.id)}>
                          Reject
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-ink-faint">
                        Approving as {approverName}. All prior versions are retained for audit.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel>
          <PanelHeader title="Recently decided" />
          <ul className="divide-y divide-hairline">
            {decided.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="truncate text-sm text-ink-soft">{item.title}</span>
                <span className={classNames("rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase", item.status === "approved" ? "bg-positive-tint text-positive" : "bg-critical-tint text-critical")}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function DiffBlock({ oldText, newText, version }: { oldText: string; newText: string; version: number }) {
  const segments = useMemo(() => wordDiff(oldText, newText), [oldText, newText]);
  return (
    <div className="mt-2 rounded-card border border-hairline bg-paper p-4 text-sm leading-relaxed">
      <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        Proposed change vs. current approved v{version}
      </p>
      <p>
        {segments.map((seg, i) => (
          <span key={i} className={seg.kind === "added" ? "diff-added" : seg.kind === "removed" ? "diff-removed" : undefined}>
            {seg.text}
          </span>
        ))}
      </p>
    </div>
  );
}
