import { and, eq, inArray, sql } from "drizzle-orm";
import { db, productsTable, vendorMenuItemsTable } from "@workspace/db";
import {
  aggregateMenuItemQuantities,
  aggregateProductQuantities,
} from "./order-stock-parse.js";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type StockFailure = { ok: false; error: string; statusCode: 409 | 400 };

export type StockOrderResult<T> = { ok: true; result: T } | StockFailure;

export class StockDeductionError extends Error {
  readonly statusCode: 409 | 400;

  constructor(message: string, statusCode: 409 | 400) {
    super(message);
    this.name = "StockDeductionError";
    this.statusCode = statusCode;
  }
}

/**
 * vendor_menu_items.stok düşümü.
 * stock NULL = sınırsız (dokunulmaz).
 */
export async function deductVendorMenuStock(
  tx: DbTx,
  vendorId: number,
  items: Array<Record<string, unknown>>,
): Promise<{ ok: true } | StockFailure> {
  const demands = aggregateMenuItemQuantities(items);
  if (demands.size === 0) return { ok: true };

  const ids = [...demands.keys()];
  const rows = await tx
    .select({
      id: vendorMenuItemsTable.id,
      name: vendorMenuItemsTable.name,
      stock: vendorMenuItemsTable.stock,
      active: vendorMenuItemsTable.active,
    })
    .from(vendorMenuItemsTable)
    .where(and(eq(vendorMenuItemsTable.vendorId, vendorId), inArray(vendorMenuItemsTable.id, ids)));

  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const [itemId, qty] of demands) {
    const row = byId.get(itemId);
    if (!row || !row.active) {
      return { ok: false, statusCode: 400, error: "Sepetteki bir ürün artık satışta değil." };
    }
    if (row.stock == null) continue;
    if (row.stock < qty) {
      return {
        ok: false,
        statusCode: 409,
        error:
          row.stock <= 0
            ? `"${row.name}" stokta kalmadı.`
            : `"${row.name}" için yeterli stok yok (kalan: ${row.stock}).`,
      };
    }
  }

  for (const [itemId, qty] of demands) {
    const row = byId.get(itemId)!;
    if (row.stock == null) continue;
    const updated = await tx
      .update(vendorMenuItemsTable)
      .set({
        stock: sql`${vendorMenuItemsTable.stock} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vendorMenuItemsTable.id, itemId),
          eq(vendorMenuItemsTable.vendorId, vendorId),
          sql`${vendorMenuItemsTable.stock} IS NOT NULL`,
          sql`${vendorMenuItemsTable.stock} >= ${qty}`,
        ),
      )
      .returning({ id: vendorMenuItemsTable.id });
    if (updated.length === 0) {
      return { ok: false, statusCode: 409, error: "Stok güncellenemedi; lütfen sepeti yenileyip tekrar deneyin." };
    }
  }

  return { ok: true };
}

/** products tablosu (Ahenk mağaza checkout). */
export async function deductProductsStock(
  tx: DbTx,
  items: Array<{ productId: number; qty: number }>,
): Promise<{ ok: true } | StockFailure> {
  const demands = aggregateProductQuantities(items);
  if (demands.size === 0) return { ok: true };

  const ids = [...demands.keys()];
  const rows = await tx
    .select({
      id: productsTable.id,
      name: productsTable.name,
      stock: productsTable.stock,
      active: productsTable.active,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const [productId, qty] of demands) {
    const row = byId.get(productId);
    if (!row || !row.active) {
      return { ok: false, statusCode: 400, error: "Sepetteki bir ürün artık satışta değil." };
    }
    if (row.stock < qty) {
      return {
        ok: false,
        statusCode: 409,
        error:
          row.stock <= 0
            ? `"${row.name}" stokta kalmadı.`
            : `"${row.name}" için yeterli stok yok (kalan: ${row.stock}).`,
      };
    }
  }

  for (const [productId, qty] of demands) {
    const updated = await tx
      .update(productsTable)
      .set({
        stock: sql`${productsTable.stock} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(and(eq(productsTable.id, productId), sql`${productsTable.stock} >= ${qty}`))
      .returning({ id: productsTable.id });
    if (updated.length === 0) {
      return { ok: false, statusCode: 409, error: "Stok güncellenemedi; lütfen sepeti yenileyip tekrar deneyin." };
    }
  }

  return { ok: true };
}

export async function withVendorMenuStockAndOrder<T>(
  vendorId: number,
  items: Array<Record<string, unknown>>,
  insertOrder: (tx: DbTx) => Promise<T>,
): Promise<StockOrderResult<T>> {
  try {
    const result = await db.transaction(async (tx) => {
      const stock = await deductVendorMenuStock(tx, vendorId, items);
      if (!stock.ok) throw new StockDeductionError(stock.error, stock.statusCode);
      return insertOrder(tx);
    });
    return { ok: true, result };
  } catch (e) {
    if (e instanceof StockDeductionError) {
      return { ok: false, error: e.message, statusCode: e.statusCode };
    }
    throw e;
  }
}

export async function withProductsStockAndOrder<T>(
  items: Array<{ productId: number; qty: number }>,
  insertOrder: (tx: DbTx) => Promise<T>,
): Promise<StockOrderResult<T>> {
  try {
    const result = await db.transaction(async (tx) => {
      const stock = await deductProductsStock(tx, items);
      if (!stock.ok) throw new StockDeductionError(stock.error, stock.statusCode);
      return insertOrder(tx);
    });
    return { ok: true, result };
  } catch (e) {
    if (e instanceof StockDeductionError) {
      return { ok: false, error: e.message, statusCode: e.statusCode };
    }
    throw e;
  }
}
