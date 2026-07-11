import { join } from "node:path";

/**
 * Panelden yüklenen `/api/media/uploads/...` dosyalarının saklandığı kök dizin.
 *
 * **Öncelik**
 * 1. `MEDIA_UPLOAD_ROOT` — elle tanımlıysa (son söz).
 * 2. `RAILWAY_VOLUME_MOUNT_PATH` — Railway Volume.
 * 3. `RENDER_DISK_MOUNT_PATH` — Render kalıcı disk mount'u.
 * 4. Varsayılan: `process.cwd()/data/media-uploads` (geçici disk; deploy'da kaybolabilir).
 *
 * Mount path ile `MEDIA_UPLOAD_ROOT` farklı olursa dosyalar volume dışında kalır → çökme / kırık görsel.
 */
export function getMediaUploadRoot(): string {
  const explicit = process.env.MEDIA_UPLOAD_ROOT?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayMount) return railwayMount.replace(/\/+$/, "");
  const renderDisk = process.env.RENDER_DISK_MOUNT_PATH?.trim();
  if (renderDisk) return renderDisk.replace(/\/+$/, "");
  return join(process.cwd(), "data", "media-uploads");
}
