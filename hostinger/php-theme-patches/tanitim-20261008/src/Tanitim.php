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
    private const CACHE_FILE = '/tmp/ys-bridge/tanitim-news-sites.json';
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
     * Live list of news sites: [{id,name,domain,url,logo,logoBg}]. APCu 10 min, file copy kept as stale fallback.
     * @return list<array<string, mixed>>
     */
    public static function sites(): array
    {
        if (function_exists('apcu_fetch')) {
            $hit = apcu_fetch('tanitim:sites', $ok);
            if ($ok && is_array($hit)) {
                return $hit;
            }
        }
        $stale = null;
        if (is_file(self::CACHE_FILE)) {
            $j = json_decode((string) @file_get_contents(self::CACHE_FILE), true);
            if (is_array($j) && is_array($j['sites'] ?? null)) {
                $stale = $j['sites'];
                if ((time() - (int) ($j['at'] ?? 0)) < self::TTL) {
                    self::remember($stale, 120);
                    return $stale;
                }
            }
        }
        $sites = null;
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
                    $sites = [];
                    foreach ($j['sites'] as $s) {
                        if (!is_array($s) || (string) ($s['domain'] ?? '') === '') {
                            continue;
                        }
                        $sites[] = [
                            'id' => (int) ($s['id'] ?? 0),
                            'name' => (string) ($s['name'] ?? $s['domain']),
                            'domain' => (string) $s['domain'],
                            'url' => (string) ($s['url'] ?? ('https://' . $s['domain'] . '/')),
                            'logo' => (string) ($s['logo'] ?? ''),
                            'logoBg' => (string) ($s['logoBg'] ?? ''),
                        ];
                    }
                    @file_put_contents(self::CACHE_FILE, json_encode(['at' => time(), 'sites' => $sites], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
                }
            }
        }
        if ($sites === null) {
            $sites = $stale ?? [];
            self::remember($sites, 60);
            return $sites;
        }
        self::remember($sites, self::TTL);
        return $sites;
    }

    private static function remember(array $sites, int $ttl): void
    {
        if (function_exists('apcu_store')) {
            apcu_store('tanitim:sites', $sites, $ttl);
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
