import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Tüm harita işletmeleri + teslimat/alışveriş/turizm/ulaşım vendor kayıtları ve bağlı sipariş/menü verileri.
 * Kategoriler, şehir/ilçe/mahalle (harita), site ayarları, üyeler korunur.
 */
export async function wipeAllBusinessData(): Promise<void> {
  await db.transaction(async (tx) => {
    const run = async (q: string) => {
      await tx.execute(sql.raw(q));
    };

    await run(`UPDATE partner_applications SET vendor_ids = NULL WHERE vendor_ids IS NOT NULL`);

    await run(`DELETE FROM delivery_order_status_events`);
    await run(`DELETE FROM order_messages`);
    await run(`DELETE FROM vendor_reviews`);
    await run(`DELETE FROM customer_favorites`);
    await run(`DELETE FROM vendor_couriers`);
    await run(`DELETE FROM vendor_menu_items`);
    await run(`DELETE FROM vendor_menu_categories`);
    await run(`DELETE FROM delivery_orders`);
    await run(`DELETE FROM coupon_codes`);
    await run(`DELETE FROM vendors`);

    await run(`DELETE FROM map_contact_messages`);
    await run(`DELETE FROM map_user_reviews`);
    await run(`DELETE FROM map_feature_promotion_requests`);
    await run(`DELETE FROM map_premium_payments`);
    await run(`DELETE FROM map_orders`);
    await run(`DELETE FROM map_reservations`);
    await run(`DELETE FROM map_campaigns`);
    await run(`DELETE FROM map_products`);
    await run(`DELETE FROM map_business_images`);
    await run(`DELETE FROM map_reviews`);
    await run(`DELETE FROM map_favorites`);
    await run(`DELETE FROM map_ownership_claims`);
    await run(`DELETE FROM map_business_applications`);
    await run(`DELETE FROM map_businesses`);
  });
}
