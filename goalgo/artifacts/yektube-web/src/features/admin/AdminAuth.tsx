import { createContext, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminLogin, adminLogout, fetchAdminStatus, hmEditorLogin, hmEditorYektubeAdminSession } from "@/lib/adminApi";
import { listenForHmEditorJwtFromParent, readHmEditorEmail, readHmEditorJwt, readHmEditorSiteSlug, writeHmEditorJwt, writeHmEditorSession } from "@/lib/hmEditorBridge";
import { isAdminEmbedLight } from "./adminEmbedTheme";

type AdminAuthCtx = {
  ready: boolean;
  authed: boolean;
  fullAdmin: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AdminAuthCtx | null>(null);

async function bootstrapHmEditorYektubeSession(token: string): Promise<void> {
  await hmEditorYektubeAdminSession(token);
}

function tryBootstrapFromToken(
  token: string,
  qc: ReturnType<typeof useQueryClient>,
  attemptedRef: MutableRefObject<boolean>,
): void {
  if (attemptedRef.current) return;
  attemptedRef.current = true;
  void bootstrapHmEditorYektubeSession(token)
    .then(() => qc.invalidateQueries({ queryKey: ["admin-status"] }))
    .catch(() => {
      attemptedRef.current = false;
    });
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const embedLight = isAdminEmbedLight();
  const autoBootstrapAttempted = useRef(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: fetchAdminStatus,
    retry: false,
  });

  useEffect(() => {
    if (!embedLight || data?.panelBootstrap) return;
    const token = readHmEditorJwt();
    if (token) tryBootstrapFromToken(token, qc, autoBootstrapAttempted);
  }, [embedLight, data?.panelBootstrap, qc]);

  useEffect(() => {
    if (!embedLight || data?.panelBootstrap) return;
    return listenForHmEditorJwtFromParent((token) => {
      writeHmEditorJwt(token);
      tryBootstrapFromToken(token, qc, autoBootstrapAttempted);
      void qc.invalidateQueries({ queryKey: ["admin-status"] });
    });
  }, [embedLight, data?.panelBootstrap, qc]);

  const login = async (username: string, password: string) => {
    if (embedLight) {
      const slug = readHmEditorSiteSlug();
      const email = username.trim().toLowerCase();
      if (!slug || !email || !password) {
        throw new Error("Site, e-posta ve şifre gerekli.");
      }
      const session = await hmEditorLogin(slug, email, password, { yektubeStudio: true });
      if (!session.panelBootstrap) {
        await bootstrapHmEditorYektubeSession(session.token);
      }
      writeHmEditorSession(session.token, session.site, session.editor);
    } else {
      await adminLogin(username, password);
    }
    await qc.invalidateQueries({ queryKey: ["admin-status"] });
  };

  const logout = async () => {
    await adminLogout();
    await qc.invalidateQueries({ queryKey: ["admin-status"] });
  };

  return (
    <Ctx.Provider
      value={{
        ready: !isLoading,
        authed: Boolean(data?.panelBootstrap),
        fullAdmin: Boolean(data?.panelFullAdmin),
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth outside provider");
  return ctx;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { ready, authed, login } = useAdminAuth();
  const [user, setUser] = useState(() => readHmEditorEmail() ?? "");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const embedLight = isAdminEmbedLight();

  if (!ready) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${embedLight ? "bg-white text-zinc-900" : "bg-zinc-950 text-white"}`}
        data-yektube-admin-embed={embedLight ? "true" : undefined}
      >
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center px-4 ${embedLight ? "bg-white" : "bg-zinc-950"}`}
        data-yektube-admin-embed={embedLight ? "true" : undefined}
      >
        <form
          className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${
            embedLight ? "border-slate-200 bg-white" : "border-zinc-800 bg-zinc-900"
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setErr("");
            void login(user, pass)
              .catch((ex: Error) => setErr(ex.message || "Giriş başarısız"))
              .finally(() => setLoading(false));
          }}
        >
          <h1 className={`text-xl font-bold ${embedLight ? "text-zinc-900" : "text-white"}`}>Yektube Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {embedLight
              ? "Editör paneli e-posta ve şifrenizle giriş yapın."
              : "Yekpare yönetici oturumu gerekir."}
          </p>
          <label className="mt-4 block text-xs font-medium text-zinc-500">
            {embedLight ? "E-posta" : "Kullanıcı adı"}
            <input
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                embedLight
                  ? "border-slate-300 bg-white text-zinc-900"
                  : "border-zinc-700 bg-zinc-950 text-white"
              }`}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              type={embedLight ? "email" : "text"}
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-zinc-500">
            Şifre
            <input
              type="password"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                embedLight
                  ? "border-slate-300 bg-white text-zinc-900"
                  : "border-zinc-700 bg-zinc-950 text-white"
              }`}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {err ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? "Giriş…" : "Giriş yap"}
          </button>
          {!embedLight ? (
            <a href="/" className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-700">
              ← Yektube ana sayfa
            </a>
          ) : null}
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
