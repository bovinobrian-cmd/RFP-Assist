import type { RfpSourceAdapter } from "./index";
import type { Rfp } from "../types";
import rfpData from "@/data/rfps.json";
import { simulateLatency } from "../util";

const rfps = rfpData as Rfp[];

export const mockRfpSourceAdapter: RfpSourceAdapter = {
  async listRfps() {
    await simulateLatency(180);
    return rfps;
  },
  async getRfp(id) {
    await simulateLatency(80);
    return rfps.find((r) => r.id === id) ?? null;
  },
};
