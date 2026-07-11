import { AdminLayout } from "@/components/AdminLayout";
import { Link } from "wouter";

export default function KasiyerAdmin() {
  return (
    <AdminLayout title="Kasiyer (POS)">
      <div className="max-w-xl space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold mb-1">Kasiyer ekranı yönetici menüsünde değil</p>
          <p className="text-amber-900/90 leading-relaxed">
            POS, işletme oturumu ile çalışır. Lütfen{" "}
            <Link href="/servis-saglayici-giris" className="font-bold text-amber-950 underline">
              servis sağlayıcı girişi
            </Link>{" "}
            yapıp panelde <strong>Kasiyer</strong> sekmesine gidin veya doğrudan kasiyer ekranını açın.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/kasiyer"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
          >
            Kasiyer ekranını aç (/kasiyer)
          </a>
          <Link
            href="/servis-saglayici-giris"
            className="inline-flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            İşletme paneline git
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
