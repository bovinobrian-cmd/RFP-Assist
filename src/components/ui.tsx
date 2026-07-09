"use client";

import { classNames } from "@/lib/util";
import type { ComplianceSeverity, GenerationTier, RfpStatus } from "@/lib/types";
import { RFP_STATUS_LABEL, TIER_CHIP } from "@/lib/types";

// --- Provenance chip (PRD Appendix A) ---------------------------------------

const TIER_STYLE: Record<GenerationTier, string> = {
  1: "bg-tier1-tint text-tier1 border-tier1/30",
  2: "bg-tier2-tint text-tier2 border-tier2/30",
  3: "bg-tier3-tint text-tier3 border-tier3/30",
  4: "bg-tier4-tint text-tier4 border-tier4/30",
};

export function ProvenanceChip({ tier, className }: { tier: GenerationTier; className?: string }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-chip border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap",
        TIER_STYLE[tier],
        className
      )}
    >
      {TIER_CHIP[tier]}
    </span>
  );
}

// --- RFP status badge ---------------------------------------------------------

const STATUS_STYLE: Record<RfpStatus, string> = {
  new: "bg-info-tint text-info",
  in_review: "bg-accent-tint text-accent-deep",
  compliance: "bg-caution-tint text-caution",
  approved: "bg-positive-tint text-positive",
  exported: "bg-ink text-paper",
};

export function StatusBadge({ status }: { status: RfpStatus }) {
  return (
    <span className={classNames("inline-flex rounded-chip px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[status])}>
      {RFP_STATUS_LABEL[status]}
    </span>
  );
}

// --- Compliance severity pill ---------------------------------------------------

const SEVERITY_STYLE: Record<ComplianceSeverity, string> = {
  Block: "bg-critical text-paper",
  Flag: "bg-caution text-paper",
  Info: "bg-info-tint text-info",
};

export function SeverityPill({ severity }: { severity: ComplianceSeverity }) {
  return (
    <span className={classNames("inline-flex rounded-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", SEVERITY_STYLE[severity])}>
      {severity}
    </span>
  );
}

// --- Panels & primitives ----------------------------------------------------------

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={classNames("rounded-card border border-hairline bg-paper shadow-card", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
      <div>
        <h2 className="font-display text-base text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-ink-soft disabled:bg-hairline-strong",
    secondary: "border border-hairline-strong text-ink hover:border-ink hover:bg-accent-wash disabled:text-ink-faint disabled:hover:border-hairline-strong disabled:hover:bg-transparent",
    ghost: "text-accent-deep hover:bg-accent-wash",
    danger: "bg-critical text-paper hover:opacity-90",
  } as const;
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 h-10 w-10 rounded-full border border-hairline-strong bg-canvas" aria-hidden />
      <p className="font-display text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs text-ink-faint">{body}</p>}
    </div>
  );
}

export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-5" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded bg-canvas" />
      ))}
    </div>
  );
}
