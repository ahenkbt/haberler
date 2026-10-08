import sys
p=sys.argv[1]; s=open(p).read()
M='tanitim mainnav 2026-10-09'
if M in s: print('already'); sys.exit(0)
old_drawer='''                <a href="<?= Html::e($site->path('/tanitim')) ?>">Tanıtım</a><?php /* tanitim 2026-10-08 */ ?>\n'''
new_drawer='''                <?php if (\\Yenisafak\\Tanitim::mainNav($site)): /* tanitim mainnav 2026-10-09: not on vatanhaber menus */ ?><a href="<?= Html::e($site->path('/tanitim')) ?>">Tanıtım</a><?php endif; ?><?php /* tanitim 2026-10-08 */ ?>\n'''
assert s.count(old_drawer)==1, 'drawer'
s=s.replace(old_drawer,new_drawer)
anchor='''          <?php endforeach; ?>
        <?php endif; ?>
      </div>
      <?php if (!$headerMenuOn): ?>
      <div class="ys-tools">'''
assert s.count(anchor)==1, 'anchor'
ins='''          <?php endforeach; ?>
        <?php endif; ?>
        <?php if (\\Yenisafak\\Tanitim::mainNav($site) && !in_array('/tanitim', array_map(static fn ($r): string => rtrim((string) (parse_url(\\Yenisafak\\Menu::href($site, (string) ($r['href'] ?? '')), PHP_URL_PATH) ?: ''), '/'), $headerMenuOn ? $headerMenuRoots : []), true)): /* tanitim mainnav 2026-10-09: Tanıtım in the main menu on every news site except vatanhaber */ ?><a class="ys-nav-tanitim" href="<?= Html::e($site->path('/tanitim')) ?>"<?= \\Yenisafak\\Menu::isCurrent($current, $site->path('/tanitim')) ? ' aria-current="page"' : '' ?>>Tanıtım</a><?php endif; ?>
      </div>
      <?php if (!$headerMenuOn): ?>
      <div class="ys-tools">'''
s=s.replace(anchor,ins)
open(p,'w').write(s); print('patched')
