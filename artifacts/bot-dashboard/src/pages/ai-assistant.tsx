import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit, Send, RefreshCw, Upload, Sparkles, User, Bot,
  Paperclip, X, Code2, Zap, Layers, Hash, Settings, Eye, EyeOff,
  KeyRound, CheckCircle2, AlertCircle, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AIModel = "gemini" | "claude" | "openai" | "groq" | "multi";

interface ModelInfo { id: AIModel; label: string; badge: string; color: string; desc: string; keyName: string; keyLabel: string; keyPlaceholder: string }
const MODELS: ModelInfo[] = [
  { id: "gemini", label: "Gemini",   badge: "✨", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/40 text-blue-300",       desc: "Google · سريع ودقيق",  keyName: "gemini", keyLabel: "Gemini API Key",   keyPlaceholder: "AIza..." },
  { id: "claude", label: "Claude",   badge: "🟠", color: "from-orange-500/20 to-amber-500/10 border-orange-500/40 text-orange-300", desc: "Anthropic · إبداعي",   keyName: "claude", keyLabel: "Anthropic API Key", keyPlaceholder: "sk-ant-..." },
  { id: "openai", label: "ChatGPT",  badge: "🟢", color: "from-emerald-500/20 to-green-500/10 border-emerald-500/40 text-emerald-300", desc: "OpenAI · شامل",       keyName: "openai", keyLabel: "OpenAI API Key",   keyPlaceholder: "sk-..." },
  { id: "groq",   label: "Groq",     badge: "⚡", color: "from-purple-500/20 to-violet-500/10 border-purple-500/40 text-purple-300", desc: "LLaMA · الأسرع",       keyName: "groq",   keyLabel: "Groq API Key",     keyPlaceholder: "gsk_..." },
  { id: "multi",  label: "Multi-AI", badge: "🤝", color: "from-primary/20 to-indigo-500/10 border-primary/40 text-primary",         desc: "كل الذكاءات معاً",    keyName: "",       keyLabel: "",                 keyPlaceholder: "" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: AIModel;
  file?: { name: string; type: string };
}

interface KeyInfo { configured: boolean; masked: string; fromEnv: boolean; stored: boolean }
interface KeysStatus { gemini: KeyInfo; claude: KeyInfo; openai: KeyInfo; groq: KeyInfo }

const QUICK_PROMPTS = [
  "أضف أمر جديد /ترحيب يرسل رسالة ترحيب بالأعضاء الجدد",
  "أضف فلتر يحذف أي رسالة تحتوي على روابط",
  "أضف أمر /تصويت ينشئ استفتاء في المجموعة",
  "كيف أجعل البوت يرد بصوت TTS على الأوامر؟",
  "أضف أمر /سحب يختار عضواً عشوائياً للفوز",
];

export default function AIAssistant() {
  const { toast } = useToast();
  const [model, setModel]   = useState<AIModel>("gemini");
  const [aiStatus, setAiStatus] = useState<Record<string, boolean>>({});
  const [keysStatus, setKeysStatus] = useState<KeysStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "أهلاً 👋 أنا مجلس الذكاء الاصطناعي لتطوير كانيكي بوت.\n\n• اختر الذكاء الاصطناعي المناسب من الأعلى\n• أو استخدم **Multi-AI** ليردوا جميعاً\n• ارفع صورة أو فيديو وأخبرني بأي أمر تريد إرساله فيه\n• أضف API keys من زر ⚙️ الإعدادات\n\nاكتب أي طلب!",
    timestamp: new Date(),
  }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const [fileName, setFileName]     = useState("");
  const [fileCmd, setFileCmd]       = useState("");
  const [fileDesc, setFileDesc]     = useState("");
  const [keyInputs, setKeyInputs]   = useState<Record<string, string>>({ gemini: "", claude: "", openai: "", groq: "" });
  const [showKey, setShowKey]       = useState<Record<string, boolean>>({});
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchStatus = () => {
    fetch(`${BASE}/api/ai/status`)
      .then(r => r.json())
      .then(d => setAiStatus(d as Record<string, boolean>))
      .catch(() => {});
    fetch(`${BASE}/api/ai/keys`)
      .then(r => r.json())
      .then(d => setKeysStatus(d as KeysStatus))
      .catch(() => {});
  };

  useEffect(() => { fetchStatus(); }, []);

  const currentModel = MODELS.find(m => m.id === model)!;

  const sendMessage = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: new Date(), model };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const r = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, model }),
      });
      if (!r.ok) throw new Error("فشل الاتصال");
      const d = await r.json() as { reply: string };
      setMessages(p => [...p, { role: "assistant", content: d.reply, timestamp: new Date(), model }]);
    } catch (e) {
      toast({ title: "خطأ", description: String(e), variant: "destructive" });
      setMessages(p => [...p, { role: "assistant", content: "⚠️ فشل الاتصال بالذكاء الاصطناعي.", timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const finalName = fileName.trim() || file.name;
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const savedName = finalName.includes(".") ? finalName : `${finalName}${ext}`;

      const formData = new FormData();
      const renamed = new File([file], savedName, { type: file.type });
      formData.append("file", renamed);
      formData.append("folder", "bot_library");
      const r = await fetch(`${BASE}/api/bot/files`, { method: "POST", body: formData });
      if (!r.ok) throw new Error("فشل الرفع");

      const cmdPart = fileCmd.trim() ? `\n\nالأمر الذي يجب أن يرسل هذا الملف: **${fileCmd.trim()}**` : "";
      const descPart = fileDesc.trim() ? `\nالوصف: ${fileDesc.trim()}` : "";
      const prompt = `رفعت ملف باسم "${savedName}" (${file.type}).${descPart}${cmdPart}\nاكتب كود يضيف هذا الأمر للبوت مع إرسال الملف.`;

      const userMsg: Message = { role: "user", content: prompt, timestamp: new Date(), file: { name: savedName, type: file.type } };
      setMessages(p => [...p, userMsg]);
      setFile(null); setFileName(""); setFileCmd(""); setFileDesc(""); setShowUpload(false);
      setLoading(true);

      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const aiR = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history, model }),
      });
      if (aiR.ok) {
        const d = await aiR.json() as { reply: string };
        setMessages(p => [...p, { role: "assistant", content: d.reply, timestamp: new Date(), model }]);
      }
      toast({ title: "✅ رُفع الملف بنجاح", description: savedName });
    } catch (e) {
      toast({ title: "خطأ في الرفع", description: String(e), variant: "destructive" });
    }
    setUploading(false); setLoading(false);
  };

  const handleSaveKeys = async () => {
    setSavingKeys(true);
    try {
      const body: Record<string, string> = {};
      Object.entries(keyInputs).forEach(([k, v]) => { if (v.trim()) body[k] = v.trim(); });
      const r = await fetch(`${BASE}/api/ai/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("فشل الحفظ");
      toast({ title: "✅ تم حفظ المفاتيح", description: "سيتم تطبيقها فوراً" });
      setKeyInputs({ gemini: "", claude: "", openai: "", groq: "" });
      fetchStatus();
    } catch (e) {
      toast({ title: "خطأ", description: String(e), variant: "destructive" });
    }
    setSavingKeys(false);
  };

  const clearChat = () => setMessages([{ role: "assistant", content: "تم مسح المحادثة 🔧 كيف يمكنني مساعدتك؟", timestamp: new Date() }]);

  const modelColor = (m?: AIModel) => MODELS.find(x => x.id === m)?.color ?? "";

  function renderContent(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) =>
      part.startsWith("```") ? (
        <pre key={i} className="bg-black/50 rounded-xl p-4 text-xs font-mono text-green-300 overflow-x-auto border border-white/8 my-2 whitespace-pre-wrap">
          <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-white/10 text-[10px] text-zinc-500 uppercase tracking-wider">
            <Code2 className="h-3 w-3" /> javascript
          </div>
          {part.replace(/^```\w*\n?/, "").replace(/```$/, "")}
        </pre>
      ) : (
        <span key={i} className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/---/g, '<hr class="border-white/10 my-3"/>') }} />
      )
    );
  }

  const isActive = (id: string) => aiStatus[id] === true;
  const any = Object.values(aiStatus).some(Boolean);

  const keyStatus = (id: string): KeyInfo | null => keysStatus?.[id as keyof KeysStatus] ?? null;

  return (
    <div className="space-y-3 h-full flex flex-col" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary/20 to-indigo-500/10 rounded-xl border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-white">AI Council</h2>
            <p className="text-[10px] text-muted-foreground font-mono">مجلس الذكاء الاصطناعي · تطوير البوت</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => { setShowSettings(v => !v); setShowUpload(false); }}
            className={cn("font-mono text-[11px] h-8 gap-1.5 border-border/40", showSettings && "bg-amber-500/10 border-amber-500/40 text-amber-400")}>
            <Settings className="h-3 w-3" /> API Keys
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowUpload(v => !v); setShowSettings(false); }}
            className={cn("font-mono text-[11px] h-8 gap-1.5 border-border/40", showUpload && "bg-primary/10 border-primary/40 text-primary")}>
            <Paperclip className="h-3 w-3" /> رفع ملف
          </Button>
          <Button size="sm" variant="outline" onClick={clearChat} className="font-mono text-[11px] h-8 gap-1.5 border-border/40">
            <RefreshCw className="h-3 w-3" /> مسح
          </Button>
        </div>
      </div>

      {/* ── Model Selector ── */}
      <div className="flex gap-1.5 flex-wrap">
        {MODELS.map(m => {
          const active = model === m.id;
          const available = m.id === "multi" ? any : isActive(m.id);
          return (
            <button key={m.id} onClick={() => setModel(m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono border transition-all",
                active
                  ? `bg-gradient-to-r ${m.color} shadow-sm scale-[1.02]`
                  : "border-border/30 bg-background/40 text-zinc-500 hover:border-border/60 hover:text-zinc-300"
              )}>
              <span>{m.badge}</span>
              <span>{m.label}</span>
              {!available && <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 border border-zinc-500" />}
              {available && <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />}
            </button>
          );
        })}
      </div>

      {/* ── Active model hint ── */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-mono bg-gradient-to-r",
        currentModel.color
      )}>
        <Zap className="h-3 w-3 shrink-0" />
        <span className="font-semibold">{currentModel.badge} {currentModel.label}</span>
        <span className="opacity-70">— {currentModel.desc}</span>
        {currentModel.id === "multi" && <span className="mr-auto opacity-60">({Object.values(aiStatus).filter(Boolean).length} ذكاء نشط)</span>}
      </div>

      {/* ── API Keys Settings Panel ── */}
      {showSettings && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-card/80 to-amber-500/5 backdrop-blur shadow-xl">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                <KeyRound className="h-3.5 w-3.5" /> إعداد مفاتيح الذكاء الاصطناعي
              </div>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white p-1 rounded transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
              أدخل مفاتيح API الخاصة بك. تُحفظ بأمان على الخادم. المفاتيح المضبوطة عبر متغيرات البيئة لها الأولوية.
            </p>

            {/* Key inputs for each model (excluding multi) */}
            <div className="space-y-3">
              {MODELS.filter(m => m.id !== "multi").map(m => {
                const ks = keyStatus(m.keyName);
                const inputVal = keyInputs[m.keyName] ?? "";
                const visible = showKey[m.keyName] ?? false;

                return (
                  <div key={m.id} className="space-y-1.5">
                    {/* Label row */}
                    <div className="flex items-center justify-between">
                      <label className={cn(
                        "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider",
                        `bg-gradient-to-r ${m.color}`.includes("blue") ? "text-blue-400" :
                        `bg-gradient-to-r ${m.color}`.includes("orange") ? "text-orange-400" :
                        `bg-gradient-to-r ${m.color}`.includes("emerald") ? "text-emerald-400" :
                        "text-purple-400"
                      )}>
                        <span>{m.badge}</span> {m.keyLabel}
                      </label>
                      {/* Status badge */}
                      {ks && (
                        <div className="flex items-center gap-1.5">
                          {ks.fromEnv && (
                            <span className="text-[9px] font-mono bg-blue-500/10 border border-blue-500/25 text-blue-400 px-1.5 py-0.5 rounded">
                              ENV
                            </span>
                          )}
                          {ks.configured ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {ks.fromEnv ? "من البيئة" : "محفوظ"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                              <AlertCircle className="h-3 w-3" /> غير مضبوط
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Masked existing key */}
                    {ks?.configured && ks.masked && !ks.fromEnv && (
                      <div className="text-[9px] font-mono text-zinc-600 px-1" dir="ltr">{ks.masked}</div>
                    )}

                    {/* Input row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={visible ? "text" : "password"}
                          value={inputVal}
                          onChange={e => setKeyInputs(p => ({ ...p, [m.keyName]: e.target.value }))}
                          placeholder={ks?.configured ? `المفتاح الحالي: ${ks.masked}` : m.keyPlaceholder}
                          className="h-9 bg-background/50 border-border/40 font-mono text-xs pr-9"
                          dir="ltr"
                          disabled={ks?.fromEnv}
                        />
                        {!ks?.fromEnv && (
                          <button
                            type="button"
                            onClick={() => setShowKey(p => ({ ...p, [m.keyName]: !p[m.keyName] }))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      {ks?.fromEnv && (
                        <div className="h-9 flex items-center px-3 rounded-md bg-blue-500/5 border border-blue-500/20 text-[9px] font-mono text-blue-400 whitespace-nowrap">
                          مضبوط من ENV
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save button */}
            <Button
              onClick={handleSaveKeys}
              disabled={savingKeys || Object.values(keyInputs).every(v => !v.trim())}
              className="w-full font-mono text-xs gap-2 h-9 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-all"
              variant="outline"
            >
              {savingKeys
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> جاري الحفظ...</>
                : <><Save className="h-3 w-3" /> حفظ المفاتيح</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── File Upload Panel ── */}
      {showUpload && (
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur shadow-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                <Upload className="h-3 w-3 text-primary" /> رفع ملف وربطه بأمر
              </div>
              <button onClick={() => setShowUpload(false)} className="text-zinc-500 hover:text-white p-1 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.gif"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setFileName(f.name.replace(/\.[^.]+$/, "")); } }}
              className="hidden" />
            <div onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
                file ? "border-primary/50 bg-primary/5" : "border-border/30 hover:border-primary/30 hover:bg-primary/5"
              )}>
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm font-mono text-primary">
                  <Paperclip className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-zinc-500 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-7 w-7 text-zinc-600 mx-auto" />
                  <p className="text-xs font-mono text-zinc-500">اضغط لاختيار صورة · فيديو · صوت · PDF</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Hash className="h-2.5 w-2.5" /> اسم الملف المحفوظ
              </label>
              <Input value={fileName} onChange={e => setFileName(e.target.value)}
                placeholder="مثال: ترحيب_المجموعة أو welcome_banner"
                className="h-9 bg-background/50 border-border/40 font-mono text-sm" dir="ltr" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="h-2.5 w-2.5" /> الأمر الذي يرسل هذا الملف
              </label>
              <Input value={fileCmd} onChange={e => setFileCmd(e.target.value)}
                placeholder="مثال: /ترحيب أو /صورة_اليوم"
                className="h-9 bg-background/50 border-border/40 font-mono text-sm" dir="rtl" />
            </div>

            <Textarea value={fileDesc} onChange={e => setFileDesc(e.target.value)}
              placeholder="وصف إضافي اختياري (مثلاً: يُرسل عند دخول عضو جديد)"
              className="min-h-[56px] bg-background/50 border-border/40 resize-none text-sm font-mono" dir="rtl" />

            <Button onClick={handleUpload} disabled={!file || uploading}
              className="w-full font-mono text-xs gap-2 h-9 bg-primary/90 hover:bg-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              {uploading ? <><RefreshCw className="h-3 w-3 animate-spin" /> جاري الرفع...</>
                : <><Upload className="h-3 w-3" /> ارفع + اطلب من AI</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Prompts ── */}
      {messages.length <= 1 && (
        <div className="flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => sendMessage(p)}
              className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-border/25 bg-background/30 text-zinc-500 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
              <Sparkles className="h-2.5 w-2.5 inline ml-1 opacity-60" />{p}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <Card className="flex-1 border-border/30 bg-gradient-to-b from-card/60 to-background/40 backdrop-blur min-h-[300px] shadow-xl">
        <CardContent className="p-4 space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin">
          {messages.map((msg, i) => {
            const mColor = modelColor(msg.model);
            return (
              <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs border shadow-sm mt-0.5",
                  msg.role === "user"
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-zinc-800/80 border-white/10 text-zinc-400"
                )}>
                  {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>

                <div className={cn("max-w-[86%] space-y-1", msg.role === "user" ? "items-end" : "items-start", "flex flex-col")}>
                  {msg.role === "assistant" && msg.model && (
                    <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded-full border bg-gradient-to-r inline-block", mColor)}>
                      {MODELS.find(x => x.id === msg.model)?.badge} {MODELS.find(x => x.id === msg.model)?.label}
                    </span>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed border text-[13px]",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary/20 to-indigo-500/10 border-primary/25 text-white rounded-tl-md"
                      : "bg-white/4 border-white/8 text-zinc-200 rounded-tr-md"
                  )}>
                    {msg.file && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary/60 mb-2 pb-2 border-b border-white/10">
                        <Paperclip className="h-2.5 w-2.5" /> {msg.file.name}
                      </div>
                    )}
                    <div className="prose-invert prose-sm max-w-none">
                      {renderContent(msg.content)}
                    </div>
                    <p className="text-[9px] text-muted-foreground/40 mt-2 font-mono text-left">
                      {msg.timestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5">
              <div className="shrink-0 h-7 w-7 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3 w-3 text-zinc-400" />
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tr-md px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map(d => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce"
                      style={{ animationDelay: `${d * 0.18}s` }} />
                  ))}
                  <span className="text-[10px] font-mono text-zinc-600 ml-2">
                    {currentModel.badge} {currentModel.label} يفكر...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* ── Input ── */}
      <div className="flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`اكتب طلبك لـ ${currentModel.badge} ${currentModel.label}... (Enter إرسال · Shift+Enter سطر جديد)`}
          className="flex-1 min-h-[52px] max-h-[120px] bg-background/50 border-border/40 resize-none text-sm font-mono" dir="rtl" disabled={loading} />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="h-full px-4 bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-shadow hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
