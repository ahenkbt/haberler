<?php

declare(strict_types=1);

namespace Yenisafak;

use Throwable;

/**
 * spor 2026-10-10: spor.gundemi.org — Spor Gündemi (hm_news_sites id 1146).
 * Kabuk yalnız layout_json hmSpor=true iken açılır. Bayrak yoksa App.php hunk'ları
 * hiçbir şablon değiştirmez; eski Yenişafak görünümü durur.
 * Kategori slug'ları sitede duranlarla aynıdır (spor, futbol, basketbol, voleybol,
 * hentbol, gures, atletizm ve sitede tanımlı diğer branşlar). Yeni slug üretilmez.
 * Canlı skor / puan durumu: SporLive (ESPN tur.1). Veri yoksa şerit ve tablo gizlenir.
 */
final class Spor
{
    /**
     * slug => [ad, kısa, açıklama, grup, renk, mürekkep]
     * grup: ana | futbol | basketbol | voleybol | diger
     */
    public const CATS = [
        'spor' => ['Spor', 'Spor', 'Günün spor gündemi, milli takımlar ve branşlar arası gelişmeler.', 'ana', '#f5c518', '#12161a'],
        'futbol' => ['Futbol', 'Futbol', 'Süper Lig, milli takım, Avrupa kupaları ve transfer hattı.', 'futbol', '#0e8f3d', '#ffffff'],
        'basketbol' => ['Basketbol', 'Basketbol', 'Basketbol ligleri, EuroLeague ve milli basketbol.', 'basketbol', '#f5c518', '#12161a'],
        'voleybol' => ['Voleybol', 'Voleybol', 'Sultanlar Ligi, Efeler Ligi ve milli voleybol.', 'voleybol', '#19a84a', '#ffffff'],
        'hentbol' => ['Hentbol', 'Hentbol', 'Hentbol ligleri ve milli takım.', 'diger', '#dff25a', '#12161a'],
        'gures' => ['Güreş', 'Güreş', 'Minder, şampiyonalar ve milli güreşçiler.', 'diger', '#0e8f3d', '#ffffff'],
        'atletizm' => ['Atletizm', 'Atletizm', 'Pist, saha ve yol koşuları.', 'diger', '#f5c518', '#12161a'],
        'tenis' => ['Tenis', 'Tenis', 'Kortlar, turnuvalar ve milli tenisçiler.', 'diger', '#19a84a', '#ffffff'],
        'yuzme' => ['Yüzme', 'Yüzme', 'Havuz, açık su ve milli yüzücüler.', 'diger', '#dff25a', '#12161a'],
        'motor-sporlari' => ['Motor Sporları', 'Motor', 'Formula, ralli ve pist.', 'diger', '#f5c518', '#12161a'],
        'dovus-sporlari' => ['Dövüş Sporları', 'Dövüş', 'Boks ve dövüş sporları.', 'diger', '#0e8f3d', '#ffffff'],
        'e-spor' => ['E-Spor', 'E-Spor', 'Oyun sporları ve turnuvalar.', 'diger', '#dff25a', '#12161a'],
        'amator-spor' => ['Amatör Spor', 'Amatör', 'Amatör ligler ve yerel spor.', 'diger', '#19a84a', '#ffffff'],
        'engelli-sporlari' => ['Engelli Sporları', 'Engelli Sporları', 'Paralimpik branşlar ve engelli sporcular.', 'diger', '#f5c518', '#12161a'],
        'ozel-haber' => ['Özel Haber', 'Özel', 'Spor Gündemi özel haberleri.', 'diger', '#0e8f3d', '#ffffff'],
    ];

    public const NAV = ['spor', 'futbol', 'basketbol', 'voleybol', 'hentbol', 'gures', 'atletizm'];

    public static function on(object $site): bool
    {
        $l = is_array($site->layout ?? null) ? $site->layout : [];
        $v = $l['hmSpor'] ?? false;
        return $v === true || $v === 1 || $v === '1' || $v === 'true';
    }

    public static function asset(string $file): string
    {
        return Html::versioned('/brand/spor/' . $file);
    }

