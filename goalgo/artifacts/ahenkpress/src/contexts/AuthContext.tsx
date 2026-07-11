import { createContext, useContext, useState, ReactNode } from "react";
import { apiUrl, ADMIN_AUTH_STORAGE_KEY } from "@/lib/apiBase";
import { invalidateAdminRouteVerificationCache } from "@/lib/adminRouteAuthCache";

export { ADMIN_AUTH_STORAGE_KEY };

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  markPanelAuthenticated: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => false,
  markPanelAuthenticated: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "1";
  });

  const markPanelAuthenticated = () => {
    localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "1");
    setIsAuthenticated(true);
  };

  const login = (): boolean => {
    return false;
  };

  const logout = () => {
    void fetch(apiUrl("/api/members/logout"), { method: "POST", credentials: "include" }).catch(() => {});
    invalidateAdminRouteVerificationCache();
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, markPanelAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
