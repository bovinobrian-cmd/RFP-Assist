"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { Button, EmptyState, Panel, PanelHeader } from "@/components/ui";
import { wordDiff } from "@/lib/diff";
import { ENRICHMENT_KIND_LABEL, type EnrichmentCard, type EnrichmentKind } from "@/lib/types";
import { classNames, formatDate } from "@/lib/util";

const KIND_STYLE: Record<EnrichmentKind, string> = {
  promote_winning_variant: "bg-positive-tint text-positive",
  convergent_edit: "bg-info-tint text-info",
  underperforming_answer: "bg-critical-tint text-critical",
  coverage_gap: "bg-accent-tint text-accent-deep",
  freshness_breach: "bg-caution-tint text-caution",
};

export function EnrichmentFeed() {
  const { enrichmentCards, personas, activePersonaId } = useAppState();
  const actor = personas.find((p) => p.id === activePersonaId)?.name ?? "Data Steward";

  const fresh = enrichmentCards.filter((c) => c.status === "new");
  const actioned = enrichmentCards.filter((c) => c.status !== "new");

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Smart Enrichment feed"
          subtitle="Win/loss-driven content-evolution prompts. Outcome correlation is decision support, not causation — you remain the editorial authority, and nothing publishes without review."
        />
        {fresh.length === 0 ? (
          <EmptyState
            title="No new enrichment prompts"
            body="Signals from win/loss outcomes, convergent adviser edits, and freshness breaches will surface here."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {fresh.map((card) => (
              <EnrichmentCardView key={card.id} card={card} actor={actor} />
            ))}
          </div>
        )}
      </Panel>

      {actioned.length > 0 && (
        <Panel>
          <PanelHeader title="Actioned" />
          <ul className="divide-y divide-hairline">
            {actioned.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="truncate text-sm text-ink-soft">{c.title}</span>
                <span
                  className={classNames(
                    "rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase",
                    c.status === "accepted" ? "bg-positive-tint text-positive" : "bg-canvas text-ink-faint"
                  )}
                >
                  {c.status === "accepted" ? "Accepted → in review" : `Dismissed${c.dismissReason ? ` — ${c.dismissReason}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function EnrichmentCardView({ card, actor }: { card: EnrichmentCard; actor: string }) {
  const { qaPairs, actionEnrichmentCard } = useAppState();
  const [mode, setMode] = useState<"view" | "edit" | "dismiss">("view");
  const [editedAnswer, setEditedAnswer] = useState(card.proposedAnswer ?? "");
  const [dismissReason, setDismissReason] = useState("");
  const [showDiff, setShowDiff] = useState(false);

  const current = card.qaId ? qaPairs.find((p) => p.id === card.qaId) : null;
  const segments = useMemo(
    () => (current && card.proposedAnswer ? wordDiff(current.answer_text, card.proposedAnswer) : null),
    [current, card.proposedAnswer]
  );

  return (
    <article className="px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={classNames("rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", KIND_STYLE[card.kind])}>
          {ENRICHMENT_KIND_LABEL[card.kind]}
        </span>
        {card.qaId && <code className="text-[11px] text-ink-faint">{card.qaId}</code>}
      </div>
      <h3 className="mt-2 font-display text-base text-ink">{card.title}</h3>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-soft">{card.rationale}</p>

      <div className="mt-3 rounded-card border border-hairline bg-canvas px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Provenance</p>
        <p className="mt-1 text-xs font-medium text-ink">{card.provenance.sampleSize}</p>
        <p className="text-[11px] text-ink-faint">{card.provenance.signal}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
          {card.provenance.sources.map((s) => (
            <li key={s} className="text-[11px] text-ink-soft">· {s}</li>
          ))}
        </ul>
      </div>

      {showDiff && segments && (
        <div className="mt-3 rounded-card border border-hairline bg-paper p-4 text-sm leading-relaxed">
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Proposed vs. current approved v{current?.version}
          </p>
          <p>
            {segments.map((seg, i) => (
              <span key={i} className={seg.kind === "added" ? "diff-added" : seg.kind === "removed" ? "diff-removed" : undefined}>
                {seg.text}
              </span>
            ))}
          </p>
        </div>
      )}

      {card.proposedDataPoints && card.proposedDataPoints.length > 0 && (
        <ul className="mt-3 space-y-1">
          {card.proposedDataPoints.map((dp) => (
            <li key={dp.claim} className="text-xs text-ink-soft">
              <span className="font-medium text-ink">{dp.claim}:</span> {dp.value} · as of {formatDate(dp.as_of)} · {dp.refresh_cadence}
            </li>
          ))}
        </ul>
      )}

      {mode === "edit" && (
        <div className="mt-3">
          <textarea
            value={editedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
            rows={7}
            className="w-full rounded-card border border-hairline-strong bg-paper p-3 text-sm leading-relaxed focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {mode === "dismiss" && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Reason for dismissal (recorded for enrichment adoption metrics)"
            className="w-full max-w-md rounded border border-hairline-strong px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "view" && (
          <>
            <Button onClick={() => actionEnrichmentCard(card.id, "accepted", { actor })}>
              Accept → send to review
            </Button>
            {card.proposedAnswer && (
              <Button variant="secondary" onClick={() => setMode("edit")}>
                Edit before sending
              </Button>
            )}
            {segments && (
              <Button variant="secondary" onClick={() => setShowDiff((v) => !v)}>
                {showDiff ? "Hide diff" : "View diff"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setMode("dismiss")}>
              Dismiss
            </Button>
          </>
        )}
        {mode === "edit" && (
          <>
            <Button onClick={() => actionEnrichmentCard(card.id, "accepted", { actor, editedAnswer })}>
              Send edited version to review
            </Button>
            <Button variant="secondary" onClick={() => setMode("view")}>Cancel</Button>
          </>
        )}
        {mode === "dismiss" && (
          <>
            <Button
              variant="danger"
              disabled={!dismissReason.trim()}
              onClick={() => actionEnrichmentCard(card.id, "dismissed", { actor, dismissReason: dismissReason.trim() })}
            >
              Confirm dismissal
            </Button>
            <Button variant="secondary" onClick={() => setMode("view")}>Cancel</Button>
          </>
        )}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Accepted prompts enter the standard in-review → approval workflow and re-pass every validation gate. Never auto-published.
      </p>
    </article>
  );
}
