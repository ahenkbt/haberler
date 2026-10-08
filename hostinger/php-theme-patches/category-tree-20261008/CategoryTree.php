<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * Category tree for general news sites (2026-10-08): main categories → subcategories → (sub-)subcategories,
 * plus Yerel → 7 regions → 81 provinces.
 *  - Menu: tree children as dropdowns under matching /kategori/<slug> roots (render time; panel menus untouched).
 *  - Category page: tabs per tree level; a parent page lists its descendants' stories too.
 *  - Home: tree slugs become blocks in tree order (blocks under 3 items stay hidden, see App::homeSection).
 * Mode per site: layout_json hmCatTree = "full" | "yerel" | "off"; default from GENERAL / YEREL_ONLY below.
 * Topical sites (yesilvatan, turksav, sehitgazi, fix.tc, dunyasaglik, sosyalhizmetler…) stay "off".
 */
final class CategoryTree
{
    /** TP hm_news_sites ids of GENERAL news sites. */
    public const GENERAL = [1, 2, 3, 8, 230, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1143, 1144];
    /** Local-only sites: just the Yerel region/province tree. */
    public const YEREL_ONLY = [231];

    /** slug => [name, children(list of slug)]; a slug may be listed under two parents (e.g. MSB). */
    private const MAIN = ['siyaset', 'kamu', 'stk', 'yerel-yonetimler', 'dunya', 'yerel'];

    private const NAMES = [
        'siyaset' => 'Siyaset', 'kamu' => 'Kamu', 'stk' => 'STK', 'yerel-yonetimler' => 'Yerel Yönetimler',
        'dunya' => 'Dünya', 'yerel' => 'Yerel',
        'cumhurbaskanligi' => 'Cumhurbaşkanlığı', 'bakanliklar' => 'Bakanlıklar', 'tbmm' => 'TBMM',
        'siyasi-partiler' => 'Siyasi Partiler', 'genel-merkez' => 'Genel Merkez', 'il-ilce-baskanliklari' => 'İl / İlçe Başkanlıkları',
        'kamu-kurumlari' => 'Kamu Kurumları', 'mulki-idare' => 'Mülki İdare', 'valilikler' => 'Valilikler',
        'kaymakamliklar' => 'Kaymakamlıklar', 'guvenlik' => 'Güvenlik',
        'toplum-ve-yasam' => 'Toplum ve Yaşam', 'sivil-toplum-kuruluslari' => 'Sivil Toplum Kuruluşları',
        'buyuksehir-ve-iller' => 'Büyükşehir ve İller', 'ilceler' => 'İlçeler', 'belediye' => 'Belediye', 'muhtar' => 'Muhtar',
        'nato' => 'NATO', 'uluslararasi-kuruluslar' => 'Uluslararası Kuruluşlar', 'birlesmis-milletler' => 'Birleşmiş Milletler',
        'avrupa-birligi' => 'Avrupa Birliği',
        // Bakanlıklar
        'bakanlik-aile' => 'Aile ve Sosyal Hizmetler', 'bakanlik-saglik' => 'Sağlık',
        'bakanlik-milli-egitim' => 'Milli Eğitim', 'bakanlik-icisleri' => 'İçişleri', 'bakanlik-adalet' => 'Adalet',
        'bakanlik-disisleri' => 'Dışişleri', 'bakanlik-hazine' => 'Hazine ve Maliye',
        'bakanlik-calisma' => 'Çalışma ve Sosyal Güvenlik', 'bakanlik-tarim' => 'Tarım ve Orman',
        'bakanlik-ulastirma' => 'Ulaştırma ve Altyapı', 'bakanlik-enerji' => 'Enerji ve Tabii Kaynaklar',
        'bakanlik-sanayi' => 'Sanayi ve Teknoloji', 'bakanlik-cevre' => 'Çevre, Şehircilik ve İklim',
        'bakanlik-ticaret' => 'Ticaret', 'bakanlik-kultur-turizm' => 'Kültür ve Turizm',
        'bakanlik-genclik-spor' => 'Gençlik ve Spor', 'bakanlik-msb' => 'Milli Savunma (MSB)',
        // Güvenlik
        'tsk' => 'TSK', 'kara-kuvvetleri' => 'Kara Kuvvetleri', 'hava-kuvvetleri' => 'Hava Kuvvetleri',
        'deniz-kuvvetleri' => 'Deniz Kuvvetleri', 'sahil-guvenlik' => 'Sahil Güvenlik',
        'savunma-sanayii-baskanligi' => 'Savunma Sanayii Başkanlığı (SSB)', 'savunma-sanayi' => 'Savunma Sanayi',
        'aselsan' => 'ASELSAN', 'roketsan' => 'ROKETSAN', 'tusas' => 'TUSAŞ', 'baykar' => 'BAYKAR',
        'emniyet' => 'Emniyet', 'jandarma' => 'Jandarma',
        // Bölgeler
        'bolge-marmara' => 'Marmara', 'bolge-ege' => 'Ege', 'bolge-akdeniz' => 'Akdeniz', 'bolge-ic-anadolu' => 'İç Anadolu',
        'bolge-karadeniz' => 'Karadeniz', 'bolge-dogu-anadolu' => 'Doğu Anadolu', 'bolge-guneydogu-anadolu' => 'Güneydoğu Anadolu',
    ];

