import { pgTable, text, serial, integer, boolean, timestamp, decimal, real, jsonb, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ─── Araç tipleri ────────────────────────────────────────────────
  rideshare  — BlaBlaCar tarzı araç paylaşma
  taxi       — Taksi
  courier    — Kurye (motosiklet/bisiklet/araç)
  tow        — Çekici
  moving     — Nakliyat
──────────────────────────────────────────────────────────────────── */

export const transportVehiclesTable = pgTable("transport_vehicles", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id"),
  ownerId: integer("owner_id").notNull(),          // shopUsersTable.id (sürücü)
  vehicleType: text("vehicle_type").notNull(),     // rideshare | taxi | courier | tow | moving
  brand: text("brand"),
  model: text("model"),
  plateNumber: text("plate_number"),
  capacity: integer("capacity").notNull().default(1),
  description: text("description"),
  photoUrl: text("photo_url"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  serviceArea: text("service_area"),
  documentsJson: jsonb("documents_json"),
  isActive: boolean("is_active").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  city: text("city"),
  lat: real("lat"),
  lng: real("lng"),
  rating: real("rating").notNull().default(0),
  tripCount: integer("trip_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rideOffersTable = pgTable("ride_offers", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id"),
  driverId: integer("driver_id").notNull(),        // shopUsersTable.id
  vehicleId: integer("vehicle_id"),
  fromCity: text("from_city").notNull(),
  toCity: text("to_city").notNull(),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  departureTime: timestamp("departure_time").notNull(),
  totalSeats: integer("total_seats").notNull().default(3),
  availableSeats: integer("available_seats").notNull().default(3),
  pricePerSeat: decimal("price_per_seat", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  allowSmoke: boolean("allow_smoke").notNull().default(false),
  allowPet: boolean("allow_pet").notNull().default(false),
  allowLuggage: boolean("allow_luggage").notNull().default(true),
  status: text("status").notNull().default("active"), // active | full | cancelled | completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rideBookingsTable = pgTable("ride_bookings", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  passengerId: integer("passenger_id").notNull(),  // shopUsersTable.id
  seats: integer("seats").notNull().default(1),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  pickupNote: text("pickup_note"),
  status: text("status").notNull().default("pending"), // pending | confirmed | cancelled | completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Ulaşım talebi durum değişiklikleri — delivery_order_status_events ile aynı desen */
export const transportRequestStatusEventsTable = pgTable("transport_request_status_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  source: text("source").notNull().default("api"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transportRequestsTable = pgTable("transport_requests", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id"),
  requestType: text("request_type").notNull(),    // taxi | courier | tow | moving
  customerId: integer("customer_id"),             // shopUsersTable.id (null = misafir)
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  fromAddress: text("from_address").notNull(),
  fromLat: real("from_lat"),
  fromLng: real("from_lng"),
  toAddress: text("to_address"),
  toLat: real("to_lat"),
  toLng: real("to_lng"),
  scheduledAt: timestamp("scheduled_at"),         // null = şimdi
  note: text("note"),
  extraData: jsonb("extra_data"),                 // tip-özel veriler (ağırlık, kat vs.)
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  assignedDriverId: integer("assigned_driver_id"),
  assignedVehicleId: integer("assigned_vehicle_id"),
  trackingCode: text("tracking_code").unique(),
  status: text("status").notNull().default("pending"),
  // pending → accepted → arrived_pickup → picked_up → in_transit → delivered → rated
  statusHistory: jsonb("status_history"),         // [{status, note, ts}]
  driverRating: integer("driver_rating"),
  customerRating: integer("customer_rating"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transportNotificationsTable = pgTable("transport_notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull(), // shopUsersTable.id
  recipientType: text("recipient_type").notNull().default("customer"), // customer | driver
  requestId: integer("request_id"),
  offerId: integer("offer_id"),
  type: text("type").notNull(),
  // request_accepted | arrived_pickup | picked_up | in_transit | delivered | new_booking | booking_confirmed
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TransportVehicleRow = typeof transportVehiclesTable.$inferSelect;
export type RideOfferRow = typeof rideOffersTable.$inferSelect;
export type RideBookingRow = typeof rideBookingsTable.$inferSelect;
export type TransportRequestRow = typeof transportRequestsTable.$inferSelect;
export type TransportRequestStatusEventRow = typeof transportRequestStatusEventsTable.$inferSelect;
export type TransportNotificationRow = typeof transportNotificationsTable.$inferSelect;
