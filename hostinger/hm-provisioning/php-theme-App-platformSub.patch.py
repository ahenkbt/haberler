import sys
src=open(sys.argv[1]).read()
old="""        if ($row === null) {
            $slug = getenv('SITE_SLUG');
            if (is_string($slug) && $slug !== '') {"""
new="""        // 2026-10-08 provisioning: *.gundemi.org / *.fix.tc have wildcard DNS (panel slugs serve at once); an
        // unregistered or deleted platform subdomain answers 404 instead of falling back to SITE_SLUG.
        $platformSub = preg_match('/^(?!www\\.)[a-z0-9-]+\\.(gundemi\\.org|fix\\.tc)$/', strtolower((string) preg_replace('/:\\d+$/', '', $lookupHost))) === 1;
        if ($row === null && !$platformSub) {
            $slug = getenv('SITE_SLUG');
            if (is_string($slug) && $slug !== '') {"""
assert src.count(old)==1, src.count(old)
open(sys.argv[2],"w").write(src.replace(old,new))
