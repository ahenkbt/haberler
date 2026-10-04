import { describe, expect, it } from "vitest";
import type { NewsRow } from "@workspace/db";
import { serializeNews, type NewsContext } from "./serializers.js";

function newsRow(overrides: Partial<NewsRow> = {}): NewsRow {
  return {
    id: 11,
    title: "Manşet başlık",
    slug: "manset-baslik",
    spot: "Kısa spot",
    content: "<p>Haber gövdesi</p>",
    imageUrl: "/api/media/uploads/cover.jpg",
    categoryId: null,
    authorId: 4,
    senderFullName: "Ali Gönderen",
    senderEmail: "ali@example.com",
    senderPhone: "05551112233",
    status: "published",
    isFeatured: false,
    isTepeManset: false,
    isSiteManset: false,
    isBreaking: false,
    views: 9,
    tags: ["gundem"],
    isAiGenerated: false,
    siteId: 3,
    rssSourceUrl: null,
    isEditorManual: true,
    siteOnly: true,
    ownerSiteId: 3,
    isFoodRecipe: false,
    foodRecipeCategorySlug: null,
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    updatedAt: new Date("2026-03-01T12:00:00.000Z"),
    ...overrides,
  };
}

const ctx: NewsContext = {
  categories: new Map(),
  authors: new Map([[4, { id: 4, name: "Ayşe Yazar" }]]),
};

describe("serializeNews public contact", () => {
  it("keeps public article fields and omits submitter contact", () => {
    const json = JSON.parse(JSON.stringify(serializeNews(newsRow(), ctx))) as Record<string, unknown>;
    expect(json).toMatchObject({
      id: 11,
      siteId: 3,
      title: "Manşet başlık",
      slug: "manset-baslik",
      spot: "Kısa spot",
      content: "<p>Haber gövdesi</p>",
      imageUrl: "/api/media/uploads/cover.jpg",
      categorySlug: "genel",
      authorName: "Ayşe Yazar",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T12:00:00.000Z",
    });
    expect(json).not.toHaveProperty("senderFullName");
    expect(json).not.toHaveProperty("senderEmail");
    expect(json).not.toHaveProperty("senderPhone");
  });

  it("keeps submitter contact for staff responses", () => {
    const json = serializeNews(newsRow(), ctx, { includeSubmitterContact: true });
    expect(json.senderFullName).toBe("Ali Gönderen");
    expect(json.senderEmail).toBe("ali@example.com");
    expect(json.senderPhone).toBe("05551112233");
    expect(json.authorName).toBe("Ayşe Yazar");
  });
});
