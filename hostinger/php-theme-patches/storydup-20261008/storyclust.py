"""Near-duplicate story clustering (same story from different sources).

Turkish-aware normalisation, prefix-5 stems, TF-IDF cosine on title (+spot), key numbers
must agree, 48 h window, leader check against chaining. Pure python, no deps.
"""
import html, math, re
from collections import defaultdict

FOLD = str.maketrans({'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u'})
STOP = set('''ve ile bir bu su o da de ki mi mu mı mü icin gibi kadar daha cok en olan oldu olarak olan ama fakat ancak
veya ya hem ise diye sonra once yeni son dakika flas haber video galeri foto ozel canli guncel izle iste nasil neden ne
nedir kim hangi tum her ayni yine bile uzere karsi gore arasinda tarafindan icinde uzerine sekilde yer aldi geldi etti
edildi yapti yapildi verdi dedi acikladi duyurdu belirtti bildirdi soyledi oldugu olduklari olacak olmasi bugun yarin dun
the a an of to in on for'''.split())
WINDOW = 48 * 3600


def norm(s):
    s = html.unescape(s or '').replace('I', 'ı').replace('İ', 'i').lower().translate(FOLD)
    s = re.sub(r'(?<=\d)[.,](?=\d{3}\b)', '', s)        # 1.250 -> 1250
    s = re.sub(r'^\W*(son dakika|flas( haber)?|sicak gelisme|video|galeri|ozel haber|canli)\W+', ' ', s)
    return s


def tokens(s):
    out = []
    for t in re.findall(r'[a-z0-9]+', norm(s)):
        if t in STOP or len(t) < 2 and not t.isdigit():
            continue
        out.append(t if t.isdigit() else t[:5])
    return out


def numbers(s):
    return frozenset(t for t in re.findall(r'\d+', norm(s)) if not re.fullmatch(r'20\d\d', t))


NOT_NAMES = set('''bakan bakani son dakika flas cumhurbaskani baskan baskani turkiye turk milli ab abd sehit vali valisi
belediye buyuksehir genel mudurlugu mudur il ilce emniyet jandarma polis tsk msb ak chp mhp iyi dem parti partisi
yeni video galeri ozel canli'''.split())


def names(s):
    s = html.unescape(s or '')
    out = set()
    for w in re.findall(r"[A-ZÇĞİÖŞÜ][\wçğıöşüâîû]+", s):
        k = norm(w)
        k = re.sub(r"[^a-z0-9].*$", "", k)[:5]
        if len(k) >= 3 and k not in NOT_NAMES and k[:5] not in NOT_NAMES:
            out.add(k)
    return frozenset(out)


class Doc:
    __slots__ = ('key', 'ts', 'tt', 'st', 'nums', 'names', 'vt', 'vc', 'nt', 'nc', 'title')

    def __init__(self, key, ts, title, spot):
        self.key, self.ts, self.title = key, ts, title
        self.tt = tokens(title)
        self.st = tokens(spot)[:40]
        self.nums = numbers(title)
        self.names = names(title) if not title.isupper() else frozenset()


def _vec(toks, idf, w):
    v = defaultdict(float)
    for t in toks:
        v[t] += w * idf.get(t, 1.0)
    return v


def _cos(a, na, b, nb):
    if not na or not nb:
        return 0.0
    if len(a) > len(b):
        a, b = b, a
    return sum(x * b.get(t, 0.0) for t, x in a.items()) / (na * nb)


def build(docs):
    df = defaultdict(int)
    for d in docs:
        for t in set(d.tt) | set(d.st):
            df[t] += 1
    n = max(1, len(docs))
    idf = {t: math.log((n + 1) / (c + 0.5)) for t, c in df.items()}
    for d in docs:
        d.vt = _vec(d.tt, idf, 1.0)
        c = _vec(d.tt, idf, 1.0)
        for t, x in _vec(d.st, idf, 0.4).items():
            c[t] += x
        d.vc = c
        d.nt = math.sqrt(sum(x * x for x in d.vt.values()))
        d.nc = math.sqrt(sum(x * x for x in c.values()))
    return idf


def score(a, b):
    return _cos(a.vt, a.nt, b.vt, b.nt), _cos(a.vc, a.nc, b.vc, b.nc)



SURE, MAYBE, NO = 2, 1, 0


def classify(a, b):
    """SURE = same story by rule, MAYBE = ask AI, NO."""
    if abs(a.ts - b.ts) > WINDOW:
        return NO, 0.0
    st, sc = score(a, b)
    numc = bool(a.nums and b.nums and not (a.nums & b.nums))
    namec = bool(a.names and b.names and not (a.names & b.names))
    if numc or namec:
        return (MAYBE if st >= 0.6 else NO), sc
    if st >= 0.8 or (st >= 0.7 and sc >= 0.6):
        return SURE, sc
    if st >= 0.38 or (sc >= 0.42 and st >= 0.28):
        return MAYBE, sc
    return NO, sc


def candidates(docs, df_cap=400, top=5):
    """Yields (later, earlier, verdict, sc) for the best `top` candidates of each doc."""
    build(docs)
    docs = sorted(docs, key=lambda d: (d.ts, d.key))
    df = defaultdict(int)
    for d in docs:
        for t in set(d.tt):
            df[t] += 1
    index = defaultdict(list)
    out = []
    for d in docs:
        cand = defaultdict(int)
        for t in set(d.tt):
            if df[t] > df_cap:
                continue
            for o in index[t]:
                cand[o] += 1
        res = []
        for o, c in cand.items():
            if c < 2 or d.ts - o.ts > WINDOW:
                continue
            v, sc = classify(d, o)
            if v != NO:
                res.append((v, sc, o))
        res.sort(key=lambda x: (-x[0], -x[1]))
        for v, sc, o in res[:top]:
            out.append((d, o, v, sc))
        for t in set(d.tt):
            if df[t] <= df_cap:
                index[t].append(d)
    return docs, out


def cluster(docs, decide):
    """decide(d, o, verdict) -> bool (AI or rule) for MAYBE pairs. Returns key -> leader key."""
    docs, pairs = candidates(docs)
    by = defaultdict(list)
    for d, o, v, sc in pairs:
        by[d.key].append((d, o, v, sc))
    leader, members = {}, defaultdict(list)
    for d in docs:
        joined = None
        for _, o, v, sc in by.get(d.key, []):
            if v == SURE or decide(d, o):
                lk = leader[o.key]
                ld = members[lk][0]
                if ld is o or (abs(d.ts - ld.ts) <= WINDOW and (classify(d, ld)[0] == SURE or score(d, ld)[1] >= 0.35
                                                              or (classify(d, ld)[0] == MAYBE and decide(d, ld)))):
                    joined = lk
                    break
        lk = joined or d.key
        leader[d.key] = lk
        members[lk].append(d)
    return {k: lk for k, lk in leader.items() if len(members[lk]) > 1}
