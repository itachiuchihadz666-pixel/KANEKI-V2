import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Github, Upload, CheckCircle2, XCircle, RefreshCw,
  GitBranch, KeyRound, Eye, EyeOff, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PushResult {
  success: boolean;
  pushed: string[];
  failed: string[];
}

const REPO_OWNER = "itachiuchihadz666-pixel";
const REPO_NAME  = "KANEKI-V2";

export default function GithubDeploy() {
  const { toast } = useToast();
  const [repoOwner, setRepoOwner]     = useState(REPO_OWNER);
  const [repoName, setRepoName]       = useState(REPO_NAME);
  const [commitMsg, setCommitMsg]     = useState("🤖 KANEKI V2 — Auto update via Dashboard");
  const [ghToken, setGhToken]         = useState("");
  const [showToken, setShowToken]     = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSaved, setTokenSaved]   = useState(false);
  const [pushing, setPushing]         = useState(false);
  const [result, setResult]           = useState<PushResult | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/ai/keys`)
      .then(r => r.json())
      .then((d: { github?: { configured: boolean } }) => {
        if (d.github?.configured) setTokenSaved(true);
      })
      .catch(() => {});
  }, []);

  const handleSaveToken = async () => {
    if (!ghToken.trim()) return;
    setSavingToken(true);
    try {
      const r = await fetch(`${BASE}/api/ai/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github: ghToken.trim() }),
      });
      if (!r.ok) throw new Error("فشل الحفظ");
      setTokenSaved(true);
      setGhToken("");
      toast({ title: "✅ تم حفظ GitHub Token" });
    } catch (e) {
      toast({ title: "خطأ", description: String(e), variant: "destructive" });
    }
    setSavingToken(false);
  };

  const handlePush = async () => {
    if (!repoOwner.trim() || !repoName.trim()) {
      toast({ title: "أدخل اسم المستخدم والريبو", variant: "destructive" });
      return;
    }
    setPushing(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/bot/github-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: repoOwner.trim(),
          repoName: repoName.trim(),
          commitMessage: commitMsg,
        }),
      });
      const data = await res.json() as PushResult & { error?: string };
      if (data.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      } else {
        setResult(data);
        toast({
          title: data.success ? "✅ تم الرفع بنجاح" : "⚠️ اكتمل بأخطاء",
          description: `نجح: ${data.pushed.length} | فشل: ${data.failed.length}`,
          variant: data.success ? "default" : "destructive",
        });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
    setPushing(false);
  };

  return (
    <div className="space-y-5 p-1" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 bg-gradient-to-br from-primary/20 to-violet-500/10 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <Github className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-white">GitHub Deploy</h2>
          <p className="text-[10px] text-muted-foreground font-mono">ارفع ملفات البوت مباشرةً لريبو GitHub</p>
        </div>
      </div>

      {/* GitHub Token */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-card/80 to-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-amber-400 flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5" /> GitHub Personal Access Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
            أنشئ token من: <span className="text-amber-400/80" dir="ltr">github.com → Settings → Developer settings → Personal access tokens → Fine-grained</span>
            <br />الصلاحيات المطلوبة: <span className="text-amber-400/60">Contents (Read & Write)</span>
          </p>
          {tokenSaved && !ghToken && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-green-400 bg-green-500/5 border border-green-500/20 rounded-xl px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Token محفوظ مسبقاً ✓
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                placeholder={tokenSaved ? "••••••••••• (محفوظ)" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                className="h-9 bg-background/50 font-mono text-xs pr-8"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Button
              onClick={handleSaveToken}
              disabled={savingToken || !ghToken.trim()}
              variant="outline"
              className="h-9 px-3 font-mono text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              {savingToken ? <RefreshCw className="h-3 w-3 animate-spin" /> : "حفظ"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Repo Config */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" /> إعدادات الريبو
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Owner</label>
              <Input value={repoOwner} onChange={e => setRepoOwner(e.target.value)}
                placeholder="username" className="h-9 bg-background/50 font-mono text-xs" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Repo Name</label>
              <Input value={repoName} onChange={e => setRepoName(e.target.value)}
                placeholder="kaneki-bot" className="h-9 bg-background/50 font-mono text-xs" dir="ltr" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">رسالة Commit</label>
            <Input value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
              className="h-9 bg-background/50 font-mono text-xs" dir="ltr" />
          </div>

          {repoOwner && repoName && (
            <div className="bg-background/40 rounded-xl p-2.5 font-mono text-[10px] text-primary/60 border border-primary/10" dir="ltr">
              🔗 https://github.com/{repoOwner}/{repoName}
            </div>
          )}

          <Button
            onClick={handlePush}
            disabled={pushing || !repoOwner.trim() || !repoName.trim()}
            className="w-full font-mono text-xs uppercase tracking-widest h-11 bg-primary/90 hover:bg-primary shadow-[0_0_20px_rgba(59,130,246,0.2)] gap-2"
          >
            {pushing
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> جاري الرفع...</>
              : <><Zap className="h-4 w-4" /> رفع ملفات البوت للـ GitHub</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={cn(
          "bg-card/50",
          result.success ? "border-green-500/30" : "border-amber-500/30"
        )}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              {result.success
                ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                : <XCircle className="h-5 w-5 text-amber-400" />
              }
              <span className="text-sm font-mono font-bold">
                {result.success ? "✅ رُفع بنجاح!" : "⚠️ اكتمل بأخطاء"}
              </span>
            </div>
            {result.pushed.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-green-400 uppercase">✅ نجح:</p>
                {result.pushed.map(f => (
                  <p key={f} className="text-[10px] font-mono text-zinc-500 mr-3">• {f}</p>
                ))}
              </div>
            )}
            {result.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-destructive uppercase">❌ فشل:</p>
                {result.failed.map(f => (
                  <p key={f} className="text-[10px] font-mono text-zinc-500 mr-3">• {f}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files list */}
      <Card className="border-border/20 bg-card/20">
        <CardContent className="pt-4 space-y-1.5 text-[10px] font-mono text-muted-foreground">
          <p className="text-primary/50 mb-2">📁 الملفات التي ستُرفع:</p>
          <p>• <span className="text-zinc-400">artifacts/fb-bot/index.js</span> — الكود الرئيسي</p>
          <p>• <span className="text-zinc-400">artifacts/fb-bot/package.json</span> — التبعيات</p>
          <p>• <span className="text-zinc-400">artifacts/api-server/src/routes/ai.ts</span> — AI routes</p>
          <p>• <span className="text-zinc-400">artifacts/bot-dashboard/src/components/ui/card.tsx</span> — UI Card</p>
          <p>• <span className="text-zinc-400">artifacts/bot-dashboard/src/index.css</span> — التصميم</p>
          <p>• <span className="text-zinc-400">artifacts/bot-dashboard/src/pages/github-deploy.tsx</span> — هذه الصفحة</p>
        </CardContent>
      </Card>
    </div>
  );
}
