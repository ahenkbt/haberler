import { useCallback, useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";

type Row = { id: number; title: string; body: string; image_url?: string | null };

type StripProps =
  | { mode: "member" }
  | { mode: "customer"; token: string }
  | { mode: "vendor"; vendorId: number; vendorEmail: string };

function requestInitFor(props: StripProps): RequestInit {
  const init: RequestInit = { credentials: "include" };
  if (props.mode === "customer") {
    init.headers = { ...((init.headers as Record<string, string>) || {}), Authorization: `Bearer ${props.token}` };
  }
  if (props.mode === "vendor") {
    init.headers = {
      ...((init.headers as Record<string, string>) || {}),
      ...providerAuthHeaders({ ...(getProviderSession() ?? {}), id: props.vendorId, email: props.vendorEmail }),
    };
  }
  return init;
}

function normalizeRow(raw: Record<string, unknown>): Row | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    image_url: raw.image_url != null ? String(raw.image_url) : raw.imageUrl != null ? String(raw.imageUrl) : null,
  };
}

export function PlatformBroadcastStrip(props: StripProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const mode = props.mode;
  const customerToken = props.mode === "customer" ? props.token : "";
  const vendorId = props.mode === "vendor" ? props.vendorId : 0;
  const vendorEmail = props.mode === "vendor" ? props.vendorEmail : "";

  const load = useCallback(async () => {
    const init = requestInitFor(
      mode === "member"
        ? { mode: "member" }
        : mode === "customer"
          ? { mode: "customer", token: customerToken }
          : { mode: "vendor", vendorId, vendorEmail },
    );
    try {
      const res = await fetch("/api/site/my-broadcasts", init);
      const data = (await res.json()) as { broadcasts?: unknown[] };
      const list = (data.broadcasts ?? [])
        .map((b) => (b && typeof b === "object" ? normalizeRow(b as Record<string, unknown>) : null))
        .filter((x): x is Row => x != null);
      setRows(list);
    } catch {
      setRows([]);
    }
  }, [mode, customerToken, vendorId, vendorEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = async (id: number) => {
    const init = requestInitFor(
      mode === "member"
        ? { mode: "member" }
        : mode === "customer"
          ? { mode: "customer", token: customerToken }
          : { mode: "vendor", vendorId, vendorEmail },
    );
    try {
      await fetch(`/api/site/my-broadcasts/${id}/read`, { ...init, method: "POST" });
    } catch {
      /* ignore */
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-3 max-w-4xl mx-auto w-full" role="region" aria-label="Duyurular">
      {rows.slice(0, 5).map((b) => (
        <div
          key={b.id}
          className="relative rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/90 text-amber-950 shadow-sm pr-10"
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <Megaphone className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm text-amber-950">{b.title}</p>
                <p className="text-xs sm:text-sm mt-1 whitespace-pre-wrap text-amber-900/90 leading-relaxed">{b.body}</p>
                {b.image_url && b.image_url.startsWith("data:image/") && (
                  <img src={b.image_url} alt="" className="mt-2 max-h-40 rounded-lg border border-amber-200/80 object-contain" />
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void dismiss(b.id)}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-amber-800/70 hover:bg-amber-100/80 hover:text-amber-950 transition"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
