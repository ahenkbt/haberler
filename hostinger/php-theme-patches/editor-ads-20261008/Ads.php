<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * Ad slots. A slot renders only when it has an ad; an empty, disabled or
 * unknown slot renders an empty string, so no space is reserved.
 *
 * Sources, later ones win per slot:
 *   1. config/ads.json in the image (or the file named by ADS_CONFIG)
 *   2. hm_news_sites.layout_json "hmNewsAdSlots": {"<slot>": <ad>|null}
 * Kill switches: env ADS_DISABLED=1, or layout_json "hmNewsAdsEnabled": false.
 *
 * An <ad> is one of
 *   {"house": true}                                   built-in house ad (own ad contact of the site, Site::adContact)
 *   {"image": "https://...", "link": "https://...", "alt": "...", "width": 728, "height": 90}
 *   {"html": "<a ...>...</a>"}                        trusted markup (ad network tag etc.)
 * or a list of those (rotated per position). Any ad may carry "enabled": false.
 * Home category boxes shorter than their row neighbours get a filler slot: "home_{category}_alti"
 * (e.g. home_spor_alti), falling back to "home_block_fill"; it only shows when the gap is >= 130 px.
 */
final class Ads
{
    public const SLOTS = ['header', 'leaderboard', 'block_strip', 'home_between', 'sidebar', 'article_inline', 'article_between'];

    private static ?self $instance = null;

    /** @param array<string, list<array<string, mixed>>> $slots */
    private function __construct(private array $slots, private Site $site)
    {
    }

    public static function forSite(Site $site): self
    {
        if (self::$instance !== null && self::$instance->site === $site) {
            return self::$instance;
        }
        $slots = [];
        $disabled = getenv('ADS_DISABLED') === '1'
            || (array_key_exists('hmNewsAdsEnabled', $site->layout) && in_array($site->layout['hmNewsAdsEnabled'], [false, 0, '0', 'false'], true));
        if (!$disabled) {
            $config = [];
            $path = getenv('ADS_CONFIG');
            $path = is_string($path) && $path !== '' ? $path : dirname(__DIR__) . '/config/ads.json';
            if (is_file($path)) {
                $json = json_decode((string) file_get_contents($path), true);
                if (is_array($json)) {
                    // Optional per-site overrides: {"sites": {"<site slug>": {"<slot>": ...}}}
                    $perSite = $json['sites'][$site->slug] ?? null;
                    unset($json['sites']);
                    $config = is_array($perSite) ? array_merge($json, $perSite) : $json;
                }
            }
            $db = $site->layout['hmNewsAdSlots'] ?? null;
            if (is_array($db)) {
                foreach ($db as $slot => $ad) {
                    $config[(string) $slot] = $ad;
                }
            }
            // 3. HM Editör Yenişafak vitrin: layout_json "hmAdSlots" list; an enabled image entry wins for its slot.
            // editor ads 2026-10-08: every PHP slot (plus home_<kategori>_alti keys) and HTML-mode entries too.
            $edKeys = array_merge(self::SLOTS, ['home_block_fill']);
            foreach ((is_array($site->layout['hmAdSlots'] ?? null) ? $site->layout['hmAdSlots'] : []) as $edRow) {
                $k = is_array($edRow) ? (string) ($edRow['slotKey'] ?? '') : '';
                if (preg_match('/^home_[a-z0-9-]+_alti$/', $k) === 1) {
                    $edKeys[] = $k;
                }
            }
            foreach (array_unique($edKeys) as $edSlot) {
                $ed = $site->adSlot($edSlot);
                if ($ed !== null && ($ed['html'] ?? '') !== '') {
                    $config[$edSlot] = ['html' => $ed['html']];
                } elseif ($ed !== null) {
                    $config[$edSlot] = [
                        'image' => str_starts_with($ed['image'], '//') ? 'https:' . $ed['image'] : $ed['image'],
                        'link' => str_starts_with($ed['href'], '//') ? 'https:' . $ed['href'] : $ed['href'],
                        'alt' => 'Reklam',
                    ];
                }
            }
            // Per-block filler slots (home_{category}_alti, e.g. home_spor_alti) plus the generic home_block_fill.
            $dynamic = array_filter(array_keys($config), static fn ($k): bool => is_string($k) && preg_match('/^home_[a-z0-9-]+_alti$/', $k) === 1);
            // editor ads 2026-10-08: layout_json hmNewsAdHouse=false (editör paneli anahtarı) -> no "Bu alana reklam verin".
            $house = !(array_key_exists('hmNewsAdHouse', $site->layout) && in_array($site->layout['hmNewsAdHouse'], [false, 0, '0', 'false'], true));
            foreach (array_merge(self::SLOTS, ['home_block_fill'], $dynamic) as $slot) {
                $ads = self::normalize($config[$slot] ?? null, $house);
                if ($ads !== []) {
                    $slots[$slot] = $ads;
                }
            }
        }
        return self::$instance = new self($slots, $site);
    }

