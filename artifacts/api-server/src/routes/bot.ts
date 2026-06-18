import { Router } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const BOT_LOG_FILE = path.join(process.cwd(), "../../artifacts/fb-bot/bot.log");
const BOT_STATS_FILE = path.join(process.cwd(), "../../artifacts/fb-bot/stats.json");
const APPSTATE_FILE = path.join(process.cwd(), "../../artifacts/fb-bot/appstate.json");
const BOT_SIGNAL_FILE = path.join(process.cwd(), "../../artifacts/fb-bot/reload_signal.json");
const BOT_LIB_DIR = path.join(process.cwd(), "../../artifacts/fb-bot/bot_library");
const BOT_API_URL = "http://localhost:3500";

const fetchBotApi = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${BOT_API_URL}/bot-api${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    signal: AbortSignal.timeout(5000),
  });
  return response.json();
};

router.get("/bot/status", async (req, res) => {
  try {
    const data = await fetchBotApi("/status");
    return res.json(data);
  } catch {
    return res.json({ online: false, enabled: false, uptime: 0, account: null, lastActivity: null });
  }
});

router.post("/bot/full-lock", async (req, res) => {
  try {
    const body = req.body as { isFullyLocked: boolean };
    const data = await fetchBotApi("/full-lock", {
      method: "POST",
      body: JSON.stringify({ isFullyLocked: body.isFullyLocked }),
    });
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Bot unreachable" });
  }
});

router.post("/bot/toggle", async (req, res) => {
  try {
    const body = req.body as { enabled: boolean };
    const data = await fetchBotApi("/toggle", {
      method: "POST",
      body: JSON.stringify({ enabled: body.enabled }),
    });
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Bot unreachable" });
  }
});

router.get("/bot/logs", async (req, res) => {
  try {
    const data = await fetchBotApi("/logs");
    return res.json(data);
  } catch {
    try {
      if (fs.existsSync(BOT_LOG_FILE)) {
        const rawLogs = JSON.parse(fs.readFileSync(BOT_LOG_FILE, "utf8")) as Array<{
          timestamp: string; level: string; message: string; threadId?: string | null;
        }>;
        const logs = rawLogs.slice(-100).reverse().map((l, i) => ({ ...l, id: i + 1, threadId: l.threadId ?? null }));
        return res.json(logs);
      }
    } catch {}
    return res.json([]);
  }
});

router.get("/bot/stats", async (req, res) => {
  try {
    const data = await fetchBotApi("/stats");
    return res.json(data);
  } catch {
    try {
      if (fs.existsSync(BOT_STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(BOT_STATS_FILE, "utf8")) as {
          messagesHandled?: number; commandsExecuted?: number; groupsActive?: number;
          aiReplies?: number; pinterestSearches?: number;
        };
        return res.json({ messagesHandled: stats.messagesHandled ?? 0, commandsExecuted: stats.commandsExecuted ?? 0, groupsActive: stats.groupsActive ?? 0, aiReplies: stats.aiReplies ?? 0, pinterestSearches: stats.pinterestSearches ?? 0, uptime: 0 });
      }
    } catch {}
    return res.json({ messagesHandled: 0, commandsExecuted: 0, groupsActive: 0, aiReplies: 0, pinterestSearches: 0, uptime: 0 });
  }
});

router.get("/bot/cookies", (req, res) => {
  try {
    if (!fs.existsSync(APPSTATE_FILE)) return res.json({ exists: false, sizeBytes: 0, lastModified: null, cookieCount: 0 });
    const stat = fs.statSync(APPSTATE_FILE);
    const raw = fs.readFileSync(APPSTATE_FILE, "utf8");
    let cookieCount = 0;
    try { const parsed = JSON.parse(raw); cookieCount = Array.isArray(parsed) ? parsed.length : 0; } catch {}
    return res.json({ exists: true, sizeBytes: stat.size, lastModified: stat.mtime.toISOString(), cookieCount });
  } catch {
    return res.json({ exists: false, sizeBytes: 0, lastModified: null, cookieCount: 0 });
  }
});

router.post("/bot/cookies", (req, res) => {
  try {
    const body = req.body as { cookies: string };
    if (!body.cookies || typeof body.cookies !== "string") return res.status(400).json({ error: "حقل cookies مطلوب" });
    let parsed: unknown;
    try { parsed = JSON.parse(body.cookies); } catch { return res.status(400).json({ error: "الكوكيز ليست JSON صحيحة" }); }
    if (!Array.isArray(parsed) || parsed.length === 0) return res.status(400).json({ error: "يجب أن تكون الكوكيز مصفوفة JSON غير فارغة" });
    fs.writeFileSync(APPSTATE_FILE, body.cookies, "utf8");
    fs.writeFileSync(BOT_SIGNAL_FILE, JSON.stringify({ reload: true, timestamp: Date.now() }), "utf8");
    const stat = fs.statSync(APPSTATE_FILE);
    return res.json({ exists: true, sizeBytes: stat.size, lastModified: stat.mtime.toISOString(), cookieCount: (parsed as unknown[]).length });
  } catch {
    return res.status(500).json({ error: "فشل حفظ الكوكيز" });
  }
});

router.get("/bot/admins", async (req, res) => {
  try { return res.json(await fetchBotApi("/admins")); } catch { return res.json([]); }
});

