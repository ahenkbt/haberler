import { Router, type IRouter } from "express";
import { db, paymentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

async function getOrCreatePaymentSettings() {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(paymentSettingsTable).values({}).returning();
  return row;
}

router.get("/shop/payment-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const row = await getOrCreatePaymentSettings();
  const safe = {
    ...row,
    stripeSecretKey: row.stripeSecretKey ? "***" : null,
    stripeWebhookSecret: row.stripeWebhookSecret ? "***" : null,
  };
  res.json(safe);
});

router.put("/shop/payment-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const current = await getOrCreatePaymentSettings();
  const {
    stripeEnabled,
    stripePublishableKey,
    stripeSecretKey,
    stripeWebhookSecret,
    bankTransferEnabled,
    bankName,
    bankIban,
    bankAccountName,
    bankBranch,
    currency,
    taxRate,
    orderEmailFrom,
  } = req.body;
  const updateData: Record<string, unknown> = {
    stripeEnabled,
    stripePublishableKey,
    bankTransferEnabled,
    bankName,
    bankIban,
    bankAccountName,
    bankBranch,
    currency,
    taxRate: taxRate !== undefined ? String(taxRate) : undefined,
    orderEmailFrom,
    updatedAt: new Date(),
  };
  if (stripeSecretKey && stripeSecretKey !== "***") updateData.stripeSecretKey = stripeSecretKey;
  if (stripeWebhookSecret && stripeWebhookSecret !== "***") updateData.stripeWebhookSecret = stripeWebhookSecret;
  const [row] = await db
    .update(paymentSettingsTable)
    .set(updateData)
    .where(eq(paymentSettingsTable.id, current.id))
    .returning();
  res.json({
    ...row,
    stripeSecretKey: row.stripeSecretKey ? "***" : null,
    stripeWebhookSecret: row.stripeWebhookSecret ? "***" : null,
  });
});

export default router;
