import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MessageCircle, RefreshCw, CheckCircle, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function WhatsAppAyarlari() {
  const qc = useQueryClient();
  const [editVendor, setEditVendor] = useState<any>(null);
  const [waForm, setWaForm] = useState({ whatsapp: "", callmebot_key: "" });
  const [saved, setSaved] = useState(false);

  const { data: vendorsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/vendors-all"],
    queryFn: () => apiRequest("/api/delivery/vendors?limit=200").then(asArray),
  });
  const vendors = asArray(vendorsData);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/delivery/vendors/${id}/whatsapp`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-all"] });
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditVendor(null); }, 1500);
    },
  });

  const openEdit = (v: any) => {
    setEditVendor(v);
    setWaForm({ whatsapp: v.whatsapp || "", callmebot_key: v.callmebot_key || "" });
    setSaved(false);
  };

  return (
    <AdminLayout title="WhatsApp Bildirimleri">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bildirimleri</h1>
          <p className="text-gray-500 text-sm mt-1">
            Her işletme için WhatsApp numarası ve CallMeBot API anahtarı ayarlayın.
          </p>
        </div>

        {/* Bilgi kutusu */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">CallMeBot nasıl kurulur?</p>
            <p>1. İşletme sahibi WhatsApp'tan <strong>+34 644 59 77 35</strong>'e mesaj atsın: <em>"I allow callmebot to send me messages"</em></p>
            <p>2. Dönen API anahtarını aşağıdaki alana girin.</p>
            <p>API anahtarı olmadan sistem sadece <strong>wa.me linki</strong> üretir, otomatik bildirim gönderemez.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Yükleniyor...
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İşletme</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>CallMeBot</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400">İşletme yok</TableCell>
                  </TableRow>
                ) : vendors.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{v.name}</div>
                      <div className="text-xs text-gray-400">{v.city}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {v.vendorType === "delivery" ? "🛵 Teslimat" : "🛒 E-Ticaret"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.whatsapp ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> {v.whatsapp}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Ayarlanmadı</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {v.callmebot_key ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Aktif</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(v)}>
                        <MessageCircle className="w-3.5 h-3.5" /> Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editVendor} onOpenChange={(o) => { if (!o) setEditVendor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp Ayarları — {editVendor?.name}</DialogTitle>
          </DialogHeader>
          {saved ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-green-700 font-semibold">Kaydedildi!</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  WhatsApp Numarası (uluslararası format)
                </Label>
                <Input
                  placeholder="905551234567"
                  value={waForm.whatsapp}
                  onChange={(e) => setWaForm((f) => ({ ...f, whatsapp: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">Başında + olmadan: 90 5XX XXX XXXX</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  CallMeBot API Key (opsiyonel)
                </Label>
                <Input
                  placeholder="1234567"
                  value={waForm.callmebot_key}
                  onChange={(e) => setWaForm((f) => ({ ...f, callmebot_key: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">Otomatik bildirim için gerekli</p>
              </div>
              <Button
                className="w-full"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editVendor.id, data: waForm })}
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
