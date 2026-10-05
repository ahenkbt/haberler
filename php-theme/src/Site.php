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

    /** Editor `hmYsMansetPreset`. Empty means the theme default layout. */
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
}
