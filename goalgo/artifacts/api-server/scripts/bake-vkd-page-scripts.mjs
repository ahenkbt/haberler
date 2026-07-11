/**
 * VKD tema sayfaları: inline DATA script'lerini statik HTML'e çevirir;
 * :root/body CSS'ini sayfa kök sınıfına scope eder.
 */

const DIRECTORY_OUT_IDS = ["td-out", "dsg-out", "ds-out"];
const DIRECTORY_COUNT_IDS = ["td-count", "dsg-count", "ds-count"];

function createMockElement() {
  let _text = "";
  return {
    innerHTML: "",
    get textContent() {
      return _text;
    },
    set textContent(value) {
      _text = String(value ?? "");
    },
    style: {},
    classList: {
      add() {},
      remove() {},
    },
  };
}

/** SPA sanitizer script'leri sildiği için DATA tablolarını build zamanında render eder. */
export function bakeVkdDirectoryPageScripts(html) {
  if (!html || !/<script/i.test(html) || !/\bDATA\s*=/.test(html)) return html;

  const elements = new Map();
  for (const id of [...DIRECTORY_OUT_IDS, ...DIRECTORY_COUNT_IDS]) {
    elements.set(id, createMockElement());
  }

  const mockDocument = {
    getElementById(id) {
      return elements.get(id) ?? null;
    },
    querySelectorAll() {
      return { forEach() {} };
    },
    addEventListener() {},
  };

  for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/gi)) {
    if (!/\bDATA\s*=/.test(code)) continue;
    try {
      // eslint-disable-next-line no-new-func
      new Function("document", "window", code)(mockDocument, {});
    } catch (err) {
      console.warn("[bake-vkd] directory script:", err instanceof Error ? err.message : err);
    }
  }

  let out = html;
  for (const id of DIRECTORY_OUT_IDS) {
    const baked = elements.get(id)?.innerHTML?.trim();
    if (!baked) continue;
    out = out.replace(new RegExp(`<div id="${id}"[^>]*>\\s*</div>`, "i"), `<div id="${id}">${baked}</div>`);
  }
  for (const id of DIRECTORY_COUNT_IDS) {
    const count = elements.get(id)?.textContent?.trim();
    if (!count) continue;
    out = out.replace(
      new RegExp(`(<[^>]+id="${id}"[^>]*>)([^<]*)(</[^>]+>)`, "i"),
      `$1${count}$3`,
    );
  }

  return out.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function scopeCssBlock(css, rootSelectors) {
  const roots = Array.isArray(rootSelectors) ? rootSelectors : [rootSelectors];
  const rootList = roots.join(", ");
  return css
    .replace(/:root\s*\{/g, `${rootList} {`)
    .replace(/(?<![-\w.])html(?=\s*[{,])/g, rootList)
    .replace(/(?<![-\w.])body(?=\s*[{,])/g, rootList);
}

/**
 * :root/body kurallarını içerik köküne taşır; isteğe bağlı dış sarmalayıcı ekler.
 */
export function scopeVkdImportedPageHtml(html, options = {}) {
  const wrapperClass = options.wrapperClass ?? "hm-vkd-page-root";
  const cssRoots = options.cssRoots ?? [`.${wrapperClass}`, ".hm-custom-page-body"];
  let out = bakeVkdDirectoryPageScripts(String(html ?? ""));

  const hasWrapper =
    out.includes(`class="${wrapperClass}"`) ||
    out.includes(`class='${wrapperClass}'`) ||
    cssRoots.some((sel) => sel.startsWith(".") && out.includes(`class="${sel.slice(1)}"`));

  if (!hasWrapper && options.wrap !== false) {
    out = `<div class="${wrapperClass}">\n${out}\n</div>`;
  }

  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs, css) => {
    return `<style${attrs}>${scopeCssBlock(css, cssRoots)}</style>`;
  });

  return out;
}
