<?php

declare(strict_types=1);

namespace Yenisafak;

final class App
{
    /** @var array<string, string> */
    private const CANONICAL_CATEGORIES = [
        'gundem' => 'Gündem',
        'ekonomi' => 'Ekonomi',
        'dunya' => 'Dünya',
        'politika' => 'Politika',
        'spor' => 'Spor',
        'teknoloji' => 'Teknoloji',
        'kultur-sanat' => 'Kültür-Sanat',
        'saglik' => 'Sağlık',
        'yasam' => 'Yaşam',
        'egitim' => 'Eğitim',
        'yerel' => 'Yerel',
        'ankara' => 'Ankara',
    ];

    public function __construct(private Repository $repo)
    {
    }

    public function handle(string $method, string $uri, string $hostHeader): void
    {
        if ($method !== 'GET' && $method !== 'HEAD') {
            $this->text(405, 'Method not allowed');
            return;
        }

        $path = rawurldecode((string) parse_url($uri, PHP_URL_PATH));
        $path = $path === '' ? '/' : $path;
        $host = strtolower(trim($hostHeader));
        $host = (string) preg_replace('/:\d+$/', '', $host);
        $bare = (string) preg_replace('/^www\./', '', $host);
        $basePath = '';
        if ($bare === 'ahenk.net.tr' && ($path === '/haberler' || str_starts_with($path, '/haberler/'))) {
            $basePath = '/haberler';
            $path = substr($path, strlen('/haberler'));
            $path = $path === '' ? '/' : $path;
        }
        if ($path !== '/' && str_ends_with($path, '/')) {
            $stripped = rtrim($path, '/') ?: '/';
            $this->redirect($basePath . ($stripped === '/' ? '' : $stripped) ?: '/');
            return;
        }

        $override = getenv('SITE_HOST');
        $lookupHost = is_string($override) && $override !== '' ? $override : $host;
        $row = $this->repo->siteForHost($lookupHost);
        if ($row === null) {
            $slug = getenv('SITE_SLUG');
            if (is_string($slug) && $slug !== '') {
                $row = $this->repo->siteBySlug($slug);
            }
        }
        if ($row === null) {
            $this->text(404, 'Site bulunamadı');
            return;
        }

        $site = $this->buildSite($row, $host, $bare, $basePath);
        if ($site->publicSuspended() && !$this->suspensionExempt($path)) {
            $this->suspended($site);
            return;
        }
        $this->route($site, $path);
    }

    private function suspensionExempt(string $path): bool
    {
        return in_array($path, ['/healthz', '/robots.txt', '/sitemap.xml', '/google-news.xml'], true);
    }

