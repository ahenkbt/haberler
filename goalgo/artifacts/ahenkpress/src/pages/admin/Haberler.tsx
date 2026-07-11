import { AdminLayout } from "@/components/AdminLayout";
import { HaberlerInner } from "@/pages/admin/HaberlerInner";

export default function Haberler() {
  return (
    <AdminLayout title="Haberler">
      <HaberlerInner />
    </AdminLayout>
  );
}
