"""Per-site overrides read side (user rules 2026-10-08 20:23). Idempotent; run on copies of the container files.
Repository.php: category-off set (hm_site_category_overrides) joins the per-site block rules -> lists drop the items,
                story pages 404. App.php: off categories leave $site->categories (nav, home category blocks,
                /kategori/<slug> 404) and menu items linking to them. index.php: page cache entries older than the
                site's hm_site_override_rev are rebuilt (rev read via APCu, 10 s)."""
import sys
d = sys.argv[1]
MARK = "per-site overrides 2026-10-08"

def patch(path, pairs):
    s = open(path, encoding="utf-8").read()
    if MARK in s:
        print("already", path); return
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:80])
        s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s)
    print("patched", path)

patch(d + "/Repository.php", [
("""    public function setSite(int $siteId): void
    {
        $this->currentSite = $siteId;
        $this->block = null;
    }
""", """    public function setSite(int $siteId): void
    {
        $this->currentSite = $siteId;
        $this->block = null;
        $this->catOff = null;
    }

    /** @var array<string, true>|null per-site overrides 2026-10-08: categories the site's editor switched off */
    private ?array $catOff = null;

    /**
     * Categories switched off for one site (HM Editör > RSS Haberler > Kategoriler; TP hm_site_category_overrides).
     * Shared rows are untouched; only this site hides the menu item, the home block, lists and story pages.
     * @return array<string, true>
     */
    public function siteCategoryOff(int $siteId): array
    {
        if ($siteId <= 0) {
            return [];
        }
        if ($siteId === $this->currentSite && $this->catOff !== null) {
            return $this->catOff;
        }
        $out = [];
        try {
            $stmt = $this->pdo->prepare('SELECT category_slug FROM hm_site_category_overrides WHERE site_id = :site AND active = false');
            $stmt->execute(['site' => $siteId]);
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $slug) {
                $out[Modules::slug((string) $slug)] = true;
            }
        } catch (\\PDOException) {
            // table missing: no override
        }
        if ($siteId === $this->currentSite) {
            $this->catOff = $out;
        }
        return $out;
    }
"""),
("""    private function isBlocked(array $s, bool $withBody = false): bool
    {
        $b = $this->blockRules();
""", """    private function isBlocked(array $s, bool $withBody = false): bool
    {
        $cat = (string) ($s['category'] ?? '');
        if ($cat !== '' && isset($this->siteCategoryOff($this->currentSite)[$cat])) {
            return true; // per-site overrides 2026-10-08
        }
        $b = $this->blockRules();
"""),
("""        if ($this->blockRules()['patterns'] === [] && $this->blockRules()['slugs'] === []) {
            return $items;
        }
        return array_values(array_filter($items, fn (array $s): bool => !$this->isBlocked($s)));""",
"""        if ($this->blockRules()['patterns'] === [] && $this->blockRules()['slugs'] === [] && $this->siteCategoryOff($this->currentSite) === []) {
            return $items;
        }
        return array_values(array_filter($items, fn (array $s): bool => !$this->isBlocked($s)));"""),
])

patch(d + "/App.php", [
("""        return new Site(
            (int) $row['id'],
            (string) $row['slug'],
            (string) $row['display_name'],""",
"""        // per-site overrides 2026-10-08: categories the editor switched off leave the nav, the home category blocks
        // (built from $categories), /kategori/<slug> (404 via category()) and menu items that link to them.
        $catOff = $this->repo->siteCategoryOff((int) $row['id']);
        if ($catOff !== []) {
            $categories = array_values(array_filter($categories, static fn (array $c): bool => !isset($catOff[$c['slug']])));
            foreach (['hmCorporateMenuItems', 'hmNewsFooterMenuItems', 'hmNewsStripMenuItems', 'hmNewsSidebarMenuItems'] as $mk) {
                if (!is_array($layout[$mk] ?? null)) {
                    continue;
                }
                $drop = [];
                foreach ($layout[$mk] as $it) {
                    if (is_array($it) && preg_match('#^/kategori/([a-z0-9-]+)/?$#', strtolower((string) ($it['href'] ?? '')), $mm) === 1 && isset($catOff[$mm[1]])) {
                        $drop[(string) ($it['id'] ?? '')] = true;
                    }
                }
                if ($drop !== []) {
                    $layout[$mk] = array_values(array_filter($layout[$mk], static function ($it) use ($drop, $catOff): bool {
                        if (!is_array($it)) {
                            return true;
                        }
                        if (isset($drop[(string) ($it['id'] ?? '')]) || isset($drop[(string) ($it['parentId'] ?? '')])) {
                            return false;
                        }
                        return true;
                    }));
                }
            }
        }
        return new Site(
            (int) $row['id'],
            (string) $row['slug'],
            (string) $row['display_name'],"""),
("""    private function category(Site $site, string $slug): void
    {
        $known = $slug === 'ozel-haber';""",
"""    private function category(Site $site, string $slug): void
    {
        $known = $slug === 'ozel-haber' && !isset($this->repo->siteCategoryOff($site->id)['ozel-haber']);"""),
])

patch(d + "/index.php", [
("""$stale = null;
$locked = false;
if ($cacheable && !$forceBuild) {
    $entry = $cache->fetch($key, $editor ? $editorMaxAge : null);
""", """// per-site overrides 2026-10-08: an editor toggle (HM Editör > RSS Haberler) bumps TP hm_site_override_rev; page copies
// built before it are rebuilt. The rev per host is read at most every 10 s per PHP worker (APCu).
$overrideRev = static function () use ($hostOnly): int {
    $h = str_starts_with($hostOnly, 'www.') ? substr($hostOnly, 4) : $hostOnly;
    $k = 'ovrev:' . $h;
    if (function_exists('apcu_fetch')) {
        $v = apcu_fetch($k, $ok);
        if ($ok) {
            return (int) $v;
        }
    }
    $rev = 0;
    try {
        $pdo = Db::connect((string) (getenv('DATABASE_URL') ?: ''));
        $st = $pdo->prepare('SELECT COALESCE(EXTRACT(EPOCH FROM max(r.rev_at)), 0) FROM hm_site_override_rev r
            JOIN hm_news_sites s ON s.id = r.site_id
            WHERE lower(s.domain) = :h OR lower(s.domain2) = :h OR lower(s.domain3) = :h');
        $st->execute(['h' => $h]);
        $rev = (int) ceil((float) $st->fetchColumn());
    } catch (Throwable) {
        $rev = 0;
    }
    if (function_exists('apcu_store')) {
        apcu_store($k, $rev, 10);
    }
    return $rev;
};

$stale = null;
$locked = false;
if ($cacheable && !$forceBuild) {
    $entry = $cache->fetch($key, $editor ? $editorMaxAge : null);
    if ($entry !== null && $entry['fresh'] && (time() - $entry['age']) <= $overrideRev()) {
        $entry['fresh'] = false; // built before the last per-site override: rebuild (others get the stale copy meanwhile)
    }
"""),
])
