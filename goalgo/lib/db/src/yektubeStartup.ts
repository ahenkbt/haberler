import { count, eq } from "drizzle-orm";
import { db } from "./connection";
import { videoSourcesTable, videosTable } from "./schema/video";
import {
  getYektubeDbReadMode,
  getYektubeDbWriteMode,
  isYektubeReadMainFallback,
  setYektubeReadMainFallback,
} from "./yektubeCluster";
import { isYektubeDatabaseConfigured, yektubeDb } from "./yektubeDb";

/** API açılışında Yektube DB durumunu loglar — Railway tanılama için. */
export async function logYektubeDbStartupHint(): Promise<void> {
  const read = getYektubeDbReadMode();
  const write = getYektubeDbWriteMode();
  const configured = isYektubeDatabaseConfigured;

  console.info(`[yektube-db] YEKTUBE_DATABASE_URL=${configured ? "tanımlı" : "YOK"} read=${read} write=${write}`);

  if (read === "yektube" && !configured) {
    console.error(
      "[yektube-db] KRİTİK: YEKTUBE_DB_READ=yektube ama YEKTUBE_DATABASE_URL tanımlı değil. " +
        "Okuma ana DB'ye düşüyor; Yektube Postgres'e bağlanmak için Railway'de postgres-yektube → YEKTUBE_DATABASE_URL referansı ekleyin.",
    );
    return;
  }

  try {
    const mainDb = db;
    const readDb = read === "yektube" && configured && yektubeDb ? yektubeDb : mainDb;

    const [mainSrcRow] = await mainDb
      .select({ c: count() })
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.active, true));
    const [mainVidRow] = await mainDb
      .select({ c: count() })
      .from(videosTable)
      .where(eq(videosTable.active, true));
    const mainSourceCount = Number(mainSrcRow?.c ?? 0);
    const mainVideoCount = Number(mainVidRow?.c ?? 0);

    const [srcRow] = await readDb
      .select({ c: count() })
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.active, true));
    const [vidRow] = await readDb
      .select({ c: count() })
      .from(videosTable)
      .where(eq(videosTable.active, true));
    const sourceCount = Number(srcRow?.c ?? 0);
    const videoCount = Number(vidRow?.c ?? 0);

    if (read === "yektube" && configured && yektubeDb && mainVideoCount > 0) {
      const clusterLagging =
        videoCount === 0 ||
        videoCount < Math.floor(mainVideoCount * 0.9) ||
        sourceCount < Math.floor(mainSourceCount * 0.9);
      if (clusterLagging) {
        setYektubeReadMainFallback(true);
        console.error(
          `[yektube-db] KRİTİK: Yektube cluster eksik (video ${videoCount}/${mainVideoCount}, kaynak ${sourceCount}/${mainSourceCount}) — ` +
            "okuma geçici olarak ana DB'den yapılıyor. Deploy logunda [yektube-data-migrate] tamam arayın.",
        );
      }
    }

    const effectiveRead = read === "yektube" && configured ? (isYektubeReadMainFallback() ? "main (fallback)" : "yektube") : read;
    const effectiveVideoCount =
      read === "yektube" && configured && isYektubeReadMainFallback() ? mainVideoCount : videoCount;
    const effectiveSourceCount =
      read === "yektube" && configured && isYektubeReadMainFallback() ? mainSourceCount : sourceCount;

    console.info(
      `[yektube-db] okuma hedefi=${effectiveRead} aktif_kaynak=${effectiveSourceCount} aktif_video=${effectiveVideoCount}`,
    );

    if (read === "yektube" && configured && sourceCount === 0 && videoCount === 0 && mainVideoCount === 0) {
      console.error(
        "[yektube-db] UYARI: Yektube DB boş görünüyor. Deploy loglarında [yektube-db-migrate] tamam ve " +
          "[yektube-data-migrate] tamam satırlarını kontrol edin.",
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[yektube-db] KRİTİK: video tabloları okunamadı (${msg.slice(0, 200)}). ` +
        "Şema oluşmadıysa deploy logunda [yektube-db-migrate] hata arayın veya pnpm run db:migrate:yektube çalıştırın.",
    );
  }
}
