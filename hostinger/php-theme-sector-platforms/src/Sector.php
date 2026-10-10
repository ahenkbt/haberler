<?php

declare(strict_types=1);

namespace Yenisafak;

use PDO;
use Throwable;

/**
 * sector 2026-10-10: ortak "sektör platformu" omurgası. hm_news_sites.layout_json hmSector=<anahtar>-<rev> olan siteler
 * (muhtar.gundemi.org, sendika.gundemi.org, okul.gundemi.org) templates/sector/* kabuğuyla çizilir; haberler/kategoriler/yazarlar
 * mevcut haber sisteminden (Repository) gelir. Tanım: config/sectors.json (site, bölümler, roller, rehber türleri, talep formu).
 * Tablolar (TP): sector_members (rol + onaylı üyelik), sector_directory (rehber/dizin), sector_requests (talep formu).
 * Yazma: dar yetkili sector_rw rolü (config/sector.json). Panel: /sektor/panel (hm_site_editors girişi, kullanıcı=parola=site e-postası).
 * Rollback: layout_json'dan hmSector anahtarını sil (site normal haber temasına döner) ya da backups/sector-20261010/.
 */
final class Sector
{
    public static ?Site $site = null;
    public static bool $noindex = false;
    /** @var array<string, mixed> */
    public static array $def = [];
    private static ?PDO $ro = null;
    private static ?PDO $rw = null;
    /** @var array<string, mixed>|null */
    private static ?array $cfg = null;
    private static ?array $conf = null;

    /* ------------------------------------------------------------------ config */

    /** @return array<string, mixed> */
    private static function cfg(): array
    {
        if (self::$cfg === null) {
            $f = dirname(__DIR__) . '/config/sectors.json';
            $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
            self::$cfg = is_array($j) ? $j : ['sectors' => []];
        }
        return self::$cfg;
    }

    private static function conf(): array
    {
        if (self::$conf === null) {
            $f = dirname(__DIR__) . '/config/sector.json';
            $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
            self::$conf = is_array($j) ? $j : [];
        }
        return self::$conf;
    }

    public static function on(object $site): bool
    {
        $l = is_array($site->layout ?? null) ? $site->layout : [];
        return !empty($l['hmSector']) && is_string($l['hmSector']);
    }

    public static function init(Site $site): void
    {
        self::$site = $site;
        $key = explode('-', (string) ($site->layout['hmSector'] ?? ''))[0];
        self::$def = self::cfg()['sectors'][$key] ?? [];
    }

    public static function key(): string
    {
        return (string) (self::$def['key'] ?? '');
    }

    public static function asset(string $file): string
    {
        return Html::versioned('/brand/sector/' . self::key() . '/' . $file);
    }

    public static function css(): string
    {
        return Html::versioned('/brand/sector/sector.css');
    }

    /** tema 2026-10-10: sektöre özel tema kabuğu (skin-<anahtar>.css); yoksa boş. */
    public static function skin(): string
    {
        $k = self::key();
        return ($k !== '' && is_file(dirname(__DIR__) . '/public/brand/sector/skin-' . $k . '.css')) ? Html::versioned('/brand/sector/skin-' . $k . '.css') : '';
    }

    /** Türkçe tarih ("10 Ekim 2026, Cumartesi"). */
    public static function today(): string
    {
        $m = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        $d = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        $t = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Istanbul'));
        return $t->format('j') . ' ' . $m[(int) $t->format('n')] . ' ' . $t->format('Y') . ', ' . $d[(int) $t->format('w')];
    }

    public static function js(): string
    {
        return Html::versioned('/brand/sector/sector.js');
    }

    /** @return array<string, string> */
    public static function colors(): array
    {
        return is_array(self::$def['colors'] ?? null) ? self::$def['colors'] : ['hot' => '#FF3D2E', 'hot2' => '#FF7A1A', 'mag' => '#E0115F', 'violet' => '#5B5BFF', 'lime' => '#C8F542', 'sun' => '#FFB000'];
    }

    public static function rootCss(): string
    {
        $c = self::colors();
        return ':root{--yn-hot:' . $c['hot'] . ';--yn-hot2:' . $c['hot2'] . ';--yn-mag:' . $c['mag'] . ';--yn-violet:' . $c['violet'] . ';--yn-lime:' . $c['lime'] . ';--yn-sun:' . $c['sun']
            . ';--yn-grad:linear-gradient(120deg,' . $c['hot2'] . ' 0%,' . $c['hot'] . ' 45%,' . $c['mag'] . ' 100%)}';
    }

    /** @return list<array<string, string>> */
    public static function sections(): array
    {
        $out = [];
        foreach ((array) (self::$def['sections'] ?? []) as $s) {
            $out[] = ['slug' => $s[0], 'name' => $s[1], 'short' => $s[2], 'blurb' => $s[3], 'color' => $s[4], 'motif' => $s[5]];
        }
        return $out;
    }

    /** @return array<string, string>|null */
    public static function section(string $slug): ?array
    {
        foreach (self::sections() as $s) {
            if ($s['slug'] === $slug) {
                return $s;
            }
        }
        return null;
    }

    public static function minutes(string $html): int
    {
        return YeniTc::minutes($html);
    }

    public static function slug(string $t): string
    {
        $t = strtr($t, ['İ' => 'i', 'I' => 'i', 'ı' => 'i', 'Ç' => 'c', 'ç' => 'c', 'Ğ' => 'g', 'ğ' => 'g', 'Ö' => 'o', 'ö' => 'o', 'Ş' => 's', 'ş' => 's', 'Ü' => 'u', 'ü' => 'u', 'â' => 'a', 'Â' => 'a', 'î' => 'i', 'û' => 'u']);
        $t = strtolower((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $t));
        return trim($t, '-') ?: 'x';
    }

    /** Türkçe başlık biçimi: "AKÖREN MAHALLESİ" -> "Akören Mahallesi". */
    public static function tr(string $s): string
    {
        $s = trim($s);
        if ($s === '') {
            return '';
        }
        $low = mb_strtolower(strtr($s, ['İ' => 'i', 'I' => 'ı']), 'UTF-8');
        $words = preg_split('/(\s+|-|\/|\()/u', $low, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];
        foreach ($words as $i => $w) {
            if ($w === '' || preg_match('/^(\s+|-|\/|\()$/u', $w) === 1) {
                continue;
            }
            $f = mb_substr($w, 0, 1, 'UTF-8');
            $f = $f === 'i' ? 'İ' : ($f === 'ı' ? 'I' : mb_strtoupper($f, 'UTF-8'));
            $words[$i] = $f . mb_substr($w, 1, null, 'UTF-8');
        }
        return implode('', $words);
    }

    /** SVG motif art (same visual language as yeni.tc, colour passed explicitly). */
    /** Test soruları (JSON, doğrulanmış biçimde) — yoksa boş string. */
    public static function quizData(string $slug): string
    {
        $pdo = self::ro();
        if ($pdo === null || $slug === '') {
            return '';
        }
        try {
            $st = $pdo->prepare('SELECT data FROM sector_quiz WHERE slug = :s');
            $st->execute(['s' => $slug]);
            $j = (string) $st->fetchColumn();
            $a = json_decode($j, true);
            return is_array($a) && $a !== [] ? (string) json_encode($a, JSON_UNESCAPED_UNICODE) : '';
        } catch (Throwable $e) {
            return '';
        }
    }

