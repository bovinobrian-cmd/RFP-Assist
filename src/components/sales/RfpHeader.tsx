"use client";

import type { CrmAccount, Persona, Rfp } from "@/lib/types";
import { ASSET_CLASS_LABEL } from "@/lib/types";
import { Meta, Panel, StatusBadge } from "@/components/ui";
import { classNames, daysUntil, formatDate } from "@/lib/util";

export function RfpHeader({
  rfp,
  account,
  adviser,
}: {
  rfp: Rfp;
  account: CrmAccount | undefined;
  adviser: Persona | undefined;
}) {
  const days = daysUntil(rfp.deadline);
  return (
    <Panel>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rfp.status} />
            <span className="text-[11px] text-ink-faint">Parsed from {rfp.channel}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl text-ink">{rfp.issuer}</h1>
          <p className="mt-1 text-sm text-ink-soft">{rfp.mandate}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Meta label="Asset class">{ASSET_CLASS_LABEL[rfp.assetClass]}</Meta>
            <Meta label="Mandate size">{rfp.mandateSize}</Meta>
            <Meta label="Vehicle">{rfp.vehicle}</Meta>
            <Meta label="Plan / pool assets">{rfp.aum}</Meta>
            <Meta label="Consultant">{rfp.consultant ?? "None (direct)"}</Meta>
            <Meta label="Deadline">
              <span className={classNames(days <= 10 && "text-critical", days > 10 && days <= 21 && "text-caution")}>
                {formatDate(rfp.deadline)} · {days} days
              </span>
            </Meta>
          </dl>
          <p className="mt-4 text-xs text-ink-faint">Contact: {rfp.contact}</p>
        </div>

        <aside className="rounded-card border border-hairline bg-canvas p-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Salesforce match</p>
          {account ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={classNames(
                    "rounded-chip px-2 py-0.5 text-[11px] font-medium",
                    account.type === "client" ? "bg-positive-tint text-positive" : "bg-info-tint text-info"
                  )}
                >
                  {account.type === "client" ? "Existing client" : "Past prospect"}
                </span>
                <span className="text-xs text-ink-faint">{account.segment}</span>
              </div>
              {account.aumWithFirm && (
                <p className="mt-2 text-sm text-ink">
                  <span className="font-medium">{account.aumWithFirm}</span> with the firm ·{" "}
                  {account.productsHeld.length} product{account.productsHeld.length === 1 ? "" : "s"}
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{account.notes}</p>
              {account.pastRfps.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-hairline pt-3">
                  {account.pastRfps.map((p) => (
                    <li key={p.year + p.mandate} className="flex justify-between text-[11px] text-ink-faint">
                      <span>
                        {p.year} — {p.mandate}
                      </span>
                      <span
                        className={classNames(
                          "font-medium",
                          p.outcome === "won" ? "text-positive" : p.outcome === "lost" ? "text-critical" : ""
                        )}
                      >
                        {p.outcome}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {adviser && (
                <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-paper text-xs font-semibold">
                    {adviser.initials}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-ink">{adviser.name}</p>
                    <p className="text-[10px] text-ink-faint">Assigned client adviser</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-ink-faint">No CRM record matched.</p>
          )}
        </aside>
      </div>
    </Panel>
  );
}
