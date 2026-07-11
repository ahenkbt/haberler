export type ShareTarget = {
  id: string;
  label: string;
  color: string;
  href?: string;
  action?: "copy" | "embed" | "native";
};

export function buildShareUrl(title: string, pageUrl: string): string {
  return pageUrl;
}

export function whatsappShareUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function xShareUrl(title: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
}

export function telegramShareUrl(title: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
}

export function emailShareUrl(title: string, url: string): string {
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
}

export function buildEmbedCode(watchUrl: string, title: string, showControls = true): string {
  const src = watchUrl.replace(/^http:/, "https:");
  return `<iframe width="560" height="315" src="${src}" title="${title.replace(/"/g, "&quot;")}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"${showControls ? "" : ' style="pointer-events:none"'} allowfullscreen></iframe>`;
}

export function shareTargets(title: string, url: string): ShareTarget[] {
  return [
    { id: "embed", label: "Yerleştir", color: "#0f0f0f", action: "embed" },
    { id: "whatsapp", label: "WhatsApp", color: "#25D366", href: whatsappShareUrl(title, url) },
    { id: "facebook", label: "Facebook", color: "#1877F2", href: facebookShareUrl(url) },
    { id: "x", label: "X", color: "#0f0f0f", href: xShareUrl(title, url) },
    { id: "telegram", label: "Telegram", color: "#0088cc", href: telegramShareUrl(title, url) },
    { id: "email", label: "E-posta", color: "#71717a", href: emailShareUrl(title, url) },
    { id: "copy", label: "Kopyala", color: "#3f3f46", action: "copy" },
  ];
}
