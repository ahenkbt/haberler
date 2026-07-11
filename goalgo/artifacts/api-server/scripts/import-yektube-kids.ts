/**
 * Yektube Çocuk: hazır kanallar + kategori aramalarından içe aktarım.
 *
 *   pnpm --filter @workspace/api-server import:yektube-kids
 *   pnpm --filter @workspace/api-server import:yektube-kids -- --presets-only
 */
import { importKidsBootstrap, importKidsFromPresets } from "../src/lib/youtubeKidsImport.js";

const presetsOnly = process.argv.includes("--presets-only");

const result = presetsOnly ? await importKidsFromPresets() : await importKidsBootstrap({ syncPresets: true, videosPerQuery: 12 });

console.log(JSON.stringify(result, null, 2));
