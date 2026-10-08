import sys, re, os
root = sys.argv[1]
M = 'concept sites 2026-10-08'
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(root, p), 'w', encoding='utf-8').write(s)
def sub1(s, old, new, label):
    if new.strip() and new in s:
        print('already', label); return s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{label}: anchor count {n}')
    return s.replace(old, new)

# ---- Widgets.php
p = 'src/Widgets.php'; s = rd(p)
if M not in s:
    s = sub1(s, """        if (getenv('WIDGETS_DISABLED') === '1') {
            return false;
        }
        $key = self::TOGGLES[$widget] ?? '';""", """        if (getenv('WIDGETS_DISABLED') === '1') {
            return false;
        }
        if (self::conceptOff($site, $widget)) { // concept sites 2026-10-08
            return false;
        }
        $key = self::TOGGLES[$widget] ?? '';""", 'widgets-on')
    s = sub1(s, """    public static function city(string $slug): string""", """    /**
     * concept sites 2026-10-08: layout_json hmConceptSite=true marks a concept/topic site (set by the "Konsept site"
     * option of /admin/haber-siteleri or by hand). Concept sites never show burçlar; the Süper Lig table only
     * when hmConceptTopic = "spor". Sites without the flag (general news sites) are unchanged.
     */
    public static function isConcept(Site $site): bool
    {
        $v = $site->layout['hmConceptSite'] ?? null;
        return $v === true || $v === 1 || $v === '1' || $v === 'true';
    }

    public static function conceptTopic(Site $site): string
    {
        return strtolower(trim((string) ($site->layout['hmConceptTopic'] ?? '')));
    }

    private static function conceptOff(Site $site, string $widget): bool
    {
        if (!self::isConcept($site)) {
            return false;
        }
        if ($widget === 'horoscope') {
            return true;
        }
        if ($widget === 'standings') {
            return self::conceptTopic($site) !== 'spor';
        }
        return false;
    }

    public static function city(string $slug): string""", 'widgets-helpers')
    wr(p, s); print('patched', p)
else: print('skip', p)

# ---- layout.php
p = 'templates/layout.php'; s = rd(p)
if M not in s:
    a = """<a href="<?= Html::e($site->path('/puan-durumu')) ?>">Puan durumu</a>"""
    b = """<a href="<?= Html::e($site->path('/burclar')) ?>">Burçlar</a>"""
    if s.count(a) != 2 or s.count(b) != 2: raise SystemExit(f'layout anchors {s.count(a)} {s.count(b)}')
    s = s.replace(a, "<?php if (\\Yenisafak\\Widgets::on($site, 'standings')): /* concept sites 2026-10-08 */ ?>" + a + "<?php endif; ?>")
    s = s.replace(b, "<?php if (\\Yenisafak\\Widgets::on($site, 'horoscope')): /* concept sites 2026-10-08 */ ?>" + b + "<?php endif; ?>")
    wr(p, s); print('patched', p)
else: print('skip', p)

# ---- CategoryTree.php
p = 'src/CategoryTree.php'; s = rd(p)
if M not in s:
    s = sub1(s, "in_array($v, ['full', 'yerel', 'off', 'savunma'], true)", "in_array($v, ['full', 'yerel', 'off', 'savunma', 'spor'], true) /* concept sites 2026-10-08: + spor */", 'tree-mode')
    s = sub1(s, "            'savunma' => self::SAVUNMA_MAIN, // turksav tree 2026-10-08\n", "            'savunma' => self::SAVUNMA_MAIN, // turksav tree 2026-10-08\n            'spor' => ['spor'], // concept sites 2026-10-08: sports concept site (hmCatTree = spor)\n", 'tree-mains')
    s = sub1(s, """    public static function homeOrder(Site $site, array $categories): array
    {
""", """    public static function homeOrder(Site $site, array $categories): array
    {
        if (self::mode($site) === 'spor') { // concept sites 2026-10-08: Spor (all branches) + one block per branch (+ Özel Haber when listed)
            $out = [];
            if (in_array('ozel-haber', array_column($categories, 'slug'), true) && !self::isOff('ozel-haber')) {
                $out[] = ['slug' => 'ozel-haber', 'name' => 'Özel Haber'];
            }
            foreach (array_merge(['spor'], self::SPOR) as $s) {
                if (!self::isOff($s)) {
                    $out[] = ['slug' => $s, 'name' => self::name($s, $site)];
                }
            }
            return $out;
        }
""", 'tree-home')
    wr(p, s); print('patched', p)
