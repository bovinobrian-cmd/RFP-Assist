"use client";

import { useAppState } from "@/state/AppStateContext";
import { Button, EmptyState, Panel, PanelHeader } from "@/components/ui";
import { ASSET_CLASS_LABEL } from "@/lib/types";
import { classNames, formatDate } from "@/lib/util";
import type { EditorPrefill } from "./QaEditor";

const GAP_STYLE = {
  open: "bg-critical-tint text-critical",
  drafting: "bg-caution-tint text-caution",
  resolved: "bg-positive-tint text-positive",
} as const;

export function GapQueue({ onDraft }: { onDraft: (p: EditorPrefill) => void }) {
  const { coverageGaps, setGapStatus } = useAppState();

  const sorted = [...coverageGaps].sort((a, b) => {
    const rank = { open: 0, drafting: 1, resolved: 2 } as const;
    return rank[a.status] - rank[b.status] || b.raisedDate.localeCompare(a.raisedDate);
  });

  return (
    <Panel>
      <PanelHeader
        title="Coverage gaps"
        subtitle="NEEDS CONTENT questions routed from live RFPs — a feature, not a failure state: this queue is the CMS backlog"
      />
      {sorted.length === 0 ? (
        <EmptyState
          title="No coverage gaps"
          body="When generation finds no governed answer for a question, it lands here instead of being invented."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {sorted.map((gap) => (
            <li key={gap.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={classNames("rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", GAP_STYLE[gap.status])}>
                      {gap.status}
                    </span>
                    <span className="rounded-chip bg-canvas px-2 py-0.5 text-[10px] text-ink-soft">
                      {ASSET_CLASS_LABEL[gap.assetClass]}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {gap.rfpName} · raised {formatDate(gap.raisedDate)}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-3xl text-sm font-medium text-ink">{gap.questionText}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{gap.raisedBy}</p>
                </div>
                {gap.status !== "resolved" && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setGapStatus(gap.id, "drafting");
                      onDraft({
                        qaId: null,
                        title: `Coverage gap — ${gap.questionText.slice(0, 60)}…`,
                        origin: "coverage_gap",
                        originDetail: `Drafted from coverage gap ${gap.id} (${gap.rfpName})`,
                        draft: {
                          question_canonical: gap.questionText,
                          asset_class: gap.assetClass,
                          review_by: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
                        },
                      });
                    }}
                  >
                    Draft content
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
