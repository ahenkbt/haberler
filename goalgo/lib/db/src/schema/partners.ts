import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const partnerTypeEnum = pgEnum("partner_type", ["sahis", "limited", "anonim"]);
export const partnerStatusEnum = pgEnum("partner_status", ["pending", "reviewing", "approved", "rejected"]);

export const partnerApplicationsTable = pgTable("partner_applications", {
  id: serial("id").primaryKey(),

  // İşletme türü
  partnerType: partnerTypeEnum("partner_type").notNull(),

  // İletişim
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),

  // İşletme bilgileri
  companyName: text("company_name").notNull(),
  taxNumber: text("tax_number").notNull(),
  taxOffice: text("tax_office"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  district: text("district"),
  website: text("website"),

  // Şahıs firması için
  tcKimlik: text("tc_kimlik"),

  // Yüklenen belge URL'leri (object storage veya base64 ref)
  taxDocumentUrl: text("tax_document_url"),
  signatureCircularUrl: text("signature_circular_url"),

  // Faaliyet alanı
  businessCategories: text("business_categories").array(),
  description: text("description"),

  // Durum
  status: partnerStatusEnum("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),

  // E-posta doğrulama
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyToken: text("email_verify_token"),
  emailVerifiedAt: timestamp("email_verified_at"),

  // Sözleşme onayı
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),

  // Bağlı hesaplar (onay sonrası)
  memberId: integer("member_id"),
  vendorIds: integer("vendor_ids").array(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
