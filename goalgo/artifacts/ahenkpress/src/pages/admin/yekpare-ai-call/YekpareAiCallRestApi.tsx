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
import { Loader2, Plus, RefreshCw, Trash2, Key, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
};

export default function YekpareAiCallRestApi() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callCenterProxy<{ success?: boolean; data?: ApiKeyRow[] }>("user/api-keys");
      if (!res.ok) {
        setError(proxyErrorMessage(res.data));
        setKeys([]);
        return;
      }
      const list = (res.data as { data?: ApiKeyRow[] }).data ?? [];
      setKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setSaving(true);
    try {
      const res = await callCenterProxy<{ success?: boolean; data?: { secret?: string; key?: ApiKeyRow } }>(
        "user/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: newKeyName, scopes: ["calls:read", "campaigns:read", "contacts:read"] }),
        },
      );
      if (!res.ok) {
        setError(proxyErrorMessage(res.data));
        return;
      }
      const secret = (res.data as { data?: { secret?: string } }).data?.secret;
      if (secret) setCreatedSecret(secret);
      setNewKeyName("");
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("API anahtarı silinsin mi?")) return;
    const res = await callCenterProxy(`user/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) setError(proxyErrorMessage(res.data));
    else await load();
  };

  const copySecret = () => {
    if (!createdSecret) return;
    void navigator.clipboard.writeText(createdSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <YekpareAiCallLayout title="REST API">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Harici sistemler için API anahtarları. REST uç noktaları:{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">/api/v1/*</code> (AgentLabs sunucusunda).
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Yenile
          </Button>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Anahtar oluştur
          </Button>
        </div>
      </div>

      {createdSecret ? (
        <Alert className="mt-4 border-green-200 bg-green-50">
          <AlertDescription className="text-sm">
            <p className="font-semibold text-green-900">Yeni anahtar — yalnızca bir kez gösterilir:</p>
            <code className="block mt-2 text-xs break-all bg-white p-2 rounded border">{createdSecret}</code>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={copySecret}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Kopyala
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

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
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <Key className="w-10 h-10 mx-auto mb-2 opacity-40" />
            API anahtarı yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Önek</TableHead>
                <TableHead>Kapsam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{(k.scopes ?? []).join(", ")}</TableCell>
                  <TableCell>
                    <Badge variant={k.isActive ? "default" : "secondary"}>{k.isActive ? "aktif" : "kapalı"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => void deleteKey(k.id)}>
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
            <DialogTitle>Yeni API anahtarı</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Ad</Label>
            <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="ör. CRM entegrasyonu" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button type="button" disabled={saving || !newKeyName.trim()} onClick={() => void createKey()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YekpareAiCallLayout>
  );
}
