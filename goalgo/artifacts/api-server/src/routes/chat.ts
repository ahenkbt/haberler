import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();
type Row = Record<string, unknown>;
const r = (res: { rows?: Row[] }) => (res.rows ?? []) as Row[];

/* — Auto-migrate — */
let ready = false;
async function ensureReady() {
  if (ready) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id            SERIAL PRIMARY KEY,
      name          TEXT,
      type          TEXT NOT NULL DEFAULT 'group',
      order_id      INTEGER,
      order_number  TEXT,
      vendor_id     INTEGER,
      created_by_type TEXT,
      created_by_id   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_room_members (
      id                  SERIAL PRIMARY KEY,
      room_id             INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      member_type         TEXT NOT NULL,
      member_id           TEXT NOT NULL,
      member_name         TEXT,
      member_phone        TEXT,
      last_read_message_id INTEGER NOT NULL DEFAULT 0,
      joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(room_id, member_type, member_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_room_messages (
      id           SERIAL PRIMARY KEY,
      room_id      INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_type  TEXT NOT NULL,
      sender_id    TEXT NOT NULL,
      sender_name  TEXT NOT NULL,
      message      TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  ready = true;
}

/* — GET /api/chat/rooms — */
router.get("/chat/rooms", async (req, res): Promise<void> => {
  await ensureReady();
  const { memberType, memberId } = req.query as Record<string, string>;
  if (!memberType || !memberId) { res.status(400).json({ error: "memberType ve memberId zorunlu" }); return; }

  const rooms = r(await db.execute<Row>(sql`
    SELECT
      cr.*,
      COALESCE(
        (SELECT COUNT(*)::int FROM chat_room_messages m
         WHERE m.room_id = cr.id
           AND m.id > COALESCE(rm.last_read_message_id, 0)
           AND NOT (m.sender_type = ${memberType} AND m.sender_id = ${memberId})
        ), 0
      ) AS unread_count,
      (SELECT message FROM chat_room_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT sender_name FROM chat_room_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_sender,
      (SELECT created_at FROM chat_room_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (
        SELECT json_agg(json_build_object(
          'type', m2.member_type, 'id', m2.member_id,
          'name', m2.member_name, 'phone', m2.member_phone
        ))
        FROM chat_room_members m2 WHERE m2.room_id = cr.id
      ) AS members
    FROM chat_rooms cr
    INNER JOIN chat_room_members rm ON rm.room_id = cr.id
      AND rm.member_type = ${memberType}
      AND rm.member_id   = ${memberId}
    ORDER BY COALESCE(
      (SELECT created_at FROM chat_room_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1),
      cr.created_at
    ) DESC
    LIMIT 50
  `));
  res.json(rooms);
});

/* — GET /api/chat/rooms/:id — */
router.get("/chat/rooms/:id", async (req, res): Promise<void> => {
  await ensureReady();
  const id = parseInt(req.params.id);
  const [room] = r(await db.execute<Row>(sql`
    SELECT cr.*,
      (SELECT json_agg(json_build_object(
        'type', m.member_type, 'id', m.member_id,
        'name', m.member_name, 'phone', m.member_phone
      )) FROM chat_room_members m WHERE m.room_id = cr.id) AS members
    FROM chat_rooms cr WHERE cr.id = ${id}
  `));
  if (!room) { res.status(404).json({ error: "Oda bulunamadı" }); return; }
  res.json(room);
});

/* — POST /api/chat/rooms ── create or find room */
router.post("/chat/rooms", async (req, res): Promise<void> => {
  await ensureReady();
  const { name, type = "group", orderId, orderNumber, vendorId, members = [], createdByType, createdById } = req.body as {
    name?: string; type?: string; orderId?: number; orderNumber?: string;
    vendorId?: number; members: { type: string; id: string; name?: string; phone?: string }[];
    createdByType?: string; createdById?: string;
  };

  /* For order DM: find existing room for this order (vendor-created, any member count) */
  if (type === "order_dm" && orderId) {
    const existing = r(await db.execute<Row>(sql`
      SELECT cr.id FROM chat_rooms cr
      WHERE cr.type = 'order_dm' AND cr.order_id = ${orderId}
      LIMIT 1
    `));
    if (existing.length) {
      const roomId = existing[0].id as number;
      /* Add any new members that were not yet in the room (e.g. usta added after room creation) */
      for (const m of members) {
        await db.execute(sql`
          INSERT INTO chat_room_members (room_id, member_type, member_id, member_name, member_phone)
          VALUES (${roomId}, ${m.type}, ${m.id}, ${m.name ?? null}, ${m.phone ?? null})
          ON CONFLICT (room_id, member_type, member_id) DO NOTHING
        `);
      }
      const msgs = r(await db.execute<Row>(sql`SELECT * FROM chat_room_messages WHERE room_id = ${roomId} ORDER BY created_at ASC LIMIT 200`));
      const [roomData] = r(await db.execute<Row>(sql`
        SELECT cr.*,
          (SELECT json_agg(json_build_object('type', m.member_type, 'id', m.member_id, 'name', m.member_name)) FROM chat_room_members m WHERE m.room_id = cr.id) AS members
        FROM chat_rooms cr WHERE cr.id = ${roomId}
      `));
      res.json({ ...roomData, messages: msgs, existing: true });
      return;
    }
  }

  /* Create new room */
  const [room] = r(await db.execute<Row>(sql`
    INSERT INTO chat_rooms (name, type, order_id, order_number, vendor_id, created_by_type, created_by_id)
    VALUES (${name ?? null}, ${type}, ${orderId ?? null}, ${orderNumber ?? null}, ${vendorId ?? null}, ${createdByType ?? null}, ${createdById ?? null})
    RETURNING *
  `));

  for (const m of members) {
    await db.execute(sql`
      INSERT INTO chat_room_members (room_id, member_type, member_id, member_name, member_phone)
      VALUES (${room.id as number}, ${m.type}, ${m.id}, ${m.name ?? null}, ${m.phone ?? null})
      ON CONFLICT (room_id, member_type, member_id) DO NOTHING
    `);
  }

  res.status(201).json({ ...room, existing: false });
});

/* — GET /api/chat/rooms/:id/messages — */
router.get("/chat/rooms/:id/messages", async (req, res): Promise<void> => {
  await ensureReady();
  const roomId = parseInt(req.params.id);
  const { memberType, memberId } = req.query as Record<string, string>;

  const msgs = r(await db.execute<Row>(sql`
    SELECT * FROM chat_room_messages WHERE room_id = ${roomId} ORDER BY created_at ASC LIMIT 200
  `));

  /* Mark read */
  if (memberType && memberId && msgs.length > 0) {
    const lastId = msgs[msgs.length - 1].id as number;
    await db.execute(sql`
      UPDATE chat_room_members SET last_read_message_id = ${lastId}
      WHERE room_id = ${roomId} AND member_type = ${memberType} AND member_id = ${memberId}
    `);
  }

  res.json(msgs);
});

/* — POST /api/chat/rooms/:id/messages — */
router.post("/chat/rooms/:id/messages", async (req, res): Promise<void> => {
  await ensureReady();
  const roomId = parseInt(req.params.id);
  const { senderType, senderId, senderName, message } = req.body as Record<string, string>;
  if (!message?.trim()) { res.status(400).json({ error: "Mesaj boş olamaz" }); return; }

  const [msg] = r(await db.execute<Row>(sql`
    INSERT INTO chat_room_messages (room_id, sender_type, sender_id, sender_name, message)
    VALUES (${roomId}, ${senderType}, ${senderId}, ${senderName}, ${message.trim()})
    RETURNING *
  `));

  /* Mark sender as read */
  await db.execute(sql`
    UPDATE chat_room_members SET last_read_message_id = ${msg.id as number}
    WHERE room_id = ${roomId} AND member_type = ${senderType} AND member_id = ${senderId}
  `);

  res.status(201).json(msg);
});

/* — POST /api/chat/rooms/:id/members — invite / add — */
router.post("/chat/rooms/:id/members", async (req, res): Promise<void> => {
  await ensureReady();
  const roomId = parseInt(req.params.id);
  const { memberType, memberId, memberName, memberPhone } = req.body as Record<string, string>;
  if (!memberType || !memberId) { res.status(400).json({ error: "memberType ve memberId zorunlu" }); return; }

  await db.execute(sql`
    INSERT INTO chat_room_members (room_id, member_type, member_id, member_name, member_phone)
    VALUES (${roomId}, ${memberType}, ${memberId}, ${memberName ?? null}, ${memberPhone ?? null})
    ON CONFLICT (room_id, member_type, member_id) DO NOTHING
  `);

  res.status(201).json({ success: true });
});

/* — DELETE /api/chat/rooms/:id/members — leave — */
router.delete("/chat/rooms/:id/members", async (req, res): Promise<void> => {
  await ensureReady();
  const roomId = parseInt(req.params.id);
  const { memberType, memberId } = req.body as Record<string, string>;
  await db.execute(sql`
    DELETE FROM chat_room_members WHERE room_id = ${roomId} AND member_type = ${memberType} AND member_id = ${memberId}
  `);
  res.json({ success: true });
});

/* — GET /api/chat/unread — */
router.get("/chat/unread", async (req, res): Promise<void> => {
  await ensureReady();
  const { memberType, memberId } = req.query as Record<string, string>;
  if (!memberType || !memberId) { res.json({ unread: 0 }); return; }

  const [result] = r(await db.execute<Row>(sql`
    SELECT COALESCE(SUM(
      (SELECT COUNT(*)::int FROM chat_room_messages m
       WHERE m.room_id = rm.room_id
         AND m.id > COALESCE(rm.last_read_message_id, 0)
         AND NOT (m.sender_type = ${memberType} AND m.sender_id = ${memberId})
      )
    ), 0)::int AS total_unread
    FROM chat_room_members rm
    WHERE rm.member_type = ${memberType} AND rm.member_id = ${memberId}
  `));

  res.json({ unread: (result?.total_unread as number) ?? 0 });
});

/* — GET /api/chat/rooms/:id/new-messages?afterId=X ── for polling — */
router.get("/chat/rooms/:id/new-messages", async (req, res): Promise<void> => {
  await ensureReady();
  const roomId = parseInt(req.params.id);
  const afterId = parseInt((req.query.afterId as string) ?? "0") || 0;
  const msgs = r(await db.execute<Row>(sql`
    SELECT * FROM chat_room_messages WHERE room_id = ${roomId} AND id > ${afterId} ORDER BY created_at ASC LIMIT 50
  `));
  res.json(msgs);
});

export default router;
