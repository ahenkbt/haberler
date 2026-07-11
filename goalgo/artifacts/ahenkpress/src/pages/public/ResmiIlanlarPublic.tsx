import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";
import { FileText, Building, Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function Header() {
  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">Yekpare</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-primary">Anasayfa</Link>
            <Link href="/kesfet" className="hover:text-primary">Keşfet</Link>
            <Link href="/resmi-ilanlar" className="text-primary font-semibold">Resmi İlanlar</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function ResmiIlanlarPublic() {
  const { data: ilanlar = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/resmi-ilanlar"],
    queryFn: () => apiRequest("/api/resmi-ilanlar"),
  });

  const active = ilanlar.filter((i: any) => i.status === "active");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary">Anasayfa</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Resmi İlanlar</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <h1 className="text-2xl font-bold text-gray-900">Resmi İlanlar</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Henüz resmi ilan yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((item: any) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex gap-4 p-4">
                {item.imageUrl && (
                  <div className="w-24 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                {!item.imageUrl && (
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{item.title}</h3>
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        PDF
                      </a>
                    )}
                  </div>
                  {item.content && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {item.institution && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building className="w-3.5 h-3.5" />
                        {item.institution}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Son Başvuru: {item.deadline}
                      </span>
                    )}
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">Aktif</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-zinc-900 text-white mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-zinc-400">
          © 2025 Yekpare. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
