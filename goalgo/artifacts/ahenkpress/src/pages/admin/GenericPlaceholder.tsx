import { AdminLayout } from "@/components/AdminLayout";

export default function GenericPlaceholder({ title }: { title: string }) {
  return (
    <AdminLayout title={title}>
      <div className="bg-white rounded-md shadow-sm border p-12 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-2">{title}</h2>
        <p className="text-gray-500">Bu modül yapım aşamasındadır.</p>
      </div>
    </AdminLayout>
  );
}