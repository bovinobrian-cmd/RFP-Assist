import type { ComplianceAdapter } from "./index";
import type { ComplianceRule } from "../types";
import rulebookData from "@/data/compliance-rules.json";
import { runComplianceScan, type Rulebook } from "../compliance";
import { simulateLatency } from "../util";

const rulebook: Rulebook = {
  rulebookVersion: rulebookData.rulebookVersion,
  standardDisclosure: rulebookData.standardDisclosure,
  performanceDisclosure: rulebookData.performanceDisclosure,
  rules: rulebookData.rules as ComplianceRule[],
};

export const mockComplianceAdapter: ComplianceAdapter = {
  async getRulebook() {
    await simulateLatency(80);
    return rulebook;
  },
  async review(rfp, answers, qaPairs) {
    // Simulated supervisory-agent scan time — long enough to feel real.
    await simulateLatency(1400);
    return runComplianceScan(rulebook, rfp, answers, qaPairs);
  },
};
