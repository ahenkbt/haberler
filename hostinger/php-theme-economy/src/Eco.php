<?php

declare(strict_types=1);

namespace Yenisafak;

use Throwable;

/**
 * eco 2026-10-10: ekonomi.gundemi.org — "Ekonomi Gündemi" (slug ekonomi).
 * Tamamen ekonomi odaklı site: portal temasından FARKLI palet (koyu lacivert + yeşil/altın), piyasa şeridi, bölüm sayfaları.
 * Site, slug=ekonomi / domain=ekonomi.gundemi.org (ya da layout_json hmEco=true) ile tanınır; kendi kabuğu templates/eco/*.
 * Veri: haberler/kategoriler Repository'den (rss importer + AI editör), piyasa verileri GERÇEK kaynaklardan:
 *   BIST 100, USD/EUR/GBP-TRY, Brent, ons altın, BTC, ETH -> Yahoo Finance chart API (anahtarsız, curl_multi, 90 sn önbellek);
 *   gram/çeyrek altın, gümüş -> Truncgil Finans (Widgets::markets); resmî döviz kuru -> TCMB today.xml (Widgets::tcmb).
 * Kaynak yanıt vermezse son iyi değer (en çok 6 saat) gösterilir, sonra kalem kaybolur; hiçbir değer üretilmez/uydurulmaz.
 * Rollback: templates/eco + src/Eco.php sil, App.php'deki "eco 2026-10-10" bloklarını kaldır (backups/eco-20261010/).
 */
final class Eco
{
    /** slug => [ad, kısa ad, açıklama, renk, grup] */
    public const SECTIONS = [
        'eko-gundem' => ['Ekonomi Gündemi', 'Gündem', 'Günün öne çıkan ekonomi haberleri, gelişmeler ve analizler.', '#c9a227', 'ana'],
        'eko-borsa' => ['Borsa ve Hisse', 'Borsa', 'Borsa İstanbul, BIST 100, hisse senetleri, halka arzlar ve bilançolar.', '#1e9e6a', 'piyasa'],
        'eko-doviz' => ['Döviz ve Kur', 'Döviz', 'Dolar, euro, sterlin ve TL kurları; parite ve rezerv gelişmeleri.', '#2f80c9', 'piyasa'],
        'eko-altin' => ['Altın ve Emtia', 'Altın', 'Gram, çeyrek ve ons altın, gümüş, bakır ve diğer emtia fiyatları.', '#e0b13a', 'piyasa'],
        'eko-kripto' => ['Kripto Para', 'Kripto', 'Bitcoin, Ethereum ve kripto para piyasasından haberler.', '#f08a24', 'piyasa'],
        'eko-banka-finans' => ['Bankacılık ve Finans', 'Banka & Finans', 'Bankalar, faiz, krediler, TCMB kararları ve finans sektörü.', '#3d7bd9', 'haber'],
        'eko-makro' => ['Makro Ekonomi', 'Makro', 'Enflasyon, büyüme, istihdam, bütçe, vergi ve ücret gündemi.', '#8a63d2', 'haber'],
        'eko-sirketler' => ['Şirketler', 'Şirketler', 'Holdingler, şirket haberleri, yatırımlar, satın almalar ve atamalar.', '#16a2a8', 'haber'],
        'eko-sanayi-ihracat' => ['Sanayi ve Dış Ticaret', 'Sanayi & İhracat', 'Üretim, sanayi, ihracat, ithalat ve dış ticaret verileri.', '#d0583a', 'haber'],
        'eko-enerji' => ['Enerji', 'Enerji', 'Petrol, doğalgaz, elektrik, akaryakıt ve yenilenebilir enerji.', '#e8792b', 'haber'],
        'eko-emlak' => ['Gayrimenkul', 'Gayrimenkul', 'Konut, kira, arsa, inşaat ve gayrimenkul piyasası.', '#a0764a', 'haber'],
        'eko-tarim' => ['Tarım ve Gıda', 'Tarım', 'Çiftçi, hububat, gıda fiyatları ve tarım politikaları.', '#5a9e3a', 'haber'],
        'eko-dunya' => ['Dünya Ekonomisi', 'Dünya', 'Fed, ECB, küresel piyasalar, Wall Street ve uluslararası ekonomi.', '#4a6fa5', 'haber'],
        'eko-teknoloji' => ['Teknoloji ve Girişim', 'Teknoloji', 'Girişimler, fintech, e-ticaret, yapay zekâ ve dijital ekonomi.', '#7a55c7', 'haber'],
        'eko-is-dunyasi' => ['İş Dünyası', 'İş Dünyası', 'Odalar, dernekler, KOBİ ve esnaf, teşvikler ve istihdam.', '#b0892a', 'haber'],
        'eko-genel-gundem' => ['Türkiye Gündemi', 'Türkiye', 'Ekonomiyi etkileyen genel gündem ve Türkiye\'den son gelişmeler.', '#6b7a8f', 'haber'],
    ];

