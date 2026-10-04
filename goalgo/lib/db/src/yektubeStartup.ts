import type pg from "pg";
import { count, eq } from "drizzle-orm";
import { pool, db } from "./connection";
import { videoSourcesTable, videosTable } from "./schema/video";
import {
  decideYektubeReadFallback,
  getYektubeDbReadMode,
  getYektubeDbWriteMode,
  isYektubeReadMainFallback,
  setYektubeReadMainFallback,
} from "./yektubeCluster";
import { isYektubeDatabaseConfigured, yektubeDb, yektubePool } from "./yektubeDb";

/**
 * Liste SELECT'leri bu kolonları ister. Startup eskiden yalnızca `count(*)` + `active`
 * bakıyordu; eksik seo_* / embed_allowed / use_youtube_api sayımı geçirip her listeyi 500 yapıyordu.
 */
const VIDEO_COLUMN_DDLS = [
  `ALTER TABLE video_sources ADD COLUMN IF NOT EXISTS use_youtube_api boolean NOT NULL DEFAULT true`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_title text`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_description text`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_updated_at timestamptz`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_allowed boolean NOT NULL DEFAULT true`,
];

function errorText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

/** Eksik kolonları ekler. Tablo yoksa veya rol ALTER yapamıyorsa loglar ve durur. */
async function ensureVideoReadColumns(target: pg.Pool, label: string): Promise<void> {
  for (const statement of VIDEO_COLUMN_DDLS) {
    try {
      await target.query(statement);
    } catch (err) {
      console.error(`[yektube-db] ${label} şema yaması atlandı (${errorText(err)})`);
      return;
    }
  }
}

type ProbeDb = NonNullable<typeof yektubeDb> | typeof db;

async function probeVideoReads(target: ProbeDb, label: string): Promise<{ ok: true; sources: number; videos: number } | { ok: false; error: string }> {
  try {
    const [srcRow] = await target
      .select({ c: count() })
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.active, true));
    const [vidRow] = await target
      .select({ c: count() })
      .from(videosTable)
      .where(eq(videosTable.active, true));
    await target
      .select({
        seoTitle: videosTable.seoTitle,
        seoUpdatedAt: videosTable.seoUpdatedAt,
        embedAllowed: videosTable.embedAllowed,
      })
      .from(videosTable)
      .limit(1);
    await target
      .select({ useYoutubeApi: videoSourcesTable.useYoutubeApi })
      .from(videoSourcesTable)
      .limit(1);
    return {
      ok: true,
      sources: Number(srcRow?.c ?? 0),
      videos: Number(vidRow?.c ?? 0),
    };
  } catch (err) {
    const error = errorText(err);
    console.error(`[yektube-db] ${label} video okuması başarısız (${error})`);
    return { ok: false, error };
  }
}

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

  await ensureVideoReadColumns(pool, "ana DB");
  if (configured && yektubePool) {
    await ensureVideoReadColumns(yektubePool, "yektube");
  }

  const mainProbe = await probeVideoReads(db, "ana DB");
  const yektubeProbe =
    read === "yektube" && configured && yektubeDb ? await probeVideoReads(yektubeDb, "yektube") : null;

  const mainSourceCount = mainProbe.ok ? mainProbe.sources : 0;
  const mainVideoCount = mainProbe.ok ? mainProbe.videos : 0;
  const sourceCount = yektubeProbe?.ok ? yektubeProbe.sources : 0;
  const videoCount = yektubeProbe?.ok ? yektubeProbe.videos : 0;

  const yektubeLagging =
    Boolean(yektubeProbe?.ok) &&
    mainProbe.ok &&
    mainVideoCount > 0 &&
    (videoCount === 0 ||
      videoCount < Math.floor(mainVideoCount * 0.9) ||
      sourceCount < Math.floor(mainSourceCount * 0.9));

  const pinToMain = decideYektubeReadFallback({
    readMode: read,
    configured,
    yektubeProbeOk: yektubeProbe?.ok === true,
    mainProbeOk: mainProbe.ok,
    yektubeLagging,
  });
  if (pinToMain) setYektubeReadMainFallback(true);

  if (read === "yektube" && configured && yektubeProbe && !yektubeProbe.ok && !mainProbe.ok) {
    console.error(
      "[yektube-db] KRİTİK: ne yektube ne ana DB video tabloları okunamadı. " +
        "İstekler yine her iki tarafı dener; public listeler boş döner, 500 değil.",
    );
  } else if (pinToMain && yektubeLagging) {
    console.error(
      `[yektube-db] KRİTİK: Yektube cluster eksik (video ${videoCount}/${mainVideoCount}, kaynak ${sourceCount}/${mainSourceCount}) — ` +
        "okuma geçici olarak ana DB'den yapılıyor. Deploy logunda [yektube-data-migrate] tamam arayın.",
    );
  } else if (pinToMain) {
    console.error(
      `[yektube-db] KRİTİK: Yektube cluster okunamadı (${yektubeProbe && !yektubeProbe.ok ? yektubeProbe.error : "probe"}) — ` +
        "okuma ana DB'den yapılıyor.",
    );
  } else if (!mainProbe.ok && read === "yektube" && yektubeProbe?.ok) {
    console.error(
      `[yektube-db] ana DB video tabloları yok (${mainProbe.error}) — okuma yektube'da kalıyor, ana DB'ye yapıştırılmıyor.`,
    );
  }

  const effectiveRead =
    read === "yektube" && configured ? (isYektubeReadMainFallback() ? "main (fallback)" : "yektube") : read;
  const effectiveVideoCount =
    read === "yektube" && configured && isYektubeReadMainFallback() ? mainVideoCount : yektubeProbe?.ok ? videoCount : mainVideoCount;
  const effectiveSourceCount =
    read === "yektube" && configured && isYektubeReadMainFallback() ? mainSourceCount : yektubeProbe?.ok ? sourceCount : mainSourceCount;

  console.info(
    `[yektube-db] okuma hedefi=${effectiveRead} aktif_kaynak=${effectiveSourceCount} aktif_video=${effectiveVideoCount}`,
  );

  if (read === "yektube" && configured && yektubeProbe?.ok && sourceCount === 0 && videoCount === 0 && mainVideoCount === 0) {
    console.error(
      "[yektube-db] UYARI: Yektube DB boş görünüyor. Deploy loglarında [yektube-db-migrate] tamam ve " +
        "[yektube-data-migrate] tamam satırlarını kontrol edin.",
    );
  }
}
