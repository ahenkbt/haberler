import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
  Building,
  Calendar,
} from "lucide-react";

export default function ResmiIlanlar() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", institution: "", deadline: "", imageUrl: "", pdfUrl: "", status: "active" });

  const { data: ilanlarData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/resmi-ilanlar"],
    queryFn: () => apiRequest("/api/resmi-ilanlar").then(asArray),
  });
  const ilanlar = asArray(ilanlarData);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/resmi-ilanlar", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/resmi-ilanlar"] }); setShowForm(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/resmi-ilanlar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/resmi-ilanlar"] }); setEditItem(null); setShowForm(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/resmi-ilanlar/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/resmi-ilanlar"] }),
  });

  const resetForm = () => setForm({ title: "", content: "", institution: "", deadline: "", imageUrl: "", pdfUrl: "", status: "active" });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ title: item.title, content: item.content, institution: item.institution, deadline: item.deadline, imageUrl: item.imageUrl, pdfUrl: item.pdfUrl, status: item.status });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <AdminLayout title="Resmi İlanlar">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resmi İlanlar</h1>
            <p className="text-gray-500 text-sm mt-1">Kurum ve kuruluşların resmi ilanlarını yönetin.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => { resetForm(); setEditItem(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni İlan
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Yükleniyor...
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İlan</TableHead>
                  <TableHead>Kurum</TableHead>
                  <TableHead>Son Başvuru</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ilanlar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400">
                      Henüz resmi ilan yok
                    </TableCell>
                  </TableRow>
                ) : (
                  ilanlar.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-12 h-9 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-9 rounded bg-gray-100 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.pdfUrl && (
                              <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">PDF Görüntüle</a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          {item.institution || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {item.deadline || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={item.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                          {item.status === "active" ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm("İlanı silinsin mi?")) deleteMutation.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditItem(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "İlan Düzenle" : "Yeni Resmi İlan Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>İlan Başlığı *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="İlan başlığı" className="mt-1" />
            </div>
            <div>
              <Label>İlan İçeriği</Label>
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="İlan metni..." rows={4} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kurum Adı</Label>
                <Input value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} placeholder="Kurum adı" className="mt-1" />
              </div>
              <div>
                <Label>Son Başvuru Tarihi</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Görsel URL</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label>PDF URL</Label>
              <Input value={form.pdfUrl} onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))} placeholder="https://...pdf" className="mt-1" />
            </div>
            <div>
              <Label>Durum</Label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full mt-1 border rounded-md px-3 py-2 text-sm">
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditItem(null); resetForm(); }}>İptal</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editItem ? "Güncelle" : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
