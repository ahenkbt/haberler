import { isEmbedMode } from "@/lib/runtimeConfig";

/** Yektube Studio — varsayılan açık tema (Yekpare admin ile uyumlu) */
export function isAdminEmbedLight(): boolean {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("theme") === "dark") return false;
  }
  return true;
}

/** HM editör iframe — embed bayrağı ayrı tutulur */
export function isAdminHmEmbed(): boolean {
  return isEmbedMode();
}
