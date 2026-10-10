<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * Homepage blocks. Each block maps onto module keys the existing editor panel
 * already stores in hm_news_sites.layout_json. Missing flags stay on.
 */
final class Modules
{
    /** @var array<string, array{label: string, category: string, count: int, rank: int, toggles: list<string>, aliases: list<string>}> */
    public const DEFS = [
        'ysTicker' => [
            'label' => 'Son dakika',
            'category' => 'gundem',
            'count' => 12,
            'rank' => 10,
            'toggles' => ['hmNewsYsTickerEnabled', 'hmNewsBreakingBandEnabled'],
            'aliases' => ['ysTicker', 'breakingBand'],
        ],
        'ysManset' => [
            'label' => 'Manşet',
            'category' => 'gundem',
            'count' => 8,
            'rank' => 20,
            'toggles' => ['hmNewsYsMansetEnabled', 'hmNewsSliderEnabled', 'hmNewsTepeMansetEnabled'],
            'aliases' => ['ysManset', 'hero', 'tepeManset'],
        ],
        'ysSide' => [
            'label' => 'Yan manşetler',
            'category' => 'gundem',
            'count' => 4,
            'rank' => 30,
            'toggles' => ['hmNewsYsSideHeadlinesEnabled', 'hmNewsLeadListSidebarEnabled'],
            'aliases' => ['ysSide', 'ysSideHeadlines', 'leadListSidebar'],
        ],
        'ysCategories' => [
            'label' => 'Kategori blokları',
            'category' => '',
            'count' => 4,
            'rank' => 40,
            'toggles' => ['hmNewsYsCategoryBlocksEnabled', 'hmNewsCategorySectionsEnabled', 'hmNewsYekpareKategorilerKutusuEnabled'],
            'aliases' => ['ysCategories', 'ysCategoryBlocks', 'yekpareKategorilerKutusu', 'featuredCategoryStrip'],
        ],
        'ysVideo' => [
            'label' => 'Video bandı',
            'category' => '',
            'count' => 8,
            'rank' => 50,
            'toggles' => ['hmNewsYsVideoBandEnabled', 'hmNewsRecentVideosSidebarEnabled'],
            'aliases' => ['ysVideo', 'ysVideoBand', 'recentVideosSidebar'],
        ],
        'ysAuthors' => [
            'label' => 'Yazarlar',
            'category' => '',
            'count' => 8,
            'rank' => 60,
            'toggles' => ['hmNewsYsAuthorsEnabled', 'hmNewsAuthorsEnabled'],
            'aliases' => ['ysAuthors', 'authorsStrip', 'ahenkGununSesiAuthors'],
        ],
        'ysMostRead' => [
            'label' => 'Çok okunanlar',
            'category' => 'gundem',
            'count' => 8,
            'rank' => 70,
            'toggles' => ['hmNewsYsMostReadEnabled', 'hmNewsAhenkPopulerHaberlerEnabled'],
            'aliases' => ['ysMostRead', 'ahenkPopulerHaberler'],
        ],
        'ysGallery' => [
            'label' => 'Galeri',
            'category' => 'kultur-sanat',
            'count' => 6,
            'rank' => 80,
            'toggles' => ['hmNewsYsGalleryEnabled', 'hmNewsMediaDarkBlockEnabled'],
            'aliases' => ['ysGallery', 'mediaDarkBlock', 'culturePortal'],
        ],
    ];

    /** @param array<string, mixed> $layout
     *  @return list<array{id: string, label: string, category: string, count: int}>
     */
    public static function enabled(array $layout): array
    {
        $order = is_array($layout['hmNewsHomeModuleOrder'] ?? null) ? $layout['hmNewsHomeModuleOrder'] : [];
        $slugs = is_array($layout['hmNewsHomeModuleCategorySlugs'] ?? null) ? $layout['hmNewsHomeModuleCategorySlugs'] : [];
        $counts = is_array($layout['hmNewsHomeModuleItemCounts'] ?? null) ? $layout['hmNewsHomeModuleItemCounts'] : [];
        $rows = [];
        foreach (self::DEFS as $id => $def) {
            if (!self::isOn($layout, $def['toggles'])) {
                continue;
            }
            $rank = 1000 + $def['rank'];
            foreach ($order as $index => $key) {
                if (in_array((string) $key, $def['aliases'], true)) {
                    $rank = (int) $index;
                    break;
                }
            }
            $category = $def['category'];
            foreach ($def['aliases'] as $alias) {
                if (isset($slugs[$alias]) && is_string($slugs[$alias]) && $slugs[$alias] !== '') {
                    $category = $slugs[$alias];
                    break;
                }
            }
            $count = $def['count'];
            foreach ($def['aliases'] as $alias) {
                if (isset($counts[$alias]) && is_numeric($counts[$alias])) {
                    $count = (int) $counts[$alias];
                    break;
                }
            }
            $rows[] = [
                'id' => $id,
                'label' => $def['label'],
                'category' => self::slug($category),
                'count' => max(1, min(24, $count)),
                'rank' => $rank,
            ];
        }
        usort($rows, static fn (array $a, array $b): int => $a['rank'] <=> $b['rank']);
        foreach ($rows as &$row) {
            unset($row['rank']);
        }
        return $rows;
    }

    /** @param list<string> $keys
     *  @param array<string, mixed> $layout
     */
    private static function isOn(array $layout, array $keys): bool
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $layout)) {
                return $layout[$key] === true || $layout[$key] === 1 || $layout[$key] === '1' || $layout[$key] === 'true';
            }
        }
        return true;
    }

    public static function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = strtr($value, ['ı' => 'i', 'ğ' => 'g', 'ü' => 'u', 'ş' => 's', 'ö' => 'o', 'ç' => 'c']);
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }
}
