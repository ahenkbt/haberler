type ProviderSessionLike = {
  id?: unknown;
  email?: unknown;
  token?: unknown;
  panelKind?: unknown;
  panelPath?: unknown;
};

export function getProviderSession(): ProviderSessionLike | null {
  try {
    return JSON.parse(localStorage.getItem("providerSession") || "null") as ProviderSessionLike | null;
  } catch {
    return null;
  }
}

export function providerAuthHeaders(session: ProviderSessionLike | null = getProviderSession()): Record<string, string> {
  if (!session) return {};
  const headers: Record<string, string> = {};
  const token = typeof session.token === "string" ? session.token.trim() : "";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (session.id != null) headers["x-vendor-id"] = String(session.id);
  if (session.email != null) headers["x-vendor-email"] = String(session.email);
  return headers;
}
