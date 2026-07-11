import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const TOKEN_KEY = "yekpare_customer_token";
const TOKEN_KEY_LEGACY = "goalgo_customer_token";
const API = "/api";

function readStoredCustomerToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  const cur = localStorage.getItem(TOKEN_KEY);
  if (cur) return cur;
  const leg = localStorage.getItem(TOKEN_KEY_LEGACY);
  if (leg) {
    localStorage.setItem(TOKEN_KEY, leg);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
    return leg;
  }
  return null;
}

export interface CustomerUser {
  id: number;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  postal?: string;
}

interface AuthState {
  user: CustomerUser | null;
  token: string | null;
  loading: boolean;
  favoriteIds: number[];
}

interface CustomerAuthCtx extends AuthState {
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: RegisterData) => Promise<{ error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<CustomerUser> & { currentPassword?: string; newPassword?: string }) => Promise<{ error?: string }>;
  toggleFavorite: (vendorId: number) => Promise<void>;
  isFavorite: (vendorId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  postal?: string;
}

const CustomerAuthContext = createContext<CustomerAuthCtx | null>(null);

function optStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = typeof v === "string" ? v : String(v);
  const t = s.trim();
  return t === "" ? undefined : t;
}

/** API bazen `name: null` döner; tüm ekranlarda string bekleniyor. */
function normalizeShopUser(raw: unknown): CustomerUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "number" && Number.isFinite(o.id) ? o.id : Number(o.id);
  if (!Number.isFinite(id)) return null;
  const email = typeof o.email === "string" ? o.email.trim() : "";
  if (!email) return null;
  const nameRaw = o.name;
  const name =
    typeof nameRaw === "string"
      ? nameRaw.trim()
      : nameRaw != null && String(nameRaw).trim() !== ""
        ? String(nameRaw).trim()
        : "";
  return {
    id,
    email,
    name,
    phone: optStr(o.phone),
    address: optStr(o.address),
    city: optStr(o.city),
    district: optStr(o.district),
    postal: optStr(o.postal),
  };
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(() => readStoredCustomerToken());
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  function authHeaders(tk?: string | null): HeadersInit {
    const t = tk ?? token;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }

  const refreshFavorites = useCallback(async (tk?: string | null) => {
    const t = tk ?? token;
    if (!t) { setFavoriteIds([]); return; }
    try {
      const res = await fetch(`${API}/customer/favorites/ids`, { headers: authHeaders(t) });
      if (res.ok) setFavoriteIds(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  /* Bootstrap: verify stored token */
  useEffect(() => {
    const storedToken = readStoredCustomerToken();
    if (!storedToken) { setLoading(false); return; }
    fetch(`${API}/shop/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(async u => {
        const nu = normalizeShopUser(u);
        if (nu) { setUser(nu); setToken(storedToken); await refreshFavorites(storedToken); }
        else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_KEY_LEGACY);
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY_LEGACY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/shop/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Giriş başarısız" };
    const nu = normalizeShopUser(data.user);
    if (!nu) return { error: "Sunucu yanıtı geçersiz" };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
    setToken(data.token);
    setUser(nu);
    await refreshFavorites(data.token);
    return {};
  }

  async function register(regData: RegisterData) {
    const res = await fetch(`${API}/shop/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Kayıt başarısız" };
    const nu = normalizeShopUser(data.user);
    if (!nu) return { error: "Sunucu yanıtı geçersiz" };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
    setToken(data.token);
    setUser(nu);
    setFavoriteIds([]);
    return {};
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
    setToken(null);
    setUser(null);
    setFavoriteIds([]);
  }

  async function updateProfile(data: Partial<CustomerUser> & { currentPassword?: string; newPassword?: string }) {
    const res = await fetch(`${API}/shop/auth/me`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resp = await res.json();
    if (!res.ok) return { error: resp.error ?? "Güncelleme başarısız" };
    const nu = normalizeShopUser(resp);
    if (nu) setUser(nu);
    return {};
  }

  async function toggleFavorite(vendorId: number) {
    if (!token) return;
    const isFav = favoriteIds.includes(vendorId);
    if (isFav) {
      setFavoriteIds(prev => prev.filter(id => id !== vendorId));
      await fetch(`${API}/customer/favorites/${vendorId}`, { method: "DELETE", headers: authHeaders() });
    } else {
      setFavoriteIds(prev => [...prev, vendorId]);
      await fetch(`${API}/customer/favorites/${vendorId}`, { method: "POST", headers: authHeaders() });
    }
  }

  function isFavorite(vendorId: number) { return favoriteIds.includes(vendorId); }

  return (
    <CustomerAuthContext.Provider value={{ user, token, loading, favoriteIds, login, register, logout, updateProfile, toggleFavorite, isFavorite, refreshFavorites }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return ctx;
}
