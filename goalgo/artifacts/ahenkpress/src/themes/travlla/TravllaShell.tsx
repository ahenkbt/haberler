import type { ReactNode } from "react";
import "@/styles/travllaTurizm.css";
import { TravllaSubnav } from "./components/TravllaHeader";

type Props = {
  children: ReactNode;
  page?: "home" | "listing" | "detail" | "destinations" | "static";
};

/** Travlla modül gövdesi — site chrome TurizmRoute → SadePublicChrome üzerinden */
export function TravllaShell({ children, page = "home" }: Props) {
  return (
    <div className="trv-yekpare min-h-screen flex flex-col" data-page="turizm-travlla" data-trv-page={page}>
      <TravllaSubnav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
