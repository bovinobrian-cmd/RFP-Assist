import type { CrmAdapter } from "./index";
import type { AdviserHistoryEntry, CrmAccount, Persona } from "../types";
import crmData from "@/data/crm.json";
import personaData from "@/data/personas.json";
import historyData from "@/data/adviser-history.json";
import { simulateLatency } from "../util";

const accounts = crmData as CrmAccount[];
const personas = personaData as Persona[];
const history = historyData as AdviserHistoryEntry[];

export const mockCrmAdapter: CrmAdapter = {
  async getAccount(accountId) {
    await simulateLatency(120);
    return accounts.find((a) => a.id === accountId) ?? null;
  },
  async getAdviser(adviserId) {
    await simulateLatency(60);
    return personas.find((p) => p.id === adviserId) ?? null;
  },
  async getAdviserHistory(adviserId) {
    await simulateLatency(100);
    return history.filter((h) => h.adviserId === adviserId);
  },
};
