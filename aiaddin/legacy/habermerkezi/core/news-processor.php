<?php
/**
 * AhenkPress — Haber Isleyici (v2 — tam kampanya destegi)
 * RSS ogelerini alir, AI ile isler, veritabanina kaydeder.
 * Gorseller: Sunucuya indirilmez. RSS kaynagindaki dis URL dogrudan saklanir.
 */
defined('ROOT') or die();

class NewsProcessor {

    private AIClient         $ai;
    private DuplicateChecker $checker;
    private string           $campaignSlug      = '';
    private string           $forcedCategory    = '';
    private array            $log               = [];

    // Kampanya ayarlari
    private array  $campaignTags      = [];
    private bool   $campaignBreaking  = false;
    private array  $breakingWords     = ['son dakika','acil','flas','breaking'];
    private bool   $downloadImages    = false;
    private int    $minWords          = 0;
    private int    $maxDays           = 0;

    public function __construct(AIClient $ai, DuplicateChecker $checker) {
        $this->ai      = $ai;
        $this->checker = $checker;
        $this->ensurePostsColumns();
    }

    private static bool $postsMigrated = false;
    private function ensurePostsColumns(): void {
        if (self::$postsMigrated) return;
        self::$postsMigrated = true;
        try {
            $pdo  = DB::pdo();
            $tbl  = DB::prefix() . 'posts';
            if (!$pdo->query("SHOW TABLES LIKE '{$tbl}'")->fetchColumn()) return;
            $cols = array_column(
                $pdo->query("SHOW COLUMNS FROM `{$tbl}`")->fetchAll(\PDO::FETCH_ASSOC), 'Field'
            );
            $need = [
                'tags'         => "TEXT",
                'source_url'   => "VARCHAR(500) NOT NULL DEFAULT ''",
                'source_name'  => "VARCHAR(100) NOT NULL DEFAULT ''",
                'ai_generated' => "TINYINT(1) NOT NULL DEFAULT 0",
                'cover_image'  => "VARCHAR(255) NOT NULL DEFAULT ''",
                'excerpt'      => "TEXT",
                'is_breaking'  => "TINYINT(1) NOT NULL DEFAULT 0",
                'author_name'  => "VARCHAR(100) NOT NULL DEFAULT ''",
            ];
            foreach ($need as $col => $def) {
                if (!in_array($col, $cols, true)) {
                    $pdo->exec("ALTER TABLE `{$tbl}` ADD COLUMN `{$col}` {$def}");
                }
            }
        } catch (\Throwable $e) {}
    }

    public function setCampaign(string $slug, string $forcedCategory = ''): void {
        $this->campaignSlug   = $slug;
        $this->forcedCategory = $forcedCategory;
    }

    /**
     * Tam kampanya nesnesini ayarla (yeni sistem).
     */
    public function setCampaignData(array $campaign): void {
        $this->campaignSlug   = $campaign['slug'] ?? $campaign['name'] ?? '';
        // Kategori slug'i belirle
        $catSlug = $campaign['category_slug'] ?? '';
        if (!$catSlug && (int)($campaign['category_id'] ?? 0)) {
            try {
                $r = DB::queryRow("SELECT slug FROM `{p}categories` WHERE id=?", [(int)$campaign['category_id']]);
                $catSlug = $r['slug'] ?? '';
            } catch (\Throwable $e) {}
        }
        $this->forcedCategory = $catSlug;
        // Diger ayarlar
        $this->campaignTags   = array_filter(array_map('trim', explode(',', $campaign['tags'] ?? '')));
        $this->campaignBreaking = (bool)($campaign['is_breaking'] ?? 0);
        $bw = trim($campaign['breaking_words'] ?? 'son dakika,acil,flas,breaking');
        $this->breakingWords  = $bw ? array_filter(array_map('trim', explode(',', $bw))) : [];
        $this->downloadImages = (bool)($campaign['download_images'] ?? 0);
        $this->minWords       = max(0, (int)($campaign['min_words'] ?? 0));
        $this->maxDays        = max(0, (int)($campaign['max_days'] ?? 0));
    }

