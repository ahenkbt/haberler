import { useEffect, useState } from "react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
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
  if (!file.type.startsWith("image/")) {
    throw new Error("Yalnızca görsel dosyası yükleyin");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Görsel okunamadı"));
      el.src = objectUrl;
    });
    const max = 192;
    const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
    canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Görsel işlenemedi");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
