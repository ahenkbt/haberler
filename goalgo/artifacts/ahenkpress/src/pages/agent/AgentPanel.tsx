import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  agentSetStatus,
  acceptTransfer,
  fetchPendingTransfers,
  fetchAgentSipCredentials,
  AGENT_TOKEN_KEY,
  AGENT_BACKEND_KEY,
  AGENT_SIP_CONFIG_KEY,
  fetchAgentMe,
  fetchAgentCampaigns,
  joinAgentCampaign,
  leaveAgentCampaign,
  statusBadgeClass,
  type PbxAgent,
  type PbxCampaign,
  type PbxPendingTransfer,
} from "@/lib/pbxApi";
import { SoftphoneSkeleton } from "./SoftphoneSkeleton";
import { SipSoftphone, normalizeSipConfig, type SipConfig } from "./SipSoftphone";
import { Headphones, LogOut, Coffee, Phone, Pause, PhoneOff, Sparkles, LogIn } from "lucide-react";
import { usePbxPwaHead } from "./usePbxPwaHead";
import { PbxInstallBanner } from "./PbxInstallBanner";

const STATUS_BUTTONS = [
  { status: "available", label: "Çağrı Bekliyor", icon: Phone, color: "bg-emerald-600" },
  { status: "break", label: "Molada", icon: Coffee, color: "bg-amber-600" },
  { status: "paused", label: "Çağrı Alımı Kapalı", icon: Pause, color: "bg-slate-600" },
  { status: "wrap_up", label: "Sonuçlandırma", icon: PhoneOff, color: "bg-violet-600" },
  { status: "offline", label: "Çıkış", icon: LogOut, color: "bg-red-700" },
] as const;