    /** @return array{slug: string, name: string, short: string, blurb: string, group: string, color: string, ink: string}|null */
    public static function section(string $slug): ?array
    {
        $s = self::CATS[$slug] ?? null;
        if ($s === null) {
            return null;
        }
        return ['slug' => $slug, 'name' => $s[0], 'short' => $s[1], 'blurb' => $s[2], 'group' => $s[3], 'color' => $s[4], 'ink' => $s[5]];
    }

    /** @return list<array{slug: string, name: string, short: string, blurb: string, group: string, color: string, ink: string}> */
    public static function sections(): array
    {
        $out = [];
        foreach (array_keys(self::CATS) as $slug) {
            $sec = self::section($slug);
            if ($sec !== null) {
                $out[] = $sec;
            }
        }
        return $out;
    }

    /** @return list<string> */
    public static function otherSlugs(): array
    {
        $out = [];
        foreach (self::CATS as $slug => $row) {
            if ($row[3] === 'diger') {
                $out[] = $slug;
            }
        }
        return $out;
    }

    public static function isTransfer(array $story): bool
    {
        $text = mb_strtolower((string) ($story['title'] ?? '') . ' ' . (string) ($story['spot'] ?? ''));
        return preg_match('/transfer|bonservis|kiral[ıi]k|imza att|kadrosuna katt|bedelsiz/u', $text) === 1;
    }

    public static function dateTr(): string
    {
        $d = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Istanbul'));
        $months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        $days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return $d->format('j') . ' ' . $months[(int) $d->format('n')] . ' ' . $d->format('Y') . ', ' . $days[(int) $d->format('w')];
    }

    public static function clockTr(?int $unix): string
    {
        if ($unix === null || $unix <= 0) {
            return '';
        }
        return (new \DateTimeImmutable('@' . $unix))->setTimezone(new \DateTimeZone('Europe/Istanbul'))->format('H:i');
    }

    /** @return array{title: string, desc: string, body: string, path: string, status?: int, jsonLd?: array, image?: string}|null */
    public static function page(Repository $repo, Site $site, string $path): ?array
    {
        return match ($path) {
            '/' => self::home($repo, $site),
            '/canli-skor' => self::scoresPage($site),
            '/puan-durumu' => self::tablePage($site),
            '/fikstur' => self::fixturesPage($site),
            '/transfer' => self::transferPage($repo, $site),
            default => null,
        };
    }

    public static function render(string $tpl, array $data): string
    {
        extract($data, EXTR_SKIP);
        ob_start();
        require dirname(__DIR__) . '/templates/spor/' . $tpl . '.php';
        return (string) ob_get_clean();
    }

    /** @return list<array<string, mixed>> */
    private static function stories(Repository $repo, Site $site, int $n): array
    {
        try {
            $rows = $repo->stories($site->id, '', $n);
        } catch (Throwable $e) {
            error_log('[spor] stories: ' . $e->getMessage());
            return [];
        }
        return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
    }

    /** @param list<string> $slugs @return array<string, list<array<string, mixed>>> */
    private static function perCategory(Repository $repo, Site $site, array $slugs, int $n): array
    {
        try {
            $rows = $repo->latestPerCategory($site->id, $slugs, $n);
        } catch (Throwable $e) {
            error_log('[spor] per category: ' . $e->getMessage());
            return [];
        }
        return is_array($rows) ? $rows : [];
    }

    /**
     * En çok okunanlar yalnız bu siteye ait sayaç ya da site kimliği taşıyan bir metottan gelir.
     * Ağ geneli mostRead() kullanılmaz. Sayaç yoksa bölüm gizlenir.
     * @param list<array<string, mixed>> $latest
     * @return list<array<string, mixed>>
     */
    private static function popular(Repository $repo, Site $site, array $latest): array
    {
        if (method_exists($repo, 'mostRead')) {
            try {
                $ref = new \ReflectionMethod($repo, 'mostRead');
                if ($ref->isPublic() && $ref->getNumberOfParameters() >= 2) {
                    $rows = $repo->mostRead($site->id, 8);
                    $own = self::ownRows(is_array($rows) ? $rows : [], (int) $site->id);
                    if ($own !== []) {
                        return array_slice($own, 0, 8);
                    }
                }
            } catch (Throwable) {
            }
        }
        $ranked = [];
        foreach ($latest as $s) {
            $views = null;
            foreach (['views', 'viewCount', 'hits', 'readCount'] as $k) {
                if (isset($s[$k]) && is_numeric($s[$k]) && (int) $s[$k] > 0) {
                    $views = (int) $s[$k];
                    break;
                }
            }
            if ($views !== null) {
                $s['_views'] = $views;
                $ranked[] = $s;
            }
        }
        if ($ranked === []) {
            return [];
        }
        usort($ranked, static fn (array $a, array $b): int => $b['_views'] <=> $a['_views']);
        return array_slice($ranked, 0, 8);
    }

