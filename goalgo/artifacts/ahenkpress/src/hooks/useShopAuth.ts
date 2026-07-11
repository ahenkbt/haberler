import { useState, useEffect, createContext, useContext } from "react";

export interface ShopUser {
  id: number; email: string; name: string; phone?: string;
  address?: string; city?: string; district?: string; postal?: string;
}

const TOKEN_KEY = "shop_token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function shopFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json", ...(options?.headers ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}

export function useShopAuth() {
  const [user, setUser] = useState<ShopUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    shopFetch("/api/shop/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setUser(data); else clearToken(); })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await shopFetch("/api/shop/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Giriş başarısız");
    setToken(data.token);
    setUser(data.user);
    return data.user as ShopUser;
  };

  const register = async (fields: { email: string; password: string; name: string; phone?: string; address?: string; city?: string; district?: string; postal?: string }) => {
    const r = await shopFetch("/api/shop/auth/register", {
      method: "POST", body: JSON.stringify(fields),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Kayıt başarısız");
    setToken(data.token);
    setUser(data.user);
    return data.user as ShopUser;
  };

  const logout = () => { clearToken(); setUser(null); };

  return { user, loading, login, register, logout };
}
