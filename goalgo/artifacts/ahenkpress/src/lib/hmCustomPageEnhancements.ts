import { useEffect, type RefObject } from "react";
import { apiUrl } from "@/lib/apiBase";

const FA4_HREF = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
const FA6_HREF = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";

/** SPA içinde :root / body kurallarını yalnızca özel sayfa köküne yönlendir (geniş seçici listesi çakışma yapar). */
function scopeEmbeddedPageCss(css: string, pageRoot: string): string {
  return css
    .replace(/:root\s*\{/g, `${pageRoot} {`)
    .replace(/(?<![-\w.])html(?=\s*[{,])/g, pageRoot)
    .replace(/(?<![-\w.])body(?=\s*[{,])/g, pageRoot);
}

function pageCssRootFromElement(root: HTMLElement): string {
  if (root.classList.contains("hm-custom-page-body--corporate")) return ".hm-custom-page-body--corporate";
  if (root.classList.contains("hm-custom-page-body")) return ".hm-custom-page-body";
  return ".hm-custom-page-body--corporate, .hm-custom-page-body";
}

function ensureFontAwesomeStylesheets(root: HTMLElement): void {
  if (typeof document === "undefined") return;
  const html = root.innerHTML;
  const need6 = /\bfa-(?:solid|regular|brands)\b/i.test(html);
  const need4 = !need6 && (/\bfa\s+fa-/i.test(html) || /\bclass="[^"]*\bfa\b/i.test(html));

  const add = (href: string, key: string) => {
    if (document.querySelector(`link[data-hm-font-awesome="${key}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-hm-font-awesome", key);
    document.head.appendChild(link);
  };

  if (need6) add(FA6_HREF, "6");
  if (need4) add(FA4_HREF, "4");
}

/** dangerouslySetInnerHTML ile gömülen <style>/<link> etiketlerini head'e taşır (SPA'da CSS'in uygulanması için). */
function injectEmbeddedPageAssets(root: HTMLElement): () => void {
  if (typeof document === "undefined") return () => {};

  const injected: HTMLElement[] = [];
  const seen = new Set<string>();

  root.querySelectorAll('link[rel="stylesheet"][href]').forEach((node) => {
    const href = (node.getAttribute("href") ?? "").trim();
    if (!href || seen.has(href)) {
      node.remove();
      return;
    }
    seen.add(href);
    if (document.querySelector(`link[rel="stylesheet"][href="${href.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`)) {
      node.remove();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-hm-page-asset", "1");
    document.head.appendChild(link);
    injected.push(link);
    node.remove();
  });

  const pageRoot = pageCssRootFromElement(root);

  root.querySelectorAll("style").forEach((node, index) => {
    const css = node.textContent ?? "";
    if (!css.trim()) {
      node.remove();
      return;
    }
    const style = document.createElement("style");
    style.textContent = scopeEmbeddedPageCss(css, pageRoot);
    style.setAttribute("data-hm-page-asset", "1");
    style.setAttribute("data-hm-page-slug", root.getAttribute("data-hm-page-slug") ?? `page-${index}`);
    document.head.appendChild(style);
    injected.push(style);
    node.remove();
  });

  return () => {
    injected.forEach((el) => el.remove());
  };
}

function fieldValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el instanceof HTMLSelectElement) return el.value.trim();
  return el.value.trim();
}

function extractContactFields(root: HTMLElement, pageTitle: string) {
  const lines: string[] = [];
  let name = "";
  let email = "";
  let phone = "";
  let subject = pageTitle;
  let message = "";

  root.querySelectorAll(".fg").forEach((fg) => {
    const label = (fg.querySelector("label")?.textContent ?? "").trim();
    const control = fg.querySelector("input, select, textarea") as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;
    if (!control) return;
    const value = fieldValue(control);
    const labelLower = label.toLowerCase();
    if (!name && (labelLower.includes("ad soyad") || labelLower === "ad" || labelLower.includes("isim"))) {
      name = value;
      return;
    }
    if (!email && (control.type === "email" || labelLower.includes("e-posta") || labelLower.includes("eposta"))) {
      email = value;
      return;
    }
    if (!phone && (control.type === "tel" || labelLower.includes("telefon") || labelLower.includes("gsm"))) {
      phone = value;
      return;
    }
    if (control.tagName === "TEXTAREA" && !message) {
      message = value;
      return;
    }
    if (control.tagName === "SELECT" && labelLower.includes("başvuru")) {
      subject = `${pageTitle} — ${value}`;
    }
    if (label && value) lines.push(`${label}: ${value}`);
  });

  if (!name) {
    const firstText = root.querySelector<HTMLInputElement>('input[type="text"]');
    if (firstText?.value.trim()) name = firstText.value.trim();
  }
  if (!email) email = root.querySelector<HTMLInputElement>('input[type="email"]')?.value.trim() ?? "";
  if (!phone) phone = root.querySelector<HTMLInputElement>('input[type="tel"]')?.value.trim() ?? "";
  if (!message) message = root.querySelector<HTMLTextAreaElement>("textarea")?.value.trim() ?? "";

  const extra = lines.filter((line) => !message.includes(line.split(":")[0] ?? ""));
  if (extra.length) {
    message = message ? `${message}\n\n${extra.join("\n")}` : extra.join("\n");
  }
  if (!message.trim()) message = `${pageTitle} formu gönderildi.`;

  return { name, email, phone, subject, message };
}

async function postSiteContact(
  fields: ReturnType<typeof extractContactFields>,
  site: { id: number; slug: string },
  pageSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(apiUrl("/api/site/contact"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      subject: fields.subject,
      message: fields.message,
      siteId: site.id,
      hmSiteSlug: site.slug,
      pageSource: `hm/${site.slug}/${pageSlug}`.slice(0, 80),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? "Gönderilemedi" };
  return { ok: true };
}

function wireContactBlock(
  root: HTMLElement,
  block: HTMLElement,
  site: { id: number; slug: string },
  pageSlug: string,
  pageTitle: string,
): () => void {
  const submit = async (event?: Event) => {
    event?.preventDefault();
    const fields = extractContactFields(block, pageTitle);
    if (!fields.name || !fields.email || !fields.message) {
      window.alert("Lütfen ad soyad, e-posta ve mesaj alanlarını doldurun.");
      return;
    }
    const buttons = block.querySelectorAll("button, input[type='submit']");
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = true;
    });
    try {
      const result = await postSiteContact(fields, site, pageSlug);
      if (result.ok) {
        window.alert("Mesajınız iletildi. En kısa sürede size dönüş yapılacaktır.");
        block.querySelectorAll("input, textarea").forEach((el) => {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = "";
        });
        block.querySelectorAll("select").forEach((el) => {
          if (el instanceof HTMLSelectElement && el.options.length) el.selectedIndex = 0;
        });
      } else {
        window.alert(result.error ?? "Gönderilemedi");
      }
    } catch {
      window.alert("Bağlantı hatası");
    } finally {
      buttons.forEach((btn) => {
        (btn as HTMLButtonElement).disabled = false;
      });
    }
  };

  const cleanups: Array<() => void> = [];
  block.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", submit);
    cleanups.push(() => form.removeEventListener("submit", submit));
  });

  block.querySelectorAll(".fg-submit, button[type='submit']").forEach((btn) => {
    if (btn.closest("form")) return;
    btn.setAttribute("type", "button");
    btn.addEventListener("click", submit);
    cleanups.push(() => btn.removeEventListener("click", submit));
  });

  if (!block.querySelector("form") && !block.querySelector(".fg-submit, button[type='submit']")) {
    return () => {};
  }
  return () => cleanups.forEach((fn) => fn());
}