    /** @param list<mixed> $rows @return list<array<string, mixed>> */
    private static function ownRows(array $rows, int $siteId): array
    {
        $own = [];
        $sawSite = false;
        foreach ($rows as $s) {
            if (!is_array($s)) {
                continue;
            }
            if (array_key_exists('siteId', $s) || array_key_exists('site_id', $s)) {
                $sawSite = true;
                $sid = (int) ($s['siteId'] ?? $s['site_id']);
                if ($sid !== $siteId) {
                    continue;
                }
            }
            $own[] = $s;
        }
        return $sawSite ? $own : [];
    }

    private static function home(Repository $repo, Site $site): array
    {
        $latest = self::stories($repo, $site, 48);
        $slugs = array_keys(self::CATS);
        $per = self::perCategory($repo, $site, $slugs, 6);
        foreach ($latest as $s) {
            $c = strtolower((string) ($s['category'] ?? ''));
            if ($c === '') {
                continue;
            }
            $per[$c] ??= [];
            $slug = (string) ($s['slug'] ?? '');
            if ($slug === '') {
                continue;
            }
            foreach ($per[$c] as $have) {
                if (is_array($have) && (string) ($have['slug'] ?? '') === $slug) {
                    continue 2;
                }
            }
            $per[$c][] = $s;
        }
        $live = SporLive::bundle();
        $body = self::render('home', [
            'site' => $site,
            'latest' => $latest,
            'per' => $per,
            'popular' => self::popular($repo, $site, $latest),
            'transfers' => array_values(array_filter($latest, [self::class, 'isTransfer'])),
            'live' => $live,
        ]);
        return [
            'title' => $site->name . ' – Süper Lig, Futbol, Basketbol, Voleybol',
            'desc' => $site->description !== '' ? $site->description : 'Spor Gündemi: futbol, basketbol, voleybol ve diğer branşlar. Süper Lig puan durumu ve fikstür, kaynak verdiği sürece canlı.',
            'body' => $body,
            'path' => '/',
            'jsonLd' => [
                '@context' => 'https://schema.org',
                '@type' => 'NewsMediaOrganization',
                'name' => $site->name,
                'url' => $site->canonical('/'),
                'inLanguage' => 'tr-TR',
            ],
        ];
    }

    private static function scoresPage(Site $site): array
    {
        $live = SporLive::bundle();
        return [
            'title' => 'Canlı Skor | ' . $site->name,
            'desc' => 'Süper Lig canlı skor, günün sonuçları ve sıradaki maçlar.',
            'body' => self::render('scores', ['site' => $site, 'live' => $live]),
            'path' => '/canli-skor',
        ];
    }

    private static function tablePage(Site $site): array
    {
        $live = SporLive::bundle();
        return [
            'title' => 'Süper Lig Puan Durumu | ' . $site->name,
            'desc' => 'Trendyol Süper Lig puan durumu. Tablo yalnız kaynak veri döndürdüğünde gösterilir.',
            'body' => self::render('standings', ['site' => $site, 'live' => $live]),
            'path' => '/puan-durumu',
        ];
    }

    private static function fixturesPage(Site $site): array
    {
        $live = SporLive::bundle();
        return [
            'title' => 'Süper Lig Fikstür | ' . $site->name,
            'desc' => 'Süper Lig sıradaki maçlar ve günün programı.',
            'body' => self::render('fixtures', ['site' => $site, 'live' => $live]),
            'path' => '/fikstur',
        ];
    }

    private static function transferPage(Repository $repo, Site $site): array
    {
        $latest = self::stories($repo, $site, 80);
        $items = array_values(array_filter($latest, [self::class, 'isTransfer']));
        return [
            'title' => 'Transfer | ' . $site->name,
            'desc' => 'Transfer, bonservis ve kiralık haberleri.',
            'body' => self::render('transfer', ['site' => $site, 'items' => $items]),
            'path' => '/transfer',
        ];
    }
}
