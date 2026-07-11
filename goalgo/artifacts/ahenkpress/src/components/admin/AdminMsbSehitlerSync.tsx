import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminFetchErrorHint, postAdminJson } from "@/lib/apiBase";

type SyncResult = {
  added: number;
  updated: number;
  total: number;
  fetchedAt: string;
  scraped?: number;
  msbScrapeError?: string;
};

export function AdminMsbSehitlerSync() {
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await postAdminJson("/api/msb/sehitlerimiz/sync", {});
      let j: { success?: boolean; data?: SyncResult; error?: string } = {};
      try {
        j = (await r.json()) as typeof j;
      } catch {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? adminFetchErrorHint(`HTTP ${r.status}`));
      }
      return j.data;
    },
    onSuccess: (data) => {
      const scrapeNote =
        data.msbScrapeError != null
          ? ` MSB kazıması atlandı: ${data.msbScrapeError}`
          : data.scraped != null
            ? ` MSB: ${data.scraped} yeni kayıt tarandı.`
            : "";
      toast({
        title: "Şehit listesi güncellendi",
        description: `${data.added} yeni kayıt, ${data.updated} güncellendi. Toplam: ${data.total}.${scrapeNote}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "MSB senkronizasyonu başarısız",
        description: adminFetchErrorHint(err.message),
        variant: "destructive",
      });
    },
  });

  return (
    <section className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-red-900">VKD · Şehitlerimiz verisi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-950/80">
            Mehmetçik arşivi (202 kayıt) repoda yüklüdür; MSB&apos;den Ekim 2025 sonrası kayıtlar kazınır. Liste{" "}
            <strong>/sehitlerimiz</strong> sayfasında görünür. Bu işlem yalnızca Yekpare yönetici panelinden çalışır.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2 bg-red-700 text-white hover:bg-red-800"
          disabled={syncMutation.isPending}
          onClick={() => void syncMutation.mutate()}
        >
          {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Şehitleri Getir
        </Button>
      </div>
    </section>
  );
}
