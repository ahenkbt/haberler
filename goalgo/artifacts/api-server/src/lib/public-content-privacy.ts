import { normalizePublicMediaUrl } from "./normalizePublicMediaUrl.js";

/** Submitter contact stored on news rows. Public JSON must not include these. */
export const NEWS_SUBMITTER_CONTACT_FIELDS = ["senderFullName", "senderEmail", "senderPhone"] as const;

/** Author credentials and reset secrets. Never returned on any client response. */
export const AUTHOR_SECRET_FIELDS = ["passwordHash", "pwResetToken", "pwResetExpiresAt"] as const;

/** Reviewer identity stored on map user reviews. Public comment JSON must not include these. */
export const PUBLIC_REVIEW_PRIVATE_FIELDS = [
  "email",
  "phone",
  "firstName",
  "lastName",
  "memberId",
  "adminNote",
] as const;

export type StaffContentViewer = {
  /** Panel session with haberler or hm_sites, or maintenance secret. */
  admin: boolean;
  /** HM editor JWT site, when the bearer token is valid. */
  editorSiteId: number | null;
};

export function isPubliclyPublishedStatus(status: unknown): boolean {
  return String(status ?? "").trim().toLowerCase() === "published";
}

/**
 * Public `/api/hm/makale` status. Unpublished (`all` / `draft`) only when the
 * caller is an admin or an editor of that exact site.
 */
export function resolveMakaleListStatus(
  requested: unknown,
  mayReadUnpublished: boolean,
): "published" | "draft" | "all" {
  if (!mayReadUnpublished) return "published";
  const raw = String(requested ?? "published").trim().toLowerCase();
  if (raw === "all" || raw === "draft" || raw === "published") return raw;
  return "published";
}

export function staffMayReadSiteDrafts(
  viewer: StaffContentViewer | null | undefined,
  siteId: number,
): boolean {
  if (!viewer) return false;
  if (viewer.admin) return true;
  return viewer.editorSiteId != null && viewer.editorSiteId === siteId && siteId > 0;
}

type NewsVisibilityRow = { status?: string | null; siteId?: number | null };

/**
 * Slug/page-bundle reads stay published-only (they are edge-cached).
 * Numeric id reads may include drafts for an admin, or for the editor of that site.
 */
export function mayExposeNewsRow(
  row: NewsVisibilityRow,
  opts?: { viewer?: StaffContentViewer | null; numericIdRequest?: boolean },
): boolean {
  if (isPubliclyPublishedStatus(row.status)) return true;
  if (!opts?.numericIdRequest || !opts.viewer) return false;
  if (opts.viewer.admin) return true;
  const siteId = row.siteId;
  return (
    opts.viewer.editorSiteId != null &&
    siteId != null &&
    siteId > 0 &&
    opts.viewer.editorSiteId === siteId
  );
}

/** Submitter name/email/phone only on staff numeric-id reads for that site (or any site for admin). */
export function mayIncludeSubmitterContact(
  row: { siteId?: number | null },
  opts?: { viewer?: StaffContentViewer | null; numericIdRequest?: boolean },
): boolean {
  if (!opts?.numericIdRequest || !opts.viewer) return false;
  if (opts.viewer.admin) return true;
  const siteId = row.siteId;
  return (
    opts.viewer.editorSiteId != null &&
    siteId != null &&
    siteId > 0 &&
    opts.viewer.editorSiteId === siteId
  );
}

export type AuthorClientRow = {
  id: number;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  hmSiteId?: number | null;
  hmSortOrder?: number | null;
  email?: string | null;
  passwordHash?: string | null;
  pwResetToken?: string | null;
  pwResetExpiresAt?: Date | string | null;
};

/** Public author card. Email only when an editor of that site asks with a bearer token. */
export function serializeAuthorClient(row: AuthorClientRow, opts?: { includeEmail?: boolean }) {
  const avatarUrl = normalizePublicMediaUrl(row.avatarUrl) ?? (row.avatarUrl?.trim() ? row.avatarUrl : null);
  const base = {
    id: row.id,
    name: row.name,
    title: row.title ?? null,
    avatarUrl,
    bio: row.bio ?? null,
    hmSiteId: row.hmSiteId ?? null,
    hmSortOrder: row.hmSortOrder ?? null,
  };
  if (!opts?.includeEmail) return base;
  return { ...base, email: row.email ?? null };
}

export type PublicUserReviewRow = {
  id: string;
  businessId: string;
  nickname?: string | null;
  rating: number;
  comment?: string | null;
  photos?: unknown;
  createdAt?: Date | string | null;
};

/** Approved public comment. Display name is the nickname only. */
export function serializePublicUserReview(row: PublicUserReviewRow) {
  return {
    id: row.id,
    businessId: row.businessId,
    nickname: row.nickname ?? null,
    rating: row.rating,
    comment: row.comment ?? null,
    photos: Array.isArray(row.photos) ? row.photos : [],
    createdAt: row.createdAt ?? null,
  };
}
