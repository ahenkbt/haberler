import { useCallback, useEffect, useRef, useState } from "react";
import {
  UserAgent,
  Registerer,
  RegistererState,
  TransportState,
  Inviter,
  SessionState,
  Web,
  type Invitation,
} from "sip.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type SipConfig = {
  extension: string;
  password: string;
  domain: string;
  wssUrl: string;
  sipUri: string;
};

type Props = {
  config: SipConfig | null;
  onCallStateChange?: (inCall: boolean) => void;
  label?: string;
  missingConfigMessage?: string;
};

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

function normalizeWssUrl(url: string): string {
  const trimmed = url.trim();
  if (/bulutsantralim\.com/i.test(trimmed) && /:443(\/|$)/.test(trimmed)) {
    return trimmed.replace(/:443(\/|$)/, ":7443$1");
  }
  return trimmed;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const MEDIA_OPTIONS = {
  constraints: { audio: true, video: false } as MediaStreamConstraints,
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Login API may return `password` or legacy `sipSecret`. */
export function normalizeSipConfig(
  raw: (Partial<SipConfig> & { sipSecret?: string }) | null | undefined,
): SipConfig | null {
  if (!raw?.extension?.trim() || !raw.domain?.trim() || !raw.wssUrl?.trim()) return null;
  const password = String(raw.password ?? raw.sipSecret ?? "").trim();
  if (!password) return null;
  const extension = raw.extension.trim();
  const domain = raw.domain.trim();
  return {
    extension,
    password,
    domain,
    wssUrl: raw.wssUrl.trim(),
    sipUri: raw.sipUri?.trim() || `sip:${extension}@${domain}`,
  };
}

function formatOutboundSipUri(raw: string, domain: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (!digits.startsWith("90") && digits.length === 10) digits = `90${digits}`;
  return `sip:${digits}@${domain}`;
}

function sipRejectMessage(code: number): string {
  if (code === 403) return "Arama reddedildi — dahili dış arama yetkisi yok (403). Verimor panelinde dahiliye dış hat izni verin.";
  if (code === 404) return "Numara bulunamadı (404).";
  if (code === 480 || code === 408) return "Karşı taraf ulaşılamıyor.";
  if (code === 486 || code === 600) return "Karşı taraf meşgul.";
  if (code === 487) return "Arama iptal edildi.";
  if (code === 488) return "Medya müzakeresi başarısız — mikrofon iznini kontrol edin (488).";
  if (code === 603) return "Arama reddedildi.";
  return `Arama başarısız (SIP ${code || "bilinmeyen"}).`;
}

function logSoftphoneError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[SipSoftphone] ${context}:`, message);
}

function sipConfigKey(config: SipConfig): string {
  return `${config.extension}@${config.domain}|${normalizeWssUrl(config.wssUrl)}|${config.password}`;
}

function registerAndWait(registerer: Registerer, timeoutMs = 15000): Promise<void> {
  if (registerer.state === RegistererState.Registered) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      registerer.stateChange.removeListener(onState);
      reject(new Error("SIP kaydı zaman aşımına uğradı. WSS ve dahili şifresini kontrol edin."));
    }, timeoutMs);

    const onState = (state: RegistererState) => {
      if (state === RegistererState.Registered) {
        window.clearTimeout(timer);
        registerer.stateChange.removeListener(onState);
        resolve();
      }
    };

    registerer.stateChange.addListener(onState);
    registerer
      .register({
        requestDelegate: {
          onReject: (response) => {
            window.clearTimeout(timer);
            registerer.stateChange.removeListener(onState);
            const code = response.message.statusCode ?? 0;
            if (code === 401 || code === 403) {
              reject(new Error("SIP kimlik doğrulama başarısız — Verimor dahili şifresini kontrol edin."));
              return;
            }
            reject(new Error(`SIP kaydı reddedildi (${code || "bilinmeyen"})`));
          },
        },
      })
      .catch((err) => {
        window.clearTimeout(timer);
        registerer.stateChange.removeListener(onState);
        reject(err instanceof Error ? err : new Error("SIP kaydı başlatılamadı"));
      });
  });
}

export function SipSoftphone({
  config,
  onCallStateChange,
  label = "Softphone",
  missingConfigMessage = "SIP yapılandırması yüklenemedi.",
}: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "need_media" | "connecting" | "registered" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dialNumber, setDialNumber] = useState("");
  const [inCall, setInCall] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const uaRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Inviter | Invitation | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringbackStopRef = useRef<(() => void) | null>(null);
  const connectStartedRef = useRef(false);
  const callActiveRef = useRef(false);
  const remoteTrackCleanupRef = useRef<(() => void) | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const showError = useCallback(
    (message: string) => {
      setError(message);
      toast({ title: "Softphone", description: message, variant: "destructive" });
    },
    [toast],
  );

  const setCallState = useCallback(
    (active: boolean) => {
      callActiveRef.current = active;
      setInCall(active);
      onCallStateChange?.(active);
    },
    [onCallStateChange],
  );

  const stopRingback = useCallback(() => {
    ringbackStopRef.current?.();
    ringbackStopRef.current = null;
    setRinging(false);
  }, []);

  const startRingback = useCallback(() => {
    stopRingback();
    setRinging(true);
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      void ctx.resume().catch(() => undefined);

      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      gain.connect(ctx.destination);

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + duration);
      };

      let intervalId = 0;
      const cycle = () => {
        const t = ctx.currentTime;
        playTone(440, t, 2);
        playTone(480, t, 2);
      };
      cycle();
      intervalId = window.setInterval(cycle, 4000);

      ringbackStopRef.current = () => {
        window.clearInterval(intervalId);
        void ctx.close().catch(() => undefined);
      };
    } catch {
      /* fallback: silent ringback */
    }
  }, [stopRingback]);

  const unlockAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = true;
      await audio.play().catch(() => undefined);
      audio.muted = false;
    }
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    const live = localStreamRef.current?.getAudioTracks().some((t) => t.readyState === "live");
    if (localStreamRef.current && live) return localStreamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Bu tarayıcı mikrofon desteklemiyor. HTTPS ve güncel Chrome/Safari kullanın.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: false,
    });
    localStreamRef.current = stream;
    setMediaReady(true);
    await unlockAudio();
    return stream;
  }, [unlockAudio]);

  const getPeerConnection = useCallback((session: Inviter | Invitation): RTCPeerConnection | undefined => {
    const sdh = session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined;
    return sdh?.peerConnection;
  }, []);

  const attachRemoteAudio = useCallback(
    (session: Inviter | Invitation, audio: HTMLAudioElement | null) => {
      if (!audio) return;
      const pc = getPeerConnection(session);
      if (!pc) return;

      remoteTrackCleanupRef.current?.();
      remoteTrackCleanupRef.current = null;

      const remoteStream = new MediaStream();
      pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
        if (receiver.track) remoteStream.addTrack(receiver.track);
      });

      const bindTrack = (track: MediaStreamTrack) => {
        if (track.kind !== "audio") return;
        if (!remoteStream.getTracks().includes(track)) remoteStream.addTrack(track);
        audio.srcObject = remoteStream;
        void audio.play().catch(() => undefined);
        stopRingback();
      };

      const onTrack = (event: RTCTrackEvent) => {
        if (event.track) bindTrack(event.track);
      };
      pc.addEventListener("track", onTrack);
      remoteTrackCleanupRef.current = () => pc.removeEventListener("track", onTrack);

      if (remoteStream.getTracks().length > 0) {
        audio.srcObject = remoteStream;
        void audio.play().catch(() => undefined);
        stopRingback();
      }
    },
    [getPeerConnection, stopRingback],
  );

  const bindSession = useCallback(
    (session: Inviter | Invitation) => {
      let reachedEstablished = false;
      session.stateChange.addListener((state) => {
        if (state === SessionState.Establishing) {
          startRingback();
        }
        if (state === SessionState.Established) {
          reachedEstablished = true;
          stopRingback();
          attachRemoteAudio(session, audioRef.current);
          setCallState(true);
        }
        if (state === SessionState.Terminated) {
          stopRingback();
          remoteTrackCleanupRef.current?.();
          remoteTrackCleanupRef.current = null;
          setCallState(false);
          if (sessionRef.current === session) sessionRef.current = null;
          if (!reachedEstablished && session instanceof Inviter) {
            setError((prev) => prev ?? "Arama kurulamadı — numara veya santral ayarlarını kontrol edin.");
          }
        }
      });
    },
    [attachRemoteAudio, setCallState, startRingback, stopRingback],
  );

  const ensureLocalMediaRef = useRef(ensureLocalMedia);
  ensureLocalMediaRef.current = ensureLocalMedia;

  const createMediaStreamFactory = useCallback((): Web.MediaStreamFactory => {
    return (constraints, _sdh, _options) => {
      const cached = localStreamRef.current;
      if (cached?.getAudioTracks().some((t) => t.readyState === "live")) {
        return Promise.resolve(cached);
      }
      if (!constraints.audio && !constraints.video) {
        return Promise.resolve(new MediaStream());
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        return Promise.reject(new Error("Mikrofon kullanılamıyor."));
      }
      return navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        localStreamRef.current = stream;
        setMediaReady(true);
        return stream;
      });
    };
  }, []);

  const connectSipRef = useRef<(() => Promise<void>) | null>(null);

  const connectSip = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || connectStartedRef.current) return;
    connectStartedRef.current = true;
    setStatus("connecting");
    setError(null);

    let ua: UserAgent | null = null;
    let registerer: Registerer | null = null;
    let onTransportState: ((state: TransportState) => void) | null = null;

    try {
      const uri = UserAgent.makeURI(cfg.sipUri);
      if (!uri) throw new Error("Geçersiz SIP URI");

      const wssUrl = normalizeWssUrl(cfg.wssUrl);
      ua = new UserAgent({
        uri,
        transportOptions: { server: wssUrl, connectionTimeout: 10 },
        authorizationUsername: cfg.extension,
        authorizationPassword: cfg.password,
        sessionDescriptionHandlerFactory: Web.defaultSessionDescriptionHandlerFactory(createMediaStreamFactory()),
        sessionDescriptionHandlerFactoryOptions: {
          constraints: MEDIA_OPTIONS.constraints,
          peerConnectionConfiguration: { iceServers: ICE_SERVERS },
        },
      });

      ua.delegate = {
        onInvite: (invitation: Invitation) => {
          sessionRef.current = invitation;
          bindSession(invitation);
          void (async () => {
            try {
              await ensureLocalMediaRef.current();
              await invitation.accept({
                sessionDescriptionHandlerOptions: MEDIA_OPTIONS,
              });
            } catch (e) {
              showError(e instanceof Error ? e.message : "Gelen arama kabul edilemedi");
              try {
                await invitation.reject();
              } catch {
                /* ignore */
              }
            }
          })();
        },
      };

      onTransportState = (state: TransportState) => {
        if (state === TransportState.Disconnected && connectStartedRef.current) {
          connectStartedRef.current = false;
          setStatus("error");
          showError("SIP WebSocket bağlantısı koptu. Sayfayı yenileyip tekrar deneyin.");
        }
      };
      ua.transport.stateChange.addListener(onTransportState);

      await ua.start();
      registerer = new Registerer(ua);
      await registerAndWait(registerer);

      uaRef.current = ua;
      registererRef.current = registerer;
      setStatus("registered");
    } catch (e) {
      connectStartedRef.current = false;
      logSoftphoneError("connectSip", e);
      if (onTransportState && ua) {
        ua.transport.stateChange.removeListener(onTransportState);
      }
      try {
        await registerer?.unregister();
        await ua?.stop();
      } catch {
        /* ignore */
      }
      uaRef.current = null;
      registererRef.current = null;
      setStatus("error");
      showError(e instanceof Error ? e.message : "SIP bağlantısı kurulamadı");
    }
  }, [bindSession, createMediaStreamFactory, showError]);
  connectSipRef.current = connectSip;

  const configKey = config ? sipConfigKey(config) : "";

  useEffect(() => {
    if (!configKey || !config) return;
    if (sessionRef.current || callActiveRef.current) return;
    if (connectStartedRef.current && uaRef.current) return;

    connectStartedRef.current = false;
    setStatus(isMobileBrowser() ? "need_media" : "idle");
    setMediaReady(false);
    setError(null);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (!isMobileBrowser()) {
      void connectSipRef.current?.();
    }

    return () => {
      stopRingback();
      remoteTrackCleanupRef.current?.();
      remoteTrackCleanupRef.current = null;
      void (async () => {
        if (callActiveRef.current || sessionRef.current || connectStartedRef.current) return;
        try {
          await registererRef.current?.unregister();
          await uaRef.current?.stop();
        } catch {
          /* ignore */
        }
        uaRef.current = null;
        registererRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        connectStartedRef.current = false;
      })();
    };
  }, [configKey, stopRingback]);

  const prepareAndConnect = async () => {
    setStatus("connecting");
    setError(null);
    connectStartedRef.current = false;
    try {
      await ensureLocalMedia();
      await connectSip();
    } catch (e) {
      connectStartedRef.current = false;
      logSoftphoneError("prepareAndConnect", e);
      setStatus("error");
      showError(e instanceof Error ? e.message : "Mikrofon izni gerekli");
    }
  };

  const retryConnect = () => {
    connectStartedRef.current = false;
    setError(null);
    if (isMobileBrowser()) {
      void prepareAndConnect();
    } else {
      void connectSip();
    }
  };

  const clearStaleSession = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (
      session.state === SessionState.Terminated ||
      session.state === SessionState.Initial ||
      (session instanceof Inviter &&
        session.state === SessionState.Establishing &&
        !callActiveRef.current)
    ) {
      sessionRef.current = null;
    }
  };

  const dial = async () => {
    clearStaleSession();

    if (!config) {
      showError("SIP yapılandırması yok — çıkış yapıp tekrar giriş yapın.");
      return;
    }
    if (status !== "registered") {
      showError("Softphone kayıtlı değil — bağlantı tamamlanana kadar bekleyin.");
      return;
    }
    if (!uaRef.current) {
      showError("SIP bağlantısı kopuk — Tekrar bağlan'a tıklayın.");
      return;
    }
    if (!dialNumber.trim()) {
      showError("Aranacak numarayı girin (ör. 905551234567).");
      return;
    }
    if (sessionRef.current) {
      showError("Devam eden bir arama var — önce kapatın.");
      return;
    }

    setError(null);
    try {
      await ensureLocalMedia();
      await unlockAudio();

      const sipUri = formatOutboundSipUri(dialNumber, config.domain);
      if (!sipUri) {
        showError("Geçersiz numara formatı.");
        return;
      }
      const target = UserAgent.makeURI(sipUri);
      if (!target) {
        showError("Geçersiz numara formatı.");
        return;
      }

      const inviter = new Inviter(uaRef.current, target);
      sessionRef.current = inviter;
      bindSession(inviter);

      await inviter.invite({
        sessionDescriptionHandlerOptions: MEDIA_OPTIONS,
        requestDelegate: {
          onReject: (response) => {
            stopRingback();
            const code = response.message.statusCode ?? 0;
            if (sessionRef.current === inviter) sessionRef.current = null;
            showError(sipRejectMessage(code));
          },
          onProgress: (response) => {
            const code = response.message.statusCode;
            if (code === 180 || code === 183) {
              startRingback();
              if (code === 183 && response.message.body) {
                attachRemoteAudio(inviter, audioRef.current);
              }
            }
          },
        },
      });
    } catch (e) {
      stopRingback();
      sessionRef.current = null;
      logSoftphoneError("dial", e);
      const message = e instanceof Error ? e.message : "Arama başlatılamadı";
      showError(
        message.includes("Mikrofon") || message.includes("media")
          ? `${message} — mikrofon iznini kontrol edin.`
          : message,
      );
    }
  };

  const hangup = async () => {
    stopRingback();
    const session = sessionRef.current;
    if (!session) return;
    if (session.state === SessionState.Established) {
      await session.bye();
    } else if (session instanceof Inviter) {
      await session.cancel();
    } else {
      await session.reject();
    }
    setCallState(false);
    sessionRef.current = null;
  };

  const toggleMute = () => {
    const session = sessionRef.current;
    const pc = session ? getPeerConnection(session) : undefined;
    if (!pc) return;
    pc.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track?.kind === "audio") sender.track.enabled = muted;
    });
    setMuted(!muted);
  };

  if (!config || !config.wssUrl?.trim()) {
    return (
      <div className="rounded-xl border bg-slate-900 text-white p-6 space-y-2">
        <p className="text-sm text-amber-300">{missingConfigMessage}</p>
        <p className="text-xs text-slate-400">
          Admin → SIP Trunk sayfasında WSS URL girin veya PBX ayarlarında{" "}
          <code className="text-slate-300">sip_bridge_ws_url</code> tanımlayın (ör. wss://pbx.example.com:8089/ws).
        </p>
      </div>
    );
  }

  const wssDisplay = normalizeWssUrl(config.wssUrl);

  return (
    <div className="rounded-xl border bg-slate-900 text-white p-4 space-y-4">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium">
            Dahili {config.extension} @ {config.domain}
          </p>
        </div>
        <span
          className={`text-[10px] rounded px-2 py-0.5 ${
            status === "registered"
              ? "bg-emerald-500/20 text-emerald-300"
              : status === "connecting" || status === "need_media"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-red-500/20 text-red-300"
          }`}
        >
          {status === "registered"
            ? "Kayıtlı"
            : status === "connecting"
              ? "Bağlanıyor…"
              : status === "need_media"
                ? mediaReady
                  ? "Bağlanıyor…"
                  : "Mikrofon bekleniyor"
                : status === "error"
                  ? "Bağlantı hatası"
                  : "Bağlantı yok"}
        </span>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {status === "error" ? (
        <Button className="w-full gap-2 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => void retryConnect()}>
          Tekrar bağlan
        </Button>
      ) : null}

      {status === "need_media" && !mediaReady ? (
        <Button className="w-full gap-2 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => void prepareAndConnect()}>
          <Mic className="w-4 h-4" />
          Mikrofon izni ver ve bağlan
        </Button>
      ) : null}

      <Input
        value={dialNumber}
        onChange={(e) => setDialNumber(e.target.value)}
        placeholder="905551234567"
        className="bg-slate-800 border-slate-700 text-white font-mono"
        disabled={status !== "registered" || inCall}
        inputMode="tel"
        autoComplete="tel"
      />

      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 min-h-11"
          disabled={status !== "registered" || inCall || !dialNumber.trim()}
          onClick={() => void dial()}
        >
          <Phone className="w-4 h-4" />
          Ara
        </Button>
        <Button variant="destructive" className="gap-2 min-h-11" disabled={!inCall && !ringing} onClick={() => void hangup()}>
          <PhoneOff className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          className="border-slate-600 text-white hover:bg-slate-800 min-h-11"
          disabled={!inCall}
          onClick={toggleMute}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      </div>

      {ringing && !inCall ? <p className="text-xs text-amber-300 text-center">Karşı taraf çağrılıyor…</p> : null}

      <p className="text-xs text-slate-500 text-center">
        WSS: {wssDisplay}
        {wssDisplay !== config.wssUrl.trim() ? " (düzeltildi)" : ""}
      </p>
    </div>
  );
}
