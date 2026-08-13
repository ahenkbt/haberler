/** R2/GET 404 olmadan Neon'da saklanacak küçük data URL görseller. */

export type CompressInlineImageOpts = {
  maxPx?: number;
  quality?: number;
  mime?: "image/jpeg" | "image/png";
};

export async function compressInlineImageFile(file: File, opts: CompressInlineImageOpts = {}): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Yalnızca görsel dosyası yükleyin");
  }
  const max = opts.maxPx ?? 192;
  const quality = opts.quality ?? 0.78;
  const mime = opts.mime ?? "image/jpeg";
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Görsel okunamadı"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
    canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Görsel işlenemedi");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL(mime, quality);
    if (out.length > 280_000 && mime === "image/png") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL("image/jpeg", 0.84);
    }
    return out;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function inlineImageFromSrc(src: string, opts: CompressInlineImageOpts = {}): Promise<string> {
  const raw = String(src ?? "").trim();
  if (!raw) throw new Error("Görsel yok");
  if (raw.startsWith("data:image/")) return raw;
  const res = await fetch(raw, { mode: "cors", credentials: "same-origin" });
  if (!res.ok) throw new Error("Görsel alınamadı");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
    throw new Error("Görsel alınamadı");
  }
  const file = new File([blob], "image", { type: blob.type.startsWith("image/") ? blob.type : "image/jpeg" });
  return compressInlineImageFile(file, opts);
}
