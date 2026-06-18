import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import AIBuilder from "@/pages/ai-builder";
import FileManager from "@/pages/file-manager";
import Permissions from "@/pages/permissions";
import GithubDeploy from "@/pages/github-deploy";
import AIAssistant from "@/pages/ai-assistant";
import ImageAI from "@/pages/image-ai";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BrainCircuit, ImageIcon, Cpu,
  FolderOpen, Shield, Github, Eye, Radio, Zap, Palette, X,
} from "lucide-react";
import { useGetBotStatus } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

type Page = "dashboard" | "ai-assistant" | "image-ai" | "ai-builder" | "file-manager" | "permissions" | "github";

interface RGBColor { name: string; hex: string; rgb: string }
const RGB_COLORS: RGBColor[] = [
  { name: "أحمر",    hex: "#ef4444", rgb: "239,68,68" },
  { name: "برتقالي", hex: "#f97316", rgb: "249,115,22" },
  { name: "ذهبي",   hex: "#eab308", rgb: "234,179,8" },
  { name: "أخضر",   hex: "#22c55e", rgb: "34,197,94" },
  { name: "سماوي",  hex: "#06b6d4", rgb: "6,182,212" },
  { name: "أزرق",   hex: "#3b82f6", rgb: "59,130,246" },
  { name: "بنفسجي", hex: "#a855f7", rgb: "168,85,247" },
  { name: "وردي",   hex: "#ec4899", rgb: "236,72,153" },
  { name: "أبيض",   hex: "#f1f5f9", rgb: "241,245,249" },
];

const NAV_ITEMS = [
  { id: "dashboard"    as Page, label: "Dashboard",   ar: "لوحة التحكم",  icon: LayoutDashboard },
  { id: "ai-assistant" as Page, label: "AI Dev",      ar: "مساعد المطور", icon: BrainCircuit,   badge: "AI" },
  { id: "image-ai"     as Page, label: "Image",       ar: "ذكاء الصور",   icon: ImageIcon,      badge: "NEW" },
  { id: "ai-builder"   as Page, label: "Commands",    ar: "الأوامر",      icon: Cpu },
  { id: "file-manager" as Page, label: "Files",       ar: "الملفات",      icon: FolderOpen },
  { id: "permissions"  as Page, label: "Perms",       ar: "الصلاحيات",    icon: Shield },
  { id: "github"       as Page, label: "Deploy",      ar: "نشر GitHub",   icon: Github },
];

// Bottom nav shows 5 items max on mobile
const BOTTOM_NAV = NAV_ITEMS.slice(0, 5);

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case "dashboard":    return <Dashboard />;
    case "ai-assistant": return <AIAssistant />;
    case "image-ai":     return <ImageAI />;
    case "ai-builder":   return <AIBuilder />;
    case "file-manager": return <FileManager />;
    case "permissions":  return <Permissions />;
    case "github":       return <GithubDeploy />;
  }
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {online && <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-60" />}
      <span className={cn("relative rounded-full h-2 w-2", online ? "bg-green-400" : "bg-zinc-600")} />
    </span>
  );
}

