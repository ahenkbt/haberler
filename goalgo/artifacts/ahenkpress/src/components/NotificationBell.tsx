import { useState, useEffect, useRef, useCallback } from "react";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";

/** Ulaşım modülü kaldırıldı — transport bildirim API'si artık kullanılmıyor. */
export default function NotificationBell() {
  const { user } = useCustomerAuth();
  if (!user) return null;
  return null;
}
