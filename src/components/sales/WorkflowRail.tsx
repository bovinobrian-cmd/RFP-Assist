"use client";

import { useState } from "react";
import type { Persona, Rfp } from "@/lib/types";
import type { RfpWorkState } from "@/state/AppStateContext";
import { useAppState } from "@/state/AppStateContext";
import { Button, Panel, PanelHeader, SeverityPill } from "@/components/ui";
import { overallOutcome } from "@/lib/compliance";
import { exportDocx, exportPdf } from "@/lib/export";
import { classNames } from "@/lib/util";
import rulebookData from "@/data/compliance-rules.json";
import { TIER_CHIP, type GenerationTier } from "@/lib/types";

export function WorkflowRail({
  rfp,
  workState,
  adviser,
}: {
  rfp: Rfp;
  workState: RfpWorkState;
  adviser: Persona | undefined;
}) {
  const { runCompliance, markExported } = useAppState();
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const questions = rfp.sections.flatMap((s) => s.questions);
  const answers = Object.values(workState.answers);
  const answered = answers.filter((a) => a.tier !== 4);
  const reviewed = answers.filter((a) => a.accepted || a.tier === 4).length;
  const reviewedPct = questions.length ? Math.round((reviewed / questions.length) * 100) : 0;
  const outcome = workState.scanState === "done" ? overallOutcome(workState.findings) : null;
  const activeBlocks = workState.findings.filter((f) => f.severity === "Block" && !f.resolved);
  const unackedFlags = workState.findings.filter((f) => f.severity === "Flag" && !f.acknowledged && !f.resolved);
  const exportReady = outcome === "PASS";

  const tierCounts = new Map<GenerationTier, number>();
  for (const a of answers) tierCounts.set(a.tier, (tierCounts.get(a.tier) ?? 0) + 1);

  const doExport = async (kind: "docx" | "pdf") => {
    setExporting(kind);
    setExportError(null);
    try {
      const input = {
        rfp,
        answers: workState.answers,
        adviser: adviser ?? null,
        standardDisclosure: `${rulebookData.standardDisclosure} ${rulebookData.performanceDisclosure}`,
      };
      if (kind === "docx") await exportDocx(input);
      else await exportPdf(input);
      markExported(rfp.id);
    } catch {
      setExportError("Document generation failed — please retry. Nothing was sent externally.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Generation & review progress */}
      <Panel>
        <PanelHeader title="Draft progress" subtitle="Provenance-first pre-fill, then human review" />
        <div className="space-y-4 px-5 py-4">
          {workState.generation === "running" && (
            <p className="text-xs text-accent-deep">
              Generating {workState.generatedCount} / {questions.length} — matching each question to
              governed content…
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs text-ink-soft">
              <span>Reviewed</span>
              <span>
                {reviewed} / {questions.length} ({reviewedPct}%)
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full bg-accent transition-all" style={{ width: `${reviewedPct}%` }} />
            </div>
          </div>
          {workState.generation === "done" && (
            <ul className="space-y-1.5 border-t border-hairline pt-3">
              {([1, 2, 3, 4] as GenerationTier[]).map((tier) =>
                tierCounts.get(tier) ? (
                  <li key={tier} className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-soft">{TIER_CHIP[tier]}</span>
                    <span className="font-medium text-ink">{tierCounts.get(tier)}</span>
                  </li>
                ) : null
              )}
              <li className="flex items-center justify-between border-t border-hairline pt-1.5 text-[11px]">
                <span className="text-ink-soft">Auto-filled with confident provenance</span>
                <span className="font-medium text-ink">
                  {Math.round((answered.length / questions.length) * 100)}%
                </span>
              </li>
            </ul>
          )}
        </div>
      </Panel>

      {/* Compliance gate */}
      <Panel>
        <PanelHeader
          title="Compliance review"
          subtitle={`Supervisory agent · rulebook v${rulebookData.rulebookVersion}`}
        />
        <div className="space-y-3 px-5 py-4">
          {workState.scanState === "idle" && (
            <>
              <p className="text-xs leading-relaxed text-ink-soft">
                The supervisory agent scans the full draft — promissory language, undisclosed
                performance claims, superlatives, stale data — before export unlocks.
              </p>
              <Button
                className="w-full justify-center"
                disabled={workState.generation !== "done"}
                onClick={() => runCompliance(rfp.id)}
              >
                {workState.generation !== "done" ? "Complete generation first" : "Run compliance review"}
              </Button>
            </>
          )}
          {workState.scanState === "running" && (
            <div className="py-2">
              <p className="animate-pulse text-sm text-caution">Supervisory agent scanning draft…</p>
              <p className="mt-1 text-[11px] text-ink-faint">
                Checking {answered.length} answers against {rulebookData.rules.length} rules
              </p>
            </div>
          )}
          {workState.scanState === "done" && outcome && (
            <>
              <div
                className={classNames(
                  "rounded-card px-4 py-3 text-center font-display text-lg",
                  outcome === "PASS" && "bg-positive-tint text-positive",
                  outcome === "FLAG" && "bg-caution-tint text-caution",
                  outcome === "BLOCK" && "bg-critical-tint text-critical"
                )}
              >
                {outcome}
                <p className="mt-0.5 font-sans text-[11px] font-normal text-ink-soft">
                  {outcome === "PASS" && "No open findings — export unlocked."}
                  {outcome === "FLAG" && `${unackedFlags.length} flag(s) need acknowledgment with a reason.`}
                  {outcome === "BLOCK" && `${activeBlocks.length} blocking finding(s) must be fixed.`}
                </p>
              </div>
              <ul className="space-y-1.5">
                {workState.findings.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-[11px]">
                    <SeverityPill severity={f.severity} />
                    <a
                      href={f.questionId ? `#question-${f.questionId}` : undefined}
                      className={classNames(
                        "flex-1 truncate",
                        f.resolved || (f.severity === "Flag" && f.acknowledged)
                          ? "text-ink-faint line-through"
                          : "text-ink hover:text-accent-deep"
                      )}
                    >
                      {f.ruleName}
                    </a>
                    {(f.resolved || (f.severity === "Flag" && f.acknowledged)) && (
                      <span className="text-positive">✓</span>
                    )}
                  </li>
                ))}
              </ul>
              {outcome !== "PASS" && (
                <Button variant="secondary" className="w-full justify-center" onClick={() => runCompliance(rfp.id)}>
                  Re-run scan
                </Button>
              )}
            </>
          )}
          {workState.scanState === "idle" && workState.findings.length === 0 && workState.generation === "done" && null}
        </div>
      </Panel>

      {/* Export */}
      <Panel>
        <PanelHeader title="Export" subtitle="Branded response document" />
        <div className="space-y-2 px-5 py-4">
          {!exportReady && (
            <p className="rounded-card bg-canvas px-3 py-2 text-[11px] text-ink-faint">
              🔒 Export is locked until the compliance outcome is PASS.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1 justify-center"
              disabled={!exportReady || exporting !== null}
              onClick={() => doExport("docx")}
            >
              {exporting === "docx" ? "Generating…" : "Download DOCX"}
            </Button>
            <Button
              className="flex-1 justify-center"
              variant="secondary"
              disabled={!exportReady || exporting !== null}
              onClick={() => doExport("pdf")}
            >
              {exporting === "pdf" ? "Generating…" : "Download PDF"}
            </Button>
          </div>
          {exportError && <p className="text-[11px] text-critical">{exportError}</p>}
          {rfp.status === "exported" && (
            <p className="text-[11px] text-positive">
              ✓ Exported. The adviser downloads and emails the document — the platform never sends
              responses autonomously.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
