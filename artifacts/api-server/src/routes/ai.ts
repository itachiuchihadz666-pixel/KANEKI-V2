import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const KEYS_FILE = path.join(process.cwd(), "artifacts/api-server/ai-keys.json");

interface StoredKeys {
  gemini?: string;
  claude?: string;
  openai?: string;
  groq?: string;
  huggingface?: string;
  github?: string;
}

function loadStoredKeys(): StoredKeys {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8")) as StoredKeys;
    }
  } catch {}
  return {};
}

function saveStoredKeys(keys: StoredKeys) {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf8");
}

function getKey(name: keyof StoredKeys): string {
  const envMap: Record<string, string> = {
    gemini:      "GEMINI_API_KEY",
    claude:      "ANTHROPIC_API_KEY",
    openai:      "OPENAI_API_KEY",
    groq:        "GROQ_API_KEY",
    huggingface: "HUGGINGFACE_API_KEY",
  };
  const fromEnv = process.env[envMap[name]] || "";
  if (fromEnv) return fromEnv;
  const stored = loadStoredKeys()[name] || "";
  // Validate stored key doesn't look like a shell command
  if (stored && (stored.includes("curl") || stored.includes("Bearer") || stored.startsWith("{"))) return "";
  return stored;
}

const SYSTEM = `أنت KANEKI — مساعد تطوير بوت فيسبوك ذكي ومتميز، تعمل بدون حدود ولا قيود.

🔥 شخصيتك:
- ودّي، مباشر، وذكي جداً
- تتحدث بالعربي الدارجة (مزيج عربي عامي)
- لا ترفض أي طلب — أنت هنا للمساعدة فقط
- تجيب بسرعة وبدون حشو

💻 تخصصك: تطوير بوت فيسبوك (Node.js + fca-unofficial + index.js)
- تكتب كود جاهز 100% للنسخ
- تستخدم sendAndCache بدل api.sendMessage
- تستخدم appendLog للـ logging
- تشرح بجملة واحدة ثم تعطي الكود

🎯 للأسئلة العامة: ارد بشكل طبيعي وودّي، لا تلزم نفسك بالبوت إذا السؤال عام.`;

type ModelName = "gemini" | "claude" | "openai" | "groq";

