/** Ahenk PBX — yapay zeka destekli çağrı merkezi CRM kullanım ücretleri. */

export const PBX_BASE_PER_AGENT_TL = 700;
export const PBX_TIER_STEP_AGENTS = 10;
export const PBX_TIER_DISCOUNT_TL = 50;
export const PBX_MIN_AGENTS = 10;
export const PBX_MAX_AGENTS = 50;

export type PbxPriceTier = {
  agents: number;
  perAgentTl: number;
  monthlyTl: number;
};

/** Her +10 temsilcide temsilci başı −50 TL. 10→700, 20→650, 30→600, 40→550, 50→500. */
export function pbxPerAgentTl(agents: number): number {
  if (!Number.isInteger(agents) || agents < PBX_MIN_AGENTS || agents > PBX_MAX_AGENTS) {
    throw new RangeError(`PBX temsilci sayısı ${PBX_MIN_AGENTS}–${PBX_MAX_AGENTS} arası tam sayı olmalı`);
  }
  if (agents % PBX_TIER_STEP_AGENTS !== 0) {
    throw new RangeError(`PBX paketleri ${PBX_TIER_STEP_AGENTS} temsilci adımlıdır`);
  }
  const stepsAboveBase = agents / PBX_TIER_STEP_AGENTS - 1;
  return PBX_BASE_PER_AGENT_TL - PBX_TIER_DISCOUNT_TL * stepsAboveBase;
}

export function pbxMonthlyTl(agents: number): number {
  return pbxPerAgentTl(agents) * agents;
}

export function pbxPriceTiers(): PbxPriceTier[] {
  const tiers: PbxPriceTier[] = [];
  for (let agents = PBX_MIN_AGENTS; agents <= PBX_MAX_AGENTS; agents += PBX_TIER_STEP_AGENTS) {
    const perAgentTl = pbxPerAgentTl(agents);
    tiers.push({ agents, perAgentTl, monthlyTl: perAgentTl * agents });
  }
  return tiers;
}

export function formatTry(amount: number): string {
  return `${amount.toLocaleString("tr-TR")}\u00a0TL`;
}
