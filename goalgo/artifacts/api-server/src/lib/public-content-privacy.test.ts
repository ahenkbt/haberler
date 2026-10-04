import { describe, expect, it } from "vitest";
import {
  AUTHOR_SECRET_FIELDS,
  NEWS_SUBMITTER_CONTACT_FIELDS,
  PUBLIC_REVIEW_PRIVATE_FIELDS,
  isPubliclyPublishedStatus,
  mayExposeNewsRow,
  mayIncludeSubmitterContact,
  resolveMakaleListStatus,
  serializeAuthorClient,
  serializePublicUserReview,
  staffMayReadSiteDrafts,
} from "./public-content-privacy.js";

describe("resolveMakaleListStatus", () => {
  it("forces published for anonymous callers even when status=all or draft", () => {
    expect(resolveMakaleListStatus("all", false)).toBe("published");
    expect(resolveMakaleListStatus("draft", false)).toBe("published");
    expect(resolveMakaleListStatus("DRAFT", false)).toBe("published");
    expect(resolveMakaleListStatus("", false)).toBe("published");
    expect(resolveMakaleListStatus(undefined, false)).toBe("published");
  });

  it("allows all and draft only for a staff viewer of that site", () => {
    expect(resolveMakaleListStatus("all", true)).toBe("all");
    expect(resolveMakaleListStatus("draft", true)).toBe("draft");
    expect(resolveMakaleListStatus("published", true)).toBe("published");
    expect(resolveMakaleListStatus("nope", true)).toBe("published");
  });
});

describe("staffMayReadSiteDrafts", () => {
  it("allows admins and the editor of the requested site only", () => {
    expect(staffMayReadSiteDrafts(null, 4)).toBe(false);
    expect(staffMayReadSiteDrafts({ admin: true, editorSiteId: null }, 4)).toBe(true);
    expect(staffMayReadSiteDrafts({ admin: false, editorSiteId: 4 }, 4)).toBe(true);
    expect(staffMayReadSiteDrafts({ admin: false, editorSiteId: 9 }, 4)).toBe(false);
  });
});

describe("news row visibility", () => {
  it("hides drafts on public slug reads", () => {
    expect(isPubliclyPublishedStatus("published")).toBe(true);
    expect(isPubliclyPublishedStatus("draft")).toBe(false);
    expect(mayExposeNewsRow({ status: "draft", siteId: 3 }, { numericIdRequest: false, viewer: { admin: true, editorSiteId: null } })).toBe(false);
    expect(mayExposeNewsRow({ status: "published", siteId: 3 })).toBe(true);
  });

  it("shows drafts by numeric id only to admin or that site's editor", () => {
    const draft = { status: "draft", siteId: 3 };
    expect(mayExposeNewsRow(draft, { numericIdRequest: true, viewer: null })).toBe(false);
    expect(mayExposeNewsRow(draft, { numericIdRequest: true, viewer: { admin: true, editorSiteId: null } })).toBe(true);
    expect(mayExposeNewsRow(draft, { numericIdRequest: true, viewer: { admin: false, editorSiteId: 3 } })).toBe(true);
    expect(mayExposeNewsRow(draft, { numericIdRequest: true, viewer: { admin: false, editorSiteId: 8 } })).toBe(false);
  });

  it("includes submitter contact only on staff numeric reads", () => {
    const row = { siteId: 3 };
    expect(mayIncludeSubmitterContact(row)).toBe(false);
    expect(mayIncludeSubmitterContact(row, { numericIdRequest: false, viewer: { admin: true, editorSiteId: null } })).toBe(false);
    expect(mayIncludeSubmitterContact(row, { numericIdRequest: true, viewer: { admin: true, editorSiteId: null } })).toBe(true);
    expect(mayIncludeSubmitterContact(row, { numericIdRequest: true, viewer: { admin: false, editorSiteId: 3 } })).toBe(true);
    expect(mayIncludeSubmitterContact(row, { numericIdRequest: true, viewer: { admin: false, editorSiteId: 1 } })).toBe(false);
    expect(NEWS_SUBMITTER_CONTACT_FIELDS).toEqual(["senderFullName", "senderEmail", "senderPhone"]);
  });
});

describe("serializeAuthorClient", () => {
  const row = {
    id: 7,
    name: "Ayşe Yazar",
    title: "Köşe",
    avatarUrl: "/api/media/uploads/a.jpg",
    bio: "Biyografi",
    hmSiteId: 3,
    hmSortOrder: 1,
    email: "ayse@example.com",
    passwordHash: "hash",
    pwResetToken: "reset-secret",
    pwResetExpiresAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("keeps public byline fields and drops email plus secrets", () => {
    const json = JSON.parse(JSON.stringify(serializeAuthorClient(row))) as Record<string, unknown>;
    expect(json).toMatchObject({
      id: 7,
      name: "Ayşe Yazar",
      title: "Köşe",
      avatarUrl: "/api/media/uploads/a.jpg",
      bio: "Biyografi",
      hmSiteId: 3,
    });
    expect(json).not.toHaveProperty("email");
    for (const key of AUTHOR_SECRET_FIELDS) expect(json).not.toHaveProperty(key);
  });

  it("returns email for the site editor without secrets", () => {
    const json = JSON.parse(JSON.stringify(serializeAuthorClient(row, { includeEmail: true }))) as Record<string, unknown>;
    expect(json.email).toBe("ayse@example.com");
    for (const key of AUTHOR_SECRET_FIELDS) expect(json).not.toHaveProperty(key);
  });
});

describe("serializePublicUserReview", () => {
  it("keeps nickname, rating, comment, photos and drops contact fields", () => {
    const json = serializePublicUserReview({
      id: "r1",
      businessId: "b1",
      nickname: "Ziyaretçi",
      rating: 5,
      comment: "Güzel",
      photos: ["https://cdn.example/p.jpg"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(json).toEqual({
      id: "r1",
      businessId: "b1",
      nickname: "Ziyaretçi",
      rating: 5,
      comment: "Güzel",
      photos: ["https://cdn.example/p.jpg"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    for (const key of PUBLIC_REVIEW_PRIVATE_FIELDS) {
      expect(json).not.toHaveProperty(key);
    }
    expect(json).not.toHaveProperty("adminNote");
    expect(json).not.toHaveProperty("status");
  });
});
