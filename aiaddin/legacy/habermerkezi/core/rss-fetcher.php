<?php
/**
 * AhenkPress — RSS/Atom Besleme Çekici
 * Kaynak ilham: Ahenk Ai İçerik Robotu v3.12.3
 */
defined('ROOT') or die();

class RssFetcher {

    const UA = 'Mozilla/5.0 (compatible; AhenkPress/' . AP_VERSION . '; +https://ahenkpress.com)';
    const TIMEOUT = 30;

    /** RSS satırı ayrıştır: "https://url | kategori-slug" */
    public static function parseLine(string $line): ?array {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') return null;
        $parts = array_map('trim', explode('|', $line, 2));
        return [
            'url'      => filter_var($parts[0], FILTER_SANITIZE_URL),
            'category' => isset($parts[1]) ? preg_replace('/[^a-z0-9\-]/', '-', mb_strtolower($parts[1])) : '',
        ];
    }

    /** RSS/Atom URL'inden öğeleri çek (file_get_contents → cURL yedek) */
    public function fetch(string $url): array {
        $url = filter_var(trim($url), FILTER_SANITIZE_URL);
        if (!$url) return [];

        $body = $this->httpGet($url);
        if ($body === null || $body === '') {
            error_log("[AhenkPress RSS] Çekilemedi: {$url}");
            return [];
        }
        return $this->parse($body, $url);
    }

    /** HTTP GET: önce file_get_contents, yoksa cURL */
    private function httpGet(string $url): ?string {
        $headers = [
            'User-Agent: ' . self::UA,
            'Accept: application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
            'Accept-Language: tr-TR,tr;q=0.9,en;q=0.5',
        ];

        // ── Yöntem 1: file_get_contents ──────────────────────────
        if (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create([
                'http' => [
                    'method'  => 'GET',
                    'header'  => implode("\r\n", $headers),
                    'timeout' => self::TIMEOUT,
                    'ignore_errors' => true,
                ],
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
            ]);
            $body = @file_get_contents($url, false, $ctx);
            if ($body !== false && $body !== '') return $body;
        }

        // ── Yöntem 2: cURL ───────────────────────────────────────
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS      => 5,
                CURLOPT_TIMEOUT        => self::TIMEOUT,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_ENCODING       => '',
            ]);
            $body = curl_exec($ch);
            $err  = curl_error($ch);
            curl_close($ch);
            if ($body !== false && $body !== '') return $body;
            if ($err) error_log("[AhenkPress RSS cURL] {$err}: {$url}");
        }

        return null;
    }

    /** XML parse */
    private function parse(string $xml, string $sourceUrl): array {
        libxml_use_internal_errors(true);
        $doc = @simplexml_load_string($xml);
        if (!$doc) {
            error_log("[AhenkPress RSS] XML parse hatası: {$sourceUrl}");
            return [];
        }

        $items = [];
        $limit = (int)DB::setting('rss_max_per_source', 10);
        $count = 0;

        // RSS 2.0
        if (isset($doc->channel->item)) {
            foreach ($doc->channel->item as $item) {
                if ($count >= $limit) break;
                $entry = $this->extractRssItem($item, $sourceUrl);
                if ($entry) { $items[] = $entry; $count++; }
            }
        }
        // Atom
        elseif (isset($doc->entry)) {
            foreach ($doc->entry as $item) {
                if ($count >= $limit) break;
                $entry = $this->extractAtomItem($item, $sourceUrl);
                if ($entry) { $items[] = $entry; $count++; }
            }
        }

        return $items;
    }

    private function extractRssItem($item, string $source): ?array {
        $title   = trim((string)($item->title ?? ''));
        $link    = trim((string)($item->link ?? ''));
        if (!$title || !$link) return null;

        $content = (string)($item->children('content', true)->encoded ?? $item->description ?? '');
        $content = $this->cleanHtml($content);
        $guid    = trim((string)($item->guid ?? $link));
        $pubDate = trim((string)($item->pubDate ?? ''));
        $image   = $this->extractImageFromItem($item, $content);

        // Kategori ve etiketler
        $cats = [];
        if (isset($item->category)) {
            foreach ((array)$item->category as $cat) {
                $cname = trim((string)$cat);
                if ($cname) $cats[] = $cname;
            }
        }

        return [
            'title'    => $title,
            'content'  => $content,
            'link'     => $link,
            'guid'     => $guid,
            'pubDate'  => $pubDate ? date('Y-m-d H:i:s', strtotime($pubDate)) : date('Y-m-d H:i:s'),
            'image'    => $image,
            'source'   => $source,
            'category' => '',
            'tags'     => $cats,
        ];
    }

    private function extractAtomItem($item, string $source): ?array {
        $ns     = $item->getNamespaces(true);
        $title  = trim((string)($item->title ?? ''));
        $link   = '';
        foreach ($item->link as $l) {
            $attrs = $l->attributes();
            if (!isset($attrs['rel']) || $attrs['rel'] == 'alternate') {
                $link = (string)($attrs['href'] ?? '');
                break;
            }
        }
        if (!$title || !$link) return null;

        $content = (string)($item->content ?? $item->summary ?? '');
        $content = $this->cleanHtml($content);
        $guid    = (string)($item->id ?? $link);
        $pubDate = (string)($item->published ?? $item->updated ?? '');
        $image   = $this->extractImageFromItem($item, $content);

        return [
            'title'    => $title,
            'content'  => $content,
            'link'     => $link,
            'guid'     => $guid,
            'pubDate'  => $pubDate ? date('Y-m-d H:i:s', strtotime($pubDate)) : date('Y-m-d H:i:s'),
            'image'    => $image,
            'source'   => $source,
            'category' => '',
            'tags'     => [],
        ];
    }

    private function extractImageFromItem($item, string $content): string {
        // enclosure
        if (isset($item->enclosure)) {
            $enc = $item->enclosure->attributes();
            $url = (string)($enc['url'] ?? '');
            if ($url && strpos($url, 'http') === 0) return $url;
        }
        // media:content
        $media = $item->children('media', true);
        if (isset($media->content)) {
            $url = (string)($media->content->attributes()['url'] ?? '');
            if ($url) return $url;
        }
        // içerikten img çek
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $content, $m)) {
            return $m[1];
        }
        return '';
    }

    private function cleanHtml(string $html): string {
        $html = preg_replace('/<script[^>]*>.*?<\/script>/si', '', $html);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/si', '', $html);
        $html = strip_tags($html, '<p><br><strong><em><ul><ol><li><a><h2><h3><h4><blockquote>');
        return trim($html);
    }
}

