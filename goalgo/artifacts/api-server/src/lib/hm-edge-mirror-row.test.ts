import { describe, expect, it } from "vitest";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { rowFromSnakeCase } from "./hm-edge-mirror-row.js";

const sample = pgTable("sample_makaleler", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  authorId: integer("author_id"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

describe("rowFromSnakeCase", () => {
  it("maps Neon snake_case columns to drizzle keys and parses timestamps", () => {
    const row = rowFromSnakeCase(sample, {
      id: 35920,
      site_id: 3,
      author_id: 526,
      title: "Temiz Siyaset, Temiz Toplum",
      created_at: "2026-10-05T14:50:01.043Z",
      category_slug: "kose",
    });
    expect(row).toEqual({
      id: 35920,
      siteId: 3,
      authorId: 526,
      title: "Temiz Siyaset, Temiz Toplum",
      createdAt: new Date("2026-10-05T14:50:01.043Z"),
    });
  });

  it("drops invalid timestamps instead of inserting garbage", () => {
    const row = rowFromSnakeCase(sample, { id: 1, site_id: 3, title: "x", created_at: "not-a-date" });
    expect("createdAt" in row).toBe(false);
  });
});
