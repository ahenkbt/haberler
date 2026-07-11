import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobileHomeHeaderSlotContextValue = {
  slot: ReactNode;
  setSlot: (node: ReactNode) => void;
};

const MobileHomeHeaderSlotContext = createContext<MobileHomeHeaderSlotContextValue | null>(null);

export function MobileHomeHeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<ReactNode>(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);
  return <MobileHomeHeaderSlotContext.Provider value={value}>{children}</MobileHomeHeaderSlotContext.Provider>;
}

export function useMobileHomeHeaderSlot() {
  return useContext(MobileHomeHeaderSlotContext);
}
