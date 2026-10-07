<?php

declare(strict_types=1);

namespace Yenisafak;

use PDO;

final class Repository
{
    /** Categories that only carry foreign-language wire copy. Never shown. */
    public const EXCLUDED_CATEGORIES = ['global'];

    /**
     * Title-based Turkish language check (portal_rss_items.lang is always 'tr', so it
     * cannot be trusted). A title passes when it has a Turkish-only letter (ğ ı İ ş),
     * or Turkish words/suffixes without common English/European stop words.
     */
    private const TR_TITLE = <<<'SQL'
(%1$s ~ '[ğĞıİşŞ]' OR ((%1$s ~ '[çÇöÖüÜ]' OR %1$s ~* '\m(ve|bir|ile|için|gibi|olarak|sonra|kadar|daha|yeni|ilk|hangi|bugün|türkiye|ankara|istanbul|izmir|kktc)\M' OR %1$s ~* '[''’](da|de|ta|te|dan|den|tan|ten|in|nin|nun|nün|ye|ya|yi|yu|yü|e|a|ler|lar)\M') AND %1$s !~* '\m(the|and|of|to|for|with|says|is|are|on|from|after|over|by|into|about|will|has|have|its|their|der|die|das|und|le|la|les|des|du|est|une|el|los|las|del|em|com|para|não|uma|os|ao|het|een|och|att|som|med|för|på|är|og|til|w|na|się)\M'))
SQL;

    /** Foreign wire services kept out even if a title slips through the language check. */
    private const BLOCKED_SOURCES = <<<'SQL'
lower(%1$s) NOT IN ('bbc','cnn','edition','reuters','reutersagency','apnews','ap','theguardian','guardian','aljazeera','france24','euronews','dw','npr','globalnews','abc','cbc','nytimes','washingtonpost','nbcnews','thehindu','timesofindia','channelnewsasia','japantimes','koreaherald','scmp','tass','rnz','haaretz','allafrica','premiumtimesng','dawn','bangkokpost','tehrantimes','egyptindependent','arabnews','xinhuanet','middleeasteye','lemonde','oglobo','nos','nrk','svt','polsatnews','telemundo','spiegel','en','www3','today','un')
SQL;

    /** @var list<int> RSS pools of other sites this site reuses (see setRssShared). */
    private array $rssShared = [];

    private ?LiveBridge $bridge = null;

    public function __construct(private PDO $pdo)
    {
    }

    public function setBridge(?LiveBridge $bridge): void
    {
        $this->bridge = $bridge;
    }

