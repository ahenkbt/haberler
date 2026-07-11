import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { handleTransferIn, upsertAiCampaignConfig } from "../pbx/hybrid.js";
import { chatWithProvider } from "./provider-router.js";
import {
  getAssistant,
  getCampaign,
  insertCallLog,
  listCampaignContacts,
  setCampaignStatus,
} from "./service.js";

const runningCampaigns = new Set<string>();

export function isCampaignRunning(id: string): boolean {
  return runningCampaigns.has(id);
}

export async function startCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  if (runningCampaigns.has(id)) {
    return { ok: false, error: "Kampanya zaten çalışıyor." };
  }
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false, error: "Kampanya bulunamadı." };
  if (!campaign.assistantId) return { ok: false, error: "Kampanyaya asistan atanmalıdır." };

  await setCampaignStatus(id, "running");
  runningCampaigns.add(id);

  if (campaign.routingMode === "hybrid") {
    await upsertAiCampaignConfig({
      aiCampaignId: id,
      aiCampaignName: campaign.name,
      routingMode: "hybrid",
      enabled: true,
    });
  }

  void processCampaignQueue(id).catch(() => {
    runningCampaigns.delete(id);
  });

  return { ok: true };
}

export async function stopCampaign(id: string): Promise<void> {
  runningCampaigns.delete(id);
  await setCampaignStatus(id, "paused");
}

async function processCampaignQueue(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign?.assistantId) {
    runningCampaigns.delete(campaignId);
    return;
  }
  const assistant = await getAssistant(campaign.assistantId);
  if (!assistant) {
    runningCampaigns.delete(campaignId);
    await setCampaignStatus(campaignId, "paused");
    return;
  }

  const contacts = await listCampaignContacts(campaignId);
  const pending = contacts.filter((c) => c.status === "pending");

  for (const contact of pending) {
    if (!runningCampaigns.has(campaignId)) break;

    await db.execute(sql`
      UPDATE ai_call_contacts SET status = 'calling', attempts = attempts + 1,
        last_called_at = NOW(), updated_at = NOW()
      WHERE id = ${contact.id}::uuid
    `);

    const opening = `Merhaba ${contact.name || "değerli müşterimiz"}, ${campaign.name} kampanyası kapsamında arıyoruz.`;
    const aiReply = await chatWithProvider(assistant, opening);
    const replyText = aiReply.content ?? "[Yanıt alınamadı]";

    const shouldTransfer =
      campaign.routingMode === "hybrid" &&
      (replyText.toLowerCase().includes("aktar") ||
        replyText.toLowerCase().includes("temsilci") ||
        Math.random() < 0.15);

    let transferred = false;
    if (shouldTransfer) {
      const transfer = await handleTransferIn({
        callId: randomUUID(),
        phone: contact.phone,
        campaignId: campaignId,
        campaignName: campaign.name,
        summary: `AI görüşme özeti: ${replyText.slice(0, 300)}`,
        intent: "human_handoff",
        transferReason: "Müşteri temsilci talep etti veya hibrit kural tetiklendi.",
      });
      transferred = transfer.ok;
    }

    const transcript = [
      `[AI] ${opening}`,
      `[Asistan/${assistant.name}] ${replyText}`,
      transferred ? "[Sistem] Görüşme PBX kuyruğuna aktarıldı." : "[Sistem] Görüşme tamamlandı.",
    ].join("\n");

    await insertCallLog({
      campaignId,
      contactId: contact.id,
      assistantId: assistant.id,
      phone: contact.phone,
      provider: assistant.provider,
      model: aiReply.model ?? assistant.model,
      transcript,
      aiSummary: replyText.slice(0, 500),
      transferred,
      durationSec: 30 + Math.floor(Math.random() * 90),
      status: transferred ? "transferred" : "completed",
    });

    await db.execute(sql`
      UPDATE ai_call_contacts SET status = ${transferred ? "transferred" : "completed"}, updated_at = NOW()
      WHERE id = ${contact.id}::uuid
    `);

    await new Promise((r) => setTimeout(r, 500));
  }

  runningCampaigns.delete(campaignId);
  const remaining = (await listCampaignContacts(campaignId)).filter((c) => c.status === "pending");
  if (remaining.length === 0) {
    await setCampaignStatus(campaignId, "completed");
  } else if (!runningCampaigns.has(campaignId)) {
    await setCampaignStatus(campaignId, "paused");
  }
}
