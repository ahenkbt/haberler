<?php

declare(strict_types=1);

namespace Yenisafak;

/** Resolved tenant plus URL helpers. */
final class Site
{
    /** @param array<string, mixed> $layout
     *  @param array<string, mixed> $contact
     *  @param list<array{slug: string, name: string}> $categories
     */
    public function __construct(
        public readonly int $id,
        public readonly string $slug,
        public readonly string $name,
        public readonly string $description,
        public readonly string $domain,
        public readonly array $layout,
        public readonly array $contact,
        public readonly string $accent,
        public readonly string $logo,
        public readonly string $host,
        public readonly string $basePath,
        public readonly string $canonicalOrigin,
        public readonly array $categories,
    ) {
    }

    public function path(string $path): string
    {
        $path = $path === '' ? '/' : $path;
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }
        if ($this->basePath === '') {
            return $path;
        }
        return $path === '/' ? $this->basePath : $this->basePath . $path;
    }

    public function canonical(string $path): string
    {
        $path = $path === '' ? '/' : $path;
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }
        return $path === '/' ? $this->canonicalOrigin . '/' : $this->canonicalOrigin . $path;
    }

    public function categoryName(string $slug): string
    {
        foreach ($this->categories as $cat) {
            if ($cat['slug'] === $slug) {
                return $cat['name'];
            }
        }
        return $slug;
    }

    public function isTurkata(): bool
    {
        return $this->slug === 'turkatahaber';
    }

    /** White-label site (layout_json hmNewsWhiteLabel=true, e.g. yerel.net.tr): no THA/TürkAta names anywhere (footer credit, house ad). */
    public function whiteLabel(): bool
    {
        return ($this->layout['hmNewsWhiteLabel'] ?? false) === true;
    }

    /**
     * Ad sales contact ("Bu alana reklam verin" house ads, künye "Reklam" row). Default for every site, new ones
     * included: bilgi@<site domain> and no phone. Per-site override: layout_json hmNewsAdContact
     * {"email": "...", "phone": "0 532 572 66 26"} (phone only where set; tel = +90 E.164 form).
     * @return array{email: string, phone: string, tel: string}
     */
    public function adContact(): array
    {
        $cfg = is_array($this->layout['hmNewsAdContact'] ?? null) ? $this->layout['hmNewsAdContact'] : [];
        $email = trim((string) ($cfg['email'] ?? ''));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $dom = strtolower(trim($this->domain !== '' ? $this->domain : $this->host));
            $dom = (string) preg_replace('#^(https?://)?(www\.)?#', '', $dom);
            $dom = (string) preg_replace('#[/:].*$#', '', $dom);
            $email = self::conventionEmail($dom); // editor ads 2026-10-08: kibris.gundemi.org -> kibris@gundemi.org
        }
        $phone = trim((string) ($cfg['phone'] ?? ''));
        $digits = (string) preg_replace('/\D+/', '', $phone);
        $tel = '';
        if ($digits !== '') {
            if (str_starts_with($phone, '+')) {
                $tel = '+' . $digits;
            } elseif (str_starts_with($digits, '90') && strlen($digits) === 12) {
                $tel = '+' . $digits;
            } else {
                $tel = '+90' . ltrim($digits, '0');
            }
        }
        return ['email' => $email, 'phone' => $tel !== '' ? $phone : '', 'tel' => $tel];
    }

    /**
     * editor ads 2026-10-08: site mail convention (same as the panel editor login / mailbox):
     * sub.parent.tld -> sub@parent.tld, apex domains (incl. com.tr, gen.tr ...) -> bilgi@domain.
     */
    public static function conventionEmail(string $dom): string
    {
        $dom = strtolower(trim($dom, ". \t"));
        if ($dom === '' || str_ends_with($dom, '.pages.dev') || str_ends_with($dom, '.workers.dev') || !str_contains($dom, '.')) {
            return $dom !== '' && str_contains($dom, '.') ? 'bilgi@' . $dom : '';
        }
        $labels = explode('.', $dom);
        $n = count($labels);
        $two = $n >= 2 ? $labels[$n - 2] . '.' . $labels[$n - 1] : $dom;
        $multi = ['com.tr', 'net.tr', 'org.tr', 'gen.tr', 'web.tr', 'biz.tr', 'info.tr', 'av.tr', 'bel.tr', 'gov.tr', 'edu.tr', 'k12.tr', 'pol.tr', 'tsk.tr', 'tv.tr', 'name.tr', 'tel.tr', 'bbs.tr', 'dr.tr', 'co.uk', 'org.uk', 'com.cy', 'com.de'];
        $regLabels = in_array($two, $multi, true) ? 3 : 2;
        if ($n <= $regLabels) {
            return 'bilgi@' . $dom;
        }
        $registrable = implode('.', array_slice($labels, $n - $regLabels));
        $sub = $labels[$n - $regLabels - 1];
        return $sub . '@' . $registrable;
    }

    /** Site language (layout_json hmNewsLang, default tr). */
    public function lang(): string
    {
        $l = (string) ($this->layout['hmNewsLang'] ?? 'tr');
        return preg_match('/^[a-z]{2}$/', $l) === 1 ? $l : 'tr';
    }

    /** Editor `hmYsMansetPreset` (HM Editör Yenişafak vitrin). Empty means the theme default layout. */
    public function mansetPreset(): string
    {
        $raw = strtolower(trim((string) ($this->layout['hmYsMansetPreset'] ?? '')));
        return in_array($raw, ['odatv', 'sabah', 'takvim', 'mynet', 'nefes'], true) ? $raw : '';
    }

    public function secondaryColor(): string
    {
        $raw = trim((string) ($this->layout['hmSecondaryColor'] ?? ''));
        return preg_match('/^#[0-9a-fA-F]{6}$/', $raw) === 1 ? $raw : '';
    }

    /** Editor `hmYsSlogan`, otherwise the site description column. */
    public function slogan(): string
    {
        $slogan = trim((string) ($this->layout['hmYsSlogan'] ?? ''));
        return $slogan !== '' ? $slogan : $this->description;
    }

    /** @return array<string, string> */
    public function kunye(): array
    {
        $raw = $this->layout['hmYsKunye'] ?? null;
        if (!is_array($raw)) {
            return [];
        }
        $keys = ['lead', 'yayin', 'genelMudur', 'yayinYonetmeni', 'yaziIsleri', 'address', 'phone', 'email', 'tuzel', 'yayinIlkeleri'];
        $out = [];
        foreach ($keys as $key) {
            $text = trim((string) ($raw[$key] ?? ''));
            if ($text !== '') {
                $out[$key] = $text;
            }
        }
        return $out;
    }

    /**
     * Enabled image ad from the editor's `hmAdSlots` list (Ads::forSite overlays it on the slot).
     *
     * @return array{image: string, href: string, html?: string}|null
     */
    public function adSlot(string $slotKey): ?array
    {
        $slots = $this->layout['hmAdSlots'] ?? null;
        if (!is_array($slots)) {
            return null;
        }
        foreach ($slots as $slot) {
            if (!is_array($slot) || (string) ($slot['slotKey'] ?? '') !== $slotKey) {
                continue;
            }
            $enabled = $slot['enabled'] ?? false;
            if ($enabled !== true && $enabled !== 1 && $enabled !== '1' && $enabled !== 'true') {
                return null;
            }
            // editor ads 2026-10-08: HTML / kod modu (editör paneli "HTML / kod") -> {html}
            $mode = (string) ($slot['contentMode'] ?? '');
            $html = trim((string) ($slot['html'] ?? ''));
            $image = trim((string) ($slot['imageMediaUrl'] ?? ''));
            if ($mode !== 'image' && $html !== '' && ($mode === 'html' || $image === '')) {
                return ['html' => $html, 'image' => '', 'href' => ''];
            }
            if ($image === '' || preg_match('#^(https?:)?//|^/#', $image) !== 1) {
                return null;
            }
            $href = trim((string) ($slot['imageClickUrl'] ?? ''));
            if ($href !== '' && preg_match('#^(https?:)?//|^/#', $href) !== 1) {
                $href = '';
            }
            return ['image' => $image, 'href' => $href];
        }
        return null;
    }

    /** Article share row (editor hmYsShareEnabled). Missing key stays on so existing sites keep sharing. */
    public function shareEnabled(): bool
    {
        if (!array_key_exists('hmYsShareEnabled', $this->layout)) {
            return true;
        }
        $value = $this->layout['hmYsShareEnabled'];
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }

    /** Editor "Alt bilgi — Site hakkında" (hmFooterAboutHtml), sanitized. */
    public function aboutHtml(): string
    {
        $html = trim((string) ($this->layout['hmFooterAboutHtml'] ?? ''));
        return $html === '' ? '' : Html::sanitize($html);
    }

    /** Enabled editor page (hmExtraPages) with this slug, sanitized body; '' when missing/empty/off. */
    public function extraPageHtml(string $slug): string
    {
        foreach ((array) ($this->layout['hmExtraPages'] ?? []) as $page) {
            if (!is_array($page) || trim((string) ($page['slug'] ?? '')) !== $slug) {
                continue;
            }
            $on = $page['enabled'] ?? true;
            if ($on === false || $on === 0 || $on === '0' || $on === 'false') {
                return '';
            }
            $html = trim((string) ($page['bodyHtml'] ?? ''));
            return $html === '' ? '' : Html::sanitize($html);
        }
        return '';
    }

    /**
     * Footer social URLs: contact_json first, then the editor's hmFooterSocial (https only).
     * @return array<string, string> label => url
     */
    public function socialLinks(): array
    {
        $out = [];
        foreach (['facebook' => 'Facebook', 'x' => 'X', 'twitter' => 'X', 'instagram' => 'Instagram', 'youtube' => 'YouTube'] as $key => $label) {
            $url = (string) ($this->contact[$key] ?? ($this->contact['social'][$key] ?? ''));
            if (preg_match('#^https://#', $url) === 1 && !isset($out[$label])) {
                $out[$label] = $url;
            }
        }
        $raw = is_array($this->layout['hmFooterSocial'] ?? null) ? $this->layout['hmFooterSocial'] : [];
        foreach (['facebookUrl' => 'Facebook', 'xUrl' => 'X', 'instagramUrl' => 'Instagram', 'youtubeUrl' => 'YouTube'] as $key => $label) {
            $url = trim((string) ($raw[$key] ?? ''));
            if (preg_match('#^https://#i', $url) === 1 && !isset($out[$label])) {
                $out[$label] = $url;
            }
        }
        return $out;
    }
}
