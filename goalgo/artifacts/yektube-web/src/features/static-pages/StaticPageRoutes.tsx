import { useParams } from "wouter";
import { StaticPageView } from "./StaticPageView";

export function TelifKullanimPageRoute() {
  return <StaticPageView slug="telif-kullanim" />;
}

export function GenericStaticPageRoute() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug?.trim() ?? "";
  if (!slug) {
    return <p className="px-4 py-12 text-center text-sm text-[var(--color-yt-muted)]">Sayfa bulunamadı</p>;
  }
  return <StaticPageView slug={slug} />;
}
