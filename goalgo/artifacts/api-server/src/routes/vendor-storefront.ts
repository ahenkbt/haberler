import { Router, type IRouter } from "express";
import {
  VENDOR_THEME_CATALOG,
  getVendorByCustomDomain,
  normalizeVendorDomain,
  serializeVendorDomainMeta,
} from "../lib/vendor-storefront.js";

const router: IRouter = Router();

/** GET /api/vendors/meta/by-domain?domain=example.com */
router.get("/vendors/meta/by-domain", async (req, res): Promise<void> => {
  const host = normalizeVendorDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  if (!host) {
    res.status(400).json({ error: "domain query gerekli" });
    return;
  }
  const row = await getVendorByCustomDomain(host);
  if (!row) {
    res.status(404).json({ error: "Mağaza bulunamadı" });
    return;
  }
  res.json(serializeVendorDomainMeta(row));
});

/** GET /api/vendors/themes/catalog — genel tema listesi */
router.get("/vendors/themes/catalog", (_req, res): void => {
  res.json({
    themes: VENDOR_THEME_CATALOG.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      previewImage: t.previewImage,
      themeGroup: t.themeGroup,
      verticals: t.verticals,
      subtypes: t.subtypes,
      slots: t.slots,
    })),
  });
});

export default router;
