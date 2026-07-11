import { useState, useEffect, useRef, useCallback } from "react";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  requestId?: number;
  offerId?: number;
}

const TYPE_ICON: Record<string, string> = {
  request_created:  "📦",
  request_accepted: "🚗",
  arrived_pickup:   "📍",
  picked_up:        "✅",
  in_transit:       "🚀",
  delivered:        "🎉",
  new_booking:      "🎫",
  booking_confirmed:"✅",
  cancelled:        "❌",
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch {/* ignore */}
}

export default function NotificationBell() {
  const { user, token } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnread = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/transport/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: Notif[] = await res.json();
      setNotifs(data);
      const count = data.filter(n => !n.isRead).length;
      setUnread(count);
      if (count > prevUnread.current) playBeep();
      prevUnread.current = count;
    } catch {/* ignore */}
  }, [token]);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user, fetchNotifs]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    if (!token) return;
    await fetch("/api/transport/notifications/read", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    prevUnread.current = 0;
  }

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        title="Bildirimler"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
            <span className="font-semibold text-gray-800">Bildirimler</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <div className="text-3xl mb-2">🔕</div>
                <p className="text-sm">Bildirim yok</p>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-orange-50/50" : ""}`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? "📩"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
