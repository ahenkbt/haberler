import { useEffect, useMemo, useState } from "react";
import { useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  defaultNewsSiteLayoutPrefs,
  parseNewsSiteLayoutFromJson,
  readNewsSiteLayoutPrefs,
  type NewsSiteLayoutPrefs,
} from "@/lib/newsSiteLayout";
import { HM_LAYOUT_UPDATED_EVENT } from "@/lib/hmLayoutUpdatedEvent";

export function useNewsSiteLayoutPrefs(): NewsSiteLayoutPrefs {
  const [prefs, setPrefs] = useState<NewsSiteLayoutPrefs>(() => readNewsSiteLayoutPrefs());

  useEffect(() => {
    const sync = () => setPrefs(readNewsSiteLayoutPrefs());
    window.addEventListener("storage", sync);
    window.addEventListener("yekpare-news-layout", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("yekpare-news-layout", sync);
    };
  }, []);

  return prefs;
}

/** Portal `/haberler` — sunucu `newsLayoutJson` + admin kaydı sonrası yenileme. */
export function usePortalNewsLayoutPrefs(): NewsSiteLayoutPrefs {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSiteSettings();

  useEffect(() => {
    const onLayoutUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
    };
    window.addEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
    return () => window.removeEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
  }, [queryClient]);

  return useMemo(() => {
    const raw = settings?.newsLayoutJson ?? null;
    if (raw) return parseNewsSiteLayoutFromJson(raw, null);
    return { ...defaultNewsSiteLayoutPrefs };
  }, [settings?.newsLayoutJson]);
}
