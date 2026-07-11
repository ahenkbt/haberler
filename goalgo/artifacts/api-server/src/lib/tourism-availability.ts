import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensuredBookingColumns = false;

export async function ensureTourismBookingColumns() {
  if (ensuredBookingColumns) return;
  await db.execute(sql`
    ALTER TABLE tourism_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  `);
  ensuredBookingColumns = true;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const d1 = parseIsoDate(checkIn);
  const d2 = parseIsoDate(checkOut);
  if (!d1 || !d2) return 0;
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export type RoomAvailabilityRow = {
  roomId: number;
  name: string;
  available: boolean;
  reason?: string;
  nightlyRate: number;
};

export type AvailabilityCheckResult = {
  available: boolean;
  nights: number;
  nightlyRate: number;
  totalPrice: number;
  reason?: string;
  rooms?: RoomAvailabilityRow[];
};

export type AvailabilityCheckParams = {
  listingId: number;
  roomId?: number | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  allRooms?: boolean;
};

export async function checkTourismAvailability(
  params: AvailabilityCheckParams,
): Promise<AvailabilityCheckResult> {
  const { listingId, roomId, checkIn, checkOut, guests, allRooms } = params;
  const empty = (reason: string): AvailabilityCheckResult => ({
    available: false,
    nights: 0,
    nightlyRate: 0,
    totalPrice: 0,
    reason,
  });

  if (!checkIn || !checkOut) return empty("Giriş ve çıkış tarihi gerekli");
  if (!parseIsoDate(checkIn) || !parseIsoDate(checkOut)) return empty("Geçersiz tarih formatı");
  if (checkOut <= checkIn) return empty("Çıkış tarihi girişten sonra olmalı");
  if (guests < 1) return empty("En az 1 misafir gerekli");

  const listingRes = await db.execute(sql`
    SELECT id, type, price, sale_price, price_unit, capacity, status
    FROM tourism_listings WHERE id = ${listingId} LIMIT 1
  `);
  if (!listingRes.rows.length) return empty("İlan bulunamadı");

  const listing = listingRes.rows[0] as Record<string, unknown>;
  if (String(listing.status) !== "active") return empty("İlan aktif değil");

  const nights = nightsBetween(checkIn, checkOut);
  const listingType = String(listing.type);

  const blocks = await db.execute(sql`
    SELECT room_id, start_date::text AS start_date, end_date::text AS end_date
    FROM tourism_availability
    WHERE listing_id = ${listingId}
      AND blocked = true
      AND start_date <= ${checkOut}::date
      AND end_date >= ${checkIn}::date
  `);

  const bookings = await db.execute(sql`
    SELECT room_id, check_in::text AS check_in, check_out::text AS check_out
    FROM tourism_bookings
    WHERE listing_id = ${listingId}
      AND status NOT IN ('cancelled')
      AND check_in IS NOT NULL
      AND check_out IS NOT NULL
      AND check_in < ${checkOut}::date
      AND check_out > ${checkIn}::date
  `);

  const blockRows = blocks.rows as { room_id: number | null; start_date: string; end_date: string }[];
  const bookingRows = bookings.rows as { room_id: number | null; check_in: string; check_out: string }[];

  function isBlockedForRoom(rid: number | null): boolean {
    for (const row of blockRows) {
      const applies = row.room_id == null || Number(row.room_id) === rid;
      if (!applies) continue;
      if (rangesOverlap(row.start_date, row.end_date, checkIn, checkOut)) return true;
    }
    return false;
  }

  function bookedCountForRoom(rid: number | null): number {
    let count = 0;
    for (const row of bookingRows) {
      const bkRoom = row.room_id != null ? Number(row.room_id) : null;
      if (listingType === "hotel" && rid != null && bkRoom !== rid) continue;
      if (rangesOverlap(row.check_in, row.check_out, checkIn, checkOut)) count++;
    }
    return count;
  }

  function priceForUnit(base: number): number {
    const unit = String(listing.price_unit ?? "gece");
    if (unit === "kişi" || unit === "person") return base * guests;
    return base * nights;
  }

  if (listingType === "hotel") {
    const roomsRes = await db.execute(sql`
      SELECT id, name, price, adults, children, count
      FROM tourism_rooms
      WHERE listing_id = ${listingId} AND status = 'active'
      ORDER BY price ASC
    `);
    const rooms = roomsRes.rows as Record<string, unknown>[];

    function evaluateRoom(room: Record<string, unknown>): RoomAvailabilityRow {
      const rid = Number(room.id);
      const maxGuests = Number(room.adults ?? 2) + Number(room.children ?? 0);
      const inventory = Math.max(1, Number(room.count ?? 1));
      const nightlyRate = Number(room.price ?? listing.sale_price ?? listing.price ?? 0);
      let available = true;
      let reason: string | undefined;
      if (guests > maxGuests) {
        available = false;
        reason = `Bu oda en fazla ${maxGuests} kişi alır`;
      } else if (isBlockedForRoom(rid)) {
        available = false;
        reason = "Seçilen tarihlerde müsait değil";
      } else if (bookedCountForRoom(rid) >= inventory) {
        available = false;
        reason = "Seçilen tarihlerde dolu";
      }
      return { roomId: rid, name: String(room.name), available, reason, nightlyRate };
    }

    const roomResults = rooms.map(evaluateRoom);

    if (allRooms || !roomId) {
      const selected = roomId ? roomResults.find((r) => r.roomId === roomId) : undefined;
      const nightlyRate =
        selected?.nightlyRate ??
        roomResults.find((r) => r.available)?.nightlyRate ??
        Number(listing.sale_price || listing.price || 0);
      return {
        available: roomId ? Boolean(selected?.available) : roomResults.some((r) => r.available),
        nights,
        nightlyRate,
        totalPrice: nightlyRate * nights,
        reason: selected && !selected.available ? selected.reason : undefined,
        rooms: roomResults,
      };
    }

    const room = rooms.find((r) => Number(r.id) === roomId);
    if (!room) return { ...empty("Oda bulunamadı"), nights };

    const evaluated = evaluateRoom(room);
    return {
      available: evaluated.available,
      nights,
      nightlyRate: evaluated.nightlyRate,
      totalPrice: evaluated.nightlyRate * nights,
      reason: evaluated.reason,
    };
  }

  if (listingType === "villa") {
    const capacity = Number(listing.capacity ?? 99);
    const nightlyRate = Number(listing.sale_price || listing.price || 0);
    if (guests > capacity) {
      return {
        available: false,
        nights,
        nightlyRate,
        totalPrice: 0,
        reason: `Bu konaklama en fazla ${capacity} kişi alır`,
      };
    }
    if (isBlockedForRoom(null)) {
      return {
        available: false,
        nights,
        nightlyRate,
        totalPrice: priceForUnit(nightlyRate),
        reason: "Seçilen tarihlerde müsait değil",
      };
    }
    if (bookedCountForRoom(null) >= 1) {
      return {
        available: false,
        nights,
        nightlyRate,
        totalPrice: priceForUnit(nightlyRate),
        reason: "Seçilen tarihlerde dolu",
      };
    }
    return { available: true, nights, nightlyRate, totalPrice: priceForUnit(nightlyRate) };
  }

  const nightlyRate = Number(listing.sale_price || listing.price || 0);
  return { available: true, nights, nightlyRate, totalPrice: priceForUnit(nightlyRate) };
}
