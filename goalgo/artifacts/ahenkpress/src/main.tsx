import { createRoot } from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { setBaseUrl, getGetSiteSettingsQueryKey, getSiteSettings } from "@workspace/api-client-react";

import { AuthProvider } from "./contexts/AuthContext";

import { HmEditorProvider } from "./contexts/HmEditorContext";

import { getResolvedApiBaseForClient } from "./lib/apiBase";

import App from "./App";

import { bootstrapYekpareDocumentTheme } from "./hooks/useYekpareTheme";
import { purgeHmVisitorThemePreference } from "./lib/hmChromeThemePreference";

import "./index.css";

import "./styles/hmVitrinThemes.css";

import "./styles/hmRssNewsBand.css";

import "./styles/dunyadanKisaKisa.css";

import "./styles/sellzy-theme.css";

import "./styles/sade-public-footer.css";

import "./styles/homepageTheme.css";



/** `apiBase.ts`: site kökü ≠ API köküyse göreli `/api` (panel çerezi + admin uçları). */

const resolvedApiBase = getResolvedApiBaseForClient();

if (resolvedApiBase) {

  setBaseUrl(resolvedApiBase);

}



function queryRetry(failureCount: number, error: unknown): boolean {

  const status = (error as { status?: number })?.status;

  if (status === 429 || status === 502 || status === 503 || status === 504) {

    return failureCount < 4;

  }

  return failureCount < 2;

}



function queryRetryDelay(attemptIndex: number, error: unknown): number {

  const status = (error as { status?: number })?.status;

  const base = status === 429 ? 800 : 1000;

  return Math.min(base * 2 ** attemptIndex, 8_000) + Math.floor(Math.random() * 250);

}



const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      refetchOnWindowFocus: false,

      staleTime: 60_000,

      retry: queryRetry,

      retryDelay: queryRetryDelay,

    },

  },

});



/** Ayarlar vitrin chrome'u bloklamaz; arka planda ısıt. */

void queryClient.prefetchQuery({

  queryKey: getGetSiteSettingsQueryKey(),

  queryFn: ({ signal }) => getSiteSettings({ signal }),

});

bootstrapYekpareDocumentTheme();
purgeHmVisitorThemePreference();

createRoot(document.getElementById("root")!).render(

  <QueryClientProvider client={queryClient}>

    <AuthProvider>

      <HmEditorProvider>

        <App />

      </HmEditorProvider>

    </AuthProvider>

  </QueryClientProvider>,

);

