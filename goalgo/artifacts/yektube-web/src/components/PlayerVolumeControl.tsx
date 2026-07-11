import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  readBackgroundPlayback,
  writeBackgroundPlayback,
  writePlaybackVolume,
} from "@/lib/yektubePlaybackPrefs";

type Props = {
  volume: number;
  muted: boolean;
  onVolumeChange: (level: number) => void;
  onMutedChange: (muted: boolean) => void;
  className?: string;
  /** Arka plan oynatma ayarını göster */
  showBackgroundToggle?: boolean;
};

export function PlayerVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  className,
  showBackgroundToggle = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [backgroundOn, setBackgroundOn] = useState(() => readBackgroundPlayback());
  const displayLevel = muted ? 0 : volume;

  const applyVolume = (n: number) => {
    const level = Math.min(1, Math.max(0, n));
    onVolumeChange(level);
    writePlaybackVolume(level);
    onMutedChange(level === 0);
  };

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={muted || volume === 0 ? "Sesi aç" : "Sessize al"}
        aria-expanded={expanded}
        onClick={() => {
          if (muted || volume === 0) {
            applyVolume(volume > 0 ? volume : 0.85);
            setExpanded(true);
            return;
          }
          setExpanded((v) => !v);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onMutedChange(!muted);
          if (!muted) onVolumeChange(volume);
        }}
        className="rounded p-1 hover:bg-white/15"
      >
        {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={displayLevel}
        aria-label="Ses seviyesi"
        className={cn(
          "h-1 accent-white transition-all",
          expanded ? "w-20 opacity-100" : "w-14 max-md:w-12 opacity-90",
        )}
        onChange={(e) => applyVolume(Number(e.target.value))}
        onFocus={() => setExpanded(true)}
      />
      {showBackgroundToggle && expanded ? (
        <label className="absolute bottom-full left-0 mb-2 flex max-w-[220px] cursor-pointer items-start gap-2 rounded-lg bg-black/90 px-3 py-2 text-[11px] leading-snug text-white shadow-lg backdrop-blur-sm">
          <input
            type="checkbox"
            checked={backgroundOn}
            onChange={(e) => {
              const next = e.target.checked;
              setBackgroundOn(next);
              writeBackgroundPlayback(next);
            }}
            className="mt-0.5"
          />
          <span>
            <strong className="font-semibold">Arka planda oynat</strong>
            <span className="mt-0.5 block text-white/70">Sekme değişince veya ekran kilitliyken ses devam eder</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
