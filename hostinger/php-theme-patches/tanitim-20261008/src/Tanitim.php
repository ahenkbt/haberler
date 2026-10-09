<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * tanitim 2026-10-08: /tanitim page ("Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı", user text verbatim)
 * on every news site + the live news-site logo grid (same source as turkatahaber.com/daha:
 * GET /api/hm/public/news-sites, corporate 7/11/61 and suspended sites excluded there).
 */
final class Tanitim
{
    /** User's text (2026-10-08 23:35), verbatim; only split into blocks for the layout. */
    public const TEXT = [
        'title' => 'Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı',
        'salutation' => 'İş ortaklarımızın ve ajanslarımızın dikkatine;',
        'intro' => [
            'Bünyemizde faaliyet gösteren 25 farklı haber ve yayın portalımız üzerinden yürütülen tanıtım haberi, basın bülteni ve dijital PR çalışmalarında, içeriğinizin dijital görünürlüğünü en üst seviyeye çıkarmak adına senkronize bir yayın süreci uygulanmaktadır.',
            'Tarafımıza iletilen ve yayın onayından geçen tanıtım haberiniz, dijital yayın ağımızda yer alan 25 haber sitemizin tamamında eksiksiz ve eş zamanlı olarak yayınlanmıştır.',
        ],
        'advTitle' => 'Yayın Süreci ve Sağlanan Avantajlar',
        'advantages' => [
            [
                'Eksiksiz Ağ Kapsamı',
                'Gönderilen metin ve görsel materyaller, 25 haber portalımızın tamamında özgün yayın standartlarına uygun şekilde okuyuculara sunulmuştur.',
            ],
            [
                'SEO ve Arama Motoru İndeksi',
                'Tüm sitelerimizde gerçekleşen yayınlar, arama motorları (Google, Yandex vb.) tarafından hızlıca indekslenecek teknik altyapıyla servis edilmiş; markanızın dijital ayak izi ve arama sonuçlarındaki varlığı güçlendirilmiştir.',
            ],
            [
                'Kalıcı Yayın Garantisi',
                'İlgili içerikler, aksine bir anlaşma veya hukuki bir talep olmadığı sürece sitelerimizde kalıcı olarak arşivlenecektir.',
            ],
        ],
        'outro' => [
            'Yayınlanan haberlere ait aktif bağlantı (link) listesi ve performans istatistikleri raporlanarak tarafınıza sunulacaktır.',
            'Markanızın iletişim ve PR süreçlerinde ağımızı tercih ettiğiniz için teşekkür eder, başarılı çalışmalar dileriz.',
        ],
    ];

    private const API = 'https://turkatahaber.com/api/hm/public/news-sites';
    private const CACHE_FILE = '/tmp/ys-bridge/tanitim-news-sites-v2.json';
    private const TTL = 600;

    /** Site's own information mailbox (convention: bilgi@<domain>, <sub>@gundemi.org / fix.tc). */
    public static function email(Site $site): string
    {
        $dom = strtolower(trim($site->domain !== '' ? $site->domain : $site->host));
        $dom = (string) preg_replace('#^(https?://)?(www\.)?#', '', $dom);
        $dom = (string) preg_replace('#[/:].*$#', '', $dom);
        return Site::conventionEmail($dom);
    }

    /**
     * Live main grid. İl Siteleri is ilSites() from the same payload.
     * @return list<array<string, mixed>>
     */
    public static function sites(): array
    {
        return self::bundle()['sites'];
    }

    /**
     * İl Siteleri logo grid (Ankara Şehir Fix Haber and Ankara Gündem Fix Haber included).
     * @return list<array<string, mixed>>
     */
    public static function ilSites(): array
    {
        return self::bundle()['ilSites'];
    }

