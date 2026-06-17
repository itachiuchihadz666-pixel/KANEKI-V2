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
  Bot, Cpu, FolderOpen, Shield, Github, Menu, X,
  LayoutDashboard, Zap, Radio, Eye, BrainCircuit, ImageIcon, Palette,
} from "lucide-react";
import { useGetBotStatus } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

type Page = "dashboard" | "ai-builder" | "file-manager" | "permissions" | "github" | "ai-assistant" | "image-ai";

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

const NAV_ITEMS: { id: Page; label: string; labelAr: string; icon: React.ReactNode; badge?: string }[] = [
  { id: "dashboard",    label: "Dashboard",   labelAr: "لوحة التحكم",  icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "ai-assistant", label: "AI Dev",      labelAr: "مساعد المطور", icon: <BrainCircuit className="h-4 w-4" />,  badge: "AI" },
  { id: "image-ai",     label: "Image AI",    labelAr: "ذكاء الصور",   icon: <ImageIcon className="h-4 w-4" />,     badge: "NEW" },
  { id: "ai-builder",   label: "Commands",    labelAr: "بناء الأوامر", icon: <Cpu className="h-4 w-4" /> },
  { id: "file-manager", label: "Files",       labelAr: "الملفات",      icon: <FolderOpen className="h-4 w-4" /> },
  { id: "permissions",  label: "Permissions", labelAr: "الصلاحيات",    icon: <Shield className="h-4 w-4" /> },
  { id: "github",       label: "Deploy",      labelAr: "GitHub نشر",   icon: <Github className="h-4 w-4" /> },
];

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
      )}
      <span className={cn(
        "relative inline-flex rounded-full h-2.5 w-2.5 border",
        online ? "bg-green-400 border-green-400/50" : "bg-zinc-600 border-zinc-500"
      )} />
    </span>
  );
}

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

function ColorSwatch({ color, selected, onClick }: { color: RGBColor; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={color.name}
      className={cn(
        "h-5 w-5 rounded-full transition-all duration-150 shrink-0",
        selected ? "ring-2 ring-white ring-offset-1 ring-offset-black scale-110" : "hover:scale-110 opacity-80 hover:opacity-100"
      )}
      style={{ backgroundColor: color.hex }}
    />
  );
}

