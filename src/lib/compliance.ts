// ---------------------------------------------------------------------------
// Compliance supervisory agent — PRD §10.
// Rule-based scan of the full assembled draft (post-human-edit) against the
// structured rulebook config (src/data/compliance-rules.json).
// ---------------------------------------------------------------------------

import type {
  ComplianceFinding,
  ComplianceOutcome,
  ComplianceRule,
  DraftAnswer,
  QaPair,
  Rfp,
} from "./types";
import { monthsBetween, uid } from "./util";

export interface Rulebook {
  rulebookVersion: string;
  standardDisclosure: string;
  performanceDisclosure: string;
  rules: ComplianceRule[];
}

export function runComplianceScan(
  rulebook: Rulebook,
  rfp: Rfp,
  answers: DraftAnswer[],
  qaPairs: QaPair[]
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const questions = rfp.sections.flatMap((s) => s.questions);

  for (const answer of answers) {
    if (answer.tier === 4 || !answer.text.trim()) continue; // gaps handled by steward routing
    const lower = answer.text.toLowerCase();

    for (const rule of rulebook.rules) {
      if (rule.kind === "phrase" && rule.patterns) {
        for (const pattern of rule.patterns) {
          const idx = lower.indexOf(pattern.toLowerCase());
          if (idx === -1) continue;
          const matched = answer.text.slice(idx, idx + pattern.length);
          findings.push(
            makeFinding(rule, answer.questionId, matched, {
              kind: "replace",
              find: matched,
              text: suggestedReplacement(matched),
            })
          );
          break; // one finding per rule per answer keeps the review readable
        }
      }

      if (rule.kind === "performance_disclosure" && rule.patterns) {
        const hit = rule.patterns.find((p) => lower.includes(p.toLowerCase()));
        const hasDisclosure = lower.includes(
          (rule.requiredDisclosure ?? rulebook.performanceDisclosure).toLowerCase()
        );
        if (hit && !hasDisclosure) {
          findings.push(
            makeFinding(rule, answer.questionId, hit, {
              kind: "append",
              text: ` ${rule.requiredDisclosure ?? rulebook.performanceDisclosure}`,
            })
          );
        }
      }

      if (rule.kind === "stale_data" && answer.goldenId) {
        const pair = qaPairs.find((p) => p.id === answer.goldenId);
        if (!pair) continue;
        const stale = pair.data_points.filter(
          (dp) => monthsBetween(dp.as_of) > (rule.maxAgeMonths ?? 12)
        );
        // Only flag if the stale figure actually appears in the draft text.
        const surfaced = stale.find((dp) => answer.text.includes(dp.value));
        if (surfaced) {
          findings.push(
            makeFinding(
              rule,
              answer.questionId,
              `${surfaced.claim}: ${surfaced.value} (as of ${surfaced.as_of})`,
              null
            )
          );
        }
      }
    }

    // Semantic drift check (PRD §10): a golden-sourced answer whose numeric
    // claims no longer match the source pair has drifted beyond tonality.
    if (answer.goldenText && answer.edited) {
      const sourceNumbers = extractNumbers(answer.goldenText);
      const draftNumbers = extractNumbers(answer.text);
      const invented = draftNumbers.filter((numToken) => !sourceNumbers.includes(numToken));
      if (invented.length > 0) {
        findings.push({
          id: uid("finding"),
          ruleId: "rule-semantic-drift",
          ruleName: "Deviation from golden source beyond tonality",
          severity: "Flag",
          questionId: answer.questionId,
          matchedText: invented.join(", "),
          rationale:
            "The edited answer introduces figures not present in the approved golden-source pair. Substance must originate from governed content; verify these figures or revert.",
          suggestion:
            "Revert to the golden-source text, or ask the data steward to update the pair with the new figures.",
          autoFix: null,
          resolved: false,
          acknowledged: false,
          ackReason: null,
        });
      }
    }
  }

  // Document-level: standard disclosures (auto-appended by the export template).
  const docRule = rulebook.rules.find((r) => r.kind === "document_disclosure");
  if (docRule) {
    findings.push(makeFinding(docRule, null, null, null));
  }

  // Deterministic order: Blocks first, then Flags, then Info, in question order.
  const severityRank = { Block: 0, Flag: 1, Info: 2 } as const;
  const questionOrder = new Map(questions.map((q, i) => [q.id, i]));
  findings.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      (questionOrder.get(a.questionId ?? "") ?? 999) -
        (questionOrder.get(b.questionId ?? "") ?? 999)
  );
  return findings;
}

export function overallOutcome(findings: ComplianceFinding[]): ComplianceOutcome {
  const active = findings.filter((f) => !f.resolved);
  if (active.some((f) => f.severity === "Block")) return "BLOCK";
  if (active.some((f) => f.severity === "Flag" && !f.acknowledged)) return "FLAG";
  return "PASS";
}

function makeFinding(
  rule: ComplianceRule,
  questionId: string | null,
  matchedText: string | null,
  autoFix: ComplianceFinding["autoFix"]
): ComplianceFinding {
  return {
    id: uid("finding"),
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    questionId,
    matchedText,
    rationale: rule.rationale,
    suggestion: rule.suggestion,
    autoFix,
    resolved: rule.severity === "Info",
    acknowledged: false,
    ackReason: null,
  };
}

/** Compliance-safe rewrites for common promissory phrases. */
function suggestedReplacement(matched: string): string {
  const lower = matched.toLowerCase();
  const map: Record<string, string> = {
    "we guarantee": "we propose",
    guarantee: "propose",
    guaranteed: "proposed",
    "we ensure": "we seek to ensure",
    "will deliver": "seeks to deliver",
    "will achieve": "seeks to achieve",
    "will outperform": "seeks to outperform",
    assure: "expect",
  };
  const replacement = map[lower] ?? "seek to";
  // Preserve leading capitalization of the original.
  if (matched[0] === matched[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function extractNumbers(text: string): string[] {
  return text.match(/\$?\d[\d,.]*(?:\s?(?:trillion|billion|million|%|bps|basis points))?/g) ?? [];
}
