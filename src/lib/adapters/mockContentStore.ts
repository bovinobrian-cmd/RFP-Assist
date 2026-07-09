import type { ContentStoreAdapter } from "./index";
import type { QaPair } from "../types";
import goldenData from "@/data/golden-source.json";
import { simulateLatency } from "../util";

const pairs = goldenData as unknown as QaPair[];

export const mockContentStoreAdapter: ContentStoreAdapter = {
  async listQaPairs() {
    await simulateLatency(150);
    return pairs;
  },
  async getQaPair(id) {
    await simulateLatency(60);
    return pairs.find((p) => p.id === id) ?? null;
  },
};
