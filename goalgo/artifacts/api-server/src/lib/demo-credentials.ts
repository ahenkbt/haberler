import crypto from "node:crypto";

/** Demo vendor/PBX seed — production'da kapalı (ENABLE_DEMO_SEED=1 ile açılabilir). */
export function isDemoSeedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_SEED === "1";
}

/** Sağlayıcı onayında geçici panel şifresi — prod'da rastgele; asla sabit "yekpare" değil. */
export function vendorApprovalTempPassword(): string {
  const fromEnv = String(process.env.VENDOR_APPROVAL_TEMP_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  return crypto.randomBytes(16).toString("base64url");
}

/** Geliver demo mağaza — yalnızca dev seed; prod'da null. */
export function geliverDemoPassword(): string | null {
  if (!isDemoSeedAllowed()) return null;
  const fromEnv = String(process.env.GELIVER_DEMO_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  return "GeliverDemo2026!";
}

/** Demo ulaşım işletmesi seed — dev varsayılan; prod seed'de rastgele veya env. */
export function transportDemoVendorPassword(): string {
  const fromEnv = String(process.env.TRANSPORT_DEMO_VENDOR_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return crypto.randomBytes(16).toString("base64url");
  }
  return "DemoIsletme2026!";
}

export function transportDemoCourierPassword(): string {
  const fromEnv = String(process.env.TRANSPORT_DEMO_COURIER_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return crypto.randomBytes(16).toString("base64url");
  }
  return "DemoKurye2026!";
}

/** PBX demo seed — dev'de varsayılan; prod seed'de rastgele. */
export function pbxDemoAgentPassword(): string {
  const fromEnv = String(process.env.PBX_DEMO_AGENT_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return crypto.randomBytes(16).toString("base64url");
  }
  return "agent123";
}
