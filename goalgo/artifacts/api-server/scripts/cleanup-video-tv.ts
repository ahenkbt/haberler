/**
 * Yektube: hatalı kanallar, pasif videolar ve gizlenen playlist/kaynakları temizler.
 *
 *   pnpm --filter @workspace/api-server cleanup:video-tv -- --dry-run
 *   pnpm --filter @workspace/api-server cleanup:video-tv
 */
import { runVideoTvCleanup } from "../src/lib/videoTvCleanup.js";

const dryRun = process.argv.includes("--dry-run");

const result = await runVideoTvCleanup({ dryRun });
console.log(JSON.stringify(result, null, 2));
