// ---------------------------------------------------------------------------
// Data Steward editor validation — PRD §9.2 gates, enforced on submit.
// Hard blocks prevent submission; soft warnings are surfaced but submittable.
// ---------------------------------------------------------------------------

import type { QaPair } from "./types";
import { wordCount } from "./util";

export interface ValidationIssue {
  gate: string;
  level: "block" | "warning";
  message: string;
}

export interface EditorDraft {
  question_canonical: string;
  question_variants: string[];
  answer_text: string;
  answer_summary: string;
  asset_class: string;
  products: string[];
  client_types: string[];
  compliance_tags: string[];
  data_points: { claim: string; value: string; as_of: string; refresh_cadence: string; source: string }[];
  owner: string;
  effective_date: string;
  review_by: string;
}

const FORWARD_LOOKING = ["will deliver", "will achieve", "will outperform", "going to", "we expect to return"];
const PERFORMANCE_TERMS = ["outperform", "excess return", "annualized", "top quartile", "basis points", "ranked"];
const ESG_TERMS = ["esg", "sustainab", "climate", "carbon"];
const SUPERLATIVES = ["best-in-class", "best in class", "world-class", "unparalleled", "unmatched", "market-leading", "industry-leading", "second to none"];
const FIRST_PERSON_FLOURISH = ["we are proud", "we are delighted", "we are thrilled", "we passionately"];
const UNRESOLVED_REFERENCES = ["as noted above", "as mentioned above", "see section", "see above", "aforementioned", "as discussed earlier"];
const KNOWN_ACRONYMS = ["ESG", "AUM", "RFP", "GIPS", "TCA", "NDA", "ISDA", "CSA", "NIST", "SMA", "CIT", "US", "EMEA", "NYSE", "TCFD", "HR", "PDF", "DOCX"];
const CLIENT_ENTITY_HINTS = ["scpers", "northfield", "harbor county", "great lakes municipal", "carroll family", "lakeside college"];