function AppShell() {
  const [page, setPage]           = useState<Page>("dashboard");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showRgb, setShowRgb]     = useState(false);
  const [showAllNav, setShowAllNav] = useState(false);
  const [time, setTime]           = useState(new Date());
  const [c1, setC1]               = useState(RGB_COLORS[0]);
  const [c2, setC2]               = useState(RGB_COLORS[6]);

  const { data: status } = useGetBotStatus({ query: { refetchInterval: 6000 } });
  const online = !!status?.online;

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--rgb-c1", c1.rgb);
    document.documentElement.style.setProperty("--rgb-c2", c2.rgb);
  }, [c1, c2]);

  const timeStr = time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const currentNav = NAV_ITEMS.find(n => n.id === page)!;

  const navigate = (p: Page) => {
    setPage(p);
    setShowSidebar(false);
    setShowAllNav(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ background: "#03070f" }}>

      {/* ════════════════════════════════
          MOBILE LAYOUT (< md)
      ════════════════════════════════ */}

      {/* ── Mobile Status Bar (HarmonyOS Dynamic Island style) ── */}
      <div className="md:hidden sticky top-0 z-40"
        style={{ background: "rgba(3,7,15,0.95)", backdropFilter: "blur(24px)" }}>

        {/* RGB top line */}
        <div className="rgb-strip w-full" style={{ height: 3 }} />

        {/* Status row */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: KANEKI pill */}
          <div className="flex items-center gap-2">
            <div className="kaneki-glow h-8 w-8 rounded-full bg-black flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold font-mono rgb-text leading-none">KANEKI V2</p>
              <p className="text-[9px] text-zinc-600 font-mono leading-none mt-0.5">{timeStr}</p>
            </div>
          </div>

          {/* Center: page title pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/8 bg-white/5"
            style={{ boxShadow: `0 0 12px rgba(${c1.rgb},0.15)` }}>
            <currentNav.icon className="h-3 w-3" style={{ color: `rgb(${c1.rgb})` }} />
            <span className="text-[10px] font-mono text-zinc-300">{currentNav.ar}</span>
          </div>

          {/* Right: status + RGB button */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-mono border",
              online ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
            )}>
              <StatusDot online={online} />
              <span className="hidden xs:inline">{online ? "ON" : "OFF"}</span>
            </div>
            <button
              onClick={() => setShowRgb(v => !v)}
              className="h-7 w-7 rounded-full flex items-center justify-center border border-white/10 bg-white/5 transition-all"
              style={showRgb ? { borderColor: `rgb(${c1.rgb})`, boxShadow: `0 0 10px rgba(${c1.rgb},0.3)` } : {}}
            >
              <Palette className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* RGB Picker (mobile dropdown) */}
        {showRgb && (
          <div className="px-4 pb-3 space-y-2.5 border-t border-white/5">
            <div className="space-y-1.5 pt-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">اللون الأول</p>
              <div className="flex flex-wrap gap-2">
                {RGB_COLORS.map(col => (
                  <button key={col.hex} onClick={() => setC1(col)}
                    className={cn("h-6 w-6 rounded-full transition-all", c1.hex === col.hex && "ring-2 ring-white ring-offset-1 ring-offset-black scale-125")}
                    style={{ backgroundColor: col.hex }} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">اللون الثاني</p>
              <div className="flex flex-wrap gap-2">
                {RGB_COLORS.map(col => (
                  <button key={col.hex} onClick={() => setC2(col)}
                    className={cn("h-6 w-6 rounded-full transition-all", c2.hex === col.hex && "ring-2 ring-white ring-offset-1 ring-offset-black scale-125")}
                    style={{ backgroundColor: col.hex }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Content ── */}
      <main className="md:hidden min-h-[calc(100vh-56px)] overflow-y-auto"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 16px))" }}>
        <div className="p-3">
          <PageContent page={page} />
        </div>
      </main>

      {/* ── HarmonyOS Floating Bottom Nav (Mobile) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)", paddingLeft: 16, paddingRight: 16 }}>
        <div className="w-full rounded-[28px] border border-white/10 flex items-center px-2 py-2 gap-1"
          style={{
            background: "rgba(8,14,28,0.92)",
            backdropFilter: "blur(32px)",
            boxShadow: `0 -2px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 24px rgba(${c1.rgb},0.12)`,
          }}>
          {BOTTOM_NAV.map(item => {
            const active = page === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-[20px] transition-all duration-200 relative"
                style={active ? {
                  background: `linear-gradient(135deg, rgba(${c1.rgb},0.18), rgba(${c2.rgb},0.10))`,
                  boxShadow: `0 0 14px rgba(${c1.rgb},0.2)`,
                } : {}}>
                {active && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ background: `linear-gradient(90deg, rgb(${c1.rgb}), rgb(${c2.rgb}))` }} />
                )}
                <Icon className="h-5 w-5 transition-colors"
                  style={{ color: active ? `rgb(${c1.rgb})` : "#4b5563" }} />
                <span className="text-[9px] font-mono leading-none transition-colors"
                  style={{ color: active ? `rgb(${c1.rgb})` : "#374151" }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="absolute -top-0.5 -left-0.5 text-[7px] px-1 rounded font-mono"
                    style={{ background: `rgb(${c1.rgb})`, color: "#000" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          {/* More button */}
          <button onClick={() => setShowAllNav(v => !v)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-[20px] transition-all"
            style={showAllNav ? { background: "rgba(255,255,255,0.06)" } : {}}>
            <div className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
            </div>
            <span className="text-[9px] font-mono text-zinc-600 mt-1">More</span>
          </button>
        </div>
      </div>

      {/* ── More Nav Drawer (Mobile) ── */}
      {showAllNav && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowAllNav(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[32px] border-t border-white/8 p-5 pb-safe"
            onClick={e => e.stopPropagation()}
            style={{ background: "rgba(8,14,28,0.97)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">كل الصفحات</span>
              <button onClick={() => setShowAllNav(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {NAV_ITEMS.map(item => {
                const active = page === item.id;
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all"
                    style={{
                      borderColor: active ? `rgba(${c1.rgb},0.4)` : "rgba(255,255,255,0.06)",
                      background: active ? `rgba(${c1.rgb},0.12)` : "rgba(255,255,255,0.03)",
                    }}>
                    <Icon className="h-5 w-5" style={{ color: active ? `rgb(${c1.rgb})` : "#4b5563" }} />
                    <span className="text-[9px] font-mono leading-none text-center"
                      style={{ color: active ? `rgb(${c1.rgb})` : "#4b5563" }}>
                      {item.ar}
                    </span>
                    {item.badge && (
                      <span className="text-[7px] font-mono px-1 rounded"
                        style={{ background: `rgb(${c1.rgb})`, color: "#000" }}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          DESKTOP LAYOUT (≥ md)
      ════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen">

        {/* ── Sidebar ── */}
        <aside className="w-64 shrink-0 flex flex-col border-l border-white/5 sticky top-0 h-screen"
          style={{ background: "linear-gradient(180deg,#060e1c 0%,#040b17 50%,#030810 100%)" }}>

          <div className="rgb-strip w-full shrink-0" />

          {/* Logo */}
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="kaneki-glow h-10 w-10 rounded-full bg-black flex items-center justify-center shrink-0">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold font-mono tracking-tight text-white truncate rgb-text">ヽ.KANEKI V2 ぐ愛</p>
                <p className="text-[10px] text-zinc-500 font-mono">Control Panel v2.0</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 px-1">
              <StatusDot online={online} />
              <span className={cn("text-[11px] font-mono", online ? "text-green-400" : "text-zinc-500")}>
                {online ? "البوت متصل" : "غير متصل"}
              </span>
              <span className="mr-auto text-[10px] font-mono text-zinc-600">{timeStr}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const active = page === item.id;
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-right font-mono relative overflow-hidden",
                    active ? "nav-active" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                  )}>
                  {active && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l nav-active-indicator" />
                  )}
                  <span className={cn("shrink-0 p-1.5 rounded-lg transition-colors",
                    active ? "bg-white/10 text-white" : "bg-white/5 text-zinc-500")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-xs uppercase tracking-wider">{item.label}</span>
                    <span className="text-[10px] mt-0.5 opacity-50">{item.ar}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "mr-auto text-[8px] px-1.5 py-0.5 rounded font-mono border",
                      item.badge === "NEW" ? "rgb-border text-white bg-transparent" : "bg-white/8 border-white/15 text-zinc-400"
                    )}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* RGB Picker */}
          <div className="px-3 pb-1">
            <button onClick={() => setShowRgb(v => !v)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono border transition-all",
                showRgb ? "rgb-border text-white" : "border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15"
              )}>
              <Palette className="h-3 w-3 shrink-0" />
              <span>إضاءة RGB</span>
              <div className="mr-auto flex gap-1">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c1.hex }} />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c2.hex }} />
              </div>
            </button>
            {showRgb && (
              <div className="mt-2 p-3 rounded-xl border border-white/8 bg-black/30 space-y-2.5 backdrop-blur">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">اللون الأول</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RGB_COLORS.map(col => (
                      <button key={col.hex} onClick={() => setC1(col)}
                        className={cn("h-5 w-5 rounded-full transition-all", c1.hex === col.hex && "ring-2 ring-white ring-offset-1 ring-offset-black scale-110")}
                        style={{ backgroundColor: col.hex }} />
                    ))}
                  </div>
                </div>
                <div className="harmony-line" />
                <div className="space-y-1.5">
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">اللون الثاني</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RGB_COLORS.map(col => (
                      <button key={col.hex} onClick={() => setC2(col)}
                        className={cn("h-5 w-5 rounded-full transition-all", c2.hex === col.hex && "ring-2 ring-white ring-offset-1 ring-offset-black scale-110")}
                        style={{ backgroundColor: col.hex }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 space-y-2">
            {status && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/5 border border-white/5">
                <Radio className="h-3 w-3 shrink-0" style={{ color: `rgb(${c1.rgb})` }} />
                <span className="text-[10px] font-mono text-zinc-400">
                  uptime {String(Math.floor((status.uptime || 0) / 3600)).padStart(2, "0")}h {String(Math.floor(((status.uptime || 0) % 3600) / 60)).padStart(2, "0")}m
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-1">
              <Zap className="h-3 w-3 text-zinc-600" />
              <span className="text-[10px] font-mono text-zinc-600">KANEKI V2 © 2025</span>
            </div>
          </div>

          <div className="rgb-strip w-full shrink-0" />
        </aside>

        {/* ── Desktop Main ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop top bar */}
          <header className="sticky top-0 z-20 h-14 border-b border-white/5 flex items-center px-5 gap-3"
            style={{ background: "rgba(3,7,15,0.90)", backdropFilter: "blur(20px)" }}>
            <span style={{ color: `rgb(${c1.rgb})` }} className="shrink-0">
              <currentNav.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-mono font-medium text-zinc-100">{currentNav.ar}</span>
            <div className="mr-auto flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border",
                online ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
              )}>
                <StatusDot online={online} />
                {online ? "ONLINE" : "OFFLINE"}
              </div>
              <span className="text-[11px] font-mono text-zinc-600">{timeStr}</span>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl w-full mx-auto">
            <PageContent page={page} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
