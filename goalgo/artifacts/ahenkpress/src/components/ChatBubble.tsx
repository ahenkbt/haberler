import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, X, ArrowLeft, Send, Users, Plus, Search,
  ChevronRight, Volume2, VolumeX, UserPlus,
} from "lucide-react";

const API = "/api";
const POLL_INTERVAL = 8000;

/* ── Sound ── */
function playBeep(type: "message") {
  try {
    const ctx = new AudioContext();
    [920, 1180].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.start(t);
      osc.stop(t + 0.12);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch { /* noop */ }
}

function playAlarmTone() {
  try {
    const ctx = new AudioContext();
    /* Two oscillators for richer alarm sound */
    const freqs = [880, 1100, 880, 1100];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.11);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.12);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* noop */ }
}

/* ── Identity helpers ── */
export interface ChatMember {
  type: "vendor" | "courier" | "usta" | "servis" | "customer";
  id: string;
  name: string;
  phone?: string;
}

export function getCurrentMember(): ChatMember | null {
  const checks: Array<[string, ChatMember["type"]]> = [
    ["providerSession", "vendor"],
    ["courierSession", "courier"],
    ["ustaSession", "usta"],
    ["servisSession", "servis"],
    ["customerSession", "customer"],
    ["customer_auth", "customer"],
  ];
  for (const [key, type] of checks) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const s = JSON.parse(raw);
      const id = String(s?.id ?? s?.phone ?? "");
      if (!id) continue;
      return { type, id, name: s.name || s.vendor_name || type, phone: s.phone };
    } catch { /* noop */ }
  }
  return null;
}

const MEMBER_COLORS: Record<string, string> = {
  vendor:   "bg-indigo-500",
  courier:  "bg-purple-500",
  usta:     "bg-orange-500",
  servis:   "bg-teal-500",
  customer: "bg-green-500",
};
const MEMBER_LABELS: Record<string, string> = {
  vendor:   "İşletme",
  courier:  "Kurye",
  usta:     "Usta",
  servis:   "Servis",
  customer: "Müşteri",
};

