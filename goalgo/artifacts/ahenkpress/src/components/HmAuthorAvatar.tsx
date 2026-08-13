import { useEffect, useState } from "react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { compressInlineImageFile } from "@/lib/compressInlineImage";
import { cn } from "@/lib/utils";

function authorInitial(name: string | null | undefined): string {
  const ch = String(name ?? "").trim().charAt(0);
  return (ch || "Y").toLocaleUpperCase("tr-TR");
}

/**
 * Köşe yazarı fotoğrafı. Kırık /api/media 404 tarayıcı ikonunu göstermez — ada düşer.
 * Yeni yüklemeler data URL olarak Neon'da saklanır ve hemen görünür.
 */
export function HmAuthorAvatar({
  src,
  name,
  className,
  imgClassName,
  accent,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  imgClassName?: string;
  accent?: string;
}) {
  const raw = String(src ?? "").trim();
  const resolved = raw.startsWith("data:image/") ? raw : resolveClientMediaSrc(src) || raw;
  const [failed, setFailed] = useState(!resolved);
  const [loaded, setLoaded] = useState(resolved.startsWith("data:image/"));

  useEffect(() => {
    setFailed(!resolved);
    setLoaded(resolved.startsWith("data:image/"));
  }, [resolved]);

  const fallbackStyle = {
    background: accent
      ? `linear-gradient(135deg,${accent},var(--hm-accent-2,${accent}))`
      : "linear-gradient(135deg,#6366f1,#8b5cf6)",
  };

  const initials = (
    <span
      className={cn(
        "inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full text-sm font-black text-white",
        !resolved || failed ? className : "absolute inset-0",
      )}
      style={fallbackStyle}
      aria-hidden
    >
      {authorInitial(name)}
    </span>
  );

  if (!resolved || failed) return initials;

  return (
    <span className={cn("relative inline-flex overflow-hidden rounded-full", className)}>
      {!loaded ? initials : null}
      <img
        src={resolved}
        alt={name || ""}
        className={cn(
          "h-full w-full rounded-full object-cover",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export async function compressAuthorAvatarFile(file: File): Promise<string> {
  return compressInlineImageFile(file, { maxPx: 192, quality: 0.78, mime: "image/jpeg" });
}
