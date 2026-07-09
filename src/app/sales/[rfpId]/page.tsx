"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useAppState } from "@/state/AppStateContext";
import { RfpHeader } from "@/components/sales/RfpHeader";
import { QuestionCard } from "@/components/sales/QuestionCard";
import { WorkflowRail } from "@/components/sales/WorkflowRail";
import { EmptyState, Panel, PanelHeader } from "@/components/ui";

export default function RfpDetailPage({ params }: { params: Promise<{ rfpId: string }> }) {
  const { rfpId } = use(params);
  const { loading, rfps, crmAccounts, personas, work, qaPairs, generateForRfp } = useAppState();

  const rfp = rfps.find((r) => r.id === rfpId);
  const workState = work[rfpId];

  // Opening a new RFP kicks off provenance-first generation automatically —
  // the adviser lands on a draft filling in front of them, not a blank form.
  useEffect(() => {
    if (!loading && rfp && workState && workState.generation === "idle") {
      void generateForRfp(rfpId);
    }
  }, [loading, rfp, workState, rfpId, generateForRfp]);

  if (loading) {
    return (
      <Panel>
        <div className="animate-pulse space-y-4 p-8">
          <div className="h-8 w-2/3 rounded bg-canvas" />
          <div className="h-4 w-1/2 rounded bg-canvas" />
          <div className="h-40 rounded bg-canvas" />
        </div>
      </Panel>
    );
  }

  if (!rfp || !workState) {
    return (
      <Panel>
        <EmptyState
          title="RFP not found"
          body="This RFP is not in the inbox. It may have been withdrawn by the issuer."
        />
        <div className="border-t border-hairline px-5 py-3">
          <Link href="/sales" className="text-sm text-accent-deep hover:underline">
            ← Back to inbox
          </Link>
        </div>
      </Panel>
    );
  }

  const account = crmAccounts[rfp.crmAccountId];
  const adviser = personas.find((p) => p.id === rfp.assignedAdviserId);
  const findingsByQuestion = new Map<string, typeof workState.findings>();
  for (const f of workState.findings) {
    if (!f.questionId) continue;
    findingsByQuestion.set(f.questionId, [...(findingsByQuestion.get(f.questionId) ?? []), f]);
  }

  return (
    <div className="space-y-6">
      <Link href="/sales" className="text-sm text-accent-deep hover:underline">
        ← RFP Inbox
      </Link>

      <RfpHeader rfp={rfp} account={account} adviser={adviser} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {rfp.sections.map((section) => (
            <Panel key={section.id}>
              <PanelHeader
                title={section.title}
                subtitle={`${section.questions.length} question${section.questions.length === 1 ? "" : "s"}`}
              />
              <div>
                {section.questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    rfpId={rfp.id}
                    question={q}
                    answer={workState.answers[q.id]}
                    findings={findingsByQuestion.get(q.id) ?? []}
                    generating={workState.generatingQuestionId === q.id}
                  />
                ))}
              </div>
            </Panel>
          ))}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <WorkflowRail rfp={rfp} workState={workState} adviser={adviser} qaPairs={qaPairs} />
        </div>
      </div>
    </div>
  );
}