/* ── Types ── */
interface Room {
  id: number;
  name: string | null;
  type: string;
  order_number: string | null;
  unread_count: number;
  last_message: string | null;
  last_sender: string | null;
  last_message_at: string | null;
  members: Array<{ type: string; id: string; name: string; phone: string }>;
}
interface Message {
  id: number;
  room_id: number;
  sender_type: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

/* ── Global event bus for opening a room from outside ── */
export function openChatRoom(roomId: number) {
  window.dispatchEvent(new CustomEvent("Yekpare:openChatRoom", { detail: { roomId } }));
}
export function playOrderSound() {
  window.dispatchEvent(new CustomEvent("Yekpare:newOrder"));
}

/* ── Main Component ── */
export default function ChatBubble() {
  const me = useRef<ChatMember | null>(getCurrentMember());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"rooms" | "messages" | "create">("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ type: "vendor", id: "", name: "", phone: "" });
  const [createForm, setCreateForm] = useState({ name: "", orderId: "", orderNumber: "" });
  const [createMembers, setCreateMembers] = useState<Array<{ type: string; id: string; name: string; phone: string }>>([]);
  const [addMemberInput, setAddMemberInput] = useState({ type: "vendor", id: "", name: "", phone: "" });
  const [searchQ, setSearchQ] = useState("");
  const lastMsgId = useRef(0);
  const msgBottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* Alarm */
  const [alarmActive, setAlarmActive] = useState(false);
  const alarmRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAlarm = useCallback(() => {
    setAlarmActive(false);
    if (alarmRef.current) { clearInterval(alarmRef.current); alarmRef.current = null; }
  }, []);

  const startAlarm = useCallback(() => {
    setAlarmActive(true);
    playAlarmTone();
    if (alarmRef.current) clearInterval(alarmRef.current);
    alarmRef.current = setInterval(playAlarmTone, 2500);
  }, []);

  /* Re-detect me on open (session might have changed) */
  useEffect(() => { me.current = getCurrentMember(); }, [open]);

  /* ── Load rooms ── */
  const loadRooms = useCallback(async () => {
    const m = me.current;
    if (!m) return;
    try {
      const r = await fetch(`${API}/chat/rooms?memberType=${m.type}&memberId=${encodeURIComponent(m.id)}`);
      if (r.ok) {
        const data: Room[] = await r.json();
        const prev = rooms;
        setRooms(data);
        const newUnread = data.reduce((s, r) => s + (r.unread_count || 0), 0);
        /* Sound if new unread appeared while panel closed */
        if (!open && newUnread > totalUnread && !muted) {
          playBeep("message");
          window.dispatchEvent(new CustomEvent("Yekpare:newMessage"));
        }
        setTotalUnread(newUnread);
        /* If viewing messages, check for new ones */
        if (activeRoom && view === "messages") {
          const ar = data.find(r => r.id === activeRoom.id);
          if (ar) setActiveRoom(ar);
        }
        void prev; /* suppress lint */
      }
    } catch { /* noop */ }
  }, [activeRoom, muted, open, totalUnread, view]); // eslint-disable-line

  /* ── Load messages for active room ── */
  const loadMessages = useCallback(async (room: Room) => {
    const m = me.current;
    if (!m) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/chat/rooms/${room.id}/messages?memberType=${m.type}&memberId=${encodeURIComponent(m.id)}`);
      if (r.ok) {
        const data: Message[] = await r.json();
        setMessages(data);
        lastMsgId.current = data.length ? data[data.length - 1].id : 0;
        setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  /* ── Poll new messages in active room ── */
  const pollMessages = useCallback(async () => {
    if (!activeRoom || view !== "messages") return;
    try {
      const r = await fetch(`${API}/chat/rooms/${activeRoom.id}/new-messages?afterId=${lastMsgId.current}`);
      if (r.ok) {
        const data: Message[] = await r.json();
        if (data.length > 0) {
          setMessages(prev => [...prev, ...data]);
          lastMsgId.current = data[data.length - 1].id;
          setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          const m = me.current;
          const hasNew = data.some(d => !(d.sender_type === m?.type && d.sender_id === m?.id));
          if (hasNew && !muted) playBeep("message");
        }
      }
    } catch { /* noop */ }
  }, [activeRoom, view, muted]);

  /* ── Polling loop ── */
  useEffect(() => {
    loadRooms();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void loadRooms();
      void pollMessages();
    }, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadRooms, pollMessages]);

  /* ── External event: open specific room ── */
  useEffect(() => {
    const handler = async (e: Event) => {
      const roomId = (e as CustomEvent<{ roomId: number }>).detail.roomId;
      me.current = getCurrentMember();
      setOpen(true);
      setView("messages");
      /* Load room details */
      const r = await fetch(`${API}/chat/rooms/${roomId}`);
      if (r.ok) {
        const room: Room = await r.json();
        setActiveRoom({ ...room, unread_count: 0, last_message: null, last_sender: null, last_message_at: null });
        await loadMessages({ ...room, unread_count: 0, last_message: null, last_sender: null, last_message_at: null });
      }
    };
    const orderHandler = () => { if (!muted) startAlarm(); };
    const clearHandler = () => stopAlarm();
    window.addEventListener("Yekpare:openChatRoom", handler);
    window.addEventListener("Yekpare:newOrder", orderHandler);
    window.addEventListener("Yekpare:orderClear", clearHandler);
    return () => {
      window.removeEventListener("Yekpare:openChatRoom", handler);
      window.removeEventListener("Yekpare:newOrder", orderHandler);
      window.removeEventListener("Yekpare:orderClear", clearHandler);
    };
  }, [loadMessages, muted, startAlarm, stopAlarm]);

  /* ── Send message ── */
  async function sendMessage() {
    if (!input.trim() || !activeRoom || sending) return;
    const m = me.current;
    if (!m) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/chat/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderType: m.type, senderId: m.id, senderName: m.name, message: input.trim() }),
      });
      if (r.ok) {
        const msg: Message = await r.json();
        setMessages(prev => [...prev, msg]);
        lastMsgId.current = msg.id;
        setInput("");
        setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch { /* noop */ } finally { setSending(false); }
  }

  /* ── Open room (from list) ── */
  async function openRoom(room: Room) {
    setActiveRoom(room);
    setView("messages");
    setMessages([]);
    await loadMessages(room);
    void loadRooms(); /* refresh unread counts */
  }

  /* ── Add member to active room ── */
  async function addMember() {
    if (!activeRoom || !inviteForm.id || !inviteForm.type) return;
    await fetch(`${API}/chat/rooms/${activeRoom.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberType: inviteForm.type, memberId: inviteForm.id, memberName: inviteForm.name, memberPhone: inviteForm.phone }),
    });
    setInviteForm({ type: "vendor", id: "", name: "", phone: "" });
    setInviteOpen(false);
    void loadRooms();
    const r = await fetch(`${API}/chat/rooms/${activeRoom.id}`);
    if (r.ok) setActiveRoom(await r.json());
  }

