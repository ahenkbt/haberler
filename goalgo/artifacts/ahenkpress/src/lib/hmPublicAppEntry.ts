import { isKnownHmCustomHost } from "@/lib/hmPortalHosts";

/** ASG / vatanhaber vb. özel alanda portal+editör+turizm yığını yüklenmesin. */
export function shouldUseHmPublicApp(host: string): boolean {
  return isKnownHmCustomHost(host);
}
