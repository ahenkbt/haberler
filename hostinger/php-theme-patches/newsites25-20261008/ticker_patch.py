import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
if "concept ticker 2026-10-08" in s:
    print("already"); sys.exit(0)
a = """                $this->ticker = $this->take($def, '', $n, $tickUsed, false, false);
            } else {"""
assert s.count(a) == 1, "anchor1"
s = s.replace(a, """                $this->ticker = $this->take($def, '', $n, $tickUsed, false, false);
            } elseif (($conceptTick = self::conceptTickerSlugs($site)) !== []) { // concept ticker 2026-10-08 (newsites25): concept sites tick only their own categories
                $def = $this->repo->storiesIn($site->id, $conceptTick, max(48, $n + 24));
                $tickUsed = [];
                $this->ticker = $this->take($def, '', $n, $tickUsed, false, false);
            } else {""")
b = """                    $this->ticker = array_slice($this->repo->storiesIn($site->id, CategoryTree::savunmaOwnSlugs(), 12), 0, 12);
                } else {"""
assert s.count(b) == 1, "anchor2"
s = s.replace(b, """                    $this->ticker = array_slice($this->repo->storiesIn($site->id, CategoryTree::savunmaOwnSlugs(), 12), 0, 12);
                } elseif (($conceptTick = self::conceptTickerSlugs($site)) !== []) { // concept ticker 2026-10-08 (newsites25)
                    $this->ticker = array_slice($this->repo->storiesIn($site->id, $conceptTick, 12), 0, 12);
                } else {""")
helper = """
    /** concept ticker 2026-10-08 (newsites25): concept sites (hmConceptSite) with an own category list (hmNewsRssCategoryOnly)
     *  show only those categories in SON DAKİKA, never network leftovers. [] = not a concept ticker. @return list<string> */
    private static function conceptTickerSlugs(object $site): array
    {
        $l = is_array($site->layout ?? null) ? $site->layout : [];
        if (empty($l['hmConceptSite']) || !is_array($l['hmNewsRssCategoryOnly'] ?? null)) {
            return [];
        }
        return array_values(array_filter(array_map(static fn ($v): string => strtolower(trim((string) $v)), $l['hmNewsRssCategoryOnly']),
            static fn (string $v): bool => preg_match('/^[a-z0-9-]{1,80}$/', $v) === 1));
    }
"""
i = s.rstrip().rfind("}")
s = s[:i] + helper.lstrip("\n") + s[i:]
open(p, "w", encoding="utf-8").write(s); print("patched")