    /** Tek RSS ogesini isle ve kaydet. Doner: post_id veya 0. */
    public function process(array $item): int {
        $guid = $item['guid'] ?? $item['link'];
        $link = $item['link'];

        // Tarih filtresi
        if ($this->maxDays > 0 && !empty($item['pubDate'])) {
            $pubTs = strtotime($item['pubDate']);
            if ($pubTs && $pubTs < (time() - $this->maxDays * 86400)) {
                $this->log[] = ['skip', "Cok eski atlandi: {$item['title']}"];
                return 0;
            }
        }

        // Mukerrer kontrolu
        if ($this->checker->isDuplicate($guid, $link)) {
            $this->log[] = ['skip', "Mukerrer atlandi: {$item['title']}"];
            return 0;
        }

        $title   = $item['title'];
        $content = $item['content'] ?: $item['title'];
        $excerpt = '';
        $aiTags  = [];
        $aiCat   = '';
        $aiGenerated = 0;

        // Min kelime kontrolu
        if ($this->minWords > 0) {
            $wordCount = str_word_count(strip_tags($content));
            if ($wordCount < $this->minWords) {
                $this->log[] = ['skip', "Az kelime ({$wordCount}<{$this->minWords}): {$item['title']}"];
                return 0;
            }
        }

        // AI ile isle
        if ($this->ai->isConfigured()) {
            $data = $this->ai->uniquifyNews($title, $content);
            if ($data) {
                $title       = $data['baslik']   ?? $title;
                $content     = $data['icerik']   ?? $content;
                $excerpt     = $data['ozet']     ?? '';
                $aiTags      = (array)($data['etiketler'] ?? []);
                $aiCat       = $data['kategori'] ?? '';
                $aiGenerated = 1;
            }
        }

        // Son dakika kontrolu
        $isBreaking = $this->campaignBreaking;
        if (!$isBreaking && !empty($this->breakingWords)) {
            $titleLower = mb_strtolower($title, 'UTF-8');
            foreach ($this->breakingWords as $word) {
                if (mb_stripos($titleLower, mb_strtolower($word, 'UTF-8')) !== false) {
                    $isBreaking = true;
                    break;
                }
            }
        }

        // Kategori belirle
        $catId = $this->resolveCategory($this->forcedCategory ?: $aiCat ?: ($item['category'] ?? ''));

        // Etiketleri birlestir
        $allTags   = array_unique(array_merge($this->campaignTags, $aiTags, $item['tags'] ?? []));
        $tagsStr   = implode(',', array_slice($allTags, 0, 8));

        // Gorsel
        $coverImage = $this->sanitizeImageUrl($item['image'] ?? '');

        // Slug uret
        $slug = $this->makeUniqueSlug($title);

        // Kaynak adi
        $sourceName = '';
        if ($item['source'] ?? '') {
            $parsed     = parse_url($item['source']);
            $sourceName = $parsed['host'] ?? '';
        }

        $now = date('Y-m-d H:i:s');
        try {
            DB::execute(
                "INSERT INTO `{p}posts`
                 (post_type, title, slug, content, excerpt, cover_image, category_id, tags,
                  status, source_url, source_name, ai_generated, is_breaking, created_at, updated_at, published_at)
                 VALUES ('news',?,?,?,?,?,?,?,'published',?,?,?,?,?,?,?)",
                [
                    $title,
                    $slug,
                    $this->wrapContent($content, $link),
                    $excerpt,
                    $coverImage,
                    $catId,
                    $tagsStr,
                    $link,
                    $sourceName,
                    $aiGenerated,
                    $isBreaking ? 1 : 0,
                    $now,
                    $now,
                    $item['pubDate'] ?? $now,
                ]
            );
            $postId = (int)DB::lastInsertId();
            $this->checker->markProcessed($guid, $link, $postId, $this->campaignSlug);
            $this->log[] = ['ok', "Eklendi [{$postId}]: {$title}"];
            return $postId;
        } catch (\Throwable $e) {
            $this->log[] = ['error', "DB Hata: " . $e->getMessage()];
            return 0;
        }
    }

    /** Birden fazla RSS ogesini toplu isle */
    public function processMany(array $items, int $maxNew = 20): array {
        $added   = 0;
        $skipped = 0;
        foreach ($items as $item) {
            if ($added >= $maxNew) break;
            $pid = $this->process($item);
            if ($pid > 0) $added++;
            else $skipped++;
            usleep(200000); // 0.2s bekleme
        }
        return ['added' => $added, 'skipped' => $skipped, 'log' => $this->log];
    }

    public function getLog(): array { return $this->log; }

    // ─── Yardimcilar ──────────────────────────────────────────────────────

    private function sanitizeImageUrl(string $url): string {
        $url = trim($url);
        if ($url === '') return '';
        if (!preg_match('#^https?://#i', $url)) return '';
        return mb_substr($url, 0, 1000);
    }

    private function resolveCategory(string $catSlug): int {
        if (!$catSlug) return 0;
        $catSlug = preg_replace('/[^a-z0-9\-]/', '-', mb_strtolower(strtr($catSlug, [
            'ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u',
            'Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u',
        ])));
        try {
            $r = DB::queryRow("SELECT id FROM `{p}categories` WHERE slug=? LIMIT 1", [$catSlug]);
            if ($r) return (int)$r['id'];
            DB::execute(
                "INSERT IGNORE INTO `{p}categories` (name,slug,active,created_at) VALUES (?,?,1,NOW())",
                [mb_convert_case($catSlug, MB_CASE_TITLE, 'UTF-8'), $catSlug]
            );
            return (int)DB::lastInsertId() ?: 0;
        } catch (\Throwable $e) { return 0; }
    }

    private function makeUniqueSlug(string $title): string {
        $base = preg_replace('/-+/', '-', trim(preg_replace('/[^a-z0-9\-]/', '-',
            mb_strtolower(strtr($title, [
                'ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u',
                'Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u',
            ]))), '-'));
        $base  = mb_substr($base, 0, 80);
        $slug  = $base;
        $i     = 1;
        while (true) {
            try { $n = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE slug=?", [$slug]); if (!$n) break; }
            catch (\Throwable $e) { break; }
            $slug = $base . '-' . $i++;
        }
        return $slug ?: 'haber-' . time();
    }

    private function wrapContent(string $content, string $link): string {
        if (!str_starts_with(ltrim($content), '<')) {
            $content = '<p>' . implode('</p><p>', array_filter(
                array_map('trim', explode("\n", $content))
            )) . '</p>';
        }
        return $content;
    }
}
