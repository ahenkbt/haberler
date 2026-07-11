import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMemberMe,
  memberLogin,
  memberLogout,
  memberRegister,
  syncGuestData,
  type SiteMember,
} from "@/lib/memberApi";
import { clearGuestDataAfterSync, exportGuestSyncPayload } from "@/lib/guestStorage";

type MemberAuthCtx = {
  ready: boolean;
  member: SiteMember | null;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<MemberAuthCtx | null>(null);

async function syncGuestIfNeeded(): Promise<void> {
  const payload = exportGuestSyncPayload();
  if (payload.subscriptions.length === 0 && payload.history.length === 0) return;
  await syncGuestData(payload);
  clearGuestDataAfterSync();
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: member = null, isLoading } = useQuery({
    queryKey: ["member-me"],
    queryFn: fetchMemberMe,
    retry: false,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["member-me"] });
    await qc.invalidateQueries({ queryKey: ["my-subs"] });
    await qc.invalidateQueries({ queryKey: ["watch-history"] });
    await qc.invalidateQueries({ queryKey: ["my-playlists"] });
    await qc.invalidateQueries({ queryKey: ["member-prefs"] });
  };

  const login = async (email: string, password: string) => {
    await memberLogin(email, password);
    await syncGuestIfNeeded();
    await invalidate();
  };

  const register = async (body: { firstName: string; lastName: string; email: string; password: string }) => {
    await memberRegister(body);
    await syncGuestIfNeeded();
    await invalidate();
  };

  const logout = async () => {
    await memberLogout();
    await invalidate();
  };

  return (
    <Ctx.Provider
      value={{
        ready: !isLoading,
        member,
        login,
        register,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMemberAuth outside provider");
  return ctx;
}
