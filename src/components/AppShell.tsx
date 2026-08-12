"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/state/AppStateContext";
import { classNames } from "@/lib/util";
import { useState } from "react";

const TABS = [
  { href: "/sales", label: "Sales Workspace" },
  { href: "/steward", label: "Data Steward Hub" },
];

/** Authoring routes take over the full viewport — no page scroll, no footer. */
const IMMERSIVE_ROUTE = /^\/sales\/[^/]+$/;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = IMMERSIVE_ROUTE.test(pathname);
  const authoringRfpId = immersive ? pathname.split("/")[2] : null;

  return (
    <div className={classNames("flex flex-col", immersive ? "h-screen overflow-hidden" : "min-h-screen")}>
      <header className="shrink-0 bg-ink text-paper">
        <div className={classNames("px-7", !immersive && "mx-auto w-full max-w-[1360px]")}>
          <div className="flex h-[52px] items-center justify-between">
            <div className="flex items-baseline gap-4">
              <span className="font-display text-lg tracking-[0.02em]">
                Asset Management <span className="text-hairline-strong">Co.</span>
              </span>
              <span className="hidden sm:inline border-l border-ink-soft pl-4 text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                RFP Assist
              </span>
            </div>
            <div className="flex items-center gap-4">
              {authoringRfpId ? <ComplianceAgentPill rfpId={authoringRfpId} /> : <SalesforcePill />}
              <PersonaSwitcher />
            </div>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="Primary">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={classNames(
                    "px-5 py-2.5 text-sm border-b-2 transition-colors",
                    active
                      ? "border-accent text-paper font-medium bg-white/5"
                      : "border-transparent text-hairline-strong hover:text-paper"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {immersive ? (
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      ) : (
        <main className="flex-1">
          <div className="mx-auto max-w-[1360px] px-7 py-8">{children}</div>
        </main>
      )}
      {!immersive && (
        <footer className="border-t border-hairline py-4">
          <div className="mx-auto max-w-[1360px] px-7 text-[11px] text-ink-faint flex flex-wrap gap-x-6 gap-y-1">
            <span>Prototype — all data synthetic. Not for client use.</span>
            <span>Substance locked to golden source · compliance gated · human in the loop</span>
          </div>
        </footer>
      )}
    </div>
  );
}

function SalesforcePill() {
  return (
    <div className="hidden md:flex items-center gap-2 rounded-full border border-ink-soft/60 px-3.5 py-[5px] text-xs text-hairline-strong">
      <span className="h-[7px] w-[7px] rounded-full bg-positive-bright animate-pulse-dot" aria-hidden />
      Salesforce connected
    </div>
  );
}

function ComplianceAgentPill({ rfpId }: { rfpId: string }) {
  const { work } = useAppState();
  const w = work[rfpId];
  const open = (w?.findings ?? []).filter(
    (f) => !f.resolved && !(f.severity === "Flag" && f.acknowledged)
  );
  const blocks = open.some((f) => f.severity === "Block");

  let dot = "bg-positive-bright";
  let label = "clear";
  if (!w || w.scanState !== "done") {
    dot = "bg-hairline-strong";
    label = w?.scanState === "running" ? "scanning…" : "standing by";
  } else if (open.length > 0) {
    dot = blocks ? "bg-critical-bright" : "bg-caution-bright";
    label = `${open.length} open`;
  }

  return (
    <div className="hidden md:flex items-center gap-2 rounded-full border border-ink-soft/60 px-3 py-1 text-xs text-hairline-strong">
      <span className={classNames("h-[7px] w-[7px] rounded-full animate-pulse-dot", dot)} aria-hidden />
      Compliance agent · {label}
    </div>
  );
}

function PersonaSwitcher() {
  const { personas, activePersonaId, setActivePersonaId, loading } = useAppState();
  const [open, setOpen] = useState(false);
  const active = personas.find((p) => p.id === activePersonaId);

  if (loading || !active) {
    return <div className="h-9 w-40 rounded bg-white/10 animate-pulse" aria-hidden />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded border border-ink-soft/60 px-3 py-1.5 text-left hover:border-hairline-strong transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-paper text-xs font-semibold">
          {active.initials}
        </span>
        <span className="hidden md:block">
          <span className="block text-sm leading-tight">{active.name}</span>
          <span className="block text-[11px] text-ink-faint leading-tight">{active.title}</span>
        </span>
        <span className="text-ink-faint text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            className="absolute right-0 z-20 mt-2 w-72 rounded-card border border-hairline bg-paper text-ink shadow-raised overflow-hidden"
          >
            <li className="px-4 py-2 text-[11px] uppercase tracking-wider text-ink-faint border-b border-hairline">
              Viewing as (mock persona)
            </li>
            {personas.map((p) => (
              <li key={p.id} role="option" aria-selected={p.id === activePersonaId}>
                <button
                  className={classNames(
                    "w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-accent-wash transition-colors",
                    p.id === activePersonaId && "bg-accent-tint"
                  )}
                  onClick={() => {
                    setActivePersonaId(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-paper text-xs font-semibold">
                    {p.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-ink-soft">{p.title}</span>
                    {p.toneProfile && (
                      <span className="mt-1 block text-[11px] text-ink-faint italic">
                        Voice: {p.toneProfile}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
