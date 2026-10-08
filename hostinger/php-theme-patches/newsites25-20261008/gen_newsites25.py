"""newsites25 2026-10-08: memur.gundemi.org, turkdunyasi.gundemi.org, world.fix.tc logos (same family as gen.py / gen_spor.py).
Run: python3 gen_newsites25.py  -> /workspace/logos/gundemi/<slug>/ and <slug>/deploy/<base>{.png,-dark.png,-icon-*.png,...}"""
import os, math
import gen
from gen import W, wave_band, emblem_group, write, OUT, RED, RED_DARK, CAP1, CAP2, CAPD, TX, B1, B2
from textpath import text_path, cap_height
from shapes import star, crescent

def em_memur(p):
    s = []
    s.append(f'<path d="{wave_band(-30, 330, 236, 6, 60, 270)}" fill="{W(.22)}"/>')
    # steps
    for i, (w, y) in enumerate([(236, 214), (212, 202), (188, 190)]):
        s.append(f'<rect x="{150 - w/2}" y="{y}" width="{w}" height="10" rx="2" fill="#fff" opacity="{1 - i*0.08:.2f}"/>')
    # columns
    for x in (78, 120, 162, 204):
        s.append(f'<rect x="{x}" y="104" width="18" height="84" rx="2" fill="#fff"/>')
        s.append(f'<rect x="{x-4}" y="100" width="26" height="7" rx="2" fill="#fff"/>')
        s.append(f'<rect x="{x-4}" y="184" width="26" height="6" rx="2" fill="#fff"/>')
    # entablature + pediment
    s.append('<rect x="60" y="86" width="180" height="12" rx="2" fill="#fff"/>')
    s.append('<path d="M52,82 L150,30 L248,82 Z" fill="#fff"/>')
    s.append('<path d="M74,76 L150,42 L226,76 Z" fill="#c62828"/>')
    s.append(f'<path d="{crescent(142, 62, 11, 9, 3.4, 0)}" fill="#fff"/>')
    s.append(f'<path d="{star(155, 62, 5, rot=180)}" fill="#fff"/>')
    # document / ID card accent
    s.append('<g transform="translate(232,118) rotate(8)"><rect x="0" y="0" width="46" height="58" rx="6" fill="#ffd23f"/>'
             '<rect x="9" y="12" width="28" height="5" rx="2" fill="#1f3a68"/><rect x="9" y="24" width="28" height="5" rx="2" fill="#1f3a68"/>'
             '<rect x="9" y="36" width="18" height="5" rx="2" fill="#1f3a68"/></g>')
    return '\n'.join(s)

