import sys, re
d = sys.argv[1]
def rw(p, f):
    s = open(p, encoding='utf-8').read(); n = f(s)
    if n == s: print('UNCHANGED', p)
    open(p, 'w', encoding='utf-8').write(n)

def app(s):
    if 'tanitim 2026-10-08' in s: return s
    old = "        if ($path === '/kunye' || $path === '/hakkimizda' || $path === '/iletisim') {"
    assert s.count(old) == 1
    s = s.replace(old, "        if ($path === '/tanitim') { // tanitim 2026-10-08: premium Tanıtım page on every news site\n            $this->tanitimPage($site);\n            return;\n        }\n" + old, 1)
    old = "    /** /yazarlar: the site's authors"
    assert s.count(old) == 1
    meth = '''    /** tanitim 2026-10-08: /tanitim — "Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı" + live news-site logo grid. */
    private function tanitimPage(Site $site): void
    {
        $title = 'Tanıtım';
        if ($this->seo($site) !== null) {
            $this->seoCtx = ['breadcrumbs' => [['Ana Sayfa', '/'], [$title, '/tanitim']]];
        }
        $this->html(
            $site,
            \\Yenisafak\\Tanitim::TEXT['title'] . ' | ' . $site->name,
            \\Yenisafak\\Tanitim::description(),
            $this->render('tanitim', ['site' => $site, 'sites' => \\Yenisafak\\Tanitim::sites()]),
            200,
            '/tanitim'
        );
    }

'''
    s = s.replace(old, meth + old, 1)
    old = "$static = ['/', '/video', '/videolar', '/kunye', '/hakkimizda', '/iletisim', '/sitene-ekle'];"
    assert s.count(old) == 1
    s = s.replace(old, "$static = ['/', '/video', '/videolar', '/kunye', '/hakkimizda', '/iletisim', '/tanitim', '/sitene-ekle']; // tanitim 2026-10-08", 1)
    return s

def page(s):
    if '_contact_form' in s: return s
    old = "    <?php if ($site->isTurkata()): ?>\n      <p>THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.</p>\n    <?php endif; ?>\n  <?php endif; ?>\n</div>"
    assert s.count(old) == 1, 'page tail'
    return s.replace(old, old + "\n<?php if ($page === 'iletisim'): /* tanitim 2026-10-08: contact form on every news site */ ?><div class=\"ys-wrap\"><?php require __DIR__ . '/_contact_form.php'; ?></div><?php endif; ?>", 1)

def layout(s):
    if 'tanitim 2026-10-08' in s: return s
    old = """              <div><h3>Kurumsal</h3>
                <a href="<?= Html::e($site->path('/hakkimizda')) ?>">Hakkımızda</a>"""
    assert s.count(old) == 1, 'drawer'
    s = s.replace(old, old + """\n                <a href="<?= Html::e($site->path('/tanitim')) ?>">Tanıtım</a><?php /* tanitim 2026-10-08 */ ?>""", 1)
    old = """        <?php $ysAuthorLoginHref = '/koseyazari/giris'; ?>"""
    assert s.count(old) == 1, 'footer'
    s = s.replace(old, """        <?php if (!$footerMenuOn || !in_array('/tanitim', array_map(static fn ($fi): string => (string) ($fi['href'] ?? ''), $footerMenuItems), true)): /* tanitim 2026-10-08: Tanıtım link on every news site */ ?><a href="<?= Html::e($site->path('/tanitim')) ?>"<?= \\Yenisafak\\Menu::isCurrent($current, $site->path('/tanitim')) ? ' aria-current="page"' : '' ?>>Tanıtım</a><?php endif; ?>\n""" + old, 1)
    return s

rw(d + '/src/App.php', app)
rw(d + '/templates/page.php', page)
rw(d + '/templates/layout.php', layout)
print('patched')