/**
 * Tekrar Kontrolcüsü — DB tablosuna göre mükerrer haberleri engeller
 */
class DuplicateChecker {

    private string $table;

    public function __construct() {
        $this->table = DB::prefix() . 'rss_processed';
        $this->ensureTable();
    }

    /** Tablo yoksa oluştur (eski kurulumlarla uyumluluk) */
    private function ensureTable(): void {
        try {
            $pdo  = DB::pdo();
            $tbl  = $this->table;
            $exists = $pdo->query("SHOW TABLES LIKE '{$tbl}'")->fetchColumn();
            if (!$exists) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS `{$tbl}` (
                    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `source_hash`   CHAR(32)     NOT NULL,
                    `source_guid`   VARCHAR(500) NOT NULL DEFAULT '',
                    `source_url`    VARCHAR(500) NOT NULL DEFAULT '',
                    `post_id`       INT UNSIGNED NOT NULL DEFAULT 0,
                    `campaign_slug` VARCHAR(100) NOT NULL DEFAULT '',
                    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_hash` (`source_hash`),
                    KEY `idx_campaign` (`campaign_slug`),
                    KEY `idx_created`  (`created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            }
        } catch (\Throwable) {}
    }

    public function isDuplicate(string $guid, string $link): bool {
        $hash = $this->makeHash($guid, $link);
        try {
            $n = (int)DB::queryValue("SELECT COUNT(*) FROM `{$this->table}` WHERE source_hash=?", [$hash]);
            return $n > 0;
        } catch (\Throwable) { return false; }
    }

    public function markProcessed(string $guid, string $link, int $postId = 0, string $campaign = ''): void {
        $hash = $this->makeHash($guid, $link);
        try {
            DB::query(
                "INSERT IGNORE INTO `{$this->table}` (source_hash, source_guid, source_url, post_id, campaign_slug, created_at)
                 VALUES (?,?,?,?,?,NOW())",
                [$hash, mb_substr($guid,0,500), mb_substr($link,0,500), $postId, $campaign]
            );
        } catch (\Throwable) {}
    }

    public function getRecentByCampaign(string $campaign, int $limit = 10): array {
        try {
            return DB::query(
                "SELECT rp.post_id, p.title FROM `{$this->table}` rp
                 JOIN `{p}posts` p ON p.id=rp.post_id
                 WHERE rp.campaign_slug=? AND rp.post_id>0
                 ORDER BY rp.created_at DESC LIMIT ?",
                [$campaign, $limit]
            );
        } catch (\Throwable) { return []; }
    }

    public function cleanup(int $daysOld = 30): int {
        try {
            return DB::execute(
                "DELETE FROM `{$this->table}` WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
                [$daysOld]
            );
        } catch (\Throwable) { return 0; }
    }

    private function makeHash(string $guid, string $link): string {
        $key = $guid ?: $link;
        $key = preg_replace('/[?#].*/','', $key);
        return md5($key);
    }
}
