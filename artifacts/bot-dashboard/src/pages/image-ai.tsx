import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, RefreshCw, Download, Sparkles, KeyRound,
  CheckCircle2, AlertCircle, Eye, EyeOff, Save, X, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type ImageModel = "flux" | "sdxl" | "dalle";

const MODELS: { id: ImageModel; label: string; badge: string; desc: string; provider: string }[] = [
  { id: "flux",  label: "FLUX Schnell", badge: "⚡", desc: "الأسرع · مجاني", provider: "HuggingFace" },
  { id: "sdxl",  label: "SDXL",         badge: "🎨", desc: "جودة عالية · مجاني", provider: "HuggingFace" },
  { id: "dalle", label: "DALL-E 3",     badge: "✨", desc: "الأدق · يستخدم OpenAI Key", provider: "OpenAI" },
];

const QUICK_PROMPTS = [
  "anime warrior with glowing blue eyes, dark background, cinematic",
  "futuristic city at night, neon lights, rain, cyberpunk style",
  "majestic dragon flying over mountains, fantasy art",
  "portrait of a samurai, cherry blossoms, traditional Japanese art",
  "space station orbiting Earth, realistic, 4K",
  "magical forest with glowing mushrooms, ethereal lighting",
];

interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  provider: string;
  timestamp: Date;
}

