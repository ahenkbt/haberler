import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { providerAuthHeaders } from "@/lib/providerSession";

function apiJoin(path: string): string {
  return apiUrl(`/api/${path.replace(/^\/+/, "")}`);
}

function authHeaders(): Record<string, string> {
  return providerAuthHeaders();
}

type Ann = {
  id: number;
  title: string;
  body: string;
  announcement_type: string;
  active: boolean;
  show_on_home: boolean;
  sort_order: number;
  published_at: string;
};

export function VendorDuyurularPanel() {
  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [atype, setAtype] = useState("general");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiJoin("providers/me/announcements"), { headers: authHeaders() });
      const d = await res.json().catch(() => ({}));
      setList(Array.isArray(d.announcements) ? d.announcements : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiJoin("providers/me/announcements"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, announcementType: atype, active: true, showOnHome: true }),
      });
      if (res.ok) {
        setTitle("");
        setBody("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: number, active: boolean) {
    await fetch(apiJoin(`providers/me/announcements/${id}`), {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Silinsin mi?")) return;
    await fetch(apiJoin(`providers/me/announcements/${id}`), { method: "DELETE", headers: authHeaders() });
    await load();
  }

  if (loading && !list.length) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2 border-b pb-2">
          <Megaphone className="w-5 h-5 text-amber-600" />
          Yeni duyuru
        </h2>
        <p className="text-xs text-gray-600">
          Adres / çalışma saati değişikliği, kampanya veya genel bilgilendirme. Aktif ve “anasayfada göster” işaretli olanlar ziyaretçi anasayfasında listelenir.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tür</Label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={atype} onChange={(e) => setAtype(e.target.value)}>
              <option value="general">Genel</option>
              <option value="hours">Çalışma saati</option>
              <option value="address">Adres</option>
              <option value="campaign">Kampanya</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Başlık</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Metin</Label>
          <Textarea className="mt-1 min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <Button type="button" onClick={() => void add()} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Yayınla
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Yayında olanlar</h3>
        <ul className="divide-y">
          {list.map((a) => (
            <li key={a.id} className="py-3 flex flex-wrap gap-2 items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{a.title}</div>
                <div className="text-[10px] text-gray-400 uppercase">{a.announcement_type}</div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{a.body}</p>
                <div className="text-xs text-gray-400 mt-1">
                  {a.active ? "Aktif" : "Pasif"} · Anasayfa: {a.show_on_home ? "evet" : "hayır"}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => void toggle(a.id, a.active)}>
                  {a.active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void remove(a.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
          {!list.length && <li className="py-8 text-center text-gray-500 text-sm">Henüz duyuru yok.</li>}
        </ul>
      </div>
    </div>
  );
}
