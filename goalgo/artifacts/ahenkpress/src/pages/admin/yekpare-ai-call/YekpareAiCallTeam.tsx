import { useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { callCenterProxy, proxyErrorMessage } from "@/lib/callCenterProxy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TeamMember = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName?: string;
  status: string;
  createdAt: string;
};

type TeamRole = {
  id: string;
  name: string;
  displayName?: string;
};

export default function YekpareAiCallTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roleId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memRes, roleRes] = await Promise.all([
        callCenterProxy<{ members?: TeamMember[] }>("team/members"),
        callCenterProxy<{ roles?: TeamRole[] }>("team/roles"),
      ]);
      if (!memRes.ok) {
        setError(proxyErrorMessage(memRes.data));
        setMembers([]);
      } else {
        setMembers(memRes.data.members ?? []);
      }
      if (roleRes.ok) {
        const r = roleRes.data.roles ?? [];
        setRoles(r);
        setForm((f) => (f.roleId ? f : { ...f, roleId: r[0]?.id ?? "" }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addMember = async () => {
    setSaving(true);
    try {
      const res = await callCenterProxy("team/members", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          roleId: form.roleId,
        }),
      });
      if (!res.ok) {
        setError(proxyErrorMessage(res.data));
        return;
      }
      setDialogOpen(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", roleId: roles[0]?.id ?? "" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Ekip üyesi silinsin mi?")) return;
    const res = await callCenterProxy(`team/members/${id}`, { method: "DELETE" });
    if (!res.ok) setError(proxyErrorMessage(res.data));
    else await load();
  };

  return (
    <YekpareAiCallLayout title="Ekip yönetimi">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-xl">
          Çağrı merkezi ekibinize ayrı girişler ve rol bazlı yetkiler tanımlayın.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Yenile
          </Button>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)} disabled={roles.length === 0}>
            <Plus className="w-4 h-4 mr-1" />
            Üye ekle
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 rounded-xl border bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Henüz ekip üyesi yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad / e-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </TableCell>
                  <TableCell>{m.roleName ?? m.roleId}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => void removeMember(m.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni ekip üyesi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>E-posta</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ad</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <Label>Soyad</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Şifre (min. 8)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName ?? r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button
              type="button"
              disabled={saving || !form.email || form.password.length < 8 || !form.roleId}
              onClick={() => void addMember()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YekpareAiCallLayout>
  );
}
