import type { ReactNode } from "react";
import "@/styles/travllaTurizm.css";
import "@/styles/geziSeyahatTheme.css";
import { GeziSeyahatSubNavBar } from "@/components/GeziSeyahatSubNavBar";

type Props = { children: ReactNode };

/** Gezi Seyahat — editoryal gezi kabuğu (rezervasyon ağırlıklı değil) */
export function GeziSeyahatShell({ children }: Props) {
  return (
    <div className="trv-yekpare gezi-seyahat-site min-h-screen flex flex-col" data-page="gezi-seyahat">
      <GeziSeyahatSubNavBar sticky />
      <div className="flex-1">{children}</div>
    </div>
  );
}
