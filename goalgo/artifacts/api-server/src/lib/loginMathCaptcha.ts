import crypto from "node:crypto";
import { getSessionSecret } from "./secrets.js";

const TTL_MS = 10 * 60 * 1000;

type CaptchaPayload = {
  a: number;
  b: number;
  op: "add" | "mul";
  exp: number;
};

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function expectedAnswer(p: CaptchaPayload): number {
  return p.op === "add" ? p.a + p.b : p.a * p.b;
}

/** Giriş formları için kısa süreli imzalı matematik sorusu. */
export function issueLoginMathCaptcha(): { token: string; question: string } {
  const a = crypto.randomInt(2, 10);
  const b = crypto.randomInt(2, 10);
  const op: CaptchaPayload["op"] = crypto.randomInt(0, 2) === 0 ? "add" : "mul";
  const payload: CaptchaPayload = { a, b, op, exp: Date.now() + TTL_MS };
  const raw = JSON.stringify(payload);
  const token = `${Buffer.from(raw, "utf8").toString("base64url")}.${signPayload(raw)}`;
  const question = op === "add" ? `${a} + ${b} = ?` : `${a} × ${b} = ?`;
  return { token, question };
}

export function verifyLoginMathCaptcha(tokenRaw: string, answerRaw: string): boolean {
  const token = String(tokenRaw ?? "").trim();
  const answer = Number(String(answerRaw ?? "").trim());
  if (!token || !Number.isFinite(answer)) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let raw: string;
  try {
    raw = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expectedSig = signPayload(raw);
  if (sig.length !== expectedSig.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;
  } catch {
    return false;
  }

  let payload: CaptchaPayload;
  try {
    payload = JSON.parse(raw) as CaptchaPayload;
  } catch {
    return false;
  }
  if (!payload || payload.exp < Date.now()) return false;
  if (!Number.isInteger(payload.a) || !Number.isInteger(payload.b)) return false;
  if (payload.op !== "add" && payload.op !== "mul") return false;
  return answer === expectedAnswer(payload);
}