    private const CHILDREN = [
        'siyaset' => ['cumhurbaskanligi', 'bakanliklar', 'tbmm', 'siyasi-partiler', 'genel-merkez', 'il-ilce-baskanliklari'],
        'kamu' => ['kamu-kurumlari', 'mulki-idare', 'valilikler', 'kaymakamliklar', 'guvenlik'],
        'stk' => ['toplum-ve-yasam', 'sivil-toplum-kuruluslari'],
        'yerel-yonetimler' => ['buyuksehir-ve-iller', 'ilceler', 'belediye', 'muhtar'],
        'dunya' => ['nato', 'uluslararasi-kuruluslar', 'birlesmis-milletler', 'avrupa-birligi'],
        'bakanliklar' => [
            'bakanlik-aile', 'bakanlik-saglik', 'bakanlik-milli-egitim', 'bakanlik-icisleri',
            'bakanlik-adalet', 'bakanlik-disisleri', 'bakanlik-hazine', 'bakanlik-calisma',
            'bakanlik-tarim', 'bakanlik-ulastirma', 'bakanlik-enerji',
            'bakanlik-sanayi', 'bakanlik-cevre', 'bakanlik-ticaret', 'bakanlik-kultur-turizm',
            'bakanlik-genclik-spor', 'bakanlik-msb',
        ],
        'guvenlik' => [
            'tsk', 'bakanlik-msb', 'savunma-sanayii-baskanligi', 'savunma-sanayi', 'aselsan', 'roketsan',
            'tusas', 'baykar', 'emniyet', 'jandarma',
        ],
        'tsk' => ['kara-kuvvetleri', 'hava-kuvvetleri', 'deniz-kuvvetleri', 'sahil-guvenlik'],
        'yerel' => [
            'bolge-marmara', 'bolge-ege', 'bolge-akdeniz', 'bolge-ic-anadolu', 'bolge-karadeniz', 'bolge-dogu-anadolu',
            'bolge-guneydogu-anadolu',
        ],
        'bolge-marmara' => ['istanbul', 'bursa', 'kocaeli', 'tekirdag', 'edirne', 'kirklareli', 'sakarya', 'balikesir', 'canakkale', 'yalova', 'bilecik'],
        'bolge-ege' => ['izmir', 'manisa', 'aydin', 'denizli', 'mugla', 'usak', 'kutahya', 'afyonkarahisar'],
        'bolge-akdeniz' => ['antalya', 'adana', 'mersin', 'hatay', 'kahramanmaras', 'osmaniye', 'isparta', 'burdur'],
        'bolge-ic-anadolu' => ['ankara', 'konya', 'kayseri', 'eskisehir', 'sivas', 'yozgat', 'aksaray', 'nigde', 'nevsehir', 'kirsehir', 'kirikkale', 'karaman', 'cankiri'],
        'bolge-karadeniz' => ['samsun', 'trabzon', 'ordu', 'giresun', 'rize', 'artvin', 'zonguldak', 'bartin', 'karabuk', 'kastamonu', 'sinop', 'amasya', 'tokat', 'corum', 'gumushane', 'bayburt', 'bolu', 'duzce'],
        'bolge-dogu-anadolu' => ['erzurum', 'erzincan', 'van', 'malatya', 'elazig', 'agri', 'kars', 'ardahan', 'igdir', 'mus', 'bitlis', 'bingol', 'tunceli', 'hakkari'],
        'bolge-guneydogu-anadolu' => ['gaziantep', 'sanliurfa', 'diyarbakir', 'mardin', 'batman', 'siirt', 'sirnak', 'adiyaman', 'kilis'],
    ];