    /** Piyasa şeridi sırası. key => [Yahoo sembolü|null, etiket, birim, ondalık] */
    private const YAHOO = [
        'bist' => ['XU100.IS', 'BIST 100', '', 2],
        'usd' => ['USDTRY=X', 'USD/TRY', '₺', 4],
        'eur' => ['EURTRY=X', 'EUR/TRY', '₺', 4],
        'gbp' => ['GBPTRY=X', 'GBP/TRY', '₺', 4],
        'brent' => ['BZ=F', 'Brent Petrol', '$', 2],
        'ons' => ['GC=F', 'Ons Altın', '$', 2],
        'btc' => ['BTC-USD', 'Bitcoin', '$', 0],
        'eth' => ['ETH-USD', 'Ethereum', '$', 2],
    ];

    public static function on(object $site): bool
    {
        $l = is_array($site->layout ?? null) ? $site->layout : [];
        if (!empty($l['hmEco'])) {
            return true;
        }
        return strtolower((string) ($site->slug ?? '')) === 'ekonomi'
            || strtolower((string) ($site->domain ?? '')) === 'ekonomi.gundemi.org';
    }

    public static function asset(string $file): string
    {
        return Html::versioned('/brand/eco/' . $file);
    }

    /** @return array{slug: string, name: string, short: string, blurb: string, color: string, group: string}|null */
    public static function section(string $slug): ?array
    {
        $s = self::SECTIONS[$slug] ?? null;
        return $s === null ? null : ['slug' => $slug, 'name' => $s[0], 'short' => $s[1], 'blurb' => $s[2], 'color' => $s[3], 'group' => $s[4]];
    }

    /** @return list<array{slug: string, name: string, short: string, blurb: string, color: string, group: string}> */
    public static function sections(): array
    {
        $out = [];
        foreach (array_keys(self::SECTIONS) as $slug) {
            $out[] = self::section($slug);
        }
        return $out;
    }

    public static function color(string $slug): string
    {
        return self::SECTIONS[$slug][3] ?? '#c9a227';
    }

    /** Hangi canlı kalemler hangi bölümde gösterilir. */
    public static function quoteKeysFor(string $slug): array
    {
        return match ($slug) {
            'eko-borsa' => ['bist'],
            'eko-doviz', 'eko-banka-finans' => ['usd', 'eur', 'gbp'],
            'eko-altin' => ['gram', 'ceyrek', 'ons', 'gumus'],
            'eko-kripto' => ['btc', 'eth'],
            'eko-enerji' => ['brent'],
            'eko-dunya' => ['bist', 'brent', 'ons'],
            default => [],
        };
    }

    /* ------------------------------------------------------------------ piyasa verisi (gerçek kaynaklar) */

    private static ?array $quotesMemo = null;

    private static function cacheFile(): string
    {
        $dir = getenv('WIDGET_CACHE_DIR');
        $dir = is_string($dir) && $dir !== '' ? $dir : sys_get_temp_dir() . '/ys-widgets';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir . '/eco-quotes-v1.json';
    }