export function validateDraft(draft: EditorDraft, existingPairs: QaPair[], editingId: string | null): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const answer = draft.answer_text.trim();
  const lower = answer.toLowerCase();

  // Gate 1 — required-field completeness (hard).
  const required: [string, boolean][] = [
    ["Canonical question", !!draft.question_canonical.trim()],
    ["Answer text", !!answer],
    ["Asset class", !!draft.asset_class],
    ["At least one product", draft.products.length > 0],
    ["Client type(s)", draft.client_types.length > 0],
    ["Owner", !!draft.owner.trim()],
    ["Effective date", !!draft.effective_date],
    ["Review-by date (freshness SLA)", !!draft.review_by],
  ];
  for (const [label, ok] of required) {
    if (!ok) issues.push({ gate: "Required fields", level: "block", message: `${label} is mandatory.` });
  }

  // Gate 2 — compliance tags mandatory for performance / forward-looking / ESG content (hard).
  const needsTags =
    PERFORMANCE_TERMS.some((t) => lower.includes(t)) ||
    FORWARD_LOOKING.some((t) => lower.includes(t)) ||
    ESG_TERMS.some((t) => lower.includes(t));
  if (needsTags && draft.compliance_tags.length === 0) {
    issues.push({
      gate: "Compliance tags",
      level: "block",
      message: "The answer contains performance, forward-looking, or ESG language — at least one compliance tag is required (auto-detected; confirm and tag).",
    });
  }

  // Gate 3 — atomicity: one question, one answer (hard).
  const questionMarks = (draft.question_canonical.match(/\?/g) ?? []).length;
  if (questionMarks > 1 || /\b(and also|as well as describe|additionally,? (describe|explain|list))\b/i.test(draft.question_canonical)) {
    issues.push({
      gate: "Atomicity",
      level: "block",
      message: "This looks like a compound question. Split it into separate Q&A pairs — one question, one answer.",
    });
  }

  // Gate 4 — self-containment: no unresolved references (hard).
  for (const ref of UNRESOLVED_REFERENCES) {
    if (lower.includes(ref)) {
      issues.push({
        gate: "Self-containment",
        level: "block",
        message: `Unresolved reference "${ref}" — golden-source answers must stand alone.`,
      });
      break;
    }
  }

  // Gate 5 — canonical + variants encouraged (soft).
  if (draft.question_variants.filter((v) => v.trim()).length === 0) {
    issues.push({
      gate: "Question variants",
      level: "warning",
      message: "No phrasing variants provided. At least one variant improves semantic-retrieval recall.",
    });
  }

  // Gate 6 — data-point tagging: numbers in the answer need structured data_points (hard).
  const numbers = answer.match(/\$?\d[\d,.]*(?:\s?(?:trillion|billion|million|%|bps|basis points|years?))?/g) ?? [];
  const meaningful = numbers.filter((numToken) => !/^(19|20)\d{2}$/.test(numToken.trim()));
  const untagged = meaningful.filter(
    (numToken) => !draft.data_points.some((dp) => dp.value.replace(/\s/g, "").includes(numToken.replace(/\s|\+/g, "")) || numToken.replace(/\s/g, "").includes(dp.value.replace(/\s|\+|<|>/g, "")))
  );
  if (untagged.length > 0) {
    issues.push({
      gate: "Data-point tagging",
      level: "block",
      message: `Figures without a structured data_point: ${[...new Set(untagged)].slice(0, 4).join(", ")}. Every number needs an as-of date and refresh cadence.`,
    });
  }
  for (const dp of draft.data_points) {
    if (dp.claim.trim() && !dp.as_of) {
      issues.push({ gate: "Data-point tagging", level: "block", message: `Data point "${dp.claim}" is missing its as-of date.` });
    }
  }

  // Gate 7 — tone neutrality: style lint (soft).
  const superlative = SUPERLATIVES.find((s) => lower.includes(s));
  if (superlative) {
    issues.push({ gate: "Tone neutrality", level: "warning", message: `Superlative "${superlative}" — golden source is house-neutral; superlatives belong nowhere near it.` });
  }
  const flourish = FIRST_PERSON_FLOURISH.find((s) => lower.includes(s));
  if (flourish) {
    issues.push({ gate: "Tone neutrality", level: "warning", message: `First-person flourish "${flourish}" — tonality is applied downstream per adviser, not in the library.` });
  }

  // Gate 8 — no client-specific content (hard).
  const entity = CLIENT_ENTITY_HINTS.find((e) => lower.includes(e));
  if (entity) {
    issues.push({
      gate: "Client specificity",
      level: "block",
      message: `Client entity reference detected ("${entity}"). Client-specific content lives in adviser history, never in golden source.`,
    });
  }

  // Gate 9 — acronym hygiene (soft).
  const acronyms = [...new Set(answer.match(/\b[A-Z]{2,6}\b/g) ?? [])];
  const undefinedAcronyms = acronyms.filter((a) => !KNOWN_ACRONYMS.includes(a) && !answer.includes(`(${a})`));
  if (undefinedAcronyms.length > 0) {
    issues.push({
      gate: "Acronym hygiene",
      level: "warning",
      message: `Acronym(s) not in the glossary and not defined on first use: ${undefinedAcronyms.slice(0, 3).join(", ")}.`,
    });
  }

  // Gate 10 — duplicate detection (hard; writer must merge/differentiate/justify).
  const similar = existingPairs.find(
    (p) => p.id !== editingId && p.status === "approved" && similarity(draft.question_canonical, p.question_canonical) >= 0.92
  );
  if (similar) {
    issues.push({
      gate: "Duplicate detection",
      level: "block",
      message: `Near-duplicate of approved pair ${similar.id} ("${similar.question_canonical.slice(0, 60)}…"). Merge, differentiate, or justify before submitting.`,
    });
  }

  // Gate 11 — length bounds (hard for answer, per PRD; summary ≤ 30 words).
  const words = wordCount(answer);
  if (answer && (words < 40 || words > 600)) {
    issues.push({ gate: "Length bounds", level: "block", message: `Answer is ${words} words; must be between 40 and 600.` });
  }
  if (draft.answer_summary && wordCount(draft.answer_summary) > 30) {
    issues.push({ gate: "Length bounds", level: "block", message: "Summary exceeds 30 words." });
  }
  if (!draft.answer_summary.trim()) {
    issues.push({ gate: "Summary", level: "warning", message: "No retrieval summary provided — recommended for ranking quality." });
  }

  return issues;
}

/** Token-overlap similarity stand-in for the production semantic check. */
export function similarity(a: string, b: string): number {
  const tok = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2));
  const ta = tok(a);
  const tb = tok(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
