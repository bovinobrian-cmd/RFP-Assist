"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { EmptyState, LoadingRows } from "@/components/ui";
import { classNames, daysUntil } from "@/lib/util";
import { ASSET_CLASS_LABEL, type ConfidenceBand, type Rfp, type RfpKind } from "@/lib/types";
import { confidenceBand, predictedBand } from "@/lib/generation";
import { DEADLINE_CRITICAL_DAYS, deadlineStatus, type DeadlineStatus } from "@/lib/config";
import {
  BAND_BG,
  STAGE_BG,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_TEXT,
} from "@/components/sales/confidence";

type FilterKey = "all" | "RFP" | "DDQ" | "due";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "RFP", label: "RFPs" },
  { key: "DDQ", label: "DDQs" },
  { key: "due", label: "Due soon" },
];

const DUE_TEXT: Record<DeadlineStatus, string> = {
  at_risk: "text-critical",
  watch: "text-caution",
  on_track: "text-positive",
};

const DUE_TINT: Record<DeadlineStatus, string> = {
  at_risk: "bg-critical-tint",
  watch: "bg-caution-tint",
  on_track: "bg-positive-tint",
};

const DUE_BAR: Record<DeadlineStatus, string> = {
  at_risk: "bg-critical",
  watch: "bg-caution",
  on_track: "bg-positive",
};

const DUE_CHIP: Record<DeadlineStatus, string> = {
  at_risk: "AT RISK",
  watch: "WATCH",
  on_track: "ON TRACK",
};

function shortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function IntakeDashboardPage() {
  const { loading, rfps, salesforceQueue, startIntake } = useAppState();
  const [filter, setFilter] = useState<FilterKey>("all");

  const dueSoon = rfps.filter((r) => daysUntil(r.deadline) <= DEADLINE_CRITICAL_DAYS).length;
  const inCompliance = rfps.filter((r) => r.status === "compliance").length;

  const visible = rfps.filter((r) =>
    filter === "all" ? true : filter === "due" ? daysUntil(r.deadline) <= DEADLINE_CRITICAL_DAYS : r.kind === filter
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] text-ink">RFPs &amp; DDQs in process</h1>
          <p className="mt-[5px] text-sm text-ink-soft">
            Intake fires from Salesforce mandate wires and email. Track stage, coverage, and status
            against the deadline.
          </p>
        </div>
        <span className="text-[11px] text-ink-faint">Last synced with Salesforce 2 min ago</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In process" value={loading ? "—" : String(rfps.length)} detail="RFPs & DDQs" tone="text-ink" />
        <StatCard
          label="New from Salesforce"
          value={loading ? "—" : String(salesforceQueue.length)}
          detail="awaiting intake"
          tone="text-info"
        />
        <StatCard
          label={`Due within ${DEADLINE_CRITICAL_DAYS} days`}
          value={loading ? "—" : String(dueSoon)}
          detail={dueSoon ? "needs attention" : "clear"}
          tone={dueSoon ? "text-critical" : "text-positive"}
        />
        <StatCard
          label="In compliance review"
          value={loading ? "—" : String(inCompliance)}
          detail="supervisory agent"
          tone="text-caution"
        />
      </div>

      {/* Salesforce intake queue */}
      {salesforceQueue.length > 0 && (
        <div className="rounded-card border border-info/35 bg-info-tint shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-info/20 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-info animate-pulse-dot" aria-hidden />
              <h2 className="font-display text-base text-info">New intake from Salesforce</h2>
              <span className="rounded-full bg-info px-2 py-px text-[11px] font-semibold text-paper">
                {salesforceQueue.length}
              </span>
            </div>
            <span className="text-[11px] text-info">Mandate wires awaiting intake — parsing starts on accept</span>
          </div>
          <div className="flex flex-col">
            {salesforceQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-info/10 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[15px] text-ink">{item.issuer}</span>
                    <span className="rounded-chip border border-info/30 bg-paper px-[7px] py-px text-[10px] font-bold tracking-[0.08em] text-info">
                      {item.kind}
                    </span>
                  </div>
                  <p className="mt-[3px] text-xs text-ink-soft">{item.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] text-info">{item.wireRef}</span>
                  <button
                    onClick={() => void startIntake(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-chip bg-info px-4 py-[7px] text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
                  >
                    Start intake →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-process list */}
      <div className="rounded-card border border-hairline bg-paper shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="font-display text-base text-ink">In process</h2>
            <p className="mt-0.5 text-xs text-ink-faint">New → In Review → Compliance → Approved → Exported</p>
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={classNames(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "border-ink bg-ink text-paper"
                    : "border-hairline-strong bg-transparent text-ink-soft hover:border-ink"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <LoadingRows count={2} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nothing in process"
            body="Questionnaires matching this filter will appear here once intake starts."
          />
        ) : (
          <ul>
            {visible.map((rfp) => (
              <PipelineRow key={rfp.id} rfp={rfp} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="rounded-card border border-hairline bg-paper px-5 py-[18px] shadow-card">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <span className={classNames("font-display text-[32px] leading-none", tone)}>{value}</span>
        <span className="text-xs text-ink-soft">{detail}</span>
      </div>
    </div>
  );
}

function KindChip({ kind }: { kind: RfpKind }) {
  return (
    <span
      className={classNames(
        "rounded-chip border px-[7px] py-px text-[10px] font-bold tracking-[0.08em]",
        kind === "DDQ" ? "border-accent/35 bg-accent-tint text-accent" : "border-hairline-strong bg-paper text-ink-soft"
      )}
    >
      {kind}
    </span>
  );
}

function PipelineRow({ rfp }: { rfp: Rfp }) {
  const { crmAccounts, personas, work } = useAppState();
  const account = crmAccounts[rfp.crmAccountId];
  const adviser = personas.find((p) => p.id === rfp.assignedAdviserId);
  const w = work[rfp.id];

  const questions = rfp.sections.flatMap((s) => s.questions);
  const parsing = questions.length === 0;

  // Confidence coverage: use generated tiers once available, else the parse signals.
  const counts: Record<ConfidenceBand, number> = { high: 0, medium: 0, low: 0 };
  for (const q of questions) {
    const answer = w?.answers[q.id];
    counts[answer ? confidenceBand(q.matchConfidence, answer.tier) : predictedBand(q)] += 1;
  }
  const filled = counts.high + counts.medium;
  const yellowW = Math.max(3, Math.round((22 * counts.medium) / Math.max(1, counts.high)));
  const redW = Math.max(3, Math.round((22 * counts.low) / Math.max(1, counts.high)));

  const days = daysUntil(rfp.deadline);
  const due = deadlineStatus(days);
  const totalDays = Math.max(
    1,
    Math.round((new Date(rfp.deadline).getTime() - new Date(rfp.received).getTime()) / 86_400_000)
  );
  const elapsed = Math.min(100, Math.max(4, Math.round((100 * (totalDays - days)) / totalDays)));
  const stage = STAGE_ORDER.indexOf(rfp.status);

  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link
        href={`/sales/${rfp.id}`}
        className="grid grid-cols-[minmax(0,1.5fr)_200px_170px_150px] items-center gap-5 px-5 py-4 transition-colors hover:bg-accent-wash"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <KindChip kind={rfp.kind} />
            <span className="font-display text-base text-ink">{rfp.issuer}</span>
            {account && (
              <span
                className={classNames(
                  "rounded-chip px-2 py-0.5 text-[11px] font-medium",
                  account.type === "client" ? "bg-positive-tint text-positive" : "bg-info-tint text-info"
                )}
              >
                {account.type === "client" ? "Existing client" : "Past prospect"}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">
            {rfp.mandate} · {ASSET_CLASS_LABEL[rfp.assetClass]} · {rfp.mandateSize}
            {rfp.consultant ? ` · via ${rfp.consultant}` : " · direct"}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {parsing ? (
              <span className="text-[11px] text-ink-faint">Parsing questionnaire…</span>
            ) : (
              <>
                <span className="text-[11px] text-ink-faint">
                  {filled}/{questions.length} pre-filled ·
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <span className={classNames("h-[5px] w-[22px] rounded-[3px] opacity-85", BAND_BG.high)} title="High confidence" />
                  <span
                    className={classNames("h-[5px] rounded-[3px] opacity-85", BAND_BG.medium)}
                    style={{ width: yellowW }}
                    title="Medium confidence"
                  />
                  <span
                    className={classNames("h-[5px] rounded-[3px] opacity-85", BAND_BG.low)}
                    style={{ width: redW }}
                    title="Needs content / specialist"
                  />
                </span>
                <span className="text-[11px] text-ink-faint">
                  {counts.high} high · {counts.medium} medium · {counts.low} needs specialist
                </span>
              </>
            )}
          </div>
        </div>

        <div>
          <p className={classNames("mb-1.5 text-[11px] font-medium", STAGE_TEXT[rfp.status])}>
            {STAGE_LABEL[rfp.status]}
          </p>
          <div className="flex gap-[3px]">
            {STAGE_ORDER.map((s, i) => (
              <span
                key={s}
                title={STAGE_LABEL[s]}
                className={classNames("h-1 flex-1 rounded-sm", i <= stage ? STAGE_BG[rfp.status] : "bg-hairline")}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={classNames("font-display text-xl leading-none", DUE_TEXT[due])}>
              {days < 0 ? `${Math.abs(days)}d over` : `${days}d`}
            </span>
            <span
              className={classNames(
                "rounded-chip px-1.5 py-px text-[10px] font-semibold tracking-[0.06em]",
                DUE_TINT[due],
                DUE_TEXT[due]
              )}
            >
              {DUE_CHIP[due]}
            </span>
          </div>
          <p className="mt-[3px] mb-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
            due {shortDate(rfp.deadline)}
          </p>
          <div className="h-[3px] overflow-hidden rounded-sm bg-accent-tint">
            <div className={classNames("h-full", DUE_BAR[due])} style={{ width: `${elapsed}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
            {adviser?.initials ?? "—"}
          </span>
          <div>
            <p className="text-xs font-medium leading-[1.3] text-ink">{adviser?.name ?? "Unassigned"}</p>
            <p className="text-[10px] leading-[1.3] text-ink-faint">Assigned adviser</p>
          </div>
        </div>
      </Link>
    </li>
  );
}
