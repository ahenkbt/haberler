/**
 * tukav.org iletişim kartı goalgo.org STK kaydını okur.
 * E-posta tukav06@gmail.com, telefon 0541 3136245.
 * Bu kenar, tukav.org /api/stk yanıtında yalnızca o vakfın iletişimini değiştirir.
 */

export const TUKAV_CONTACT_EMAIL = "bilgi@tukav.org";
export const TUKAV_CONTACT_PHONE = "0532 229 1892";
const OLD_EMAIL = "tukav06@gmail.com";
const OFFICE_HOURS = "Pazartesi – Cuma: 09:00 – 18:00";

const TUKAV_HOSTS = new Set(["tukav.org", "www.tukav.org"]);
const TUKAV_SLUGS = new Set(["turkatav", "turk-kulturunu-arastirma-ve-tanitma-vakfi"]);

function hostOf(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .split(":")[0];
}

function digits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function isOldMobile(raw) {
  const d = digits(raw);
  return d === "05413136245" || d === "5413136245" || d === "905413136245";
}

function patchText(value) {
  if (typeof value !== "string" || !value) return value;
  return value
    .split(OLD_EMAIL)
    .join(TUKAV_CONTACT_EMAIL)
    .split("0541 3136245")
    .join(TUKAV_CONTACT_PHONE)
    .split("0541 313 62 45")
    .join(TUKAV_CONTACT_PHONE)
    .split("0541 313 6245")
    .join(TUKAV_CONTACT_PHONE);
}

function isTukavOrg(org) {
  if (!org || typeof org !== "object") return false;
  const email = String(org.email || "").trim().toLowerCase();
  const domain = hostOf(org.customDomain).replace(/^www\./, "");
  const slug = String(org.slug || "").trim().toLowerCase();
  return email === OLD_EMAIL || domain === "tukav.org" || TUKAV_SLUGS.has(slug);
}

function walkStrings(value, skipKey) {
  if (typeof value === "string") return patchText(value);
  if (Array.isArray(value)) return value.map((item) => walkStrings(item, skipKey));
  if (!value || typeof value !== "object") return value;
  const next = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = key === skipKey ? child : walkStrings(child, skipKey);
  }
  return next;
}

export function patchTukavOrganization(org) {
  if (!isTukavOrg(org)) return org;
  const hours = String(org.workingHours || "").trim().toLowerCase();
  const next = walkStrings(org, "workingHours");
  next.email = TUKAV_CONTACT_EMAIL;
  if (isOldMobile(org.phone)) next.phone = TUKAV_CONTACT_PHONE;
  if (isOldMobile(org.whatsapp)) next.whatsapp = TUKAV_CONTACT_PHONE;
  if (hours === OLD_EMAIL || hours === TUKAV_CONTACT_EMAIL) next.workingHours = OFFICE_HOURS;
  return next;
}

export function patchTukavContactPayload(data) {
  if (!data || typeof data !== "object") return data;
  const next = { ...data };
  if (next.organization && typeof next.organization === "object") {
    next.organization = patchTukavOrganization(next.organization);
  }
  if (Array.isArray(next.organizations)) {
    next.organizations = next.organizations.map((org) => patchTukavOrganization(org));
  }
  return next;
}

export async function handleTukavContactEdge(request) {
  const url = new URL(request.url);
  const host = hostOf(url.hostname);
  if (!TUKAV_HOSTS.has(host)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!url.pathname.startsWith("/api/stk")) return null;

  const upstream = new URL(url.pathname + url.search, "https://goalgo.org");
  const res = await fetch(upstream, {
    method: request.method,
    headers: { accept: "application/json" },
    redirect: "follow",
  });
  const type = res.headers.get("content-type") || "";
  if (!type.includes("json")) return res;
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return new Response(text, { status: res.status, headers: res.headers });
  }
  const headers = new Headers(res.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "public, max-age=30");
  headers.set("x-yekpare-frontend", "tukav-contact-edge");
  headers.delete("content-length");
  const body = request.method === "HEAD" ? null : JSON.stringify(patchTukavContactPayload(data));
  return new Response(body, { status: res.status, headers });
}
