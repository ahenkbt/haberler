import { Router, type IRouter } from "express";
import { db, shopUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSessionSecret } from "../lib/secrets.js";

const router: IRouter = Router();
const JWT_SECRET = getSessionSecret();
const JWT_EXPIRES = "30d";

function signToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyShopToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function getShopUser(req: any) {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = verifyShopToken(auth.slice(7));
  if (!payload) return null;
  const [user] = await db.select().from(shopUsersTable).where(eq(shopUsersTable.id, payload.userId));
  return user ?? null;
}

router.post("/shop/auth/register", async (req, res): Promise<void> => {
  const { email, password, name, phone, address, city, district, postal } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "E-posta, şifre ve ad zorunludur" }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır" }); return;
  }

  const [existing] = await db.select().from(shopUsersTable).where(eq(shopUsersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı" }); return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(shopUsersTable).values({
    email: email.toLowerCase(), passwordHash, name, phone, address, city, district, postal,
  }).returning();

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, district: user.district, postal: user.postal },
  });
});

router.post("/shop/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "E-posta ve şifre gereklidir" }); return;
  }

  const [user] = await db.select().from(shopUsersTable).where(eq(shopUsersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" }); return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" }); return;
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, district: user.district, postal: user.postal },
  });
});

router.get("/shop/auth/me", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, district: user.district, postal: user.postal });
});

router.put("/shop/auth/me", async (req, res): Promise<void> => {
  const user = await getShopUser(req);
  if (!user) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  const { name, phone, address, city, district, postal, currentPassword, newPassword } = req.body;

  const updateData: any = { name, phone, address, city, district, postal, updatedAt: new Date() };

  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "Mevcut şifre gereklidir" }); return; }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) { res.status(400).json({ error: "Mevcut şifre hatalı" }); return; }
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const [updated] = await db.update(shopUsersTable).set(updateData).where(eq(shopUsersTable.id, user.id)).returning();
  res.json({ id: updated.id, email: updated.email, name: updated.name, phone: updated.phone, address: updated.address, city: updated.city, district: updated.district, postal: updated.postal });
});

export default router;
