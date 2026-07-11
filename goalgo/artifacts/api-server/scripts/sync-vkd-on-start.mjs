/**
 * Production startup: VKD menü + sayfaları repo içindeki data/vkd paketlerinden DB'ye yazar.
 * Derlenmiş modülü kullanır (dist veya tsx ile).
 */
import { syncVkdPagesFromData } from "../src/lib/vkd-page-restore.ts";

export async function syncVkdOnStart() {
  await syncVkdPagesFromData();

  try {
    const { syncCanakkaleSehitleriOnStart } = await import("./sync-canakkale-sehitleri-on-start.mjs");
    await syncCanakkaleSehitleriOnStart();
  } catch (err) {
    console.warn("[vkd-sync] canakkale-sehitleri sync atlandı:", err instanceof Error ? err.message : err);
  }

  try {
    const { syncMsbSehitlerOnStart } = await import("./sync-msb-sehitler-on-start.mjs");
    await syncMsbSehitlerOnStart();
  } catch (err) {
    console.warn("[vkd-sync] msb-sehitler sync atlandı:", err instanceof Error ? err.message : err);
  }
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectRun || process.argv[1]?.includes("sync-vkd-on-start.mjs")) {
  syncVkdOnStart().catch((err) => {
    console.error("[vkd-sync] hata:", err);
    process.exit(1);
  });
}
