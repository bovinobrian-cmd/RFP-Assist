"use client";

import { useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { classNames } from "@/lib/util";
import { Library } from "@/components/steward/Library";
import { QaEditor, type EditorPrefill } from "@/components/steward/QaEditor";
import { ReviewQueue } from "@/components/steward/ReviewQueue";
import { GapQueue } from "@/components/steward/GapQueue";
import { EnrichmentFeed } from "@/components/steward/EnrichmentFeed";

type StewardTab = "library" | "editor" | "review" | "gaps" | "enrichment";

export default function StewardHubPage() {
  const { qaPairs, reviewQueue, coverageGaps, enrichmentCards, loading } = useAppState();
  const [tab, setTab] = useState<StewardTab>("library");
  const [prefill, setPrefill] = useState<EditorPrefill | null>(null);

  const openEditor = (p: EditorPrefill | null) => {
    setPrefill(p);
    setTab("editor");
  };

  const pendingReviews = reviewQueue.filter((i) => i.status === "pending_review").length;
  const openGaps = coverageGaps.filter((g) => g.status !== "resolved").length;
  const newCards = enrichmentCards.filter((c) => c.status === "new").length;

  const tabs: { id: StewardTab; label: string; count?: number }[] = [
    { id: "library", label: "Q&A Library", count: loading ? undefined : qaPairs.length },
    { id: "editor", label: "Editor" },
    { id: "review", label: "Review Queue", count: pendingReviews },
    { id: "gaps", label: "Coverage Gaps", count: openGaps },
    { id: "enrichment", label: "Smart Enrichment", count: newCards },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Data Steward Hub</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Golden-source governance: every pair machine-readable by construction, every change
          through review, every answer traceable.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-hairline" aria-label="Steward sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "editor") openEditor(null);
              else setTab(t.id);
            }}
            className={classNames(
              "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-accent text-ink font-medium"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span
                className={classNames(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  t.id === "enrichment" || t.id === "gaps"
                    ? "bg-accent text-paper"
                    : "bg-canvas text-ink-soft"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "library" && <Library onEdit={(p) => openEditor(p)} onNew={() => openEditor(null)} />}
      {tab === "editor" && (
        <QaEditor
          prefill={prefill}
          onDone={() => setTab("review")}
          onCancel={() => setTab("library")}
        />
      )}
      {tab === "review" && <ReviewQueue />}
      {tab === "gaps" && <GapQueue onDraft={(p) => openEditor(p)} />}
      {tab === "enrichment" && <EnrichmentFeed />}
    </div>
  );
}