export default function ImageAI() {
  const { toast } = useToast();
  const [model, setModel]       = useState<ImageModel>("flux");
  const [prompt, setPrompt]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [images, setImages]     = useState<GeneratedImage[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [hfKey, setHfKey]       = useState("");
  const [showHf, setShowHf]     = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ hf: boolean; openai: boolean } | null>(null);
  const [selectedImg, setSelectedImg] = useState<GeneratedImage | null>(null);

  const fetchKeyStatus = () => {
    fetch(`${BASE}/api/ai/keys`)
      .then(r => r.json())
      .then((d: Record<string, { configured: boolean }>) => {
        setKeyStatus({
          hf: d.huggingface?.configured ?? false,
          openai: d.openai?.configured ?? false,
        });
      })
      .catch(() => {});
  };

  useState(() => { fetchKeyStatus(); });

  const generate = async (customPrompt?: string) => {
    const text = (customPrompt ?? prompt).trim();
    if (!text) return toast({ title: "اكتب وصف الصورة أولاً", variant: "destructive" });
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ai/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, model }),
      });
      const d = await r.json() as { image?: string; error?: string; message?: string; provider?: string };

      if (d.error === "no_key" || d.message) {
        toast({ title: "مفتاح API مطلوب", description: d.message || "أضف مفتاح HuggingFace أو OpenAI", variant: "destructive" });
        setShowKeys(true);
        return;
      }

      if (!d.image) throw new Error(d.error || "فشل التوليد");

      const img: GeneratedImage = {
        url: d.image,
        prompt: text,
        model: MODELS.find(m => m.id === model)?.label ?? model,
        provider: d.provider ?? "AI",
        timestamp: new Date(),
      };
      setImages(p => [img, ...p]);
      toast({ title: "✅ تم توليد الصورة!" });
    } catch (e) {
      toast({ title: "خطأ في توليد الصورة", description: String(e), variant: "destructive" });
    }
    setLoading(false);
  };

  const saveHfKey = async () => {
    if (!hfKey.trim()) return;
    setSavingKey(true);
    try {
      await fetch(`${BASE}/api/ai/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huggingface: hfKey.trim() }),
      });
      toast({ title: "✅ تم حفظ مفتاح HuggingFace" });
      setHfKey("");
      fetchKeyStatus();
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
    setSavingKey(false);
  };

  const downloadImage = (img: GeneratedImage) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = `kaneki-ai-${Date.now()}.jpg`;
    a.click();
  };

  const currentModel = MODELS.find(m => m.id === model)!;

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rgb-border rounded-xl bg-black/50 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest rgb-text">Image AI</h2>
            <p className="text-[10px] text-muted-foreground font-mono">توليد الصور والفيديوهات بالذكاء الاصطناعي</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowKeys(v => !v)}
          className={cn("font-mono text-[11px] h-8 gap-1.5 border-border/40", showKeys && "rgb-border text-white")}>
          <KeyRound className="h-3 w-3" /> API Keys
        </Button>
      </div>

      {/* ── API Keys Panel ── */}
      {showKeys && (
        <Card className="rgb-border bg-black/40 backdrop-blur">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="h-3 w-3" /> مفاتيح API لتوليد الصور
              </p>
              <button onClick={() => setShowKeys(false)} className="text-zinc-600 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* HuggingFace key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                  ⚡ HuggingFace API Key
                  <span className="text-[9px] text-zinc-600">(لـ FLUX + SDXL · مجاني)</span>
                </label>
                {keyStatus && (
                  keyStatus.hf
                    ? <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono"><CheckCircle2 className="h-3 w-3" /> محفوظ</span>
                    : <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-mono"><AlertCircle className="h-3 w-3" /> غير مضبوط</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showHf ? "text" : "password"}
                    value={hfKey}
                    onChange={e => setHfKey(e.target.value)}
                    placeholder="hf_..."
                    className="h-9 bg-background/50 border-border/40 font-mono text-xs pr-9"
                    dir="ltr"
                  />
                  <button onClick={() => setShowHf(v => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showHf ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button onClick={saveHfKey} disabled={!hfKey.trim() || savingKey}
                  size="sm" variant="outline" className="h-9 font-mono text-xs gap-1.5 border-border/40">
                  {savingKey ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  حفظ
                </Button>
              </div>
              <p className="text-[9px] font-mono text-zinc-600">
                احصل على مفتاحك المجاني من: huggingface.co/settings/tokens
              </p>
            </div>

            <div className="harmony-line" />

            <div className="space-y-1">
              <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                ✨ DALL-E 3
                <span className="text-[9px] text-zinc-600">(يستخدم مفتاح OpenAI من صفحة AI Dev)</span>
              </p>
              {keyStatus && (
                keyStatus.openai
                  ? <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono"><CheckCircle2 className="h-3 w-3" /> مفتاح OpenAI موجود ✓</span>
                  : <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-mono"><AlertCircle className="h-3 w-3" /> أضف مفتاح OpenAI من صفحة AI Dev</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Model selector ── */}
      <div className="flex gap-2 flex-wrap">
        {MODELS.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-mono border transition-all",
              model === m.id
                ? "rgb-border text-white bg-white/5 scale-[1.02]"
                : "border-border/30 bg-background/40 text-zinc-500 hover:border-border/60 hover:text-zinc-300"
            )}>
            <span className="text-base">{m.badge}</span>
            <div className="flex flex-col items-start leading-none">
              <span>{m.label}</span>
              <span className="text-[9px] opacity-60 mt-0.5">{m.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Active model info ── */}
      <div className="harmony-card-sm px-4 py-2.5 flex items-center gap-2 text-[11px] font-mono">
        <span className="text-base">{currentModel.badge}</span>
        <span className="text-zinc-300 font-semibold">{currentModel.label}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500">{currentModel.provider}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500">{currentModel.desc}</span>
      </div>

      {/* ── Prompt input ── */}
      <Card className="harmony-card border-white/5">
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) generate(); }}
            placeholder="صف الصورة التي تريدها... (Ctrl+Enter للتوليد)"
            className="min-h-[80px] bg-background/50 border-border/30 resize-none text-sm font-mono"
            dir="ltr"
            disabled={loading}
          />

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => { setPrompt(p); }}
                className="text-[9px] font-mono px-2 py-1 rounded-lg border border-border/20 bg-background/20 text-zinc-600 hover:border-white/20 hover:text-zinc-300 transition-all truncate max-w-[200px]">
                <Wand2 className="h-2 w-2 inline ml-1 opacity-50" />{p.split(",")[0]}...
              </button>
            ))}
          </div>

          <Button
            onClick={() => generate()}
            disabled={loading || !prompt.trim()}
            className="w-full h-10 font-mono text-xs gap-2 rgb-border bg-white/5 hover:bg-white/10 text-white"
          >
            {loading
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> جاري التوليد...</>
              : <><Sparkles className="h-4 w-4" /> توليد الصورة</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ── Image Gallery ── */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            الصور المولّدة ({images.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <div key={i} className="harmony-card overflow-hidden group">
                <div className="relative aspect-square bg-black/50 overflow-hidden rounded-t-[22px]">
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    onClick={() => setSelectedImg(img)}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 gap-2">
                    <button onClick={() => downloadImage(img)}
                      className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setSelectedImg(img)}
                      className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-mono text-zinc-300 line-clamp-2" dir="ltr">{img.prompt}</p>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600">
                    <span>{img.model}</span>
                    <span>·</span>
                    <span>{img.provider}</span>
                    <span className="mr-auto">{img.timestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {images.length === 0 && !loading && (
        <div className="harmony-card p-12 text-center space-y-3">
          <div className="h-16 w-16 rgb-border rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-sm font-mono text-zinc-500">اكتب وصفاً وسيولّد الذكاء الاصطناعي الصورة</p>
          <p className="text-[10px] font-mono text-zinc-700">يدعم FLUX و SDXL و DALL-E 3</p>
        </div>
      )}

      {/* ── Full screen image view ── */}
      {selectedImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setSelectedImg(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImg(null)}
              className="absolute -top-10 left-0 text-zinc-400 hover:text-white font-mono text-sm flex items-center gap-2">
              <X className="h-4 w-4" /> إغلاق
            </button>
            <img src={selectedImg.url} alt={selectedImg.prompt}
              className="w-full rounded-[22px] shadow-2xl" />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] font-mono text-zinc-500" dir="ltr">{selectedImg.prompt}</p>
              <button onClick={() => downloadImage(selectedImg)}
                className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-xl rgb-border text-white bg-white/5">
                <Download className="h-3 w-3" /> تحميل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