    /**
     * Canlı kalemler: key => [key, label, value(float), change(%|null), unit, dec, src]; sıra: şerit sırası.
     * @return array<string, array<string, mixed>>
     */
    public static function quotes(): array
    {
        if (self::$quotesMemo !== null) {
            return self::$quotesMemo;
        }
        $file = self::cacheFile();
        $cached = null;
        if (is_file($file)) {
            $raw = json_decode((string) @file_get_contents($file), true);
            if (is_array($raw) && isset($raw['t'], $raw['q']) && is_array($raw['q'])) {
                $cached = $raw;
                if (time() - (int) $raw['t'] < 90) {
                    return self::$quotesMemo = $raw['q'];
                }
            }
        }
        $failFile = $file . '.fail';
        if (is_file($failFile) && time() - (int) @filemtime($failFile) < 30) {
            return self::$quotesMemo = ($cached !== null && time() - (int) $cached['t'] < 21600) ? $cached['q'] : [];
        }
        $fresh = self::fetchQuotes();
        if (count($fresh) >= 3) {
            // Eksik kalan kalemler için son iyi değer (<= 6 saat) korunur.
            if ($cached !== null && time() - (int) $cached['t'] < 21600) {
                foreach ($cached['q'] as $k => $row) {
                    $fresh[$k] ??= $row;
                }
            }
            $tmp = $file . '.' . getmypid() . '.tmp';
            if (@file_put_contents($tmp, json_encode(['t' => time(), 'q' => $fresh], JSON_UNESCAPED_UNICODE)) !== false) {
                @rename($tmp, $file);
            }
            return self::$quotesMemo = $fresh;
        }
        @touch($failFile);
        return self::$quotesMemo = ($cached !== null && time() - (int) $cached['t'] < 21600) ? $cached['q'] : [];
    }

    /** Son başarılı güncelleme zamanı (unix) ya da null. */
    public static function quotesTime(): ?int
    {
        $file = self::cacheFile();
        $raw = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
        return is_array($raw) && isset($raw['t']) ? (int) $raw['t'] : null;
    }

