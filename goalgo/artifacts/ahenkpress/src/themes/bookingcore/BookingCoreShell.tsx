import type { ReactNode } from "react";
import "@/styles/bookingCoreTurizm.css";

type ShellModule = "konaklama" | "yat" | "villa-ev" | "turlar" | "arac";

type Props = {
  children: ReactNode;
  module: ShellModule;
  title?: string;
};

/** Turizm modül gövdesi — site chrome TurizmRoute → SadePublicChrome üzerinden */
export function BookingCoreShell({ children, module, title }: Props) {
  return (
    <div className="bc-yekpare min-h-screen flex flex-col" data-page={`turizm-${module}`}>
      {title ? (
        <header className="bc-page-heading">
          <div className="bc-page-heading__inner">
            <h1>{title}</h1>
          </div>
        </header>
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