    /**
     * Live items first, then theme-DB rows; deduped by slug, then by title/link (Dedupe), newest first.
     * @param list<array<string, mixed>> $db
     * @param list<array<string, mixed>> $live
     * @return list<array<string, mixed>>
     */
    private function mergeLive(array $db, array $live, int $limit, int $offset = 0, bool $sort = true): array
    {
        $live = $this->dropBlocked($live);
        if ($live === []) {
            return array_slice($this->dropBlocked($db), $offset, $limit);
        }
        $seen = [];
        $all = [];
        foreach (array_merge($live, $db) as $s) {
            $k = (string) ($s['slug'] ?? '');
            if ($k === '' || isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $all[] = $s;
        }
        if ($sort) {
            usort($all, static fn (array $a, array $b): int => strcmp(Html::iso((string) $b['publishedAt']), Html::iso((string) $a['publishedAt'])));
        }
        return array_slice(Dedupe::filter($all), $offset, $limit);
    }

    /** @return list<array<string, mixed>> */
    private function live(string $category, int $n): array
    {
        try {
            return $this->bridge?->list($category, $n) ?? [];
        } catch (\Throwable) {
            return [];
        }
    }

    /** @param list<array<string, mixed>> $items @return list<array<string, mixed>> */
    private static function recent(array $items, int $days): array
    {
        if ($days <= 0) {
            return $items;
        }
        $min = time() - $days * 86400;
        return array_values(array_filter($items, static fn (array $s): bool => (int) strtotime((string) $s['publishedAt']) >= $min));
    }

    /**
     * RSS items live in one shared table; a site sees its own items plus the
     * pools of the site ids listed here (per-site config, see App::rssSharedFor).
     * @param list<int> $siteIds
     */
    public function setRssShared(array $siteIds): void
    {
        $this->rssShared = array_values(array_unique(array_filter(array_map('intval', $siteIds), static fn (int $id): bool => $id > 0)));
    }

    private function rssScope(): string
    {
        $scope = '(site_id IS NULL OR site_id = :site';
        if ($this->rssShared !== []) {
            // ints only, validated in setRssShared()
            $scope .= ' OR site_id IN (' . implode(',', $this->rssShared) . ')';
        }
        return $scope . ')';
    }

    /**
     * TEPE MANŞET: news the site's editor wrote by hand in HM Editör and marked
     * "manşette göster" / tepe manşet (is_site_manset / is_tepe_manset). RSS imports never
     * qualify. Newest first; $maxAgeDays = 0 keeps them until the editor unflags them.
     * TODO(hm-editor): this reads the editor tables of the shared Neon DB (news.*).
     * When HM Editör exposes its own "tepe manşet" list/API, switch this query to it.
     * @return list<array<string, mixed>>
     */
    public function tepeManset(int $siteId, int $maxAgeDays, int $limit): array
    {
        $sql = 'SELECT n.slug AS public_slug, COALESCE(o.title, n.title) AS title,
                       COALESCE(o.spot, n.spot) AS spot, COALESCE(o.image_url, n.image_url) AS image_url,
                       \'\' AS credit, \'\' AS source_url,
                       COALESCE(c.slug, \'\') AS category_slug, n.created_at AS published_at, n.views,
                       \'news\' AS kind%MI_COL%
                FROM news n
                LEFT JOIN categories c ON c.id = n.category_id
                LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site%MI_JOIN%
                WHERE n.status = \'published\'
                  AND (n.site_id = :site OR n.owner_site_id = :site OR (n.site_id IS NULL AND n.is_tepe_manset))
                  AND (n.is_editor_manual OR COALESCE(n.rss_source_url, \'\') = \'\')
                  AND (n.is_tepe_manset OR n.is_site_manset)';
        if ($maxAgeDays > 0) {
            $sql .= ' AND n.created_at > now() - make_interval(days => ' . min(3650, $maxAgeDays) . ')';
        }
        $sql .= ' ORDER BY n.is_tepe_manset DESC, n.created_at DESC LIMIT :lim';
        $db = $this->mapList($this->withMansetImages($sql, ['site' => $siteId, 'lim' => max(1, min(24, $limit))]));
        $live = array_values(array_filter(self::recent($this->live('', 100), $maxAgeDays),
            static fn (array $s): bool => !empty($s['liveManual']) && !empty($s['liveFeatured'])));
        return $this->mergeLive($db, $live, max(1, min(24, $limit)));
    }

    /**
     * Runs an editor-news manşet query with the AI editor's composed manşet image
     * (hm_ai_manset_images, source_kind='news', per site) joined in; falls back to the
     * plain query while that table is missing or not granted.
     * @param array<string, int> $params
     * @return list<array<string, mixed>>
     */
    private function withMansetImages(string $sql, array $params): array
    {
        $variants = [
            [', mi.manset_image_url, mi.og_image_url',
                "\n                LEFT JOIN hm_ai_manset_images mi ON mi.source_kind = 'news' AND mi.source_id = n.id AND mi.site_id = :site"],
            ['', ''],
        ];
        foreach ($variants as $i => [$col, $join]) {
            try {
                $stmt = $this->pdo->prepare(str_replace(['%MI_COL%', '%MI_JOIN%'], [$col, $join], $sql));
                foreach ($params as $k => $v) {
                    $stmt->bindValue($k, $v, PDO::PARAM_INT);
                }
                $stmt->execute();
                return $stmt->fetchAll();
            } catch (\PDOException $e) {
                if ($i === count($variants) - 1) {
                    throw $e;
                }
            }
        }
        return [];
    }

    /**
     * The site's AI-rewritten manşet news (AI Haber Editörü, read-only view hm_ai_manset_v,
     * flag is_ai_manset). Fills the tepe manşet when the editor has not picked enough.
     * Returns [] while the AI editor tables/view are missing or not granted.
     * @return list<array<string, mixed>>
     */
    public function aiManset(int $siteId, int $maxAgeDays, int $limit): array
    {
        // hm_ai_manset_v only returns published rows (passed the AI editor's checks) with a real photo.
        $sql = 'SELECT public_slug, title, spot, image_url, \'\' AS credit, \'\' AS source_url,
                       category_slug, published_at, 0 AS views, \'ai\' AS kind, image_credit,
                       manset_image_url, og_image_url
                FROM hm_ai_manset_v
                WHERE site_id = :site AND is_ai_manset AND published_at IS NOT NULL
                  AND manset_date >= (now() AT TIME ZONE \'Europe/Istanbul\')::date - 1';
        if ($maxAgeDays > 0) {
            $sql .= ' AND published_at > now() - make_interval(days => ' . min(3650, $maxAgeDays) . ')';
        }
        $sql .= ' ORDER BY published_at DESC, manset_rank ASC NULLS LAST LIMIT :lim';
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
            $stmt->bindValue('lim', max(1, min(24, $limit)), PDO::PARAM_INT);
            $stmt->execute();
            return $this->mapList($stmt->fetchAll());
        } catch (\PDOException) {
            return [];
        }
    }

    /**
     * One AI-rewritten article (/haber/ai-{id}); only the owner site serves it.
     * The original source link is never rendered; only the image credit is shown.
     * @return array<string, mixed>|null
     */
    private function aiStory(int $siteId, int $id): ?array
    {
        try {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM hm_ai_manset_v WHERE id = :id AND site_id = :site LIMIT 1'
            );
            $stmt->execute(['id' => $id, 'site' => $siteId]);
            $row = $stmt->fetch();
        } catch (\PDOException) {
            return null;
        }
        if (!is_array($row)) {
            return null;
        }
        return [
            'kind' => 'ai',
            'slug' => (string) $row['public_slug'],
            'title' => (string) $row['title'],
            'spot' => Html::text((string) ($row['spot'] ?? '')),
            'body' => (string) ($row['content_html'] ?? ''),
            'image' => self::media((string) ($row['image_url'] ?? '')),
            'imageCredit' => trim((string) ($row['image_credit'] ?? '')),
            'credit' => '',
            'sourceUrl' => '',
            'category' => Modules::slug((string) ($row['category_slug'] ?? '')),
            'publishedAt' => (string) $row['published_at'],
            'updatedAt' => (string) $row['published_at'],
            'authorName' => '',
            'mansetWide' => self::httpOnly((string) ($row['manset_image_url'] ?? '')),
            'ogImage' => self::httpOnly((string) ($row['og_image_url'] ?? '')),
            // Developing story: the site's earlier article of the same event (site-relative path).
            'previousTitle' => !empty($row['is_development']) ? trim((string) ($row['previous_title'] ?? '')) : '',
            'previousPath' => !empty($row['is_development']) && preg_match('#^/haber/[A-Za-z0-9._~%-]+$#', (string) ($row['previous_path'] ?? '')) === 1
                ? (string) $row['previous_path'] : '',
        ];
    }

    private static function httpOnly(string $url): string
    {
        $url = trim($url);
        return preg_match('#^https?://#i', $url) === 1 ? $url : '';
    }

    /** SQL predicate: row is Turkish-language and not from an excluded category/source. */
    private function turkishOnly(string $title, string $category, string $source): string
    {
        $cats = implode(',', array_map(static fn (string $c): string => "'" . $c . "'", self::EXCLUDED_CATEGORIES));
        return '(' . sprintf(self::TR_TITLE, $title)
            . ' AND COALESCE(' . $category . ", '') NOT IN (" . $cats . ')'
            . ' AND ' . sprintf(self::BLOCKED_SOURCES, 'COALESCE(' . $source . ", '')") . ')';
    }

    /** @return array<string, mixed>|null */
    public function siteForHost(string $host): ?array
    {
        $host = strtolower(trim($host));
        $host = (string) preg_replace('/:\d+$/', '', $host);
        $bare = (string) preg_replace('/^www\./', '', $host);
        if ($bare === 'turkatahaber.com' || $bare === 'ahenk.net.tr') {
            $forced = $this->siteBySlug('turkatahaber');
            if ($forced !== null) {
                return $forced;
            }
        }
        $stmt = $this->pdo->prepare(
            'SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json
             FROM hm_news_sites
             WHERE active = true
               AND (
                 lower(domain) = :host OR lower(domain) = :bare
                 OR lower(coalesce(domain2, \'\')) = :host OR lower(coalesce(domain2, \'\')) = :bare
                 OR lower(coalesce(domain3, \'\')) = :host OR lower(coalesce(domain3, \'\')) = :bare
               )
             LIMIT 1'
        );
        $stmt->execute(['host' => $host, 'bare' => $bare]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function siteBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json
             FROM hm_news_sites WHERE active = true AND slug = :slug LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return list<array{slug: string, name: string}> */
    public function categories(int $siteId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT slug, name FROM categories
             WHERE exclusive_site_id IS NULL OR exclusive_site_id = :site
             ORDER BY sort_order ASC, name ASC'
        );
        $stmt->execute(['site' => $siteId]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $slug = Modules::slug((string) $row['slug']);
            if ($slug === '' || in_array($slug, self::EXCLUDED_CATEGORIES, true)) {
                continue;
            }
            $out[] = ['slug' => $slug, 'name' => (string) $row['name']];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    public function stories(int $siteId, string $category, int $limit, int $offset = 0): array
    {
        $limit = max(1, min(60, $limit));
        $offset = max(0, $offset);
        $live = $this->bridge !== null ? $this->live($category, min(100, $offset + $limit)) : [];
        $sql = $this->storySql($category !== '');
        $sql .= ' ORDER BY published_at DESC LIMIT :lim OFFSET :off';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        if ($category !== '') {
            $stmt->bindValue('cat', $category);
        }
        $stmt->bindValue('lim', $live === [] ? $limit : $offset + $limit, PDO::PARAM_INT);
        $stmt->bindValue('off', $live === [] ? $offset : 0, PDO::PARAM_INT);
        $stmt->execute();
        $db = $this->mapList($stmt->fetchAll());
        return $live === [] ? $db : $this->mergeLive($db, $live, $limit, $offset);
    }

    /**
     * Stories of the last $days days, newest first (no bridge merge). Topic priority candidates (see Topic::extend()).
     * @return list<array<string, mixed>>
     */
    public function recentStories(int $siteId, int $days, int $limit): array
    {
        try {
            $stmt = $this->pdo->prepare($this->storySql(false) . ' WHERE published_at > now() - make_interval(days => :days) ORDER BY published_at DESC LIMIT :lim');
            $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
            $stmt->bindValue('days', max(1, min(7, $days)), PDO::PARAM_INT);
            $stmt->bindValue('lim', max(1, min(500, $limit)), PDO::PARAM_INT);
            $stmt->execute();
            return $this->mapList($stmt->fetchAll());
        } catch (\PDOException) {
            return [];
        }
    }

    /**
     * Latest stories for several categories in one round trip.
     * @param list<string> $slugs
     * @return array<string, list<array<string, mixed>>>
     */
    public function latestPerCategory(int $siteId, array $slugs, int $perCategory): array
    {
        $slugs = array_values(array_filter($slugs, static fn (string $s): bool => $s !== ''));
        if ($slugs === []) {
            return [];
        }
        $in = [];
        foreach ($slugs as $i => $slug) {
            $in[] = ':c' . $i;
        }
        $sql = 'SELECT * FROM (SELECT s.*, row_number() OVER (PARTITION BY category_slug ORDER BY published_at DESC) AS rn FROM ('
            . $this->storySql(false) . ') s WHERE category_slug IN (' . implode(',', $in) . ')) ranked WHERE rn <= :per ORDER BY published_at DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        foreach ($slugs as $i => $slug) {
            $stmt->bindValue('c' . $i, $slug);
        }
        $stmt->bindValue('per', max(1, min(40, $perCategory)), PDO::PARAM_INT);
        $stmt->execute();
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $story = $this->mapStory($row);
            if ($this->isBlocked($story)) {
                continue;
            }
            $out[$story['category']][] = $story;
        }
        if ($this->bridge !== null) {
            $per = max(1, min(40, $perCategory));
            foreach ($slugs as $slug) {
                $live = $this->live($slug, $per);
                if ($live !== []) {
                    $out[$slug] = $this->mergeLive($out[$slug] ?? [], $live, $per);
                }
            }
        }
        return array_map([Dedupe::class, 'filter'], $out);
    }

    /**
     * Stories the editor flagged for the manşet in the panel (news.is_tepe_manset,
     * news.is_featured, news.is_site_manset), newest first, limited to recent ones.
     * @return list<array<string, mixed>>
     */
    public function mansetPicks(int $siteId, int $maxAgeDays, int $limit): array
    {
        $sql = 'SELECT n.slug AS public_slug, COALESCE(o.title, n.title) AS title,
                       COALESCE(o.spot, n.spot) AS spot, COALESCE(o.image_url, n.image_url) AS image_url,
                       \'\' AS credit, COALESCE(n.rss_source_url, \'\') AS source_url,
                       COALESCE(c.slug, \'\') AS category_slug, n.created_at AS published_at, n.views,
                       \'news\' AS kind%MI_COL%
                FROM news n
                LEFT JOIN categories c ON c.id = n.category_id
                LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site%MI_JOIN%
                WHERE n.status = \'published\'
                  AND (n.site_id IS NULL OR n.site_id = :site OR n.owner_site_id = :site)
                  AND (n.is_tepe_manset OR n.is_featured OR n.is_site_manset)
                  AND n.created_at > now() - make_interval(days => :age)
                  AND (COALESCE(n.rss_source_url, \'\') = \'\' OR ' . $this->turkishOnly('COALESCE(o.title, n.title)', 'c.slug', "''") . ')
                ORDER BY n.is_tepe_manset DESC, n.created_at DESC
                LIMIT :lim';
        $db = $this->mapList($this->withMansetImages($sql, [
            'site' => $siteId, 'age' => max(1, min(365, $maxAgeDays)), 'lim' => max(1, min(24, $limit)),
        ]));
        $live = array_values(array_filter(self::recent($this->live('', 100), max(1, min(365, $maxAgeDays))),
            static fn (array $s): bool => !empty($s['liveFeatured'])));
        return $this->mergeLive($db, $live, max(1, min(24, $limit)));
    }

    /**
     * ÖZEL HABER: every news item the site's own editor added by hand in HM Editör
     * (any category), newest first. RSS imports are excluded.
     * TODO(hm-editor): same source as tepeManset(); switch when HM Editör has an API.
     * @return list<array<string, mixed>>
     */
    public function editorNews(int $siteId, int $limit, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT n.slug AS public_slug, COALESCE(o.title, n.title) AS title,
                    COALESCE(o.spot, n.spot) AS spot, COALESCE(o.image_url, n.image_url) AS image_url,
                    \'\' AS credit, \'\' AS source_url,
                    COALESCE(c.slug, \'\') AS category_slug, n.created_at AS published_at, n.views,
                    \'news\' AS kind
             FROM news n
             LEFT JOIN categories c ON c.id = n.category_id
             LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site
             WHERE n.status = \'published\'
               AND (n.site_id = :site OR n.owner_site_id = :site)
               AND (n.is_editor_manual OR COALESCE(n.rss_source_url, \'\') = \'\')
             ORDER BY n.created_at DESC
             LIMIT :lim OFFSET :off'
        );
        $live = array_values(array_filter($this->live('', 100), static fn (array $s): bool => !empty($s['liveManual'])));
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('lim', $live === [] ? max(1, min(60, $limit)) : max(1, min(60, $limit)) + max(0, $offset), PDO::PARAM_INT);
        $stmt->bindValue('off', $live === [] ? max(0, $offset) : 0, PDO::PARAM_INT);
        $stmt->execute();
        $db = $this->mapList($stmt->fetchAll());
        return $live === [] ? $db : $this->mergeLive($db, $live, max(1, min(60, $limit)), max(0, $offset));
    }

    /** Title search over the same Turkish-only story set. @return list<array<string, mixed>> */
    public function search(int $siteId, string $query, int $limit): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 2) {
            return [];
        }
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
        $stmt = $this->pdo->prepare($this->storySql(false) . ' WHERE title ILIKE :q ORDER BY published_at DESC LIMIT :lim');
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('q', $like);
        $stmt->bindValue('lim', max(1, min(60, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        return $this->mapList($stmt->fetchAll());
    }

    /**
     * Story by slug; null (404) when the site's block rule matches (title, spot or body).
     * @return array<string, mixed>|null
     */
    public function story(int $siteId, string $slug): ?array
    {
        $story = $this->storyRaw($siteId, $slug);
        if (is_array($story) && !isset($story['redirect']) && !isset($story['unavailable'])
            && $this->isBlocked($story, true)) {
            return null;
        }
        return $story;
    }

    /** @return array<string, mixed>|null */
    private function storyRaw(int $siteId, string $slug): ?array
    {
        if (preg_match('/^ai-(\d+)$/', $slug, $m) === 1) {
            return $this->aiStory($siteId, (int) $m[1]);
        }
        if (preg_match('/^rss-(\d+)$/', $slug, $m) === 1) {
            $keep = $this->rssHidden($siteId)[(int) $m[1]] ?? null;
            if ($keep !== null) {
                // Hidden duplicate: the page points (301) to the earliest copy.
                return ['redirect' => 'rss-' . $keep];
            }
            $stmt = $this->pdo->prepare(
                'SELECT id, title, spot, content_html, image_url, source_name, link, category_slug, published_at
                 FROM portal_rss_items
                 WHERE id = :id AND ' . $this->rssScope() . '
                   AND ' . $this->turkishOnly('title', 'category_slug', 'source_name') . '
                 LIMIT 1'
            );
            $stmt->execute(['id' => (int) $m[1], 'site' => $siteId]);
            $row = $stmt->fetch();
            if (!is_array($row)) {
                return null;
            }
            return [
                'kind' => 'rss',
                'slug' => 'rss-' . (int) $row['id'],
                'title' => (string) $row['title'],
                'spot' => Html::text((string) ($row['spot'] ?? '')),
                'body' => (string) ($row['content_html'] ?? ''),
                'image' => self::media((string) ($row['image_url'] ?? '')),
                'credit' => (string) ($row['source_name'] ?? ''),
                'sourceUrl' => $this->httpUrl((string) ($row['link'] ?? '')),
                'category' => Modules::slug((string) $row['category_slug']),
                'publishedAt' => (string) $row['published_at'],
                'authorName' => '',
            ];
        }

        // A site's own column wins over a network-wide news copy with the same slug.
        $column = $this->column($siteId, $slug);
        if ($column !== null) {
            return $column;
        }
        // Renamed/replaced column (hm_makale_redirects; network column slugs end in -YYYYMMDD): 301 to the site's live copy.
        if (preg_match('/-\d{8}(?:-\d+)?$/', $slug) === 1) {
            $to = $this->columnRedirect($siteId, $slug);
            if ($to !== null) {
                return ['redirect' => $to];
            }
        }

        $stmt = $this->pdo->prepare(
            'SELECT n.id, n.slug, n.title, n.spot, n.content, n.image_url, n.rss_source_url,
                    n.is_editor_manual, n.created_at, n.updated_at, c.slug AS category_slug, a.name AS author_name,
                    o.title AS o_title, o.spot AS o_spot, o.content AS o_content, o.image_url AS o_image
             FROM news n
             LEFT JOIN categories c ON c.id = n.category_id
             LEFT JOIN authors a ON a.id = n.author_id
             LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site
             WHERE n.slug = :slug AND n.status = \'published\'
               AND (n.site_id IS NULL OR n.site_id = :site OR n.owner_site_id = :site)
               AND (COALESCE(n.rss_source_url, \'\') = \'\' OR ' . $this->turkishOnly('COALESCE(o.title, n.title)', 'c.slug', "''") . ')
             LIMIT 1'
        );
        $stmt->execute(['site' => $siteId, 'slug' => $slug]);
        $row = $stmt->fetch();
        if (is_array($row)) {
            $source = $this->httpUrl((string) ($row['rss_source_url'] ?? ''));
            $manual = (bool) $row['is_editor_manual'] || $source === '';
            return [
                'kind' => $manual ? 'news' : 'rss',
                'slug' => (string) $row['slug'],
                'title' => (string) ($row['o_title'] ?: $row['title']),
                'spot' => Html::text((string) (($row['o_spot'] ?? '') !== '' && $row['o_spot'] !== null ? $row['o_spot'] : $row['spot'])),
                'body' => (string) ($row['o_content'] ?: $row['content']),
                'image' => self::media((string) ($row['o_image'] ?: $row['image_url'])),
                'credit' => $source !== '' ? $this->hostLabel($source) : '',
                'sourceUrl' => $source,
                'category' => Modules::slug((string) ($row['category_slug'] ?? '')),
                'publishedAt' => (string) $row['created_at'],
                'updatedAt' => (string) ($row['updated_at'] ?? $row['created_at']),
                'authorName' => (string) ($row['author_name'] ?? ''),
            ];
        }

        if ($this->bridge !== null) {
            return $this->bridge->story($slug);
        }
        return $this->legacyStory($slug);
    }

    /**
     * URL continuity after the cutover: the theme's DB copy of HM Editör `news` is a snapshot,
     * so a /haber/{slug} the old site served may only exist in the live HM Editör DB. Ask the
     * old Worker's public read API (GET {LEGACY_NEWS_API}/api/news/{slug}; /api stays on the
     * Worker) and render it here under the same URL. Published items only; 10 min cache,
     * 5 min negative cache, 4 s timeout (API down -> ['unavailable'] -> 503). LEGACY_NEWS_API="" disables it.
     * @return array<string, mixed>|null
     */
    private function legacyStory(string $slug): ?array
    {
        $base = getenv('LEGACY_NEWS_API');
        $base = $base === false ? 'https://turkatahaber.com' : rtrim((string) $base, '/');
        if ($base === '' || preg_match('#^https://#', $base) !== 1 || preg_match('/^[a-z0-9][a-z0-9-]{0,200}$/', $slug) !== 1) {
            return null;
        }
        $dir = sys_get_temp_dir() . '/ys-legacy';
        $file = $dir . '/' . md5($base . '|' . $slug) . '.json';
        $raw = null;
        if (is_file($file)) {
            $age = time() - (int) filemtime($file);
            $cached = (string) file_get_contents($file);
            if (($cached === '' && $age < 300) || ($cached !== '' && $age < 600)) {
                $raw = $cached;
            }
        }
        if ($raw === null) {
            $ctx = stream_context_create(['http' => ['timeout' => 4, 'ignore_errors' => true,
                'header' => "Accept: application/json\r\nUser-Agent: php-theme-legacy/1\r\n"]]);
            $body = @file_get_contents($base . '/api/news/' . rawurlencode($slug), false, $ctx);
            $code = 0;
            foreach (($http_response_header ?? []) as $h) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $h, $m) === 1) {
                    $code = (int) $m[1];
                }
            }
            if ($code === 200 && is_string($body)) {
                $raw = $body;
            } elseif ($code === 404) {
                $raw = '';
            } else {
                return ['unavailable' => true]; // API down: 503 (not 404, keeps the URL in search indexes), nothing cached
            }
            @mkdir($dir, 0775, true);
            @file_put_contents($file, $raw, LOCK_EX);
        }
        $d = $raw === '' ? null : json_decode($raw, true);
        if (!is_array($d) || ($d['status'] ?? '') !== 'published' || ($d['slug'] ?? '') !== $slug || trim((string) ($d['title'] ?? '')) === '') {
            return null;
        }
        $source = $this->httpUrl((string) ($d['rssSourceUrl'] ?? ''));
        $manual = !empty($d['isEditorManual']) || $source === '';
        return [
            'kind' => $manual ? 'news' : 'rss',
            'slug' => $slug,
            'title' => (string) $d['title'],
            'spot' => Html::text((string) ($d['spot'] ?? '')),
            'body' => (string) ($d['content'] ?? ''),
            'image' => self::media((string) ($d['imageUrl'] ?? '')),
            'credit' => $source !== '' ? $this->hostLabel($source) : '',
            'sourceUrl' => $source,
            'category' => Modules::slug((string) ($d['categorySlug'] ?? '')),
            'publishedAt' => (string) ($d['createdAt'] ?? ''),
            'updatedAt' => (string) ($d['updatedAt'] ?? ($d['createdAt'] ?? '')),
            'authorName' => (string) ($d['authorName'] ?? ''),
            'legacy' => true,
        ];
    }

    /**
     * Site column (köşe yazısı) by slug.
     * @return array<string, mixed>|null
     */
    private function column(int $siteId, string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT m.slug, m.title, m.spot, m.content, m.image_url, m.created_at, m.updated_at, a.id AS author_id,
                    a.name AS author_name, a.title AS author_title, a.avatar_url AS author_avatar, a.ai_author, m.external_key
             FROM hm_makaleler m
             LEFT JOIN authors a ON a.id = m.author_id AND ' . self::authorVisible('a') . '
             WHERE m.site_id = :site AND m.slug = :slug AND m.status = \'published\'
             ORDER BY (m.author_id IS NULL), m.updated_at DESC NULLS LAST
             LIMIT 1'
        );
        $stmt->execute(['site' => $siteId, 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }
        $canonical = '';
        if (preg_match('/^share:(\d+)$/', (string) ($row['external_key'] ?? ''), $sm) === 1) {
            // Shared copy of another site's column (network roster): canonical = the source URL; hidden if the source is gone.
            $src = $this->pdo->prepare(
                'SELECT m.slug, s.domain FROM hm_makaleler m JOIN hm_news_sites s ON s.id = m.site_id
                 WHERE m.id = :id AND m.status = \'published\' AND COALESCE(s.domain, \'\') <> \'\' LIMIT 1'
            );
            $src->execute(['id' => (int) $sm[1]]);
            $s = $src->fetch();
            if (!is_array($s)) {
                return null;
            }
            $canonical = 'https://' . preg_replace('/^www\./', '', strtolower((string) $s['domain'])) . '/haber/' . rawurlencode((string) $s['slug']);
        }
        return [
            'canonical' => $canonical,
            'kind' => 'column',
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'spot' => Html::text((string) ($row['spot'] ?? '')),
            'body' => (string) ($row['content'] ?? ''),
            'image' => self::media((string) ($row['image_url'] ?? '')),
            'credit' => (string) ($row['author_name'] ?? ''),
            'sourceUrl' => '',
            'category' => '',
            'publishedAt' => (string) $row['created_at'],
            'updatedAt' => (string) ($row['updated_at'] ?? $row['created_at']),
            'authorName' => (string) ($row['author_name'] ?? ''),
            'authorId' => (int) ($row['author_id'] ?? 0),
            'authorTitle' => (string) ($row['author_title'] ?? ''),
            'authorImage' => self::avatar((int) ($row['author_id'] ?? 0), (string) ($row['author_avatar'] ?? '')),
            'aiAuthor' => !empty($row['ai_author']), // internal: JSON-LD only, never rendered as a badge
        ];
    }

    /** Target slug of a redirected column slug on the site (only if that column is published), else null. */
    private function columnRedirect(int $siteId, string $slug): ?string
    {
        try {
            $stmt = $this->pdo->prepare(
                'SELECT r.new_slug FROM hm_makale_redirects r
                 WHERE r.site_id = :site AND r.old_slug = :slug AND r.new_slug <> r.old_slug
                   AND EXISTS (SELECT 1 FROM hm_makaleler m WHERE m.site_id = r.site_id AND m.slug = r.new_slug AND m.status = \'published\')
                 LIMIT 1'
            );
            $stmt->execute(['site' => $siteId, 'slug' => $slug]);
            $to = $stmt->fetchColumn();
        } catch (\PDOException) {
            return null; // table missing (dev DB): no redirects
        }
        return is_string($to) && preg_match('/^[a-z0-9][a-z0-9-]{0,180}$/', $to) === 1 ? $to : null;
    }

    /**
     * Other columnists of the site, each with their latest column: pinned authors first (authors.hm_sort_order < 0,
     * the same order as the home Yazarlar row), then newest column first.
     * @return list<array{id: int, slug: string, name: string, title: string, image: string, column: array<string, mixed>}>
     */
    public function authorsWithLatest(int $siteId, int $excludeAuthorId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM (
                SELECT DISTINCT ON (m.author_id) m.author_id, m.slug, m.title, m.image_url, m.created_at,
                       a.name, a.title AS author_title, a.avatar_url, a.hm_sort_order
                FROM hm_makaleler m
                JOIN authors a ON a.id = m.author_id
                WHERE m.site_id = :site AND m.status = \'published\' AND m.author_id <> :ex AND ' . self::authorVisible('a') . '
                ORDER BY m.author_id, m.created_at DESC
             ) latest ORDER BY (CASE WHEN hm_sort_order < 0 THEN hm_sort_order END) ASC NULLS LAST, created_at DESC LIMIT :lim'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('ex', $excludeAuthorId, PDO::PARAM_INT);
        $stmt->bindValue('lim', max(1, min(24, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $id = (int) $row['author_id'];
            if ($this->isBlocked(['slug' => (string) $row['slug'], 'title' => (string) $row['title']])) {
                continue;
            }
            $out[] = [
                'id' => $id,
                'slug' => 'a' . $id,
                'name' => (string) $row['name'],
                'title' => (string) ($row['author_title'] ?? ''),
                'image' => self::avatar($id, (string) ($row['avatar_url'] ?? '')),
                'column' => ['slug' => (string) $row['slug'], 'title' => (string) $row['title'], 'publishedAt' => (string) $row['created_at']],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    public function mostRead(int $siteId, string $category, int $limit): array
    {
        $sql = 'SELECT n.slug AS public_slug, COALESCE(o.title, n.title) AS title,
                       COALESCE(o.spot, n.spot) AS spot, COALESCE(o.image_url, n.image_url) AS image_url,
                       \'\' AS credit, COALESCE(n.rss_source_url, \'\') AS source_url,
                       COALESCE(c.slug, \'\') AS category_slug, n.created_at AS published_at, n.views,
                       \'news\' AS kind
                FROM news n
                LEFT JOIN categories c ON c.id = n.category_id
                LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site
                WHERE n.status = \'published\'
                  AND (n.site_id IS NULL OR n.site_id = :site OR n.owner_site_id = :site)
                  AND (COALESCE(n.rss_source_url, \'\') = \'\' OR ' . $this->turkishOnly('COALESCE(o.title, n.title)', 'c.slug', "''") . ')';
        if ($category !== '') {
            $sql .= ' AND c.slug = :cat';
        }
        $sql .= ' ORDER BY n.views DESC, n.created_at DESC LIMIT :lim';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        if ($category !== '') {
            $stmt->bindValue('cat', $category);
        }
        $stmt->bindValue('lim', max(1, min(24, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $this->mapList($stmt->fetchAll());
        $live = self::recent($this->live($category, 100), 7);
        if ($live !== []) {
            $rows = $this->mergeLive($rows, $live, max(1, min(24, $limit)) * 3, 0, false);
            usort($rows, static fn (array $a, array $b): int => ((int) $b['views']) <=> ((int) $a['views']));
            $rows = array_slice($rows, 0, max(1, min(24, $limit)));
        }
        if ($rows !== []) {
            return $rows;
        }
        return $this->stories($siteId, $category, $limit);
    }

    /** @return list<array<string, mixed>> */
    public function authors(int $siteId, int $limit): array
    {
        // Network-wide legacy rows (hm_site_id NULL) only fill the row on sites without own visible authors.
        $stmt = $this->pdo->prepare(
            'SELECT authors.id, authors.name, authors.title, authors.avatar_url, authors.bio, lc.slug AS last_slug, lc.title AS last_title
             FROM authors
             LEFT JOIN LATERAL (SELECT m.slug, m.title FROM hm_makaleler m
                                WHERE m.site_id = :site AND m.author_id = authors.id AND m.status = \'published\'
                                ORDER BY m.created_at DESC LIMIT 1) lc ON true
             WHERE (authors.hm_site_id = :site
                    OR (authors.hm_site_id IS NULL AND NOT EXISTS (SELECT 1 FROM authors sa
                        WHERE sa.hm_site_id = :site AND ' . self::authorVisible('sa') . ')))
               AND ' . self::authorVisible('authors') . '
             ORDER BY authors.hm_sort_order NULLS LAST, authors.id ASC
             LIMIT :lim'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('lim', max(1, min(24, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $id = (int) $row['id'];
            $out[] = [
                'id' => $id,
                'slug' => 'a' . $id,
                'name' => (string) $row['name'],
                'title' => (string) ($row['title'] ?? ''),
                'image' => self::avatar($id, (string) ($row['avatar_url'] ?? '')),
                'bio' => Html::text((string) ($row['bio'] ?? '')),
                // latest published column on this site (home Yazarlar row shows its title instead of the author title)
                'column' => (string) ($row['last_slug'] ?? '') !== ''
                    && !$this->isBlocked(['slug' => (string) $row['last_slug'], 'title' => (string) ($row['last_title'] ?? '')])
                    ? ['slug' => (string) $row['last_slug'], 'title' => (string) ($row['last_title'] ?? '')]
                    : null,
            ];
        }
        return $out;
    }

    /**
     * /yazarlar page: the site's own author rows (hm_site_id = site) in home-row order, each with the slug of
     * their latest published column ('' if none). Sites without own rows fall back to authors().
     * @return list<array<string, mixed>>
     */
    public function siteAuthors(int $siteId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, a.name, a.title, a.avatar_url, a.bio,
                    (SELECT m.slug FROM hm_makaleler m WHERE m.site_id = :site AND m.author_id = a.id AND m.status = \'published\'
                      ORDER BY m.created_at DESC LIMIT 1) AS last_slug,
                    (SELECT m.title FROM hm_makaleler m WHERE m.site_id = :site AND m.author_id = a.id AND m.status = \'published\'
                      ORDER BY m.created_at DESC LIMIT 1) AS last_title
             FROM authors a
             WHERE a.hm_site_id = :site AND ' . self::authorVisible('a') . '
             ORDER BY a.hm_sort_order NULLS LAST, a.id ASC
             LIMIT :lim'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('lim', max(1, min(60, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        if ($rows === []) {
            return $this->authors($siteId, min(24, $limit));
        }
        $out = [];
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $out[] = [
                'id' => $id,
                'slug' => 'a' . $id,
                'name' => (string) $row['name'],
                'title' => (string) ($row['title'] ?? ''),
                'image' => self::avatar($id, (string) ($row['avatar_url'] ?? '')),
                'bio' => Html::text((string) ($row['bio'] ?? '')),
                'column' => (string) ($row['last_slug'] ?? '') !== ''
                    && !$this->isBlocked(['slug' => (string) $row['last_slug'], 'title' => (string) ($row['last_title'] ?? '')])
                    ? ['slug' => (string) $row['last_slug'], 'title' => (string) ($row['last_title'] ?? '')]
                    : null,
            ];
        }
        return $out;
    }

    /**
     * SQL predicate: author $a is shown on site :site. Honors the AI-editor's per-site hide list
     * (hm_site_author_hidden; hidden, never deleted) and authors.is_active. Other sites have no
     * rows there, so they are unaffected.
     */
    private static function authorVisible(string $a, string $param = 'site'): string
    {
        return 'COALESCE(' . $a . '.is_active, true) AND NOT EXISTS (SELECT 1 FROM hm_site_author_hidden h'
            . ' WHERE h.site_id = :' . $param . ' AND h.author_id = ' . $a . '.id)';
    }

    /** @return array<string, mixed>|null */
    public function author(int $siteId, string $slug): ?array
    {
        if (preg_match('/^a(\d+)$/', $slug, $m) !== 1) {
            return null;
        }
        $stmt = $this->pdo->prepare(
            'SELECT id, name, title, avatar_url, bio FROM authors
             WHERE id = :id AND (hm_site_id IS NULL OR hm_site_id = :site) AND ' . self::authorVisible('authors') . ' LIMIT 1'
        );
        $stmt->execute(['id' => (int) $m[1], 'site' => $siteId]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }
        $id = (int) $row['id'];
        return [
            'id' => $id,
            'slug' => 'a' . $id,
            'name' => (string) $row['name'],
            'title' => (string) ($row['title'] ?? ''),
            'image' => self::avatar($id, (string) ($row['avatar_url'] ?? '')),
            'bio' => Html::text((string) ($row['bio'] ?? '')),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function authorStories(int $siteId, int $authorId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT slug AS public_slug, title, spot, image_url, \'\' AS credit, \'\' AS source_url,
                    \'\' AS category_slug, created_at AS published_at, views, \'column\' AS kind
             FROM hm_makaleler m
             WHERE site_id = :site AND author_id = :author AND status = \'published\'
               AND EXISTS (SELECT 1 FROM authors a WHERE a.id = m.author_id AND ' . self::authorVisible('a') . ')
             ORDER BY created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('author', $authorId, PDO::PARAM_INT);
        $stmt->bindValue('lim', max(1, min(40, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        return $this->mapList($stmt->fetchAll());
    }

    /** @return list<array<string, mixed>> */
    public function videos(int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, source_id, video_id, title, thumbnail, channel_name, duration
             FROM videos
             WHERE active = true AND COALESCE(is_story, false) = false
             ORDER BY id DESC
             LIMIT :lim'
        );
        $stmt->bindValue('lim', max(1, min(24, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $videoId = trim((string) $row['video_id']);
            $sourceId = (int) ($row['source_id'] ?? 0);
            if ($videoId === '') {
                continue;
            }
            $watch = $sourceId > 0
                ? 'https://yektube.com/yp/kanal/' . $sourceId . '/' . rawurlencode($videoId)
                : 'https://yektube.com/yp/?v=' . rawurlencode($videoId);
            $out[] = [
                'title' => (string) $row['title'],
                'image' => (string) ($row['thumbnail'] ?? ''),
                'channel' => (string) ($row['channel_name'] ?? ''),
                'duration' => (string) ($row['duration'] ?? ''),
                'watchUrl' => $watch,
            ];
        }
        return $out;
    }

    /** @return list<array{loc: string, lastmod: string}> */
    public function sitemap(int $siteId): array
    {
        $rows = [];
        $stmt = $this->pdo->prepare(
            'SELECT slug, updated_at FROM news
             WHERE status = \'published\' AND (site_id IS NULL OR site_id = :site)
               AND (COALESCE(rss_source_url, \'\') = \'\' OR ' . sprintf(self::TR_TITLE, 'title') . ')
             ORDER BY updated_at DESC LIMIT 2000'
        );
        $stmt->execute(['site' => $siteId]);
        $block = $this->blockRules();
        foreach ($stmt->fetchAll() as $row) {
            if ($block['slugs'] !== [] && isset($block['slugs'][(string) $row['slug']])) {
                continue;
            }
            $rows[] = ['loc' => '/haber/' . rawurlencode((string) $row['slug']), 'lastmod' => Html::iso((string) $row['updated_at'])];
        }
        $stmt = $this->pdo->prepare(
            'SELECT id, updated_at FROM portal_rss_items
             WHERE ' . $this->rssScope() . '
               AND ' . $this->turkishOnly('title', 'category_slug', 'source_name') . $this->rssHiddenSql() . '
             ORDER BY published_at DESC LIMIT 2000'
        );
        $stmt->execute(['site' => $siteId]);
        foreach ($stmt->fetchAll() as $row) {
            if (isset($block['slugs']['rss-' . (int) $row['id']])) {
                continue;
            }
            $rows[] = ['loc' => '/haber/rss-' . (int) $row['id'], 'lastmod' => Html::iso((string) $row['updated_at'])];
        }
        $known = array_flip(array_column($rows, 'loc'));
        foreach ($this->dropBlocked($this->live('', 100)) as $s) {
            $loc = '/haber/' . rawurlencode((string) $s['slug']);
            if (!isset($known[$loc])) {
                array_unshift($rows, ['loc' => $loc, 'lastmod' => Html::iso((string) $s['publishedAt'])]);
            }
        }
        return $rows;
    }

    /** @return list<array<string, mixed>> */
    public function googleNews(int $siteId): array
    {
        $stmt = $this->pdo->prepare(
            $this->storySql(false) . ' WHERE published_at > now() - interval \'48 hours\' ORDER BY published_at DESC LIMIT 200'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        try {
            // AI editor articles of this site (/haber/ai-{id}), last 48 h.
            $ai = $this->pdo->prepare('SELECT public_slug, title, spot, image_url, \'\' AS credit, \'\' AS source_url, category_slug,
                    published_at, 0 AS views, \'ai\' AS kind FROM hm_ai_manset_v
                 WHERE site_id = :site AND published_at > now() - interval \'48 hours\' ORDER BY published_at DESC LIMIT 100');
            $ai->execute(['site' => $siteId]);
            $rows = array_merge($ai->fetchAll(), $rows);
            usort($rows, static fn (array $a, array $b): int => strcmp((string) $b['published_at'], (string) $a['published_at']));
        } catch (\PDOException) {
        }
        $live = self::recent($this->live('', 100), 2);
        return $live === [] ? $this->mapList($rows) : $this->mergeLive($this->mapList($rows), $live, 300);
    }

    private function storySql(bool $withCategory): string
    {
        $catNews = $withCategory ? ' AND c.slug = :cat' : '';
        $catRss = $withCategory ? ' AND category_slug = :cat' : '';
        $trRss = $this->turkishOnly('title', 'category_slug', 'source_name');
        $rssScope = $this->rssScope();
        $hidden = $this->rssHiddenSql();
        $trNews = "(COALESCE(n.rss_source_url, '') = '' OR " . $this->turkishOnly('COALESCE(o.title, n.title)', 'c.slug', "''") . ')';
        return "SELECT * FROM (
            SELECT 'rss-' || id::text AS public_slug, title, spot, image_url,
                   COALESCE(source_name, '') AS credit, COALESCE(link, '') AS source_url,
                   category_slug, published_at, 0 AS views, 'rss' AS kind
            FROM portal_rss_items
            WHERE {$rssScope} {$catRss} AND {$trRss}{$hidden}
            UNION ALL
            SELECT n.slug, COALESCE(o.title, n.title), COALESCE(o.spot, n.spot), COALESCE(o.image_url, n.image_url),
                   '' AS credit, COALESCE(n.rss_source_url, '') AS source_url,
                   COALESCE(c.slug, '') AS category_slug, n.created_at, n.views, 'news' AS kind
            FROM news n
            LEFT JOIN categories c ON c.id = n.category_id
            LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site
            WHERE n.status = 'published'
              AND (n.site_id IS NULL OR n.site_id = :site OR n.owner_site_id = :site)
              {$catNews} AND {$trNews}
        ) stories";
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function mapList(array $rows): array
    {
        return Dedupe::filter($this->dropBlocked(array_map([$this, 'mapStory'], $rows)));
    }

    /** @var array<string, array<int, int>> */
    private array $hiddenCache = [];
    private int $currentSite = 0;

    /** Site of the current request (used for query-level duplicate hiding). */
    public function setSite(int $siteId): void
    {
        $this->currentSite = $siteId;
        $this->block = null;
    }

    /** @var array{patterns: list<string>, slugs: array<string, array<string, true>>}|null */
    private ?array $block = null;

    /**
     * Lasting per-site editorial block rule (hm_site_blocked_terms: regex patterns, e.g. vatanhaber never shows
     * news about certain people/parties). Matching items are hidden on that site only: lists drop them
     * (title/spot by regex, body mentions via the precomputed hm_site_content_hidden slug+title pairs that
     * hm_refresh_content_hidden() keeps current), story pages 404. Sites without rules: one cheap query, no effect.
     * @return array{patterns: list<string>, slugs: array<string, array<string, true>>}
     */
    private function blockRules(): array
    {
        if ($this->block !== null) {
            return $this->block;
        }
        $this->block = ['patterns' => [], 'slugs' => []];
        if ($this->currentSite <= 0) {
            return $this->block;
        }
        try {
            $stmt = $this->pdo->prepare('SELECT pattern FROM hm_site_blocked_terms WHERE site_id = :site');
            $stmt->execute(['site' => $this->currentSite]);
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $p) {
                $re = '/' . str_replace('/', '\\/', (string) $p) . '/iu';
                if (@preg_match($re, '') !== false) {
                    $this->block['patterns'][] = $re;
                }
            }
            if ($this->block['patterns'] !== []) {
                $stmt = $this->pdo->prepare('SELECT public_slug, title FROM hm_site_content_hidden WHERE site_id = :site');
                $stmt->execute(['site' => $this->currentSite]);
                foreach ($stmt->fetchAll() as $r) {
                    $this->block['slugs'][(string) $r['public_slug']][self::blockKey((string) $r['title'])] = true;
                }
            }
        } catch (\PDOException) {
            // tables missing (dev DB): no rule
        }
        return $this->block;
    }

    private static function blockKey(string $title): string
    {
        return preg_replace('/\s+/u', ' ', trim(html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) ?? $title;
    }

    /** @param array<string, mixed> $s story/list item (slug, title, spot, optional body) */
    private function isBlocked(array $s, bool $withBody = false): bool
    {
        $b = $this->blockRules();
        if ($b['patterns'] === []) {
            return false;
        }
        $slug = (string) ($s['slug'] ?? '');
        if ($slug !== '' && isset($b['slugs'][$slug])) {
            // slug + title pair (slugs are not unique across the shared news pool); rss-/ai- slugs are unique
            if (isset($b['slugs'][$slug][self::blockKey((string) ($s['title'] ?? ''))]) || preg_match('/^(rss|ai)-\d+$/', $slug) === 1) {
                return true;
            }
        }
        $text = (string) ($s['title'] ?? '') . "\n" . (string) ($s['spot'] ?? '');
        if ($withBody) {
            $text .= "\n" . html_entity_decode(strip_tags((string) ($s['body'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        foreach ($b['patterns'] as $re) {
            if (preg_match($re, $text) === 1) {
                return true;
            }
        }
        return false;
    }

    /** @param list<array<string, mixed>> $items @return list<array<string, mixed>> */
    private function dropBlocked(array $items): array
    {
        if ($this->blockRules()['patterns'] === []) {
            return $items;
        }
        return array_values(array_filter($items, fn (array $s): bool => !$this->isBlocked($s)));
    }

    /**
     * Duplicate RSS rows hidden at query level (id => kept id); see Dedupe::hiddenMap().
     * Cached on disk for 10 minutes per RSS scope. DEDUPE_DISABLED=1 turns it off.
     * @return array<int, int>
     */
    public function rssHidden(int $siteId): array
    {
        if (getenv('DEDUPE_DISABLED') === '1') {
            return [];
        }
        $scopeKey = $siteId . '-' . implode('.', $this->rssShared);
        if (isset($this->hiddenCache[$scopeKey])) {
            return $this->hiddenCache[$scopeKey];
        }
        $dir = rtrim((string) (getenv('WIDGET_CACHE_DIR') ?: sys_get_temp_dir() . '/ys-widgets'), '/') . '/dedupe';
        $file = $dir . '/rss-' . preg_replace('/[^0-9.-]/', '', $scopeKey) . '.json';
        if (is_file($file) && filemtime($file) > time() - 600) {
            $data = json_decode((string) file_get_contents($file), true);
            if (is_array($data)) {
                $map = [];
                foreach ($data as $k => $v) {
                    $map[(int) $k] = (int) $v;
                }
                return $this->hiddenCache[$scopeKey] = $map;
            }
        }
        try {
            $stmt = $this->pdo->prepare('SELECT id, title, link, image_url, published_at FROM portal_rss_items WHERE ' . $this->rssScope() . ' ORDER BY id ASC');
            $stmt->execute(['site' => $siteId]);
            $map = Dedupe::hiddenMap($stmt->fetchAll());
        } catch (\PDOException) {
            $map = [];
        }
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp = $file . '.' . getmypid();
        if (@file_put_contents($tmp, json_encode($map)) !== false) {
            @rename($tmp, $file);
        }
        return $this->hiddenCache[$scopeKey] = $map;
    }

    /** SQL fragment hiding duplicate RSS rows (ints only). */
    private function rssHiddenSql(): string
    {
        $ids = array_keys($this->rssHidden($this->currentSite));
        return $ids === [] ? '' : ' AND id NOT IN (' . implode(',', array_map('intval', $ids)) . ')';
    }

    /** @param array<string, mixed> $row
     *  @return array<string, mixed>
     */
    private function mapStory(array $row): array
    {
        $source = $this->httpUrl((string) ($row['source_url'] ?? ''));
        $credit = trim((string) ($row['credit'] ?? ''));
        if ($credit === '' && $source !== '') {
            $credit = $this->hostLabel($source);
        }
        return [
            'slug' => (string) $row['public_slug'],
            'title' => (string) $row['title'],
            'spot' => Html::text((string) ($row['spot'] ?? '')),
            'image' => self::media((string) ($row['image_url'] ?? '')),
            'credit' => $credit,
            'sourceUrl' => $source,
            'category' => Modules::slug((string) ($row['category_slug'] ?? '')),
            'publishedAt' => (string) $row['published_at'],
            'kind' => (string) ($row['kind'] ?? 'news'),
            'views' => (int) ($row['views'] ?? 0),
            'imageCredit' => trim((string) ($row['image_credit'] ?? '')),
            // AI editor's composed manşet image (1200x675, headline + logo) and OG image (1200x630).
            'mansetWide' => self::httpOnly((string) ($row['manset_image_url'] ?? '')),
            'ogImage' => self::httpOnly((string) ($row['og_image_url'] ?? '')),
        ];
    }

    /**
     * HM Editör stores uploads as "/api/media/uploads/…", served by the HM Editör
     * app, not by this theme. MEDIA_BASE_URL (or panel hmNewsMediaBaseUrl via
     * App) makes them absolute; without it they are treated as missing.
     */
    public static string $mediaBase = '';

    /** Inline (data:) avatars are served by /yazar/a{id}/foto so pages stay small. */
    public static function avatar(int $id, string $url): string
    {
        if (preg_match('#^data:image/(jpeg|png|webp|gif);base64,#', $url) === 1) {
            return '/yazar/a' . $id . '/foto';
        }
        return self::media($url);
    }

    /** @return array{type: string, bytes: string}|null */
    public function authorPhoto(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT avatar_url FROM authors WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $url = (string) $stmt->fetchColumn();
        if (preg_match('#^data:image/(jpeg|png|webp|gif);base64,(.+)$#s', $url, $m) !== 1) {
            return null;
        }
        $bytes = base64_decode($m[2], true);
        return $bytes === false || strlen($bytes) > 3_000_000 ? null : ['type' => 'image/' . $m[1], 'bytes' => $bytes];
    }

    public static function media(string $url): string
    {
        $url = trim($url);
        if ($url === '' || str_starts_with($url, 'data:')) {
            return '';
        }
        if (str_starts_with($url, '/api/media/')) {
            return self::$mediaBase !== '' ? rtrim(self::$mediaBase, '/') . $url : '';
        }
        if (str_starts_with($url, '//')) {
            return 'https:' . $url;
        }
        return preg_match('#^https?://[^\s"<>]+$#i', $url) === 1 ? $url : '';
    }

    private function httpUrl(string $value): string
    {
        $value = trim($value);
        return preg_match('#^https?://#i', $value) === 1 ? $value : '';
    }

    private function hostLabel(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        $host = is_string($host) ? preg_replace('/^www\./', '', strtolower($host)) : '';
        return $host !== '' ? $host : 'Kaynak';
    }
}
