p='/docker/php-theme/src/App.php'
s=open(p).read()
if 'eco 2026-10-10' in s: print('already'); raise SystemExit
# 1 route
a="        // sector 2026-10-10: sektör platformu siteleri (layout hmSector)"
assert a in s
r1='''        // eco 2026-10-10: Ekonomi Gündemi (slug ekonomi / ekonomi.gundemi.org): ana sayfa, /piyasalar, /bolumler (src/Eco.php).
        if (Eco::on($site) && ($ep = Eco::page($this->repo, $site, $path)) !== null) {
            $this->html($site, $ep['title'], $ep['desc'], $ep['body'], (int) ($ep['status'] ?? 200), $ep['path'], $ep['jsonLd'] ?? null, (string) ($ep['image'] ?? ''));
            return;
        }
'''
s=s.replace(a,r1+a,1)
# 2 render
b="        if ($ynDir === '' && ($data['site'] ?? null) instanceof Site && Sector::on($data['site'])"
assert b in s
r2='''        if ($ynDir === '' && ($data['site'] ?? null) instanceof Site && Eco::on($data['site']) && is_file(dirname(__DIR__) . '/templates/eco/' . $template . '.php')) { // eco 2026-10-10
            $ynDir = 'eco/';
        }
'''
s=s.replace(b,r2+b,1)
# 3 layout
c="        if (YeniTc::on($site)) { // yenitc 2026-10-09: yeni.tc magazine shell"
assert c in s
r3='''        if (Eco::on($site)) { // eco 2026-10-10: Ekonomi Gündemi kabuğu (templates/eco/layout.php)
            $this->seoCtx = [];
            require dirname(__DIR__) . '/templates/eco/layout.php';
            return;
        }
'''
s=s.replace(c,r3+c,1)
open(p,'w').write(s); print('patched')
