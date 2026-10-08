import sys
p=sys.argv[1]; s=open(p).read()
M='tanitim mainnav-drawer 2026-10-09'
if M in s: print('already'); sys.exit(0)
anchor='''                    <a href="<?= Html::e($kidHref) ?>" style="padding-left:18px"<?= \\Yenisafak\\Menu::isCurrent($current, $kidHref) ? ' aria-current="page"' : '' ?>><?= Html::e($kid['label']) ?></a>
                  <?php endforeach; ?>
                <?php endforeach; ?>
              </div>'''
assert s.count(anchor)==1, 'anchor'
s=s.replace(anchor, anchor[:-len('              </div>')] + '''                <?php if (\\Yenisafak\\Tanitim::mainNav($site) && !in_array('/tanitim', array_map(static fn ($r): string => rtrim((string) (parse_url(\\Yenisafak\\Menu::href($site, (string) ($r['href'] ?? '')), PHP_URL_PATH) ?: ''), '/'), $headerMenuRoots), true)): /* tanitim mainnav-drawer 2026-10-09: mobile main menu too (not vatanhaber) */ ?><a href="<?= Html::e($site->path('/tanitim')) ?>"<?= \\Yenisafak\\Menu::isCurrent($current, $site->path('/tanitim')) ? ' aria-current="page"' : '' ?>>Tanıtım</a><?php endif; ?>
              </div>''')
open(p,'w').write(s); print('patched')
