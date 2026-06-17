import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Trash2, Sparkles, ChevronDown, Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface CustomCommand {
  trigger: string;
  response: string;
  matchType: "exact" | "startsWith" | "contains";
  createdAt: string;
}

const MATCH_LABELS: Record<string, string> = {
  exact: "مطابق تام",
  startsWith: "يبدأ بـ",
  contains: "يحتوي على",
};

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

async function generateWithAI(userRequest: string): Promise<{ trigger: string; response: string } | null> {
  try {
    const res = await fetch(`${BASE}/api/ai/generate-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userRequest }),
    });
    if (res.ok) {
      const data = await res.json() as { trigger?: string; response?: string };
      if (data.trigger && data.response) return { trigger: data.trigger, response: data.response };
    }
  } catch {}
  // Fallback: parse manually from the request
  const lines = userRequest.trim().split("\n");
  return { trigger: lines[0] || userRequest, response: `الرد على: ${userRequest}` };
}

export default function AIBuilder() {
  const { toast } = useToast();
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [manualTrigger, setManualTrigger] = useState("");
  const [manualResponse, setManualResponse] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "startsWith" | "contains">("exact");
  const [tab, setTab] = useState<"ai" | "manual">("ai");

  const loadCommands = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/bot/custom-commands`);
      const data = await res.json() as CustomCommand[];
      setCommands(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "خطأ في التحميل", variant: "destructive" });
    }
    setLoading(false);
  };

  useState(() => { loadCommands(); });

  const addCommand = async (trigger: string, response: string, mt: string = matchType) => {
    try {
      const res = await fetch(`${BASE}/api/bot/custom-commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: trigger.trim(), response: response.trim(), matchType: mt }),
      });
      if (res.ok) {
        await loadCommands();
        toast({ title: "✅ تم إضافة الأمر بنجاح", description: `المشغّل: ${trigger}` });
        setManualTrigger(""); setManualResponse("");
      } else {
        const err = await res.json() as { error?: string };
        toast({ title: "خطأ", description: err.error || "فشل الإضافة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const deleteCommand = async (index: number) => {
    try {
      await fetch(`${BASE}/api/bot/custom-commands/${index}`, { method: "DELETE" });
      await loadCommands();
      toast({ title: "🗑️ تم حذف الأمر" });
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return toast({ title: "اكتب طلبك أولاً", variant: "destructive" });
    setAiLoading(true);
    try {
      const result = await generateWithAI(aiPrompt);
      if (result) {
        await addCommand(result.trigger, result.response, "exact");
        setAiPrompt("");
        toast({ title: "🤖 تم إنشاء الأمر بالذكاء الاصطناعي", description: `المشغّل: ${result.trigger}` });
      }
    } catch {
      toast({ title: "خطأ في الذكاء الاصطناعي", variant: "destructive" });
    }
    setAiLoading(false);
  };

  return (
    <div className="space-y-6 p-1" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-mono uppercase tracking-tight">AI Command Builder</h2>
          <p className="text-xs text-muted-foreground font-mono">اكتب ما تريد وسيُضاف كأمر للبوت تلقائياً</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["ai", "manual"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded border transition-colors",
            tab === t ? "bg-primary/15 border-primary/40 text-primary" : "bg-background/30 border-border/30 text-muted-foreground hover:border-border"
          )}>
            {t === "ai" ? <><Sparkles className="h-3 w-3" /> ذكاء اصطناعي</> : <><MessageSquare className="h-3 w-3" /> يدوي</>}
          </button>
        ))}
      </div>

      {tab === "ai" && (
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              أضف أمراً بالذكاء الاصطناعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="مثال: أريد أمراً يرد على الأعضاء برسالة ترحيب عندما يكتبون /مرحبا"
              className="min-h-[100px] bg-background/50 border-border/50 resize-none text-sm"
              dir="rtl"
            />
            <div className="bg-border/20 rounded-lg p-3 text-xs text-muted-foreground font-mono space-y-1">
              <p className="text-primary/70">💡 يمكنك استخدام المتغيرات في الرد:</p>
              <p>• <code className="text-primary">{"{اسم}"}</code> — اسم المرسل</p>
              <p>• <code className="text-primary">{"{وقت}"}</code> — الوقت الحالي</p>
              <p>• <code className="text-primary">{"{ساعات_التشغيل}"}</code> — ساعات تشغيل البوت</p>
            </div>
            <Button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt.trim()} className="w-full font-mono uppercase tracking-widest h-10 text-xs">
              {aiLoading ? <><Sparkles className="mr-2 h-3 w-3 animate-spin" /> جاري الإنشاء...</> : <><Zap className="mr-2 h-3 w-3" /> أنشئ وأضف الأمر</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "manual" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> إضافة أمر يدوي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">نص المشغّل (الأمر)</label>
              <Input value={manualTrigger} onChange={e => setManualTrigger(e.target.value)}
                placeholder="/مرحبا" className="bg-background/50 border-border/50 font-mono text-sm" dir="ltr" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">الرد</label>
              <Textarea value={manualResponse} onChange={e => setManualResponse(e.target.value)}
                placeholder="أهلاً {اسم}! 🎉" className="min-h-[80px] bg-background/50 border-border/50 resize-none text-sm" dir="rtl" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["exact", "startsWith", "contains"] as const).map(mt => (
                <button key={mt} onClick={() => setMatchType(mt)} className={cn(
                  "text-[10px] font-mono px-2 py-1 rounded border transition-colors",
                  matchType === mt ? "bg-primary/15 border-primary/40 text-primary" : "bg-background/30 border-border/30 text-muted-foreground"
                )}>{MATCH_LABELS[mt]}</button>
              ))}
            </div>
            <Button onClick={() => addCommand(manualTrigger, manualResponse)}
              disabled={!manualTrigger.trim() || !manualResponse.trim()}
              className="w-full font-mono uppercase tracking-widest h-10 text-xs">
              <Plus className="mr-2 h-3 w-3" /> إضافة الأمر
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Commands List */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            الأوامر المخصصة
            <span className="text-[10px] font-normal normal-case mr-auto text-muted-foreground/60">{commands.length} أمر</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">جاري التحميل...</p>
          ) : commands.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 font-mono">لا توجد أوامر مخصصة بعد</p>
          ) : (
            <div className="space-y-2">
              {commands.map((cmd, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-3 rounded-lg border border-border/30 bg-background/30">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{cmd.trigger}</code>
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border",
                        cmd.matchType === "exact" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                        cmd.matchType === "contains" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                        "text-green-400 bg-green-500/10 border-green-500/20"
                      )}>{MATCH_LABELS[cmd.matchType] || cmd.matchType}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">{cmd.response}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteCommand(i)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
