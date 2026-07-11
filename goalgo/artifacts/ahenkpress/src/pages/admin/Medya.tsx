import { AdminLayout } from "@/components/AdminLayout";
import { YekpareMediaBrowser } from "@/components/YekpareMediaBrowser";

export default function Medya() {
  return (
    <AdminLayout title="Medya">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Medya kütüphanesi</h1>
        <p className="mt-1 text-sm text-gray-500">Yekpare ortak medya — yüklemeler ve tüm sitelerin haber kapakları.</p>
      </div>
      <YekpareMediaBrowser />
    </AdminLayout>
  );
}
