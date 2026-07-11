import { SearchEnginePublicChrome } from "@/components/SearchEnginePublicChrome";
import { ServicesSubNav } from "@/components/services/ServicesSubNav";

type Props = {
  children: React.ReactNode;
  searchPlaceholder?: string;
};

/** Servisler tanıtım merkezi — Sade chrome + tek modül alt menüsü. */
export function ServicesMarketingChrome({ children, searchPlaceholder = "Yekpare servislerinde ara" }: Props) {
  return (
    <SearchEnginePublicChrome
      fullBleed
      searchPlaceholder={searchPlaceholder}
      subHeader={<ServicesSubNav inline />}
    >
      {children}
    </SearchEnginePublicChrome>
  );
}
