import express, { type Express } from "express";
import compression from "compression";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { handleShopStripeWebhook } from "./routes/shop-checkout";
import { handleDeliveryStripeWebhook } from "./routes/delivery";
import { handlePremiumStripeWebhook } from "./routes/premium";
import { handleGeliverWebhook } from "./routes/providers";
import { logger } from "./lib/logger";
import { sendPublicMediaUpload } from "./lib/mediaUploadPublicGet.js";
import { getSessionSecret } from "./lib/secrets.js";
import { setupFrontendStatic } from "./lib/frontendStatic.js";
import {
  attachExpensiveEndpointRateLimit,
  attachSensitiveAuthRateLimit,
  buildCorsOptions,
  generalApiRateLimiter,
  securityHelmetMiddleware,
} from "./lib/httpSecurity.js";
import { getSessionStore } from "./lib/sessionStore.js";
import { attachDisplayTextSanitizer } from "./lib/sanitizeDisplayJsonMiddleware.js";

declare module "express-session" {
  interface SessionData {
    memberId?: string;
    memberEmail?: string;
    memberName?: string;
    /** Yönetim paneli (VITE_ADMIN_*) ile giriş; filo API vb. için sunucu oturumu */
    panelBootstrap?: boolean;
    /** Tanımlıysa dizi = alt yönetici; yoksa veya undefined = tam yetkili */
    panelPermissions?: string[];
  }
}

const app: Express = express();

/** Nginx / Railway arkasında gerçek HTTPS ve istemci IP’si (Secure oturum çerezi için). */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(securityHelmetMiddleware());

/** JSON ağırlıklı public GET yanıtları — bant genişliği ve TTFB iyileştirmesi. */
app.use(compression({ threshold: 1024 }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(buildCorsOptions()));
/** Oturum / JSON / genel API rate limit dışında — liste sayfalarındaki çok sayıda görsel isteği */
app.get("/api/media/uploads/:name", sendPublicMediaUpload);
app.post(
  "/api/shop/checkout/stripe-webhook",
  express.raw({ type: ["application/json", "application/json; charset=utf-8"] }),
  (req, res) => { void handleShopStripeWebhook(req, res); },
);
app.post(
  "/api/delivery/checkout/stripe-webhook",
  express.raw({ type: ["application/json", "application/json; charset=utf-8"] }),
  (req, res) => { void handleDeliveryStripeWebhook(req, res); },
);
app.post(
  "/api/premium/webhook",
  express.raw({ type: ["application/json", "application/json; charset=utf-8"] }),
  (req, res) => { void handlePremiumStripeWebhook(req, res); },
);
app.post(
  "/api/providers/geliver/webhook",
  express.raw({ type: ["application/json", "application/json; charset=utf-8"] }),
  (req, res) => { void handleGeliverWebhook(req, res); },
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(
  session({
    store: getSessionStore(),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      /* SPA (ör. yekpare.net) ile API (ör. Railway) farklı site ise çerez taşınması için gerekli */
      sameSite: process.env["NODE_ENV"] === "production" ? "none" : "lax",
    },
  }),
);

app.use("/api", attachSensitiveAuthRateLimit());
app.use("/api", attachExpensiveEndpointRateLimit());
app.use("/api", generalApiRateLimiter);
app.use("/api", attachDisplayTextSanitizer());
app.use("/api", router);

const frontendMounted = setupFrontendStatic(app);

if (!frontendMounted) {
  /* Railway / Docker fallback: frontend dist yoksa "/" health/teşhis yanıtı verir. */
  app.get("/", (_req, res) => {
    res.status(200).type("text/plain").send("yekpare-api");
  });
}

/** Yakalanmamış route hataları HTML yerine JSON dönsün (admin yükleme teşhisi). */
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Unhandled Express error");
    res.status(500).json({
      ok: false,
      error: "Sunucu hatası",
      ...(process.env.NODE_ENV === "production" ? {} : { detail: msg }),
    });
  },
);

export default app;
