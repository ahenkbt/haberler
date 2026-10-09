import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/**
 * Name/title equality that ignores case, outer spaces and repeated spaces, the same way on
 * both sides, inside Postgres.
 *
 * The old inline form `lower(regexp_replace(btrim(col), '\s+', ' ', 'g')) = ${jsNormalized}`
 * never matched for many names:
 * - In a JS template `'\s+'` is the regex `s+`, so every "s" became a space ("mustafa" → "mu tafa").
 * - The JS side used toLocaleLowerCase("tr-TR") ("Ilgaz" → "ılgaz") while Postgres lower() gives "ilgaz".
 * Every boot then re-inserted "Mustafa Özdemir" and "Defne Ilgaz" on each regional site (2026-10-09).
 * I/İ/ı are folded to "i" on both sides so the Turkish and the default lowercase agree.
 */
export function normTextExpr(value: SQLWrapper | string): SQL {
  return sql`lower(translate(regexp_replace(btrim(${value}::text), '\\s+', ' ', 'g'), 'İIı', 'iii'))`;
}

export function sqlNormTextEq(column: SQLWrapper, value: string): SQL {
  return sql`${normTextExpr(column)} = ${normTextExpr(value)}`;
}
