#!/usr/bin/env python3
"""spor 2026-10-10: App.php'ye hmSpor kabuğu için üç küçük hunk ekler.

Hunk'lar Spor::on() ile kapılıdır. hmSpor yoksa hiçbir site (spor.gundemi.org dahil)
yeni kabuğa düşmez. Ekonomi hunk'ları duruyorsa onların hemen ardına yazılır;
yoksa eco yamasındaki sector / YeniTc çapalarına düşülür.
"""
import sys

p = sys.argv[1] if len(sys.argv) > 1 else "/docker/php-theme/src/App.php"
s = open(p, encoding="utf-8").read()
if "spor 2026-10-10" in s:
    print("already")
    raise SystemExit(0)

route = """        // spor 2026-10-10: Spor Gündemi (layout_json hmSpor). Bayrak yoksa bu blok çalışmaz.
        if (Spor::on($site) && ($sp = Spor::page($this->repo, $site, $path)) !== null) {
            $this->html($site, $sp['title'], $sp['desc'], $sp['body'], (int) ($sp['status'] ?? 200), $sp['path'], $sp['jsonLd'] ?? null, (string) ($sp['image'] ?? ''));
            return;
        }
"""
render = """        if ($ynDir === '' && ($data['site'] ?? null) instanceof Site && Spor::on($data['site']) && is_file(dirname(__DIR__) . '/templates/spor/' . $template . '.php')) { // spor 2026-10-10
            $ynDir = 'spor/';
        }
"""
layout = """        if (Spor::on($site)) { // spor 2026-10-10: Spor Gündemi kabuğu (templates/spor/layout.php)
            $this->seoCtx = [];
            require dirname(__DIR__) . '/templates/spor/layout.php';
            return;
        }
"""


def after(anchor: str, block: str, label: str) -> bool:
    global s
    if anchor not in s:
        return False
    s = s.replace(anchor, anchor + block, 1)
    print("patched", label)
    return True


eco_route = """        if (Eco::on($site) && ($ep = Eco::page($this->repo, $site, $path)) !== null) {
            $this->html($site, $ep['title'], $ep['desc'], $ep['body'], (int) ($ep['status'] ?? 200), $ep['path'], $ep['jsonLd'] ?? null, (string) ($ep['image'] ?? ''));
            return;
        }
"""
if not after(eco_route, route, "route-after-eco"):
    anchor = "        // sector 2026-10-10: sektör platformu siteleri (layout hmSector)\n"
    if anchor not in s:
        raise SystemExit("route anchor missing")
    s = s.replace(anchor, route + anchor, 1)
    print("patched route-before-sector")

eco_render = """        if ($ynDir === '' && ($data['site'] ?? null) instanceof Site && Eco::on($data['site']) && is_file(dirname(__DIR__) . '/templates/eco/' . $template . '.php')) { // eco 2026-10-10
            $ynDir = 'eco/';
        }
"""
if not after(eco_render, render, "render-after-eco"):
    anchor = "        if ($ynDir === '' && ($data['site'] ?? null) instanceof Site && Sector::on($data['site'])"
    if anchor not in s:
        raise SystemExit("render anchor missing")
    s = s.replace(anchor, render + anchor, 1)
    print("patched render-before-sector")

eco_layout = """        if (Eco::on($site)) { // eco 2026-10-10: Ekonomi Gündemi kabuğu (templates/eco/layout.php)
            $this->seoCtx = [];
            require dirname(__DIR__) . '/templates/eco/layout.php';
            return;
        }
"""
if not after(eco_layout, layout, "layout-after-eco"):
    anchor = "        if (YeniTc::on($site)) { // yenitc 2026-10-09: yeni.tc magazine shell"
    if anchor not in s:
        raise SystemExit("layout anchor missing")
    s = s.replace(anchor, layout + anchor, 1)
    print("patched layout-before-yenitc")

open(p, "w", encoding="utf-8").write(s)
print("patched", p)
