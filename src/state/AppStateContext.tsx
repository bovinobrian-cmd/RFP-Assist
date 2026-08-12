"use client";

// ---------------------------------------------------------------------------
// In-memory application state (prototype constraint: no localStorage — React
// context only). Loads seed data through the adapter interfaces on mount and
// exposes every workflow action the two workspaces need.
// ---------------------------------------------------------------------------

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ComplianceFinding,
  CoverageGap,
  CrmAccount,
  DraftAnswer,
  EnrichmentCard,
  GenAiAction,
  IntakeItem,
  Persona,
  QaPair,
  ReviewItem,
  Rfp,
  RfpStatus,
} from "@/lib/types";
import {
  mockComplianceAdapter,
  mockContentStoreAdapter,
  mockCrmAdapter,
  mockRfpSourceAdapter,
  mockTonalityAdapter,
} from "@/lib/adapters";
import { generateAnswer } from "@/lib/generation";
import { overallOutcome } from "@/lib/compliance";
import type { AdviserHistoryEntry } from "@/lib/types";
import gapSeed from "@/data/coverage-gaps.json";
import reviewSeed from "@/data/review-queue.json";
import enrichmentSeed from "@/data/enrichment.json";
import { uid } from "@/lib/util";

export type PanelTab = "answer" | "doc";

export interface RfpWorkState {
  answers: Record<string, DraftAnswer>;
  generation: "idle" | "running" | "done";
  /** questionId currently being generated (drives the progress animation). */
  generatingQuestionId: string | null;
  generatedCount: number;
  findings: ComplianceFinding[];
  scanState: "idle" | "running" | "done";
  /** Question highlighted in the document and shown in the side panel. */
  selectedQuestionId: string | null;
  panelTab: PanelTab;
  /** GenAI action in flight for the selected question ("draft" = tier-4 AI draft). */
  genAiWorking: GenAiAction | "draft" | null;
  /** Confirmation line after the last GenAI rewrite (cleared on select/undo). */
  lastGenAiNote: string | null;
}

interface AppState {
  loading: boolean;
  personas: Persona[];
  activePersonaId: string;
  setActivePersonaId: (id: string) => void;
  rfps: Rfp[];
  crmAccounts: Record<string, CrmAccount>;
  qaPairs: QaPair[];
  work: Record<string, RfpWorkState>;
  salesforceQueue: IntakeItem[];
  coverageGaps: CoverageGap[];
  reviewQueue: ReviewItem[];
  enrichmentCards: EnrichmentCard[];
  // Intake dashboard actions
  startIntake: (itemId: string) => Promise<void>;
  // Sales workspace actions
  generateForRfp: (rfpId: string) => Promise<void>;
  updateAnswerText: (rfpId: string, questionId: string, text: string) => void;
  revertAnswer: (rfpId: string, questionId: string) => void;
  acceptAnswer: (rfpId: string, questionId: string, accepted: boolean) => void;
  selectQuestion: (rfpId: string, questionId: string) => void;
  setPanelTab: (rfpId: string, tab: PanelTab) => void;
  runGenAi: (rfpId: string, questionId: string, action: GenAiAction) => Promise<void>;
  undoGenAi: (rfpId: string, questionId: string) => void;
  generateAiDraft: (rfpId: string, questionId: string) => Promise<void>;
  routeQuestion: (rfpId: string, questionId: string) => void;
  runCompliance: (rfpId: string) => Promise<void>;
  applyAutoFix: (rfpId: string, findingId: string) => void;
  acknowledgeFlag: (rfpId: string, findingId: string, reason: string) => void;
  markExported: (rfpId: string) => void;
  // Steward actions
  submitToReview: (item: Omit<ReviewItem, "id" | "status" | "submittedDate">) => ReviewItem;
  approveReviewItem: (itemId: string, approver: string) => void;
  rejectReviewItem: (itemId: string) => void;
  actionEnrichmentCard: (cardId: string, action: "accepted" | "dismissed", detail?: { editedAnswer?: string; dismissReason?: string; actor: string }) => void;
  setGapStatus: (gapId: string, status: CoverageGap["status"]) => void;
}

