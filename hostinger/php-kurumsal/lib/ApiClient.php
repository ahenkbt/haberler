<?php
declare(strict_types=1);

/**
 * Aynı origin /api (Worker) üzerinden HM meta çeker.
 * API_BASE env ile ahenk.net.tr'ye düşülebilir (Hostinger'da Worker henüz yoksa).
 */
final class HkApiClient
{
    private string $apiBase;
    private int $timeoutSec;

    public function __construct(?string $apiBase = null, int $timeoutSec = 8)
    {
        $env = getenv('HK_API_BASE');
        $base = $apiBase
            ?? (is_string($env) && $env !== '' ? $env : null)
            ?? $this->defaultApiBase();
        $this->apiBase = rtrim($base, '/');
        $this->timeoutSec = max(2, $timeoutSec);
    }

    private function defaultApiBase(): string
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
        $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1';
        return ($https ? 'https://' : 'http://') . $host;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function fetchMetaByDomain(string $domain): ?array
    {
        $url = $this->apiBase
            . '/api/hm/meta/by-domain?domain='
            . rawurlencode($domain)
            . '&includePageContent=1';
        return $this->getJson($url);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function fetchMetaBySlug(string $slug): ?array
    {
        $url = $this->apiBase
            . '/api/hm/meta/by-slug/'
            . rawurlencode($slug)
            . '?includePageContent=1';
        return $this->getJson($url);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getJson(string $url): ?array
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            if ($ch === false) {
                return null;
            }
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => $this->timeoutSec,
                CURLOPT_TIMEOUT => $this->timeoutSec,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'User-Agent: hm-php-kurumsal/1.0',
                ],
            ]);
            $body = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if (!is_string($body) || $code < 200 || $code >= 300) {
                return null;
            }
            $decoded = json_decode($body, true);
            return is_array($decoded) ? $decoded : null;
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => $this->timeoutSec,
                'header' => "Accept: application/json\r\nUser-Agent: hm-php-kurumsal/1.0\r\n",
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if (!is_string($body) || $body === '') {
            return null;
        }
        $decoded = json_decode($body, true);
        return is_array($decoded) ? $decoded : null;
    }
}
