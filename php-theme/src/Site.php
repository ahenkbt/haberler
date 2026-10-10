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
}