    private function suspended(Site $site): void
    {
        $title = 'Site neden askıya alınır';
        $host = 'ahenk.net.tr';
        $message = '1 ahenk.net.tr hesabına aylık 50 usd olan lisans ücreti yatırılmadığı durumlarda, suç ve suçluyu öven haberler yapıldığında veya site altındaki ajans üyeliği ve yazılım firması adı ve linki kabul edilmediğinde siteniz askıya alınır ve bir süre sonra kapatılır';
        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: public, max-age=30, s-maxage=30');
        header('X-Hm-Public-Suspended: 1');
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $pageTitle = htmlspecialchars($site->name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ' — ' . $safeTitle;
        $body = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $body = str_replace(
            $host,
            '<a href="https://' . $host . '">' . $host . '</a>',
            $body,
        );
        echo '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
            . $pageTitle
            . '</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;color:#0f172a"><div style="max-width:40rem;padding:2rem;text-align:center"><h1 style="margin:0 0 1rem;font-size:1.75rem;line-height:1.25">'
            . $safeTitle
            . '</h1><p style="margin:0;font-size:1.15rem;font-weight:650;line-height:1.55">'
            . $body
            . '</p></div></body></html>';
    }

    /** @param array<string, mixed> $row */
    private function buildSite(array $row, string $host, string $bare, string $basePath): Site
    {
        $layout = json_decode((string) ($row['layout_json'] ?? ''), true);
        $layout = is_array($layout) ? $layout : [];
        $contact = json_decode((string) ($row['contact_json'] ?? ''), true);
        $contact = is_array($contact) ? $contact : [];
        $accent = isset($layout['hmPrimaryColor']) && is_string($layout['hmPrimaryColor']) && preg_match('/^#[0-9a-fA-F]{6}$/', $layout['hmPrimaryColor']) === 1
            ? $layout['hmPrimaryColor']
            : '#c8102e';
        $logo = isset($layout['logoUrl']) && is_string($layout['logoUrl']) ? trim($layout['logoUrl']) : '';
        if ($logo === '' && (string) $row['slug'] === 'turkatahaber') {
            $logo = '/brand/turkata-wordmark.svg';
        }
        $bySlug = [];
        foreach ($this->repo->categories((int) $row['id']) as $cat) {
            $bySlug[$cat['slug']] = $cat['name'];
        }
        $categories = Modules::navCategories($layout, $bySlug, self::CANONICAL_CATEGORIES);
        $origin = in_array($bare, ['turkatahaber.com', 'ahenk.net.tr'], true) || (string) $row['slug'] === 'turkatahaber'
            ? 'https://turkatahaber.com'
            : 'https://' . ((string) ($row['domain'] ?: $bare));
        // Merge live HM Editör lists (Worker public API) so new dual-write misses still appear.
        $bridge = LiveBridge::forDomain((string) parse_url($origin, PHP_URL_HOST));
        $this->repo->setBridge($bridge);
        return new Site(
            (int) $row['id'],
            (string) $row['slug'],
            (string) $row['display_name'],
            trim((string) ($row['description'] ?? '')),
            (string) ($row['domain'] ?? ''),
            $layout,
            $contact,
            $accent,
            $logo,
            $host,
            $basePath,
            $origin,
            $categories,
        );
    }

    private function route(Site $site, string $path): void
    {
        if ($path === '/healthz') {
            $this->text(200, 'ok');
            return;
        }
        if ($path === '/robots.txt') {
            $this->robots($site);
            return;
        }
        if ($path === '/sitemap.xml') {
            $this->sitemap($site);
            return;
        }
        if ($path === '/google-news.xml') {
            $this->googleNews($site);
            return;
        }
        if ($path === '/') {
            $this->home($site);
            return;
        }
        if (preg_match('#^/haber/([a-z0-9][a-z0-9-]{0,180})$#', $path, $m) === 1) {
            $this->article($site, $m[1]);
            return;
        }
        if (preg_match('#^/kategori/([a-z0-9][a-z0-9-]{0,80})$#', $path, $m) === 1) {
            $this->category($site, $m[1]);
            return;
        }
        if (preg_match('#^/yazar/(a\d+)$#', $path, $m) === 1) {
            $this->author($site, $m[1]);
            return;
        }
        if (preg_match('#^/koseyazari/(sifre.*|haber.*)$#', $path, $m) === 1) {
            $this->redirect($site->path('/yazar/' . $m[1]));
            return;
        }
        if ($path === '/koseyazari/giris') {
            $this->html(
                $site,
                'Köşe yazarı girişi',
                'Editörün tanımladığı e-posta ve şifre ile giriş yapın.',
                $this->render('koseyazari-giris', ['site' => $site]),
                200,
                '/koseyazari/giris'
            );
            return;
        }
        if ($path === '/video') {
            $this->video($site);
            return;
        }
        if ($path === '/kunye' || $path === '/hakkimizda' || $path === '/iletisim') {
            $this->page($site, $path);
            return;
        }
        $this->html($site, 'Sayfa bulunamadı', 'Aradığınız sayfa yok.', $this->render('404', ['site' => $site]), 404);
    }

    private function home(Site $site): void
    {
        $modules = Modules::enabled($site->layout);
        $byId = [];
        foreach ($modules as $module) {
            $byId[$module['id']] = $module;
        }
        $pool = $this->repo->stories($site->id, '', 180);
        $videos = isset($byId['ysVideo']) ? $this->videos($byId['ysVideo']['count']) : [];
        $authors = isset($byId['ysAuthors']) ? $this->repo->authors($site->id, $byId['ysAuthors']['count']) : [];
        $sections = [];
        $count = count($modules);
        for ($i = 0; $i < $count; $i++) {
            $module = $modules[$i];
            $next = $modules[$i + 1] ?? null;
            if ($module['id'] === 'ysManset' && $next !== null && $next['id'] === 'ysSide') {
                $slides = $this->pick($pool, $module['category'], $module['count']);
                $sections[] = [
                    'type' => 'hero',
                    'slides' => $slides,
                    'side' => $this->pick($pool, $next['category'], $next['count'], array_column($slides, 'slug')),
                ];
                $i++;
                continue;
            }
            $sections[] = $this->homeSection($site, $module, $pool, $videos, $authors);
        }
        $data = ['site' => $site, 'sections' => $sections];
        $this->html(
            $site,
            $site->name,
            $site->description !== '' ? $site->description : $site->name . ' güncel haberler',
            $this->render('home', $data),
            200,
            '/',
            $this->homeJsonLd($site)
        );
    }

    /** @param list<array<string, mixed>> $pool
     *  @param list<string> $except
     *  @return list<array<string, mixed>>
     */
    private function pick(array $pool, string $category, int $count, array $except = []): array
    {
        $out = [];
        $rest = [];
        foreach ($pool as $item) {
            if (in_array($item['slug'], $except, true)) {
                continue;
            }
            $rest[] = $item;
            if ($category !== '' && $item['category'] !== $category) {
                continue;
            }
            $out[] = $item;
            if (count($out) >= $count) {
                return $out;
            }
        }
        foreach ($rest as $item) {
            $seen = false;
            foreach ($out as $have) {
                if ($have['slug'] === $item['slug']) {
                    $seen = true;
                    break;
                }
            }
            if ($seen) {
                continue;
            }
            $out[] = $item;
            if (count($out) >= $count) {
                break;
            }
        }
        return $out;
    }

    /** @param array<string, mixed> $module
     *  @param list<array<string, mixed>> $pool
     *  @param list<array<string, mixed>> $videos
     *  @param list<array<string, mixed>> $authors
     *  @return array<string, mixed>
     */
    private function homeSection(Site $site, array $module, array $pool, array $videos, array $authors): array
    {
        $id = $module['id'];
        if ($id === 'ysCategories') {
            $cats = [];
            foreach ($site->categories as $cat) {
                $cats[] = ['cat' => $cat, 'items' => $this->pick($pool, $cat['slug'], $module['count'])];
            }
            return ['type' => 'categories', 'categories' => $cats];
        }
        if ($id === 'ysVideo') {
            return ['type' => 'video', 'items' => array_slice($videos, 0, $module['count'])];
        }
        if ($id === 'ysAuthors') {
            return ['type' => 'authors', 'items' => $authors];
        }
        if ($id === 'ysMostRead') {
            return ['type' => 'most', 'items' => $this->repo->mostRead($site->id, $module['category'], $module['count'])];
        }
        if ($id === 'ysGallery') {
            $items = $this->pick($pool, $module['category'], 40);
            $withImage = array_values(array_filter($items, static fn (array $row): bool => ($row['image'] ?? '') !== ''));
            return ['type' => 'gallery', 'items' => array_slice($withImage, 0, $module['count'])];
        }
        return ['type' => $id, 'items' => $this->pick($pool, $module['category'], $module['count'])];
    }

    private function article(Site $site, string $slug): void
    {
        $story = $this->repo->story($site->id, $slug);
        if ($story === null) {
            $this->html($site, 'Haber bulunamadı', '', $this->render('404', ['site' => $site]), 404);
            return;
        }
        $path = '/haber/' . $story['slug'];
        $desc = $story['spot'] !== '' ? $story['spot'] : $story['title'];
        $this->html(
            $site,
            $story['title'] . ' | ' . $site->name,
            $desc,
            $this->render('article', ['site' => $site, 'story' => $story]),
            200,
            $path,
            $this->articleJsonLd($site, $story, $path),
            $story['image']
        );
    }

    private function category(Site $site, string $slug): void
    {
        $known = false;
        foreach ($site->categories as $cat) {
            if ($cat['slug'] === $slug) {
                $known = true;
                break;
            }
        }
        if (!$known) {
            $this->html($site, 'Kategori bulunamadı', '', $this->render('404', ['site' => $site]), 404);
            return;
        }
        $page = max(1, (int) ($_GET['sayfa'] ?? 1));
        $per = 24;
        $items = $this->repo->stories($site->id, $slug, $per + 1, ($page - 1) * $per);
        $hasMore = count($items) > $per;
        $items = array_slice($items, 0, $per);
        $name = $site->categoryName($slug);
        $path = '/kategori/' . $slug;
        $this->html(
            $site,
            $name . ' | ' . $site->name,
            $name . ' haberleri — ' . $site->name,
            $this->render('category', [
                'site' => $site,
                'name' => $name,
                'slug' => $slug,
                'items' => $items,
                'page' => $page,
                'hasMore' => $hasMore,
            ]),
            200,
            $page === 1 ? $path : $path . '?sayfa=' . $page
        );
    }

    private function author(Site $site, string $slug): void
    {
        $author = $this->repo->author($site->id, $slug);
        if ($author === null) {
            $this->html($site, 'Yazar bulunamadı', '', $this->render('404', ['site' => $site]), 404);
            return;
        }
        $items = $this->repo->authorStories($site->id, $author['id'], 30);
        $path = '/yazar/' . $author['slug'];
        $this->html(
            $site,
            $author['name'] . ' | ' . $site->name,
            $author['title'] !== '' ? $author['title'] : $author['name'],
            $this->render('author', ['site' => $site, 'author' => $author, 'items' => $items]),
            200,
            $path
        );
    }

    private function video(Site $site): void
    {
        $this->html(
            $site,
            'Video | ' . $site->name,
            'YekTube video bandı — ' . $site->name,
            $this->render('video', ['site' => $site, 'videos' => $this->videos(24)]),
            200,
            '/video'
        );
    }

    private function page(Site $site, string $path): void
    {
        $titles = ['/kunye' => 'Künye', '/hakkimizda' => 'Hakkımızda', '/iletisim' => 'İletişim'];
        $title = $titles[$path];
        $this->html(
            $site,
            $title . ' | ' . $site->name,
            $site->description !== '' ? $site->description : $title,
            $this->render('page', ['site' => $site, 'page' => ltrim($path, '/')]),
            200,
            $path
        );
    }

    /** @return list<array<string, mixed>> */
    private function videos(int $count): array
    {
        $rows = $this->repo->videos($count);
        if ($rows !== []) {
            return $rows;
        }
        $base = getenv('YEKTUBE_API_BASE');
        if (!is_string($base) || !str_starts_with($base, 'https://')) {
            return [];
        }
        $url = rtrim($base, '/') . '/api/hm/yektube/videos?limit=' . $count;
        $ctx = stream_context_create(['http' => ['timeout' => 2, 'header' => "Accept: application/json\r\n"]]);
        $raw = @file_get_contents($url, false, $ctx);
        if (!is_string($raw)) {
            return [];
        }
        $json = json_decode($raw, true);
        $items = is_array($json['items'] ?? null) ? $json['items'] : [];
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item) || empty($item['title']) || empty($item['watchUrl'])) {
                continue;
            }
            $watch = (string) $item['watchUrl'];
            if (!str_starts_with($watch, 'https://yektube.com/')) {
                continue;
            }
            $out[] = [
                'title' => (string) $item['title'],
                'image' => (string) ($item['thumbnail'] ?? ''),
                'channel' => (string) ($item['channelName'] ?? ''),
                'duration' => (string) ($item['duration'] ?? ''),
                'watchUrl' => $watch,
            ];
        }
        return $out;
    }

    /** @return array<string, mixed> */
    private function homeJsonLd(Site $site): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'NewsMediaOrganization',
            'name' => $site->name,
            'url' => $site->canonical('/'),
            'description' => $site->description,
            'logo' => $site->logo !== '' ? $this->absolute($site, $site->logo) : null,
        ];
    }

    /** @param array<string, mixed> $story
     *  @return array<string, mixed>
     */
    private function articleJsonLd(Site $site, array $story, string $path): array
    {
        $data = [
            '@context' => 'https://schema.org',
            '@type' => 'NewsArticle',
            'headline' => $story['title'],
            'description' => $story['spot'] !== '' ? $story['spot'] : $story['title'],
            'datePublished' => Html::iso((string) $story['publishedAt']),
            'dateModified' => Html::iso((string) ($story['updatedAt'] ?? $story['publishedAt'])),
            'mainEntityOfPage' => $site->canonical($path),
            'publisher' => [
                '@type' => 'NewsMediaOrganization',
                'name' => $site->name,
                'url' => $site->canonical('/'),
            ],
            'author' => [
                '@type' => ($story['authorName'] ?? '') !== '' ? 'Person' : 'Organization',
                'name' => ($story['authorName'] ?? '') !== '' ? $story['authorName'] : ($story['credit'] !== '' ? $story['credit'] : $site->name),
            ],
        ];
        if ($story['image'] !== '') {
            $data['image'] = [$this->absolute($site, (string) $story['image'])];
        }
        if ($story['sourceUrl'] !== '') {
            $data['isBasedOn'] = $story['sourceUrl'];
        }
        return $data;
    }

    private function absolute(Site $site, string $url): string
    {
        if (str_starts_with($url, 'https://') || str_starts_with($url, 'http://')) {
            return $url;
        }
        return $site->canonical($url);
    }

    private function robots(Site $site): void
    {
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: public, max-age=60, s-maxage=60');
        echo "User-agent: *\nAllow: /\nSitemap: " . $site->canonical('/sitemap.xml') . "\n";
    }

    private function sitemap(Site $site): void
    {
        header('Content-Type: application/xml; charset=utf-8');
        header('Cache-Control: public, max-age=60, s-maxage=60');
        echo '<?xml version="1.0" encoding="UTF-8"?>';
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        $static = ['/', '/video', '/kunye', '/hakkimizda', '/iletisim'];
        foreach ($site->categories as $cat) {
            $static[] = '/kategori/' . $cat['slug'];
        }
        foreach ($static as $path) {
            echo '<url><loc>' . Html::e($site->canonical($path)) . '</loc></url>';
        }
        foreach ($this->repo->sitemap($site->id) as $row) {
            echo '<url><loc>' . Html::e($site->canonical($row['loc'])) . '</loc><lastmod>' . Html::e($row['lastmod']) . '</lastmod></url>';
        }
        echo '</urlset>';
    }

    private function googleNews(Site $site): void
    {
        header('Content-Type: application/xml; charset=utf-8');
        header('Cache-Control: public, max-age=60, s-maxage=60');
        echo '<?xml version="1.0" encoding="UTF-8"?>';
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">';
        foreach ($this->repo->googleNews($site->id) as $story) {
            $loc = $site->canonical('/haber/' . $story['slug']);
            echo '<url><loc>' . Html::e($loc) . '</loc><news:news><news:publication><news:name>'
                . Html::e($site->name) . '</news:name><news:language>tr</news:language></news:publication><news:publication_date>'
                . Html::e(Html::iso((string) $story['publishedAt'])) . '</news:publication_date><news:title>'
                . Html::e((string) $story['title']) . '</news:title></news:news></url>';
        }
        echo '</urlset>';
    }

    /** @param array<string, mixed> $data */
    private function render(string $template, array $data): string
    {
        extract($data, EXTR_SKIP);
        ob_start();
        require dirname(__DIR__) . '/templates/' . $template . '.php';
        return (string) ob_get_clean();
    }

    /** @param array<string, mixed>|null $jsonLd */
    private function html(
        Site $site,
        string $title,
        string $description,
        string $body,
        int $status,
        string $path = '/',
        ?array $jsonLd = null,
        string $image = ''
    ): void {
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        if ($status === 200) {
            header('Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=120');
        } else {
            header('Cache-Control: no-store');
        }
        $description = function_exists('mb_substr') ? mb_substr(trim($description), 0, 200) : substr(trim($description), 0, 200);
        $canonical = $site->canonical($path);
        $imageAbs = $image !== '' ? $this->absolute($site, $image) : '';
        require dirname(__DIR__) . '/templates/layout.php';
    }

    private function text(int $status, string $body): void
    {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
        echo $body;
    }

    private function redirect(string $to): void
    {
        header('Location: ' . $to, true, 301);
        header('Cache-Control: public, max-age=60');
    }
}
