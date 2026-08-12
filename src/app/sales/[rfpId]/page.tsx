"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppState } from "@/state/AppStateContext";
import { DocumentView } from "@/components/sales/DocumentView";
import { ConfidenceRail } from "@/components/sales/ConfidenceRail";
import { SidePanel } from "@/components/sales/SidePanel";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";
import { classNames, daysUntil } from "@/lib/util";
import { deadlineStatus } from "@/lib/config";

function shortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AuthoringPage({ params }: { params: Promise<{ rfpId: string }> }) {
  const { rfpId } = use(params);
  const { loading, rfps, personas, work, generateForRfp, runCompliance, selectQuestion } =
    useAppState();

  const rfp = rfps.find((r) => r.id === rfpId);
  const workState = work[rfpId];
  const docScrollRef = useRef<HTMLDivElement>(null);

  // Opening an RFP kicks off provenance-first generation automatically — the
  // adviser lands on a questionnaire filling in front of them, not a blank form.
  useEffect(() => {
    if (!loading && rfp && workState && workState.generation === "idle" && rfp.sections.length > 0) {
      void generateForRfp(rfpId);
    }
  }, [loading, rfp, workState, rfpId, generateForRfp]);

  // The supervisory agent is always on: it scans as soon as the draft exists.
  useEffect(() => {
    if (workState && workState.generation === "done" && workState.scanState === "idle") {
      void runCompliance(rfpId);
    }
  }, [workState, rfpId, runCompliance]);

  // Default the side panel to the first question.
  useEffect(() => {
    if (rfp && workState && !workState.selectedQuestionId) {
      const first = rfp.sections[0]?.questions[0];
      if (first) selectQuestion(rfpId, first.id);
    }
  }, [rfp, workState, rfpId, selectQuestion]);

  const jumpTo = (questionId: string) => {
    selectQuestion(rfpId, questionId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`doc-q-${questionId}`);
      const container = docScrollRef.current;
      if (!el || !container) return;
      const top =
        el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 90;
      container.scrollTo({ top, behavior: "smooth" });
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <Panel>
          <div className="animate-pulse space-y-4 p-8">
            <div className="h-8 w-2/3 rounded bg-canvas" />
            <div className="h-4 w-1/2 rounded bg-canvas" />
            <div className="h-40 rounded bg-canvas" />
          </div>
        </Panel>
      </div>
    );
  }

  if (!rfp || !workState) {
    return (
      <div className="p-8">
        <Panel>
          <EmptyState
            title="RFP not found"
            body="This RFP is not in process. It may have been withdrawn by the issuer."
          />
          <div className="border-t border-hairline px-5 py-3">
            <Link href="/sales" className="text-sm text-accent-deep hover:underline">
              ← All RFPs &amp; DDQs
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const adviser = personas.find((p) => p.id === rfp.assignedAdviserId);
  const days = daysUntil(rfp.deadline);
  const due = deadlineStatus(days);

  return (
    <>
      {/* Context bar */}
      <div className="flex h-[46px] shrink-0 items-center justify-between border-b border-hairline bg-paper px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/sales"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-chip border border-hairline-strong bg-paper px-3 py-[5px] text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:bg-accent-wash"
          >
            ← All RFPs &amp; DDQs
          </Link>
          <span className="text-hairline-strong">/</span>
          <span className="truncate font-display text-[15px] text-ink">
            {rfp.shortName} — {rfp.mandate}
          </span>
          <StatusBadge status={rfp.status} />
        </div>
        <span
          className={classNames(
            "shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold",
            due === "at_risk" ? "bg-critical-tint text-critical" : "bg-caution-tint text-caution"
          )}
        >
          Due {shortDate(rfp.deadline)} · {days < 0 ? `${Math.abs(days)}d over` : `${days}d`}
        </span>
      </div>

      {/* Three-region workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_44px_420px]">
        <div ref={docScrollRef} className="overflow-y-auto bg-doc-desk px-6 pb-20 pt-8">
          <DocumentView rfp={rfp} work={workState} onSelect={(qid) => selectQuestion(rfpId, qid)} />
        </div>
        <ConfidenceRail rfp={rfp} work={workState} onJump={jumpTo} />
        <SidePanel rfp={rfp} work={workState} adviser={adviser} onJump={jumpTo} />
      </div>
    </>
  );
}
