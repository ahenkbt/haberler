import { useState } from "react";
import { loadModuleFlags, saveModuleFlags, type YektubeModuleFlags } from "@/lib/adminApi";

const MODULES: { key: keyof YektubeModuleFlags; label: string; desc: string }[] = [
  { key: "longForm", label: "Uzun videolar", desc: "Ana feed ve kanal videoları" },
  { key: "shorts", label: "Yekçek", desc: "Dikey kısa video akışı" },
  { key: "podcasts", label: "Sesli günlük", desc: "Podcast / ses içerikleri" },
  { key: "live", label: "Canlı yayın", desc: "Canlı TV modülü" },
  { key: "music", label: "Müzik", desc: "Müzik kanalları, parça listesi ve mini oynatıcı" },
];

export function AdminModulesPage() {
  const [flags, setFlags] = useState<YektubeModuleFlags>(() => loadModuleFlags());
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof YektubeModuleFlags) => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Modüller</h1>
        <p className="text-sm text-zinc-400">
          Modül aç/kapa — site genelinde geçerli olması için tarayıcıda saklanır (aynı cihaz).
        </p>
      </div>

      <div className="space-y-2">
        {MODULES.map(({ key, label, desc }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
          >
            <div>
              <p className="font-medium text-white">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={() => toggle(key)}
              className="h-5 w-5 rounded border-zinc-600"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          saveModuleFlags(flags);
          setSaved(true);
        }}
        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
      >
        Kaydet
      </button>
      {saved ? <p className="text-sm text-emerald-400">Modül tercihleri kaydedildi (tarayıcı).</p> : null}
    </div>
  );
}
