import { db, shopUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getSessionSecret } from "./secrets.js";

const JWT_SECRET = getSessionSecret();

export function verifyShopToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function getShopUser(req: { headers: Record<string, unknown> }) {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) return null;
  const payload = verifyShopToken(auth.slice(7));
  if (!payload) return null;
  const [user] = await db.select().from(shopUsersTable).where(eq(shopUsersTable.id, payload.userId));
  return user ?? null;
}