def em_turkdunyasi(p):
    s = []
    cx, cy = 150, 150
    s.append('<defs><radialGradient id="sunT" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f2b705"/></radialGradient></defs>')
    for k in range(32):
        a = math.radians(-180 + k * (180 / 31))
        r0, r1 = 62, 98 if k % 2 == 0 else 84
        x0, y0 = cx + r0 * math.cos(a), cy + r0 * math.sin(a)
        x1, y1 = cx + r1 * math.cos(a), cy + r1 * math.sin(a)
        s.append(f'<path d="M{x0:.1f},{y0:.1f} L{x1:.1f},{y1:.1f}" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="54" fill="url(#sunT)"/>')
    # mountains (Tanrı Dağları)
    s.append('<path d="M-10,196 L46,140 L78,168 L124,112 L168,160 L206,124 L252,170 L282,146 L320,186 V270 H-10 Z" fill="#fff"/>')
    s.append('<path d="M124,112 L108,130 L124,124 L138,132 Z M206,124 L194,138 L206,134 L216,140 Z" fill="#cfe9f3"/>')
    # koçboynuzu (ram's horn) band
    band = []
    for x in range(-6, 330, 52):
        band.append(f'<path d="M{x},238 c0,-16 22,-16 22,0 c0,10 -12,10 -12,2 M{x+44},238 c0,-16 -22,-16 -22,0 c0,10 12,10 12,2" stroke="{p["to"]}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    s.append(''.join(band))
    s.append(f'<path d="M-10,218 H320" stroke="{p["to"]}" stroke-width="3" opacity=".6"/>')
    return '\n'.join(s)

def em_world(p):
    s = []
    cx, cy, r = 150, 126, 92
    s.append('<defs><radialGradient id="glW" cx=".38" cy=".32" r=".9"><stop offset="0" stop-color="#ffffff" stop-opacity=".30"/><stop offset="1" stop-color="#ffffff" stop-opacity=".05"/></radialGradient></defs>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#glW)" stroke="#fff" stroke-width="7"/>')
    for rx in (30, 62):
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{r}" fill="none" stroke="#fff" stroke-width="5" opacity=".95"/>')
    s.append(f'<path d="M{cx},{cy-r} V{cy+r}" stroke="#fff" stroke-width="5"/>')
    for dy, half in ((0, r), (-46, math.sqrt(r*r - 46*46)), (46, math.sqrt(r*r - 46*46))):
        s.append(f'<path d="M{cx-half:.1f},{cy+dy} H{cx+half:.1f}" stroke="#fff" stroke-width="5" opacity=".95"/>')
    # orbit ring (orange) + satellite dot
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="136" ry="34" fill="none" stroke="#ff8c42" stroke-width="7" transform="rotate(-18 {cx} {cy})"/>')
    s.append(f'<circle cx="{cx+128:.1f}" cy="{cy-44:.1f}" r="11" fill="#ff8c42" stroke="#fff" stroke-width="3"/>')
    s.append(f'<path d="{wave_band(-30, 330, 240, 6, 56, 270)}" fill="{W(.22)}"/>')
    return '\n'.join(s)

SITES = [
    dict(slug='memur', base='memur-gundemi', name='MEMUR', line2='GÜNDEMİ', dom='gundemi.org', title='Memur Gündemi', em=em_memur,
         frm='#3b5f9e', to='#14274a', ink='#1f3a68'),
    dict(slug='turkdunyasi', base='turkdunyasi-gundemi', name='TÜRK DÜNYASI', line2='GÜNDEMİ', dom='gundemi.org', title='Türk Dünyası Gündemi',
         em=em_turkdunyasi, frm='#22a6d4', to='#075a7a', ink='#0a6b8f'),
    dict(slug='dunya', base='dunya-gundemi', name='DÜNYA', line2='GÜNDEMİ', dom='world.fix.tc', title='Dünya Gündemi', em=em_world,
         frm='#1b7a8c', to='#0a3340', ink='#0f4c5c'),
]

def wordmark(r, dark=False):
    s1 = CAP1 / cap_height('bc-xb')
    d1, w1, b1 = text_path(r['name'], 'bc-xb', s1, x=TX, y=B1, tracking=0.005)
    s2 = CAP2 / cap_height('bc-b')
    d2, w2, b2 = text_path(r['line2'], 'bc-b', s2, x=TX, y=B2, tracking=0.06)
    sd = CAPD / cap_height('bsc-sb')
    dd0, wd, _ = text_path(r['dom'], 'bsc-sb', sd, x=0, y=0, tracking=0.02)
    gap = 18; minrule = 72
    colw = max(b1[2] - TX, w2 + gap + minrule + gap + wd)
    xd = TX + colw - wd
    dd, _, _ = text_path(r['dom'], 'bsc-sb', sd, x=xd, y=B2, tracking=0.02)
    rx0 = TX + w2 + gap; rx1 = xd - gap
    ink = '#ffffff' if dark else r['ink']
    red = RED_DARK if dark else RED
    sub = 'rgba(255,255,255,.7)' if dark else '#5b6573'
    rule = 'rgba(255,255,255,.45)' if dark else r['ink']
    out = (f'<path d="{d1}" fill="{ink}"/>' f'<path d="{d2}" fill="{red}"/>'
           f'<rect x="{rx0:.1f}" y="{B2 - CAP2/2 - 2:.1f}" width="{rx1 - rx0:.1f}" height="4" rx="2" fill="{rule}" opacity="{1 if dark else .35}"/>'
           f'<path d="{dd}" fill="{sub}"/>')
    return out, TX + colw

def build(r):
    import cairosvg
    from PIL import Image
    slug, base = r['slug'], r['base']
    d = os.path.join(OUT, slug); dep = os.path.join(d, 'deploy'); os.makedirs(dep, exist_ok=True)
    def uniq(svg, tag):
        for gid in ('sunT', 'glW'):
            svg = svg.replace(f'id="{gid}"', f'id="{gid}{tag}"').replace(f'url(#{gid})', f'url(#{gid}{tag})')
        return svg
    for dark in (False, True):
        wm, wtot = wordmark(r, dark)
        pad = 10; Wv = wtot + pad; Hv = 300 + 2 * pad
        tag = ('d' if dark else 'l') + slug
        em = uniq(emblem_group(r, tag, outline=dark), tag)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {Wv + pad:.1f} {Hv}" width="{(Wv + pad):.0f}" height="{Hv}">'
               f'<title>{r["title"]}</title>{em}{wm}</svg>')
        dn = base + ('-dark' if dark else '')
        write(f'{d}/{dn}-logo.svg', svg); write(f'{dep}/{dn}.svg', svg)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=f'{dep}/{dn}.png', output_height=Hv)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=f'{d}/{dn}@64.png', output_height=64)
    tag = 'i' + slug
    em = uniq(emblem_group(r, tag), tag)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-26 -19 352 352" width="512" height="512"><title>{r["title"]}</title>{em}</svg>')
    write(f'{dep}/{base}-icon.svg', svg)
    for sz in (512, 192, 48, 32, 16):
        cairosvg.svg2png(bytestring=svg.encode(), write_to=f'{dep}/{base}-icon-{sz}.png', output_width=sz, output_height=sz)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f'{dep}/{base}-apple-touch-icon.png', output_width=180, output_height=180)
    Image.open(f'{dep}/{base}-icon-48.png').save(f'{dep}/{base}-favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

if __name__ == '__main__':
    for r in SITES:
        build(r)
