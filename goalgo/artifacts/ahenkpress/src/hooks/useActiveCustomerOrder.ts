import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

/** Logged-in customer has at least one non-terminal delivery order. */
export function useActiveCustomerOrder(): boolean {
  const { token } = useCustomerAuth();
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    if (!token) {
      setHasActive(false);
      return;
    }

    let cancelled = false;
    fetch("/api/customer/orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((orders: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(orders) ? orders : [];
        setHasActive(
          list.some(
            (o) =>
              o &&
              typeof o === "object" &&
              "status" in o &&
              typeof (o as { status: string }).status === "string" &&
              !TERMINAL_STATUSES.has((o as { status: string }).status),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setHasActive(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return hasActive;
}
