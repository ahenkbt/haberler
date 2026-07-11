import { Router } from "express";
import { db } from "@workspace/db";
import {
  photoGalleriesTable,
  photoGalleryItemsTable,
  videoGalleriesTable,
  videoGalleryItemsTable,
  resmiIlanlarTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ── Photo Galleries ──────────────────────────────────────────
router.get("/foto-galeri", async (_req, res) => {
  const galleries = await db.select().from(photoGalleriesTable).orderBy(photoGalleriesTable.createdAt);
  res.json(galleries);
});

router.post("/foto-galeri", async (req, res) => {
  const { title, description, coverImage, status } = req.body;
  const [row] = await db
    .insert(photoGalleriesTable)
    .values({ title, description: description || "", coverImage: coverImage || "", status: status || "active" })
    .returning();
  res.json(row);
});

router.put("/foto-galeri/:id", async (req, res) => {
  const { title, description, coverImage, status } = req.body;
  const [row] = await db
    .update(photoGalleriesTable)
    .set({ title, description, coverImage, status })
    .where(eq(photoGalleriesTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/foto-galeri/:id", async (req, res) => {
  await db.delete(photoGalleryItemsTable).where(eq(photoGalleryItemsTable.galleryId, Number(req.params.id)));
  await db.delete(photoGalleriesTable).where(eq(photoGalleriesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get("/foto-galeri/:id/items", async (req, res) => {
  const items = await db
    .select()
    .from(photoGalleryItemsTable)
    .where(eq(photoGalleryItemsTable.galleryId, Number(req.params.id)))
    .orderBy(photoGalleryItemsTable.sortOrder);
  res.json(items);
});

router.post("/foto-galeri/:id/items", async (req, res) => {
  const { imageUrl, caption, sortOrder } = req.body;
  const [row] = await db
    .insert(photoGalleryItemsTable)
    .values({
      galleryId: Number(req.params.id),
      imageUrl,
      caption: caption || "",
      sortOrder: sortOrder || 0,
    })
    .returning();
  res.json(row);
});

router.delete("/foto-galeri/items/:itemId", async (req, res) => {
  await db.delete(photoGalleryItemsTable).where(eq(photoGalleryItemsTable.id, Number(req.params.itemId)));
  res.json({ ok: true });
});

// ── Video Galleries ──────────────────────────────────────────
router.get("/video-galeri", async (_req, res) => {
  const galleries = await db.select().from(videoGalleriesTable).orderBy(videoGalleriesTable.createdAt);
  res.json(galleries);
});

router.post("/video-galeri", async (req, res) => {
  const { title, description, coverImage, status } = req.body;
  const [row] = await db
    .insert(videoGalleriesTable)
    .values({ title, description: description || "", coverImage: coverImage || "", status: status || "active" })
    .returning();
  res.json(row);
});

router.put("/video-galeri/:id", async (req, res) => {
  const { title, description, coverImage, status } = req.body;
  const [row] = await db
    .update(videoGalleriesTable)
    .set({ title, description, coverImage, status })
    .where(eq(videoGalleriesTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/video-galeri/:id", async (req, res) => {
  await db.delete(videoGalleryItemsTable).where(eq(videoGalleryItemsTable.galleryId, Number(req.params.id)));
  await db.delete(videoGalleriesTable).where(eq(videoGalleriesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get("/video-galeri/:id/items", async (req, res) => {
  const items = await db
    .select()
    .from(videoGalleryItemsTable)
    .where(eq(videoGalleryItemsTable.galleryId, Number(req.params.id)))
    .orderBy(videoGalleryItemsTable.sortOrder);
  res.json(items);
});

router.post("/video-galeri/:id/items", async (req, res) => {
  const { videoUrl, thumbnailUrl, title, sortOrder } = req.body;
  const [row] = await db
    .insert(videoGalleryItemsTable)
    .values({
      galleryId: Number(req.params.id),
      videoUrl,
      thumbnailUrl: thumbnailUrl || "",
      title: title || "",
      sortOrder: sortOrder || 0,
    })
    .returning();
  res.json(row);
});

router.delete("/video-galeri/items/:itemId", async (req, res) => {
  await db.delete(videoGalleryItemsTable).where(eq(videoGalleryItemsTable.id, Number(req.params.itemId)));
  res.json({ ok: true });
});

// ── Seri İlanlar (modül kaldırıldı) ──────────────────────────
function seriIlanlarRemoved(res: { status: (n: number) => { json: (b: unknown) => void } }) {
  res.status(410).json({
    error: "Seri ilanlar modulu kaldirildi.",
    redirect: "/kesfet",
  });
}

router.get("/seri-ilanlar", async (_req, res) => seriIlanlarRemoved(res));
router.post("/seri-ilanlar", async (_req, res) => seriIlanlarRemoved(res));
router.get("/seri-ilanlar/my", async (_req, res) => seriIlanlarRemoved(res));
router.get("/seri-ilanlar/:id", async (_req, res) => seriIlanlarRemoved(res));
router.put("/seri-ilanlar/:id", async (_req, res) => seriIlanlarRemoved(res));
router.delete("/seri-ilanlar/:id", async (_req, res) => seriIlanlarRemoved(res));
router.post("/seri-ilanlar/migrate", async (_req, res) => seriIlanlarRemoved(res));
router.get("/admin/seri-ilanlar", async (_req, res) => seriIlanlarRemoved(res));
router.get("/admin/ilan-verenler", async (_req, res) => seriIlanlarRemoved(res));
router.get("/admin/ilan-kategorileri", async (_req, res) => seriIlanlarRemoved(res));
router.get("/admin/isletme-kayitlari", async (_req, res) => seriIlanlarRemoved(res));

// ── Resmi İlanlar ────────────────────────────────────────────
router.get("/resmi-ilanlar", async (_req, res) => {
  const ilanlar = await db.select().from(resmiIlanlarTable).orderBy(resmiIlanlarTable.createdAt);
  res.json(ilanlar);
});

router.post("/resmi-ilanlar", async (req, res) => {
  const { title, content, institution, deadline, imageUrl, pdfUrl, status } = req.body;
  const [row] = await db
    .insert(resmiIlanlarTable)
    .values({
      title,
      content: content || "",
      institution: institution || "",
      deadline: deadline || "",
      imageUrl: imageUrl || "",
      pdfUrl: pdfUrl || "",
      status: status || "active",
    })
    .returning();
  res.json(row);
});

router.put("/resmi-ilanlar/:id", async (req, res) => {
  const { title, content, institution, deadline, imageUrl, pdfUrl, status } = req.body;
  const [row] = await db
    .update(resmiIlanlarTable)
    .set({ title, content, institution, deadline, imageUrl, pdfUrl, status })
    .where(eq(resmiIlanlarTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/resmi-ilanlar/:id", async (req, res) => {
  await db.delete(resmiIlanlarTable).where(eq(resmiIlanlarTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
