<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * Read-only bridge to the live HM Editör data through the haberler Worker's PUBLIC JSON API
 * (the same endpoints the React front end uses; /api/* stays on the Worker after a cutover):
 *   GET /api/hm/meta/by-domain?domain=D             live site id (+ panel layout)
 *   GET /api/news/hybrid?siteId=&categorySlug=&limit=&offset=&dbFirst=1&rssScope=all   news lists
 *   GET /api/news/{slug}                            one article
 * turkatahaber.com is the network portal: lists are requested without siteId (as the old front end did).
 * Only 'db' items (HM Editör `news` rows) are bridged; RSS comes from the theme's own importer.
 * Cache: files in BRIDGE_CACHE_DIR (default /tmp/ys-bridge), fresh BRIDGE_TTL s (90), stale-on-error up to
 * 24 h. bin/bridge-warm.php refreshes recently used keys in the background so requests rarely wait.
 * BRIDGE_DISABLED=1 turns it off (theme DB only).
 */
final class LiveBridge
{
    private const PORTAL_HOSTS = ['turkatahaber.com'];

    /** @var array<string, list<array<string, mixed>>> */
    private array $memo = [];

    /** Seconds this request spent waiting on cold fetches. */
    private static float $spent = 0.0;

    private function __construct(private string $apiHost, private ?int $liveSiteId, private string $dir)
    {
    }

    public static function cacheDir(): string
    {
        return rtrim((string) (getenv('BRIDGE_CACHE_DIR') ?: sys_get_temp_dir() . '/ys-bridge'), '/');
    }

    /** Bridge for a theme site row (domain = the live host). Null when disabled or the host is unknown live. */
    public static function forDomain(string $domain): ?self
    {
        if (getenv('BRIDGE_DISABLED') === '1') {
            return null;
        }
        $host = strtolower(trim((string) preg_replace('/^www\./', '', $domain)));
        if (preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $host) !== 1 || str_contains($host, 'goalgo')) {
            return null;
        }
        $dir = self::cacheDir();
        if (in_array($host, self::PORTAL_HOSTS, true)) {
            return new self($host, null, $dir);
        }
        // Live HM site ids are pinned where known (the by-domain lookup is not stable for every host);
        // BRIDGE_SITE_IDS='{"host": id}' overrides/extends.
        $pinned = ['ankarasehirgazetesi.com' => 3, 'ankarahabergundemi.com' => 8, 'vatanhaber.net' => 1, 'suhaber.net' => 2, 'kirsehirhaber.org' => 1131];
        $env = json_decode((string) getenv('BRIDGE_SITE_IDS'), true);
        if (is_array($env)) {
            $pinned = array_replace($pinned, $env);
        }
        if (isset($pinned[$host]) && (int) $pinned[$host] > 0) {
            return new self($host, (int) $pinned[$host], $dir);
        }
        // Hosts not (yet) registered in live HM: remember the miss so every page render does not wait on the
        // by-domain lookup (404 -> BRIDGE_MISS_TTL s, default 600; other failures -> 60 s). Once the live site
        // exists the next lookup after the TTL picks its id up by itself.
        $miss = $dir . '/miss-' . md5($host);
        $missTtl = max(60, (int) (getenv('BRIDGE_MISS_TTL') ?: 600));
        if (is_file($miss) && time() - (int) filemtime($miss) < $missTtl) {
            return null;
        }
        $b = new self($host, null, $dir);
        $meta = $b->get('/api/hm/meta/by-domain?domain=' . rawurlencode($host), 21600, 6, $status);
        $id = is_array($meta) ? (int) ($meta['id'] ?? 0) : 0;
        if ($id > 0) {
            if (is_file($miss)) {
                @unlink($miss);
            }
            return new self($host, $id, $dir);
        }
        @mkdir($dir, 0775, true);
        @touch($miss, $status === 404 ? time() : time() - $missTtl + 60);
        return null;
    }

    public function apiHost(): string
    {
        return $this->apiHost;
    }

    /** Panel (live) layout of the site; {} for the portal or when unavailable. @return array<string, mixed> */
    public function liveLayout(): array
    {
        if ($this->liveSiteId === null) {
            return [];
        }
        $meta = $this->get('/api/hm/meta/by-domain?domain=' . rawurlencode($this->apiHost), 3600, 6);
        return is_array($meta) && is_array($meta['layout'] ?? null) ? $meta['layout'] : [];
    }

    /**
     * Newest live HM news of the site (category '' = all), mapped to the theme story shape.
     * The live network has a few hundred HM items per site, so one pool of the newest 200 (two cached
     * requests per site) serves every list; categories are filtered locally.
     * @return list<array<string, mixed>>
     */
    public function list(string $category = '', int $limit = 60): array
    {
        $pool = $this->pool();
        if ($category !== '') {
            $pool = array_values(array_filter($pool, static fn (array $s): bool => $s['category'] === $category));
        }
        return array_slice($pool, 0, max(1, $limit));
    }

    /** @return list<array<string, mixed>> */
    private function pool(): array
    {
        if (isset($this->memo['pool'])) {
            return $this->memo['pool'];
        }
        $out = [];
        $seen = [];
        foreach ([0, 100] as $offset) {
            $q = ['limit' => 100, 'offset' => $offset, 'dbFirst' => 1, 'rssScope' => 'all'];
            if ($this->liveSiteId !== null) {
                $q['siteId'] = $this->liveSiteId;
            }
            $d = $this->get('/api/news/hybrid?' . http_build_query($q), (int) (getenv('BRIDGE_TTL') ?: 90), 8);
            $items = is_array($d) && is_array($d['items'] ?? null) ? $d['items'] : [];
            foreach ($items as $it) {
                $s = is_array($it) ? $this->mapItem($it) : null;
                if ($s !== null && !isset($seen[$s['slug']])) {
                    $seen[$s['slug']] = true;
                    $out[] = $s;
                }
            }
            if (count($items) < 100 || empty($d['hasMore'])) {
                break;
            }
        }
        usort($out, static fn (array $a, array $b): int => strcmp((string) $b['publishedAt'], (string) $a['publishedAt']));
        return $this->memo['pool'] = $out;
    }

    /**
     * One live article (published only) by slug, theme story shape; ['unavailable' => true] when the API
     * is down and nothing is cached; null when it does not exist.
     * @return array<string, mixed>|null
     */
    public function story(string $slug): ?array
    {
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._~-]{0,250}$/', $slug) !== 1) {
            return null;
        }
        $d = $this->get('/api/news/' . rawurlencode($slug), 120, 5, $status);
        if ($d === null) {
            return $status === 404 ? null : ['unavailable' => true];
        }
        if (($d['status'] ?? '') !== 'published' || ($d['slug'] ?? '') !== $slug || trim((string) ($d['title'] ?? '')) === '') {
            return null;
        }
        $source = self::http((string) ($d['rssSourceUrl'] ?? ''));
        $manual = !empty($d['isEditorManual']) || $source === '';
        return [
            'kind' => $manual ? 'news' : 'rss',
            'slug' => $slug,
            'title' => (string) $d['title'],
            'spot' => Html::text((string) ($d['spot'] ?? '')),
            'body' => (string) ($d['content'] ?? ''),
            'image' => $this->media((string) ($d['imageUrl'] ?? '')),
            'credit' => $source !== '' ? self::hostLabel($source) : '',
            'sourceUrl' => $source,
            'category' => Modules::slug((string) ($d['categorySlug'] ?? '')),
            'publishedAt' => (string) ($d['createdAt'] ?? ''),
            'updatedAt' => (string) ($d['updatedAt'] ?? ($d['createdAt'] ?? '')),
            'authorName' => (string) ($d['authorName'] ?? ''),
            'legacy' => true,
        ];
    }

    /** @param array<string, mixed> $it  @return array<string, mixed>|null */
    private function mapItem(array $it): ?array
    {
        if (($it['source'] ?? '') !== 'db') {
            return null;
        }
        $href = (string) ($it['href'] ?? '');
        $slug = str_starts_with($href, '/haber/') ? rawurldecode(substr($href, 7)) : (string) ($it['slug'] ?? '');
        $title = trim((string) ($it['title'] ?? ''));
        if ($title === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9._~-]{0,250}$/', $slug) !== 1
            || in_array(Modules::slug((string) ($it['categorySlug'] ?? '')), Repository::EXCLUDED_CATEGORIES, true)) {
            return null;
        }
        $source = self::http((string) ($it['rssSourceUrl'] ?? ''));
        return [
            'slug' => $slug,
            'title' => $title,
            'spot' => Html::text((string) ($it['spot'] ?? '')),
            'image' => $this->media((string) ($it['imageUrl'] ?? '')),
            'credit' => $source !== '' ? self::hostLabel($source) : '',
            'sourceUrl' => $source,
            'category' => Modules::slug((string) ($it['categorySlug'] ?? '')),
            'publishedAt' => (string) ($it['publishedAt'] ?? ''),
            'kind' => 'news',
            'views' => (int) ($it['views'] ?? 0),
            'imageCredit' => '',
            'mansetWide' => '',
            'ogImage' => '',
            'live' => true,
            // Tepe / site manşet may be flagged without isFeatured in the editor UI.
            'liveFeatured' => !empty($it['isFeatured']) || !empty($it['isSiteManset']) || !empty($it['isTepeManset']),
            'liveBreaking' => !empty($it['isBreaking']),
            'liveManual' => !empty($it['isEditorManual']),
        ];
    }

    private function media(string $url): string
    {
        $url = trim($url);
        if (str_starts_with($url, '/api/media/')) {
            return 'https://' . self::hostFor($this->apiHost, $url) . $url;
        }
        return Repository::media($url);
    }

    private static function http(string $v): string
    {
        $v = trim($v);
        return preg_match('#^https?://#i', $v) === 1 ? $v : '';
    }

    private static function hostLabel(string $url): string
    {
        $h = parse_url($url, PHP_URL_HOST);
        $h = is_string($h) ? (string) preg_replace('/^www\./', '', strtolower($h)) : '';
        return $h !== '' ? $h : 'Kaynak';
    }

    /**
     * Cached GET. Fresh copy -> returned. Stale copy and the warmer is alive -> returned as is (the warmer
     * refreshes it). Otherwise fetched now; on failure the stale copy (<= 24 h) is returned.
     * @return array<string, mixed>|null
     */
    public function get(string $path, int $ttl, int $timeout, ?int &$status = null): ?array
    {
        $status = 0;
        $url = 'https://' . self::hostFor($this->apiHost, $path) . $path;
        $file = $this->dir . '/' . md5($url) . '.json';
        $age = is_file($file) ? time() - (int) filemtime($file) : PHP_INT_MAX;
        @touch($file . '.hit');
        if (!is_file($file . '.url')) {
            @mkdir($this->dir, 0775, true);
            @file_put_contents($file . '.url', json_encode(['url' => $url, 'ttl' => $ttl, 'timeout' => $timeout]));
        }
        $warm = is_file($this->dir . '/warmer.alive') && time() - (int) filemtime($this->dir . '/warmer.alive') < 120;
        if ($age < $ttl || ($age < 900 && $warm)) {
            $status = 200;
            return self::decode($file);
        }
        if (self::$spent > (float) (getenv('BRIDGE_REQUEST_BUDGET') ?: 8)) {
            // Request already waited long enough: serve what we have; the warmer fetches this key.
            return $age < 86400 ? self::decode($file) : null;
        }
        $t0 = microtime(true);
        // In-request fetches are capped (BRIDGE_REQUEST_TIMEOUT, 4 s) so a slow API cannot hold PHP threads;
        // the background warmer (bin/bridge-warm.php) uses the longer timeouts.
        $code = self::fetchTo($url, $file, min($timeout, max(1, (int) (getenv('BRIDGE_REQUEST_TIMEOUT') ?: 4))));
        self::$spent += microtime(true) - $t0;
        $status = $code;
        if ($code === 200) {
            return self::decode($file);
        }
        if ($code === 404) {
            return null;
        }
        if ($age < 86400) {
            $status = 200;
            return self::decode($file);
        }
        return null;
    }

    /**
     * Loop guard (23:00 incident: dunyasaglik.org called /api/hm/meta/by-domain on itself -> PHP origin -> again).
     * /api/hm/* always goes to the hub host (BRIDGE_HUB_HOST, a host fully served by the haberler Worker);
     * other /api/* go to the site's own host only when that host's /api/* is routed to the Worker
     * (BRIDGE_WORKER_HOSTS), else to the hub (lists/articles are selected by siteId, not by host).
     */
    public static function hostFor(string $apiHost, string $path): string
    {
        if (str_starts_with($path, '/api/hm/')) {
            return self::hub();
        }
        return in_array(strtolower($apiHost), self::workerHosts(), true) ? $apiHost : self::hub();
    }

    private static function hub(): string
    {
        return strtolower(trim((string) (getenv('BRIDGE_HUB_HOST') ?: 'ahenk.net.tr')));
    }

    /** @return list<string> */
    private static function workerHosts(): array
    {
        $env = (string) getenv('BRIDGE_WORKER_HOSTS');
        if ($env !== '') {
            return array_values(array_filter(array_map(static fn (string $h): string => strtolower(trim($h)), explode(',', $env))));
        }
        return ['turkatahaber.com', 'ankarasehirgazetesi.com', 'ankarahabergundemi.com', 'kirsehirhaber.org', 'vatanhaber.net', 'suhaber.net',
            'sehitgazi.org.tr', 'yerel.net.tr', 'turksav.org', 'dunyasaglik.org', 'yesilvatan.gen.tr'];
    }

    /** True when $url may be fetched: never an /api/* URL that would land on this PHP origin again. */
    private static function allowed(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $path = (string) parse_url($url, PHP_URL_PATH);
        if (!str_starts_with($path, '/api/')) {
            return true;
        }
        if (str_starts_with($path, '/api/hm/')) {
            return $host === self::hub();
        }
        return $host === self::hub() || in_array($host, self::workerHosts(), true);
    }

    /** Fetch $url into $file (atomic, 200 only). Returns the HTTP code (0 = network error / refused). */
    public static function fetchTo(string $url, string $file, int $timeout): int
    {
        $code = 0;
        if (!self::allowed($url)) {
            return 0; // old cache entries (warmer) pointing at a self-call are never fetched again
        }
        if (function_exists('curl_init')) {
            // curl: separate connect timeout (BRIDGE_CONNECT_TIMEOUT, 2 s) + hard total timeout (stream 'timeout' is per read).
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => max(1, (int) (getenv('BRIDGE_CONNECT_TIMEOUT') ?: 2)),
                CURLOPT_TIMEOUT => max(1, $timeout),
                CURLOPT_NOSIGNAL => true,
                CURLOPT_ENCODING => '',
                // X-YS-Bridge: public/index.php answers 508 to any request carrying it (recursion refused).
                CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-YS-Bridge: 1'],
                CURLOPT_USERAGENT => 'php-theme-bridge/1',
            ]);
            $body = curl_exec($ch);
            $code = is_string($body) ? (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE) : 0;
            curl_close($ch);
        } else {
            $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true,
                'header' => "Accept: application/json\r\nX-YS-Bridge: 1\r\nUser-Agent: php-theme-bridge/1\r\n"]]);
            $body = @file_get_contents($url, false, $ctx);
            foreach (($http_response_header ?? []) as $h) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $h, $m) === 1) {
                    $code = (int) $m[1];
                }
            }
        }
        $json = is_string($body) ? json_decode($body, true) : null;
        if ($code === 200 && is_array($json) && self::degraded($url, $json, $file)) {
            return 503; // keep the good copy; the Worker answered with its RSS-only / empty fallback
        }
        if ($code === 200 && is_array($json)) {
            @mkdir(dirname($file), 0775, true);
            $tmp = $file . '.' . getmypid() . '.tmp';
            if (@file_put_contents($tmp, $body) !== false) {
                @rename($tmp, $file);
            }
            return 200;
        }
        return $code === 200 ? 502 : $code;
    }

    /**
     * The hybrid API sometimes answers the first page with an empty or RSS-only list (DB slow upstream).
     * Such an answer must not replace a copy that had HM items, unless that copy is older than 30 min.
     * @param array<string, mixed> $new
     */
    private static function degraded(string $url, array $new, string $file): bool
    {
        if (!str_contains($url, '/api/news/hybrid?') || !str_contains($url, 'offset=0') || !is_file($file)
            || time() - (int) filemtime($file) > 1800) {
            return false;
        }
        $db = static function (array $d): int {
            $n = 0;
            foreach ((is_array($d['items'] ?? null) ? $d['items'] : []) as $it) {
                $n += is_array($it) && ($it['source'] ?? '') === 'db' ? 1 : 0;
            }
            return $n;
        };
        $old = self::decode($file);
        return is_array($old) && $db($new) === 0 && $db($old) > 0;
    }

    /** @return array<string, mixed>|null */
    private static function decode(string $file): ?array
    {
        $d = json_decode((string) @file_get_contents($file), true);
        return is_array($d) ? $d : null;
    }
}
