<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTTP üzerinden tetiklenen cron benzeri uçları korur (Businesso varsayılanında açıktı).
 * Üretimde .env içine güçlü bir CRON_SECRET koyun; çağrıda header veya sorgu ile gönderin.
 *
 * Örnek: curl -H "X-Cron-Secret: $CRON_SECRET" "https://alanadiniz/subcheck"
 * veya: ...?token=UZUN_GIZLI_DEGER (tercihen header)
 */
class VerifyCronSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('app.cron_secret', '');

        if ($secret === '') {
            abort(503, 'Service Unavailable');
        }

        $provided = (string) ($request->header('X-Cron-Secret', '') ?: $request->query('token', ''));

        if ($provided === '' || ! hash_equals($secret, $provided)) {
            abort(403);
        }

        return $next($request);
    }
}
