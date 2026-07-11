import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Server,
  Phone,
  ListOrdered,
  Radio,
  Megaphone,
  GitBranch,
  Users,
  ArrowRightLeft,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "/admin/yekpare-ai-call";

const ITEMS = [
  { id: "verimor", label: "Verimor ayarları", href: `${BASE}/verimor`, icon: Cloud, highlight: true },
  { id: "3cx", label: "3CX ayarları", href: `${BASE}/3cx`, icon: Phone, highlight: true },
  { id: "overview", label: "PBX Özet", href: `${BASE}/pbx`, icon: LayoutDashboard, exact: true },
  { id: "live", label: "Canlı İzleme", href: `${BASE}/canli`, icon: Radio },
  { id: "trunks", label: "SIP Trunk", href: `${BASE}/sip-trunk`, icon: Server },
  { id: "extensions", label: "Dahililer", href: `${BASE}/dahili`, icon: Phone },
  { id: "agents", label: "Temsilciler", href: `${BASE}/temsilci`, icon: Users },
  { id: "queues", label: "Kuyruklar", href: `${BASE}/kuyruk`, icon: ListOrdered },
  { id: "campaigns", label: "Kampanyalar", href: `${BASE}/kampanya`, icon: Megaphone },
  { id: "hybrid", label: "Hibrit Mod", href: `${BASE}/hibrit`, icon: ArrowRightLeft },
  { id: "ivr", label: "IVR", href: `${BASE}/ivr`, icon: GitBranch },
];

export function PbxNav({ compact }: { compact?: boolean }) {
  const [location] = useLocation();
  return (
    <nav className={cn("space-y-0.5", compact ? "" : "space-y-1")}>
      {ITEMS.map((item) => {
        const active = item.exact
          ? location === item.href
          : location === item.href || location.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
              active ? "bg-[#e61e25]/10 text-[#e61e25] font-medium" : "text-gray-700 hover:bg-gray-100",
              "highlight" in item && item.highlight && !active ? "bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium" : "",
            )}
          >
            <Icon className="w-4 h-4 shrink-0 opacity-80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
