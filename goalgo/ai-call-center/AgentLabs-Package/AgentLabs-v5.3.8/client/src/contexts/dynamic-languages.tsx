/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import merge from "lodash/merge";
import i18n, { defaultLocale, languages as staticLanguages, staticTranslationBundles } from "@/i18n";
import type { PlatformLanguage } from "@shared/schema";

interface DynamicLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string | null;
  direction: "ltr" | "rtl";
  isDefault?: boolean;
}

interface DynamicLanguagesContextType {
  languages: DynamicLanguage[];
  isLoading: boolean;
  isUsingDatabase: boolean;
  defaultLanguage: string;
  refetch: () => void;
}

const DynamicLanguagesContext = createContext<DynamicLanguagesContextType>({
  languages: staticLanguages,
  isLoading: false,
  isUsingDatabase: false,
  defaultLanguage: defaultLocale || "tr",
  refetch: () => {},
});

export function DynamicLanguagesProvider({ children }: { children: React.ReactNode }) {
  const loadedBundlesRef = useRef<Map<string, string>>(new Map());
  const hasSetDefaultRef = useRef(false);

  const { data: dbLanguages, isLoading, refetch } = useQuery<PlatformLanguage[]>({
    queryKey: ["/api/public/platform-languages"],
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const isUsingDatabase = useMemo(() => {
    return !!dbLanguages && dbLanguages.length > 0;
  }, [dbLanguages]);

  const defaultLanguage = useMemo(() => {
    if (dbLanguages && dbLanguages.length > 0) {
      const defaultLang = dbLanguages.find((lang) => lang.isDefault);
      return defaultLang?.code || defaultLocale || "tr";
    }
    return defaultLocale || "tr";
  }, [dbLanguages]);

  const languages = useMemo<DynamicLanguage[]>(() => {
    if (dbLanguages && dbLanguages.length > 0) {
      return dbLanguages.map((lang) => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        direction: lang.direction as "ltr" | "rtl",
        isDefault: lang.isDefault,
      }));
    }
    return staticLanguages;
  }, [dbLanguages]);

  useEffect(() => {
    if (!dbLanguages || dbLanguages.length === 0) return;

    let newCount = 0;
    let updatedCount = 0;

    dbLanguages.forEach((lang) => {
      if (!lang.translations || typeof lang.translations !== "object") return;

      const translationsHash = JSON.stringify(lang.translations);
      const previousHash = loadedBundlesRef.current.get(lang.code);

      if (previousHash !== translationsHash) {
        const staticBundle = staticTranslationBundles[lang.code];
        const dbTranslations =
          lang.translations && typeof lang.translations === "object"
            ? (lang.translations as Record<string, unknown>)
            : {};
        // Turkish: ship only static bundle so stale DB German/English seeds cannot leak through.
        // Other locales: DB base, static JSON overwrites matching keys.
        const merged =
          lang.code === "tr" && staticBundle
            ? staticBundle
            : staticBundle
              ? merge({}, dbTranslations, staticBundle)
              : dbTranslations;

        i18n.addResourceBundle(lang.code, "translation", merged, true, true);
        loadedBundlesRef.current.set(lang.code, translationsHash);

        if (previousHash === undefined) {
          newCount++;
        } else {
          updatedCount++;
        }
      }
    });

    if (newCount > 0 || updatedCount > 0) {
      console.log(`[DynamicLanguages] Loaded ${newCount} new, updated ${updatedCount} languages from database`);
      void i18n.changeLanguage(i18n.language);
    }

    // Set platform default language if user hasn't manually selected one
    if (!hasSetDefaultRef.current) {
      const userSelectedLang = localStorage.getItem("i18nextLng");
      const platformDefault = dbLanguages.find((lang) => lang.isDefault)?.code;
      const preferredDefault = defaultLocale || platformDefault;

      if (preferredDefault && !userSelectedLang) {
        i18n.changeLanguage(preferredDefault);
        console.log(`[DynamicLanguages] Set default language: ${preferredDefault}`);
      }
      hasSetDefaultRef.current = true;
    }
  }, [dbLanguages]);

  return (
    <DynamicLanguagesContext.Provider value={{ languages, isLoading, isUsingDatabase, defaultLanguage, refetch }}>
      {children}
    </DynamicLanguagesContext.Provider>
  );
}

export function useDynamicLanguages() {
  return useContext(DynamicLanguagesContext);
}
