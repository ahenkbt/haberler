import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const photoGalleriesTable = pgTable("photo_galleries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  status: text("status").notNull().default("active"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const photoGalleryItemsTable = pgTable("photo_gallery_items", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const videoGalleriesTable = pgTable("video_galleries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  status: text("status").notNull().default("active"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoGalleryItemsTable = pgTable("video_gallery_items", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  title: text("title").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const resmiIlanlarTable = pgTable("resmi_ilanlar", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  institution: text("institution").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  pdfUrl: text("pdf_url").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PhotoGalleryRow = typeof photoGalleriesTable.$inferSelect;
export type PhotoGalleryItemRow = typeof photoGalleryItemsTable.$inferSelect;
export type VideoGalleryRow = typeof videoGalleriesTable.$inferSelect;
export type VideoGalleryItemRow = typeof videoGalleryItemsTable.$inferSelect;
export type ResmiIlanRow = typeof resmiIlanlarTable.$inferSelect;
