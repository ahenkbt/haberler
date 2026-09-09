import { useMemo } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  ahenkAgencyJsonFromSettings,
  applySiteSettingsToAhenkAgency,
  parseAhenkAgencySiteFromJson,
  type AhenkAgencySite,
} from "@/lib/ahenkAgencySite";

export function useAhenkAgencySite(): AhenkAgencySite {
  const { data: settings } = useGetSiteSettings();
  return useMemo(
    () =>
      applySiteSettingsToAhenkAgency(
        parseAhenkAgencySiteFromJson(ahenkAgencyJsonFromSettings(settings)),
        settings,
      ),
    [settings],
  );
}