    /** Filler ad for a home category box: its own slot (home_{key}_alti) or the generic home_block_fill. */
    public function blockFill(string $key): string
    {
        $slot = 'home_' . preg_replace('/[^a-z0-9-]/', '', strtolower($key)) . '_alti';
        return $this->has($slot) ? $this->render($slot) : $this->render('home_block_fill');
    }

    public function has(string $slot): bool
    {
        return isset($this->slots[$slot]);
    }

    /** HTML for the slot, or '' when the slot is empty. */
    public function render(string $slot, int $position = 0): string
    {
        $ads = $this->slots[$slot] ?? [];
        if ($ads === []) {
            return '';
        }
        $ad = $ads[$position % count($ads)];
        $inner = $this->inner($ad, $slot);
        if ($inner === '') {
            return '';
        }
        return '<aside class="ys-ad ys-ad-' . Html::e(str_replace('_', '-', $slot)) . '" data-ad-slot="' . Html::e($slot) . '" aria-label="Reklam">'
            . '<span class="ys-ad-label">Reklam</span>' . $inner . '</aside>';
    }

    /** @return list<array<string, mixed>> */
    private static function normalize(mixed $value, bool $house = true): array
    {
        if (!is_array($value) || $value === []) {
            return [];
        }
        $list = array_is_list($value) ? $value : [$value];
        $out = [];
        foreach ($list as $ad) {
            if (!is_array($ad) || ($ad['enabled'] ?? true) === false) {
                continue;
            }
            if ((($ad['house'] ?? false) === true && $house)
                || (is_string($ad['html'] ?? null) && trim($ad['html']) !== '')
                || (is_string($ad['image'] ?? null) && preg_match('#^(https?://|/)#', $ad['image']) === 1)) {
                $out[] = $ad;
            }
        }
        return $out;
    }

    /** @param array<string, mixed> $ad */
    private function inner(array $ad, string $slot): string
    {
        if (($ad['house'] ?? false) === true) {
            return $this->house($slot);
        }
        if (is_string($ad['html'] ?? null)) {
            return trim($ad['html']);
        }
        $img = (string) $ad['image'];
        $src = str_starts_with($img, '/') ? $this->site->path($img) : $img;
        $w = (int) ($ad['width'] ?? 0);
        $h = (int) ($ad['height'] ?? 0);
        $tag = '<img src="' . Html::e($src) . '" alt="' . Html::e((string) ($ad['alt'] ?? 'Reklam')) . '"'
            . ($w > 0 ? ' width="' . $w . '"' : '') . ($h > 0 ? ' height="' . $h . '"' : '') . ' loading="lazy" decoding="async">';
        $link = (string) ($ad['link'] ?? '');
        if (preg_match('#^(https?://|mailto:|tel:|/)#', $link) === 1) {
            return '<a href="' . Html::e($link) . '" rel="sponsored noopener" target="_blank">' . $tag . '</a>';
        }
        return $tag;
    }

    private function house(string $slot): string
    {
        // Ad sales contact of THIS site (Site::adContact: bilgi@<domain>, phone only when layout_json hmNewsAdContact sets one).
        $c = $this->site->adContact();
        $email = $c['email'];
        $cls = 'ys-house ys-house-' . Html::e(str_replace('_', '-', $slot));
        $mailHref = $email !== '' ? 'mailto:' . Html::e($email) . '?subject=Reklam' : Html::e($this->site->path('/iletisim'));
        $turkata = $this->site->isTurkata() && !$this->site->whiteLabel();
        $mark = $turkata
            ? '<img class="ys-house-mark" src="' . Html::e($this->site->path(Html::versioned('/brand/turkata/turkata-mark.png'))) . '" alt="" width="64" height="64" loading="lazy" decoding="async">'
            : '';
        $cta = $turkata ? 'TürkAta Haber Ajansı' : $this->site->name;
        if ($c['phone'] === '') {
            return '<a class="' . $cls . '" href="' . $mailHref . '">' . $mark
                . '<span class="ys-house-copy"><strong>Bu alana reklam verin</strong>'
                . ($email !== '' ? '<span>' . Html::e($email) . '</span>' : '') /* no ys-house-mail: the email is the only contact, keep it on phones */ . '</span>'
                . '<span class="ys-house-cta">' . Html::e($cta) . '</span></a>';
        }
        // With a phone: separate mailto and tel links (no nested anchors).
        $in = ' style="color:inherit;text-decoration:none"';
        return '<div class="' . $cls . '">' . $mark
            . '<span class="ys-house-copy"><strong><a href="' . $mailHref . '"' . $in . '>Bu alana reklam verin</a></strong>'
            . '<span>' . ($email !== '' ? '<span class="ys-house-mail"><a href="' . $mailHref . '"' . $in . '>' . Html::e($email) . '</a> · </span>' : '')
            . '<a href="tel:' . Html::e($c['tel']) . '"' . $in . '>' . Html::e($c['phone']) . '</a></span></span>'
            . '<a class="ys-house-cta" href="' . $mailHref . '" style="text-decoration:none">' . Html::e($cta) . '</a></div>';
    }
}
