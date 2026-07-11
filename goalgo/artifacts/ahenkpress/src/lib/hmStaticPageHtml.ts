import { prepareHmCustomPageBodyHtml } from "@/lib/prepareHmCustomPageBodyHtml";

export type HmStaticPageContext = {
  slug: string;
  siteId: number;
  domain: string | null;
};

export function toSafeHmStaticPageHtml(raw: string | null | undefined, ctx: HmStaticPageContext | null | undefined): string {
  const html = String(raw ?? "").trim();
  if (!html || !ctx) return "";

  try {
    return prepareHmCustomPageBodyHtml(html, {
      corporate: true,
      importSource: "wordpress-template",
      site: { slug: ctx.slug, siteId: ctx.siteId, domain: ctx.domain },
    });
  } catch {
    return "";
  }
}
