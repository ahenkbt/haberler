import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db } from "../db/client.js";
import { newsSites } from "../db/schema.js";
import { verifyOperatorRequest } from "../lib/operatorAuth.js";

const r: IRouter = Router();
r.use(verifyOperatorRequest());

r.get("/sites", async (_req, res) => {
  const rows = await db.select().from(newsSites);
  res.json({ items: rows });
});

r.post("/sites", async (req, res) => {
  const body = req.body as { slug?: string; displayName?: string; primaryDomain?: string | null; settings?: Record<string, unknown> };
  const slug = String(body.slug ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  const displayName = String(body.displayName ?? "").trim();
  if (!slug || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    res.status(400).json({ error: "invalid_slug" });
    return;
  }
  if (!displayName) {
    res.status(400).json({ error: "invalid_display_name" });
    return;
  }
  try {
    const [row] = await db
      .insert(newsSites)
      .values({
        slug,
        displayName,
        primaryDomain: body.primaryDomain?.trim() || null,
        settings: body.settings ?? {},
      })
      .returning();
    res.status(201).json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique/i.test(msg)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    res.status(500).json({ error: "insert_failed", detail: msg });
  }
});

r.patch("/sites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const body = req.body as { displayName?: string; primaryDomain?: string | null; settings?: Record<string, unknown> };
  const patch: Partial<typeof newsSites.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof body.displayName === "string" && body.displayName.trim()) patch.displayName = body.displayName.trim();
  if (body.primaryDomain !== undefined) patch.primaryDomain = body.primaryDomain?.trim() || null;
  if (body.settings && typeof body.settings === "object") patch.settings = body.settings;
  const [row] = await db.update(newsSites).set(patch).where(eq(newsSites.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

export default r;
