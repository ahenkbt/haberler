import express from "express";
import cors from "cors";
import apiRouter from "./routes/api.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "Goalgo PBX Gateway",
      docs: "GET /api/health, /api/trunks, /api/extensions, /api/queues, /api/agents, /api/live/*",
    });
  });

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Kaynak bulunamadı." });
  });

  return app;
}