function AppShell() {
  const [page, setPage]               = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRgb, setShowRgb]         = useState(false);
  const [time, setTime]               = useState(new Date());
  const [rgbColor1, setRgbColor1]     = useState<RGBColor>(RGB_COLORS[0]);
  const [rgbColor2, setRgbColor2]     = useState<RGBColor>(RGB_COLORS[6]);

  const { data: status } = useGetBotStatus({ query: { refetchInterval: 6000 } });
  const isOnline = !!status?.online;

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--rgb-c1", rgbColor1.rgb);
    document.documentElement.style.setProperty("--rgb-c2", rgbColor2.rgb);
  }, [rgbColor1, rgbColor2]);

  const timeStr = time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={cn(
        "fixed top-0 right-0 h-full w-64 z-40 flex flex-col transition-transform duration-300",
        "lg:static lg:translate-x-0",
        "border-l border-white/5",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )} style={{
        background: "linear-gradient(180deg, #060e1c 0%, #040b17 50%, #030810 100%)"
      }}>

        {/* RGB strip at top */}
        <div className="rgb-strip w-full shrink-0" />

        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="kaneki-glow h-10 w-10 rounded-full bg-black flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold font-mono tracking-tight text-white truncate rgb-text">
                ヽ.KANEKI V2 ぐ愛
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Control Panel v2.0</p>
            </div>
            <button
              className="lg:hidden text-zinc-500 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Bot status row */}
          <div className="mt-3 flex items-center gap-2 px-1">
            <StatusDot online={isOnline} />
            <span className={cn(
              "text-[11px] font-mono",
              isOnline ? "text-green-400" : "text-zinc-500"
            )}>
              {isOnline ? "البوت متصل" : "غير متصل"}
            </span>
            <span className="mr-auto text-[10px] font-mono text-zinc-600">{timeStr}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-right",
                  "font-mono relative overflow-hidden",
                  active
                    ? "nav-active"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                )}
              >
                {active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l nav-active-indicator" />
                )}
                <span className={cn(
                  "shrink-0 p-1.5 rounded-lg transition-colors",
                  active ? "bg-white/10 text-white" : "bg-white/5 text-zinc-500"
                )}>
                  {item.icon}
                </span>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xs uppercase tracking-wider">{item.label}</span>
                  <span className="text-[10px] mt-0.5 opacity-50">{item.labelAr}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "mr-auto text-[8px] px-1.5 py-0.5 rounded font-mono border",
                    item.badge === "NEW"
                      ? "rgb-border text-white bg-transparent"
                      : "bg-white/8 border-white/15 text-zinc-400"
                  )}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* RGB Color Picker */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setShowRgb(v => !v)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono border transition-all",
              showRgb ? "rgb-border text-white" : "border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15"
            )}
          >
            <Palette className="h-3 w-3 shrink-0" />
            <span>إضاءة RGB</span>
            <div className="mr-auto flex gap-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rgbColor1.hex }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rgbColor2.hex }} />
            </div>
          </button>

          {showRgb && (
            <div className="mt-2 p-3 rounded-xl border border-white/8 bg-black/30 space-y-2.5 backdrop-blur">
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rgbColor1.hex }} />
                  اللون الأول
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RGB_COLORS.map(c => (
                    <ColorSwatch key={c.hex} color={c} selected={rgbColor1.hex === c.hex} onClick={() => setRgbColor1(c)} />
                  ))}
                </div>
              </div>
              <div className="harmony-line" />
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rgbColor2.hex }} />
                  اللون الثاني
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RGB_COLORS.map(c => (
                    <ColorSwatch key={c.hex} color={c} selected={rgbColor2.hex === c.hex} onClick={() => setRgbColor2(c)} />
                  ))}
                </div>
              </div>
              <p className="text-[9px] font-mono text-zinc-600 text-center">
                اختر نفس اللونين لضوء ثابت
              </p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {status && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <Radio className="h-3 w-3 shrink-0" style={{ color: `rgb(${rgbColor1.rgb})` }} />
              <span className="text-[10px] font-mono text-zinc-400">
                uptime&nbsp;
                {String(Math.floor((status.uptime || 0) / 3600)).padStart(2, "0")}h&nbsp;
                {String(Math.floor(((status.uptime || 0) % 3600) / 60)).padStart(2, "0")}m
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-3 w-3 text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-600">
              KANEKI V2 © 2025
            </span>
          </div>
        </div>

        {/* RGB strip at bottom */}
        <div className="rgb-strip w-full shrink-0" />
      </aside>

      {/* ─── Main content ─── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-white/5 flex items-center px-4 gap-3"
          style={{ background: "rgba(3,7,15,0.90)", backdropFilter: "blur(20px)" }}>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2 min-w-0">
            <span style={{ color: `rgb(${rgbColor1.rgb})` }} className="shrink-0">
              {NAV_ITEMS.find(n => n.id === page)?.icon}
            </span>
            <span className="text-sm font-mono font-medium truncate text-zinc-100">
              {NAV_ITEMS.find(n => n.id === page)?.labelAr}
            </span>
          </div>

          {/* Right side */}
          <div className="mr-auto flex items-center gap-3">
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border",
              isOnline
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
            )}>
              <StatusDot online={isOnline} />
              {isOnline ? "ONLINE" : "OFFLINE"}
            </div>

            {/* Mobile quick nav */}
            <div className="flex lg:hidden gap-0.5">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    page === item.id ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                  )}
                  style={page === item.id ? { color: `rgb(${rgbColor1.rgb})` } : {}}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl w-full mx-auto">
          <PageContent page={page} />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
