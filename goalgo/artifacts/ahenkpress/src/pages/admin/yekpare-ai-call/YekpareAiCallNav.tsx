import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  Target,
  Settings,
  Server,
  MessageSquare,
  Radio,
  Headphones,
  Phone,
  Users,
  ListOrdered,
  ArrowRightLeft,
  Workflow,
  Key,
  ScrollText,
  Cloud,
} from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  legacy?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  highlight?: boolean;
};

const GROUPS: NavGroup[] = [
  {
    id: "genel",
    label: "Genel",
    items: [
      { id: "overview", label: "Genel bakış", href: "/admin/yekpare-ai-call", icon: LayoutDashboard },
      { id: "settings", label: "Ayarlar", href: "/admin/yekpare-ai-call/ayarlar", icon: Settings },
    ],
  },
  {
    id: "verimor",
    label: "Verimor Bulutsantralim",
    highlight: true,
    items: [
      { id: "verimor-settings", label: "Verimor ayarları", href: "/admin/yekpare-ai-call/verimor", icon: Cloud },
      { id: "verimor-agents", label: "Verimor agentler", href: "/admin/yekpare-ai-call/temsilci", icon: Users },
      { id: "verimor-campaigns", label: "Verimor kampanyalar", href: "/admin/yekpare-ai-call/kampanya", icon: Target },
      { id: "verimor-portal", label: "Temsilci portalı (/pbx)", href: "/pbx", icon: Phone },
    ],
  },
  {
    id: "3cx",
    label: "3CX PBX",
    highlight: true,
    items: [
      { id: "3cx-settings", label: "3CX ayarları", href: "/admin/yekpare-ai-call/3cx", icon: Phone },
      { id: "3cx-agents", label: "3CX temsilciler", href: "/admin/yekpare-ai-call/temsilci", icon: Users },
      { id: "3cx-portal", label: "Temsilci portalı (/pbx)", href: "/pbx", icon: Phone },
    ],
  },
  {
    id: "ai",
    label: "AI Call Center",
    items: [
      { id: "assistants", label: "AI asistanlar", href: "/admin/yekpare-ai-call/asistanlar", icon: Bot },
      { id: "ai-campaigns", label: "AI kampanyalar", href: "/admin/yekpare-ai-call/ai-kampanya", icon: Target },
      { id: "logs", label: "Arama kayıtları", href: "/admin/yekpare-ai-call/kayitlar", icon: ScrollText },
      { id: "sip", label: "SIP Trunk", href: "/admin/yekpare-ai-call/sip-trunk", icon: Server },
    ],
  },
  {
    id: "pbx",
    label: "PBX Call Center",
    items: [
      { id: "pbx-overview", label: "PBX özet", href: "/admin/yekpare-ai-call/pbx", icon: Headphones },
      { id: "pbx-live", label: "Canlı İzleme", href: "/admin/yekpare-ai-call/canli", icon: Radio },
      { id: "pbx-extensions", label: "Dahililer", href: "/admin/yekpare-ai-call/dahili", icon: Phone },
      { id: "pbx-agents", label: "Temsilciler", href: "/admin/yekpare-ai-call/temsilci", icon: Users },
      { id: "pbx-queues", label: "Kuyruklar", href: "/admin/yekpare-ai-call/kuyruk", icon: ListOrdered },
      { id: "pbx-campaigns", label: "PBX kampanyalar", href: "/admin/yekpare-ai-call/kampanya", icon: Target },
      { id: "pbx-hybrid", label: "Hibrit Mod", href: "/admin/yekpare-ai-call/hibrit", icon: ArrowRightLeft },
      { id: "pbx-ivr", label: "Anlık IVR", href: "/admin/yekpare-ai-call/ivr", icon: Workflow },
    ],
  },
  {
    id: "legacy",
    label: "Eklentiler (isteğe bağlı)",
    items: [
      { id: "messaging", label: "Mesajlaşma", href: "/admin/yekpare-ai-call/mesajlasma", icon: MessageSquare, legacy: true },
      { id: "team", label: "Ekip", href: "/admin/yekpare-ai-call/ekip", icon: Users, legacy: true },
      { id: "rest-api", label: "REST API", href: "/admin/yekpare-ai-call/rest-api", icon: Key, legacy: true },
    ],
  },
];

function isActivePath(loc: string, href: string, exact?: boolean): boolean {
  if (exact) return loc === href;
  return loc === href || loc.startsWith(`${href}/`);
}

export function YekpareAiCallNav({ className }: { className?: string }) {
  const [loc] = useLocation();

  return (
    <nav className={cn("space-y-5", className)} aria-label="Yekpare AI Call">
      <p className="text-[11px] text-gray-500 leading-snug px-1">
        Yerel platform — API anahtarlarını yapıştırın, SIP trunk ekleyin, hemen çalışmaya başlayın. AgentLabs vekili{" "}
        <code className="text-[10px] bg-gray-100 px-1 rounded">USE_NATIVE_AI_CALL=false</code> ile isteğe bağlıdır.
      </p>

      {GROUPS.map((group) => (
        <NavGroup key={group.id} label={group.label} highlight={group.highlight}>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(loc, item.href, item.id === "overview");
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active ? "bg-[#e61e25]/10 text-[#e61e25] font-medium" : "text-gray-700 hover:bg-gray-100",
                      item.legacy ? "opacity-75" : "",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </NavGroup>
      ))}
    </nav>
  );
}

function NavGroup({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        highlight ? "rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-2 -mx-1" : "",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-2.5 mb-1.5",
          highlight ? "text-[#1e3a5f]" : "text-gray-400",
        )}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
