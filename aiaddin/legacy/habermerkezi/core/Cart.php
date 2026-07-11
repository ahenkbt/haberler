<?php
/**
 * AhenkPress v5 — Alışveriş Sepeti
 */
defined('ROOT') or die();

class Cart {

    public static function init(): void {
        if (!isset($_SESSION['ap_cart'])) $_SESSION['ap_cart'] = [];
    }

    public static function add(int $productId, int $qty = 1, array $meta = []): void {
        self::init();
        $key = $productId . '_' . md5(json_encode($meta));
        if (isset($_SESSION['ap_cart'][$key])) {
            $_SESSION['ap_cart'][$key]['qty'] += $qty;
        } else {
            $product = DB::queryRow("SELECT * FROM `{p}posts` WHERE id=? AND post_type='product' AND status='published'", [$productId]);
            if (!$product) return;
            $pm      = self::productMeta($productId);
            $_SESSION['ap_cart'][$key] = [
                'id'       => $productId,
                'title'    => $product['title'],
                'price'    => (float)($pm['price'] ?? 0),
                'image'    => $product['cover_image'] ?? '',
                'qty'      => $qty,
                'meta'     => $meta,
            ];
        }
    }

    public static function remove(string $key): void {
        self::init();
        unset($_SESSION['ap_cart'][$key]);
    }

    public static function update(string $key, int $qty): void {
        self::init();
        if ($qty <= 0) { self::remove($key); return; }
        if (isset($_SESSION['ap_cart'][$key])) $_SESSION['ap_cart'][$key]['qty'] = $qty;
    }

    public static function clear(): void { $_SESSION['ap_cart'] = []; }

    public static function items(): array { self::init(); return $_SESSION['ap_cart']; }

    public static function count(): int {
        self::init();
        return array_sum(array_column($_SESSION['ap_cart'], 'qty'));
    }

    public static function total(): float {
        self::init();
        $total = 0.0;
        foreach ($_SESSION['ap_cart'] as $item) $total += $item['price'] * $item['qty'];
        return $total;
    }

    public static function productMeta(int $id): array {
        $rows = DB::query("SELECT meta_key, meta_val FROM `{p}post_meta` WHERE post_id=?", [$id]);
        $meta = [];
        foreach ($rows as $row) $meta[$row['meta_key']] = $row['meta_val'];
        return $meta;
    }
}