    public static function art(string $color, string $motif, int $seed = 0, string $cls = 'yn-art'): string
    {
        $c = $color;
        $r = static function (int $i) use ($seed): float {
            $x = sin(($seed + 1) * 12.9898 + $i * 78.233) * 43758.5453;
            return $x - floor($x);
        };
        $g = '';
        switch ($motif) {
            case 'bars':
                for ($i = 0; $i < 9; $i++) {
                    $h = 18 + (int) ($r($i) * 70) + $i * 4;
                    $g .= '<rect x="' . (14 + $i * 20) . '" y="' . (110 - $h) . '" width="12" height="' . $h . '" rx="6" fill="' . ($i % 3 === 2 ? 'var(--yn-ink)' : $c) . '" opacity="' . ($i % 3 === 1 ? '.45' : '1') . '"/>';
                }
                $g .= '<path d="M10 82 C60 70, 100 40, 196 18" stroke="var(--yn-lime)" stroke-width="5" fill="none" stroke-linecap="round"/>';
                break;
            case 'grid':
                for ($y = 0; $y < 5; $y++) {
                    for ($x = 0; $x < 9; $x++) {
                        $on = $r($y * 9 + $x) > .55;
                        $g .= '<rect x="' . (12 + $x * 21) . '" y="' . (10 + $y * 21) . '" width="15" height="15" rx="' . ($on ? 8 : 3) . '" fill="' . ($on ? $c : 'currentColor') . '" opacity="' . ($on ? '1' : '.12') . '"/>';
                    }
                }
                break;
            case 'rings':
                for ($i = 5; $i >= 1; $i--) {
                    $g .= '<circle cx="' . (70 + (int) ($r(1) * 60)) . '" cy="60" r="' . ($i * 16) . '" fill="none" stroke="' . ($i % 2 ? $c : 'currentColor') . '" stroke-width="' . ($i % 2 ? 7 : 2) . '" opacity="' . ($i % 2 ? '1' : '.25') . '"/>';
                }
                $g .= '<circle cx="170" cy="30" r="10" fill="var(--yn-lime)"/>';
                break;
            case 'waves':
                for ($i = 0; $i < 6; $i++) {
                    $y = 20 + $i * 17;
                    $a = 6 + (int) ($r($i) * 10);
                    $g .= '<path d="M0 ' . $y . ' Q 25 ' . ($y - $a) . ' 50 ' . $y . ' T 100 ' . $y . ' T 150 ' . $y . ' T 200 ' . $y . '" fill="none" stroke="' . ($i % 2 ? 'currentColor' : $c) . '" stroke-width="' . ($i % 2 ? 2 : 6) . '" stroke-linecap="round" opacity="' . ($i % 2 ? '.25' : '1') . '"/>';
                }
                $g .= '<circle cx="168" cy="26" r="14" fill="var(--yn-lime)"/>';
                break;
            case 'sun':
                $g .= '<circle cx="100" cy="120" r="70" fill="' . $c . '"/><circle cx="100" cy="120" r="44" fill="var(--yn-hot2)"/>';
                for ($i = 0; $i < 11; $i++) {
                    $an = M_PI + $i * M_PI / 10;
                    $g .= '<line x1="' . round(100 + cos($an) * 82, 1) . '" y1="' . round(120 + sin($an) * 82, 1) . '" x2="' . round(100 + cos($an) * 104, 1) . '" y2="' . round(120 + sin($an) * 104, 1) . '" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".8"/>';
                }
                break;
            case 'quote':
                $g .= '<path d="M30 90 V60 Q30 26 64 20 L68 32 Q48 38 48 58 H66 V90 Z M96 90 V60 Q96 26 130 20 L134 32 Q114 38 114 58 H132 V90 Z" fill="' . $c . '"/><circle cx="170" cy="86" r="12" fill="var(--yn-lime)"/>';
                break;
            default:
                for ($i = 0; $i < 26; $i++) {
                    $g .= '<circle cx="' . (int) (10 + $r($i) * 180) . '" cy="' . (int) (10 + $r($i + 40) * 100) . '" r="' . (3 + (int) ($r($i + 80) * 13)) . '" fill="' . ($i % 4 === 0 ? 'var(--yn-lime)' : ($i % 3 === 0 ? 'currentColor' : $c)) . '" opacity="' . ($i % 3 === 0 ? '.3' : '1') . '"/>';
                }
        }
        return '<svg class="' . Html::e($cls) . '" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' . $g . '</svg>';
    }

    public static function artFor(string $slug, int $seed = 0, string $cls = 'yn-art'): string
    {
        $s = self::section($slug);
        return self::art($s['color'] ?? self::colors()['hot'], $s['motif'] ?? 'dots', $seed, $cls);
    }

    /* ------------------------------------------------------------------ db */

    private static function ro(): ?PDO
    {
        if (self::$ro === null) {
            try {
                self::$ro = Db::connect((string) (getenv('DATABASE_URL') ?: ''));
            } catch (Throwable $e) {
                error_log('[sector] ro: ' . $e->getMessage());
                return null;
            }
        }
        return self::$ro;
    }

