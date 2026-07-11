import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchWebphoneToken, AGENT_TOKEN_KEY } from "@/lib/pbxApi";

type Props = {
  initialUrl?: string | null;
  extension?: string | null;
};

export function VerimorWebphone({ initialUrl, extension }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(!initialUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem(AGENT_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    void fetchWebphoneToken(token)
      .then((wp) => {
        setUrl(wp.url);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Web telefon yüklenemedi");
      })
      .finally(() => setLoading(false));
  }, [initialUrl]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-slate-900 text-white p-8 flex flex-col items-center justify-center min-h-[420px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <p className="text-sm text-slate-400">Verimor web telefonu yükleniyor…</p>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="rounded-xl border bg-slate-900 text-white p-6 min-h-[200px]">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Verimor Softphone</p>
        <p className="text-sm text-red-400 mt-2">{error ?? "Web telefon bağlantısı kurulamadı."}</p>
        <p className="text-xs text-slate-500 mt-2">
          OIM&apos;de dahili için personel hesabı açılmış olmalıdır.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden bg-slate-900">
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Verimor Web Telefonu</p>
          <p className="text-sm font-medium text-white">{extension ? `Dahili ${extension}` : "Bulutsantralim"}</p>
        </div>
        <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5">Canlı</span>
      </div>
      <iframe
        title="Verimor Web Telefonu"
        src={url}
        width="100%"
        height="700"
        style={{ border: "none", display: "block" }}
        allow="microphone"
      />
    </div>
  );
}