else: print('skip', p)

# ---- Repository.php
p = 'src/Repository.php'; s = rd(p)
if M not in s:
    if 'story dedupe 2026-10-08' not in s: raise SystemExit('Repository.php lacks storydup hunks: refusing')
    s = sub1(s, """    private function rssScope(): string
    {
        $scope = '(site_id IS NULL OR site_id = :site';
        if ($this->rssShared !== []) {
            // ints only, validated in setRssShared()
            $scope .= ' OR site_id IN (' . implode(',', $this->rssShared) . ')';
        }
        return $scope . ')';
    }""", """    /** @var list<string> concept sites 2026-10-08: layout_json hmNewsRssCategoryOnly (shared pool rows limited to these categories) */
    private array $rssCatOnly = [];

    /** concept sites 2026-10-08: e.g. spor.gundemi.org reads pool 230 but only its Spor categories. [] = no limit. @param list<string> $slugs */
    public function setRssCategoryOnly(array $slugs): void
    {
        $this->rssCatOnly = array_values(array_unique(array_filter(array_map(static fn ($v): string => strtolower(trim((string) $v)), $slugs),
            static fn (string $v): bool => preg_match('/^[a-z0-9-]{1,80}$/', $v) === 1)));
    }

    private function rssCatOnlyList(): string
    {
        return implode(',', array_map(static fn (string $v): string => "'" . $v . "'", $this->rssCatOnly));
    }

    private function rssScope(): string
    {
        if ($this->rssCatOnly !== []) { // concept sites 2026-10-08: own rows always; shared/pool rows only in the listed categories
            $shared = 'site_id IS NULL' . ($this->rssShared !== [] ? ' OR site_id IN (' . implode(',', $this->rssShared) . ')' : '');
            return '(site_id = :site OR ((' . $shared . ") AND COALESCE(category_slug, '') IN (" . $this->rssCatOnlyList() . ')))';
        }
        $scope = '(site_id IS NULL OR site_id = :site';
        if ($this->rssShared !== []) {
            // ints only, validated in setRssShared()
            $scope .= ' OR site_id IN (' . implode(',', $this->rssShared) . ')';
        }
        return $scope . ')';
    }""", 'repo-scope')
    s = sub1(s, """        $offNews = $offList !== '' ? " AND COALESCE(c.slug, '') NOT IN ({$offList})" : '';
""", """        $offNews = $offList !== '' ? " AND COALESCE(c.slug, '') NOT IN ({$offList})" : '';
        if ($this->rssCatOnly !== []) { // concept sites 2026-10-08: network pool news limited to the site's categories too
            $offNews .= " AND (n.site_id = :site OR n.owner_site_id = :site OR COALESCE(c.slug, '') IN (" . $this->rssCatOnlyList() . '))';
        }
""", 'repo-news')
    wr(p, s); print('patched', p)
else: print('skip', p)

# ---- App.php
p = 'src/App.php'; s = rd(p)
if M not in s:
    s = sub1(s, """        $this->repo->setRssShared(self::rssSharedFor($site));
""", """        $this->repo->setRssShared(self::rssSharedFor($site));
        $this->repo->setRssCategoryOnly(is_array($site->layout['hmNewsRssCategoryOnly'] ?? null) ? array_values($site->layout['hmNewsRssCategoryOnly']) : []); // concept sites 2026-10-08
""", 'app-route')
    wr(p, s); print('patched', p)
else: print('skip', p)
