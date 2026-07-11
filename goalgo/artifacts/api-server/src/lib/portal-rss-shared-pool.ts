import { createHash } from "node:crypto";
import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";

function normalizeFeedUrl(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function canonicalSharedPoolFeedId(feed: Pick<PortalHybridRssFeedConfig, "id" | "categorySlug" | "url">): string {
  const id = String(feed.id ?? "").trim();
  if (id.startsWith("portal-rss-") || id.startsWith("gmn-")) return id;
  const urlKey = createHash("sha1").update(normalizeFeedUrl(feed.url)).digest("hex").slice(0, 10);
  const slug = String(feed.categorySlug ?? "gundem").trim().toLowerCase() || "gundem";
  return `portal-rss-${slug}-${urlKey}`;
}

export function expandFeedIdsForSharedPoolQuery(
  feeds: Pick<PortalHybridRssFeedConfig, "id" | "categorySlug" | "url">[],
): string[] {
  const ids = new Set<string>();
  for (const feed of feeds) {
    const raw = String(feed.id ?? "").trim();
    if (raw) ids.add(raw);
    ids.add(canonicalSharedPoolFeedId(feed));
  }
  return [...ids];
}

export function rssCampaignSharedFeedConfig(opts: {
  campaignId: number;
  categorySlug: string;
  feedUrl: string;
}): PortalHybridRssFeedConfig {
  const url = String(opts.feedUrl ?? "").trim();
  const urlKey = createHash("sha1").update(normalizeFeedUrl(url)).digest("hex").slice(0, 10);
  const categorySlug = String(opts.categorySlug ?? "gundem").trim().toLowerCase() || "gundem";
  return {
    id: `portal-rss-campaign-${opts.campaignId}-${urlKey}`,
    categorySlug,
    label: `Kampanya #${opts.campaignId}`,
    url,
    enabled: true,
    maxItems: 20,
  };
}
