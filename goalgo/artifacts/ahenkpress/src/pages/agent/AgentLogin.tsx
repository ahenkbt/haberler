import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentLogin, AGENT_TOKEN_KEY, AGENT_BACKEND_KEY, AGENT_SIP_CONFIG_KEY } from "@/lib/pbxApi";
import { normalizeSipConfig } from "./SipSoftphone";
import { Headphones, Loader2 } from "lucide-react";
import { usePbxPwaHead } from "./usePbxPwaHead";
import { PbxInstallBanner } from "./PbxInstallBanner";

export default function AgentLogin() {
  const [, setLocation] = useLocation();
  usePbxPwaHead(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await agentLogin(username.trim(), password);
      localStorage.setItem(AGENT_TOKEN_KEY, result.token);
      if (result.backend) localStorage.setItem(AGENT_BACKEND_KEY, result.backend);
      if (result.sip) {
        const normalized = normalizeSipConfig(result.sip);
        if (normalized) {
          const json = JSON.stringify(normalized);
          localStorage.setItem(AGENT_SIP_CONFIG_KEY, json);
          sessionStorage.setItem(AGENT_SIP_CONFIG_KEY, json);
        } else {
          localStorage.removeItem(AGENT_SIP_CONFIG_KEY);
          sessionStorage.removeItem(AGENT_SIP_CONFIG_KEY);
        }
      } else {
        localStorage.removeItem(AGENT_SIP_CONFIG_KEY);
        sessionStorage.removeItem(AGENT_SIP_CONFIG_KEY);
      }
      setLocation("/pbx/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1e3a5f] to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex rounded-full bg-[#1e3a5f]/10 p-3 mb-3">
            <Headphones className="w-8 h-8 text-[#1e3a5f]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">PBX Temsilci Girişi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Yekpare kullanıcı adı ve şifre — Verimor softphone veya SIP trunk temsilci
          </p>
        </div>

        <PbxInstallBanner />

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <Label htmlFor="username">Kullanıcı adı</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="ofis"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Admin panelden tanımlanan Yekpare kullanıcı adı (SIP şifresi değil)</p>
          </div>
          <div>
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#152a45]" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Giriş yap
          </Button>
        </form>

        {!import.meta.env.PROD ? (
          <p className="text-xs text-center text-gray-400">
            Demo: <code className="bg-gray-100 px-1 rounded">ayse</code> /{" "}
            <code className="bg-gray-100 px-1 rounded">agent123</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
