import { Link } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";

export type MansetCategoryTab = { title: string; slug: string };

const HEX_COLOR = /^#[0-9A-Fa-f]{3,8}$/;

function stripTabColor(
  slug: string,
  hmCategoryColors: Record<string, string> | null | undefined,
  accent: string,
): string {
  if (!slug) return accent;
  const raw = hmCategoryColors?.[slug];
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  return accent;
}

function homeTabHref(h: (path: string) => string, slug: string): string {
  const clean = slug.trim().toLowerCase();
  return h(clean ? `/?hmTab=${encodeURIComponent(clean)}` : "/");
}

export function HmMansetCategoryTabs({
  categories,
  activeTab,
  className = "",
  variant = "corporate",
  accent = "#e61e25",
  hmCategoryColors = null,
}: {
  categories: MansetCategoryTab[];
  activeTab: string;
  className?: string;
  variant?: "corporate" | "news";
  accent?: string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();

  if (variant === "news") {
    return (
      <div className={`mb-4 overflow-x-auto ${className}`.trim()} style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-1">
          {[{ title: "Tümü", slug: "" }, ...categories.slice(0, 12)].map((c) => {
            const active = activeTab === c.slug;
            const pill = stripTabColor(c.slug, hmCategoryColors, accent);
            return (
              <Link
                key={c.slug || "all"}
                href={homeTabHref(h, c.slug)}
                className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide transition"
                style={{
                  background: active ? pill : "rgba(15,23,42,0.07)",
                  color: active ? "#fff" : "#0f172a",
                  boxShadow: active ? "0 1px 0 rgba(0,0,0,0.2)" : undefined,
                }}
              >
                {c.title}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`vkv-manseta-tabs-wrap ${className}`.trim()}>
      <div className="vkv-manseta-tabs">
        <Link href={homeTabHref(h, "")} className={`vkv-mtab ${activeTab === "" ? "aktif" : ""}`}>
          Tümü
        </Link>
        {categories.slice(0, 12).map((c) => (
          <Link key={c.slug} href={homeTabHref(h, c.slug)} className={`vkv-mtab ${activeTab === c.slug ? "aktif" : ""}`}>
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
