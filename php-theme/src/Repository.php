<?php

declare(strict_types=1);

namespace Yenisafak;

use PDO;

final class Repository
{
    public function __construct(private PDO $pdo)
    {
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
            if ($slug === '') {
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
        $sql = $this->storySql($category !== '');
        $sql .= ' ORDER BY published_at DESC LIMIT :lim OFFSET :off';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        if ($category !== '') {
            $stmt->bindValue('cat', $category);
        }
        $stmt->bindValue('lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue('off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'mapStory'], $stmt->fetchAll());
    }

    /** @return array<string, mixed>|null */
    public function story(int $siteId, string $slug): ?array
    {
        if (preg_match('/^rss-(\d+)$/', $slug, $m) === 1) {
            $stmt = $this->pdo->prepare(
                'SELECT id, title, spot, image_url, source_name, link, category_slug, published_at
                 FROM portal_rss_items
                 WHERE id = :id AND (site_id IS NULL OR site_id = :site)
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
                'body' => '',
                'image' => (string) ($row['image_url'] ?? ''),
                'credit' => (string) ($row['source_name'] ?? ''),
                'sourceUrl' => $this->httpUrl((string) ($row['link'] ?? '')),
                'category' => Modules::slug((string) $row['category_slug']),
                'publishedAt' => (string) $row['published_at'],
                'authorName' => '',
            ];
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
               AND (n.site_id IS NULL OR n.site_id = :site)
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
                'body' => $manual ? (string) ($row['o_content'] ?: $row['content']) : '',
                'image' => (string) ($row['o_image'] ?: $row['image_url']),
                'credit' => $source !== '' ? $this->hostLabel($source) : '',
                'sourceUrl' => $source,
                'category' => Modules::slug((string) ($row['category_slug'] ?? '')),
                'publishedAt' => (string) $row['created_at'],
                'updatedAt' => (string) ($row['updated_at'] ?? $row['created_at']),
                'authorName' => (string) ($row['author_name'] ?? ''),
            ];
        }

        $stmt = $this->pdo->prepare(
            'SELECT m.slug, m.title, m.spot, m.content, m.image_url, m.created_at, m.updated_at, a.name AS author_name
             FROM hm_makaleler m
             LEFT JOIN authors a ON a.id = m.author_id
             WHERE m.site_id = :site AND m.slug = :slug AND m.status = \'published\'
             LIMIT 1'
        );
        $stmt->execute(['site' => $siteId, 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }
        return [
            'kind' => 'column',
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'spot' => Html::text((string) ($row['spot'] ?? '')),
            'body' => (string) ($row['content'] ?? ''),
            'image' => (string) ($row['image_url'] ?? ''),
            'credit' => (string) ($row['author_name'] ?? ''),
            'sourceUrl' => '',
            'category' => '',
            'publishedAt' => (string) $row['created_at'],
            'updatedAt' => (string) ($row['updated_at'] ?? $row['created_at']),
            'authorName' => (string) ($row['author_name'] ?? ''),
        ];
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
                WHERE n.status = \'published\' AND (n.site_id IS NULL OR n.site_id = :site)';
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
        $rows = array_map([$this, 'mapStory'], $stmt->fetchAll());
        if ($rows !== []) {
            return $rows;
        }
        return $this->stories($siteId, $category, $limit);
    }

    /** @return list<array<string, mixed>> */
    public function authors(int $siteId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, title, avatar_url, bio
             FROM authors
             WHERE hm_site_id IS NULL OR hm_site_id = :site
             ORDER BY hm_sort_order NULLS LAST, id ASC
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
                'image' => (string) ($row['avatar_url'] ?? ''),
                'bio' => Html::text((string) ($row['bio'] ?? '')),
            ];
        }
        return $out;
    }

    /** @return array<string, mixed>|null */
    public function author(int $siteId, string $slug): ?array
    {
        if (preg_match('/^a(\d+)$/', $slug, $m) !== 1) {
            return null;
        }
        $stmt = $this->pdo->prepare(
            'SELECT id, name, title, avatar_url, bio FROM authors
             WHERE id = :id AND (hm_site_id IS NULL OR hm_site_id = :site) LIMIT 1'
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
            'image' => (string) ($row['avatar_url'] ?? ''),
            'bio' => Html::text((string) ($row['bio'] ?? '')),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function authorStories(int $siteId, int $authorId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT slug AS public_slug, title, spot, image_url, \'\' AS credit, \'\' AS source_url,
                    \'\' AS category_slug, created_at AS published_at, views, \'column\' AS kind
             FROM hm_makaleler
             WHERE site_id = :site AND author_id = :author AND status = \'published\'
             ORDER BY created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue('site', $siteId, PDO::PARAM_INT);
        $stmt->bindValue('author', $authorId, PDO::PARAM_INT);
        $stmt->bindValue('lim', max(1, min(40, $limit)), PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'mapStory'], $stmt->fetchAll());
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
             ORDER BY updated_at DESC LIMIT 2000'
        );
        $stmt->execute(['site' => $siteId]);
        foreach ($stmt->fetchAll() as $row) {
            $rows[] = ['loc' => '/haber/' . rawurlencode((string) $row['slug']), 'lastmod' => Html::iso((string) $row['updated_at'])];
        }
        $stmt = $this->pdo->prepare(
            'SELECT id, updated_at FROM portal_rss_items
             WHERE site_id IS NULL OR site_id = :site
             ORDER BY published_at DESC LIMIT 2000'
        );
        $stmt->execute(['site' => $siteId]);
        foreach ($stmt->fetchAll() as $row) {
            $rows[] = ['loc' => '/haber/rss-' . (int) $row['id'], 'lastmod' => Html::iso((string) $row['updated_at'])];
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
        return array_map([$this, 'mapStory'], $stmt->fetchAll());
    }

    private function storySql(bool $withCategory): string
    {
        $catNews = $withCategory ? ' AND c.slug = :cat' : '';
        $catRss = $withCategory ? ' AND category_slug = :cat' : '';
        return "SELECT * FROM (
            SELECT 'rss-' || id::text AS public_slug, title, spot, image_url,
                   COALESCE(source_name, '') AS credit, COALESCE(link, '') AS source_url,
                   category_slug, published_at, 0 AS views, 'rss' AS kind
            FROM portal_rss_items
            WHERE (site_id IS NULL OR site_id = :site) {$catRss}
            UNION ALL
            SELECT n.slug, COALESCE(o.title, n.title), COALESCE(o.spot, n.spot), COALESCE(o.image_url, n.image_url),
                   '' AS credit, COALESCE(n.rss_source_url, '') AS source_url,
                   COALESCE(c.slug, '') AS category_slug, n.created_at, n.views, 'news' AS kind
            FROM news n
            LEFT JOIN categories c ON c.id = n.category_id
            LEFT JOIN news_site_overrides o ON o.article_id = n.id AND o.site_id = :site
            WHERE n.status = 'published' AND (n.site_id IS NULL OR n.site_id = :site) {$catNews}
        ) stories";
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
            'image' => (string) ($row['image_url'] ?? ''),
            'credit' => $credit,
            'sourceUrl' => $source,
            'category' => Modules::slug((string) ($row['category_slug'] ?? '')),
            'publishedAt' => (string) $row['published_at'],
            'kind' => (string) ($row['kind'] ?? 'news'),
        ];
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