    private static function rw(): ?PDO
    {
        if (self::$rw === null) {
            $p = parse_url((string) (self::conf()['dsn'] ?? ''));
            if (!is_array($p) || empty($p['host'])) {
                return null;
            }
            try {
                self::$rw = new PDO(
                    sprintf('pgsql:host=%s;port=%d;dbname=%s;connect_timeout=4;sslmode=require', $p['host'], (int) ($p['port'] ?? 5432), ltrim((string) ($p['path'] ?? '/neondb'), '/')),
                    rawurldecode((string) ($p['user'] ?? '')),
                    rawurldecode((string) ($p['pass'] ?? '')),
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => true]
                );
                self::$rw->exec("SET statement_timeout = '6s'");
            } catch (Throwable $e) {
                error_log('[sector] rw: ' . $e->getMessage());
                return null;
            }
        }
        return self::$rw;
    }

    /** @return list<array<string, mixed>> */
    private static function rows(?PDO $pdo, string $sql, array $args = []): array
    {
        if ($pdo === null) {
            return [];
        }
        try {
            $st = $pdo->prepare($sql);
            $st->execute($args);
            return $st->fetchAll();
        } catch (Throwable $e) {
            error_log('[sector] q: ' . $e->getMessage());
            return [];
        }
    }

    /** @return list<array<string, mixed>> */
    public static function provinces(): array
    {
        return self::rows(self::ro(), 'SELECT plaka, adi FROM tr_il ORDER BY plaka');
    }

    /** @return array<string, mixed>|null */
    private static function province(int $plaka): ?array
    {
        return self::rows(self::ro(), 'SELECT plaka, adi FROM tr_il WHERE plaka = :p', ['p' => $plaka])[0] ?? null;
    }

    /** @return array<string, mixed>|null */
    private static function district(int $id): ?array
    {
        return self::rows(self::ro(), 'SELECT i.kimlik_no, i.adi, i.il_plaka, l.adi AS il FROM tr_ilce i JOIN tr_il l ON l.plaka = i.il_plaka WHERE i.kimlik_no = :i', ['i' => $id])[0] ?? null;
    }

    /** @return array<string, mixed>|null */
    private static function neighborhood(int $id): ?array
    {
        return self::rows(self::ro(), 'SELECT m.kimlik_no, m.adi, m.bilesen, m.il_plaka, m.ilce_kimlik, i.adi AS ilce, l.adi AS il FROM tr_mahalle m JOIN tr_ilce i ON i.kimlik_no = m.ilce_kimlik JOIN tr_il l ON l.plaka = m.il_plaka WHERE m.kimlik_no = :m', ['m' => $id])[0] ?? null;
    }

    /* ------------------------------------------------------------------ tokens */

    private static function secret(): string
    {
        return (string) (self::conf()['secret'] ?? 'sector');
    }

    public static function token(string $purpose): string
    {
        $t = (string) (intdiv(time(), 60) * 60);
        return $t . '.' . substr(hash_hmac('sha256', $purpose . '|' . (self::$site->id ?? 0) . '|' . $t, self::secret()), 0, 24);
    }

    private static function tokenOk(string $purpose, string $tok): bool
    {
        if (preg_match('/^(\d{9,11})\.([a-f0-9]{24})$/', $tok, $m) !== 1) {
            return false;
        }
        $age = time() - (int) $m[1];
        if ($age < 3 || $age > 14 * 86400) { // < 3 s: bot
            return false;
        }
        return hash_equals(substr(hash_hmac('sha256', $purpose . '|' . (self::$site->id ?? 0) . '|' . $m[1], self::secret()), 0, 24), $m[2]);
    }

    private static function ipHash(): string
    {
        $ip = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? ''));
        return hash_hmac('sha256', 'ip|' . $ip, self::secret());
    }

    /* ------------------------------------------------------------------ routing */

    /**
     * @return array{title: string, desc: string, body: string, path: string, status?: int, jsonLd?: array, image?: string, redirect?: string, nostore?: bool, raw?: string}|null
     */
    public static function page(Repository $repo, Site $site, string $path, string $method = 'GET'): ?array
    {
        self::init($site);
        if (self::$def === []) {
            return null;
        }
        if ($method === 'POST') {
            return str_starts_with($path, '/sektor/') ? self::post($path) : null;
        }
        $key = self::key();
        if ($path === '/') {
            return self::home($repo);
        }
        if ($path === '/bolumler') {
            return self::sectionsPage($repo);
        }
        if ($path === '/rehber') {
            return self::guideIndex();
        }
        if (preg_match('#^/rehber/([a-z]{3,12})$#', $path, $m) === 1) {
            return self::guideList($m[1]);
        }
        if (preg_match('#^/rehber/([a-z]{3,12})/(\d+)-([a-z0-9-]{1,80})(/kartvizit)?$#', $path, $m) === 1) {
            return self::guideItem($m[1], (int) $m[2], isset($m[4]));
        }
        if ($path === '/uye-ol') {
            return self::joinPage();
        }
        if ($path === '/talep') {
            return self::requestPage(0);
        }
        if (preg_match('#^/talep/(\d{1,9})$#', $path, $m) === 1) {
            return self::requestPage((int) $m[1]);
        }
        if ($path === '/kvkk-aydinlatma') {
            return self::kvkkPage();
        }
        if ($path === '/yardim') {
            return ['title' => 'Nasıl Kullanılır / Yardım | ' . self::$site->name, 'desc' => self::$site->name . ' sitesinin kullanım rehberi: rehber, üyelik, talep gönderme ve editör paneli.', 'body' => self::render('help', ['site' => self::$site]), 'path' => '/yardim'];
        }
        if ($path === '/duyurular') {
            foreach (self::sections() as $s) {
                if (str_contains($s['slug'], 'duyuru')) {
                    return ['title' => '', 'desc' => '', 'body' => '', 'path' => $path, 'redirect' => '/kategori/' . $s['slug']];
                }
            }
        }
        if (str_starts_with($path, '/sektor/')) {
            return self::internal($path);
        }
        if ($key === 'muhtar') {
            if ($path === '/mahallemi-bul') {
                return self::findIndex();
            }
            if (preg_match('#^/mahallemi-bul/(\d{1,2})-([a-z0-9-]{1,60})$#', $path, $m) === 1) {
                return self::findProvince((int) $m[1]);
            }
            if (preg_match('#^/mahallemi-bul/(\d{1,2})-([a-z0-9-]{1,60})/(\d+)-([a-z0-9-]{1,80})$#', $path, $m) === 1) {
                return self::findDistrict((int) $m[3]);
            }
            if (preg_match('#^/mahalle/(\d+)-([a-z0-9-]{1,100})$#', $path, $m) === 1) {
                return self::neighborhoodPage((int) $m[1]);
            }
        }
        if ($path === '/araclar') { // sector 2026-10-10: her platformda anlamlı araçlar (sendika: hesaplayıcılar, okul: net/ortalama/geri sayım, muhtar: dilekçe/adres süresi)
            return self::toolsPage();
        }
        try {
            $kb = self::kbRoute($path);
        } catch (Throwable $e) {
            error_log('[sector] kb: ' . $e->getMessage());
            $kb = null;
        }
        if ($kb !== null) {
            return $kb;
        }
        return null;
    }

    /** Paths for sitemap.xml (public, static + province pages). @return list<string> */
    public static function sitemapPaths(Site $site): array
    {
        self::init($site);
        $p = ['/bolumler', '/rehber', '/uye-ol', '/talep', '/kvkk-aydinlatma', '/yardim'];
        foreach ((array) (self::$def['kinds'] ?? []) as $k) {
            $p[] = '/rehber/' . $k['key'];
        }
        if (self::key() === 'muhtar') {
            $p[] = '/mahallemi-bul';
            foreach (self::provinces() as $r) {
                $p[] = '/mahallemi-bul/' . (int) $r['plaka'] . '-' . self::slug((string) $r['adi']);
            }
        }
        $p[] = '/araclar';
        $p[] = '/bilgi';
        foreach (array_keys((array) (self::kbContent()[self::key()]['pages'] ?? [])) as $kbSlug) {
            $p[] = '/' . $kbSlug;
        }
        if (self::key() === 'okul') {
            $p[] = '/il';
            foreach (self::provinces() as $r) {
                $p[] = '/il/' . (int) $r['plaka'] . '-' . self::slug((string) $r['adi']);
            }
        }
        foreach (self::rows(self::ro(), "SELECT DISTINCT kind, il_plaka FROM sector_directory WHERE site_id = :s AND status = 'approved' AND kind IN ('okul','ozel','kurumdisi','yurt','muhtar') AND il_plaka IS NOT NULL ORDER BY 1, 2", ['s' => $site->id]) as $r) {
            $p[] = '/rehber/' . $r['kind'] . '?sehir=' . (int) $r['il_plaka'];
        }
        foreach (self::rows(self::ro(), "SELECT id, kind, name FROM sector_directory WHERE site_id = :s AND status = 'approved' AND kind NOT IN ('okul','ozel','kurumdisi','yurt','muhtar') ORDER BY id LIMIT 2000", ['s' => $site->id]) as $r) {
            $p[] = '/rehber/' . $r['kind'] . '/' . (int) $r['id'] . '-' . self::slug((string) $r['name']);
        }
        return $p;
    }

    private static function render(string $tpl, array $data): string
    {
        extract($data, EXTR_SKIP);
        ob_start();
        require dirname(__DIR__) . '/templates/sector/' . $tpl . '.php';
        return (string) ob_get_clean();
    }

    private static function lead(): string
    {
        return (string) (self::$def['desc'] ?? '');
    }

    /* ------------------------------------------------------------------ pages */

    private static function home(Repository $repo): array
    {
        $site = self::$site;
        $latest = [];
        $per = [];
        try {
            $latest = $repo->stories($site->id, '', 30);
        } catch (Throwable $e) {
            error_log('[sector] home: ' . $e->getMessage());
        }
        try {
            $per = $repo->latestPerCategory($site->id, array_column(self::sections(), 'slug'), 4);
        } catch (Throwable $e) {
            error_log('[sector] per: ' . $e->getMessage());
        }
        $provinces = self::key() === 'muhtar' ? self::provinces() : [];
        $dirCount = self::rows(self::ro(), "SELECT kind, count(*) AS c FROM sector_directory WHERE site_id = :s AND status = 'approved' GROUP BY kind", ['s' => $site->id]);
        return [
            'title' => $site->name . ' – ' . (string) self::$def['slogan'],
            'desc' => self::lead(),
            'body' => self::render('home', ['site' => $site, 'latest' => $latest, 'per' => $per, 'provinces' => $provinces, 'dirCount' => array_column($dirCount, 'c', 'kind')]),
            'path' => '/',
            'jsonLd' => [
                '@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => $site->name, 'alternateName' => $site->name . ' – ' . self::$def['slogan'],
                'url' => $site->canonical('/'), 'inLanguage' => 'tr-TR',
                'publisher' => ['@type' => 'Organization', 'name' => $site->name, 'logo' => ['@type' => 'ImageObject', 'url' => $site->canonical('/brand/sector/' . self::key() . '/icon-512.png')]],
            ],
        ];
    }

    private static function sectionsPage(Repository $repo): array
    {
        $per = [];
        try {
            $per = $repo->latestPerCategory(self::$site->id, array_column(self::sections(), 'slug'), 3);
        } catch (Throwable) {
        }
        return ['title' => 'Bölümler | ' . self::$site->name, 'desc' => self::$def['name'] . ' bölümleri: ' . implode(', ', array_column(self::sections(), 'name')) . '.',
            'body' => self::render('sections', ['site' => self::$site, 'per' => $per]), 'path' => '/bolumler'];
    }

    private static function guideIndex(): array
    {
        $counts = array_column(self::rows(self::ro(), "SELECT kind, count(*) AS c FROM sector_directory WHERE site_id = :s AND status = 'approved' GROUP BY kind", ['s' => self::$site->id]), 'c', 'kind');
        return ['title' => 'Rehber | ' . self::$site->name, 'desc' => self::$def['name'] . ' rehberi: ' . self::lead(),
            'body' => self::render('guide-index', ['site' => self::$site, 'counts' => $counts]), 'path' => '/rehber'];
    }

    /** @return array<string, mixed>|null */
    private static function kind(string $k): ?array
    {
        foreach ((array) (self::$def['kinds'] ?? []) as $kd) {
            if ($kd['key'] === $k) {
                return $kd;
            }
        }
        return null;
    }

    private static function guideList(string $k): ?array
    {
        $kd = self::kind($k);
        if ($kd === null) {
            return null;
        }
        $plaka = (int) ($_GET['sehir'] ?? 0);
        $ilceId = (int) ($_GET['ilce'] ?? 0);
        $q = trim(mb_substr((string) ($_GET['q'] ?? ''), 0, 60));
        $page = max(1, min(2000, (int) ($_GET['sayfa'] ?? 1)));
        $per = 30;
        $args = ['s' => self::$site->id, 'k' => $k, 'lim' => $per + 1, 'off' => ($page - 1) * $per];
        $where = '';
        if ($plaka > 0 && $plaka <= 81) {
            $where .= ' AND d.il_plaka = :pl';
            $args['pl'] = $plaka;
            if ($ilceId > 0) {
                $where .= ' AND d.ilce_id = :ic';
                $args['ic'] = $ilceId;
            }
        } else {
            $plaka = 0;
            $ilceId = 0;
        }
        if (mb_strlen($q) >= 2) {
            $where .= " AND (d.name ILIKE :q OR d.data->>'mahalle' ILIKE :q OR d.data->>'adres' ILIKE :q)";
            $args['q'] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        } else {
            $q = '';
        }
        $rows = self::rows(self::ro(), "SELECT d.id, d.kind, d.name, d.summary, d.il_plaka, d.ilce_id, d.mahalle_id, d.web, d.data::text AS data, l.adi AS il, i.adi AS ilce
            FROM sector_directory d LEFT JOIN tr_il l ON l.plaka = d.il_plaka LEFT JOIN tr_ilce i ON i.kimlik_no = d.ilce_id
            WHERE d.site_id = :s AND d.kind = :k AND d.status = 'approved'" . $where . ' ORDER BY d.sort_order, d.name LIMIT :lim OFFSET :off', $args);
        $more = count($rows) > $per;
        $rows = array_slice($rows, 0, $per);
        $ilceler = $plaka > 0 && !empty($kd['geo']) ? self::rows(self::ro(), 'SELECT kimlik_no AS id, adi FROM tr_ilce WHERE il_plaka = :p ORDER BY adi', ['p' => $plaka]) : [];
        $qs = ($plaka > 0 ? 'sehir=' . $plaka . '&' : '') . ($ilceId > 0 ? 'ilce=' . $ilceId . '&' : '') . ($q !== '' ? 'q=' . rawurlencode($q) . '&' : '');
        return ['title' => $kd['label'] . ($plaka > 0 ? ' - ' . self::tr((string) (self::provinceName($plaka))) : '') . ' | ' . self::$site->name, 'desc' => (string) $kd['blurb'],
            'body' => self::render('guide-list', ['site' => self::$site, 'kd' => $kd, 'rows' => $rows, 'plaka' => $plaka, 'ilceId' => $ilceId, 'q' => $q, 'ilceler' => $ilceler, 'page' => $page, 'more' => $more, 'provinces' => !empty($kd['geo']) ? self::provinces() : []]),
            'path' => '/rehber/' . $k . ($qs !== '' || $page > 1 ? '?' . $qs . ($page > 1 ? 'sayfa=' . $page : '') : ''), 'noindex' => $q !== '' || $page > 20];
    }

    private static function provinceName(int $plaka): string
    {
        foreach (self::provinces() as $r) {
            if ((int) $r['plaka'] === $plaka) {
                return (string) $r['adi'];
            }
        }
        return '';
    }

    private static function guideItem(string $k, int $id, bool $card = false): ?array
    {
        $kd = self::kind($k);
        if ($kd === null) {
            return null;
        }
        $r = self::rows(self::ro(), "SELECT d.id, d.kind, d.name, d.summary, d.il_plaka, d.ilce_id, d.mahalle_id, d.web, (d.contact IS NOT NULL AND d.contact <> '') AS has_tel, d.contact, d.data::text AS data, l.adi AS il, i.adi AS ilce, m.bilesen AS mahalle
            FROM sector_directory d LEFT JOIN tr_il l ON l.plaka = d.il_plaka LEFT JOIN tr_ilce i ON i.kimlik_no = d.ilce_id LEFT JOIN tr_mahalle m ON m.kimlik_no = d.mahalle_id
            WHERE d.site_id = :s AND d.kind = :k AND d.id = :i AND d.status = 'approved'", ['s' => self::$site->id, 'k' => $k, 'i' => $id])[0] ?? null;
        if ($r === null) {
            return null;
        }
        $slug = self::slug((string) $r['name']);
        if ($card) {
            return ['title' => 'Kartvizit: ' . $r['name'] . ' | ' . self::$site->name, 'desc' => (string) ($r['summary'] ?: $kd['blurb']),
                'body' => self::render('card', ['site' => self::$site, 'kd' => $kd, 'r' => $r, 'telTok' => self::token('tel'), 'url' => self::$site->canonical('/rehber/' . $k . '/' . $id . '-' . $slug)]),
                'path' => '/rehber/' . $k . '/' . $id . '-' . $slug . '/kartvizit', 'noindex' => true];
        }
        return ['title' => $r['name'] . ' | ' . $kd['label'] . ' | ' . self::$site->name, 'desc' => (string) ($r['summary'] ?: $kd['blurb']),
            'body' => self::render('guide-item', ['site' => self::$site, 'kd' => $kd, 'r' => $r, 'telTok' => self::token('tel')]),
            'noindex' => $k === 'muhtar',
            'path' => '/rehber/' . $k . '/' . $id . '-' . self::slug((string) $r['name'])];
    }

    private static function formCommon(): array
    {
        return ['site' => self::$site, 'provinces' => self::provinces(), 'def' => self::$def];
    }

    private static function joinPage(): array
    {
        return ['title' => 'Üye ol / Rehbere başvur | ' . self::$site->name, 'desc' => self::$def['name'] . ' rol ve onaylı üyelik başvurusu: başvurun editör onayından sonra rehberde yayımlanır.',
            'body' => self::render('join', self::formCommon() + ['token' => self::token('uye'), 'err' => '', 'old' => []]), 'path' => '/uye-ol'];
    }

    private static function requestPage(int $pre): array
    {
        $rq = (array) (self::$def['request'] ?? []);
        $info = $pre > 0 ? self::neighborhood($pre) : null;
        return ['title' => ($rq['title'] ?? 'Talep formu') . ' | ' . self::$site->name, 'desc' => (string) ($rq['lead'] ?? ''),
            'body' => self::render('request', self::formCommon() + ['token' => self::token('talep'), 'err' => '', 'old' => [], 'preMah' => $info !== null ? $pre : 0, 'preInfo' => $info ?? []]),
            'path' => $info !== null ? '/talep/' . $pre : '/talep'];
    }

    private static function kvkkPage(): array
    {
        return ['title' => 'KVKK Aydınlatma Metni | ' . self::$site->name, 'desc' => self::$site->name . ' üyelik ve talep formları için KVKK aydınlatma metni.',
            'body' => self::render('kvkk', ['site' => self::$site]), 'path' => '/kvkk-aydinlatma'];
    }

    private static function toolsPage(): array
    {
        $k = self::key();
        $meta = [
            'sendika' => ['Hesaplama Araçları | ', 'Kıdem ve ihbar tazminatı, yıllık izin, fazla mesai ve zam hesaplayıcıları. Tahmini hesaplardır; hukuki ya da mali tavsiye değildir.'],
            'okul' => ['Eğitim Araçları: Net, Ortalama ve Geri Sayım | ', 'Net hesaplama (YKS/LGS), ağırlıklı not ortalaması ve resmî tarihlere geri sayım araçları. Tarayıcında çalışır; veri sunucuya gönderilmez.'],
            'muhtar' => ['Mahalle Araçları: Dilekçe Metni ve Adres Bildirim Süresi | ', 'Dilekçe/talep metni oluşturucu ve adres bildirimi süre hesaplayıcı. Tarayıcında çalışır; veri sunucuya gönderilmez.'],
        ][$k] ?? ['Araçlar | ', 'Araçlar'];
        $tpl = is_file(dirname(__DIR__) . '/templates/sector/tools-' . $k . '.php') ? 'tools-' . $k : 'tools';
        return ['title' => $meta[0] . self::$site->name, 'desc' => $meta[1],
            'body' => self::render($tpl, ['site' => self::$site]), 'path' => '/araclar'];
    }

    /* ---- sector 2026-10-10: bilgi merkezi (sözlük, SSS, kontrol listeleri, takvim, rehberler, emsal kararlar) — config/sector-content.json */

    /** @return array<string, mixed> */
    public static function kbContent(): array
    {
        static $c = null;
        if ($c === null) {
            $f = dirname(__DIR__) . '/config/sector-content.json';
            $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
            $c = is_array($j) ? $j : [];
        }
        return $c;
    }

    /** @return list<string> */
    private static function memSlugs(): array
    {
        return (array) (self::kbContent()['_mem'] ?? []);
    }

    private static function kbRoute(string $path): ?array
    {
        $key = self::key();
        $kb = self::kbContent()[$key] ?? null;
        if (!is_array($kb)) {
            return null;
        }
        if ($path === '/bilgi') {
            return self::kbHub($kb);
        }
        if (preg_match('#^/([a-z0-9-]{3,40})$#', $path, $m) === 1 && isset($kb['pages'][$m[1]])) {
            return self::kbPage($m[1], $kb['pages'][$m[1]]);
        }
        if ($key === 'okul') {
            if ($path === '/il') {
                return self::ilIndex();
            }
            if (preg_match('#^/il/(\d{1,2})-([a-z0-9-]{1,40})$#', $path, $m) === 1) {
                return self::ilPage((int) $m[1]);
            }
        }
        return null;
    }

    private static function kbHub(array $kb): array
    {
        $h = (array) ($kb['hub'] ?? []);
        return ['title' => (string) ($h['title'] ?? 'Bilgi Merkezi'), 'desc' => (string) ($h['desc'] ?? ''), 'path' => '/bilgi',
            'body' => self::render('kb-hub', ['site' => self::$site, 'hub' => $h, 'pages' => (array) ($kb['pages'] ?? [])])];
    }

    private static function kbPage(string $slug, array $pg): array
    {
        $out = ['title' => (string) $pg['title'], 'desc' => (string) $pg['desc'], 'path' => '/' . $slug,
            'body' => self::render('kb', ['site' => self::$site, 'pg' => $pg, 'slug' => $slug])];
        if (($pg['type'] ?? '') === 'faq') {
            $q = [];
            foreach ((array) $pg['items'] as $it) {
                $q[] = ['@type' => 'Question', 'name' => (string) $it[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => trim(strip_tags((string) $it[1]))]];
            }
            $out['jsonLd'] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $q];
        }
        return $out;
    }

    private static function ilIndex(): array
    {
        $rows = self::rows(self::ro(), "SELECT il_plaka, count(*) AS c FROM sector_directory WHERE site_id = :s AND status = 'approved' AND il_plaka IS NOT NULL GROUP BY il_plaka", ['s' => self::$site->id]);
        return ['title' => 'İllere Göre Eğitim Rehberi | ' . self::$site->name, 'desc' => '81 ilde okul, özel kurum, yurt ve kurum dışı eğitim kayıtları: il seçin, ilçeye göre listeleyin.', 'path' => '/il',
            'body' => self::render('il-index', ['site' => self::$site, 'provinces' => self::provinces(), 'counts' => array_column($rows, 'c', 'il_plaka')])];
    }

    private static function ilPage(int $plaka): ?array
    {
        $p = self::province($plaka);
        if ($p === null) {
            return null;
        }
        $name = self::tr((string) $p['adi']);
        $kinds = self::rows(self::ro(), "SELECT kind, count(*) AS c FROM sector_directory WHERE site_id = :s AND status = 'approved' AND il_plaka = :p GROUP BY kind", ['s' => self::$site->id, 'p' => $plaka]);
        $ilce = self::rows(self::ro(), "SELECT i.kimlik_no AS id, i.adi, count(*) AS c FROM sector_directory d JOIN tr_ilce i ON i.kimlik_no = d.ilce_id WHERE d.site_id = :s AND d.status = 'approved' AND d.kind = 'okul' AND d.il_plaka = :p GROUP BY i.kimlik_no, i.adi ORDER BY c DESC, i.adi", ['s' => self::$site->id, 'p' => $plaka]);
        $slug = self::slug((string) $p['adi']);
        $mem = in_array($slug, self::memSlugs(), true) ? 'https://' . $slug . '.meb.gov.tr' : '';
        return ['title' => $name . ' Eğitim Rehberi: Okullar, Yurtlar, Kurslar | ' . self::$site->name, 'desc' => $name . ' ilindeki okul, özel kurum, yurt ve kurum dışı eğitim kayıtları ilçelere göre; resmî kaynaklara bağlantılar.', 'path' => '/il/' . $plaka . '-' . $slug,
            'body' => self::render('il-page', ['site' => self::$site, 'plaka' => $plaka, 'name' => $name, 'kinds' => array_column($kinds, 'c', 'kind'), 'ilce' => $ilce, 'mem' => $mem])];
    }

    /* ---- Mahallemi Bul (tr_il / tr_ilce / tr_mahalle) */

    private static function findIndex(): array
    {
        return ['title' => 'Mahallemi Bul | ' . self::$site->name, 'desc' => '81 il, ilçe ve mahalle listesinden mahalleni bul; muhtarını, duyuruları ve talep formunu gör.',
            'body' => self::render('find', ['site' => self::$site, 'mode' => 'index', 'provinces' => self::provinces()]), 'path' => '/mahallemi-bul'];
    }

    private static function findProvince(int $plaka): ?array
    {
        $il = self::province($plaka);
        if ($il === null) {
            return null;
        }
        $ilceler = self::rows(self::ro(), 'SELECT i.kimlik_no, i.adi, (SELECT count(*) FROM tr_mahalle m WHERE m.ilce_kimlik = i.kimlik_no) AS n FROM tr_ilce i WHERE i.il_plaka = :p ORDER BY i.adi', ['p' => $plaka]);
        return ['title' => self::tr((string) $il['adi']) . ' mahalleleri | Mahallemi Bul | ' . self::$site->name, 'desc' => self::tr((string) $il['adi']) . ' ilçeleri ve mahalleleri: mahalleni seç, muhtarını bul.',
            'body' => self::render('find', ['site' => self::$site, 'mode' => 'province', 'il' => $il, 'ilceler' => $ilceler]), 'path' => '/mahallemi-bul/' . $plaka . '-' . self::slug((string) $il['adi'])];
    }

    private static function findDistrict(int $ilceId): ?array
    {
        $d = self::district($ilceId);
        if ($d === null) {
            return null;
        }
        $mah = self::rows(self::ro(), 'SELECT m.kimlik_no, m.adi, m.bilesen, (SELECT count(*) FROM sector_directory s WHERE s.site_id = :s AND s.mahalle_id = m.kimlik_no AND s.status = \'approved\') AS muhtar
            FROM tr_mahalle m WHERE m.ilce_kimlik = :i ORDER BY m.adi LIMIT 1500', ['i' => $ilceId, 's' => self::$site->id]);
        return ['title' => self::tr((string) $d['adi']) . ' / ' . self::tr((string) $d['il']) . ' mahalleleri | ' . self::$site->name, 'desc' => self::tr((string) $d['il']) . ' ' . self::tr((string) $d['adi']) . ' ilçesindeki mahalleler: muhtarını bul, talep gönder.',
            'body' => self::render('find', ['site' => self::$site, 'mode' => 'district', 'd' => $d, 'mah' => $mah]),
            'path' => '/mahallemi-bul/' . (int) $d['il_plaka'] . '-' . self::slug((string) $d['il']) . '/' . $ilceId . '-' . self::slug((string) $d['adi'])];
    }

    private static function neighborhoodPage(int $id): ?array
    {
        $m = self::neighborhood($id);
        if ($m === null) {
            return null;
        }
        $muhtar = self::rows(self::ro(), "SELECT id, name, summary, web, contact FROM sector_directory WHERE site_id = :s AND kind = 'muhtar' AND mahalle_id = :m AND status = 'approved' ORDER BY id LIMIT 3", ['s' => self::$site->id, 'm' => $id]);
        $label = self::tr((string) $m['bilesen'] ?: (string) $m['adi']);
        return ['title' => $label . ' – ' . self::tr((string) $m['ilce']) . ', ' . self::tr((string) $m['il']) . ' | ' . self::$site->name, 'desc' => $label . ' muhtarlığı: muhtar bilgisi ve talep formu. ' . self::tr((string) $m['ilce']) . ', ' . self::tr((string) $m['il']) . '.',
            'body' => self::render('neighborhood', ['site' => self::$site, 'm' => $m, 'muhtar' => $muhtar, 'label' => $label]),
            'path' => '/mahalle/' . $id . '-' . self::slug((string) $m['adi'])];
    }

    /* ------------------------------------------------------------------ internal endpoints (/sektor/*) */

    private static function json(int $status, array $body): array
    {
        return ['title' => '', 'desc' => '', 'body' => '', 'path' => '', 'status' => $status, 'raw' => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'rawType' => 'application/json; charset=utf-8', 'nostore' => true];
    }

    /** Muhtar GSM numbers never sit in the HTML: token (>=3 s old, HMAC) + per-IP hourly cap + XHR header, then JSON. */
    private static function telApi(): array
    {
        $hdr = (string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        if ($hdr !== 'sc' || strlen($ua) < 12 || !self::tokenOk('tel', (string) ($_GET['t'] ?? ''))) {
            return self::json(403, ['error' => 'denied']);
        }
        $f = sys_get_temp_dir() . '/sc-tel-' . substr(self::ipHash(), 0, 16);
        $hits = [];
        if (is_file($f)) {
            $hits = array_filter(array_map('intval', (array) @file($f, FILE_IGNORE_NEW_LINES)), static fn (int $t): bool => $t > time() - 3600);
        }
        if (count($hits) >= 25) {
            return self::json(429, ['error' => 'limit']);
        }
        $hits[] = time();
        @file_put_contents($f, implode("\n", $hits), LOCK_EX);
        $r = self::rows(self::ro(), "SELECT contact FROM sector_directory WHERE site_id = :s AND id = :i AND status = 'approved' AND contact IS NOT NULL", ['s' => self::$site->id, 'i' => (int) ($_GET['id'] ?? 0)])[0] ?? null;
        if ($r === null) {
            return self::json(404, ['error' => 'none']);
        }
        return self::json(200, ['tel' => preg_replace('/\D/', '', (string) $r['contact'])]);
    }

    private static function internal(string $path): ?array
    {
        if ($path === '/sektor/api/ilce') {
            $rows = self::rows(self::ro(), 'SELECT kimlik_no AS id, adi FROM tr_ilce WHERE il_plaka = :p ORDER BY adi', ['p' => (int) ($_GET['il'] ?? 0)]);
            return self::json(200, ['items' => array_map(static fn (array $r): array => ['id' => (int) $r['id'], 'name' => self::tr((string) $r['adi'])], $rows)]);
        }
        if ($path === '/sektor/api/mahalle') {
            $rows = self::rows(self::ro(), 'SELECT kimlik_no AS id, adi, bilesen FROM tr_mahalle WHERE ilce_kimlik = :i ORDER BY adi LIMIT 2000', ['i' => (int) ($_GET['ilce'] ?? 0)]);
            return self::json(200, ['items' => array_map(static fn (array $r): array => ['id' => (int) $r['id'], 'name' => self::tr((string) ($r['bilesen'] ?: $r['adi']))], $rows)]);
        }
        if ($path === '/sektor/api/tel') {
            return self::telApi();
        }
        if ($path === '/sektor/takip') {
            return self::trackPage();
        }
        if ($path === '/sektor/panel') {
            return self::panel('GET');
        }
        return null;
    }

    private static function post(string $path): ?array
    {
        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        $host = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
        if ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== $host) {
            return self::json(403, ['ok' => false, 'error' => 'Geçersiz istek.']);
        }
        if ($path === '/sektor/uye') {
            return self::submitJoin();
        }
        if ($path === '/sektor/talep') {
            return self::submitRequest();
        }
        if ($path === '/sektor/panel') {
            return self::panel('POST');
        }
        return null;
    }

    private static function clean(string $k, int $max): string
    {
        $v = trim((string) ($_POST[$k] ?? ''));
        $v = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $v);
        return mb_substr($v, 0, $max, 'UTF-8');
    }

    private static function thanks(string $title, string $html, int $status = 200): array
    {
        return ['title' => $title . ' | ' . self::$site->name, 'desc' => $title, 'body' => self::render('thanks', ['site' => self::$site, 'h' => $title, 'html' => $html]), 'path' => '/sektor/sonuc', 'status' => $status, 'nostore' => true, 'noindex' => true];
    }

    private static function geoCheck(int $il, int $ilce, int $mah): array
    {
        if ($il <= 0) {
            return [0, 0, 0];
        }
        if (self::province($il) === null) {
            return [0, 0, 0];
        }
        $d = $ilce > 0 ? self::district($ilce) : null;
        if ($d === null || (int) $d['il_plaka'] !== $il) {
            return [$il, 0, 0];
        }
        $m = $mah > 0 ? self::neighborhood($mah) : null;
        if ($m === null || (int) $m['ilce_kimlik'] !== $ilce) {
            return [$il, $ilce, 0];
        }
        return [$il, $ilce, $mah];
    }

    private static function submitJoin(): array
    {
        $def = self::$def;
        if (self::clean('website', 100) !== '') {
            return self::thanks('Başvurun alındı', '<p>Teşekkürler.</p>');
        }
        $rw = self::rw();
        if ($rw === null || !self::tokenOk('uye', self::clean('token', 60))) {
            return self::thanks('Form süresi doldu', '<p>Formun süresi dolmuş olabilir. Lütfen <a href="/uye-ol">formu yenileyip</a> tekrar dene.</p>', 400);
        }
        $roleKey = self::clean('role', 30);
        $role = null;
        foreach ((array) $def['roles'] as $r) {
            if ($r['key'] === $roleKey) {
                $role = $r;
            }
        }
        $name = self::clean('full_name', 120);
        $email = strtolower(self::clean('email', 160));
        $phone = self::clean('phone', 30);
        $org = self::clean('org', 160);
        $note = self::clean('note', 1500);
        if ($role === null || mb_strlen($name) < 3 || filter_var($email, FILTER_VALIDATE_EMAIL) === false || self::clean('kvkk', 5) !== '1') {
            return self::thanks('Form eksik', '<p>Rol, ad soyad, geçerli bir e-posta ve KVKK onayı zorunludur. <a href="/uye-ol">Forma dön</a>.</p>', 400);
        }
        if ($roleKey === 'veli' || $roleKey === 'ogretmen' || $roleKey === 'okul') {
            if (self::clean('adult', 5) !== '1') {
                return self::thanks('Onay gerekli', '<p>18 yaşından büyük olduğunu (ya da yasal velin adına başvurduğunu) onaylamalısın. <a href="/uye-ol">Forma dön</a>.</p>', 400);
            }
        }
        if (!empty($role['listed']) && mb_strlen($org) < 3) {
            return self::thanks('Kurum adı gerekli', '<p>Rehberde görünecek ad (muhtarlık / okul / sendika adı) zorunludur. <a href="/uye-ol">Forma dön</a>.</p>', 400);
        }
        [$il, $ilce, $mah] = self::geoCheck((int) ($_POST['il'] ?? 0), (int) ($_POST['ilce'] ?? 0), (int) ($_POST['mahalle'] ?? 0));
        if (!empty($role['geo']) && !empty($role['listed']) && ($il === 0 || $ilce === 0 || ($roleKey === 'muhtar' && $mah === 0))) {
            return self::thanks('Konum gerekli', '<p>İl, ilçe' . ($roleKey === 'muhtar' ? ' ve mahalle' : '') . ' seçmelisin. <a href="/uye-ol">Forma dön</a>.</p>', 400);
        }
        $ip = self::ipHash();
        try {
            $st = $rw->prepare("SELECT count(*) FROM sector_members WHERE ip_hash = :i AND created_at > now() - interval '1 hour'");
            $st->execute(['i' => $ip]);
            if ((int) $st->fetchColumn() >= 5) {
                return self::thanks('Çok fazla deneme', '<p>Kısa sürede çok fazla başvuru yapıldı. Biraz sonra tekrar dene.</p>', 429);
            }
            $st = $rw->prepare("SELECT id FROM sector_members WHERE site_id = :s AND lower(email) = :e AND role = :r AND status <> 'rejected' LIMIT 1");
            $st->execute(['s' => self::$site->id, 'e' => $email, 'r' => $roleKey]);
            if ($st->fetchColumn() !== false) {
                return self::thanks('Başvurun zaten kayıtlı', '<p>Bu e-posta ve rol için bir başvuru zaten var. Editör onayını bekliyor.</p>');
            }
            $rw->beginTransaction();
            $ins = $rw->prepare('INSERT INTO sector_members (site_id, role, full_name, email, phone, org, il_plaka, ilce_id, mahalle_id, note, ip_hash) VALUES (:s,:r,:n,:e,:p,:o,:il,:ilce,:m,:note,:ip) RETURNING id');
            $ins->execute(['s' => self::$site->id, 'r' => $roleKey, 'n' => $name, 'e' => $email, 'p' => $phone ?: null, 'o' => $org ?: null, 'il' => $il ?: null, 'ilce' => $ilce ?: null, 'm' => $mah ?: null, 'note' => $note ?: null, 'ip' => $ip]);
            self::notify($rw, 'Yeni üyelik başvurusu: ' . $roleKey, "Yeni başvuru geldi.\n\nRol: $roleKey\nAd: $name <$email>" . ($phone !== '' ? "\nTelefon: $phone" : '') . ($org !== '' ? "\nKurum: $org" : '') . ($note !== '' ? "\n\n" . mb_substr($note, 0, 1000) : '') . "\n\nPanel: https://" . self::$site->domain . "/sektor/panel", $email);
            $mid = (int) $ins->fetchColumn();
            if (!empty($role['listed'])) {
                $data = ['yetkili' => $name];
                $web = self::clean('web', 200);
                if (preg_match('#^https?://[^\s<>"]{4,190}$#i', $web) !== 1) {
                    $web = '';
                }
                $tur = self::clean('tur', 60);
                if ($tur !== '') {
                    $data['tur'] = $tur;
                }
                $d = $rw->prepare("INSERT INTO sector_directory (site_id, kind, name, summary, il_plaka, ilce_id, mahalle_id, web, data, member_id, status, sort_order) VALUES (:s,:k,:n,:sum,:il,:ilce,:m,:w,CAST(:d AS jsonb),:mid,'pending',100)");
                $d->execute(['s' => self::$site->id, 'k' => $role['kind'], 'n' => $org, 'sum' => $note ? mb_substr($note, 0, 300) : null, 'il' => $il ?: null, 'ilce' => $ilce ?: null, 'm' => $mah ?: null, 'w' => $web ?: null, 'd' => json_encode($data, JSON_UNESCAPED_UNICODE), 'mid' => $mid]);
            }
            $rw->commit();
        } catch (Throwable $e) {
            if ($rw->inTransaction()) {
                $rw->rollBack();
            }
            error_log('[sector] join: ' . $e->getMessage());
            return self::thanks('Kaydedilemedi', '<p>Başvurun şu an kaydedilemedi. Birazdan tekrar dene.</p>', 500);
        }
        return self::thanks('Başvurun alındı', '<p><strong>' . Html::e($name) . '</strong>, <em>' . Html::e((string) $role['label']) . '</em> başvurun kaydedildi.</p><p>Editörlerimiz başvuruyu inceler; onaylanan rehber kayıtları yayımlanır. İncelemede gerekirse sana e-posta ile ulaşılır. Kişisel verilerin <a href="/kvkk-aydinlatma">aydınlatma metnine</a> uygun işlenir.</p><p><a class="yn-btn yn-btn-hot" href="/">Ana sayfaya dön</a></p>');
    }

    private static function submitRequest(): array
    {
        $def = self::$def;
        $rq = (array) ($def['request'] ?? []);
        if (self::clean('website', 100) !== '') {
            return self::thanks('Talebin alındı', '<p>Teşekkürler.</p>');
        }
        $rw = self::rw();
        if ($rw === null || !self::tokenOk('talep', self::clean('token', 60))) {
            return self::thanks('Form süresi doldu', '<p>Formun süresi dolmuş olabilir. Lütfen <a href="/talep">formu yenileyip</a> tekrar dene.</p>', 400);
        }
        $kind = self::clean('kind', 80);
        $name = self::clean('full_name', 120);
        $email = strtolower(self::clean('email', 160));
        $phone = self::clean('phone', 30);
        $subject = self::clean('subject', 160);
        $msg = self::clean('message', 3000);
        if (!in_array($kind, (array) ($rq['kinds'] ?? []), true) || mb_strlen($name) < 3 || filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($subject) < 4 || mb_strlen($msg) < 20 || self::clean('kvkk', 5) !== '1') {
            return self::thanks('Form eksik', '<p>Tür, ad soyad, geçerli e-posta, konu, en az 20 karakterlik mesaj ve KVKK onayı zorunludur. <a href="/talep">Forma dön</a>.</p>', 400);
        }
        [$il, $ilce, $mah] = self::geoCheck((int) ($_POST['il'] ?? 0), (int) ($_POST['ilce'] ?? 0), (int) ($_POST['mahalle'] ?? 0));
        if (!empty($rq['geo']) && ($il === 0 || $ilce === 0 || $mah === 0)) {
            return self::thanks('Mahalle seçimi gerekli', '<p>Talebin iletileceği il, ilçe ve mahalleyi seçmelisin. <a href="/talep">Forma dön</a>.</p>', 400);
        }
        $ip = self::ipHash();
        $ref = strtoupper(substr(self::key(), 0, 2)) . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 7));
        try {
            $st = $rw->prepare("SELECT count(*) FROM sector_requests WHERE ip_hash = :i AND created_at > now() - interval '1 hour'");
            $st->execute(['i' => $ip]);
            if ((int) $st->fetchColumn() >= 5) {
                return self::thanks('Çok fazla deneme', '<p>Kısa sürede çok fazla talep gönderildi. Biraz sonra tekrar dene.</p>', 429);
            }
            $ins = $rw->prepare('INSERT INTO sector_requests (site_id, ref, kind, full_name, email, phone, il_plaka, ilce_id, mahalle_id, subject, message, ip_hash) VALUES (:s,:ref,:k,:n,:e,:p,:il,:ilce,:m,:sub,:msg,:ip)');
            $ins->execute(['s' => self::$site->id, 'ref' => $ref, 'k' => $kind, 'n' => $name, 'e' => $email, 'p' => $phone ?: null, 'il' => $il ?: null, 'ilce' => $ilce ?: null, 'm' => $mah ?: null, 'sub' => $subject, 'msg' => $msg, 'ip' => $ip]);
            self::notify($rw, 'Yeni talep ' . $ref . ': ' . mb_substr($subject, 0, 80), "Yeni talep geldi.\n\nTakip kodu: $ref\nTür: $kind\nKonu: $subject\nGönderen: $name <$email>" . ($phone !== '' ? "\nTelefon: $phone" : '') . "\n\n" . mb_substr($msg, 0, 1500) . "\n\nPanel: https://" . self::$site->domain . "/sektor/panel", $email);
        } catch (Throwable $e) {
            error_log('[sector] request: ' . $e->getMessage());
            return self::thanks('Kaydedilemedi', '<p>Talebin şu an kaydedilemedi. Birazdan tekrar dene.</p>', 500);
        }
        $fwd = !empty($rq['geo']) ? 'Yayın masası talebini ilgili muhtarlığa iletir.' : 'Yayın masası talebini değerlendirir.';
        return self::thanks('Talebin kaydedildi', '<p>Takip kodun: <strong class="sc-ref">' . Html::e($ref) . '</strong></p><p>' . Html::e($fwd) . ' Durumu <a href="/sektor/takip?ref=' . Html::e($ref) . '">takip sayfasından</a> görebilirsin; kodu not al.</p><p><a class="yn-btn yn-btn-hot" href="/">Ana sayfaya dön</a></p>');
    }

    private static function trackPage(): array
    {
        $ref = strtoupper(trim((string) ($_GET['ref'] ?? '')));
        $row = null;
        if (preg_match('/^[A-Z]{2}-[A-Z0-9]{7}$/', $ref) === 1) {
            $row = self::rows(self::rw() ?? self::ro(), 'SELECT ref, kind, subject, status, public_note, created_at, updated_at FROM sector_requests WHERE site_id = :s AND ref = :r', ['s' => self::$site->id, 'r' => $ref])[0] ?? null;
        }
        return ['title' => 'Talep takibi | ' . self::$site->name, 'desc' => 'Talep takip kodunla durumu gör.', 'body' => self::render('track', ['site' => self::$site, 'ref' => $ref, 'row' => $row]), 'path' => '/sektor/takip', 'nostore' => true, 'noindex' => true];
    }

    /* ---- panel */

    private static function sessionEmail(): string
    {
        $c = (string) ($_COOKIE['sc_panel'] ?? '');
        if (preg_match('/^([A-Za-z0-9_-]+)\.([a-f0-9]{40})$/', $c, $m) !== 1) {
            return '';
        }
        $raw = (string) base64_decode(strtr($m[1], '-_', '+/'), true);
        if (!hash_equals(substr(hash_hmac('sha256', $raw, self::secret()), 0, 40), $m[2])) {
            return '';
        }
        $j = json_decode($raw, true);
        if (!is_array($j) || (int) ($j['s'] ?? 0) !== self::$site->id || (int) ($j['x'] ?? 0) < time()) {
            return '';
        }
        return (string) ($j['e'] ?? '');
    }

    private static function panelCsrf(string $email): string
    {
        return substr(hash_hmac('sha256', 'csrf|' . self::$site->id . '|' . $email, self::secret()), 0, 32);
    }

    private static function panel(string $method): array
    {
        $site = self::$site;
        $rw = self::rw();
        $email = self::sessionEmail();
        $msg = '';
        if ($method === 'POST') {
            $act = self::clean('act', 30);
            if ($act === 'login') {
                $login = self::clean('login', 160);
                $pass = (string) ($_POST['password'] ?? '');
                $ok = false;
                $ip = self::ipHash();
                $fails = (int) (function_exists('apcu_fetch') ? (apcu_fetch('scfail:' . $ip) ?: 0) : 0);
                if ($fails < 8 && $rw !== null && $login !== '' && $pass !== '') {
                    $row = self::rows($rw, 'SELECT * FROM sector_editor_hash(:s, :l)', ['s' => $site->id, 'l' => $login])[0] ?? null;
                    $ok = $row !== null && password_verify($pass, (string) $row['password_hash']);
                    if ($ok) {
                        $email = (string) $row['email'];
                    }
                }
                if (!$ok) {
                    if (function_exists('apcu_store')) {
                        apcu_store('scfail:' . $ip, $fails + 1, 900);
                    }
                    $email = '';
                    $msg = 'Giriş başarısız.';
                } else {
                    $raw = json_encode(['s' => $site->id, 'e' => $email, 'x' => time() + 8 * 3600]);
                    $val = rtrim(strtr(base64_encode((string) $raw), '+/', '-_'), '=') . '.' . substr(hash_hmac('sha256', (string) $raw, self::secret()), 0, 40);
                    setcookie('sc_panel', $val, ['expires' => time() + 8 * 3600, 'path' => '/sektor', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
                    header('Location: /sektor/panel', true, 303);
                    return ['title' => '', 'desc' => '', 'body' => '', 'path' => '/sektor/panel', 'status' => 303, 'nostore' => true, 'raw' => ''];
                }
            } elseif ($email !== '' && $rw !== null && hash_equals(self::panelCsrf($email), self::clean('csrf', 40))) {
                $msg = self::panelAction($rw, $act, $email);
            } elseif ($act === 'logout') {
                setcookie('sc_panel', '', ['expires' => 1, 'path' => '/sektor']);
                header('Location: /sektor/panel', true, 303);
                return ['title' => '', 'desc' => '', 'body' => '', 'path' => '/sektor/panel', 'status' => 303, 'nostore' => true, 'raw' => ''];
            } elseif ($email !== '') {
                $msg = 'Oturum doğrulanamadı; sayfayı yenile.';
            }
        }
        $data = ['site' => $site, 'email' => $email, 'msg' => $msg, 'csrf' => $email !== '' ? self::panelCsrf($email) : '', 'members' => [], 'requests' => [], 'dir' => [], 'pq' => ''];
        if ($email !== '' && $rw !== null) {
            $data['members'] = self::rows($rw, "SELECT m.*, l.adi AS il, i.adi AS ilce, h.bilesen AS mahalle FROM sector_members m LEFT JOIN tr_il l ON l.plaka = m.il_plaka LEFT JOIN tr_ilce i ON i.kimlik_no = m.ilce_id LEFT JOIN tr_mahalle h ON h.kimlik_no = m.mahalle_id WHERE m.site_id = :s ORDER BY (m.status = 'pending') DESC, m.created_at DESC LIMIT 60", ['s' => $site->id]);
            $data['requests'] = self::rows($rw, "SELECT r.*, l.adi AS il, i.adi AS ilce, h.bilesen AS mahalle FROM sector_requests r LEFT JOIN tr_il l ON l.plaka = r.il_plaka LEFT JOIN tr_ilce i ON i.kimlik_no = r.ilce_id LEFT JOIN tr_mahalle h ON h.kimlik_no = r.mahalle_id WHERE r.site_id = :s ORDER BY (r.status = 'new') DESC, r.created_at DESC LIMIT 60", ['s' => $site->id]);
            $pq = trim(mb_substr((string) ($_GET['pq'] ?? ''), 0, 60));
            $data['pq'] = $pq;
            $data['dir'] = $pq !== ''
                ? self::rows($rw, "SELECT d.id, d.kind, d.name, d.status, d.web, d.summary, d.data->>'about' AS about, (d.contact IS NOT NULL AND d.contact <> '') AS has_tel, l.adi AS il FROM sector_directory d LEFT JOIN tr_il l ON l.plaka = d.il_plaka WHERE d.site_id = :s AND (d.name ILIKE :q OR d.data->>'mahalle' ILIKE :q) ORDER BY d.kind, d.name LIMIT 40", ['s' => $site->id, 'q' => '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $pq) . '%'])
                : self::rows($rw, "SELECT d.id, d.kind, d.name, d.status, d.web, d.summary, d.data->>'about' AS about, (d.contact IS NOT NULL AND d.contact <> '') AS has_tel, l.adi AS il FROM sector_directory d LEFT JOIN tr_il l ON l.plaka = d.il_plaka WHERE d.site_id = :s AND (d.status <> 'approved' OR d.member_id IS NOT NULL OR d.ext_key IS NULL) ORDER BY d.status, d.kind, d.name LIMIT 120", ['s' => $site->id]);
        }
        return ['title' => 'Sektör paneli | ' . $site->name, 'desc' => 'Editör paneli', 'body' => self::render('panel', $data), 'path' => '/sektor/panel', 'nostore' => true, 'noindex' => true];
    }

    /** Queue an editor notification (sector_outbox); the VPS mailer cron sends it (token never lives in the web container). */
    private static function notify(PDO $rw, string $subject, string $body, string $replyTo): void
    {
        try {
            $to = (string) (self::$site->contact['email'] ?? self::$def['email'] ?? '');
            if ($to === '') {
                error_log('[sector] notify: no recipient');
                return;
            }
            $rw->prepare('INSERT INTO sector_outbox (site_id, to_addr, reply_to, subject, body) VALUES (:s,:t,:r,:sub,:b)')
                ->execute(['s' => self::$site->id, 't' => $to, 'r' => filter_var($replyTo, FILTER_VALIDATE_EMAIL) ?: null, 'sub' => mb_substr(str_replace(["\r", "\n"], ' ', $subject), 0, 150), 'b' => mb_substr($body, 0, 4000)]);
            error_log('[sector] notify queued ' . self::$site->id);
        } catch (Throwable $e) {
            error_log('[sector] notify: ' . $e->getMessage());
        }
    }

    private static function panelAction(PDO $rw, string $act, string $email): string
    {
        $id = (int) ($_POST['id'] ?? 0);
        $sid = self::$site->id;
        try {
            if ($act === 'member_approve' || $act === 'member_reject') {
                $to = $act === 'member_approve' ? 'approved' : 'rejected';
                $rw->prepare('UPDATE sector_members SET status = :t, reviewed_at = now(), reviewed_by = :b WHERE id = :i AND site_id = :s')->execute(['t' => $to, 'b' => $email, 'i' => $id, 's' => $sid]);
                $rw->prepare('UPDATE sector_directory SET status = :t, updated_at = now() WHERE member_id = :i AND site_id = :s')->execute(['t' => $to === 'approved' ? 'approved' : 'hidden', 'i' => $id, 's' => $sid]);
                return $to === 'approved' ? 'Başvuru onaylandı.' : 'Başvuru reddedildi.';
            }
            if ($act === 'req_status') {
                $to = self::clean('status', 12);
                if (!in_array($to, ['new', 'forwarded', 'answered', 'closed'], true)) {
                    return 'Geçersiz durum.';
                }
                $rw->prepare('UPDATE sector_requests SET status = :t, public_note = NULLIF(:n, \'\'), updated_at = now() WHERE id = :i AND site_id = :s')->execute(['t' => $to, 'n' => self::clean('note', 400), 'i' => $id, 's' => $sid]);
                return 'Talep güncellendi.';
            }
            if ($act === 'dir_hide' || $act === 'dir_show') {
                $rw->prepare('UPDATE sector_directory SET status = :t, updated_at = now() WHERE id = :i AND site_id = :s')->execute(['t' => $act === 'dir_show' ? 'approved' : 'hidden', 'i' => $id, 's' => $sid]);
                return $act === 'dir_show' ? 'Kayıt yayında.' : 'Kayıt gizlendi (silinmedi).';
            }
            if ($act === 'dir_edit') {
                $web = self::clean('web', 200);
                if (preg_match('#^https?://[^\s<>"]{4,190}$#i', $web) !== 1) {
                    $web = '';
                }
                $about = mb_substr(trim((string) ($_POST['about'] ?? '')), 0, 2000);
                $tel = preg_replace('/\D/', '', self::clean('contact', 20));
                $rw->prepare("UPDATE sector_directory SET summary = NULLIF(:sum,''), web = NULLIF(:w,''), contact = COALESCE(NULLIF(:c,''), contact),
                    data = CASE WHEN :a1 = '' THEN data - 'about' ELSE jsonb_set(data, '{about}', to_jsonb(CAST(:a2 AS text))) END, updated_at = now() WHERE id = :i AND site_id = :s")
                    ->execute(['sum' => self::clean('summary', 300), 'w' => $web, 'c' => $tel, 'a1' => $about, 'a2' => $about, 'i' => $id, 's' => $sid]);
                return 'Tanıtım sayfası güncellendi.';
            }
            if ($act === 'news_publish') {
                $secs = array_column(self::sections(), 'slug');
                $idx = array_search(self::clean('section', 60), $secs, true);
                $title = self::clean('title', 160);
                $body = trim((string) ($_POST['body'] ?? ''));
                $from = self::clean('source', 120);
                if ($idx === false || mb_strlen($title) < 8 || mb_strlen($body) < 60) {
                    return 'Bölüm, başlık (en az 8) ve metin (en az 60 karakter) gerekli.';
                }
                $html = '';
                foreach (preg_split('/\R{2,}/u', mb_substr($body, 0, 8000)) ?: [] as $para) {
                    $para = trim($para);
                    if ($para !== '') {
                        $html .= '<p>' . nl2br(htmlspecialchars($para, ENT_QUOTES, 'UTF-8'), false) . '</p>';
                    }
                }
                $html .= '<p class="sc-credit"><em>' . htmlspecialchars(($from !== '' ? 'Gönderen / kaynak: ' . $from . '. ' : '') . 'Bu içerik ' . self::$site->name . ' yayın masası tarafından incelenerek yayımlanmıştır.', ENT_QUOTES, 'UTF-8') . '</em></p>';
                $st = $rw->prepare('SELECT sector_publish_news(:s, :c, :t, :sp, :h, CAST(:tags AS text[]))');
                $st->execute(['s' => $sid, 'c' => $sid * 100 + $idx + 1, 't' => $title, 'sp' => self::clean('spot', 300), 'h' => $html, 'tags' => '{}']);
                return 'Yazı yayımlandı (#' . (int) $st->fetchColumn() . ').';
            }
            if ($act === 'dir_add') {
                $kind = self::clean('kind', 12);
                $name = self::clean('name', 160);
                $kd = self::kind($kind);
                if ($kd === null || mb_strlen($name) < 3) {
                    return 'Tür ve ad zorunlu.';
                }
                $web = self::clean('web', 200);
                if (preg_match('#^https?://[^\s<>"]{4,190}$#i', $web) !== 1) {
                    $web = '';
                }
                [$il, $ilce, $mah] = self::geoCheck((int) ($_POST['il'] ?? 0), (int) ($_POST['ilce'] ?? 0), (int) ($_POST['mahalle'] ?? 0));
                $rw->prepare("INSERT INTO sector_directory (site_id, kind, name, summary, il_plaka, ilce_id, mahalle_id, web, status, sort_order) VALUES (:s,:k,:n,NULLIF(:sum,''),:il,:ilce,:m,NULLIF(:w,''),'approved',100)")
                    ->execute(['s' => $sid, 'k' => $kind, 'n' => $name, 'sum' => self::clean('summary', 300), 'il' => $il ?: null, 'ilce' => $ilce ?: null, 'm' => $mah ?: null, 'w' => $web]);
                return 'Rehber kaydı eklendi.';
            }
        } catch (Throwable $e) {
            error_log('[sector] panel: ' . $e->getMessage());
            return 'İşlem başarısız.';
        }
        return '';
    }
}
