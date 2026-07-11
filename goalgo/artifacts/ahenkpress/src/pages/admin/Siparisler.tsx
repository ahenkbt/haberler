import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { ShoppingCart, Eye, Loader2, Search, Truck, Package, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Order {
  id: number;
  orderNumber: string;
  trackingCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerDistrict?: string;
  customerPostal?: string;
  billingName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingTaxId?: string;
  subtotal?: string;
  taxAmount?: string;
  totalAmount: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  cargoCompany?: string;
  cargoTrackingNumber?: string;
  cargoTrackingUrl?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  adminNote?: string;
  items?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  processing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Bekliyor", paid: "Ödendi", failed: "Başarısız", refunded: "İade Edildi",
};

export default function Siparisler() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    status: "", paymentStatus: "", notes: "", adminNote: "",
    cargoCompany: "", cargoTrackingNumber: "", cargoTrackingUrl: "", estimatedDelivery: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/shop/orders${q}`);
      const data = await res.json();
      setOrders(data.items ?? []);
    } catch { toast({ title: "Yüklenemedi", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (selected) {
      setEditForm({
        status: selected.status,
        paymentStatus: selected.paymentStatus,
        notes: selected.notes ?? "",
        adminNote: selected.adminNote ?? "",
        cargoCompany: selected.cargoCompany ?? "",
        cargoTrackingNumber: selected.cargoTrackingNumber ?? "",
        cargoTrackingUrl: selected.cargoTrackingUrl ?? "",
        estimatedDelivery: selected.estimatedDelivery ?? "",
      });
    }
  }, [selected]);

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/shop/orders/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const updated = await res.json();
      toast({ title: "Sipariş güncellendi" });
      setSelected(updated);
      load();
    } catch { toast({ title: "Güncellenemedi", variant: "destructive" }); }
    finally { setUpdating(false); }
  };

  const ef = (key: keyof typeof editForm, val: string) => setEditForm(f => ({ ...f, [key]: val }));

  const filtered = orders.filter(o =>
    !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.trackingCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.customerEmail.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.filter(o => o.status !== "cancelled" && o.paymentStatus === "paid")
    .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);

  const items = selected?.items ? JSON.parse(selected.items) : [];

  return (
    <AdminLayout title="Siparişler">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} sipariş
            {totalRevenue > 0 && <span className="ml-2 font-semibold text-green-700">• ₺{totalRevenue.toFixed(2)} tahsil edildi</span>}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = orders.filter(o => o.status === key).length;
          return (
            <div key={key} className={`p-3 rounded-lg border cursor-pointer transition-all ${statusFilter === key ? "ring-2 ring-[#e61e25]" : "hover:border-gray-300"}`}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}>
              <div className="text-2xl font-black">{count}</div>
              <div className={`text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${STATUS_COLORS[key]}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sipariş no, takip kodu, müşteri..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-md shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SİPARİŞ NO</TableHead>
              <TableHead>TAKİP KODU</TableHead>
              <TableHead>MÜŞTERİ</TableHead>
              <TableHead>TUTAR</TableHead>
              <TableHead>ÖDEME</TableHead>
              <TableHead>KARGO</TableHead>
              <TableHead>DURUM</TableHead>
              <TableHead>TARİH</TableHead>
              <TableHead className="text-right">DETAY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {search || statusFilter !== "all" ? "Filtreye uyan sipariş yok." : "Henüz sipariş yok."}
              </TableCell></TableRow>
            ) : (
              filtered.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs font-bold">{order.orderNumber}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{order.trackingCode || "-"}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{order.customerName}</div>
                    <div className="text-xs text-gray-400">{order.customerEmail}</div>
                  </TableCell>
                  <TableCell className="font-bold">₺{parseFloat(order.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.cargoCompany ? (
                      <div className="text-xs">
                        <div className="font-semibold text-purple-700">{order.cargoCompany}</div>
                        {order.cargoTrackingNumber && <div className="text-gray-400 font-mono">{order.cargoTrackingNumber}</div>}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}>
                      {STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(order)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#e61e25]" /> Sipariş #{selected?.orderNumber}
              {selected?.trackingCode && <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{selected.trackingCode}</span>}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
                <div><span className="text-xs text-gray-500 font-bold block">MÜŞTERİ</span>{selected.customerName}</div>
                <div><span className="text-xs text-gray-500 font-bold block">E-POSTA</span>{selected.customerEmail}</div>
                <div><span className="text-xs text-gray-500 font-bold block">TELEFON</span>{selected.customerPhone || "—"}</div>
                <div><span className="text-xs text-gray-500 font-bold block">TOPLAM</span><strong className="text-lg text-[#e61e25]">₺{parseFloat(selected.totalAmount).toFixed(2)}</strong></div>
                {selected.subtotal && <div><span className="text-xs text-gray-500 font-bold block">ARA TOPLAM</span>₺{parseFloat(selected.subtotal).toFixed(2)}</div>}
                {selected.taxAmount && <div><span className="text-xs text-gray-500 font-bold block">KDV</span>₺{parseFloat(selected.taxAmount).toFixed(2)}</div>}
                {selected.customerAddress && <div className="col-span-2"><span className="text-xs text-gray-500 font-bold block">TESLİMAT ADRESİ</span>{selected.customerAddress}{selected.customerDistrict ? `, ${selected.customerDistrict}` : ""}, {selected.customerCity} {selected.customerPostal}</div>}
                {selected.billingTaxId && <div><span className="text-xs text-gray-500 font-bold block">VERGİ NO / TC</span>{selected.billingTaxId}</div>}
              </div>

              {/* Order items */}
              {items.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2">Sipariş İçeriği</h4>
                  <div className="space-y-2">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">× {item.qty} adet</p>
                        </div>
                        <p className="text-sm font-bold">₺{item.total?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">SİPARİŞ DURUMU</label>
                  <Select value={editForm.status} onValueChange={v => ef("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">ÖDEME DURUMU</label>
                  <Select value={editForm.paymentStatus} onValueChange={v => ef("paymentStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Bekliyor</SelectItem>
                      <SelectItem value="paid">Ödendi</SelectItem>
                      <SelectItem value="failed">Başarısız</SelectItem>
                      <SelectItem value="refunded">İade Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cargo tracking */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-purple-600" /> Kargo Bilgileri</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">KARGO FİRMASI</label>
                    <Select value={editForm.cargoCompany || "_none"} onValueChange={v => ef("cargoCompany", v === "_none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Seçilmedi —</SelectItem>
                        <SelectItem value="Aras Kargo">Aras Kargo</SelectItem>
                        <SelectItem value="MNG Kargo">MNG Kargo</SelectItem>
                        <SelectItem value="Yurtiçi Kargo">Yurtiçi Kargo</SelectItem>
                        <SelectItem value="PTT Kargo">PTT Kargo</SelectItem>
                        <SelectItem value="Sürat Kargo">Sürat Kargo</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="Trendyol Express">Trendyol Express</SelectItem>
                        <SelectItem value="Diğer">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">KARGO TAKİP NO</label>
                    <Input value={editForm.cargoTrackingNumber} onChange={e => ef("cargoTrackingNumber", e.target.value)} placeholder="Takip numarası" className="font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">KARGO TAKİP URL</label>
                    <Input value={editForm.cargoTrackingUrl} onChange={e => ef("cargoTrackingUrl", e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">TAHMİNİ TESLİMAT</label>
                    <Input value={editForm.estimatedDelivery} onChange={e => ef("estimatedDelivery", e.target.value)} placeholder="3-5 iş günü" />
                  </div>
                </div>
                {editForm.cargoTrackingUrl && (
                  <a href={editForm.cargoTrackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Kargo takip sayfasını aç
                  </a>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">MÜŞTERİ NOTU</label>
                  <Input value={editForm.notes} onChange={e => ef("notes", e.target.value)} placeholder="Müşterinin notu..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">ADMİN NOTU (dahili)</label>
                  <Input value={editForm.adminNote} onChange={e => ef("adminNote", e.target.value)} placeholder="Dahili not..." />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpdate} disabled={updating} className="bg-[#e61e25] hover:bg-[#c9181e] text-white flex-1">
                  {updating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : "Değişiklikleri Kaydet"}
                </Button>
                {selected.trackingCode && (
                  <a href={`/siparis-takip/${selected.trackingCode}`} target="_blank" rel="noopener noreferrer"
                    className="border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-50 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" /> Müşteri Görünümü
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
