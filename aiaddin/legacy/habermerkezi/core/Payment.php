<?php
/**
 * AhenkPress v5 — Ödeme Yönetimi
 * Desteklenen: havale, kapıda_odeme, stripe
 */
defined('ROOT') or die();

class Payment {

    const METHODS = ['havale', 'kapida_odeme', 'stripe'];

    public static function enabled(): array {
        $raw = DB::setting('payment_methods', '["havale","kapida_odeme"]');
        $arr = json_decode($raw, true);
        return is_array($arr) ? $arr : ['havale'];
    }

    public static function label(string $method): string {
        return match($method) {
            'havale'       => 'Banka Havalesi / EFT',
            'kapida_odeme' => 'Kapıda Ödeme',
            'stripe'       => 'Kredi / Banka Kartı',
            default        => $method,
        };
    }

    public static function icon(string $method): string {
        return match($method) {
            'havale'       => '🏦',
            'kapida_odeme' => '🚪',
            'stripe'       => '💳',
            default        => '💰',
        };
    }

    /**
     * Sipariş oluştur + ödeme metoduna göre yönlendir
     */
    public static function createOrder(array $cart, array $buyer, string $method): array {
        if (empty($cart)) return ['ok' => false, 'msg' => 'Sepet boş.'];
        if (!in_array($method, self::enabled(), true)) return ['ok'=>false,'msg'=>'Geçersiz ödeme metodu.'];

        $total    = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $cart));
        $orderNum = 'AP-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

        $orderId = (int)DB::insert(
            "INSERT INTO `{p}orders` (order_number,buyer_name,buyer_email,buyer_phone,buyer_address,
             total,currency,payment_method,status,notes,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,NOW())",
            [
                $orderNum,
                $buyer['name']    ?? '',
                $buyer['email']   ?? '',
                $buyer['phone']   ?? '',
                $buyer['address'] ?? '',
                $total,
                DB::setting('currency','TRY'),
                $method,
                'pending',
                $buyer['notes']   ?? '',
            ]
        );

        foreach ($cart as $item) {
            DB::execute(
                "INSERT INTO `{p}order_items` (order_id,product_id,title,price,qty,subtotal) VALUES (?,?,?,?,?,?)",
                [$orderId, $item['id'], $item['title'], $item['price'], $item['qty'], $item['price']*$item['qty']]
            );
        }

        return ['ok' => true, 'order_id' => $orderId, 'order_number' => $orderNum, 'total' => $total, 'method' => $method];
    }

    /**
     * Stripe ödeme niyeti oluştur
     */
    public static function stripeCreateIntent(float $amount, string $currency = 'try'): array {
        $secretKey = DB::setting('stripe_secret_key', '');
        if (!$secretKey) return ['ok' => false, 'msg' => 'Stripe API anahtarı ayarlanmamış.'];

        $amountCents = (int)round($amount * 100);
        $ch = curl_init('https://api.stripe.com/v1/payment_intents');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_USERPWD        => $secretKey . ':',
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_POSTFIELDS     => http_build_query([
                'amount'   => $amountCents,
                'currency' => strtolower($currency),
                'automatic_payment_methods[enabled]' => 'true',
            ]),
        ]);
        $resp  = curl_exec($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($errno) return ['ok' => false, 'msg' => 'Stripe bağlantı hatası.'];
        $data = json_decode($resp, true);
        if (!empty($data['error'])) return ['ok' => false, 'msg' => $data['error']['message'] ?? 'Stripe hatası.'];
        return ['ok' => true, 'client_secret' => $data['client_secret'], 'intent_id' => $data['id']];
    }

    public static function stripePublicKey(): string {
        return DB::setting('stripe_public_key', '');
    }
}
