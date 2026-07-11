import { Router, type IRouter } from "express";
import { sitePublicOrigin } from "../lib/site-public-origin.js";

const router: IRouter = Router();

/**
 * PayTR / iyzico geri çağırma adresleri — panel talimatları ve otomasyon için JSON.
 * Kimlik doğrulama gerekmez.
 */
router.get("/public/odeme-callback-rehberi", (_req, res): void => {
  const origin = sitePublicOrigin().replace(/\/$/, "");
  const base = `${origin}/api`;
  res.json({
    aciklama:
      "PayTR sipariş/bağış onayı sunucu bildirimi (callback) ile tamamlanır; yalnızca müşteri ok/fail sayfasına dönerse kayıt pending kalabilir. iyzico Checkout Form için callback URL sipariş başlatılırken gönderilir.",
    sitePublicOrigin: origin,
    adresler: {
      isletme_ve_siparis_paytr: `${base}/delivery/checkout/paytr-callback`,
      isletme_ve_siparis_iyzico: `${base}/delivery/checkout/iyzico-callback`,
    },
    sunucu_degiskenleri: {
      isletme_paytr:
        "İşletme PayTR bilgileri veritabanında tutulur; ayrı POS env değişkeni gerekmez. PayTR mağaza panelinde bildirim URL mutlaka yukarıdaki delivery adresi olmalıdır.",
    },
    kisa_notlar: [
      "İşletme girişi e-postası owner_email veya email alanı ile eşleşir (büyük/küçük harf duyarsız).",
      "Aynı e-posta ile birden fazla vendors kaydı varsa giriş, şifrenin en son güncellendiği kayda göre yapılır.",
    ],
  });
});

export default router;
