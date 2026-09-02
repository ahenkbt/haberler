import { useMemo } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  ahenkAgencyJsonFromSettings,
  parseAhenkAgencySiteFromJson,
  type AhenkAgencySite,
} from "@/lib/ahenkAgencySite";

export function useAhenkAgencySite(): AhenkAgencySite {
  const { data: settings } = useGetSiteSettings();
  return useMemo(
    () => parseAhenkAgencySiteFromJson(ahenkAgencyJsonFromSettings(settings)),
    [settings],
  );
}
