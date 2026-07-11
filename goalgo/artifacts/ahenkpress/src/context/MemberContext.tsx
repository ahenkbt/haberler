import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API = "/api";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  createdAt?: string;
  accountType?: "individual" | "business";
  businessPremium?: boolean;
  businessPremiumExpiresAt?: string | null;
  /** GET /api/members/me — Seri İlan kota / premium özet */
  seriIlan?: {
    freeUnlimitedForIndividual: boolean;
    businessPremiumActive: boolean;
    canPostSeriIlan: boolean;
    activeCount?: number;
  };
}

interface MemberContextValue {
  member: Member | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  modalOpen: boolean;
  openModal: (tab?: "login" | "register") => void;
  closeModal: () => void;
  defaultTab: "login" | "register";
}

const MemberContext = createContext<MemberContextValue>({
  member: null, loading: false,
  refresh: async () => {}, logout: async () => {},
  modalOpen: false, openModal: () => {}, closeModal: () => {},
  defaultTab: "login",
});

export function MemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"login" | "register">("login");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/members/me`, { credentials: "include" });
      const d = await res.json();
      setMember(d.success && d.data ? d.data : null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/members/logout`, { method: "POST", credentials: "include" });
    setMember(null);
  }, []);

  const openModal = useCallback((tab: "login" | "register" = "login") => {
    setDefaultTab(tab);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <MemberContext.Provider value={{ member, loading, refresh, logout, modalOpen, openModal, closeModal, defaultTab }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  return useContext(MemberContext);
}
