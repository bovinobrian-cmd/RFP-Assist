"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/state/AppStateContext";
import { Button, Panel, PanelHeader } from "@/components/ui";
import { validateDraft, type EditorDraft, type ValidationIssue } from "@/lib/validation";
import { ASSET_CLASS_LABEL, type AssetClassCode, type DataPoint, type ReviewItem } from "@/lib/types";
import { classNames } from "@/lib/util";

export interface EditorPrefill {
  qaId: string | null;
  title: string;
  origin: ReviewItem["origin"];
  originDetail: string;
  draft: Partial<EditorDraft>;
}

const BLANK: EditorDraft = {
  question_canonical: "",
  question_variants: [],
  answer_text: "",
  answer_summary: "",
  asset_class: "",
  products: [],
  client_types: ["institutional"],
  compliance_tags: [],
  data_points: [],
  owner: "",
  effective_date: new Date().toISOString().slice(0, 10),
  review_by: "",
};

export function QaEditor({
  prefill,
  onDone,
  onCancel,
}: {
  prefill: EditorPrefill | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { qaPairs, personas, activePersonaId, submitToReview } = useAppState();
  const activePersona = personas.find((p) => p.id === activePersonaId);
  const [draft, setDraft] = useState<EditorDraft>({
    ...BLANK,
    owner: activePersona?.name ?? "",
    ...prefill?.draft,
    question_variants: prefill?.draft.question_variants ?? [],
    data_points: prefill?.draft.data_points ?? [],
  });
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const patch = (p: Partial<EditorDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setIssues(null);
  };

  const blocks = useMemo(() => (issues ?? []).filter((i) => i.level === "block"), [issues]);
  const warnings = useMemo(() => (issues ?? []).filter((i) => i.level === "warning"), [issues]);

  const submit = () => {
    const result = validateDraft(draft, qaPairs, prefill?.qaId ?? null);
    setIssues(result);
    if (result.some((i) => i.level === "block")) return;
    submitToReview({
      qaId: prefill?.qaId ?? null,
      title: prefill?.title ?? `New pair — ${draft.question_canonical.slice(0, 60)}`,
      proposedQuestion: draft.question_canonical,
      proposedAnswer: draft.answer_text,
      proposedDataPoints: draft.data_points as DataPoint[],
      assetClass: (draft.asset_class || "firmwide") as AssetClassCode,
      submittedBy: activePersona?.name ?? "Data Steward",
      origin: prefill?.origin ?? "editor",
      originDetail: prefill?.originDetail ?? "Authored in the structured editor",
    });
    setSubmitted(true);
    setTimeout(onDone, 900);
  };

  if (submitted) {
    return (
      <Panel>
        <div className="px-6 py-10 text-center">
          <p className="font-display text-lg text-positive">Submitted to review</p>
          <p className="mt-1 text-sm text-ink-soft">
            All validation gates passed{warnings.length > 0 ? ` (${warnings.length} soft warning${warnings.length === 1 ? "" : "s"} noted)` : ""}. The pair is now <code>in_review</code> —
            a second steward must approve before it reaches golden source.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title={prefill?.qaId ? `Structured editor — editing ${prefill.qaId}` : "Structured editor — new Q&A pair"}
        subtitle="Validation gates (PRD §9.2) run on submit: hard blocks stop submission, soft warnings are recorded"
        right={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={submit}>Submit for review</Button>
          </div>
        }
      />

      {issues && (blocks.length > 0 || warnings.length > 0) && (
        <div className="space-y-2 border-b border-hairline px-5 py-4">
          {blocks.map((i, idx) => (
            <p key={idx} className="rounded-card border border-critical/40 bg-critical-tint px-3 py-2 text-xs text-ink">
              <span className="font-bold text-critical">BLOCK · {i.gate}</span> — {i.message}
            </p>
          ))}
          {warnings.map((i, idx) => (
            <p key={idx} className="rounded-card border border-caution/40 bg-caution-tint px-3 py-2 text-xs text-ink">
              <span className="font-bold text-caution">WARNING · {i.gate}</span> — {i.message}
            </p>
          ))}
          {blocks.length === 0 && (
            <p className="text-xs text-positive">No hard blocks — resubmit to proceed with the warnings recorded.</p>
          )}
        </div>
      )}

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Field label="Canonical question *" hint="One question, one answer — compound questions are rejected.">
            <textarea
              rows={2}
              value={draft.question_canonical}
              onChange={(e) => patch({ question_canonical: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Question variants" hint="Alternative phrasings improve semantic-retrieval recall (soft warning if empty).">
            {draft.question_variants.map((v, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={v}
                  onChange={(e) =>
                    patch({ question_variants: draft.question_variants.map((x, j) => (j === i ? e.target.value : x)) })
                  }
                  className={inputCls}
                />
                <Button variant="ghost" onClick={() => patch({ question_variants: draft.question_variants.filter((_, j) => j !== i) })}>
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => patch({ question_variants: [...draft.question_variants, ""] })}>
              + Add variant
            </Button>
          </Field>

          <Field
            label="Answer text *"
            hint="Self-contained, tone-neutral prose, 40–600 words. Every figure must be tagged as a data point below."
          >
            <textarea
              rows={8}
              value={draft.answer_text}
              onChange={(e) => patch({ answer_text: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Answer summary" hint="≤ 30 words. Used for retrieval ranking.">
            <input
              value={draft.answer_summary}
              onChange={(e) => patch({ answer_summary: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Structured data points" hint="Machine-readable claims with as-of dates — this is what keeps drafts from shipping stale figures.">
            {draft.data_points.map((dp, i) => (
              <div key={i} className="mb-2 grid grid-cols-2 gap-2 rounded-card border border-hairline p-3 sm:grid-cols-5">
                <input placeholder="Claim" value={dp.claim} onChange={(e) => patchDp(i, { claim: e.target.value })} className={inputCls} />
                <input placeholder="Value" value={dp.value} onChange={(e) => patchDp(i, { value: e.target.value })} className={inputCls} />
                <input type="date" value={dp.as_of} onChange={(e) => patchDp(i, { as_of: e.target.value })} className={inputCls} aria-label="As-of date" />
                <select value={dp.refresh_cadence} onChange={(e) => patchDp(i, { refresh_cadence: e.target.value })} className={inputCls} aria-label="Refresh cadence">
                  <option value="quarterly">quarterly</option>
                  <option value="annual">annual</option>
                  <option value="monthly">monthly</option>
                </select>
                <div className="flex gap-1">
                  <input placeholder="Source" value={dp.source} onChange={(e) => patchDp(i, { source: e.target.value })} className={inputCls} />
                  <Button variant="ghost" onClick={() => patch({ data_points: draft.data_points.filter((_, j) => j !== i) })}>×</Button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                patch({
                  data_points: [
                    ...draft.data_points,
                    { claim: "", value: "", as_of: "", refresh_cadence: "quarterly", source: "" },
                  ],
                })
              }
            >
              + Add data point
            </Button>
          </Field>
        </div>

        <div className="space-y-5">
          <Field label="Asset class *">
            <select value={draft.asset_class} onChange={(e) => patch({ asset_class: e.target.value })} className={inputCls}>
              <option value="">Select…</option>
              {(Object.keys(ASSET_CLASS_LABEL) as AssetClassCode[]).map((ac) => (
                <option key={ac} value={ac}>{ASSET_CLASS_LABEL[ac]}</option>
              ))}
            </select>
          </Field>

          <Field label="Products *" hint="Comma-separated controlled vocabulary.">
            <input
              value={draft.products.join(", ")}
              onChange={(e) => patch({ products: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="core_bond, global_agg"
              className={inputCls}
            />
          </Field>

          <Field label="Client types *">
            <input
              value={draft.client_types.join(", ")}
              onChange={(e) => patch({ client_types: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className={inputCls}
            />
          </Field>

          <Field label="Compliance tags" hint="Mandatory when the answer contains performance, forward-looking, or ESG language.">
            <input
              value={draft.compliance_tags.join(", ")}
              onChange={(e) => patch({ compliance_tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="performance_claims, esg_claims"
              className={inputCls}
            />
          </Field>

          <Field label="Owner *">
            <input value={draft.owner} onChange={(e) => patch({ owner: e.target.value })} className={inputCls} />
          </Field>

          <Field label="Effective date *">
            <input type="date" value={draft.effective_date} onChange={(e) => patch({ effective_date: e.target.value })} className={inputCls} />
          </Field>

          <Field label="Review-by date * (freshness SLA)">
            <input type="date" value={draft.review_by} onChange={(e) => patch({ review_by: e.target.value })} className={inputCls} />
          </Field>
        </div>
      </div>
    </Panel>
  );

  function patchDp(i: number, p: Partial<EditorDraft["data_points"][number]>) {
    patch({ data_points: draft.data_points.map((dp, j) => (j === i ? { ...dp, ...p } : dp)) });
  }
}

const inputCls =
  "w-full rounded border border-hairline-strong bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink">{label}</label>
      {children}
      {hint && <p className={classNames("mt-1 text-[11px] text-ink-faint")}>{hint}</p>}
    </div>
  );
}
