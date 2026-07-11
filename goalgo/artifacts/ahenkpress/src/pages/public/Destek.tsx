import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useMember } from "@/context/MemberContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, LifeBuoy, Send } from "lucide-react";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";
import { YEKPARE_DESTEK_FAQ_ITEMS, YEKPARE_FOOTER_DISCLAIMER } from "@workspace/site-nav";

const API = "/api";

type ProviderSession = { id: number; email: string; token?: string };

function readProviderSession(): ProviderSession | null {
  const s = getProviderSession();
  const id = typeof s?.id === "number" ? s.id : Number(s?.id);
  const email = typeof s?.email === "string" ? s.email.trim() : "";
  const token = typeof s?.token === "string" ? s.token : undefined;
  if (!Number.isFinite(id) || id < 1 || !email) return null;
  return { id, email, token };
}

export default function Destek() {
  const { member, loading: memberLoading } = useMember();
  const { user: shopUser, token: shopToken } = useCustomerAuth();
  const [provider, setProvider] = useState<ProviderSession | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tickets, setTickets] = useState<
    { id: number; status: string; subject: string; created_at: string }[]
  >([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    setProvider(readProviderSession());
  }, []);

  const authHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = {};
    if (shopToken) h.Authorization = `Bearer ${shopToken}`;
    if (provider) {
      Object.assign(h, providerAuthHeaders(provider));
    }
    return h;
  }, [shopToken, provider]);

  const loadTickets = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API}/support/tickets`, {
        credentials: "include",
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        setTickets([]);
        return;
      }
      const d = await res.json();
      setTickets(d.tickets ?? []);
    } catch {
      setTickets([]);
    } finally {
      setListLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (member || shopToken || provider) void loadTickets();
  }, [member, shopToken, provider, loadTickets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subject.trim();
    const txt = body.trim();
    if (!sub || !txt) {
      setMsg({ type: "err", text: "Konu ve açıklama zorunludur." });
      return;
    }
    if (!member && !shopToken && !provider) {
      setMsg({
        type: "err",
        text: "Önce giriş yapın: Keşfet üyeliği (üye girişi), alışveriş hesabı veya işletme paneli oturumu.",
      });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/support/tickets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subject: sub, body: txt }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: d.error || "Gönderilemedi." });
        return;
      }
      setMsg({ type: "ok", text: "Talebiniz kaydedildi. En kısa sürede size dönüş yapılacaktır." });
      setSubject("");
      setBody("");
      void loadTickets();
    } catch {
      setMsg({ type: "err", text: "Bağlantı hatası." });
    } finally {
      setSending(false);
    }
  };

  const loggedIn = Boolean(member || shopToken || provider);
  const roleLabel = member
    ? "Keşfet / Seri İlan üyesi"
    : shopToken
      ? "Alışveriş müşterisi"
      : provider
        ? "İşletme sahibi (servis veya mağaza)"
        : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
          <LifeBuoy className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Yekpare Destek</h1>
          <p className="text-sm text-gray-500">Üye, müşteri veya işletme olarak doğrudan talep oluşturun.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm p-4 mb-6 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">Platform bilgilendirmesi</p>
        <p>{YEKPARE_FOOTER_DISCLAIMER}</p>
        <p className="mt-2">
          Sipariş, iade ve rezervasyon şikayetlerinde önce{" "}
          <strong>ilgili işletmeyle</strong> iletişime geçin. Ayrıntılı yanıtlar için{" "}
          <Link href="/sss" className="underline font-bold text-slate-900">
            SSS
          </Link>{" "}
          ve{" "}
          <Link href="/turizm/turlar/sss" className="underline font-bold text-slate-900">
            Turizm SSS
          </Link>{" "}
          sayfalarına bakın.
        </p>
      </div>

      {!memberLoading && !loggedIn && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4 mb-6 space-y-2">
          <p className="font-semibold">Giriş gerekli</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Keşfet üyesi:</strong> sağ üstten üye girişi yapın (
              <Link href="/kesfet" className="underline font-bold text-amber-900">
                Keşfet
              </Link>
              ).
            </li>
            <li>
              <strong>Alışveriş:</strong>{" "}
              <Link href="/hesabim" className="underline font-bold text-amber-900">
                Hesabım
              </Link>{" "}
              üzerinden giriş yapın.
            </li>
            <li>
              <strong>İşletme:</strong>{" "}
              <Link href="/servis-saglayici-giris" className="underline font-bold text-amber-900">
                Servis sağlayıcı girişi
              </Link>{" "}
              veya mağaza paneli oturumu aynı tarayıcıda açık olmalıdır.
            </li>
          </ul>
        </div>
      )}

      {loggedIn && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-6">
          Oturum: <strong>{roleLabel}</strong>
          {member ? ` — ${member.firstName} ${member.lastName}` : null}
          {shopUser ? ` — ${shopUser.name}` : null}
          {provider ? ` — işletme #${provider.id}` : null}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <Label>Konu</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Örn: Ödeme bildirimi gelmedi" maxLength={200} />
        </div>
        <div>
          <Label>Açıklama</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 min-h-[140px]"
            placeholder="Yaşadığınız sorunu, sipariş numaranızı ve ekran görüntüsü varsa linkini yazın."
          />
        </div>
        {msg && (
          <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === "ok" ? "bg-green-50 text-green-900 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {msg.text}
          </p>
        )}
        <Button type="submit" disabled={sending || !loggedIn} className="sade-btn-primary w-full gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Talebi Gönder
        </Button>
      </form>

      <section className="mt-10 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-gray-900 mb-1">Sık sorulan sorular</h2>
        <p className="text-sm text-gray-500 mb-4">
          Destek talebi açmadan önce aşağıdaki yanıtlara göz atın. Tüm SSS:{" "}
          <Link href="/sss" className="text-[#e61e25] underline font-semibold">
            /sss
          </Link>
        </p>
        <div className="space-y-2">
          {YEKPARE_DESTEK_FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-2 open:bg-white open:shadow-sm"
            >
              <summary className="cursor-pointer font-semibold text-gray-900 text-sm py-2 list-none">
                {item.question}
              </summary>
              <p className="text-sm text-gray-700 leading-relaxed pb-3">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {loggedIn && (
        <div className="mt-10">
          <h2 className="font-bold text-gray-900 mb-3">Son talepleriniz</h2>
          {listLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz kayıtlı talep yok.</p>
          ) : (
            <ul className="divide-y border border-gray-200 rounded-xl bg-white">
              {tickets.map((t) => (
                <li key={t.id} className="px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-gray-900">{t.subject}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString("tr-TR")} · {t.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