  /* ── Create new group room ── */
  async function createRoom() {
    const m = me.current;
    if (!m) return;
    const members = [{ type: m.type, id: m.id, name: m.name, phone: m.phone ?? "" }, ...createMembers];
    const r = await fetch(`${API}/chat/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name || null,
        type: createMembers.length > 1 ? "group" : "dm",
        orderId: createForm.orderId ? parseInt(createForm.orderId) : undefined,
        orderNumber: createForm.orderNumber || undefined,
        vendorId: m.type === "vendor" ? parseInt(m.id) : undefined,
        createdByType: m.type,
        createdById: m.id,
        members,
      }),
    });
    if (r.ok) {
      const room = await r.json();
      setCreateForm({ name: "", orderId: "", orderNumber: "" });
      setCreateMembers([]);
      setView("rooms");
      await loadRooms();
      await openRoom({ ...room, unread_count: 0, last_message: null, last_sender: null, last_message_at: null });
    }
  }

  const m = me.current;
  if (!m) return null; /* Only show for logged-in users */

  const filteredRooms = rooms.filter(r => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (r.name ?? "").toLowerCase().includes(q)
      || (r.order_number ?? "").toLowerCase().includes(q)
      || (r.members ?? []).some(mem => (mem.name ?? "").toLowerCase().includes(q));
  });

  const roomName = (room: Room) => {
    if (room.name) return room.name;
    if (room.order_number) return `Sipariş #${room.order_number}`;
    const others = (room.members ?? []).filter(mem => !(mem.type === m.type && mem.id === m.id));
    return others.map(x => x.name || MEMBER_LABELS[x.type] || x.type).join(", ") || "Sohbet";
  };

  return (
    <>
      {/* ── Alarm Banner (above bubble) ── */}
      {alarmActive && !open && (
        <button
          onClick={() => { stopAlarm(); setOpen(true); me.current = getCurrentMember(); void loadRooms(); }}
          className="fixed bottom-24 right-5 z-[9001] flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-2xl animate-bounce"
        >
          🔔 YENİ SİPARİŞ! — Kapat
        </button>
      )}

      {/* ── Floating Bubble Button ── */}
      <button
        onClick={() => { stopAlarm(); setOpen(o => !o); if (!open) { me.current = getCurrentMember(); void loadRooms(); } }}
        className="fixed bottom-5 right-5 z-[9000] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: alarmActive ? "linear-gradient(135deg, #f97316, #ef4444)" : "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        title="Sohbet"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {alarmActive && !open && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 shadow animate-ping" />
        )}
        {alarmActive && !open && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 shadow">
            🔔
          </span>
        )}
        {totalUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 shadow">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[8999] w-[360px] max-w-[calc(100vw-20px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: 520 }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
            {view === "messages" && (
              <button onClick={() => { setView("rooms"); setActiveRoom(null); setMessages([]); }} className="mr-1 hover:opacity-70">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {view === "create" && (
              <button onClick={() => setView("rooms")} className="mr-1 hover:opacity-70">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {view === "rooms" && <p className="font-bold text-sm">💬 Sohbetler</p>}
              {view === "messages" && activeRoom && (
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate">{roomName(activeRoom)}</p>
                  {activeRoom.order_number && <p className="text-indigo-200 text-[10px]">Sipariş #{activeRoom.order_number}</p>}
                </div>
              )}
              {view === "create" && <p className="font-bold text-sm">Yeni Sohbet</p>}
            </div>
            <div className="flex items-center gap-1">
              {view === "messages" && activeRoom && (
                <button onClick={() => setInviteOpen(o => !o)} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Kişi Davet Et">
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
              {view === "rooms" && (
                <button onClick={() => setView("create")} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Yeni Sohbet">
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setMuted(x => !x)} className="p-1.5 hover:bg-white/20 rounded-lg transition" title={muted ? "Sesi Aç" : "Sesi Kapat"}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── ROOMS LIST ── */}
          {view === "rooms" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                    placeholder="Sohbet ara…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                    <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Henüz sohbet yok</p>
                    <button onClick={() => setView("create")} className="mt-3 text-indigo-500 text-xs font-semibold hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Yeni sohbet başlat
                    </button>
                  </div>
                ) : (
                  filteredRooms.map(room => (
                    <button key={room.id} onClick={() => openRoom(room)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-left transition">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${room.type === "group" ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-indigo-400 to-indigo-600"}`}>
                        {room.type === "group" ? <Users className="w-4 h-4" /> : (roomName(room).charAt(0) || "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm truncate">{roomName(room)}</span>
                          {room.last_message_at && (
                            <span className="text-[10px] text-gray-400 ml-1 shrink-0">
                              {new Date(room.last_message_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-gray-400 truncate">
                            {room.last_message ? `${room.last_sender ? room.last_sender + ": " : ""}${room.last_message}` : "Henüz mesaj yok"}
                          </p>
                          {room.unread_count > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                              {room.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── MESSAGES VIEW ── */}
          {view === "messages" && activeRoom && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Members bar */}
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {(activeRoom.members ?? []).map(mem => (
                  <span key={`${mem.type}-${mem.id}`}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold ${MEMBER_COLORS[mem.type] ?? "bg-gray-400"}`}>
                    {mem.name || MEMBER_LABELS[mem.type] || mem.type}
                  </span>
                ))}
              </div>

              {/* Invite form (dropdown) */}
              {inviteOpen && (
                <div className="px-3 py-3 bg-indigo-50 border-b border-indigo-100 space-y-2">
                  <p className="text-xs font-bold text-indigo-800">Kişi Davet Et</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={inviteForm.type} onChange={e => setInviteForm(f => ({ ...f, type: e.target.value }))}
                      className="col-span-2 border rounded-lg px-2 py-1 text-xs outline-none">
                      <option value="vendor">İşletme (ID)</option>
                      <option value="courier">Kurye (Telefon)</option>
                      <option value="usta">Usta (ID)</option>
                      <option value="servis">Servis (ID)</option>
                      <option value="customer">Müşteri (Telefon)</option>
                    </select>
                    <input value={inviteForm.id} onChange={e => setInviteForm(f => ({ ...f, id: e.target.value }))}
                      placeholder="ID veya Telefon" className="border rounded-lg px-2 py-1 text-xs outline-none" />
                    <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="İsim (opsiyonel)" className="border rounded-lg px-2 py-1 text-xs outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addMember} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Ekle</button>
                    <button onClick={() => setInviteOpen(false)} className="px-3 py-1.5 border text-xs rounded-lg">İptal</button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                    <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_type === m.type && msg.sender_id === m.id;
                    const color = MEMBER_COLORS[msg.sender_type] ?? "bg-gray-400";
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className={`w-6 h-6 rounded-full ${color} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mr-1.5 mt-1`}>
                            {(msg.sender_name ?? "?").charAt(0)}
                          </div>
                        )}
                        <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          {!isMe && <p className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.sender_name} <span className="opacity-70">({MEMBER_LABELS[msg.sender_type] ?? msg.sender_type})</span></p>}
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${isMe ? "bg-indigo-500 text-white rounded-tr-sm" : "bg-gray-100 text-gray-900 rounded-tl-sm"}`}>
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                            {new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={msgBottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 px-3 py-2 flex gap-2 items-end shrink-0">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
                  placeholder="Mesaj yaz…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending}
                  className="w-9 h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── CREATE ROOM ── */}
          {view === "create" && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Grup Adı (opsiyonel)</label>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Öğle Teslimatı Ekibi"
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Sipariş ID (opsiyonel)</label>
                  <input value={createForm.orderId} onChange={e => setCreateForm(f => ({ ...f, orderId: e.target.value }))}
                    placeholder="1234" type="number"
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Sipariş No</label>
                  <input value={createForm.orderNumber} onChange={e => setCreateForm(f => ({ ...f, orderNumber: e.target.value }))}
                    placeholder="GG-001"
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>

              {/* Members to add */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Katılımcı Ekle</p>
                <div className="space-y-2 mb-2">
                  {createMembers.map((mem, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className={`w-6 h-6 rounded-full ${MEMBER_COLORS[mem.type] ?? "bg-gray-400"} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {(mem.name ?? "?").charAt(0)}
                      </span>
                      <span className="flex-1 text-sm text-gray-700">{mem.name || mem.id} <span className="text-gray-400 text-xs">({MEMBER_LABELS[mem.type] ?? mem.type})</span></span>
                      <button onClick={() => setCreateMembers(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <select value={addMemberInput.type} onChange={e => setAddMemberInput(f => ({ ...f, type: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none bg-white">
                    <option value="vendor">İşletme</option>
                    <option value="courier">Kurye</option>
                    <option value="usta">Usta</option>
                    <option value="servis">Servis Elemanı</option>
                    <option value="customer">Müşteri</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={addMemberInput.id} onChange={e => setAddMemberInput(f => ({ ...f, id: e.target.value }))}
                      placeholder="ID / Telefon"
                      className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-300" />
                    <input value={addMemberInput.name} onChange={e => setAddMemberInput(f => ({ ...f, name: e.target.value }))}
                      placeholder="İsim"
                      className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-300" />
                  </div>
                  <button
                    onClick={() => {
                      if (!addMemberInput.id) return;
                      setCreateMembers(prev => [...prev, { ...addMemberInput }]);
                      setAddMemberInput({ type: "vendor", id: "", name: "", phone: "" });
                    }}
                    className="w-full py-1.5 border-2 border-dashed border-indigo-300 text-indigo-500 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Katılımcı Listesine Ekle
                  </button>
                </div>
              </div>

              <button onClick={createRoom}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-sm">
                Sohbet Oluştur
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