router.post("/bot/admins", async (req, res) => {
  try {
    const body = req.body as { id: string; name?: string };
    return res.json(await fetchBotApi("/admins", { method: "POST", body: JSON.stringify({ id: body.id, name: body.name || body.id }) }));
  } catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

router.delete("/bot/admins/:id", async (req, res) => {
  try { return res.json(await fetchBotApi(`/admins/${req.params.id}`, { method: "DELETE" })); }
  catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

// ============ Custom Commands ============
router.get("/bot/custom-commands", async (req, res) => {
  try { return res.json(await fetchBotApi("/custom-commands")); } catch { return res.json([]); }
});

router.post("/bot/custom-commands", async (req, res) => {
  try {
    const body = req.body as { trigger: string; response: string; matchType?: string };
    return res.json(await fetchBotApi("/custom-commands", { method: "POST", body: JSON.stringify(body) }));
  } catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

router.delete("/bot/custom-commands/:index", async (req, res) => {
  try { return res.json(await fetchBotApi(`/custom-commands/${req.params.index}`, { method: "DELETE" })); }
  catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

// ============ Command Permissions ============
router.get("/bot/command-permissions", async (req, res) => {
  try { return res.json(await fetchBotApi("/command-permissions")); } catch { return res.json({}); }
});

router.post("/bot/command-permissions", async (req, res) => {
  try {
    const body = req.body as { command: string; permission: string };
    return res.json(await fetchBotApi("/command-permissions", { method: "POST", body: JSON.stringify(body) }));
  } catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

// ============ File Manager ============
router.get("/bot/files", async (req, res) => {
  try { return res.json(await fetchBotApi("/files")); } catch { return res.json({ botLibrary: [], downloads: [] }); }
});

router.post("/bot/files", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const folder = (req.body as { folder?: string }).folder || "bot_library";
    const destDir = path.join(BOT_LIB_DIR, folder === "bot_library" ? "" : folder);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, req.file.originalname);
    fs.writeFileSync(destPath, req.file.buffer);
    return res.json({ success: true, name: req.file.originalname, size: req.file.size });
  } catch (e) {
    return res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/bot/files/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    return res.json(await fetchBotApi(`/files/${encodeURIComponent(name)}`, { method: "DELETE" }));
  } catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

// ============ Engine Mode ============
router.get("/bot/engine", async (req, res) => {
  try { return res.json(await fetchBotApi("/engine")); } catch { return res.json({ engineMode: false }); }
});

router.post("/bot/engine", async (req, res) => {
  try {
    const body = req.body as { enabled: boolean };
    return res.json(await fetchBotApi("/engine", { method: "POST", body: JSON.stringify({ enabled: body.enabled }) }));
  } catch { return res.status(503).json({ error: "Bot unreachable" }); }
});

// ============ GitHub Push ============
router.post("/bot/github-push", async (req, res) => {
  const { repoOwner, repoName, commitMessage = "Bot update via dashboard" } = req.body as { repoOwner: string; repoName: string; commitMessage?: string };

  // Check env var first, then stored keys
  let token = process.env.GITHUB_TOKEN || "";
  if (!token) {
    try {
      const keysFile = path.join(process.cwd(), "artifacts/api-server/ai-keys.json");
      if (fs.existsSync(keysFile)) {
        const stored = JSON.parse(fs.readFileSync(keysFile, "utf8")) as { github?: string };
        if (stored.github) token = stored.github;
      }
    } catch {}
  }
  if (!token) return res.status(400).json({ error: "لم يتم إعداد GitHub Token. أضفه من صفحة Deploy." });
  if (!repoOwner || !repoName) return res.status(400).json({ error: "repoOwner and repoName required" });

  const ROOT = process.cwd();
  const filesToPush: { file: string; ghPath: string }[] = [
    { file: path.join(ROOT, "artifacts/fb-bot/index.js"),                                     ghPath: "artifacts/fb-bot/index.js" },
    { file: path.join(ROOT, "artifacts/fb-bot/package.json"),                                  ghPath: "artifacts/fb-bot/package.json" },
    { file: path.join(ROOT, "artifacts/api-server/src/routes/ai.ts"),                          ghPath: "artifacts/api-server/src/routes/ai.ts" },
    { file: path.join(ROOT, "artifacts/api-server/src/routes/bot.ts"),                         ghPath: "artifacts/api-server/src/routes/bot.ts" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/components/ui/card.tsx"),             ghPath: "artifacts/bot-dashboard/src/components/ui/card.tsx" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/index.css"),                          ghPath: "artifacts/bot-dashboard/src/index.css" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/App.tsx"),                            ghPath: "artifacts/bot-dashboard/src/App.tsx" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/pages/github-deploy.tsx"),            ghPath: "artifacts/bot-dashboard/src/pages/github-deploy.tsx" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/pages/ai-assistant.tsx"),             ghPath: "artifacts/bot-dashboard/src/pages/ai-assistant.tsx" },
    { file: path.join(ROOT, "artifacts/bot-dashboard/src/pages/image-ai.tsx"),                 ghPath: "artifacts/bot-dashboard/src/pages/image-ai.tsx" },
  ];
  const pushed: string[] = [];
  const failed: string[] = [];

  const ghHeaders = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };

  for (const { file, ghPath } of filesToPush) {
    if (!fs.existsSync(file)) { failed.push(ghPath); continue; }
    try {
      const content = Buffer.from(fs.readFileSync(file)).toString("base64");
      let sha: string | undefined;
      try {
        const check = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${ghPath}`, { headers: ghHeaders });
        sha = (check.data as { sha: string }).sha;
      } catch {}
      await axios.put(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${ghPath}`, {
        message: commitMessage, content, ...(sha ? { sha } : {})
      }, { headers: ghHeaders });
      pushed.push(ghPath);
    } catch (e: unknown) {
      failed.push(ghPath);
      req.log?.warn?.({ err: e }, `Failed to push ${ghPath}`);
    }
  }

  return res.json({ success: failed.length === 0, pushed, failed });
});

export default router;
