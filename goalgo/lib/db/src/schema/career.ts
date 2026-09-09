import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** /kariyer formundan gelen çağrı merkezi satış başvuruları. */
export const careerApplicationsTable = pgTable("career_applications", {
  id: serial("id").primaryKey(),
  positionSlug: text("position_slug").notNull().default("cagri-merkezi-satis"),
  positionTitle: text("position_title").notNull().default("Çağrı Merkezi Satış Temsilcileri"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city"),
  experienceYears: text("experience_years"),
  coverLetter: text("cover_letter").notNull(),
  cvUrl: text("cv_url"),
  cvFileName: text("cv_file_name"),
  isRead: boolean("is_read").notNull().default(false),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sourceKind: text("source_kind").notNull().default("kariyer"),
  sourceContactId: integer("source_contact_id"),
});
