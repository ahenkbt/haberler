import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type LoginCaptchaValue = {
  token: string;
  answer: string;
};

type Props = {
  value: LoginCaptchaValue;
  onChange: (next: LoginCaptchaValue) => void;
  variant?: "dark" | "light";
};

export function LoginMathCaptcha({ value, onChange, variant = "dark" }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const light = variant === "light";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/public/login-captcha"), { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("captcha");
      const j = (await r.json()) as { token?: string; question?: string };
      const token = String(j.token ?? "").trim();
      const q = String(j.question ?? "").trim();
      if (!token || !q) throw new Error("captcha");
      setQuestion(q);
      onChange({ token, answer: "" });
    } catch {
      setQuestion("Yüklenemedi — yenileyin");
      onChange({ token: "", answer: "" });
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label
          className={
            light
              ? "block text-slate-500 text-xs font-bold tracking-wide"
              : "text-slate-400 text-xs uppercase font-bold"
          }
        >
          Güvenlik doğrulaması
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={
            light
              ? "h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-800"
              : "h-7 gap-1 px-2 text-xs text-slate-400 hover:text-slate-200"
          }
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Yeni soru"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yeni soru
        </Button>
      </div>
      <p
        className={`mb-1.5 font-mono text-sm ${light ? "text-slate-800" : "text-slate-200"}`}
        aria-live="polite"
      >
        {loading ? "…" : question}
      </p>
      <Input
        type="number"
        inputMode="numeric"
        value={value.answer}
        onChange={(e) => onChange({ ...value, answer: e.target.value })}
        placeholder="Sonuç"
        className={
          light
            ? "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
            : "bg-slate-950 border-slate-700 text-white"
        }
        autoComplete="off"
        required
        disabled={loading || !value.token}
      />
    </div>
  );
}
