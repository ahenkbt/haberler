import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Kenar (Neon `RETURNING *`) snake_case satırı → drizzle insert anahtarları.
 * Tabloda olmayan alanlar atılır; timestamp kolonlarındaki ISO metinler Date olur.
 */
export function rowFromSnakeCase(table: PgTable, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    const meta = col as { name: string; dataType?: string };
    if (!(meta.name in raw)) continue;
    let v = raw[meta.name];
    if (typeof v === "string" && meta.dataType === "date") {
      const d = new Date(v);
      v = Number.isNaN(d.getTime()) ? undefined : d;
    }
    if (v !== undefined) out[key] = v;
  }
  return out;
}