    private const PROVINCES = [
        'istanbul' => 'İstanbul', 'bursa' => 'Bursa', 'kocaeli' => 'Kocaeli', 'tekirdag' => 'Tekirdağ', 'edirne' => 'Edirne',
        'kirklareli' => 'Kırklareli', 'sakarya' => 'Sakarya', 'balikesir' => 'Balıkesir', 'canakkale' => 'Çanakkale',
        'yalova' => 'Yalova', 'bilecik' => 'Bilecik', 'izmir' => 'İzmir', 'manisa' => 'Manisa', 'aydin' => 'Aydın',
        'denizli' => 'Denizli', 'mugla' => 'Muğla', 'usak' => 'Uşak', 'kutahya' => 'Kütahya', 'afyonkarahisar' => 'Afyonkarahisar',
        'antalya' => 'Antalya', 'adana' => 'Adana', 'mersin' => 'Mersin', 'hatay' => 'Hatay', 'kahramanmaras' => 'Kahramanmaraş',
        'osmaniye' => 'Osmaniye', 'isparta' => 'Isparta', 'burdur' => 'Burdur', 'ankara' => 'Ankara', 'konya' => 'Konya',
        'kayseri' => 'Kayseri', 'eskisehir' => 'Eskişehir', 'sivas' => 'Sivas', 'yozgat' => 'Yozgat', 'aksaray' => 'Aksaray',
        'nigde' => 'Niğde', 'nevsehir' => 'Nevşehir', 'kirsehir' => 'Kırşehir', 'kirikkale' => 'Kırıkkale', 'karaman' => 'Karaman',
        'cankiri' => 'Çankırı', 'samsun' => 'Samsun', 'trabzon' => 'Trabzon', 'ordu' => 'Ordu', 'giresun' => 'Giresun',
        'rize' => 'Rize', 'artvin' => 'Artvin', 'zonguldak' => 'Zonguldak', 'bartin' => 'Bartın', 'karabuk' => 'Karabük',
        'kastamonu' => 'Kastamonu', 'sinop' => 'Sinop', 'amasya' => 'Amasya', 'tokat' => 'Tokat', 'corum' => 'Çorum',
        'gumushane' => 'Gümüşhane', 'bayburt' => 'Bayburt', 'bolu' => 'Bolu', 'duzce' => 'Düzce', 'erzurum' => 'Erzurum',
        'erzincan' => 'Erzincan', 'van' => 'Van', 'malatya' => 'Malatya', 'elazig' => 'Elazığ', 'agri' => 'Ağrı', 'kars' => 'Kars',
        'ardahan' => 'Ardahan', 'igdir' => 'Iğdır', 'mus' => 'Muş', 'bitlis' => 'Bitlis', 'bingol' => 'Bingöl', 'tunceli' => 'Tunceli',
        'hakkari' => 'Hakkari', 'gaziantep' => 'Gaziantep', 'sanliurfa' => 'Şanlıurfa', 'diyarbakir' => 'Diyarbakır',
        'mardin' => 'Mardin', 'batman' => 'Batman', 'siirt' => 'Siirt', 'sirnak' => 'Şırnak', 'adiyaman' => 'Adıyaman', 'kilis' => 'Kilis',
    ];

    /**
     * Categories switched off for the current site (hm_site_category_overrides, see Repository::categoryOff()).
     * Set once per request in App::buildSite(); menus, tabs and home blocks skip them.
     * @var array<string, true>
     */
    public static array $off = [];

    public static function isOff(string $slug): bool
    {
        return isset(self::$off[$slug]);
    }

    public static function mode(Site $site): string
    {
        $v = $site->layout['hmCatTree'] ?? null;
        if (is_string($v) && in_array($v, ['full', 'yerel', 'off'], true)) {
            return $v;
        }
        if (in_array($site->id, self::GENERAL, true)) {
            return 'full';
        }
        return in_array($site->id, self::YEREL_ONLY, true) ? 'yerel' : 'off';
    }

    public static function on(Site $site): bool
    {
        return self::mode($site) !== 'off';
    }

    /** Main slugs this site shows (yerel-only sites: just "yerel"). @return list<string> */
    public static function mains(Site $site): array
    {
        $mains = match (self::mode($site)) {
            'full' => self::MAIN,
            'yerel' => ['yerel'],
            default => [],
        };
        return array_values(array_filter($mains, static fn (string $m): bool => !self::isOff($m)));
    }

    /** Is $slug part of the site's tree? */
    public static function has(Site $site, string $slug): bool
    {
        return self::pathTo($site, $slug) !== [];
    }

    public static function name(string $slug, ?Site $site = null): string
    {
        if (isset(self::NAMES[$slug])) {
            return self::NAMES[$slug];
        }
        if (isset(self::PROVINCES[$slug])) {
            return self::PROVINCES[$slug];
        }
        return $site !== null ? $site->categoryName($slug) : $slug;
    }