export function useHmCustomPageEnhancements(
  containerRef: RefObject<HTMLElement | null>,
  site: { id: number; slug: string },
  pageSlug: string,
  pageTitle: string,
  htmlKey: string,
): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    ensureFontAwesomeStylesheets(root);
    root.setAttribute("data-hm-page-slug", pageSlug);
    const removeAssets = injectEmbeddedPageAssets(root);

    const cleanups: Array<() => void> = [removeAssets];
    const wired = new Set<HTMLElement>();
    root.querySelectorAll("form").forEach((form) => {
      if (wired.has(form)) return;
      wired.add(form);
      cleanups.push(wireContactBlock(root, form, site, pageSlug, pageTitle));
    });
    root.querySelectorAll(".basvuru-box, .basvuru-body, [id='basvuru']").forEach((block) => {
      if (!(block instanceof HTMLElement) || wired.has(block)) return;
      wired.add(block);
      cleanups.push(wireContactBlock(root, block, site, pageSlug, pageTitle));
    });

    if (root.querySelector(".ms-portal .ms-tab-btn")) {
      const tabButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".ms-portal .ms-tab-btn"));
      const tabContents = Array.from(root.querySelectorAll<HTMLElement>(".ms-portal .ms-tab-content"));
      const activateTab = (btn: HTMLButtonElement, tabId: string | null) => {
        root.querySelectorAll(".ms-portal .ms-tab-content").forEach((el) => el.classList.remove("active"));
        root.querySelectorAll(".ms-portal .ms-tab-btn").forEach((el) => el.classList.remove("active"));
        if (tabId) root.querySelector(`#${CSS.escape(tabId)}`)?.classList.add("active");
        btn.classList.add("active");
        const nav = root.querySelector(".ms-portal .ms-tabs-nav");
        if (nav instanceof HTMLElement) {
          window.scrollTo({ top: nav.offsetTop - 1, behavior: "smooth" });
        }
      };
      const tabHandler = (event: Event) => {
        const btn = event.currentTarget;
        if (!(btn instanceof HTMLButtonElement)) return;
        event.preventDefault();
        const tabId = btn.getAttribute("data-tab")?.trim() || null;
        if (tabId) {
          activateTab(btn, tabId);
          return;
        }
        const onclick = btn.getAttribute("onclick") ?? "";
        const match = onclick.match(/msOpenTab\s*\(\s*event\s*,\s*['"]([^'"]+)['"]\s*\)/i);
        if (match?.[1]) {
          activateTab(btn, match[1]);
          return;
        }
        const idx = tabButtons.indexOf(btn);
        if (idx >= 0 && tabContents[idx]) {
          tabContents.forEach((el) => el.classList.remove("active"));
          tabButtons.forEach((el) => el.classList.remove("active"));
          tabContents[idx]?.classList.add("active");
          btn.classList.add("active");
        }
      };
      tabButtons.forEach((btn, idx) => {
        if (!btn.getAttribute("data-tab") && tabContents[idx]?.id) {
          btn.setAttribute("data-tab", tabContents[idx].id);
        }
        btn.setAttribute("type", "button");
        btn.addEventListener("click", tabHandler);
        cleanups.push(() => btn.removeEventListener("click", tabHandler));
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [containerRef, htmlKey, pageSlug, pageTitle, site.id, site.slug]);
}