    /**
     * @return array{sites: list<array<string, mixed>>, ilSites: list<array<string, mixed>>}
     */
    private static function bundle(): array
    {
        $empty = ['sites' => [], 'ilSites' => []];
        if (function_exists('apcu_fetch')) {
            $hit = apcu_fetch('tanitim:bundle:v2', $ok);
            if ($ok && is_array($hit) && is_array($hit['sites'] ?? null) && is_array($hit['ilSites'] ?? null)) {
                return $hit;
            }
        }
        $stale = null;
        if (is_file(self::CACHE_FILE)) {
            $j = json_decode((string) @file_get_contents(self::CACHE_FILE), true);
            if (is_array($j) && is_array($j['sites'] ?? null) && is_array($j['ilSites'] ?? null)) {
                $stale = ['sites' => $j['sites'], 'ilSites' => $j['ilSites']];
                if ((time() - (int) ($j['at'] ?? 0)) < self::TTL) {
                    self::remember($stale, 120);
                    return $stale;
                }
            }
        }
        $bundle = null;
        if (function_exists('curl_init')) {
            $ch = curl_init(self::API);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
                CURLOPT_USERAGENT => 'YenisafakTheme-tanitim',
            ]);
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if (is_string($raw) && $code === 200) {
                $j = json_decode($raw, true);
                if (is_array($j) && is_array($j['sites'] ?? null) && $j['sites'] !== []) {
                    $bundle = [
                        'sites' => self::shapeList($j['sites']),
                        'ilSites' => self::shapeList(is_array($j['ilSites'] ?? null) ? $j['ilSites'] : []),
                    ];
                    @file_put_contents(
                        self::CACHE_FILE,
                        json_encode(['at' => time(), 'sites' => $bundle['sites'], 'ilSites' => $bundle['ilSites']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        LOCK_EX
                    );
                }
            }
        }
        if ($bundle === null) {
            $bundle = $stale ?? $empty;
            self::remember($bundle, 60);
            return $bundle;
        }
        self::remember($bundle, self::TTL);
        return $bundle;
    }

    /**
     * @param list<mixed> $rows
     * @return list<array<string, mixed>>
     */
    private static function shapeList(array $rows): array
    {
        $out = [];
        foreach ($rows as $s) {
            if (!is_array($s) || (string) ($s['domain'] ?? '') === '') {
                continue;
            }
            $out[] = [
                'id' => (int) ($s['id'] ?? 0),
                'name' => (string) ($s['name'] ?? $s['domain']),
                'domain' => (string) $s['domain'],
                'url' => (string) ($s['url'] ?? ('https://' . $s['domain'] . '/')),
                'logo' => (string) ($s['logo'] ?? ''),
                'logoBg' => (string) ($s['logoBg'] ?? ''),
            ];
        }
        return $out;
    }

    /** @param array{sites: list<array<string, mixed>>, ilSites: list<array<string, mixed>>} $bundle */
    private static function remember(array $bundle, int $ttl): void
    {
        if (function_exists('apcu_store')) {
            apcu_store('tanitim:bundle:v2', $bundle, $ttl);
        }
    }

    /** Plain description for <meta> (first intro sentence). */
    public static function description(): string
    {
        return (string) self::TEXT['intro'][0];
    }

    /**
     * tanitim mainnav 2026-10-09: "Tanıtım" sits in the MAIN MENU (top nav) of every news site, new sites included
     * (render-time, no layout_json write needed). Excluded: vatanhaber.net (user rule 00:06 TRT; footer link only),
     * or any site whose layout_json sets hmTanitimMainNav = false.
     */
    public static function mainNav(Site $site): bool
    {
        $flag = $site->layout['hmTanitimMainNav'] ?? null;
        if ($flag === false || $flag === 0 || $flag === '0' || $flag === 'off') {
            return false;
        }
        foreach ([$site->domain, $site->host] as $h) {
            $h = strtolower(preg_replace('/^www\./i', '', trim((string) $h)) ?? '');
            if ($h === 'vatanhaber.net' || str_ends_with($h, '.vatanhaber.net')) {
                return false;
            }
        }
        return $site->slug !== 'vatanhaber';
    }
}
