import "dotenv/config";
import express from "express";
import v1Operator from "./routes/v1Operator.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).type("application/json").json({ ok: true, service: "haber-merkezi" });
});

app.use("/v1/operator", v1Operator);

const port = Number(process.env["PORT"] ?? "3100");
const host = process.env["LISTEN_HOST"] ?? "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[haber-merkezi] http://${host}:${port}`);
});
