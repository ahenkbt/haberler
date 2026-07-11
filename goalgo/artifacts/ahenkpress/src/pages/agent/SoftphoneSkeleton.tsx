/**
 * WebRTC softphone iskeleti — sip.js entegrasyonu sonraki fazda tamamlanacak.
 * Şimdilik UI yer tutucu ve bağlantı durumu gösterir.
 */
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type Props = {
  extension?: string | null;
  disabled?: boolean;
  mode?: "demo" | "sip_trunk";
};

export function SoftphoneSkeleton({ extension, disabled, mode = "demo" }: Props) {
  const [dialNumber, setDialNumber] = useState("");
  const [muted, setMuted] = useState(false);
  const [inCall, setInCall] = useState(false);

  return (
    <div className="rounded-xl border bg-slate-900 text-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Softphone</p>
          <p className="text-sm font-medium">{extension ? `Dahili ${extension}` : "Dahili atanmadı"}</p>
        </div>
        <span className="text-[10px] rounded bg-amber-500/20 text-amber-300 px-2 py-0.5">
          {mode === "sip_trunk" ? "SIP trunk" : "sip.js — yakında"}
        </span>
      </div>

      <Input
        value={dialNumber}
        onChange={(e) => setDialNumber(e.target.value)}
        placeholder="Numara girin"
        className="bg-slate-800 border-slate-700 text-white font-mono"
        disabled={disabled}
      />

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => setDialNumber((n) => n + d)}
            className="rounded-lg bg-slate-800 py-2 text-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={disabled || !dialNumber}
          onClick={() => setInCall(true)}
        >
          <Phone className="w-4 h-4" />
          Ara
        </Button>
        <Button
          variant="destructive"
          className="gap-2"
          disabled={!inCall}
          onClick={() => setInCall(false)}
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          className="border-slate-600 text-white hover:bg-slate-800"
          disabled={!inCall}
          onClick={() => setMuted(!muted)}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      </div>

      {inCall ? (
        <p className="text-xs text-emerald-400 text-center">Demo: {dialNumber} aranıyor… (gerçek SIP henüz bağlı değil)</p>
      ) : mode === "sip_trunk" ? (
        <p className="text-xs text-slate-400 text-center">
          Tarayıcı softphone yok — dahili {extension ?? "—"} fiziksel IP telefon veya harici uygulama ile kullanılır.
          Panelden durum ve kampanya yönetebilirsiniz.
        </p>
      ) : (
        <p className="text-xs text-slate-500 text-center">WebRTC + sip.js — Asterisk PJSIP/WSS yapılandırması gerekir</p>
      )}
    </div>
  );
}