    /** @return array<string, array<string, mixed>> */
    private static function fetchQuotes(): array
    {
        $out = [];
        $mh = curl_multi_init();
        $handles = [];
        foreach (self::YAHOO as $key => [$sym]) {
            $ch = curl_init('https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode($sym) . '?interval=1d&range=5d');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; EkonomiGundemi/1.0)',
                CURLOPT_ENCODING => '',
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$key] = $ch;
        }
        $running = 0;
        $t0 = microtime(true);
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) {
                curl_multi_select($mh, 0.2);
            }
        } while ($running > 0 && microtime(true) - $t0 < 5.0);
        foreach ($handles as $key => $ch) {
            $body = (string) curl_multi_getcontent($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            if ($code !== 200 || $body === '') {
                continue;
            }
            $j = json_decode($body, true);
            $m = $j['chart']['result'][0]['meta'] ?? null;
            if (!is_array($m) || !is_numeric($m['regularMarketPrice'] ?? null) || (float) $m['regularMarketPrice'] <= 0) {
                continue;
            }
            [, $label, $unit, $dec] = self::YAHOO[$key];
            $chg = is_numeric($m['regularMarketChangePercent'] ?? null) ? (float) $m['regularMarketChangePercent'] : null;
            $out[$key] = ['key' => $key, 'label' => $label, 'value' => (float) $m['regularMarketPrice'], 'change' => $chg,
                'unit' => $unit, 'dec' => $dec, 'src' => 'Yahoo Finance', 'at' => (int) ($m['regularMarketTime'] ?? 0)];
        }
        curl_multi_close($mh);
        // Gram / çeyrek altın, gümüş: Truncgil (gerçek piyasa verisi) — Widgets::markets zaten önbellekli ve fail-soft.
        try {
            foreach ((Widgets::get()->markets() ?? []) as $r) {
                $k = (string) ($r['key'] ?? '');
                if (in_array($k, ['gram', 'ceyrek', 'gumus'], true) && (float) $r['value'] > 0) {
                    $out[$k] = ['key' => $k, 'label' => (string) $r['label'], 'value' => (float) $r['value'],
                        'change' => $r['change'] === null ? null : (float) $r['change'], 'unit' => '₺', 'dec' => $k === 'gumus' ? 2 : 2, 'src' => 'Truncgil Finans', 'at' => 0];
                }
            }
        } catch (Throwable) {
        }
        return $out;
    }

    /** Şeritte gösterilecek altı ana kalem + ekler (veri olanlar). @return list<array<string, mixed>> */
    public static function strip(): array
    {
        $q = self::quotes();
        $order = ['bist', 'usd', 'eur', 'gram', 'brent', 'btc', 'gbp', 'ons', 'ceyrek', 'eth'];
        $out = [];
        foreach ($order as $k) {
            if (isset($q[$k])) {
                $out[] = $q[$k];
            }
        }
        return $out;
    }

    public static function fmt(array $m): string
    {
        return number_format((float) $m['value'], (int) ($m['dec'] ?? 2), ',', '.');
    }

    public static function fmtChange(?float $c): string
    {
        if ($c === null) {
            return '';
        }
        return ($c > 0 ? '+' : ($c < 0 ? '−' : '')) . number_format(abs($c), 2, ',', '.') . '%';
    }

    public static function dir(?float $c): string
    {
        return $c === null || abs($c) < 0.005 ? 'flat' : ($c > 0 ? 'up' : 'down');
    }

    public static function dateTr(): string
    {
        $d = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Istanbul'));
        $months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        $days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return $d->format('j') . ' ' . $months[(int) $d->format('n')] . ' ' . $d->format('Y') . ', ' . $days[(int) $d->format('w')];
    }

    /* ------------------------------------------------------------------ sayfalar */

    /** @return array{title: string, desc: string, body: string, path: string, status?: int, jsonLd?: array, image?: string}|null */
    public static function page(Repository $repo, Site $site, string $path): ?array
    {
        return match ($path) {
            '/' => self::home($repo, $site),
            '/piyasalar' => self::marketsPage($site),
            '/bolumler' => self::sectionsPage($repo, $site),
            default => null,
        };
    }

    public static function render(string $tpl, array $data): string
    {
        extract($data, EXTR_SKIP);
        ob_start();
        require dirname(__DIR__) . '/templates/eco/' . $tpl . '.php';
        return (string) ob_get_clean();
    }

    private static function home(Repository $repo, Site $site): array
    {
        $latest = [];
        try {
            $latest = $repo->stories($site->id, '', 40);
        } catch (Throwable $e) {
            error_log('[eco] home stories: ' . $e->getMessage());
        }
        $per = [];
        try {
            $per = $repo->latestPerCategory($site->id, array_keys(self::SECTIONS), 6);
        } catch (Throwable $e) {
            error_log('[eco] per category: ' . $e->getMessage());
        }
        $popular = []; // mostRead() ağ genelinden sızar; yerine sitenin kendi görselli öne çıkanları kullanılır
        $body = self::render('home', ['site' => $site, 'latest' => $latest, 'per' => $per, 'popular' => $popular, 'quotes' => self::quotes()]);
        return [
            'title' => $site->name . ' – Borsa, Döviz, Altın, Kripto ve Ekonomi Haberleri',
            'desc' => $site->description !== '' ? $site->description : 'Ekonomi Gündemi: borsa, döviz, altın, kripto para, şirket ve makro ekonomi haberleri; BIST 100, dolar, euro, gram altın, Brent ve Bitcoin canlı piyasa şeridi.',
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

    private static function marketsPage(Site $site): array
    {
        $tcmb = null;
        try {
            $tcmb = Widgets::get()->tcmb();
        } catch (Throwable) {
        }
        return [
            'title' => 'Canlı Piyasalar: BIST 100, Dolar, Euro, Altın, Brent, Bitcoin | ' . $site->name,
            'desc' => 'BIST 100, USD/TRY, EUR/TRY, gram altın, Brent petrol, Bitcoin ve Ethereum güncel fiyatları; TCMB gösterge kurları.',
            'body' => self::render('markets', ['site' => $site, 'quotes' => self::quotes(), 'tcmb' => $tcmb, 'at' => self::quotesTime()]),
            'path' => '/piyasalar',
        ];
    }

    private static function sectionsPage(Repository $repo, Site $site): array
    {
        $per = [];
        try {
            $per = $repo->latestPerCategory($site->id, array_keys(self::SECTIONS), 3);
        } catch (Throwable) {
        }
        return [
            'title' => 'Bölümler | ' . $site->name,
            'desc' => 'Ekonomi Gündemi bölümleri: borsa, döviz, altın, kripto, banka ve finans, makro ekonomi, şirketler, enerji, gayrimenkul ve daha fazlası.',
            'body' => self::render('sections', ['site' => $site, 'per' => $per]),
            'path' => '/bolumler',
        ];
    }
}
