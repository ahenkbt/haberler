/**
 * Auto-dial worker: pending pbx_campaign_contacts → Verimor originate (or demo simulate).
 * Agents on /pbx/panel with active campaign + status available receive outbound calls.
 */

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  insertCampaignCallLog,
  markContactDialing,
  markContactStatus,
  pickPendingContact,
  releaseStaleDialingContacts,
} from "./campaign-contacts.js";
import { getVerimorConfig } from "./verimor-bridge.js";
import { originateVerimorCall } from "./verimor-client.js";
import { publishPbxRealtime, listCampaigns, listExtensions, loadPbxSettings, setAgentStatus } from "./service.js";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

let workerStarted = false;
let tickRunning = false;

async function pickAvailableAgent(campaignId: string) {
  return rows<{ id: string; extension: string | null; extension_id: string | null }>(
    await db.execute(sql`
      SELECT a.id, e.extension, a.extension_id
      FROM pbx_agents a
      LEFT JOIN pbx_extensions e ON e.id = a.extension_id
      WHERE a.active_campaign_id = ${campaignId}::uuid
        AND a.status = 'available'
        AND a.enabled = true
      ORDER BY a.updated_at ASC
      LIMIT 1
    `),
  )[0] ?? null;
}

async function dialOneCampaign(): Promise<void> {
  const campaigns = (await listCampaigns()).filter(
    (c) => c.enabled && c.campaignType === "auto_dial" && c.status === "running",
  );
  if (campaigns.length === 0) return;

  const settings = await loadPbxSettings();
  const verimorConfig = await getVerimorConfig();
  const extensions = await listExtensions(true);

  for (const campaign of campaigns) {
    const agent = await pickAvailableAgent(campaign.id);
    if (!agent) continue;

    const contact = await pickPendingContact(campaign.id, campaign.maxAttempts);
    if (!contact) continue;

    await markContactDialing(contact.id);

    const extRow = agent.extension_id
      ? extensions.find((e) => e.id === agent.extension_id)
      : extensions.find((e) => e.extension === agent.extension);
    const extension = extRow?.extension ?? agent.extension;
    if (!extension) {
      await markContactStatus(contact.id, "failed");
      continue;
    }

    const callerId = extRow?.externalNumber ?? "";

    if (verimorConfig?.apiKey) {
      const result = await originateVerimorCall(verimorConfig, extension, contact.phone, callerId || undefined);
      if (!result.ok) {
        const nextStatus = contact.attempts + 1 >= campaign.maxAttempts ? "failed" : "pending";
        await markContactStatus(contact.id, nextStatus);
        continue;
      }
      await insertCampaignCallLog({
        campaignId: campaign.id,
        agentId: agent.id,
        fromNumber: callerId || extension,
        toNumber: contact.phone,
        status: "dialing",
        callUuid: result.callUuid,
        metadata: { contactId: contact.id, contactName: contact.name },
      });
      await setAgentStatus(agent.id, "on_call");
      await publishPbxRealtime();
      return;
    }

    if (settings.demoMode) {
      await insertCampaignCallLog({
        campaignId: campaign.id,
        agentId: agent.id,
        fromNumber: extension,
        toNumber: contact.phone,
        status: "ringing",
        metadata: { contactId: contact.id, contactName: contact.name, demoMode: true },
      });
      await setAgentStatus(agent.id, "on_call");
      await publishPbxRealtime();
      return;
    }

    await markContactStatus(contact.id, "failed");
  }
}

async function tick(): Promise<void> {
  if (tickRunning) return;
  tickRunning = true;
  try {
    await releaseStaleDialingContacts();
    await dialOneCampaign();
  } catch (err) {
    console.warn("[pbx-dial-worker]", err instanceof Error ? err.message : err);
  } finally {
    tickRunning = false;
  }
}

/** Start interval worker (once per process). */
export function startCampaignDialWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  const intervalMs = Number(process.env.PBX_DIAL_WORKER_MS ?? 8000);
  setInterval(() => void tick(), intervalMs);
  void tick();
}
