import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";

type BroadcastRow = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

function apiJoin(path: string): string {
  return apiUrl(`/api/${path.replace(/^\/+/, "")}`);
}

type Props = { vendorId: number; vendorEmail: string };

export function VendorBildirimlerPanel({ vendorId, vendorEmail }: Props) {
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  const authHeaders = useMemo(
    () => providerAuthHeaders({ ...(getProviderSession() ?? {}), id: vendorId, email: vendorEmail }),
    [vendorId, vendorEmail],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiJoin("site/my-broadcasts?includeRead=1&limit=120"), { headers: authHeaders });
      const data = (await res.json().catch(() => ({}))) as { broadcasts?: BroadcastRow[]; unreadCount?: number };
      setRows(Array.isArray(data.broadcasts) ? data.broadcasts : []);
      setUnreadCount(Number(data.unreadCount ?? 0));
    } catch {
      setRows([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: number) {
    setMarkingId(id);
    try {
      await fetch(apiJoin(`site/my-broadcasts/${id}/read`), { method: "POST", headers: authHeaders });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                read_at: r.read_at || new Date().toISOString(),
              }
            : r,
        ),
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } finally {
      setMarkingId(null);
    }
  }

  const filtered = rows.filter((r) => {
    const isRead = Boolean(r.read_at);
    if (filter === "read") return isRead;
    if (filter === "unread") return !isRead;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
          <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Platform bildirimleri
          </h2>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-full border ${filter === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200"}`}>Tümü</button>
            <button type="button" onClick={() => setFilter("unread")} className={`px-2.5 py-1 rounded-full border ${filter === "unread" ? "bg-amber-500 text-black border-amber-500" : "bg-white text-gray-700 border-gray-200"}`}>Okunmamış ({unreadCount})</button>
            <button type="button" onClick={() => setFilter("read")} className={`px-2.5 py-1 rounded-full border ${filter === "read" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-200"}`}>Okunmuş</button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => {
              const isRead = Boolean(r.read_at);
              return (
                <li key={r.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{r.title}</p>
                      {isRead ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">okundu</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">yeni</span>}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Yayın: {new Date(r.created_at).toLocaleString("tr-TR")}
                      {r.read_at ? ` · Okundu: ${new Date(r.read_at).toLocaleString("tr-TR")}` : ""}
                    </p>
                  </div>
                  {!isRead ? (
                    <Button type="button" size="sm" variant="outline" disabled={markingId === r.id} onClick={() => void markRead(r.id)}>
                      {markingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Okundu yap
                    </Button>
                  ) : null}
                </li>
              );
            })}
            {!filtered.length ? <li className="py-10 text-center text-gray-500 text-sm">Bu filtrede bildirim yok.</li> : null}
          </ul>
        )}
      </div>
    </div>
  );
}