export default function AgentPanel() {
  const [, setLocation] = useLocation();
  usePbxPwaHead(true);
  const [agent, setAgent] = useState<PbxAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTransfers, setPendingTransfers] = useState<PbxPendingTransfer[]>([]);
  const [acceptBusy, setAcceptBusy] = useState<string | null>(null);
  const [backend, setBackend] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(AGENT_BACKEND_KEY) : null,
  );
  const [sipConfig, setSipConfig] = useState<SipConfig | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(AGENT_SIP_CONFIG_KEY) ?? sessionStorage.getItem(AGENT_SIP_CONFIG_KEY);
    if (!raw) return null;
    try {
      return normalizeSipConfig(JSON.parse(raw) as Partial<SipConfig> & { sipSecret?: string });
    } catch {
      return null;
    }
  });
  const [campaigns, setCampaigns] = useState<PbxCampaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignBusy, setCampaignBusy] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem(AGENT_TOKEN_KEY) : null;

  const persistSipConfig = useCallback((creds: SipConfig | (Partial<SipConfig> & { sipSecret?: string })) => {
    const normalized = normalizeSipConfig(creds);
    if (!normalized) return;
    const json = JSON.stringify(normalized);
    localStorage.setItem(AGENT_SIP_CONFIG_KEY, json);
    sessionStorage.setItem(AGENT_SIP_CONFIG_KEY, json);
    setSipConfig(normalized);
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setLocation("/pbx");
      return;
    }
    try {
      const me = await fetchAgentMe(token);
      setAgent(me);
      const storedBackend = localStorage.getItem(AGENT_BACKEND_KEY);
      if (storedBackend === "verimor" || storedBackend === "local") {
        try {
          const c = await fetchAgentCampaigns(token);
          setCampaigns(c.campaigns);
          setActiveCampaignId(c.activeCampaign?.id ?? me.activeCampaignId ?? null);
        } catch {
          /* kampanya listesi yüklenemese de oturum açık kalsın */
        }
        const hasStoredSip =
          localStorage.getItem(AGENT_SIP_CONFIG_KEY) ?? sessionStorage.getItem(AGENT_SIP_CONFIG_KEY);
        if (!hasStoredSip) {
          try {
            const creds = await fetchAgentSipCredentials(token);
            if (creds) persistSipConfig(creds);
          } catch {
            /* WSS yapılandırılmamış olabilir */
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Oturum geçersiz") || message.includes("Oturum gerekli")) {
        localStorage.removeItem(AGENT_TOKEN_KEY);
        localStorage.removeItem(AGENT_BACKEND_KEY);
        localStorage.removeItem(AGENT_SIP_CONFIG_KEY);
        sessionStorage.removeItem(AGENT_SIP_CONFIG_KEY);
        setLocation("/pbx");
      }
    } finally {
      setLoading(false);
    }
  }, [token, setLocation, persistSipConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || agent?.status === "offline") return;
    const poll = async () => {
      try {
        setPendingTransfers(await fetchPendingTransfers(token));
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = setInterval(() => void poll(), 4000);
    return () => clearInterval(t);
  }, [token, agent?.status]);

  const acceptIncomingTransfer = async (transferId: string) => {
    if (!token) return;
    setAcceptBusy(transferId);
    try {
      await acceptTransfer(token, transferId);
      const updated = await fetchAgentMe(token);
      setAgent(updated);
      setPendingTransfers((prev) => prev.filter((t) => t.id !== transferId));
    } finally {
      setAcceptBusy(null);
    }
  };

  const setStatus = async (status: string) => {
    if (!token) return;
    if (status === "offline") {
      await agentSetStatus(token, status);
      localStorage.removeItem(AGENT_TOKEN_KEY);
      localStorage.removeItem(AGENT_BACKEND_KEY);
      localStorage.removeItem(AGENT_SIP_CONFIG_KEY);
      sessionStorage.removeItem(AGENT_SIP_CONFIG_KEY);
      setLocation("/pbx");
      return;
    }
    const updated = await agentSetStatus(token, status);
    setAgent(updated);
  };

  const toggleCampaign = async (campaign: PbxCampaign) => {
    if (!token) return;
    setCampaignBusy(campaign.id);
    try {
      if (activeCampaignId === campaign.id) {
        const updated = await leaveAgentCampaign(token);
        setAgent(updated);
        setActiveCampaignId(null);
      } else {
        const updated = await joinAgentCampaign(token, campaign.id);
        setAgent(updated);
        setActiveCampaignId(campaign.id);
      }
    } finally {
      setCampaignBusy(null);
    }
  };

  const isVerimor = backend === "verimor";
  const isLocalTrunk = backend === "local";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Yükleniyor…</p>
      </div>
    );
  }

  if (!agent) return null;

  const statusLabel =
    agent.status === "available"
      ? "Çağrı Bekliyor"
      : agent.status === "paused"
        ? "Çağrı Alımı Kapalı"
        : agent.statusLabelTr;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          <span className="font-semibold">{agent.displayName}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 ${statusBadgeClass(agent.status)}`}>{statusLabel}</span>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => void setStatus("offline")}>
          <LogOut className="w-4 h-4 mr-1" />
          Çıkış
        </Button>
      </header>

      <div className="max-w-5xl mx-auto p-4 grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <PbxInstallBanner />

          {isVerimor || isLocalTrunk ? (
            <SipSoftphone
              config={sipConfig}
              label={isLocalTrunk ? "SIP Trunk Softphone" : "Verimor Softphone"}
              missingConfigMessage={
                isLocalTrunk ? "SIP WSS yapılandırın" : "Verimor dahili bilgisi yüklenemedi."
              }
            />
          ) : (
            <SoftphoneSkeleton
              extension={agent.extension ?? agent.extensionId}
              disabled={agent.status === "offline"}
              mode="demo"
            />
          )}

          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900">Durum</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Button
                    key={btn.status}
                    size="sm"
                    className={`gap-1 ${agent.status === btn.status ? btn.color : ""}`}
                    variant={agent.status === btn.status ? "default" : "outline"}
                    onClick={() => void setStatus(btn.status)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {btn.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {pendingTransfers.length > 0 ? (
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-700" />
                <h2 className="font-semibold text-violet-900">AI&apos;dan Aktarılan Arama</h2>
                <Badge className="ml-auto bg-violet-600">{pendingTransfers.length}</Badge>
              </div>
              {pendingTransfers.map((tr) => (
                <div key={tr.id} className="rounded-lg border border-violet-200 bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono font-medium">{tr.phone || "Numara gizli"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {tr.aiCampaignName || tr.aiCampaignId}
                    </Badge>
                    {tr.queueName ? (
                      <span className="text-xs text-gray-500">Kuyruk: {tr.queueName}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{tr.summary}</p>
                  <Button
                    size="sm"
                    className="bg-violet-700 hover:bg-violet-800"
                    disabled={acceptBusy === tr.id || agent.status === "on_call"}
                    onClick={() => void acceptIncomingTransfer(tr.id)}
                  >
                    {acceptBusy === tr.id ? "Alınıyor…" : "Aramayı Kabul Et"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {isVerimor || isLocalTrunk ? (
            <div className="rounded-xl border-2 border-[#1e3a5f]/20 bg-white p-4 shadow-sm space-y-3">
              <h2 className="font-semibold text-gray-900">Kampanyalar</h2>
              <p className="text-xs text-gray-500">
                {isLocalTrunk
                  ? "SIP trunk temsilci — tarayıcı softphone ile arayın; kampanyaya katılın."
                  : "Yekpare'de oluşturulan kampanyaya katılın — softphone kayıtlı kalır, çağrı almaya başlarsınız."}
              </p>
              {campaigns.length === 0 ? (
                <p className="text-sm text-gray-500">Aktif kampanya yok. Admin panelden kampanya oluşturup durumu &quot;running&quot; yapın.</p>
              ) : (
                campaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.campaignTypeLabelTr} · {c.status}</p>
                    </div>
                    <Button
                      size="sm"
                      className={activeCampaignId === c.id ? "bg-emerald-700" : ""}
                      variant={activeCampaignId === c.id ? "default" : "outline"}
                      disabled={campaignBusy === c.id}
                      onClick={() => void toggleCampaign(c)}
                    >
                      <LogIn className="w-3.5 h-3.5 mr-1" />
                      {activeCampaignId === c.id ? "Ayrıl" : "Katıl"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