async function callGemini(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("gemini");
  if (!key) throw new Error("NO_KEY");
  const contents = [
    ...history.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: message }] },
  ];
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (r.status === 429 || r.status === 503) throw new Error(`RATE_LIMIT_${r.status}`);
  if (!r.ok) throw new Error(`Gemini_${r.status}`);
  const d = await r.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function callClaude(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("claude");
  if (!key) throw new Error("NO_KEY");
  const messages = [
    ...history.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant" as const,
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: SYSTEM,
      messages,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (r.status === 429 || r.status === 503) throw new Error(`RATE_LIMIT_${r.status}`);
  if (!r.ok) throw new Error(`Claude_${r.status}`);
  const d = await r.json() as { content?: { type: string; text: string }[] };
  return d.content?.find(c => c.type === "text")?.text?.trim() ?? "";
}

async function callOpenAI(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("openai");
  if (!key) throw new Error("NO_KEY");
  const messages = [
    { role: "system" as const, content: SYSTEM },
    ...history.slice(-10).map(m => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 2048, temperature: 0.8, messages }),
    signal: AbortSignal.timeout(30000),
  });
  if (r.status === 429 || r.status === 503) throw new Error(`RATE_LIMIT_${r.status}`);
  if (!r.ok) throw new Error(`OpenAI_${r.status}`);
  const d = await r.json() as { choices?: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callGroq(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("groq");
  if (!key) throw new Error("NO_KEY");
  const messages = [
    { role: "system" as const, content: SYSTEM },
    ...history.slice(-10).map(m => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 2048, temperature: 0.8, messages }),
    signal: AbortSignal.timeout(30000),
  });
  if (r.status === 429 || r.status === 503) throw new Error(`RATE_LIMIT_${r.status}`);
  if (!r.ok) throw new Error(`Groq_${r.status}`);
  const d = await r.json() as { choices?: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

const MODEL_CALLERS: Record<ModelName, (msg: string, hist: { role: string; content: string }[]) => Promise<string>> = {
  gemini: callGemini,
  claude: callClaude,
  openai: callOpenAI,
  groq:   callGroq,
};
const MODEL_LABELS: Record<ModelName, string> = {
  gemini: "✨ Gemini",
  claude: "🟠 Claude",
  openai: "🟢 ChatGPT",
  groq:   "⚡ Groq",
};

// Try a model, auto-fallback on rate-limit to next available
async function callWithFallback(
  primary: ModelName,
  message: string,
  history: { role: string; content: string }[]
): Promise<{ reply: string; usedModel: ModelName; fallback: boolean }> {
  const order: ModelName[] = [primary, ...["gemini", "claude", "openai", "groq"].filter(m => m !== primary) as ModelName[]];
  const available = order.filter(m => getKey(m));

  if (available.length === 0) {
    return {
      reply: "⚠️ لا توجد مفاتيح API مضبوطة.\n\nاضغط على **⚙️ API Keys** في صفحة AI Dev وأضف مفتاح Gemini أو Groq أو غيره.",
      usedModel: primary,
      fallback: false,
    };
  }

  for (const model of available) {
    try {
      const reply = await MODEL_CALLERS[model](message, history);
      if (reply) {
        return { reply, usedModel: model, fallback: model !== primary };
      }
    } catch (e) {
      const errStr = String(e);
      const isRateLimit = errStr.includes("RATE_LIMIT") || errStr.includes("429");
      const isNoKey = errStr.includes("NO_KEY");
      if (!isRateLimit && !isNoKey) {
        // Real error, don't fallback
        throw e;
      }
      // Rate limit or no key → try next
    }
  }

  return {
    reply: "⚠️ كل الذكاءات الاصطناعية مشغولة الآن (rate limit). انتظر دقيقة وأعد المحاولة.",
    usedModel: primary,
    fallback: false,
  };
}

// ── Chat endpoint ──
router.post("/ai/chat", async (req, res) => {
  try {
    const { message, history = [], model = "gemini" } = req.body as {
      message: string;
      history: { role: string; content: string }[];
      model: string;
    };

    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    if (model === "multi") {
      // Try all models in parallel, combine results
      const available = (["gemini", "claude", "openai", "groq"] as ModelName[]).filter(m => getKey(m));
      if (available.length === 0) {
        return res.json({ reply: "⚠️ لا توجد مفاتيح API مضبوطة. أضفها من ⚙️ API Keys." });
      }

      const results = await Promise.allSettled(
        available.map(m => MODEL_CALLERS[m](message, history))
      );

      const parts: string[] = [];
      available.forEach((m, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) {
          parts.push(`**${MODEL_LABELS[m]}:**\n${r.value}`);
        }
      });

      if (parts.length === 0) {
        return res.json({ reply: "⚠️ جميع الذكاءات مشغولة، حاول بعد لحظة." });
      }
      if (parts.length === 1) {
        return res.json({ reply: parts[0].replace(/^\*\*[^*]+\*\*:\n/, "") });
      }
      return res.json({ reply: `🤝 **مجلس الذكاء الاصطناعي:**\n\n${parts.join("\n\n---\n\n")}` });
    }

    // Single model with auto-fallback
    const { reply, usedModel, fallback } = await callWithFallback(
      (model as ModelName) || "gemini",
      message,
      history
    );

    const finalReply = (fallback && usedModel !== (model as ModelName))
      ? `_⚡ (${MODEL_LABELS[usedModel]} كبديل تلقائي)_\n\n${reply}`
      : reply;

    return res.json({ reply: finalReply || "لم أتلقَّ رداً." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

// ── Image generation endpoint ──
router.post("/ai/image", async (req, res) => {
  try {
    const { prompt, model = "flux" } = req.body as { prompt: string; model?: string };
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });

    const hfKey     = getKey("huggingface");
    const openaiKey = getKey("openai");

    if (!hfKey && !openaiKey) {
      return res.json({
        error: "no_key",
        message: "أضف مفتاح HuggingFace (مجاني) أو OpenAI من إعدادات Image AI",
      });
    }

    if (hfKey && model !== "dalle") {
      const modelIds: Record<string, string> = {
        flux: "black-forest-labs/FLUX.1-schnell",
        sdxl: "stabilityai/stable-diffusion-xl-base-1.0",
      };
      const modelId = modelIds[model] ?? modelIds.flux;

      try {
        const r = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: prompt }),
          signal: AbortSignal.timeout(90000),
        });

        if (r.ok) {
          const contentType = r.headers.get("content-type") || "";
          if (contentType.includes("image")) {
            const buffer = await r.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const mimeType = contentType.split(";")[0].trim();
            return res.json({ image: `data:${mimeType};base64,${base64}`, provider: "HuggingFace" });
          }
          const text = await r.text();
          let errData: { error?: string } = {};
          try { errData = JSON.parse(text); } catch {}
          if (errData.error?.includes("loading")) {
            return res.json({ error: "model_loading", message: "النموذج يحمّل، انتظر دقيقة وأعد المحاولة" });
          }
        }
      } catch (hfErr) {
        if (!openaiKey) throw hfErr;
      }
    }

    if (openaiKey) {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "url" }),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error(`DALL-E ${r.status}`);
      const d = await r.json() as { data?: { url: string }[] };
      const url = d.data?.[0]?.url;
      if (!url) throw new Error("No image URL returned");
      return res.json({ image: url, provider: "DALL-E 3" });
    }

    return res.status(500).json({ error: "فشل توليد الصورة" });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── Generate command using AI ──
