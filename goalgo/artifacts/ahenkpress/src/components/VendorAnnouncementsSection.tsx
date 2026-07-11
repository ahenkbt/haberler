export type VendorAnnouncementItem = {
  id: number;
  title: string;
  body: string;
  published_at?: string | null;
};

export function VendorAnnouncementsSection({ items }: { items: VendorAnnouncementItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
      <h2 className="text-sm font-black text-violet-950">İlanlar &amp; duyurular</h2>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-lg bg-white border border-violet-100 p-3 shadow-sm">
            <p className="font-bold text-gray-900 text-sm">{a.title}</p>
            <p className="text-xs text-gray-600 whitespace-pre-line mt-1 leading-relaxed">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