    /** @return list<string> */
    public static function children(string $slug): array
    {
        return array_values(array_filter(self::CHILDREN[$slug] ?? [], static fn (string $k): bool => !self::isOff($k)));
    }

    /**
     * Root → … → $slug (first path found, mains in order). [] when not in this site's tree.
     * @return list<string>
     */
    public static function pathTo(Site $site, string $slug): array
    {
        foreach (self::mains($site) as $main) {
            $p = self::find($main, $slug, 0);
            if ($p !== null) {
                return $p;
            }
        }
        return [];
    }

    /** @return list<string>|null */
    private static function find(string $node, string $want, int $depth): ?array
    {
        if ($node === $want) {
            return [$node];
        }
        if ($depth > 5) {
            return null;
        }
        foreach (self::CHILDREN[$node] ?? [] as $kid) {
            $p = self::find($kid, $want, $depth + 1);
            if ($p !== null) {
                return array_merge([$node], $p);
            }
        }
        return null;
    }

    /** $slug plus every descendant (unique). @return list<string> */
    public static function descendants(string $slug): array
    {
        $out = [$slug => true];
        $stack = [$slug];
        $guard = 0;
        while ($stack !== [] && $guard++ < 500) {
            $n = array_pop($stack);
            foreach (self::CHILDREN[$n] ?? [] as $kid) {
                if (!isset($out[$kid])) {
                    $out[$kid] = true;
                    $stack[] = $kid;
                }
            }
        }
        return array_keys($out);
    }

    /**
     * Tab rows for a category page: one row per tree level on the path that has children.
     * @return list<array{parent: string, parentName: string, active: string, tabs: list<array{slug: string, name: string}>}>
     */
    public static function tabRows(Site $site, string $slug): array
    {
        $path = self::pathTo($site, $slug);
        if ($path === []) {
            return [];
        }
        $rows = [];
        foreach ($path as $i => $node) {
            $kids = self::children($node);
            if ($kids === []) {
                continue;
            }
            $rows[] = [
                'parent' => $node,
                'parentName' => self::name($node, $site),
                'active' => $path[$i + 1] ?? $node,
                'tabs' => array_map(static fn (string $k): array => ['slug' => $k, 'name' => self::name($k, $site)], $kids),
            ];
        }
        return $rows;
    }

    /**
     * Home block order: the site's categories with the "full" tree (minus Yerel regions/provinces) placed as one
     * group, in tree order, at the position of the first tree category. New tree slugs not in the categories
     * table are added (blocks still need 3+ items to show).
     * @param list<array{slug: string, name: string}> $categories
     * @return list<array{slug: string, name: string}>
     */
    public static function homeOrder(Site $site, array $categories): array
    {
        if (self::mode($site) !== 'full') {
            return $categories;
        }
        $group = [];
        foreach (self::MAIN as $main) {
            if ($main === 'yerel') {
                continue;
            }
            foreach (self::dfs($main) as $s) {
                if (!self::isOff($s)) {
                    $group[$s] = true;
                }
            }
        }
        $out = [];
        $placed = false;
        foreach ($categories as $cat) {
            if (self::isOff($cat['slug'])) {
                continue;
            }
            if (isset($group[$cat['slug']])) {
                if (!$placed) {
                    foreach (array_keys($group) as $s) {
                        $out[] = ['slug' => $s, 'name' => self::name($s, $site)];
                    }
                    $placed = true;
                }
                continue;
            }
            $out[] = $cat;
        }
        if (!$placed) {
            foreach (array_keys($group) as $s) {
                $out[] = ['slug' => $s, 'name' => self::name($s, $site)];
            }
        }
        return $out;
    }

    /** @return list<string> */
    private static function dfs(string $node, int $depth = 0): array
    {
        $out = [$node];
        if ($depth > 5) {
            return $out;
        }
        foreach (self::CHILDREN[$node] ?? [] as $kid) {
            foreach (self::dfs($kid, $depth + 1) as $s) {
                $out[] = $s;
            }
        }
        return array_values(array_unique($out));
    }

    /** "/kategori/<slug>" → slug when it is a tree node with children, else ''. */
    public static function dropdownSlug(Site $site, string $resolvedHref): string
    {
        $path = (string) (parse_url($resolvedHref, PHP_URL_PATH) ?: '');
        if ($site->basePath !== '' && str_starts_with($path, $site->basePath)) {
            $path = substr($path, strlen($site->basePath));
        }
        if (preg_match('#^/kategori/([a-z0-9-]+)/?$#', $path, $m) !== 1) {
            return '';
        }
        $slug = $m[1];
        return self::children($slug) !== [] && self::has($site, $slug) ? $slug : '';
    }
}
