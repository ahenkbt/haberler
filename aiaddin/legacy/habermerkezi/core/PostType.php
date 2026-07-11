<?php
/**
 * AhenkPress v5 — Post Type / İçerik Yöneticisi
 */
defined('ROOT') or die();

class PostType {

    /** Kayıtlı post type tanımları */
    private static array $registered = [
        'news'      => ['label' => 'Haberler',   'singular' => 'Haber',    'icon' => 'newspaper'],
        'page'      => ['label' => 'Sayfalar',   'singular' => 'Sayfa',    'icon' => 'file-text'],
        'columnist' => ['label' => 'Köşe Yazıları', 'singular' => 'Köşe Yazısı', 'icon' => 'pen-line'],
        'product'   => ['label' => 'Ürünler',    'singular' => 'Ürün',     'icon' => 'package'],
    ];

    /**
     * Post type kaydı (eklentiler için):
     *   PostType::register('etkinlik', ['label'=>'Etkinlikler','singular'=>'Etkinlik'])
     */
    public static function register(string $type, array $args = []): void {
        self::$registered[$type] = array_merge(['label' => ucfirst($type), 'singular' => ucfirst($type)], $args);
    }

    /**
     * Kayıtlı post type bilgisini döndür (bulunamazsa null).
     * Kullanım: $meta = PostType::get('news') ?? ['label' => 'News'];
     */
    public static function get(string $type): ?array {
        return self::$registered[$type] ?? null;
    }

    /** Tüm kayıtlı post type'ları döndür */
    public static function all(): array {
        return self::$registered;
    }

    public static function getPosts(array $args = []): array {
        $defaults = [
            'post_type'   => 'news',
            'status'      => 'published',
            'limit'       => 10,
            'offset'      => 0,
            'order_by'    => 'published_at',
            'order'       => 'DESC',
            'category_id' => 0,
            'tag_id'      => 0,
            'author_id'   => 0,
            'columnist_id'=> 0,
            'search'      => '',
            'slug'        => '',
            'is_breaking' => null,
            'featured'    => null,
        ];
        $a = array_merge($defaults, $args);

        $where  = [];
        $params = [];

        if ($a['post_type']) {
            $where[]  = 'p.post_type = ?';
            $params[] = $a['post_type'];
        }
        if ($a['status']) {
            $where[]  = 'p.status = ?';
            $params[] = $a['status'];
        }
        if ($a['category_id']) {
            $where[]  = 'p.category_id = ?';
            $params[] = (int)$a['category_id'];
        }
        if ($a['author_id']) {
            $where[]  = 'p.author_id = ?';
            $params[] = (int)$a['author_id'];
        }
        if ($a['columnist_id']) {
            $where[]  = 'p.columnist_id = ?';
            $params[] = (int)$a['columnist_id'];
        }
        if ($a['slug']) {
            $where[]  = 'p.slug = ?';
            $params[] = $a['slug'];
        }
        if ($a['search']) {
            $where[]  = '(p.title LIKE ? OR p.content LIKE ?)';
            $s = '%' . $a['search'] . '%';
            $params[] = $s;
            $params[] = $s;
        }
        if ($a['is_breaking'] !== null) {
            $where[]  = 'p.is_breaking = ?';
            $params[] = (int)$a['is_breaking'];
        }
        if ($a['featured'] !== null) {
            $where[]  = 'p.featured = ?';
            $params[] = (int)$a['featured'];
        }

        $allowedOrder = ['published_at','created_at','updated_at','view_count','id','title'];
        $orderBy = in_array($a['order_by'], $allowedOrder) ? $a['order_by'] : 'published_at';
        $order   = strtoupper($a['order']) === 'ASC' ? 'ASC' : 'DESC';

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $limit    = max(1, (int)$a['limit']);
        $offset   = max(0, (int)$a['offset']);

        $sql = "SELECT p.*,
                    c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color,
                    u.display_name AS author_name
                FROM `{p}posts` p
                LEFT JOIN `{p}categories` c ON c.id = p.category_id
                LEFT JOIN `{p}users` u ON u.id = p.author_id
                $whereSql
                ORDER BY p.$orderBy $order
                LIMIT $limit OFFSET $offset";

        return DB::query($sql, $params);
    }

    public static function getPost(int $id): ?array {
        return DB::queryRow(
            "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color,
                    u.display_name AS author_name
             FROM `{p}posts` p
             LEFT JOIN `{p}categories` c ON c.id = p.category_id
             LEFT JOIN `{p}users` u ON u.id = p.author_id
             WHERE p.id=? LIMIT 1",
            [$id]
        );
    }

    public static function getBySlug(string $slug): ?array {
        return DB::queryRow(
            "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color,
                    u.display_name AS author_name
             FROM `{p}posts` p
             LEFT JOIN `{p}categories` c ON c.id = p.category_id
             LEFT JOIN `{p}users` u ON u.id = p.author_id
             WHERE p.slug=? AND p.status='published' LIMIT 1",
            [$slug]
        );
    }

    public static function countPosts(array $args = []): int {
        $args['limit']  = 999999;
        $args['offset'] = 0;
        $rows = self::getPosts($args);
        return count($rows);
    }

    public static function incrementView(int $id): void {
        try {
            DB::execute("UPDATE `{p}posts` SET view_count = view_count + 1 WHERE id=?", [$id]);
        } catch (\Throwable) {}
    }

    public static function create(array $data): int {
        $now = date('Y-m-d H:i:s');
        return (int)DB::insert(
            "INSERT INTO `{p}posts`
             (post_type, title, slug, content, excerpt, cover_image, category_id,
              author_id, columnist_id, status, is_breaking, featured, meta_title,
              meta_desc, tags, published_at, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $data['post_type']   ?? 'news',
                $data['title']       ?? '',
                $data['slug']        ?? '',
                $data['content']     ?? '',
                $data['excerpt']     ?? '',
                $data['cover_image'] ?? '',
                $data['category_id'] ?? 0,
                $data['author_id']   ?? 0,
                $data['columnist_id']?? 0,
                $data['status']      ?? 'draft',
                $data['is_breaking'] ?? 0,
                $data['featured']    ?? 0,
                $data['meta_title']  ?? '',
                $data['meta_desc']   ?? '',
                $data['tags']        ?? '',
                $data['published_at']?? $now,
                $now,
                $now,
            ]
        );
    }
}
