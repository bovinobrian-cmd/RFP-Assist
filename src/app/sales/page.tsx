"use client";

import Link from "next/link";
import { useAppState } from "@/state/AppStateContext";
import { Panel, PanelHeader, StatusBadge, LoadingRows, EmptyState } from "@/components/ui";
import { classNames, daysUntil, formatDate } from "@/lib/util";
import { ASSET_CLASS_LABEL } from "@/lib/types";

export default function SalesInboxPage() {
  const { loading, rfps, crmAccounts, personas, work } = useAppState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">RFP Inbox</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Incoming requests from RFP wires and consultant portals, parsed and matched to CRM context.
        </p>
      </div>

      <Panel>
        <PanelHeader
          title="Incoming RFPs"
          subtitle="New → In Review → Compliance → Approved → Exported"
        />
        {loading ? (
          <LoadingRows count={2} />
        ) : rfps.length === 0 ? (
          <EmptyState title="No RFPs in the inbox" body="New questionnaires from connected wires and consultant portals will appear here." />
        ) : (
          <ul className="divide-y divide-hairline">
            {rfps.map((rfp) => {
              const account = crmAccounts[rfp.crmAccountId];
              const adviser = personas.find((p) => p.id === rfp.assignedAdviserId);
              const days = daysUntil(rfp.deadline);
              const w = work[rfp.id];
              const total = rfp.sections.reduce((n, s) => n + s.questions.length, 0);
              const answered = w ? Object.values(w.answers).filter((a) => a.tier !== 4).length : 0;
              return (
                <li key={rfp.id}>
                  <Link
                    href={`/sales/${rfp.id}`}
                    className="block px-5 py-4 transition-colors hover:bg-accent-wash"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base text-ink">{rfp.issuer}</span>
                          <StatusBadge status={rfp.status} />
                          {account && (
                            <span
                              className={classNames(
                                "rounded-chip px-2 py-0.5 text-[11px] font-medium",
                                account.type === "client"
                                  ? "bg-positive-tint text-positive"
                                  : "bg-info-tint text-info"
                              )}
                            >
                              {account.type === "client" ? "Existing client" : "Past prospect"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ink-soft">
                          {rfp.mandate} · {ASSET_CLASS_LABEL[rfp.assetClass]} · {rfp.mandateSize}
                          {rfp.consultant ? ` · via ${rfp.consultant}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">
                          {total} questions · received {formatDate(rfp.received)}
                          {w?.generation === "done" && ` · ${answered} pre-filled`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-6 text-right">
                        <div>
                          <p
                            className={classNames(
                              "font-display text-lg leading-tight",
                              days <= 10 ? "text-critical" : days <= 21 ? "text-caution" : "text-ink"
                            )}
                          >
                            {days}d
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                            due {formatDate(rfp.deadline)}
                          </p>
                        </div>
                        {adviser && (
                          <div className="hidden sm:flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper text-xs font-semibold">
                              {adviser.initials}
                            </span>
                            <div className="text-left">
                              <p className="text-xs font-medium text-ink leading-tight">{adviser.name}</p>
                              <p className="text-[10px] text-ink-faint leading-tight">Assigned adviser</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
