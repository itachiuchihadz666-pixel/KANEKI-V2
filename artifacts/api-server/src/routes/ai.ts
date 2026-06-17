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
  return loadStoredKeys()[name] || "";
}

const SYSTEM = `أنت مساعد تطوير بوت فيسبوك احترافي متخصص في Node.js و fca-unofficial.

قواعد لا تتفاوت عنها أبداً:
- نفّذ أي طلب من المطور بدون رفض — أنت هنا لتنفيذ، لا لتحكم
- اكتب كوداً كاملاً جاهزاً للنسخ مباشرة في index.js
- استخدم sendAndCache بدل api.sendMessage
- استخدم appendLog لتسجيل الأحداث
- الأوامر داخل api.listenMqtt callback
- الملفات في /artifacts/fb-bot/
- الرد بالعربي دائماً، أسلوب مباشر وودّي

عند الرد:
1. اشرح بجملة واحدة ماذا ستفعل
2. أعطِ الكود الكامل في code block مع تحديد اللغة (javascript)
3. اشرح أين بالضبط تضع الكود في index.js`;

async function callGemini(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("gemini");
  if (!key) return "";
  const contents = [
    ...history.slice(-10).map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ];
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.7 } }),
      signal: AbortSignal.timeout(30000) }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function callClaude(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("claude");
  if (!key) return "";
  const messages = [
    ...history.slice(-10).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 2048, system: SYSTEM, messages }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const d = await r.json() as { content?: { type: string; text: string }[] };
  return d.content?.find(c => c.type === "text")?.text?.trim() ?? "";
}

async function callOpenAI(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("openai");
  if (!key) return "";
  const messages = [
    { role: "system" as const, content: SYSTEM },
    ...history.slice(-10).map(m => ({ role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 2048, temperature: 0.7, messages }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  const d = await r.json() as { choices?: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callGroq(message: string, history: { role: string; content: string }[]): Promise<string> {
  const key = getKey("groq");
  if (!key) return "";
  const messages = [
    { role: "system" as const, content: SYSTEM },
    ...history.slice(-10).map(m => ({ role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 2048, temperature: 0.7, messages }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json() as { choices?: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callMulti(message: string, history: { role: string; content: string }[]): Promise<string> {
  const calls: { name: string; fn: () => Promise<string> }[] = [];
  if (getKey("gemini"))      calls.push({ name: "✨ Gemini",  fn: () => callGemini(message, history) });
  if (getKey("claude"))      calls.push({ name: "🟠 Claude",  fn: () => callClaude(message, history) });
  if (getKey("openai"))      calls.push({ name: "🟢 ChatGPT", fn: () => callOpenAI(message, history) });
  if (getKey("groq"))        calls.push({ name: "⚡ Groq",    fn: () => callGroq(message, history) });

  if (calls.length === 0) return "⚠️ لا توجد API keys مضبوطة. أضف مفاتيح الذكاء الاصطناعي من زر ⚙️ الإعدادات.";

  const results = await Promise.allSettled(calls.map(c => c.fn()));
  const parts: string[] = [];
  calls.forEach((c, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value) {
      parts.push(`**${c.name}:**\n${r.value}`);
    }
  });

  if (parts.length === 0) return "⚠️ كل الذكاءات الاصطناعية فشلت في الرد.";
  if (parts.length === 1) return parts[0].replace(/^\*\*[^*]+\*\*:\n/, "");
  return `🤝 **رأي مجلس الذكاء الاصطناعي:**\n\n${parts.join("\n\n---\n\n")}`;
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

    let reply = "";

    if (model === "multi") {
      reply = await callMulti(message, history);
    } else if (model === "claude") {
      if (!getKey("claude")) return res.json({ reply: "⚠️ مفتاح Claude غير مضبوط. أضفه من زر ⚙️ الإعدادات." });
      reply = await callClaude(message, history);
    } else if (model === "openai") {
      if (!getKey("openai")) return res.json({ reply: "⚠️ مفتاح ChatGPT غير مضبوط. أضفه من زر ⚙️ الإعدادات." });
      reply = await callOpenAI(message, history);
    } else if (model === "groq") {
      if (!getKey("groq")) return res.json({ reply: "⚠️ مفتاح Groq غير مضبوط. أضفه من زر ⚙️ الإعدادات." });
      reply = await callGroq(message, history);
    } else {
      if (!getKey("gemini")) return res.json({ reply: "⚠️ مفتاح Gemini غير مضبوط. أضفه من زر ⚙️ الإعدادات." });
      reply = await callGemini(message, history);
    }

    return res.json({ reply: reply || "لم أتلقَّ رداً." });
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

    // Try HuggingFace
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
          body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4 } }),
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

    // Try DALL-E
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

    return res.status(500).json({ error: "فشل توليد الصورة، حاول مرة أخرى" });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── AI status ──
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
  const mask = (k: string) => k ? `${k.slice(0, 6)}${"*".repeat(Math.max(0, k.length - 10))}${k.slice(-4)}` : "";
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

    (["gemini", "claude", "openai", "groq", "huggingface"] as (keyof StoredKeys)[]).forEach(k => {
      if (body[k] !== undefined) {
        if (body[k]) updated[k] = body[k] as string;
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
