/**
 * Marka alanlarını (suhaberajansi.com vb.) editör haber sitesine bağlar.
 * Usage: pnpm --filter @workspace/api-server exec tsx ./scripts/repair-hm-brand-domains.ts [--dry-run]
 */
import { ensureHmBrandDomainBindings } from "../src/lib/hm-brand-domain-bindings.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await ensureHmBrandDomainBindings({ dryRun });
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
