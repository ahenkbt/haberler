import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, homepageModulesTable } from "@workspace/db";
import { UpdateModulesBody } from "@workspace/api-zod";
import { serializeModule } from "../lib/serializers";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

router.get("/modules", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(homepageModulesTable)
    .orderBy(homepageModulesTable.position);
  res.json(rows.map(serializeModule));
});

router.put("/modules", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  const parsed = UpdateModulesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (const m of parsed.data.modules) {
    await db
      .update(homepageModulesTable)
      .set({ enabled: m.enabled, position: m.position })
      .where(eq(homepageModulesTable.id, m.id));
  }
  const rows = await db
    .select()
    .from(homepageModulesTable)
    .orderBy(homepageModulesTable.position);
  res.json(rows.map(serializeModule));
});

export default router;