const Ctx = createContext<AppState | null>(null);

const emptyWork = (): RfpWorkState => ({
  answers: {},
  generation: "idle",
  generatingQuestionId: null,
  generatedCount: 0,
  findings: [],
  scanState: "idle",
  selectedQuestionId: null,
  panelTab: "answer",
  genAiWorking: null,
  lastGenAiNote: null,
});

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState("adv-chen");
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [crmAccounts, setCrmAccounts] = useState<Record<string, CrmAccount>>({});
  const [qaPairs, setQaPairs] = useState<QaPair[]>([]);
  const [work, setWork] = useState<Record<string, RfpWorkState>>({});
  const [salesforceQueue, setSalesforceQueue] = useState<IntakeItem[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>(gapSeed as CoverageGap[]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(reviewSeed as ReviewItem[]);
  const [enrichmentCards, setEnrichmentCards] = useState<EnrichmentCard[]>(enrichmentSeed as EnrichmentCard[]);
  const historiesRef = useRef<Record<string, AdviserHistoryEntry[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rfpList, pairs, queue] = await Promise.all([
        mockRfpSourceAdapter.listRfps(),
        mockContentStoreAdapter.listQaPairs(),
        mockCrmAdapter.listIntakeQueue(),
      ]);
      const accountIds = [...new Set(rfpList.map((r) => r.crmAccountId))];
      const adviserIds = [...new Set(rfpList.map((r) => r.assignedAdviserId))];
      const [accounts, advisers, histories] = await Promise.all([
        Promise.all(accountIds.map((id) => mockCrmAdapter.getAccount(id))),
        Promise.all(adviserIds.map((id) => mockCrmAdapter.getAdviser(id))),
        Promise.all(adviserIds.map((id) => mockCrmAdapter.getAdviserHistory(id))),
      ]);
      const steward = await mockCrmAdapter.getAdviser("stw-sharma");
      if (cancelled) return;
      setRfps(rfpList);
      setQaPairs(pairs);
      setSalesforceQueue(queue);
      setCrmAccounts(Object.fromEntries(accounts.filter(Boolean).map((a) => [a!.id, a!])));
      setPersonas([...advisers.filter(Boolean), steward].filter(Boolean) as Persona[]);
      historiesRef.current = Object.fromEntries(adviserIds.map((id, i) => [id, histories[i]]));
      setWork(Object.fromEntries(rfpList.map((r) => [r.id, emptyWork()])));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRfpStatus = useCallback((rfpId: string, status: RfpStatus) => {
    setRfps((prev) => prev.map((r) => (r.id === rfpId ? { ...r, status } : r)));
  }, []);

  const patchWork = useCallback((rfpId: string, patch: Partial<RfpWorkState> | ((w: RfpWorkState) => Partial<RfpWorkState>)) => {
    setWork((prev) => {
      const current = prev[rfpId] ?? emptyWork();
      const resolved = typeof patch === "function" ? patch(current) : patch;
      return { ...prev, [rfpId]: { ...current, ...resolved } };
    });
  }, []);

  const generateForRfp = useCallback(
    async (rfpId: string) => {
      const rfp = rfps.find((r) => r.id === rfpId);
      if (!rfp) return;
      const state = work[rfpId];
      if (state && state.generation !== "idle") return;

      patchWork(rfpId, { generation: "running", generatedCount: 0 });
      setRfpStatus(rfpId, "in_review");

      const history = historiesRef.current[rfp.assignedAdviserId] ?? [];
      const questions = rfp.sections.flatMap((s) => s.questions);
      let count = 0;
      for (const q of questions) {
        patchWork(rfpId, { generatingQuestionId: q.id });
        // Simulated retrieval + assembly latency per question.
        await new Promise((r) => setTimeout(r, 120 + Math.random() * 220));
        const answer = generateAnswer(q, rfp.assignedAdviserId, history, qaPairs);
        count += 1;
        patchWork(rfpId, (w) => ({
          answers: { ...w.answers, [q.id]: answer },
          generatedCount: count,
        }));
        if (answer.tier === 4) {
          setCoverageGaps((prev) =>
            prev.some((g) => g.questionId === q.id)
              ? prev
              : [
                  {
                    id: uid("gap"),
                    questionText: q.text,
                    rfpId: rfp.id,
                    rfpName: `${rfp.shortName} — ${rfp.mandate}`,
                    questionId: q.id,
                    assetClass: rfp.assetClass,
                    raisedBy: "System — NEEDS CONTENT routing",
                    raisedDate: new Date().toISOString().slice(0, 10),
                    status: "open",
                  },
                  ...prev,
                ]
          );
        }
      }
      patchWork(rfpId, { generation: "done", generatingQuestionId: null });
    },
    [rfps, work, qaPairs, patchWork, setRfpStatus]
  );

  const updateAnswerText = useCallback(
    (rfpId: string, questionId: string, text: string) => {
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a) return {};
        return {
          answers: {
            ...w.answers,
            [questionId]: { ...a, text, edited: text !== (a.reverted ? a.goldenText : undefined) && true, reverted: false },
          },
        };
      });
    },
    [patchWork]
  );

  const revertAnswer = useCallback(
    (rfpId: string, questionId: string) => {
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a || !a.goldenText) return {};
        return {
          answers: {
            ...w.answers,
            [questionId]: {
              ...a,
              text: a.goldenText,
              reverted: true,
              edited: false,
              tier: 3,
              provenanceNote: `Reverted to approved golden source ${a.goldenId} — now the unmodified default answer.`,
            },
          },
        };
      });
    },
    [patchWork]
  );

  const acceptAnswer = useCallback(
    (rfpId: string, questionId: string, accepted: boolean) => {
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a) return {};
        return { answers: { ...w.answers, [questionId]: { ...a, accepted } } };
      });
    },
    [patchWork]
  );

  const selectQuestion = useCallback(
    (rfpId: string, questionId: string) => {
      patchWork(rfpId, { selectedQuestionId: questionId, panelTab: "answer", lastGenAiNote: null });
    },
    [patchWork]
  );

  const setPanelTab = useCallback(
    (rfpId: string, tab: PanelTab) => {
      patchWork(rfpId, { panelTab: tab });
    },
    [patchWork]
  );

  const runGenAi = useCallback(
    async (rfpId: string, questionId: string, action: GenAiAction) => {
      const rfp = rfps.find((r) => r.id === rfpId);
      const answer = work[rfpId]?.answers[questionId];
      if (!rfp || !answer || !answer.text.trim() || work[rfpId]?.genAiWorking) return;

      patchWork(rfpId, { genAiWorking: action, lastGenAiNote: null });
      const adviser = personas.find((p) => p.id === rfp.assignedAdviserId) ?? null;
      const golden = answer.goldenId ? qaPairs.find((p) => p.id === answer.goldenId) : undefined;
      const next = await mockTonalityAdapter.rewrite(action, answer.text, {
        adviser,
        toneVariant: golden?.tone_variants[rfp.assignedAdviserId] ?? null,
      });
      const note =
        action === "polish"
          ? "Polished for clarity — substance preserved"
          : action === "match_voice"
            ? `Rephrased to ${adviser ? `${adviser.name}'s` : "your"} voice — substance unchanged`
            : `Made ${action} — golden-source substance preserved`;
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a) return { genAiWorking: null };
        return {
          genAiWorking: null,
          lastGenAiNote: note,
          answers: { ...w.answers, [questionId]: { ...a, prevText: a.text, text: next, edited: a.edited || next !== a.text } },
        };
      });
    },
    [rfps, work, personas, qaPairs, patchWork]
  );

  const undoGenAi = useCallback(
    (rfpId: string, questionId: string) => {
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a || a.prevText === null) return {};
        return {
          lastGenAiNote: null,
          answers: { ...w.answers, [questionId]: { ...a, text: a.prevText, prevText: null } },
        };
      });
    },
    [patchWork]
  );

  const generateAiDraft = useCallback(
    async (rfpId: string, questionId: string) => {
      const rfp = rfps.find((r) => r.id === rfpId);
      const question = rfp?.sections.flatMap((s) => s.questions).find((q) => q.id === questionId);
      if (!rfp || !question || work[rfpId]?.genAiWorking) return;

      patchWork(rfpId, { genAiWorking: "draft", lastGenAiNote: null });
      const text = await mockTonalityAdapter.generateDraft(question);
      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a) return { genAiWorking: null };
        return {
          genAiWorking: null,
          answers: { ...w.answers, [questionId]: { ...a, text, aiDraft: "unvalidated" } },
        };
      });
    },
    [rfps, work, patchWork]
  );

  const routeQuestion = useCallback(
    (rfpId: string, questionId: string) => {
      const rfp = rfps.find((r) => r.id === rfpId);
      const question = rfp?.sections.flatMap((s) => s.questions).find((q) => q.id === questionId);
      if (!rfp || !question) return;
      const adviser = personas.find((p) => p.id === rfp.assignedAdviserId);

      patchWork(rfpId, (w) => {
        const a = w.answers[questionId];
        if (!a) return {};
        return {
          answers: {
            ...w.answers,
            [questionId]: { ...a, routed: true, aiDraft: a.aiDraft === "unvalidated" ? "pending_validation" : a.aiDraft },
          },
        };
      });
      // Routing feeds the Steward Hub coverage-gap queue (tier-4 questions may
      // already have an entry from generation-time NEEDS CONTENT routing).
      setCoverageGaps((prev) =>
        prev.some((g) => g.questionId === questionId)
          ? prev
          : [
              {
                id: uid("gap"),
                questionText: question.text,
                rfpId: rfp.id,
                rfpName: `${rfp.shortName} — ${rfp.mandate}`,
                questionId,
                assetClass: rfp.assetClass,
                raisedBy: `${adviser?.name ?? "Adviser"} — routed to ${question.specialist ?? "specialist"}`,
                raisedDate: new Date().toISOString().slice(0, 10),
                status: "open",
              },
              ...prev,
            ]
      );
    },
    [rfps, personas, patchWork]
  );

  const startIntake = useCallback(
    async (itemId: string) => {
      const item = salesforceQueue.find((q) => q.id === itemId);
      if (!item) return;
      setSalesforceQueue((prev) => prev.filter((q) => q.id !== itemId));
      const rfp: Rfp = {
        id: `rfp-${item.id}`,
        kind: item.kind,
        issuer: item.issuer,
        shortName: item.shortName,
        mandate: item.mandate,
        assetClass: item.assetClass,
        vehicle: item.vehicle,
        aum: item.aum,
        mandateSize: item.mandateSize,
        deadline: item.deadline,
        received: new Date().toISOString().slice(0, 10),
        consultant: item.consultant,
        contact: item.contact,
        channel: item.channel,
        crmAccountId: item.crmAccountId,
        assignedAdviserId: item.assignedAdviserId,
        status: "new",
        sections: [], // populated once the questionnaire parse completes
      };
      setRfps((prev) => [rfp, ...prev]);
      setWork((prev) => ({ ...prev, [rfp.id]: emptyWork() }));
      const account = await mockCrmAdapter.getAccount(item.crmAccountId);
      if (account) setCrmAccounts((prev) => ({ ...prev, [account.id]: account }));
    },
    [salesforceQueue]
  );

  const runCompliance = useCallback(
    async (rfpId: string) => {
      const rfp = rfps.find((r) => r.id === rfpId);
      if (!rfp) return;
      patchWork(rfpId, { scanState: "running" });
      setRfpStatus(rfpId, "compliance");
      const answers = Object.values(work[rfpId]?.answers ?? {});
      const findings = await mockComplianceAdapter.review(rfp, answers, qaPairs);
      patchWork(rfpId, { scanState: "done", findings });
      if (overallOutcome(findings) === "PASS") setRfpStatus(rfpId, "approved");
    },
    [rfps, work, qaPairs, patchWork, setRfpStatus]
  );

  const applyAutoFix = useCallback(
    (rfpId: string, findingId: string) => {
      setWork((prev) => {
        const w = prev[rfpId];
        if (!w) return prev;
        const finding = w.findings.find((f) => f.id === findingId);
        if (!finding || !finding.autoFix || !finding.questionId) return prev;
        const answer = w.answers[finding.questionId];
        if (!answer) return prev;
        const newText =
          finding.autoFix.kind === "append"
            ? answer.text + finding.autoFix.text
            : answer.text.replace(finding.autoFix.find ?? "", finding.autoFix.text);
        const findings = w.findings.map((f) => (f.id === findingId ? { ...f, resolved: true } : f));
        const next = {
          ...prev,
          [rfpId]: {
            ...w,
            answers: { ...w.answers, [finding.questionId]: { ...answer, text: newText, edited: true } },
            findings,
          },
        };
        return next;
      });
      // If that was the last blocker and no unacknowledged flags remain, promote.
      setWork((prev) => {
        const w = prev[rfpId];
        if (w && w.scanState === "done" && overallOutcome(w.findings) === "PASS") {
          setRfps((r) => r.map((x) => (x.id === rfpId ? { ...x, status: "approved" } : x)));
        }
        return prev;
      });
    },
    []
  );

  const acknowledgeFlag = useCallback((rfpId: string, findingId: string, reason: string) => {
    setWork((prev) => {
      const w = prev[rfpId];
      if (!w) return prev;
      const findings = w.findings.map((f) =>
        f.id === findingId ? { ...f, acknowledged: true, ackReason: reason } : f
      );
      return { ...prev, [rfpId]: { ...w, findings } };
    });
    setWork((prev) => {
      const w = prev[rfpId];
      if (w && w.scanState === "done" && overallOutcome(w.findings) === "PASS") {
        setRfps((r) => r.map((x) => (x.id === rfpId ? { ...x, status: "approved" } : x)));
      }
      return prev;
    });
  }, []);

  const markExported = useCallback((rfpId: string) => setRfpStatus(rfpId, "exported"), [setRfpStatus]);

  const submitToReview = useCallback(
    (item: Omit<ReviewItem, "id" | "status" | "submittedDate">) => {
      const full: ReviewItem = {
        ...item,
        id: uid("rev"),
        status: "pending_review",
        submittedDate: new Date().toISOString().slice(0, 10),
      };
      setReviewQueue((prev) => [full, ...prev]);
      return full;
    },
    []
  );

  const approveReviewItem = useCallback((itemId: string, approver: string) => {
    setReviewQueue((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const inYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
      setQaPairs((pairs) => {
        if (item.qaId) {
          return pairs.map((p) =>
            p.id === item.qaId
              ? {
                  ...p,
                  version: p.version + 1,
                  answer_text: item.proposedAnswer,
                  question_canonical: item.proposedQuestion,
                  data_points: item.proposedDataPoints.length ? item.proposedDataPoints : p.data_points,
                  approver,
                  effective_date: today,
                  review_by: inYear,
                  supersedes: `${p.id}@v${p.version}`,
                  version_history: [
                    { version: p.version + 1, date: today, author: item.submittedBy, note: `${item.originDetail} — approved by ${approver}.` },
                    ...p.version_history,
                  ],
                }
              : p
          );
        }
        const newPair: QaPair = {
          id: uid("qa"),
          version: 1,
          status: "approved",
          question_canonical: item.proposedQuestion,
          question_variants: [],
          answer_text: item.proposedAnswer,
          answer_summary: item.title,
          asset_class: item.assetClass,
          products: item.assetClass === "fixed_income" ? ["core_bond"] : item.assetClass === "global_equity" ? ["global_select_equity"] : ["firmwide"],
          vehicle_types: ["sma", "cit"],
          client_types: ["institutional"],
          regions: ["us"],
          compliance_tags: [],
          required_disclosures: [],
          data_points: item.proposedDataPoints,
          owner: item.submittedBy,
          approver,
          effective_date: today,
          review_by: inYear,
          supersedes: null,
          usage_stats: { retrievals_90d: 0, downstream_edit_rate: 0, win_linked_uses: 0, win_rate: null },
          version_history: [{ version: 1, date: today, author: item.submittedBy, note: `Created via ${item.origin} — approved by ${approver}.` }],
          tone_variants: {},
        };
        return [newPair, ...pairs];
      });
      // Resolve any coverage gaps this new content answers.
      if (item.origin === "coverage_gap") {
        setCoverageGaps((gaps) =>
          gaps.map((g) => (item.originDetail.includes(g.id) ? { ...g, status: "resolved" } : g))
        );
      }
      return prev.map((i) => (i.id === itemId ? { ...i, status: "approved" as const } : i));
    });
  }, []);

  const rejectReviewItem = useCallback((itemId: string) => {
    setReviewQueue((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: "rejected" as const } : i)));
  }, []);

  const actionEnrichmentCard = useCallback(
    (cardId: string, action: "accepted" | "dismissed", detail?: { editedAnswer?: string; dismissReason?: string; actor: string }) => {
      const card = enrichmentCards.find((c) => c.id === cardId);
      if (!card) return;
      if (action === "accepted") {
        const item: ReviewItem = {
          id: uid("rev"),
          qaId: card.qaId,
          title: card.title,
          proposedQuestion: card.proposedQuestion ?? "",
          proposedAnswer: detail?.editedAnswer ?? card.proposedAnswer ?? "",
          proposedDataPoints: card.proposedDataPoints ?? [],
          assetClass: card.qaId?.startsWith("gs-eq") ? "global_equity" : card.qaId?.startsWith("gs-ma") ? "multi_asset" : card.qaId?.startsWith("gs-fw") ? "firmwide" : "fixed_income",
          submittedBy: detail?.actor ?? "Data Steward",
          submittedDate: new Date().toISOString().slice(0, 10),
          origin: "enrichment",
          originDetail: `Smart Enrichment (${card.kind}) — ${card.provenance.sampleSize}`,
          status: "pending_review",
        };
        setReviewQueue((q) => [item, ...q]);
      }
      setEnrichmentCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, status: action, dismissReason: detail?.dismissReason ?? null } : c
        )
      );
    },
    [enrichmentCards]
  );

  const setGapStatus = useCallback((gapId: string, status: CoverageGap["status"]) => {
    setCoverageGaps((prev) => prev.map((g) => (g.id === gapId ? { ...g, status } : g)));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      loading,
      personas,
      activePersonaId,
      setActivePersonaId,
      rfps,
      crmAccounts,
      qaPairs,
      work,
      salesforceQueue,
      coverageGaps,
      reviewQueue,
      enrichmentCards,
      startIntake,
      generateForRfp,
      updateAnswerText,
      revertAnswer,
      acceptAnswer,
      selectQuestion,
      setPanelTab,
      runGenAi,
      undoGenAi,
      generateAiDraft,
      routeQuestion,
      runCompliance,
      applyAutoFix,
      acknowledgeFlag,
      markExported,
      submitToReview,
      approveReviewItem,
      rejectReviewItem,
      actionEnrichmentCard,
      setGapStatus,
    }),
    [loading, personas, activePersonaId, rfps, crmAccounts, qaPairs, work, salesforceQueue, coverageGaps, reviewQueue, enrichmentCards, startIntake, generateForRfp, updateAnswerText, revertAnswer, acceptAnswer, selectQuestion, setPanelTab, runGenAi, undoGenAi, generateAiDraft, routeQuestion, runCompliance, applyAutoFix, acknowledgeFlag, markExported, submitToReview, approveReviewItem, rejectReviewItem, actionEnrichmentCard, setGapStatus]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
