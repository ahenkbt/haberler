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

    /** Admin askı bayrağı. Aktiflikten ayrıdır; kamu sayfaları sabit yazıyı basar. */
    public function publicSuspended(): bool
    {
        return ($this->layout['hmPublicSuspended'] ?? null) === true;
    }

    /** Editor `hmYsMansetPreset`, otherwise the older `hmNewsYsMansetLayout`. */
    public function mansetPreset(): string
    {
        $direct = $this->presetId($this->layout['hmYsMansetPreset'] ?? null);
        if ($direct !== '') {
            return $direct;
        }
        return $this->presetId($this->layout['hmNewsYsMansetLayout'] ?? null);
    }

    private function presetId(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));
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
     * Enabled image ad from `hmAdSlots`.
     *
     * @return array{image: string, href: string}|null
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
            $image = trim((string) ($slot['imageMediaUrl'] ?? ''));
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

    public function faviconHref(): string
    {
        $url = trim((string) ($this->layout['faviconUrl'] ?? ''));
        if ($url === '' || preg_match('#^(https?:)?//|^/#', $url) !== 1) {
            return $this->path('/favicon.svg');
        }
        return Html::src($this->basePath, $url);
    }

    /** Article share row. Missing key stays on so existing sites keep sharing. */
    public function shareEnabled(): bool
    {
        if (!array_key_exists('hmYsShareEnabled', $this->layout)) {
            return true;
        }
        $value = $this->layout['hmYsShareEnabled'];
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }

    public function aboutHtml(): string
    {
        $html = trim((string) ($this->layout['hmFooterAboutHtml'] ?? ''));
        return $html === '' ? '' : Html::sanitize($html);
    }

    public function pageHtml(string $key): string
    {
        $pages = $this->layout['hmCorporatePageHtml'] ?? null;
        if (!is_array($pages)) {
            return '';
        }
        $html = trim((string) ($pages[$key] ?? ''));
        return $html === '' ? '' : Html::sanitize($html);
    }

    /**
     * @return list<array{label: string, href: string}>
     */
    public function socialLinks(): array
    {
        $raw = $this->layout['hmFooterSocial'] ?? null;
        if (!is_array($raw)) {
            return [];
        }
        $map = [
            'instagramUrl' => 'Instagram',
            'facebookUrl' => 'Facebook',
            'xUrl' => 'X',
            'youtubeUrl' => 'YouTube',
        ];
        $out = [];
        foreach ($map as $key => $label) {
            $url = trim((string) ($raw[$key] ?? ''));
            if (preg_match('#^https?://#i', $url) === 1) {
                $out[] = ['label' => $label, 'href' => $url];
            }
        }
        return $out;
    }

    /**
     * Category-bar menu. Empty means the theme should print categories.
     *
     * @return list<array{label: string, href: string, children: list<array{label: string, href: string}>}>
     */
    public function mainMenu(): array
    {
        return $this->menuTree('hmCorporateMenuItems');
    }

    /**
     * Logo-side links. Empty means the four default tools.
     *
     * @return list<array{label: string, href: string}>
     */
    public function headerTools(): array
    {
        if (($this->layout['hmNewsStripMenuEnabled'] ?? null) === false) {
            return $this->defaultHeaderTools();
        }
        $items = $this->menuFlat('hmNewsStripMenuItems');
        return $items !== [] ? $items : $this->defaultHeaderTools();
    }

    /**
     * @return list<array{label: string, href: string}>
     */
    public function footerLinks(): array
    {
        $items = $this->menuFlat('hmNewsFooterMenuItems');
        if ($items === []) {
            $items = [
                ['label' => 'Künye', 'href' => $this->path('/kunye')],
                ['label' => 'Hakkımızda', 'href' => $this->path('/hakkimizda')],
                ['label' => 'İletişim', 'href' => $this->path('/iletisim')],
                ['label' => 'Site haritası', 'href' => $this->path('/sitemap.xml')],
            ];
        }
        $hasAuthorLogin = false;
        foreach ($items as $i => $item) {
            $href = (string) ($item['href'] ?? '');
            if (str_contains($href, '/koseyazari/giris') || str_contains($href, '/yazar/giris')) {
                $items[$i]['href'] = '/koseyazari/giris';
                $hasAuthorLogin = true;
            }
        }
        if (!$hasAuthorLogin) {
            $items[] = ['label' => 'Köşe yazarı girişi', 'href' => '/koseyazari/giris'];
        }
        foreach ($this->menuFlat('hmNewsSidebarMenuItems') as $extra) {
            $items[] = $extra;
        }
        return $items;
    }

    /** @return list<array{label: string, href: string}> */
    private function defaultHeaderTools(): array
    {
        return [
            ['label' => 'Video', 'href' => $this->path('/video')],
            ['label' => 'Hakkımızda', 'href' => $this->path('/hakkimizda')],
            ['label' => 'Künye', 'href' => $this->path('/kunye')],
            ['label' => 'İletişim', 'href' => $this->path('/iletisim')],
        ];
    }

    /**
     * @return list<array{label: string, href: string, children: list<array{label: string, href: string}>}>
     */
    private function menuTree(string $key): array
    {
        $rows = $this->rawMenuRows($key);
        $children = [];
        foreach ($rows as $row) {
            $parent = $row['parentId'];
            if ($parent === '') {
                continue;
            }
            $children[$parent][] = ['label' => $row['label'], 'href' => $row['href']];
        }
        $out = [];
        foreach ($rows as $row) {
            if ($row['parentId'] !== '') {
                continue;
            }
            $out[] = [
                'label' => $row['label'],
                'href' => $row['href'],
                'children' => $children[$row['id']] ?? [],
            ];
        }
        return $out;
    }

    /** @return list<array{label: string, href: string}> */
    private function menuFlat(string $key): array
    {
        $out = [];
        foreach ($this->rawMenuRows($key) as $row) {
            if ($row['parentId'] !== '') {
                continue;
            }
            $out[] = ['label' => $row['label'], 'href' => $row['href']];
        }
        return $out;
    }

    /**
     * @return list<array{id: string, label: string, href: string, parentId: string}>
     */
    private function rawMenuRows(string $key): array
    {
        $raw = $this->layout[$key] ?? null;
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $enabled = $item['enabled'] ?? true;
            if ($enabled === false || $enabled === 0 || $enabled === '0' || $enabled === 'false') {
                continue;
            }
            $label = trim((string) ($item['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $out[] = [
                'id' => trim((string) ($item['id'] ?? '')),
                'label' => $label,
                'href' => $this->menuHref((string) ($item['href'] ?? '')),
                'parentId' => trim((string) ($item['parentId'] ?? '')),
            ];
        }
        return $out;
    }

    /** Turns editor hrefs such as /hm/{slug}/kategori/spor into this theme's path. */
    public function menuHref(string $href): string
    {
        $href = trim($href);
        if (preg_match('#^https?://#i', $href) === 1) {
            return $href;
        }
        if (preg_match('#/hm/[^/]+(/.*)$#', $href, $match) === 1) {
            $href = $match[1];
        }
        if ($href === '' || $href === '#') {
            return $this->path('/');
        }
        if ($href[0] !== '/') {
            $href = '/' . $href;
        }
        return $this->path($href);
    }
}
