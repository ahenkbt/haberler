import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiUrl } from "@/lib/apiBase";
import {
  verifyHmEditorSession,
  VERIFY_TIMEOUT_MS,
  type HmEditorSessionStatus,
} from "@/lib/hmEditorSessionVerify";
import {
  clearHmSession,
  readHmEditorBrief,
  readHmJwt,
  readHmSite,
  writeHmSession,
  type HmEditorBrief,
  type HmSiteBrief,
} from "@/lib/hmSession";
import {
  defaultNewsSiteLayoutPrefs,
  mergeNewsSiteLayoutForSave,
  parseNewsSiteLayoutFromJson,
  pickVitrinLayoutPatchForSave,
  type NewsSiteLayoutPrefs,
  type NewsSiteLayoutSaveOptions,
} from "@/lib/newsSiteLayout";
import type { HmSeoVerification } from "@/lib/pageSeo";
import { clearHmNestedMetaCache } from "@/lib/hmNestedMetaCache";
import { dispatchHmLayoutUpdated } from "@/lib/hmLayoutUpdatedEvent";

type HmEditorContextType = {
  token: string | null;
  site: HmSiteBrief | null;
  editor: HmEditorBrief | null;
  /** İlk `/me` doğrulaması veya yenileme durumu. */
  sessionStatus: HmEditorSessionStatus;
  /** Sunucudaki vitrin tercihleri; yoksa varsayılanlar kullanılır. */
  newsLayoutPrefs: NewsSiteLayoutPrefs;
  seoVerification: HmSeoVerification | null;
  setSession: (token: string, site: HmSiteBrief, editor: HmEditorBrief) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  saveNewsSiteLayout: (
    prefs: NewsSiteLayoutPrefs,
    opts?: NewsSiteLayoutSaveOptions,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  saveHomeModuleOrder: (patch: {
    hmNewsHomeModuleOrder?: string[];
    hmCorporateHomeModuleOrder?: string[];
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  saveSeoVerification: (seoVerification: HmSeoVerification | null) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const HmEditorContext = createContext<HmEditorContextType | null>(null);

export function HmEditorProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readHmJwt());
  const [site, setSite] = useState<HmSiteBrief | null>(() => readHmSite());
  const [editor, setEditor] = useState<HmEditorBrief | null>(() => readHmEditorBrief());
  const [sessionStatus, setSessionStatus] = useState<HmEditorSessionStatus>(() =>
    readHmJwt() ? "checking" : "idle",
  );
  const [newsLayoutPrefs, setNewsLayoutPrefs] = useState<NewsSiteLayoutPrefs>(() => ({
    ...defaultNewsSiteLayoutPrefs,
  }));
  const [seoVerification, setSeoVerification] = useState<HmSeoVerification | null>(null);

  const verifiedTokenRef = useRef<string | null>(null);
  const verifyInFlightRef = useRef<Promise<void> | null>(null);

  const denySession = useCallback(() => {
    verifiedTokenRef.current = null;
    clearHmSession({ silent: true });
    setToken(null);
    setSite(null);
    setEditor(null);
    setNewsLayoutPrefs({ ...defaultNewsSiteLayoutPrefs });
    setSeoVerification(null);
    setSessionStatus("denied");
  }, []);

  const verifySession = useCallback(async (opts?: { force?: boolean }) => {
    const t = readHmJwt();
    if (!t) {
      verifiedTokenRef.current = null;
      setSessionStatus("idle");
      setEditor(null);
      return;
    }

    if (!opts?.force && verifiedTokenRef.current === t) {
      setSessionStatus("ok");
      return;
    }

    if (verifyInFlightRef.current) {
      return verifyInFlightRef.current;
    }

    const run = async () => {
      const verifyFor = t;
      const alreadyAuthed = verifiedTokenRef.current === verifyFor;
      if (!alreadyAuthed) {
        setSessionStatus("checking");
      }
      const result = await verifyHmEditorSession(verifyFor);
      if (readHmJwt() !== verifyFor) return;
      if (result.status === "denied") {
        denySession();
        return;
      }
      if (result.status === "transient") {
        if (verifiedTokenRef.current === verifyFor) {
          setSessionStatus("ok");
        } else if (readHmEditorBrief() && readHmSite()) {
          setSessionStatus("transient");
        } else {
          denySession();
        }
        return;
      }
      const j = result.data;
      const nextSite = {
        id: j.site.id,
        slug: j.site.slug,
        domain: j.site.domain ?? null,
        displayName: j.site.displayName,
      };
      verifiedTokenRef.current = verifyFor;
      setEditor(j.editor);
      setSite(nextSite);
      writeHmSession(verifyFor, nextSite, j.editor, { silent: true });
      setNewsLayoutPrefs(result.newsLayoutPrefs);
      setSeoVerification(result.seoVerification);
      setSessionStatus("ok");
    };

    const pending = run().finally(() => {
      if (verifyInFlightRef.current === pending) {
        verifyInFlightRef.current = null;
      }
    });
    verifyInFlightRef.current = pending;
    return pending;
  }, [denySession]);

  const verifySessionRef = useRef(verifySession);
  verifySessionRef.current = verifySession;

  const refreshMe = useCallback(async () => {
    return verifySession({ force: true });
  }, [verifySession]);

  const syncFromStorage = useCallback(() => {
    const nextToken = readHmJwt();
    setToken(nextToken);
    setSite(readHmSite());
    setEditor(readHmEditorBrief());
    if (!nextToken) {
      verifiedTokenRef.current = null;
      setSessionStatus("idle");
      return;
    }
    if (verifiedTokenRef.current !== nextToken && !verifyInFlightRef.current) {
      void verifySessionRef.current();
    }
  }, []);

  useEffect(() => {
    const on = () => syncFromStorage();
    window.addEventListener("storage", on);
    window.addEventListener("hm-editor-session", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("hm-editor-session", on);
    };
  }, [syncFromStorage]);

  const saveNewsSiteLayout = useCallback(async (
    prefs: NewsSiteLayoutPrefs,
    opts?: NewsSiteLayoutSaveOptions,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const t = readHmJwt();
    if (!t) return { ok: false, error: "Oturum yok (JWT)." };
    const patchPrefs = opts?.layoutPatch
      ? ({ ...newsLayoutPrefs, ...opts.layoutPatch } as NewsSiteLayoutPrefs)
      : prefs;
    const mergedPrefs = mergeNewsSiteLayoutForSave(newsLayoutPrefs, patchPrefs, opts);
    const vitrinBase = opts?.layoutPatch
      ? ({ ...newsLayoutPrefs, ...opts.layoutPatch } as NewsSiteLayoutPrefs)
      : mergedPrefs;
    const layoutPayload =
      opts?.vitrinOnly === true
        ? pickVitrinLayoutPatchForSave(vitrinBase)
        : opts?.layoutPatch
          ? (opts.layoutPatch as Record<string, unknown>)
          : mergedPrefs;
    try {
      const res = await fetch(apiUrl("/api/hm/editor/site-layout"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: layoutPayload,
          vitrinOnly: opts?.vitrinOnly === true,
          allowClearExtraPages: opts?.allowClearExtraPages === true,
          allowClearCorporatePageHtml: opts?.allowClearCorporatePageHtml === true,
        }),
      });
      const text = await res.text().catch(() => "");
      let errMsg = "";
      if (text) {
        try {
          const j = JSON.parse(text) as { error?: string; detail?: string; maxChars?: number; sizeChars?: number };
          errMsg = String(j.error ?? "").trim();
          if (j.detail) errMsg = `${errMsg}${errMsg ? " — " : ""}${String(j.detail).trim()}`;
          if (typeof j.sizeChars === "number" && typeof j.maxChars === "number") {
            errMsg = `${errMsg || "layout çok büyük"} (${j.sizeChars} / ${j.maxChars} karakter)`;
          }
        } catch {
          errMsg = text.slice(0, 300);
        }
      }
      if (!res.ok) {
        return { ok: false, error: errMsg || `HTTP ${res.status}` };
      }
      let layoutJson: string | undefined;
      try {
        const j = text ? (JSON.parse(text) as { ok?: boolean; layoutJson?: string }) : {};
        if (typeof j.layoutJson === "string" && j.layoutJson.trim()) layoutJson = j.layoutJson;
      } catch {
        layoutJson = undefined;
      }
      if (layoutJson) {
        setNewsLayoutPrefs(parseNewsSiteLayoutFromJson(layoutJson));
      } else {
        setNewsLayoutPrefs(mergedPrefs);
      }
      if (site?.slug) {
        clearHmNestedMetaCache(site.slug);
        dispatchHmLayoutUpdated(site.slug);
      }
      /** `/me` tekrar çağrılırsa bazen eski `layoutJson` ile üzerine yazma riski; layout PATCH yanıtından güncellendi. */
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [newsLayoutPrefs, site?.slug]);

  const saveHomeModuleOrder = useCallback(async (patch: {
    hmNewsHomeModuleOrder?: string[];
    hmCorporateHomeModuleOrder?: string[];
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const t = readHmJwt();
    if (!t) return { ok: false, error: "Oturum yok (JWT)." };
    try {
      const res = await fetch(apiUrl("/api/hm/editor/site-home-module-order"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const text = await res.text().catch(() => "");
      let errMsg = "";
      if (text) {
        try {
          const j = JSON.parse(text) as { error?: string; detail?: string; maxChars?: number; sizeChars?: number };
          errMsg = String(j.error ?? "").trim();
          if (j.detail) errMsg = `${errMsg}${errMsg ? " — " : ""}${String(j.detail).trim()}`;
          if (typeof j.sizeChars === "number" && typeof j.maxChars === "number") {
            errMsg = `${errMsg || "layout çok büyük"} (${j.sizeChars} / ${j.maxChars} karakter)`;
          }
        } catch {
          errMsg = text.slice(0, 300);
        }
      }
      if (!res.ok) {
        return { ok: false, error: errMsg || `HTTP ${res.status}` };
      }
      let layoutJson: string | undefined;
      try {
        const j = text ? (JSON.parse(text) as { ok?: boolean; layoutJson?: string }) : {};
        if (typeof j.layoutJson === "string" && j.layoutJson.trim()) layoutJson = j.layoutJson;
      } catch {
        layoutJson = undefined;
      }
      if (layoutJson) {
        setNewsLayoutPrefs(parseNewsSiteLayoutFromJson(layoutJson));
      } else {
        setNewsLayoutPrefs((prev) => ({
          ...prev,
          ...(patch.hmNewsHomeModuleOrder ? { hmNewsHomeModuleOrder: [...patch.hmNewsHomeModuleOrder] } : {}),
          ...(patch.hmCorporateHomeModuleOrder
            ? { hmCorporateHomeModuleOrder: [...patch.hmCorporateHomeModuleOrder] }
            : {}),
        }));
      }
      if (site?.slug) clearHmNestedMetaCache(site.slug);
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [site?.slug]);

  const saveSeoVerification = useCallback(async (next: HmSeoVerification | null): Promise<{ ok: true } | { ok: false; error: string }> => {
    const t = readHmJwt();
    if (!t) return { ok: false, error: "Oturum yok (JWT)." };
    try {
      const res = await fetch(apiUrl("/api/hm/editor/site-seo-verification"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ seoVerification: next }),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        let errMsg = "";
        if (text) {
          try {
            const j = JSON.parse(text) as { error?: string; detail?: string };
            errMsg = String(j.error ?? "").trim();
            if (j.detail) errMsg = `${errMsg}${errMsg ? " — " : ""}${String(j.detail).trim()}`;
          } catch {
            errMsg = text.slice(0, 300);
          }
        }
        return { ok: false, error: errMsg || `HTTP ${res.status}` };
      }
      try {
        const j = text ? (JSON.parse(text) as { seoVerification?: HmSeoVerification | null }) : {};
        setSeoVerification(j.seoVerification ?? null);
      } catch {
        setSeoVerification(next);
      }
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setEditor(null);
      setSessionStatus("idle");
      setNewsLayoutPrefs({ ...defaultNewsSiteLayoutPrefs });
      setSeoVerification(null);
      return;
    }
    if (verifiedTokenRef.current === token) return;
    void verifySession();
  }, [token, verifySession]);

  useEffect(() => {
    if (sessionStatus !== "checking") return;
    const watchdog = window.setTimeout(() => {
      const t = readHmJwt();
      if (!t) {
        denySession();
        return;
      }
      if (verifiedTokenRef.current === t) {
        setSessionStatus("ok");
        return;
      }
      if (readHmEditorBrief() && readHmSite()) {
        verifiedTokenRef.current = t;
        setSessionStatus("transient");
        return;
      }
      denySession();
    }, VERIFY_TIMEOUT_MS + 1_000);
    return () => window.clearTimeout(watchdog);
  }, [sessionStatus, denySession]);

  const setSession = useCallback((tok: string, s: HmSiteBrief, e: HmEditorBrief) => {
    verifyInFlightRef.current = null;
    writeHmSession(tok, s, e, { silent: true });
    verifiedTokenRef.current = tok;
    setToken(tok);
    setSite(s);
    setEditor(e);
    setSessionStatus("ok");
  }, []);

  const logout = useCallback(() => {
    verifyInFlightRef.current = null;
    verifiedTokenRef.current = null;
    clearHmSession();
    setToken(null);
    setSite(null);
    setEditor(null);
    setSessionStatus("idle");
    setNewsLayoutPrefs({ ...defaultNewsSiteLayoutPrefs });
    setSeoVerification(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      site,
      editor,
      sessionStatus,
      newsLayoutPrefs,
      seoVerification,
      setSession,
      logout,
      refreshMe,
      saveNewsSiteLayout,
      saveHomeModuleOrder,
      saveSeoVerification,
    }),
    [token, site, editor, sessionStatus, newsLayoutPrefs, seoVerification, setSession, logout, refreshMe, saveNewsSiteLayout, saveHomeModuleOrder, saveSeoVerification],
  );

  return <HmEditorContext.Provider value={value}>{children}</HmEditorContext.Provider>;
}

export function useHmEditor() {
  const ctx = useContext(HmEditorContext);
  if (!ctx) throw new Error("useHmEditor outside HmEditorProvider");
  return ctx;
}

export function useHmEditorOptional(): HmEditorContextType | null {
  return useContext(HmEditorContext);
}
