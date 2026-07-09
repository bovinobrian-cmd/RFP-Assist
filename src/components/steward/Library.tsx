"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { Button, EmptyState, LoadingRows, Panel, PanelHeader } from "@/components/ui";
import { classNames, formatDate } from "@/lib/util";
import { ASSET_CLASS_LABEL, type AssetClassCode, type QaPair, type QaStatus } from "@/lib/types";
import type { EditorPrefill } from "./QaEditor";

const STATUS_STYLE: Record<QaStatus, string> = {
  approved: "bg-positive-tint text-positive",
  in_review: "bg-caution-tint text-caution",
  draft: "bg-info-tint text-info",
  retired: "bg-canvas text-ink-faint",
};

function isStale(p: QaPair): boolean {
  return new Date(p.review_by) < new Date();
}

export function Library({ onEdit, onNew }: { onEdit: (p: EditorPrefill) => void; onNew: () => void }) {
  const { qaPairs, loading } = useAppState();
  const [assetClass, setAssetClass] = useState<AssetClassCode | "all">("all");
  const [status, setStatus] = useState<QaStatus | "all">("all");
  const [freshness, setFreshness] = useState<"all" | "stale" | "fresh">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      qaPairs.filter(
        (p) =>
          (assetClass === "all" || p.asset_class === assetClass) &&
          (status === "all" || p.status === status) &&
          (freshness === "all" || (freshness === "stale") === isStale(p)) &&
          (query.trim() === "" ||
            (p.question_canonical + " " + p.answer_text + " " + p.id)
              .toLowerCase()
              .includes(query.trim().toLowerCase()))
      ),
    [qaPairs, assetClass, status, freshness, query]
  );

  const staleCount = qaPairs.filter(isStale).length;

  return (
    <Panel>
      <PanelHeader
        title="Golden-Source Q&A Library"
        subtitle={`${qaPairs.length} pairs · ${staleCount} past review-by SLA`}
        right={<Button onClick={onNew}>+ New Q&A pair</Button>}
      />
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, answers, ids…"
          className="w-full sm:w-64 rounded border border-hairline-strong px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value as AssetClassCode | "all")}
          className="rounded border border-hairline-strong px-2 py-1.5 text-sm bg-paper"
          aria-label="Filter by asset class"
        >
          <option value="all">All asset classes</option>
          {(Object.keys(ASSET_CLASS_LABEL) as AssetClassCode[]).map((ac) => (
            <option key={ac} value={ac}>
              {ASSET_CLASS_LABEL[ac]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as QaStatus | "all")}
          className="rounded border border-hairline-strong px-2 py-1.5 text-sm bg-paper"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="in_review">In review</option>
          <option value="draft">Draft</option>
          <option value="retired">Retired</option>
        </select>
        <select
          value={freshness}
          onChange={(e) => setFreshness(e.target.value as "all" | "stale" | "fresh")}
          className="rounded border border-hairline-strong px-2 py-1.5 text-sm bg-paper"
          aria-label="Filter by freshness"
        >
          <option value="all">Any freshness</option>
          <option value="stale">Past review-by</option>
          <option value="fresh">Within SLA</option>
        </select>
      </div>

      {loading ? (
        <LoadingRows count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No pairs match these filters" body="Adjust the filters or create a new Q&A pair." />
      ) : (
        <ul className="divide-y divide-hairline">
          {filtered.map((p) => {
            const stale = isStale(p);
            const open = openId === p.id;
            return (
              <li key={p.id}>
                <button
                  className="w-full px-5 py-3.5 text-left transition-colors hover:bg-accent-wash"
                  onClick={() => setOpenId(open ? null : p.id)}
                  aria-expanded={open}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-[11px] text-ink-faint">{p.id}</code>
                    <span className={classNames("rounded-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS_STYLE[p.status])}>
                      {p.status.replace("_", " ")}
                    </span>
                    <span className="rounded-chip bg-canvas px-2 py-0.5 text-[10px] text-ink-soft">
                      {ASSET_CLASS_LABEL[p.asset_class]}
                    </span>
                    <span className="text-[10px] text-ink-faint">v{p.version}</span>
                    {stale && (
                      <span className="rounded-chip bg-critical-tint px-2 py-0.5 text-[10px] font-semibold text-critical">
                        STALE — review by {formatDate(p.review_by)}
                      </span>
                    )}
                    {p.question_variants.length === 0 && (
                      <span className="rounded-chip bg-caution-tint px-2 py-0.5 text-[10px] text-caution">
                        no variants
                      </span>
                    )}
                    {p.usage_stats.downstream_edit_rate >= 0.25 && (
                      <span className="rounded-chip bg-caution-tint px-2 py-0.5 text-[10px] text-caution">
                        high edit rate {(p.usage_stats.downstream_edit_rate * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-ink">{p.question_canonical}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {p.answer_summary || p.answer_text.slice(0, 110) + "…"} · {p.usage_stats.retrievals_90d}{" "}
                    retrievals/90d
                    {p.usage_stats.win_rate != null && ` · win rate ${(p.usage_stats.win_rate * 100).toFixed(0)}%`}
                  </p>
                </button>

                {open && (
                  <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{p.answer_text}</p>

                    {p.data_points.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Structured data points</p>
                        <ul className="mt-1.5 space-y-1">
                          {p.data_points.map((dp) => {
                            const dpStale = new Date(dp.as_of) < new Date(Date.now() - 365 * 86_400_000);
                            return (
                              <li key={dp.claim} className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-ink">{dp.claim}:</span>
                                <span className="text-ink-soft">{dp.value}</span>
                                <span className={classNames("rounded-chip px-1.5 py-0.5 text-[10px]", dpStale ? "bg-critical-tint text-critical" : "bg-paper text-ink-faint")}>
                                  as of {formatDate(dp.as_of)} · {dp.refresh_cadence}
                                </span>
                                <span className="text-[10px] text-ink-faint">{dp.source}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Governance</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          Owner {p.owner} · Approver {p.approver ?? "—"} · Effective {formatDate(p.effective_date)} ·
                          Review by {formatDate(p.review_by)}
                        </p>
                        {p.compliance_tags.length > 0 && (
                          <p className="mt-1 text-xs text-ink-faint">Tags: {p.compliance_tags.join(", ")}</p>
                        )}
                        {Object.keys(p.tone_variants).length > 0 && (
                          <p className="mt-1 text-xs text-ink-faint">
                            Tone variants: {Object.keys(p.tone_variants).length} adviser(s)
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Version history</p>
                        <ul className="mt-1 space-y-0.5">
                          {p.version_history.slice(0, 3).map((v) => (
                            <li key={v.version} className="text-xs text-ink-soft">
                              v{v.version} · {formatDate(v.date)} · {v.author} — {v.note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          onEdit({
                            qaId: p.id,
                            title: `Edit ${p.id} — ${p.question_canonical.slice(0, 60)}`,
                            origin: "editor",
                            originDetail: `Steward edit of ${p.id} (v${p.version})`,
                            draft: {
                              question_canonical: p.question_canonical,
                              question_variants: p.question_variants,
                              answer_text: p.answer_text,
                              answer_summary: p.answer_summary,
                              asset_class: p.asset_class,
                              products: p.products,
                              client_types: p.client_types,
                              compliance_tags: p.compliance_tags,
                              data_points: p.data_points,
                              owner: p.owner,
                              effective_date: p.effective_date,
                              review_by: p.review_by,
                            },
                          })
                        }
                      >
                        Edit in structured editor
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
