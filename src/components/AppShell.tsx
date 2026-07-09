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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-baseline gap-4">
              <span className="font-display text-lg tracking-wide">
                J.P. Morgan <span className="text-hairline-strong">Asset Management</span>
              </span>
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-ink-faint border-l border-ink-soft pl-4">
                RFP Response Platform
              </span>
            </div>
            <PersonaSwitcher />
          </div>
          <nav className="flex gap-1 -mb-px" aria-label="Primary">
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
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <footer className="border-t border-hairline py-4">
        <div className="mx-auto max-w-7xl px-6 text-[11px] text-ink-faint flex flex-wrap gap-x-6 gap-y-1">
          <span>Prototype — all data synthetic. Not for client use.</span>
          <span>Substance locked to golden source · compliance gated · human in the loop</span>
        </div>
      </footer>
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