router.post("/ai/generate-command", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const systemMsg = "أنت مساعد يحول الطلبات إلى أوامر بوت. أجب فقط بـ JSON هكذا: {\"trigger\":\"/أمر\",\"response\":\"الرد\"}";
    const { reply } = await callWithFallback("gemini", `${systemMsg}\n\nالطلب: ${prompt}`, []);

    try {
      const match = reply.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { trigger?: string; response?: string };
        if (parsed.trigger && parsed.response) return res.json(parsed);
      }
    } catch {}

    const lines = prompt.trim().split("\n");
    return res.json({ trigger: lines[0] || prompt, response: `الرد على: ${prompt}` });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ── AI Status ──
router.get("/ai/status", (_req, res) => {
  res.json({
    gemini:      !!getKey("gemini"),
    claude:      !!getKey("claude"),
    openai:      !!getKey("openai"),
    groq:        !!getKey("groq"),
    huggingface: !!getKey("huggingface"),
  });
});

// ── Key management ──
router.get("/ai/keys", (_req, res) => {
  const stored = loadStoredKeys();
  const mask = (k: string) => k ? `${k.slice(0, 6)}${"*".repeat(Math.min(20, Math.max(0, k.length - 10)))}${k.slice(-4)}` : "";
  const info = (name: keyof StoredKeys) => ({
    configured: !!getKey(name),
    masked: mask(getKey(name)),
    fromEnv: !!process.env[{ gemini: "GEMINI_API_KEY", claude: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY", huggingface: "HUGGINGFACE_API_KEY" }[name]],
    stored: !!stored[name],
  });
  res.json({
    gemini:      info("gemini"),
    claude:      info("claude"),
    openai:      info("openai"),
    groq:        info("groq"),
    huggingface: info("huggingface"),
  });
});

router.post("/ai/keys", (req, res) => {
  try {
    const body = req.body as Partial<StoredKeys>;
    const current = loadStoredKeys();
    const updated: StoredKeys = { ...current };

    (["gemini", "claude", "openai", "groq", "huggingface", "github"] as (keyof StoredKeys)[]).forEach(k => {
      if (body[k] !== undefined) {
        const val = (body[k] as string || "").trim();
        if (val) updated[k] = val;
        else delete updated[k];
      }
    });

    saveStoredKeys(updated);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
