import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PANEL_PERMISSION_CATALOG } from "@/lib/panelPermissionsCatalog";
import type { PanelPermissionId } from "@/lib/panelPermissionsCatalog";

type Row = {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions: PanelPermissionId[] | null;
};

function permSetFromRow(p: Row | null, full: boolean): Set<PanelPermissionId> {
  const s = new Set<PanelPermissionId>();
  if (full || p?.permissions == null) return s;
  for (const x of p.permissions ?? []) s.add(x);
  return s;
}

export default function PanelHesaplari() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newFull, setNewFull] = useState(true);
  const [newPerms, setNewPerms] = useState<Set<PanelPermissionId>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editFull, setEditFull] = useState(true);
  const [editPerms, setEditPerms] = useState<Set<PanelPermissionId>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch(apiUrl("/api/members/panel-admins"));
      const j = (await r.json()) as { success?: boolean; data?: Row[] };
      if (r.ok && j.success) setRows(j.data ?? []);
      else toast({ title: "Liste alınamadı", variant: "destructive" });
    } catch {
      toast({ title: "Ağ hatası", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function togglePerm(setter: React.Dispatch<React.SetStateAction<Set<PanelPermissionId>>>, id: PanelPermissionId) {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.trim() || newPass.length < 6) {
      toast({ title: "Kullanıcı adı ve en az 6 karakter şifre gerekli.", variant: "destructive" });
      return;
    }
    if (!newFull && newPerms.size === 0) {
      toast({ title: "Alt yönetici için en az bir yetki seçin veya tam yetkili işaretleyin.", variant: "destructive" });
      return;
    }
    try {
      const body: Record<string, unknown> = {
        username: newUser.trim(),
        email: newEmail.trim() || null,
        password: newPass,
      };
      if (!newFull) body.permissions = [...newPerms];
      const r = await apiFetch(apiUrl("/api/members/panel-admins"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!r.ok) {
        toast({ title: j.error || "Kayıt başarısız", variant: "destructive" });
        return;
      }
      toast({ title: "Yönetici eklendi" });
      setNewUser("");
      setNewEmail("");
      setNewPass("");
      setNewFull(true);
      setNewPerms(new Set());
      void load();
    } catch {
      toast({ title: "İstek başarısız", variant: "destructive" });
    }
  }

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditUser(r.username);
    setEditEmail(r.email ?? "");
    setEditPass("");
    const full = r.permissions == null;
    setEditFull(full);
    setEditPerms(permSetFromRow(r, full));
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      if (!editFull && editPerms.size === 0) {
        toast({ title: "En az bir yetki seçin veya tam yetkili yapın.", variant: "destructive" });
        return;
      }
      const body: Record<string, unknown> = {
        username: editUser.trim(),
        email: editEmail.trim() || null,
      };
      if (editPass.length > 0) body.password = editPass;
      body.permissions = editFull ? null : [...editPerms];
      const r = await apiFetch(apiUrl(`/api/members/panel-admins/${editId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!r.ok) {
        toast({ title: j.error || "Güncellenemedi", variant: "destructive" });
        return;
      }
      toast({ title: "Güncellendi" });
      setEditId(null);
      void load();
    } catch {
      toast({ title: "İstek başarısız", variant: "destructive" });
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm("Bu yönetici hesabını silmek istediğinize emin misiniz?")) return;
    try {
      const r = await apiFetch(apiUrl(`/api/members/panel-admins/${id}`), { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!r.ok) {
        toast({ title: j.error || "Silinemedi", variant: "destructive" });
        return;
      }
      toast({ title: "Silindi" });
      void load();
    } catch {
      toast({ title: "İstek başarısız", variant: "destructive" });
    }
  }

  async function toggleActive(r: Row) {
    try {
      const r2 = await apiFetch(apiUrl(`/api/members/panel-admins/${r.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      const j = (await r2.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!r2.ok) {
        toast({ title: j.error || "Güncellenemedi", variant: "destructive" });
        return;
      }
      void load();
    } catch {
      toast({ title: "İstek başarısız", variant: "destructive" });
    }
  }

  return (
    <AdminLayout title="Panel hesapları">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yönetici paneli hesapları</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tam yetkili tüm menüyü görür. Alt yönetici için aşağıdan izin seçin; giriş kullanıcı adı veya e-posta ile yapılır.
          </p>
        </div>

        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900">Yeni hesap</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Kullanıcı adı *</Label>
              <Input className="mt-1" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="admin veya e-posta" />
            </div>
            <div>
              <Label>E-posta (isteğe bağlı)</Label>
              <Input className="mt-1" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ornek@turknet.app" />
            </div>
          </div>
          <div>
            <Label>Şifre * (en az 6 karakter)</Label>
            <Input className="mt-1" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input type="checkbox" checked={newFull} onChange={(e) => setNewFull(e.target.checked)} className="rounded border-gray-300" />
            Tam yetkili (ana yönetici)
          </label>
          {!newFull ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs font-bold text-gray-500 uppercase">Yetkiler</p>
              {PANEL_PERMISSION_CATALOG.map((p) => (
                <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-300"
                    checked={newPerms.has(p.id)}
                    onChange={() => togglePerm(setNewPerms, p.id)}
                  />
                  <span>
                    <span className="font-medium text-gray-800">{p.label}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">{p.id}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          <Button type="submit">Hesap oluştur</Button>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">Kayıtlı hesaplar</div>
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Yükleniyor…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Henüz kayıt yok (ilk girişte env’den oluşturulmuş olabilir; sayfayı yenileyin).</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{r.username}</p>
                    <p className="text-xs text-gray-500">
                      {r.email || "— e-posta"} · {r.isActive ? "Aktif" : "Pasif"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {r.permissions == null ? (
                        <span className="font-semibold text-green-700">Tam yetkili</span>
                      ) : r.permissions.length === 0 ? (
                        <span className="text-amber-700">İzin atanmamış</span>
                      ) : (
                        <span>İzinler: {r.permissions.join(", ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editId === r.id ? (
                      <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[280px]">
                        <Input className="h-9" value={editUser} onChange={(e) => setEditUser(e.target.value)} placeholder="Kullanıcı adı" />
                        <Input className="h-9" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="E-posta" />
                        <Input className="h-9" type="password" value={editPass} onChange={(e) => setEditPass(e.target.value)} placeholder="Yeni şifre" />
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <input type="checkbox" checked={editFull} onChange={(e) => setEditFull(e.target.checked)} />
                          Tam yetkili
                        </label>
                        {!editFull ? (
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                            {PANEL_PERMISSION_CATALOG.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editPerms.has(p.id)}
                                  onChange={() => togglePerm(setEditPerms, p.id)}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => void saveEdit()}>
                            Kaydet
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => startEdit(r)}>
                          Düzenle
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(r)}>
                          {r.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => void removeRow(r.id)}>
                          Sil
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
