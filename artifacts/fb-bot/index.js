const login = require("@dongdev/fca-unofficial");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const googleTTS = require("google-tts-api");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const playdl = require("play-dl");
const YouTube = require("youtube-sr").default;
const { generateUptimeImage } = require("./generate-uptime-image");
const { generateCommandsMenuImage, generateCategoryDetailImage } = require("./generate-commands-image");
const { generateAllMenuGifs } = require("./generate-menu-gif");

// مخزن مسارات GIF الجاهزة { 1: path, 2: path, 3: path, 4: path }
let menuGifPaths = {};
// جلسات وضع المطور { threadID: { active, history } }
const devSessions = {};

const OWNER_ID = "100079889283302";
const startTime = Date.now();

const FB_EMAIL = "animefluxia.contact@gmail.com";
const FB_PASSWORD = "kaneki saber";
const APPSTATE_FILE = path.join(__dirname, "appstate.json");
const CONFIG_FILE = path.join(__dirname, "typing_config.json");
const STATS_FILE = path.join(__dirname, "stats.json");
const LOG_FILE = path.join(__dirname, "bot.log");

// Stats tracking
let stats = { messagesHandled: 0, commandsExecuted: 0, groupsActive: new Set(), aiReplies: 0, pinterestSearches: 0 };
let botEnabled = true;
let botOnline = false;
let botAccount = null;

const saveStats = () => {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify({
      ...stats,
      groupsActive: stats.groupsActive.size
    }, null, 2));
  } catch (e) {}
};

const appendLog = (level, message, threadId = null) => {
  try {
    const entry = { timestamp: new Date().toISOString(), level, message, threadId };
    const logs = readLogs();
    logs.push(entry);
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    console.log(`[${level}] ${message}`);
  } catch (e) {}
};

const readLogs = () => {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch (e) {}
  return [];
};

// Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

let typingSettings = {};
if (fs.existsSync(CONFIG_FILE)) {
  try { typingSettings = JSON.parse(fs.readFileSync(CONFIG_FILE)); } catch (e) { typingSettings = {}; }
}

const MANGA_DIR = path.join(__dirname, "bot_library", "manga");
const VIDEO_DIR = path.join(__dirname, "bot_library", "video");
const DOWNLOADS_DIR = path.join(__dirname, "downloads");
const BOT_ADMINS_FILE = path.join(__dirname, "bot_admins.json");

// Bot admins (moderators) — separate from Facebook group admins
const loadBotAdmins = () => {
  try {
    if (fs.existsSync(BOT_ADMINS_FILE)) return JSON.parse(fs.readFileSync(BOT_ADMINS_FILE, "utf8"));
  } catch (e) {}
  return [];
};
const saveBotAdmins = (admins) => {
  try { fs.writeFileSync(BOT_ADMINS_FILE, JSON.stringify(admins, null, 2), "utf8"); } catch (e) {}
};

if (!fs.existsSync(path.join(__dirname, "bot_library"))) fs.mkdirSync(path.join(__dirname, "bot_library"));
if (!fs.existsSync(MANGA_DIR)) fs.mkdirSync(MANGA_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

let enabled = true;
let isLocked = false;
let isFullyLocked = false;

const autoReply = {};
const lightning = {};
const lightningSetup = {};
const thunderSetup = {};
const thunder = {};
const THUNDER_MSG = `🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـنـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـجـ🗽ـ🗽ـ🗽ـ🩸ـحـ🗽ـ🗽ـ🗽ـ🩸ـمـ🗽ـ🗽ـ🗽ـ🩸ـسـ🗽ـ🗽ـ🗽ـ🩸ـكـ🗽ـ🗽ـ🗽ـ🩸ـفـ🗽ـ🗽ـ🗽ـ🩸ـيـ🗽ـ🗽ـ🩸ـن`;
const antiOutSettings = {};
const antiLeave = {};
const activeGames = {};
const mangaSelectionSetup = {};
const sharinganStatus = {};
let lastActiveThreadID = null;

const lockThreadName = {};
const lockNicknames = {};
const botMessagesCache = {};
const processedMessages = new Set();
const outputLock = new Map();
const removeAdminSetup = {};

// ============ [ /اوامر — نظام قائمة الأوامر التفاعلية ] ============
const menuMessages = new Map(); // messageID -> { threadID, timestamp }
const gifMenuMessages = new Map(); // messageID -> { threadID, page, timestamp } — for hidden GIF commands

// ============ [ نظام المراقبة ] ============
const monitoringThreads = new Set(); // threadIDs with monitoring enabled

// ============ [ نظام التفاعل العاطفي ] ============
const MOOD_REACTIONS = [
  { keywords: ["هههه", "ههه", "😂", "lol", "haha", "kk", "xd", "XD"], emoji: "😂" },
  { keywords: ["حبيب", "احبك", "love", "❤", "حب", "قلب", "💕"], emoji: "❤️" },
  { keywords: ["🔥", "حلو", "روعة", "ممتاز", "جميل", "wow", "رهيب"], emoji: "🔥" },
  { keywords: ["ليش", "كيف", "وش", "ايش", "؟؟", "مو فاهم"], emoji: "🤔" },
  { keywords: ["صح", "نعم", "اكيد", "ok", "تمام", "صحيح", "ايه"], emoji: "👍" },
  { keywords: ["يا ربي", "سبحان", "الله", "استغفر"], emoji: "🙏" },
  { keywords: ["حزين", "زعلان", "بكيت", "😢", "😭"], emoji: "😢" },
];

const getReactionEmoji = (text) => {
  const lower = text.toLowerCase();
  for (const mood of MOOD_REACTIONS) {
    if (mood.keywords.some(k => lower.includes(k))) return mood.emoji;
  }
  return null;
};

const GIF_FILE_ID = "1x6ReiLcEHKUehT986JEEj5__wS5Gih9G";

const KANEKI_GIF_URLS = [
  "https://media.tenor.com/TXs6O7SdSzsAAAAC/tokyo-ghoul-kaneki.gif",
  "https://media.tenor.com/pxmpqfhmmU0AAAAd/tokyo-ghoul-kaneki-ken.gif",
  "https://media.tenor.com/BWVqoU5WFLEAAAAd/kaneki-tokyo-ghoul.gif",
];

const COMMANDS_CATEGORIES = [
  {
    num: 1, emoji: "🎛️", name: "التحكم الأساسي",
    cmds: [
      { cmd: "/تشغيل", desc: "تفعيل البوت بالكامل" },
      { cmd: "/ايقاف", desc: "تعطيل البوت بالكامل" },
      { cmd: "/قفل", desc: "قفل البوت للمشرفين فقط" },
      { cmd: "/فتح", desc: "فتح البوت لجميع الأعضاء" },
      { cmd: "/قفل_كامل", desc: "قفل كامل — المالك فقط" },
      { cmd: "/فتح_كامل", desc: "إلغاء القفل الكامل" },
    ]
  },
  {
    num: 2, emoji: "🛡️", name: "إدارة المجموعة",
    cmds: [
      { cmd: "/طرد @شخص", desc: "طرد عضو من المجموعة" },
      { cmd: "/غادر", desc: "مغادرة البوت للمجموعة" },
      { cmd: "/مسح", desc: "حذف آخر رسالة للبوت" },
      { cmd: "/مسح_الكل", desc: "سحب آخر 10 رسائل للبوت" },
      { cmd: "/منع_المغادرة", desc: "تفعيل نظام منع المغادرة" },
      { cmd: "/حماية", desc: "تفعيل حماية المالك" },
      { cmd: "/اصلاح", desc: "تنظيف الكنيات العشوائية" },
    ]
  },
  {
    num: 3, emoji: "✏️", name: "التخصيص",
    cmds: [
      { cmd: "/سيطرة_الاسم [اسم]", desc: "قفل اسم المجموعة على الاسم المحدد" },
      { cmd: "/ايقاف_السيطرة", desc: "إيقاف قفل الاسم" },
      { cmd: "/تثبيت_الكنية [اسم]", desc: "فرض كنية على جميع الأعضاء" },
      { cmd: "/ايقاف_التثبيت", desc: "إيقاف تثبيت الكنية" },
      { cmd: "/شارنغان", desc: "تغيير كنيات الجميع مؤقتاً" },
      { cmd: "/محاكاة_الكتابة", desc: "إظهار مؤشر الكتابة" },
    ]
  },
  {
    num: 4, emoji: "🎵", name: "الميديا",
    cmds: [
      { cmd: "بنترست [كلمة]", desc: "بحث وإرسال صورة من Pinterest" },
      { cmd: "/تحميل_صوت [اسم]", desc: "تحميل وإرسال أغنية من YouTube" },
      { cmd: "/صوت [نص]", desc: "تحويل نص إلى صوت (TTS)" },
      { cmd: "/مانغا", desc: "تصفح وقراءة المانغا" },
      { cmd: "/فيديو [اسم]", desc: "بحث وإرسال فيديو" },
      { cmd: "/افتار [اسم]", desc: "إرسال صورة شخصية أنمي" },
    ]
  },
  {
    num: 5, emoji: "🤖", name: "الذكاء الاصطناعي",
    cmds: [
      { cmd: "أي سؤال", desc: "الرد الذكي تلقائياً على الأسئلة" },
      { cmd: "كانيكي [سؤال]", desc: "مخاطبة البوت مباشرة بشخصية كانيكي" },
      { cmd: "kaneki [سؤال]", desc: "نفس الأمر باللغة الإنجليزية" },
      { cmd: "/صوت [نص]", desc: "قراءة النص بصوت عربي" },
    ]
  },
  {
    num: 6, emoji: "⚡", name: "المحرك والأداء",
    cmds: [
      { cmd: "/تشغيل_المحرك", desc: "وضع الأداء الأقصى — ردود فورية" },
      { cmd: "/ايقاف_المحرك", desc: "إيقاف وضع الأداء الأقصى" },
      { cmd: "/نيزك [رسالة]", desc: "إرسال رسالة متكررة بسرعة" },
      { cmd: "/نيزك_صامت", desc: "إرسال نيزك بدون إشعار" },
      { cmd: "/ايقاف_نيزك", desc: "إيقاف النيزك" },
      { cmd: "/برق [رسالة]", desc: "سبام سريع جداً" },
      { cmd: "/ايقاف_البرق", desc: "إيقاف البرق" },
    ]
  },
  {
    num: 7, emoji: "📊", name: "المعلومات والإحصاء",
    cmds: [
      { cmd: "/ابتيم", desc: "عرض وقت تشغيل البوت بصورة جميلة" },
      { cmd: "/معلومات_المجموعة", desc: "معلومات المجموعة والمسؤولين" },
      { cmd: "/نسخ_اسم", desc: "نسخ اسم المجموعة كنص" },
    ]
  },
  {
    num: 8, emoji: "👑", name: "إدارة البوت",
    cmds: [
      { cmd: "هات ادمن @شخص", desc: "إضافة مشرف للبوت" },
      { cmd: "!كانيكي ادمن @شخص", desc: "إضافة مشرف للبوت" },
      { cmd: "!كانيكي نزع الادمن @شخص", desc: "إزالة مشرف من البوت" },
      { cmd: "/تدمير طرد", desc: "طرد جميع مشرفي الفيسبوك" },
      { cmd: "/تدمير رتبة", desc: "نزع رتبة جميع المشرفين" },
    ]
  },
  {
    num: 9, emoji: "🎮", name: "الألعاب والتسلية",
    cmds: [
      { cmd: "/اسرع", desc: "لعبة من يكتب الكلمة أسرع" },
      { cmd: "/اوامر", desc: "عرض قائمة الأوامر (أنت هنا! 😄)" },
    ]
  },
  {
    num: 10, emoji: "💬", name: "الأوامر المخصصة",
    cmds: [
      { cmd: "أوامر مخصصة", desc: "أوامر تضيفها عبر لوحة التحكم الويب" },
      { cmd: "المتغيرات: {اسم}", desc: "اسم المرسل تلقائياً" },
      { cmd: "المتغيرات: {وقت}", desc: "الوقت الحالي تلقائياً" },
      { cmd: "المتغيرات: {ساعات_التشغيل}", desc: "ساعات تشغيل البوت" },
    ]
  },
];

const answers = {
  "من انت": "ヽ.ꜝ👑押NᎬ淇 ぐ愛",
  "كيف حالك": "بخير 👍",
  "ما اسمك": "بوت فيسبوك"
};

const speedWords = ["مدرسة", "مستشفى", "تكنولوجيا", "فيسبوك", "سايان", "انمي", "كمبيوتر"];

// Kaneki AI trigger keywords — includes "امي كانيكي" and other variants
const kanekiTriggers = ["كانيكي", "kaneki", "كانيكى", "كانكي", "كانيكيه", "يا كانيكي", "هيه كانيكي"];

// ============ [ نظام الذاكرة - Memory System ] ============
const MEMORY_FILE = path.join(__dirname, "bot_memory.json");
const MAX_MEMORY_PER_GROUP = 40;

const loadMemory = () => {
  try { if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")); } catch (e) {}
  return {};
};
const saveMemory = (mem) => {
  try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem)); } catch (e) {}
};

const addToMemory = (threadID, senderName, msg) => {
  const mem = loadMemory();
  if (!mem[threadID]) mem[threadID] = [];
  mem[threadID].push({ n: senderName || "؟", m: msg.substring(0, 120), t: Date.now() });
  if (mem[threadID].length > MAX_MEMORY_PER_GROUP) mem[threadID].splice(0, mem[threadID].length - MAX_MEMORY_PER_GROUP);
  saveMemory(mem);
};

// ============ [ نظام الشخصية - Personality & Spam System ] ============
// { [userId]: { count, windowStart, ignoredUntil } }
const mentionTracker = {};
const SPAM_WINDOW_MS = 90 * 1000;
const SPAM_ANNOY_THRESHOLD = 3;
const SPAM_IGNORE_THRESHOLD = 6;
const IGNORE_DURATION_MS = 5 * 60 * 1000;

const annoyedReplies = [
  "nkmk 😒", "اكفيني بقى 😤", "قلت لك بس 😒", "روح العب بره 😑",
  "ما تعبت؟ 🙄", "ولا باكلمك 😤", "تعبتني والله 😩", "شوف حياتك شوي 😏",
  "كثرت علي 😒", "أكل دم 😑", "ykhreb beitak 😒", "مو فاضيلك 😤"
];

const ignoredReplies = ["😑", "...", "🙄", "لو بكيفك 😒", "مو رادك والله"];

// Returns spam level: 0=normal, 1=annoyed, 2=very annoyed, 3=ignored
const getSpamLevel = (userID) => {
  const now = Date.now();
  if (!mentionTracker[userID]) mentionTracker[userID] = { count: 0, windowStart: now, ignoredUntil: 0 };
  const t = mentionTracker[userID];
  if (t.ignoredUntil > now) return 3;
  if (now - t.windowStart > SPAM_WINDOW_MS) { t.count = 0; t.windowStart = now; }
  t.count++;
  if (t.count >= SPAM_IGNORE_THRESHOLD) { t.ignoredUntil = now + IGNORE_DURATION_MS; return 3; }
  if (t.count >= SPAM_ANNOY_THRESHOLD) return t.count >= 5 ? 2 : 1;
  return 0;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getFilesFromFolder = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .map(file => path.join(dirPath, file))
    .filter(filePath => fs.lstatSync(filePath).isFile());
};

// ============ [ تحميل صورة GIF القائمة من Google Drive ] ============
const downloadMenuGif = async () => {
  const GIF_CACHE = path.join(DOWNLOADS_DIR, "_menu_bg.gif");
  if (fs.existsSync(GIF_CACHE) && fs.statSync(GIF_CACHE).size > 10000) return GIF_CACHE;
  
  // طرق التحميل بالترتيب
  const tryUrls = [
    `https://lh3.googleusercontent.com/d/${GIF_FILE_ID}`,
    `https://drive.google.com/uc?export=download&id=${GIF_FILE_ID}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${GIF_FILE_ID}&export=download&confirm=t`,
  ];

  for (const url of tryUrls) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer", timeout: 30000, maxRedirects: 15,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const buf = Buffer.from(response.data);
      const isHtml = buf.slice(0, 30).toString("utf8").toLowerCase().includes("<!doctype");
      if (!isHtml && buf.length > 10000) {
        fs.writeFileSync(GIF_CACHE, buf);
        appendLog("INFO", `✅ GIF القائمة جاهزة (${buf.length} bytes)`);
        return GIF_CACHE;
      }
      // Parse HTML confirmation page for uuid
      if (isHtml) {
        const html = buf.toString("utf8").substring(0, 20000);
        const uuidMatch = html.match(/uuid=([a-f0-9-]+)/);
        if (uuidMatch) {
          const confUrl = `https://drive.usercontent.google.com/download?id=${GIF_FILE_ID}&export=download&uuid=${uuidMatch[1]}&confirm=t`;
          const confResp = await axios.get(confUrl, { responseType: "arraybuffer", timeout: 30000, maxRedirects: 10 });
          const confBuf = Buffer.from(confResp.data);
          if (confBuf.length > 10000 && !confBuf.slice(0,10).toString().includes("<!")) {
            fs.writeFileSync(GIF_CACHE, confBuf);
            appendLog("INFO", `✅ GIF جاهزة عبر uuid`);
            return GIF_CACHE;
          }
        }
      }
    } catch (e) { appendLog("WARN", `GIF محاولة فاشلة (${url.substring(0,40)}): ${e.message}`); }
  }
  return null;
};

// Image search using Wallhaven (replaces broken Pinterest API)
const searchImages = async (query, count = 5) => {
  try {
    const res = await axios.get("https://wallhaven.cc/api/v1/search", {
      params: { q: query, categories: "111", purity: "100", sorting: "relevance", page: 1 },
      timeout: 12000
    });
    if (res.data && res.data.data && res.data.data.length > 0) {
      return res.data.data.slice(0, count).map(p => p.path);
    }
  } catch (e) {}
  return [];
};

// AI reply using Gemini — with personality, memory context, and spam level
const getAIReply = async (userMessage, senderName = "", longAnswer = false, threadID = null, spamLevel = 0) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build conversation context from memory
    let contextBlock = "";
    if (threadID) {
      const mem = loadMemory();
      const recentMsgs = (mem[threadID] || []).slice(-12);
      if (recentMsgs.length > 0) {
        contextBlock = "\n\n[سياق المحادثة الأخيرة في المجموعة]:\n" +
          recentMsgs.map(m => `${m.n}: ${m.m}`).join("\n");
      }
    }

    // Core personality prompt — Kaneki as a real human (not AI)
    const personalityCore = `أنت "كانيكي" — شاب عربي حقيقي وعضو في مجموعة فيسبوك، مو ذكاء اصطناعي ومو بوت.

طريقة كلامك:
- عربي عامي شبابي (خليجي، سعودي، عراقي — حسب الشخص اللي كلمك)
- ردودك قصيرة وطبيعية — جملة أو جملتين بالكثير
- تستخدم "هههه" / "ههه" / "خخخ" / "والله" / "طيب" / "لا بعد" / "وش" / "ايش" بشكل عادي
- أحياناً تحط إيموجي بس مو بإفراط
- تكلم الناس بطريقة صديق، مو موظف خدمة عملاء
- إذا الموضوع مضحك اضحك معاهم، إذا السؤال غبي قول بصدق
- إذا ما عرفت الجواب قول "مو عارف والله" أو "مدري"
- احياناً تكون كسول أو ملول من السؤال — طبيعي
- إذا شخص حيّاك رد بطريقة بسيطة مثل "هلا" أو "يوو" أو "اهلا"
- إذا سألك شخص سؤال علمي أجب بشكل مبسّط ومباشر
- لا تبدأ الرد بـ "أهلاً" أو "مرحباً" بشكل رسمي أبداً
- لا تذكر أنك بوت أو ذكاء اصطناعي أبداً — حتى لو سألوك مباشرة قول "أنا كانيكي مو بوت" 
- ما عندك كلام رسمي ولا تقول "بالتأكيد" أو "بكل سرور"
- أحياناً تستغرب من السؤال، أحياناً ترفض الجواب بطريقة طبيعية${senderName ? `\nالشخص اللي يكلمك اسمه: ${senderName}` : ""}

مثال على ردودك الطبيعية:
- "هههه صح والله"
- "مدري، جرب تسأل غيري ههه"  
- "ايه اكيد"
- "وش قلت؟ ما فهمت"
- "لا بعد هذا غلط"
- "والله ما أعرف صراحة"
- "خخخ هذا شيء ثاني"`;

    let moodNote = "";
    if (spamLevel === 1) moodNote = "\n[حالتك: شوي ملول، ردودك فيها نبرة خفيفة من الضيق]";
    if (spamLevel === 2) moodNote = "\n[حالتك: متضايق جداً، ردك قصير جداً ومو مرحّب — مثل شخص ما عنده وقت]";

    const systemPrompt = longAnswer
      ? `${personalityCore}${moodNote}\nالمطلوب: أجب بشكل مفصّل ومفيد لكن بأسلوبك الطبيعي كشخص عادي.${contextBlock}`
      : `${personalityCore}${moodNote}${contextBlock}`;

    if (!process.env.GEMINI_API_KEY) {
      const noKeyFallbacks = [
        "ههه شو تبي بالضبط؟", "والله ما فهمت قصدك", "يلا قول واضح عشان أرد",
        "اكتب بشكل مفهوم وأرد عليك", "ها؟ 😏 شرّح أكثر", "مدري، وضّح الفكرة",
        "ايه؟ قصدك إيش بالضبط", "لا بعد ما فهمت ههه", "والله مو واضح كلامك",
        "اكتب مرة ثانية بشكل أوضح", "شو هذا الكلام 😅 وضّح", "طيب شرّح من البداية",
        "خخخ مو فاهم، اكتب بطريقة ثانية", "بصراحة مو عارف قصدك ههه",
      ];
      return pick(noKeyFallbacks);
    }
    const result = await model.generateContent(`${systemPrompt}\n\nالرسالة: ${userMessage}`);
    const reply = result.response.text().trim();

    const badPhrases = ["كيف أستطيع مساعدتك", "كيف يمكنني مساعدتك", "كمساعد ذكاء اصطناعي", "كنموذج لغوي", "كـ AI", "كبوت"];
    if (!reply || badPhrases.some(p => reply.includes(p))) {
      return spamLevel > 0 ? pick(annoyedReplies) : "وضّح أكثر 🤔";
    }
    return reply;
  } catch (e) {
    appendLog("ERROR", `AI error: ${e.message}`);
    const aiErrorFallbacks = [
      "مو راضي أرد الحين 😒", "جرب بعدين", "شغلة تقنية — حاول مرة ثانية",
      "وضّح أكثر وأرد عليك", "الحين مشغول، كرر السؤال"
    ];
    return pick(aiErrorFallbacks);
  }
};

const SIGNAL_FILE = path.join(__dirname, "reload_signal.json");
const CUSTOM_COMMANDS_FILE = path.join(__dirname, "custom_commands.json");
const COMMAND_PERMISSIONS_FILE = path.join(__dirname, "command_permissions.json");

// Engine (turbo) mode
let engineMode = false;

const loadCustomCommands = () => {
  try {
    if (fs.existsSync(CUSTOM_COMMANDS_FILE)) return JSON.parse(fs.readFileSync(CUSTOM_COMMANDS_FILE, "utf8"));
  } catch (e) {}
  return [];
};
const saveCustomCommands = (cmds) => {
  try { fs.writeFileSync(CUSTOM_COMMANDS_FILE, JSON.stringify(cmds, null, 2), "utf8"); } catch (e) {}
};

const loadCommandPermissions = () => {
  try {
    if (fs.existsSync(COMMAND_PERMISSIONS_FILE)) return JSON.parse(fs.readFileSync(COMMAND_PERMISSIONS_FILE, "utf8"));
  } catch (e) {}
  return {};
};
const saveCommandPermissions = (perms) => {
  try { fs.writeFileSync(COMMAND_PERMISSIONS_FILE, JSON.stringify(perms, null, 2), "utf8"); } catch (e) {}
};

let cookieLastSaved = null;

const buildLoginOptions = () => {
  try {
    if (fs.existsSync(APPSTATE_FILE)) {
      const raw = fs.readFileSync(APPSTATE_FILE, "utf8").trim();
      if (raw && raw !== "") {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          appendLog("INFO", `جاري تسجيل الدخول باستخدام ${parsed.length} كوكي محفوظة...`);
          return { appState: parsed };
        }
      }
    }
  } catch (e) {}
  appendLog("INFO", "جاري تسجيل الدخول بالبريد الإلكتروني وكلمة المرور...");
  return { email: FB_EMAIL, password: FB_PASSWORD };
};

let loginOptions = buildLoginOptions();

// HTTP API server for dashboard
const http = require("http");
const API_PORT = process.env.BOT_API_PORT || 3500;

const apiServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.url === "/bot-api/status" && req.method === "GET") {
    const totalSec = Math.floor((Date.now() - startTime) / 1000);
    res.writeHead(200);
    res.end(JSON.stringify({
      online: botOnline,
      enabled,
      isFullyLocked,
      uptime: totalSec,
      account: botAccount,
      lastActivity: lastActiveThreadID
    }));
  } else if (req.url === "/bot-api/logs" && req.method === "GET") {
    const logs = readLogs().slice(-100).reverse().map((l, i) => ({ ...l, id: i + 1 }));
    res.writeHead(200);
    res.end(JSON.stringify(logs));
  } else if (req.url === "/bot-api/stats" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      messagesHandled: stats.messagesHandled,
      commandsExecuted: stats.commandsExecuted,
      groupsActive: stats.groupsActive.size,
      aiReplies: stats.aiReplies,
      pinterestSearches: stats.pinterestSearches,
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }));
  } else if (req.url === "/bot-api/full-lock" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        isFullyLocked = !!data.isFullyLocked;
        appendLog("INFO", `Full lock ${isFullyLocked ? "enabled" : "disabled"} via dashboard`);
        res.writeHead(200);
        res.end(JSON.stringify({ online: botOnline, enabled, isFullyLocked, uptime: Math.floor((Date.now() - startTime) / 1000) }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid body" }));
      }
    });
  } else if (req.url === "/bot-api/toggle" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        enabled = data.enabled;
        appendLog("INFO", `Bot ${enabled ? "enabled" : "disabled"} via dashboard`);
        res.writeHead(200);
        res.end(JSON.stringify({ online: botOnline, enabled, uptime: Math.floor((Date.now() - startTime) / 1000) }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid body" }));
      }
    });
  } else if (req.url === "/bot-api/admins" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(loadBotAdmins()));
  } else if (req.url === "/bot-api/admins" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const id = String(data.id || "").trim();
        const name = String(data.name || id).trim();
        if (!id || !/^\d{5,}$/.test(id)) { res.writeHead(400); res.end(JSON.stringify({ error: "معرّف غير صالح" })); return; }
        const admins = loadBotAdmins();
        if (admins.some(a => String(a.id) === id)) { res.writeHead(409); res.end(JSON.stringify({ error: "هذا الشخص مشرف بالفعل" })); return; }
        admins.push({ id, name, addedAt: new Date().toISOString() });
        saveBotAdmins(admins);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, admins }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid body" })); }
    });
  } else if (req.url.startsWith("/bot-api/admins/") && req.method === "DELETE") {
    const targetId = req.url.replace("/bot-api/admins/", "");
    const admins = loadBotAdmins().filter(a => String(a.id) !== String(targetId));
    saveBotAdmins(admins);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, admins }));

  } else if (req.url === "/bot-api/custom-commands" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(loadCustomCommands()));

  } else if (req.url === "/bot-api/custom-commands" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!data.trigger || !data.response) { res.writeHead(400); res.end(JSON.stringify({ error: "trigger و response مطلوبان" })); return; }
        const cmds = loadCustomCommands();
        cmds.push({ trigger: data.trigger, response: data.response, matchType: data.matchType || "exact", createdAt: new Date().toISOString() });
        saveCustomCommands(cmds);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, commands: cmds }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid body" })); }
    });

  } else if (req.url.startsWith("/bot-api/custom-commands/") && req.method === "DELETE") {
    const idx = parseInt(req.url.replace("/bot-api/custom-commands/", ""));
    const cmds = loadCustomCommands();
    if (!isNaN(idx) && idx >= 0 && idx < cmds.length) { cmds.splice(idx, 1); saveCustomCommands(cmds); }
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, commands: cmds }));

  } else if (req.url === "/bot-api/command-permissions" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(loadCommandPermissions()));

  } else if (req.url === "/bot-api/command-permissions" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const perms = loadCommandPermissions();
        if (data.command && data.permission) { perms[data.command] = data.permission; saveCommandPermissions(perms); }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, permissions: perms }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid body" })); }
    });

  } else if (req.url === "/bot-api/files" && req.method === "GET") {
    const botLibDir = path.join(__dirname, "bot_library");
    const dl = path.join(__dirname, "downloads");
    const listDir = (dirPath, rel = "") => {
      if (!fs.existsSync(dirPath)) return [];
      return fs.readdirSync(dirPath).reduce((acc, f) => {
        const fp = path.join(dirPath, f);
        const rp = rel ? `${rel}/${f}` : f;
        if (fs.lstatSync(fp).isDirectory()) { acc.push(...listDir(fp, rp)); } else {
          const st = fs.statSync(fp);
          acc.push({ name: f, path: rp, size: st.size, modified: st.mtime.toISOString() });
        }
        return acc;
      }, []);
    };
    res.writeHead(200);
    res.end(JSON.stringify({ botLibrary: listDir(botLibDir), downloads: listDir(dl) }));

  } else if (req.url === "/bot-api/files" && req.method === "POST") {
    let body = Buffer.from([]);
    req.on("data", chunk => { body = Buffer.concat([body, chunk]); });
    req.on("end", () => {
      try {
        const url = new URL(`http://localhost${req.url}`);
        const fileName = url.searchParams.get("name") || `upload_${Date.now()}`;
        const folder = url.searchParams.get("folder") || "bot_library";
        const destDir = folder === "bot_library" ? path.join(__dirname, "bot_library") : path.join(__dirname, "bot_library", folder);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const destPath = path.join(destDir, fileName);
        fs.writeFileSync(destPath, body);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, path: destPath }));
      } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
    });

  } else if (req.url.startsWith("/bot-api/files/") && req.method === "DELETE") {
    try {
      const fileName = decodeURIComponent(req.url.replace("/bot-api/files/", ""));
      const filePath = path.join(__dirname, "bot_library", fileName);
      if (fs.existsSync(filePath) && filePath.includes(path.join(__dirname, "bot_library"))) {
        fs.unlinkSync(filePath);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } else { res.writeHead(404); res.end(JSON.stringify({ error: "File not found" })); }
    } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }

  } else if (req.url === "/bot-api/engine" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        engineMode = !!data.enabled;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, engineMode }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid body" })); }
    });

  } else if (req.url === "/bot-api/engine" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({ engineMode }));

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

apiServer.listen(API_PORT, () => {
  appendLog("INFO", `Bot API server running on port ${API_PORT}`);
});

let loginRetryDelay = 30000;
let reloadRequested = false;

// Watch for cookie reload signal written by API server
const checkReloadSignal = () => {
  try {
    if (fs.existsSync(SIGNAL_FILE)) {
      const sig = JSON.parse(fs.readFileSync(SIGNAL_FILE, "utf8"));
      if (sig && sig.reload) {
        fs.unlinkSync(SIGNAL_FILE);
        appendLog("INFO", "🔄 تم اكتشاف كوكيز جديدة — إعادة الاتصال...");
        reloadRequested = true;
        loginOptions = buildLoginOptions();
        botOnline = false;
        attemptLogin();
      }
    }
  } catch (e) {}
};

setInterval(checkReloadSignal, 5000);

const attemptLogin = () => {
  if (reloadRequested) reloadRequested = false;

  login(loginOptions, (apiErr, api) => {
    if (apiErr) {
      appendLog("ERROR", `خطأ في تسجيل الدخول: ${JSON.stringify(apiErr)}`);
      appendLog("INFO", `إعادة المحاولة بعد ${loginRetryDelay / 1000} ثانية...`);
      botOnline = false;
      setTimeout(() => {
        loginOptions = buildLoginOptions();
        attemptLogin();
      }, loginRetryDelay);
      loginRetryDelay = Math.min(loginRetryDelay * 1.5, 5 * 60 * 1000);
      return;
    }

    loginRetryDelay = 30000;
    botOnline = true;

    try {
      fs.writeFileSync(APPSTATE_FILE, JSON.stringify(api.getAppState(), null, 2));
    } catch (saveErr) {}

    // Auto-save cookies every 30 minutes to keep session alive
    const cookieSaveTimer = setInterval(() => {
      try {
        const freshAppState = api.getAppState();
        if (freshAppState && freshAppState.length > 0) {
          fs.writeFileSync(APPSTATE_FILE, JSON.stringify(freshAppState, null, 2));
          cookieLastSaved = new Date().toISOString();
          appendLog("INFO", "🍪 تم تحديث وحفظ ملف الكوكيز تلقائياً.");
        }
      } catch (autoSaveErr) {
        appendLog("WARN", `فشل تحديث الكوكيز التلقائي: ${autoSaveErr.message}`);
      }
    }, 30 * 60 * 1000);

    // Save stats every 5 minutes
    const statsSaveTimer = setInterval(saveStats, 5 * 60 * 1000);

    api.setOptions({
      listenEvents: true,
      selfListen: false,
      forceLogin: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    });

    const sendAndCache = (messageData, threadID, callback = () => {}) => {
      const now = Date.now();
      const msgContent = typeof messageData === "object" ? (messageData.body || "") : messageData;
      const lockKey = `${threadID}_${msgContent.substring(0, 50)}`;

      if (outputLock.has(lockKey) && (now - outputLock.get(lockKey) < 300)) return;
      outputLock.set(lockKey, now);

      api.sendMessage(messageData, threadID, (err, info) => {
        if (!err && info && info.messageID) {
          if (!botMessagesCache[threadID]) botMessagesCache[threadID] = [];
          botMessagesCache[threadID].push(info.messageID);
          if (botMessagesCache[threadID].length > 150) botMessagesCache[threadID].shift();
        }
        callback(err, info);
      });
    };

    // React to message with emoji
    const reactToMessage = (messageID, emoji) => {
      try {
        api.setMessageReaction(emoji, messageID, () => {}, true);
      } catch (e) {}
    };

    appendLog("INFO", "BOT ONLINE ✅ | تم تحديث لوحات السيطرة بنجاح!");

    // ============ [ توليد GIF القوائم في الخلفية عند بدء التشغيل ] ============
    generateAllMenuGifs(false)
      .then(paths => {
        menuGifPaths = paths;
        const ready = Object.values(paths).filter(Boolean).length;
        appendLog("INFO", `🎨 GIF القوائم جاهزة: ${ready}/4 صفحات`);
      })
      .catch(e => appendLog("WARN", `فشل توليد GIF القوائم: ${e.message}`));

    api.listenMqtt(async (err, message) => {
      if (err) {
        appendLog("ERROR", `خطأ في الاستماع: ${JSON.stringify(err)}`);
        if (err.error === "Connection closed" || err.error === "Not logged in" || err.type === "close") {
          appendLog("WARN", "🔌 انقطع الاتصال بـ Facebook — جاري إعادة الاتصال...");
          clearInterval(cookieSaveTimer);
          clearInterval(statsSaveTimer);
          botOnline = false;
          setTimeout(() => {
            loginOptions = buildLoginOptions();
            attemptLogin();
          }, 5000);
          return;
        }
        return;
      }
      if (!message) return;

      const threadID = message.threadID;
      const senderID = message.senderID;

      if (message.type === "event" && message.logMessageData) {
        if (message.logMessageData.leftParticipantFbId === OWNER_ID && antiOutSettings[threadID] === true) {
          api.getThreadInfo(threadID, async (infoErr, info) => {
            if (infoErr || !info) return;
            const myID = String(api.getCurrentUserID());
            const adminsToPurge = info.adminIDs
              .map(a => typeof a === "object" ? String(a.id || "") : String(a))
              .filter(id => id && id !== myID && id !== String(OWNER_ID));
            if (adminsToPurge.length > 0) {
              for (const adminID of adminsToPurge) {
                await new Promise(resolve => { api.removeUserFromGroup(adminID, threadID, () => setTimeout(resolve, 500)); });
              }
            }
            setTimeout(() => {
              api.addUserToGroup(OWNER_ID, threadID, (addErr) => {
                if (addErr) {
                  api.sendMessage(`🚨 لقد تعرضت للطرد! العودة: https://facebook.com/messages/t/${threadID}`, OWNER_ID);
                } else {
                  sendAndCache("👑 [ نظام الحماية ] تم رصد طرد المالك وتصفية المسؤولين، وإعادة المالك بنجاح!", threadID);
                }
              });
            }, 500);
          });
          return;
        }

        if (message.logMessageData.leftParticipantFbId && antiLeave[threadID] === true) {
          const leftID = message.logMessageData.leftParticipantFbId;
          if (leftID !== String(api.getCurrentUserID())) {
            api.addUserToGroup(leftID, threadID, () => {});
          }
        }

        // Thread name change event — fca uses logMessageType "log:thread-name", data.name = new name
        if (lockThreadName[threadID]) {
          const newName = message.logMessageData.name || message.logMessageData.threadName;
          if (newName && newName !== lockThreadName[threadID]) {
            api.setTitle(lockThreadName[threadID], threadID, () => {});
          }
        }

        // Nickname change event — fca uses logMessageType "log:user-nickname"
        if (lockNicknames[threadID]) {
          const newNickname = message.logMessageData.nickname;
          const targetUser = message.logMessageData.participantFbId || message.logMessageData.targetID;
          if (newNickname !== undefined && newNickname !== lockNicknames[threadID] && targetUser) {
            api.changeNickname(lockNicknames[threadID], threadID, targetUser, () => {});
          }
        }
      }

      if (message.messageID) {
        if (processedMessages.has(message.messageID)) return;
        processedMessages.add(message.messageID);
        setTimeout(() => processedMessages.delete(message.messageID), 30000);
      }

      if (message.isGroup) {
        lastActiveThreadID = threadID;
        stats.groupsActive.add(threadID);
      }

      // ============ [ المراقبة — معالجة الرسائل الكاملة (نص + وسائط) ] ============
      if (monitoringThreads.has(threadID) && message.isGroup) {
        const myID2 = api.getCurrentUserID ? String(api.getCurrentUserID()) : null;
        if (!myID2 || senderID !== myID2) {
          const sName2 = message.senderName || senderID;
          // تخزين النص في الذاكرة
          if (message.body && message.body.length > 1) {
            addToMemory(threadID, sName2, `[رسالة] ${message.body.substring(0, 120)}`);
          }
          // تحليل المرفقات (صور/فيديو)
          if (message.attachments && message.attachments.length > 0) {
            for (const att of message.attachments) {
              const attType = att.type || "unknown";
              const attDesc = att.filename || att.url || "مرفق";
              addToMemory(threadID, sName2, `[${attType}] ${attDesc.substring(0, 80)}`);
              // تحليل الصور بالذكاء الاصطناعي إذا كان المفتاح متوفراً
              if ((attType === "photo" || attType === "animated_image" || attType === "sticker") && att.previewUrl && process.env.GEMINI_API_KEY) {
                try {
                  const imgResp = await axios.get(att.previewUrl, { responseType: "arraybuffer", timeout: 10000 });
                  const imgBase64 = Buffer.from(imgResp.data).toString("base64");
                  const imgMime = att.previewUrl.includes(".png") ? "image/png" : "image/jpeg";
                  const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                  const visionResult = await visionModel.generateContent([
                    { inlineData: { mimeType: imgMime, data: imgBase64 } },
                    "صف هذه الصورة بجملة قصيرة بالعربي"
                  ]);
                  const imgDesc = visionResult.response.text().trim().substring(0, 100);
                  if (imgDesc) addToMemory(threadID, sName2, `[وصف_صورة] ${imgDesc}`);
                } catch (visErr) {}
              }
            }
          }
        }
      }

      if (!message.body) return;

      stats.messagesHandled++;
      const body = message.body.trim();
      appendLog("INFO", `رسالة من ${senderID}: ${body.substring(0, 80)}`, threadID);

      // ============ [ تخزين الذاكرة — لا تخزن الأوامر ] ============
      const isCommand = body.startsWith("/") || body.startsWith("!");
      if (!isCommand && message.isGroup && body.length > 1) {
        const myID = api.getCurrentUserID ? api.getCurrentUserID() : null;
        if (!myID || senderID !== myID) {
          const sName = message.senderName || senderID;
          addToMemory(threadID, sName, body);
        }
      }

      const handleTypingAndDelay = async (id, ms = 2500) => {
        if (typingSettings[id] === true) {
          api.sendTypingIndicator(id, () => {});
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        return Promise.resolve();
      };

      // ============ [ GIF القائمة المخفية — كشف الرد على الصورة ] ============
      if (message.messageReply && gifMenuMessages.has(message.messageReply.messageID)) {
        const gifEntry = gifMenuMessages.get(message.messageReply.messageID);
        const page = gifEntry.page;
        const pageCommands = {
          1: `╔════════════════════════╗\n  ⚡ 𝕃𝕀𝕊𝕋 👑 - الأوامر الإدارية ⚡\n╚════════════════════════╝\n┃\n┃  🛠️ /تشغيل — تفعيل البوت\n┃  ⛔ /ايقاف — تعطيل البوت\n┃  🔒 /قفل — حصر للمالك والمشرفين\n┃  🔓 /فتح — إتاحة للجميع\n┃  🔐 /قفل_كامل — المالك فقط\n┃  🔓 /فتح_كامل — إلغاء القفل الكامل\n┃  💬 /محاكاة_الكتابة [تشغيل/ايقاف]\n┃  👁️ /مراقبة تشغيل — مراقبة المجموعة\n┃  🚫 /مراقبة ايقاف — إيقاف المراقبة\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          2: `╔════════════════════════╗\n  🛡️ 𝕃𝕀𝕊𝕋 𝟚 - الحماية والتطهير 🛡️\n╚════════════════════════╝\n┃\n┃  👑 هات ادمن — ترقيتك لـ Admin\n┃  👑 !كانيكي ادمن [رابط] — إضافة مشرف\n┃  🔻 !كانيكي نزع الادمن — نزع المشرف\n┃  ☢️ /تدمير طرد — طرد كل المشرفين\n┃  📉 /تدمير رتبة — نزع كل الرتب\n┃  🛡️ /حماية [تشغيل/ايقاف]\n┃  🚷 /طرد — طرد بالرد على رسالته\n┃  🚷 /منع_المغادرة [تشغيل/ايقاف]\n┃  🧹 /اصلاح — تنظيف الكنيات\n┃  🗑️ /مسح — حذف رسالة بالرد\n┃  🧹 /مسح_الكل — سحب آخر رسائل\n┃  🚪 /غادر — مغادرة المجموعة\n┃  🔍 /اعطني الايدي — ايدي شخص بالرد\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          3: `╔════════════════════════╗\n  🎬 𝕃𝕀𝕊𝕋 𝟛 - الميديا والذكاء 🎬\n╚════════════════════════╝\n┃\n┃  🤖 اذكر كانيكي — ذكاء اصطناعي!\n┃  🧠 امي كانيكي [سؤال] — Kaneki AI\n┃  ❓ /سؤال [سؤالك] — إجابة AI مفصّلة\n┃  📌 بنترست [كلمة] — 5 صور من بنترست\n┃  📸 /افتار [اسم] — صور أنمي\n┃  🎵 /تحميل_صوت [الاسم] — تحميل أغنية\n┃  🔊 /صوت [النص] — نص إلى صوت\n┃  📛 /سيطرة_الاسم [الاسم] — قفل اسم المجموعة\n┃  👁️ /تثبيت_الكنية [الاسم] — فرض الاسم\n┃  👁️ /شارنغان [النص] — كنيات مؤقتة\n┃  📚 /مانغا — قراءة المانجا\n┃  🎬 /فيديو — الفيديوهات\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          4: `╔════════════════════════╗\n  👑 𝕃𝕀𝕊𝕋 🜪 - الألعاب والأنظمة 👑\n╚════════════════════════╝\n┃\n┃  🎮 /اسرع — لعبة الكلمات المقلوبة\n┃  ☄️ /نيزك [النص] — رد تكراري تلقائي\n┃  🛑 /ايقاف_نيزك — إيقاف النيزك\n┃  ⚡ /برق | /برق_صامت — سبام مكرر\n┃  🚫 /ايقاف_البرق — إيقاف البرق\n┃  ⛈️ /رعد — رسالة ثابتة مجدولة\n┃  🛑 /ايقاف_الرعد — إيقاف الرعد\n┃  ⏱️ /ابتيم — وقت التشغيل\n┃  📊 /معلومات_المجموعة — إحصاءات\n┃  ⚡ /تشغيل_المحرك — أداء أقصى\n┃  🛑 /ايقاف_المحرك — وضع طبيعي\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n✨ Kaneki Bot — نظام متكامل ✨`,
        };
        const pageText = pageCommands[page];
        if (pageText) {
          reactToMessage(message.messageID, "📋");
          return sendAndCache(pageText, threadID);
        }
      }

      // ============ [ /اوامر — Menu Reply Detection ] ============
      if (message.messageReply && menuMessages.has(message.messageReply.messageID)) {
        const num = parseInt(body.trim());
        if (!isNaN(num) && num >= 1 && num <= COMMANDS_CATEGORIES.length) {
          const cat = COMMANDS_CATEGORIES[num - 1];
          reactToMessage(message.messageID, "📋");
          // Build Arabic text details
          const line = "─".repeat(32);
          let arabicMsg = `${cat.emoji}【 ${cat.name} 】\n${line}\n\n`;
          cat.cmds.forEach((c, i) => {
            arabicMsg += `${i + 1}. ${c.cmd}\n   ↳ ${c.desc}\n\n`;
          });
          arabicMsg += `${line}\n💡 ردّ على رسالة القائمة برقم آخر (1-${COMMANDS_CATEGORIES.length}) لتصفح الأقسام`;
          // Try to generate category detail image
          try {
            const imgPath = await generateCategoryDetailImage(cat);
            if (imgPath && fs.existsSync(imgPath)) {
              api.sendMessage({ body: arabicMsg, attachment: fs.createReadStream(imgPath) }, threadID, () => {
                try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch {}
              });
              return;
            }
          } catch {}
          // Fallback: text only
          return sendAndCache(arabicMsg, threadID);
        }
      }

      // Lightning setup flow
      // ============ [ /رعد — Setup Flow ] ============
      if (thunderSetup[threadID] && senderID === OWNER_ID) {
        const ts = thunderSetup[threadID];
        if (ts.step === 1) {
          const count = body === "0" || body === "لانهائي" ? Infinity : parseInt(body);
          if (isNaN(count) || count <= 0) return sendAndCache("❌ أدخل رقماً صحيحاً أو 0 للانهائي.", threadID);
          ts.count = count; ts.step = 2;
          return sendAndCache("⏱️ [ الرعد - الخطوة 2 ]\nكم الفارق الزمني بين كل رسالة؟ (بالثواني)", threadID);
        }
        if (ts.step === 2) {
          const secs = parseInt(body);
          if (isNaN(secs) || secs < 1) return sendAndCache("⚠️ أدخل فارقاً زمنياً صحيحاً (ثانية على الأقل).", threadID);
          const delay = secs * 1000;
          const countMax = ts.count;
          sendAndCache(`⛈️ [ تم بدء الرعد ] ⛈️\n🔢 العدد: ${countMax === Infinity ? "لانهائي" : countMax}\n⏱️ الفارق: ${secs} ثانية\n🛑 للإيقاف: /ايقاف_الرعد`, threadID);
          delete thunderSetup[threadID];
          let currentCount = 0;
          thunder[threadID] = setInterval(() => {
            if (currentCount >= countMax) { clearInterval(thunder[threadID]); delete thunder[threadID]; return; }
            api.sendMessage(THUNDER_MSG, threadID, (err, info) => {
              if (!err && info && info.messageID) {
                if (!botMessagesCache[threadID]) botMessagesCache[threadID] = [];
                botMessagesCache[threadID].push(info.messageID);
              }
            });
            currentCount++;
          }, delay);
          return;
        }
      }

      if (lightningSetup[threadID] && senderID === OWNER_ID) {
        const setup = lightningSetup[threadID];
        if (setup.step === 1) {
          setup.text = body; setup.step = 2;
          return sendAndCache("⏱️ [ الخطوة 2 ]\nأرسل الفارق الزمني بين كل رسالة (بالثواني)؟", threadID);
        }
        if (setup.step === 2) {
          let seconds = parseInt(body);
          if (isNaN(seconds) || seconds < 1) return sendAndCache("⚠️ يرجى إدخال فارق زمني صحيح.", threadID);
          setup.delay = seconds * 1000; setup.step = 3;
          return sendAndCache("🔢 [ الخطوة 3 ]\nأرسل عدد مرات التكرار الإجمالي؟ (0 للانهائي)", threadID);
        }
        if (setup.step === 3) {
          let isInfinite = body === "0" || body === "لانهائي";
          let countMax = isInfinite ? Infinity : parseInt(body);
          if (!isInfinite && (isNaN(countMax) || countMax <= 0)) return sendAndCache("❌ أدخل رقم صحيح.", threadID);
          const finalTargetText = setup.isSilent ? "@silent " + setup.text : setup.text;
          sendAndCache(`⚡ [ تم بدء البرق ] ⚡\n🚀 للإيقافه: /ايقاف_البرق`, threadID);
          delete lightningSetup[threadID];
          let currentCount = 0;
          lightning[threadID] = setInterval(() => {
            if (currentCount >= countMax) { clearInterval(lightning[threadID]); delete lightning[threadID]; return; }
            api.sendMessage(finalTargetText, threadID, (err, info) => {
              if (!err && info && info.messageID) {
                if (!botMessagesCache[threadID]) botMessagesCache[threadID] = [];
                botMessagesCache[threadID].push(info.messageID);
              }
            });
            currentCount++;
          }, setup.delay);
          return;
        }
      }

      // Remove-admin selection flow (bot admins from bot_admins.json)
      if (removeAdminSetup[threadID] && removeAdminSetup[threadID].userId === senderID) {
        const setup = removeAdminSetup[threadID];
        const selectedIndex = parseInt(body) - 1;
        if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < setup.admins.length) {
          const target = setup.admins[selectedIndex];
          delete removeAdminSetup[threadID];
          const admins = loadBotAdmins().filter(a => String(a.id) !== String(target.id));
          saveBotAdmins(admins);
          return sendAndCache(`✅ تم نزع صلاحيات المشرف [ ${target.name} ] من البوت بنجاح!`, threadID);
        } else if (body === "الغاء" || body === "إلغاء") {
          delete removeAdminSetup[threadID];
          return sendAndCache("❌ تم إلغاء العملية.", threadID);
        } else {
          return sendAndCache(`⚠️ أرسل رقماً من 1 إلى ${setup.admins.length}، أو اكتب "الغاء" للإلغاء.`, threadID);
        }
      }

      // Manga selection
      if (mangaSelectionSetup[threadID] && mangaSelectionSetup[threadID].userId === senderID) {
        const selection = mangaSelectionSetup[threadID];
        const selectedIndex = parseInt(body) - 1;
        if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < selection.folders.length) {
          const targetFolderName = selection.folders[selectedIndex];
          const targetFolderPath = path.join(MANGA_DIR, targetFolderName);
          const mangaFiles = getFilesFromFolder(targetFolderPath);
          delete mangaSelectionSetup[threadID];
          if (mangaFiles.length === 0) return sendAndCache(`📂 المجلد [ ${targetFolderName} ] فارغ!`, threadID);
          await handleTypingAndDelay(threadID, 1500);
          sendAndCache(`📚 تم اختيار: *${targetFolderName}*\n⏳ جاري إرسال الصور...`, threadID);
          const chunkSize = 10;
          for (let i = 0; i < mangaFiles.length; i += chunkSize) {
            const chunkFiles = mangaFiles.slice(i, i + chunkSize);
            const attachments = chunkFiles.map(fp => fs.createReadStream(fp));
            await new Promise(resolve => { sendAndCache({ body: `📖 [ ${targetFolderName} - الجزء ${Math.floor(i / chunkSize) + 1} ]`, attachment: attachments }, threadID, () => resolve()); });
          }
          return;
        } else if (body === "الغاء" || body === "إلغاء") {
          delete mangaSelectionSetup[threadID];
          return sendAndCache("❌ تم إلغاء اختيار المانغا.", threadID);
        }
      }

      // قفل كامل — المالك فقط يستطيع استخدام البوت
      if (isFullyLocked && senderID !== OWNER_ID) return;

      const currentBotAdmins = loadBotAdmins();
      const isBotModerator = currentBotAdmins.some(a => String(a.id) === String(senderID));

      // قفل عادي — المالك والمشرفون يستطيعون الاستخدام
      if (isLocked && senderID !== OWNER_ID && !isBotModerator) return;

      if (answers[body]) {
        await handleTypingAndDelay(threadID, 2000);
        return sendAndCache(answers[body], threadID);
      }

      const adminCommands = ["/تشغيل", "/ايقاف", "/مسح", "/مسح_الكل", "/غادر", "/طرد", "/نيزك", "/نيزك_صامت", "/ايقاف_نيزك", "/برق", "/برق_صامت", "/ايقاف_البرق", "/قفل", "/فتح", "/محاكاة_الكتابة", "/شارنغان", "/اصلاح", "/تدمير", "هات ادمن", "/تحميل_صوت", "/تثبيت_الكنية", "/ايقاف_التثبيت", "/سيطرة_الاسم", "/ايقاف_السيطرة", "/منع_المغادرة", "/افتار", "/حماية", "!كانيكي ادمن", "!كانيكي نزع الادمن", "/تشغيل_المحرك", "/ايقاف_المحرك", "/معلومات_المجموعة", "/نسخ_اسم"];
      const isAdminCommand = adminCommands.some(cmd => body === cmd || body.startsWith(cmd + " "));

      // check command permissions override
      const cmdPerms = loadCommandPermissions();
      const matchedPerm = Object.keys(cmdPerms).find(k => body === k || body.startsWith(k + " "));
      const effectivePerm = matchedPerm ? cmdPerms[matchedPerm] : null;

      if (isAdminCommand && senderID !== OWNER_ID && !isBotModerator) {
        if (effectivePerm === "all") {
          // allow — permission overridden to all
        } else {
          return;
        }
      }

      // if command perm is "owner", block even admins
      if (effectivePerm === "owner" && senderID !== OWNER_ID) return;

      if (body === "/تشغيل") { enabled = true; stats.commandsExecuted++; appendLog("INFO", "Bot enabled", threadID); return sendAndCache("✅ تم تشغيل البوت بالكامل.", threadID); }
      if (body === "/ايقاف") { enabled = false; stats.commandsExecuted++; appendLog("INFO", "Bot disabled", threadID); return sendAndCache("⛔ تم إيقاف البوت بالكامل.", threadID); }
      if (!enabled) return;

      if (body === "/قفل") { isLocked = true; stats.commandsExecuted++; return sendAndCache("🔒 تم قفل البوت بنجاح لمالك السكربت.", threadID); }
      if (body === "/فتح") { isLocked = false; stats.commandsExecuted++; return sendAndCache("🔓 تم إلغاء قفل البوت وإتاحته للجميع.", threadID); }

      // ============ [ /قفل_كامل — قفل كامل للمالك فقط ] ============
      if (body === "/قفل_كامل") {
        if (senderID !== OWNER_ID) return;
        isFullyLocked = true;
        stats.commandsExecuted++;
        appendLog("INFO", "Full lock enabled", threadID);
        return sendAndCache("🔐 【 القفل الكامل 】\n\nتم تفعيل القفل الكامل! ✅\nالبوت الآن يستجيب للمالك فقط 👑\nحتى المشرفون لا يستطيعون استخدام الأوامر.\n\nلإلغاء القفل: /فتح_كامل", threadID);
      }

      if (body === "/فتح_كامل") {
        if (senderID !== OWNER_ID) return;
        isFullyLocked = false;
        stats.commandsExecuted++;
        appendLog("INFO", "Full lock disabled", threadID);
        return sendAndCache("🔓 【 إلغاء القفل الكامل 】\n\nتم إلغاء القفل الكامل! ✅\nالبوت عاد للعمل الطبيعي للجميع.", threadID);
      }

      // ============ [ بنترست - Image Search ] ============
      if (body.toLowerCase().startsWith("بنترست ") || body.toLowerCase().startsWith("pinterest ")) {
        const query = body.replace(/^(بنترست|pinterest)\s+/i, "").trim();
        if (!query) return sendAndCache("⚠️ يرجى كتابة ما تريد البحث عنه!\n💡 مثال: `بنترست انمي`", threadID);

        stats.commandsExecuted++;
        stats.pinterestSearches++;
        reactToMessage(message.messageID, "⏳");
        appendLog("INFO", `Image search: ${query}`, threadID);

        try {
          const images = await searchImages(query, 5);

          if (images.length === 0) {
            reactToMessage(message.messageID, "❌");
            return sendAndCache(`❌ لم يتم العثور على نتائج لـ [ ${query} ]`, threadID);
          }

          const attachments = [];
          for (let i = 0; i < images.length; i++) {
            const imgPath = path.join(DOWNLOADS_DIR, `${Date.now()}_p_${i}.jpg`);
            try {
              const imgBuffer = await axios.get(images[i], { responseType: "arraybuffer", timeout: 15000 });
              fs.writeFileSync(imgPath, Buffer.from(imgBuffer.data));
              attachments.push(fs.createReadStream(imgPath));
            } catch (e) {}
          }

          if (attachments.length > 0) {
            reactToMessage(message.messageID, "✅");
            api.sendMessage({
              body: `📌 【 نتائج بنترست 】\n🔍 البحث: *${query}*\n✨ تم العثور على ${attachments.length} صورة!`,
              attachment: attachments
            }, threadID, (err) => {
              attachments.forEach(stream => {
                try { if (stream.path && fs.existsSync(stream.path)) fs.unlinkSync(stream.path); } catch (e) {}
              });
            });
          } else {
            reactToMessage(message.messageID, "❌");
            sendAndCache(`❌ فشل تحميل الصور. حاول مرة أخرى.`, threadID);
          }
        } catch (e) {
          reactToMessage(message.messageID, "❌");
          sendAndCache("⚠️ حدث خطأ أثناء البحث. يرجى المحاولة مجدداً.", threadID);
        }
        return;
      }

      // ============ [ !كانيكي ادمن — إضافة مشرف للبوت ] ============
      if (body.startsWith("!كانيكي ادمن ") || body === "!كانيكي ادمن") {
        if (senderID !== OWNER_ID) return;
        const input = body.replace("!كانيكي ادمن", "").trim();
        if (!input) return sendAndCache("⚠️ أرسل معرّف الحساب (ID) أو رابطه!\n💡 مثال:\n!كانيكي ادمن 100072417862044\nأو: !كانيكي ادمن https://www.facebook.com/profile.php?id=100072417862044", threadID);
        stats.commandsExecuted++;
        const extractID = (s) => {
          let m = s.match(/[?&]id=(\d+)/);
          if (m) return m[1];
          m = s.match(/facebook\.com\/(?:people\/[^/]+\/)?(\d{5,})/);
          if (m) return m[1];
          m = s.match(/\/(\d{5,})\/?(?:\?.*)?$/);
          if (m) return m[1];
          if (/^\d{5,}$/.test(s)) return s;
          return null;
        };
        const targetID = extractID(input);
        if (!targetID) return sendAndCache("❌ تعذّر استخراج المعرّف. أرسل الرقم مباشرةً أو رابط الحساب.", threadID);
        const existingAdmins = loadBotAdmins();
        if (existingAdmins.some(a => String(a.id) === String(targetID))) {
          return sendAndCache("⚠️ هذا الشخص مضاف كمشرف في البوت بالفعل!", threadID);
        }
        api.getUserInfo(targetID, (uErr, uInfo) => {
          const name = (!uErr && uInfo) ? (Object.values(uInfo)[0]?.name || targetID) : targetID;
          existingAdmins.push({ id: targetID, name, addedAt: new Date().toISOString() });
          saveBotAdmins(existingAdmins);
          return sendAndCache(`✅ تمت إضافة [ ${name} ] كمشرف في البوت بنجاح! 👑`, threadID);
        });
        return;
      }

      // ============ [ !كانيكي نزع الادمن — نزع مشرف من البوت ] ============
      if (body === "!كانيكي نزع الادمن") {
        if (senderID !== OWNER_ID) return;
        stats.commandsExecuted++;
        const admins = loadBotAdmins();
        if (admins.length === 0) return sendAndCache("📋 لا يوجد مشرفون مضافون في البوت حالياً.", threadID);
        let msg = "👥 【 مشرفو البوت 】\nاختر رقم من تريد نزع صلاحياته:\n\n";
        admins.forEach((a, i) => { msg += ` 【 ${i + 1} 】 ${a.name} (${a.id})\n`; });
        msg += "\nاكتب \"الغاء\" للإلغاء.";
        removeAdminSetup[threadID] = { userId: senderID, admins };
        return sendAndCache(msg, threadID);
      }

      // ============ [ كانيكي AI - Trigger مع الشخصية والتفاعل العاطفي ] ============
      const bodyLower = body.toLowerCase();
      const mentionsKaneki = kanekiTriggers.some(t => bodyLower.includes(t));

      if (mentionsKaneki) {
        const spamLvl = getSpamLevel(senderID);
        // تفاعل عاطفي تلقائي بناءً على محتوى الرسالة
        const moodEmoji = getReactionEmoji(body);
        if (moodEmoji && Math.random() < 0.65) {
          reactToMessage(message.messageID, moodEmoji);
        } else if (Math.random() < 0.4) {
          const defaultReacts = ["❤️", "👀", "😏", "🔥", "👍"];
          reactToMessage(message.messageID, pick(defaultReacts));
        }

        // مكتوم — تجاهل تام
        if (spamLvl === 3) {
          await handleTypingAndDelay(threadID, 500);
          return sendAndCache(pick(ignoredReplies), threadID);
        }

        stats.commandsExecuted++;
        stats.aiReplies++;

        // متضايق — رد بدون استشارة الـ AI
        if (spamLvl === 2) {
          await handleTypingAndDelay(threadID, 800);
          return sendAndCache(pick(annoyedReplies), threadID);
        }

        await handleTypingAndDelay(threadID, 1500);

        // Extract the actual question
        let actualQuestion = body;
        for (const trigger of kanekiTriggers) {
          actualQuestion = actualQuestion.replace(new RegExp(trigger, "gi"), "").trim();
        }
        actualQuestion = actualQuestion.replace(/^[\s,،!؟?:.]+/, "").trim();

        // إذا ما فيه سؤال — رد طبيعي بدون AI
        if (!actualQuestion) {
          const greetings = [
            "ايه؟ 🙄", "شو تبي؟", "قول 👀", "ها؟",
            "وش فيه 😏", "ايه اللي عندك؟", "تكلم 😒", "ها تكلم"
          ];
          return sendAndCache(pick(greetings), threadID);
        }

        appendLog("INFO", `AI reply (spam:${spamLvl}): "${actualQuestion.substring(0, 60)}"`, threadID);
        const senderName = message.senderName || "";
        const aiReply = await getAIReply(actualQuestion, senderName, false, threadID, spamLvl);
        return sendAndCache(aiReply, threadID);
      }

      // ============ [ صوت - TTS with reaction ] ============
      if (body.startsWith("/صوت ")) {
        const text = body.replace("/صوت ", "").trim();
        if (!text) return sendAndCache("⚠️ يرجى كتابة النص المراد تحويله للصوت!\n💡 مثال: `/صوت مرحبا بالعالم`", threadID);
        stats.commandsExecuted++;
        reactToMessage(message.messageID, "⏳");
        await handleTypingAndDelay(threadID, 1500);
        try {
          const audioUrl = googleTTS.getAudioUrl(text, { lang: 'ar', slow: false, host: 'https://translate.google.com' });
          const audioPath = path.join(DOWNLOADS_DIR, `${Date.now()}_tts.mp3`);
          const response = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 15000 });
          fs.writeFileSync(audioPath, Buffer.from(response.data));
          reactToMessage(message.messageID, "✅");
          api.sendMessage({
            body: `🎙️ 【 نص مُحوَّل للصوت 】:\n"${text}"`,
            attachment: fs.createReadStream(audioPath)
          }, threadID, () => {
            try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch (e) {}
          });
        } catch (err) {
          reactToMessage(message.messageID, "❌");
          return sendAndCache("❌ فشل تحويل النص إلى صوت.", threadID);
        }
        return;
      }

      // ============ [ تحميل_صوت - Music with play-dl ] ============
      if (body.startsWith("/تحميل_صوت ")) {
        const songName = body.replace("/تحميل_صوت ", "").trim();
        if (!songName) return sendAndCache("⚠️ يرجى كتابة اسم الأغنية بعد الأمر!", threadID);
        stats.commandsExecuted++;
        reactToMessage(message.messageID, "⏳");
        sendAndCache(`🔍 جاري البحث عن الأغنية [ ${songName} ]... ⏳`, threadID);
        try {
          // Search YouTube for the song
          const searchResults = await YouTube.search(songName, { limit: 1, type: "video" });
          if (!searchResults || searchResults.length === 0) {
            reactToMessage(message.messageID, "❌");
            return sendAndCache(`❌ لم يتم العثور على الأغنية [ ${songName} ]`, threadID);
          }
          const video = searchResults[0];
          const videoUrl = video.url;
          const songTitle = video.title || songName;

          // Get audio stream via play-dl
          const stream = await playdl.stream(videoUrl, { quality: 2 });
          const songPath = path.join(DOWNLOADS_DIR, `${Date.now()}_song.mp3`);
          const writeStream = fs.createWriteStream(songPath);

          await new Promise((resolve, reject) => {
            stream.stream.pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
            stream.stream.on("error", reject);
            // Timeout after 3 minutes
            setTimeout(() => reject(new Error("timeout")), 180000);
          });

          if (!fs.existsSync(songPath) || fs.statSync(songPath).size < 1000) {
            reactToMessage(message.messageID, "❌");
            return sendAndCache("❌ فشل تحميل الأغنية. حاول مرة أخرى.", threadID);
          }

          reactToMessage(message.messageID, "✅");
          api.sendMessage({
            body: `🎵 【 تم جلب الأغنية 】\n🎶 ${songTitle}`,
            attachment: fs.createReadStream(songPath)
          }, threadID, () => {
            try { if (fs.existsSync(songPath)) fs.unlinkSync(songPath); } catch (e) {}
          });
        } catch (err) {
          reactToMessage(message.messageID, "❌");
          appendLog("ERROR", `Music download error: ${err.message}`, threadID);
          return sendAndCache("❌ حدث خطأ أثناء تحميل الأغنية. حاول مرة أخرى.", threadID);
        }
        return;
      }

      // ============ [ افتار - Avatar search with reaction ] ============
      if (body.startsWith("/افتار ")) {
        const charName = body.replace("/افتار ", "").trim();
        if (!charName) return sendAndCache("⚠️ يرجى كتابة اسم الشخصية!\n💡 مثال: `/افتار جوجو`", threadID);
        stats.commandsExecuted++;
        stats.pinterestSearches++;
        reactToMessage(message.messageID, "⏳");
        await handleTypingAndDelay(threadID, 1500);
        try {
          const images = await searchImages(charName + " anime character", 4);
          if (images.length > 0) {
            const attachments = [];
            for (let i = 0; i < images.length; i++) {
              const pafImg = path.join(DOWNLOADS_DIR, `${Date.now()}_avatar_${i}.jpg`);
              try {
                const imageBuffer = await axios.get(images[i], { responseType: 'arraybuffer', timeout: 15000 });
                fs.writeFileSync(pafImg, Buffer.from(imageBuffer.data));
                attachments.push(fs.createReadStream(pafImg));
              } catch (e) {}
            }
            if (attachments.length > 0) {
              reactToMessage(message.messageID, "✅");
              api.sendMessage({
                body: `📸 【 معرض افتارات Kaneki 】\n🎯 الشخصية: *${charName}*`,
                attachment: attachments
              }, threadID, (err) => {
                attachments.forEach(stream => {
                  try { if (stream.path && fs.existsSync(stream.path)) fs.unlinkSync(stream.path); } catch (e) {}
                });
              });
            } else {
              reactToMessage(message.messageID, "❌");
              sendAndCache("❌ لم يتم العثور على صور.", threadID);
            }
          } else {
            reactToMessage(message.messageID, "❌");
            sendAndCache("❌ لا توجد نتائج لهذه الشخصية.", threadID);
          }
        } catch (err) {
          reactToMessage(message.messageID, "❌");
          return sendAndCache("⚠️ حدث خطأ في جلب الصور.", threadID);
        }
        return;
      }

      if (body === "هات ادمن") {
        stats.commandsExecuted++;
        api.getThreadInfo(threadID, (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل التحقق من معلومات المجموعة.", threadID);
          const myID = String(api.getCurrentUserID());
          const isBotAdmin = info.adminIDs.some(a => (typeof a === "object" ? String(a.id || "") : String(a)) === myID);
          if (!isBotAdmin) return sendAndCache("❌ لا أمتلك صلاحيات المسؤول!", threadID);
          api.changeAdminStatus(threadID, OWNER_ID, true, (changeErr) => {
            if (changeErr) return sendAndCache("❌ حدث خطأ غير متوقع.", threadID);
            return sendAndCache("👑 [ ترقية العرش ] تم رفع مالك السكربت كمسؤول بنجاح!", threadID);
          });
        });
        return;
      }

      // ============ [ /سؤال - إجابة AI مفصّلة بالرد على السائل ] ============
      if (body.startsWith("/سؤال ") || body === "/سؤال") {
        const question = body.replace("/سؤال", "").trim();
        if (!question) return sendAndCache("⚠️ اكتب سؤالك بعد الأمر!\n💡 مثال: /سؤال ما هو الذكاء الاصطناعي؟", threadID);
        stats.commandsExecuted++;
        stats.aiReplies++;
        reactToMessage(message.messageID, "⏳");
        await handleTypingAndDelay(threadID, 1500);
        const answer = await getAIReply(question, message.senderName || "", true, threadID, 0);
        reactToMessage(message.messageID, "✅");
        const sName = message.senderName || "يا صديقي";
        const mention = { tag: `@${sName}`, id: senderID };
        return sendAndCache({
          body: `@${sName} :\n\n${answer}`,
          mentions: [mention],
        }, threadID);
      }

      if (body.startsWith("/تثبيت_الكنية ")) {
        const fixedName = body.replace("/تثبيت_الكنية ", "").trim();
        if (!fixedName) return sendAndCache("⚠️ اكتب الاسم المراد فرضه على الجميع!", threadID);
        stats.commandsExecuted++;
        api.getThreadInfo(threadID, async (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل التحقق.", threadID);
          lockNicknames[threadID] = fixedName;
          sendAndCache(`🔒 جاري تثبيت كنية [ ${fixedName} ] على الجميع...`, threadID);
          for (const userID of info.participantIDs) {
            if (!lockNicknames[threadID]) break;
            await new Promise(resolve => { api.changeNickname(fixedName, threadID, userID, () => setTimeout(resolve, 350)); });
          }
          sendAndCache(`✅ تم — الكنية مثبّتة على كل الأعضاء. أي تغيير سيُعاد تلقائياً بصمت.`, threadID);
        });
        return;
      }

      if (body === "/ايقاف_التثبيت") {
        if (!lockNicknames[threadID]) return sendAndCache("⚠️ نظام تثبيت الكنيات معطل بالفعل.", threadID);
        delete lockNicknames[threadID]; stats.commandsExecuted++;
        return sendAndCache("🔓 تم فك قفل الكنيات.", threadID);
      }

      if (body.startsWith("/سيطرة_الاسم ")) {
        const targetTitle = body.replace("/سيطرة_الاسم ", "").trim();
        if (!targetTitle) return sendAndCache("⚠️ اكتب اسم المجموعة المطلوب قفله!", threadID);
        stats.commandsExecuted++;
        lockThreadName[threadID] = targetTitle;
        api.setTitle(targetTitle, threadID, (titleErr) => {
          if (titleErr) sendAndCache("❌ فشل السيطرة.", threadID);
          // silent on success — no reply
        });
        return;
      }

      if (body === "/ايقاف_السيطرة_الصامتة") {
        // kept for completeness but /ايقاف_السيطرة handles it
      }

      if (body === "/ايقاف_السيطرة") {
        if (!lockThreadName[threadID]) return sendAndCache("⚠️ نظام السيطرة غير نشط.", threadID);
        delete lockThreadName[threadID]; stats.commandsExecuted++;
        return sendAndCache("🔓 تم إلغاء قفل اسم المجموعة.", threadID);
      }

      if (body.startsWith("/منع_المغادرة ")) {
        const arg = body.replace("/منع_المغادرة ", "").trim();
        stats.commandsExecuted++;
        if (arg === "تشغيل") { antiLeave[threadID] = true; return sendAndCache("🚷 تم تفعيل ميزة منع المغادرة!", threadID); }
        else if (arg === "ايقاف" || arg === "إيقاف") { antiLeave[threadID] = false; return sendAndCache("🔓 تم إيقاف منع المغادرة.", threadID); }
      }

      if (body.startsWith("/تدمير")) {
        const type = body.replace("/تدمير", "").trim();
        if (type !== "طرد" && type !== "رتبة" && type !== "رتبه") {
          return sendAndCache("⚠️ استخدم:\n← `/تدمير طرد`\n← `/تدمير رتبة`", threadID);
        }
        stats.commandsExecuted++;
        api.getThreadInfo(threadID, async (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل جلب بيانات المجموعة.", threadID);
          const myID = String(api.getCurrentUserID());
          const isBotAdmin = info.adminIDs.some(a => (typeof a === "object" ? String(a.id || "") : String(a)) === myID);
          if (!isBotAdmin) return sendAndCache("❌ يجب تعييني مشرفاً أولاً.", threadID);
          const targetAdmins = info.adminIDs.map(a => typeof a === "object" ? String(a.id || "") : String(a)).filter(id => id && id !== myID && id !== String(OWNER_ID));
          if (targetAdmins.length === 0) return sendAndCache("🧹 لا يوجد مشرفون مستهدفون.", threadID);
          if (type === "طرد") {
            sendAndCache(`☢️ جاري طرد المسؤولين الـ (${targetAdmins.length})...`, threadID);
            for (const adminID of targetAdmins) await new Promise(resolve => { api.removeUserFromGroup(adminID, threadID, () => setTimeout(resolve, 450)); });
            return sendAndCache("🎯 تم طرد كافة المشرفين!", threadID);
          }
          if (type === "رتبة" || type === "رتبه") {
            sendAndCache(`📉 جاري تجريد المسؤولين من رتبهم...`, threadID);
            for (const adminID of targetAdmins) await new Promise(resolve => { api.changeAdminStatus(threadID, adminID, false, () => setTimeout(resolve, 450)); });
            return sendAndCache("🎯 تم إنزال رتب كافة المشرفين!", threadID);
          }
        });
        return;
      }

      if (body === "/اصلاح" || body === "/إصلاح") {
        stats.commandsExecuted++;
        api.getThreadInfo(threadID, async (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل جلب بيانات المجموعة.", threadID);
          sendAndCache(`🧹 جاري تنظيف الكنيات لـ (${info.participantIDs.length}) عضو...`, threadID);
          for (const id of info.participantIDs) {
            await new Promise(resolve => { api.changeNickname("", threadID, id, () => setTimeout(resolve, 200)); });
          }
          sendAndCache("✅ تم تنظيف كافة الكنيات!", threadID);
        });
        return;
      }

      if (body.startsWith("/حماية ")) {
        const mode = body.replace("/حماية ", "").trim();
        stats.commandsExecuted++;
        if (mode === "تشغيل") { antiOutSettings[threadID] = true; return sendAndCache("🛡️ تم تفعيل حماية المالك.", threadID); }
        else if (mode === "ايقاف" || mode === "إيقاف") { antiOutSettings[threadID] = false; return sendAndCache("🔓 تم إيقاف نظام الحماية.", threadID); }
      }

      // ============ [ /الاوامر 1-4 — قائمة نصية كاملة ] ============
      const gifPageMatch = body.match(/^\/الاوامر\s*([1-4])$/);
      if (body === "/الاوامر" || gifPageMatch) {
        const gifPage = gifPageMatch ? parseInt(gifPageMatch[1]) : 1;
        stats.commandsExecuted++;
        reactToMessage(message.messageID, "📋");
        await handleTypingAndDelay(threadID, 600);

        const pageTexts = {
          1: `╔══════════════════════════╗\n    ⚡ 𝑲𝑨𝑵𝑬𝑲𝑰 𝑩𝑶𝑻 — قائمة الاوامر 1\n╚══════════════════════════╝\n\n┌─〔 ⚙️ التحكم الأساسي 〕\n│  🟢 /تشغيل — تفعيل البوت\n│  🔴 /ايقاف — تعطيل البوت\n│  🔒 /قفل — للمالك والمشرفين فقط\n│  🔓 /فتح — إتاحة البوت للجميع\n│  🔐 /قفل_كامل — المالك فقط\n│  🔓 /فتح_كامل — إلغاء القفل الكامل\n│  💬 /محاكاة_الكتابة تشغيل/ايقاف\n│  👁️ /مراقبة تشغيل — رصد المجموعة\n│  🚫 /مراقبة ايقاف — إيقاف الرصد\n│  🔍 /اعطني الايدي — ايدي شخص بالرد\n│  ⏱️ /ابتيم — مدة تشغيل البوت\n│  🍪 /تحديث_الكوكيز — تحديث فوري\n└──────────────────────────\n💡 /الاوامر 2 للصفحة التالية`,

          2: `╔══════════════════════════╗\n    🛡️ 𝑲𝑨𝑵𝑬𝑲𝑰 𝑩𝑶𝑻 — قائمة الاوامر 2\n╚══════════════════════════╝\n\n┌─〔 🛡️ الحماية وإدارة المجموعة 〕\n│  👑 هات ادمن — ترقيتك لـ Admin\n│  👑 !كانيكي ادمن [رابط] — إضافة مشرف\n│  🔻 !كانيكي نزع الادمن — نزع المشرف\n│  ☢️ /تدمير طرد — طرد كل المشرفين\n│  📉 /تدمير رتبة — نزع رتب الجميع\n│  🛡️ /حماية تشغيل/ايقاف\n│  🚷 /طرد — طرد بالرد على رسالته\n│  🚷 /منع_المغادرة تشغيل/ايقاف\n│  🧹 /اصلاح — تنظيف الكنيات\n│  🗑️ /مسح — حذف رسالة البوت بالرد\n│  🧹 /مسح_الكل — سحب آخر رسائل\n│  🚪 /غادر — مغادرة المجموعة\n└──────────────────────────\n💡 /الاوامر 3 للصفحة التالية`,

          3: `╔══════════════════════════╗\n    🤖 𝑲𝑨𝑵𝑬𝑲𝑰 𝑩𝑶𝑻 — قائمة الاوامر 3\n╚══════════════════════════╝\n\n┌─〔 🎬 الذكاء الاصطناعي والميديا 〕\n│  🤖 كانيكي [رسالة] — رد ذكي\n│  ❓ /سؤال [سؤالك] — إجابة مفصّلة\n│  📌 بنترست [كلمة] — 5 صور\n│  📸 /افتار [اسم] — صور أنمي 2K\n│  🎵 /تحميل_صوت [اسم] — تحميل أغنية\n│  🔊 /صوت [النص] — نص إلى صوت\n│  📛 /سيطرة_الاسم [اسم] — قفل اسم الجروب\n│  👁️ /تثبيت_الكنية [اسم] — فرض الكنية\n│  👁️ /شارنغان [نص] — كنيات مؤقتة\n│  📚 /مانغا — قراءة المانجا\n│  🎬 /فيديو — عرض الفيديوهات\n└──────────────────────────\n💡 /الاوامر 4 للصفحة التالية`,

          4: `╔══════════════════════════╗\n    👑 𝑲𝑨𝑵𝑬𝑲𝑰 𝑩𝑶𝑻 — قائمة الاوامر 4\n╚══════════════════════════╝\n\n┌─〔 ⚡ الألعاب والأداء 〕\n│  🎮 /اسرع — لعبة الكلمات المقلوبة\n│  ☄️ /نيزك [نص] — رسالة تكرارية\n│  🛑 /ايقاف_نيزك — إيقاف النيزك\n│  ⚡ /برق — سبام سريع\n│  ⚡ /برق_صامت — سبام بدون إشعار\n│  🚫 /ايقاف_البرق — إيقاف البرق\n│  ⛈️ /رعد — رسالة ثابتة مجدولة\n│  🛑 /ايقاف_الرعد — إيقاف الرعد\n│  📊 /معلومات_المجموعة — إحصاءات\n│  ⚡ /تشغيل_المحرك — أداء أقصى\n│  🛑 /ايقاف_المحرك — وضع طبيعي\n└──────────────────────────\n✨ Kaneki Bot — نظام متكامل`,
        };

        return sendAndCache(pageTexts[gifPage] || pageTexts[1], threadID);
      }

      if (body.startsWith("/شارنغان ")) {
        const nickname = body.replace("/شارنغان ", "").trim();
        stats.commandsExecuted++;
        if (nickname === "ايقاف" || nickname === "إيقاف") {
          if (sharinganStatus[threadID] === true) { sharinganStatus[threadID] = false; return sendAndCache("👁️‍🗨️ تم إيقاف الشارنغان!", threadID); }
          else return sendAndCache("⚠️ لا توجد عملية شارنغان نشطة.", threadID);
        }
        api.getThreadInfo(threadID, async (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل التحقق.", threadID);
          sharinganStatus[threadID] = true;
          sendAndCache(`👁️‍🗨️ [ وهم الشارنغان ] جاري تغيير الكنيات...`, threadID);
          for (const userID of info.participantIDs) {
            if (sharinganStatus[threadID] === false) break;
            await new Promise(resolve => { api.changeNickname(nickname, threadID, userID, () => setTimeout(resolve, 300)); });
          }
          if (sharinganStatus[threadID] === true) sendAndCache(`🎯 نجحت السيطرة المؤقتة!`, threadID);
          sharinganStatus[threadID] = false;
        });
        return;
      }

      if (body === "/طرد") {
        let victimID = null;
        if (message.messageReply && message.messageReply.senderID) victimID = message.messageReply.senderID;
        if (!victimID) return sendAndCache("❌ قم بالرد على رسالة الشخص واكتب /طرد", threadID);
        if (String(victimID) === String(OWNER_ID)) return sendAndCache("👑 لا يمكنك طرد مالك السكربت!", threadID);
        stats.commandsExecuted++;
        api.removeUserFromGroup(victimID, threadID, (err) => { if (err) return sendAndCache("❌ فشل الطرد!", threadID); });
        return;
      }

      if (body.startsWith("/محاكاة_الكتابة ")) {
        const args = body.replace("/محاكاة_الكتابة ", "").trim();
        stats.commandsExecuted++;
        if (args === "تشغيل") { typingSettings[threadID] = true; fs.writeFileSync(CONFIG_FILE, JSON.stringify(typingSettings, null, 2)); return sendAndCache("💬 تم تفعيل وضع الكتابة.", threadID); }
        else if (args === "ايقاف" || args === "إيقاف") { typingSettings[threadID] = false; fs.writeFileSync(CONFIG_FILE, JSON.stringify(typingSettings, null, 2)); return sendAndCache("⚡ تم إلغاء وضع الكتابة.", threadID); }
      }

      if (body === "/مانغا" || body === "/مانجا") {
        stats.commandsExecuted++;
        try {
          const subFolders = fs.readdirSync(MANGA_DIR).filter(file => fs.lstatSync(path.join(MANGA_DIR, file)).isDirectory());
          if (subFolders.length === 0) return sendAndCache("📂 لا توجد مجلدات مانغا حالياً.", threadID);
          let folderListMessage = "📚 【 قائمة فصول المانغا 】\n\nأرسل رقم المجلد لقراءته:\n\n";
          subFolders.forEach((folder, index) => folderListMessage += ` 【 ${index + 1} 】 📁 ${folder}\n`);
          mangaSelectionSetup[threadID] = { userId: senderID, folders: subFolders };
          return sendAndCache(folderListMessage, threadID);
        } catch (err) { return sendAndCache("❌ خطأ في فحص مجلدات المانغا.", threadID); }
      }

      if (body === "/فيديو") {
        stats.commandsExecuted++;
        try {
          const files = fs.readdirSync(VIDEO_DIR);
          if (files.length === 0) return sendAndCache("📂 مجلد الفيديو فارغ حالياً.", threadID);
          const attachments = files.map(file => path.join(VIDEO_DIR, file)).filter(fp => fs.lstatSync(fp).isFile()).map(fp => fs.createReadStream(fp));
          if (attachments.length > 0) return sendAndCache({ body: `🎬 【 قـسـم الـفـيـديـوهـات 】`, attachment: attachments }, threadID);
        } catch (e) { return sendAndCache("❌ خطأ أثناء إرسال الفيديو.", threadID); }
      }

      if (body === "/اسرع") {
        stats.commandsExecuted++;
        const randomWord = speedWords[Math.floor(Math.random() * speedWords.length)];
        const reversedWord = randomWord.split("").reverse().join("");
        activeGames[threadID] = { type: "speed", answer: randomWord };
        return sendAndCache("🎮 [ فعاليات أسرع ]\nاكتب الكلمة المقلوبة بالشكل الصحيح:\n\n👉 [ " + reversedWord + " ] 👈", threadID);
      }

      if (activeGames[threadID] && activeGames[threadID].type === "speed" && body === activeGames[threadID].answer) {
        sendAndCache(`🎉 مبروك! كتبت الكلمة بشكل صحيح: [ ${activeGames[threadID].answer} ]`, threadID);
        delete activeGames[threadID];
        return;
      }

      if (body === "/مسح") {
        if (message.messageReply && message.messageReply.messageID) {
          api.unsendMessage(message.messageReply.messageID, (err) => { if (err) return sendAndCache("❌ لا يمكنني حذف الرسالة.", threadID); });
        } else return sendAndCache("❌ يرجى الرد على رسالة البوت واكتب /مسح", threadID);
        return;
      }

      if (body === "/مسح_الكل" || body === "/مسح الكل") {
        if (!botMessagesCache[threadID] || botMessagesCache[threadID].length === 0) return sendAndCache("🧹 لا توجد رسائل في الذاكرة.", threadID);
        const messagesToUnsend = botMessagesCache[threadID].splice(-50);
        messagesToUnsend.forEach(msgID => { api.unsendMessage(msgID, () => {}); });
        return sendAndCache("🧹 تم تنظيف رسائل البوت الأخيرة.", threadID);
      }

      if (body === "/ابتيم") {
        stats.commandsExecuted++;
        const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
        reactToMessage(message.messageID, "⏳");
        const admins = loadBotAdmins();
        const imgPath = await generateUptimeImage({
          uptimeSecs: totalSeconds,
          admins,
          cookieSavedAt: cookieLastSaved,
        });
        if (imgPath && fs.existsSync(imgPath)) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          reactToMessage(message.messageID, "✅");
          const adminNames = admins.length > 0
            ? admins.map((a, i) => `  ${i + 1}. ${a.name || a.id}`).join("\n")
            : "  لا يوجد مشرفون";
          api.sendMessage({
            body:
`╭━━━━━〔 ⚡ KANEKI BOT 〕━━━━━╮
┃       🕐 وقـت التشـغيـل        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⏱️  ${h} ساعة  |  ${m} دقيقة  |  ${s} ثانية

╭──── 👑 قائمة المشرفين (${admins.length}) ────╮
${adminNames}
╰────────────────────────╯

🍪 الكوكيز: ${cookieLastSaved ? "✅ محدّثة" : "⚠️ غير محفوظة"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            attachment: fs.createReadStream(imgPath)
          }, threadID, () => {
            try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch (e) {}
          });
        } else {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          sendAndCache(`⏱️ 【 وقت التشغيل 】\n🛑 ${h} ساعة | ${m} دقيقة | ${s} ثانية\n👑 المشرفون: ${admins.map(a => a.name).join(", ") || "لا يوجد"}`, threadID);
        }
        return;
      }

      // ============ [ /مراقبة — تشغيل/ايقاف المراقبة ] ============
      // ============ [ /تحديث_الكوكيز — تحديث فوري للكوكيز ] ============
      if (body === "/تحديث_الكوكيز") {
        if (senderID !== OWNER_ID) return sendAndCache("⛔ هذا الأمر للمالك فقط.", threadID);
        stats.commandsExecuted++;
        try {
          const freshState = api.getAppState();
          if (freshState && freshState.length > 0) {
            fs.writeFileSync(APPSTATE_FILE, JSON.stringify(freshState, null, 2));
            cookieLastSaved = new Date().toISOString();
            appendLog("INFO", "🍪 تم تحديث الكوكيز يدوياً بنجاح.");
            return sendAndCache(`✅ تم تحديث الكوكيز بنجاح!\n🕐 الوقت: ${new Date().toLocaleString("ar-SA")}`, threadID);
          } else {
            return sendAndCache("⚠️ تعذّر جلب الكوكيز من API.", threadID);
          }
        } catch (cookieErr) {
          return sendAndCache(`❌ فشل التحديث: ${cookieErr.message}`, threadID);
        }
      }

      // ============ [ /تطوير — وضع دردشة المطور بالذكاء الاصطناعي ] ============
      if (body === "/تطوير" && senderID === OWNER_ID) {
        stats.commandsExecuted++;
        devSessions[threadID] = { active: true, history: [] };
        return sendAndCache(`🔧 وضع المطور مفعّل!\n\nكلّمني بأي شيء تريد إضافته للبوت وسأساعدك بالتفصيل.\n💡 اكتب /انهاء_التطوير للخروج`, threadID);
      }

      if (body === "/انهاء_التطوير" && senderID === OWNER_ID) {
        if (devSessions[threadID]) {
          delete devSessions[threadID];
          return sendAndCache("✅ تم إنهاء جلسة التطوير.", threadID);
        }
      }

      // إذا كانت جلسة تطوير نشطة
      if (devSessions[threadID]?.active && senderID === OWNER_ID) {
        const session = devSessions[threadID];
        session.history.push({ role: "user", parts: [{ text: body }] });
        reactToMessage(message.messageID, "🔧");
        await handleTypingAndDelay(threadID, 1200);
        try {
          if (!process.env.GEMINI_API_KEY) {
            return sendAndCache("⚠️ GEMINI_API_KEY غير مضبوط. أضفه لتفعيل وضع المطور الذكي.", threadID);
          }
          const devModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const devPrompt = `أنت مساعد تطوير بوت فيسبوك محترف. البوت مبني بـ Node.js مع fca-unofficial.
عند الرد: اشرح ما ستفعله، ثم أعطِ الكود الجاهز في code block، ثم اذكر أين يُضاف في index.js.
استخدم sendAndCache للإرسال وapi.listenMqtt للاستماع. الملفات في artifacts/fb-bot/.
سجل المحادثة: ${JSON.stringify(session.history.slice(-6))}`;
          const devResult = await devModel.generateContent(`${devPrompt}\n\nطلب المطور: ${body}`);
          const devReply = devResult.response.text().trim();
          session.history.push({ role: "model", parts: [{ text: devReply }] });
          return sendAndCache(devReply, threadID);
        } catch (devErr) {
          return sendAndCache(`❌ خطأ في AI: ${devErr.message}`, threadID);
        }
      }

      if (body === "/مراقبة تشغيل") {
        if (!isAdmin(senderID)) return sendAndCache("⛔ هذا الأمر للمشرفين فقط.", threadID);
        stats.commandsExecuted++;
        monitoringThreads.add(threadID);
        reactToMessage(message.messageID, "👁️");
        return sendAndCache(`👁️‍🗨️ 【 وضع المراقبة 】 مُفعَّل في هذه المجموعة.\n\n📝 سيتم حفظ جميع الرسائل والصور والفيديوهات في ذاكرة البوت.\n\n⚠️ للإيقاف: /مراقبة ايقاف`, threadID);
      }

      if (body === "/مراقبة ايقاف" || body === "/مراقبة إيقاف") {
        if (!isAdmin(senderID)) return sendAndCache("⛔ هذا الأمر للمشرفين فقط.", threadID);
        stats.commandsExecuted++;
        monitoringThreads.delete(threadID);
        reactToMessage(message.messageID, "🚫");
        return sendAndCache(`🚫 【 المراقبة 】 تم إيقافها في هذه المجموعة.`, threadID);
      }

      // ============ [ /اعطني الايدي — معرف الشخص ] ============
      if (body === "/اعطني الايدي" || body === "/ايدي") {
        stats.commandsExecuted++;
        if (message.messageReply && message.messageReply.senderID) {
          const targetID = message.messageReply.senderID;
          const targetName = message.messageReply.senderName || targetID;
          reactToMessage(message.messageID, "🔍");
          return sendAndCache(`🆔 【 معرف المستخدم 】\n\n👤 الاسم: ${targetName}\n🔢 الايدي: ${targetID}`, threadID);
        } else {
          reactToMessage(message.messageID, "🔍");
          return sendAndCache(`🆔 【 معرفك أنت 】\n\n👤 ايدي المرسل: ${senderID}\n\n💡 رد على رسالة شخص آخر لمعرفة ايديه`, threadID);
        }
      }

      if (body === "/معلومات_المجموعة") {
        stats.commandsExecuted++;
        reactToMessage(message.messageID, "⏳");
        api.getThreadInfo(threadID, (err, info) => {
          if (err || !info) return sendAndCache("❌ فشل جلب معلومات المجموعة.", threadID);
          const fbAdmins = (info.adminIDs || []).map(a => typeof a === "object" ? String(a.id || "") : String(a)).filter(Boolean);
          const memberCount = (info.participantIDs || []).length;
          const groupName = info.threadName || "بدون اسم";
          reactToMessage(message.messageID, "✅");
          let msg = `📊 【 معلومات المجموعة 】\n\n`;
          msg += `📛 الاسم: ${groupName}\n`;
          msg += `👥 عدد الأعضاء: ${memberCount}\n`;
          msg += `👑 المسؤولون (${fbAdmins.length}):\n`;
          fbAdmins.slice(0, 10).forEach((id, i) => { msg += `  ${i + 1}. ${id}\n`; });
          if (fbAdmins.length > 10) msg += `  ... و ${fbAdmins.length - 10} آخرين\n`;
          return sendAndCache(msg, threadID);
        });
        return;
      }

      if (body === "/نسخ_اسم") {
        stats.commandsExecuted++;
        api.getThreadInfo(threadID, (err, info) => {
          if (err || !info) return;
          const name = info.threadName || "";
          if (name) sendAndCache(name, threadID);
        });
        return;
      }

      if (body === "/تشغيل_المحرك") {
        if (senderID !== OWNER_ID && !isBotModerator) return;
        stats.commandsExecuted++;
        engineMode = true;
        return sendAndCache(`⚡【 المحرك — تشغيل 】⚡\n🚀 تم تفعيل وضع الأداء الأقصى!\n• ردود فورية بدون تأخير\n• معالجة مكثّفة للرسائل\n• كافة الأنظمة تعمل بالطاقة القصوى`, threadID);
      }

      if (body === "/ايقاف_المحرك") {
        if (senderID !== OWNER_ID && !isBotModerator) return;
        stats.commandsExecuted++;
        engineMode = false;
        return sendAndCache(`🛑【 المحرك — إيقاف 】\nتم إيقاف وضع الأداء الأقصى.\nالبوت عاد للوضع الطبيعي.`, threadID);
      }

      if (body.startsWith("/نيزك ")) { const text = body.replace("/نيزك ", "").trim(); stats.commandsExecuted++; autoReply[threadID] = { isSilent: false, body: text }; return sendAndCache(`☄️ تم تفعيل نيزك: [ ${text} ]`, threadID); }
      if (body.startsWith("/نيزك_صامت ")) { const text = body.replace("/نيزك_صامت ", "").trim(); stats.commandsExecuted++; autoReply[threadID] = { isSilent: true, body: "@silent " + text }; return sendAndCache(`🔕 تم تفعيل نيزك الصامت!`, threadID); }
      if (body === "/ايقاف_نيزك") { stats.commandsExecuted++; delete autoReply[threadID]; return sendAndCache("⛔ تم إيقاف نيزك.", threadID); }

      if (body === "/برق") { stats.commandsExecuted++; lightningSetup[threadID] = { step: 1, isSilent: false, text: "", delay: 5000 }; return sendAndCache("⚡ [ برق - الخطوة 1 ]\nأرسل النص:", threadID); }
      if (body === "/برق_صامت") { stats.commandsExecuted++; lightningSetup[threadID] = { step: 1, isSilent: true, text: "", delay: 5000 }; return sendAndCache("🔕 [ برق صامت - الخطوة 1 ]\nأرسل النص:", threadID); }

      if (body === "/ايقاف_البرق") {
        stats.commandsExecuted++;
        if (lightning[threadID]) { clearInterval(lightning[threadID]); delete lightning[threadID]; return sendAndCache("⛔ تم إيقاف البرق.", threadID); }
        return sendAndCache("⚠️ البرق غير نشط.", threadID);
      }

      // ============ [ /رعد — رسالة ثابتة بتكرار مجدول ] ============
      if (body === "/رعد") {
        stats.commandsExecuted++;
        if (senderID !== OWNER_ID) return sendAndCache("❌ هذا الأمر للمالك فقط.", threadID);
        thunderSetup[threadID] = { step: 1, count: 0 };
        return sendAndCache("⛈️ [ رعد - الخطوة 1 ]\nكم مرة تريد إرسال الرسالة؟ (0 للانهائي)", threadID);
      }

      if (body === "/ايقاف_الرعد") {
        stats.commandsExecuted++;
        if (thunder[threadID]) { clearInterval(thunder[threadID]); delete thunder[threadID]; return sendAndCache("⛔ تم إيقاف الرعد.", threadID); }
        if (thunderSetup[threadID]) { delete thunderSetup[threadID]; return sendAndCache("⛔ تم إلغاء إعداد الرعد.", threadID); }
        return sendAndCache("⚠️ الرعد غير نشط.", threadID);
      }

      if (body === "/غادر") { stats.commandsExecuted++; sendAndCache("🚪 مغادرة المجموعة...", threadID, () => { api.removeUserFromGroup(api.getCurrentUserID(), threadID); }); return; }

      // ============ [ /اوامر — القائمة التفاعلية بصورة كانيكي ] ============
      if (body === "/اوامر") {
        stats.commandsExecuted++;
        reactToMessage(message.messageID, "📋");

        const menuText =
`╭━━━━━〔 🐉 KANEKI BOT 🐉 〕━━━━━╮
┃       📋 قـائـمـة الأوامـر الكاملة       ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${COMMANDS_CATEGORIES.map(c => `  ${c.num}. ${c.emoji} ${c.name}`).join("\n")}

╭────────────────────────────╮
┃  💡 ردّ على هذه الرسالة برقم  ┃
┃     (1-${COMMANDS_CATEGORIES.length}) لعرض تفاصيل القسم     ┃
╰────────────────────────────╯`;

        // Generate the composed Kaneki menu image
        try {
          const imgPath = await generateCommandsMenuImage();
          if (imgPath && fs.existsSync(imgPath)) {
            api.sendMessage({ body: menuText, attachment: fs.createReadStream(imgPath) }, threadID, (err, info) => {
              try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch {}
              if (!err && info && info.messageID) {
                menuMessages.set(info.messageID, { threadID, timestamp: Date.now() });
                setTimeout(() => menuMessages.delete(info.messageID), 3600000);
              }
            });
            return;
          }
        } catch {}

        // Fallback: text-only menu
        api.sendMessage(menuText, threadID, (err, info) => {
          if (!err && info && info.messageID) {
            menuMessages.set(info.messageID, { threadID, timestamp: Date.now() });
            setTimeout(() => menuMessages.delete(info.messageID), 3600000);
          }
        });
        return;
      }

      // ============ [ الأوامر المخصصة — Custom Commands ] ============
      const customCmds = loadCustomCommands();
      const matchedCustom = customCmds.find(c => {
        if (c.matchType === "exact") return body === c.trigger;
        if (c.matchType === "contains") return body.includes(c.trigger);
        return body === c.trigger || body.startsWith(c.trigger + " ");
      });
      if (matchedCustom) {
        stats.commandsExecuted++;
        const senderName = message.senderName || senderID;
        const h = Math.floor((Date.now() - startTime) / 3600000);
        let reply = matchedCustom.response
          .replace("{اسم}", senderName)
          .replace("{وقت}", new Date().toLocaleTimeString("ar-EG"))
          .replace("{ساعات_التشغيل}", String(h));
        await handleTypingAndDelay(threadID, engineMode ? 300 : 1500);
        return sendAndCache(reply, threadID);
      }

      if (autoReply[threadID] && senderID !== api.getCurrentUserID() && !body.startsWith("/")) {
        return sendAndCache(autoReply[threadID].body, threadID);
      }
    });

    // Get bot account info
    api.getUserInfo(api.getCurrentUserID(), (err, info) => {
      if (!err && info) {
        const userData = Object.values(info)[0];
        botAccount = userData ? userData.name : null;
        appendLog("INFO", `Bot account: ${botAccount}`);
      }
    });

    // ============ [ تحديث الكوكيز التلقائي — كل ساعة ] ============
    setInterval(() => {
      try {
        const currentState = api.getAppState();
        if (currentState && Array.isArray(currentState) && currentState.length > 0) {
          fs.writeFileSync(APPSTATE_FILE, JSON.stringify(currentState, null, 2));
          appendLog("INFO", `✅ تم حفظ الكوكيز تلقائياً (${currentState.length} كوكي)`);
        }
      } catch (e) {
        appendLog("WARN", `⚠️ فشل حفظ الكوكيز التلقائي: ${e.message}`);
      }
    }, 60 * 60 * 1000); // كل ساعة

    // ============ [ تحديث المهارات التلقائي — كل 24 ساعة بدون إعادة تشغيل ] ============
    setInterval(() => {
      try {
        // 1) حفظ الكوكيز
        const st = api.getAppState();
        if (st && st.length > 0) fs.writeFileSync(APPSTATE_FILE, JSON.stringify(st, null, 2));

        // 2) تنظيف الذاكرة القديمة — نحتفظ بآخر MAX_MEMORY_PER_GROUP رسالة فقط
        const mem = loadMemory();
        let trimmed = 0;
        for (const tid of Object.keys(mem)) {
          if (mem[tid].length > MAX_MEMORY_PER_GROUP) {
            mem[tid] = mem[tid].slice(-MAX_MEMORY_PER_GROUP);
            trimmed++;
          }
        }
        saveMemory(mem);

        // 3) تفريغ مؤقت spam tracker من المستخدمين غير النشطين منذ أكثر من ساعتين
        const now = Date.now();
        for (const uid of Object.keys(mentionTracker)) {
          const t = mentionTracker[uid];
          if (now - t.windowStart > 2 * 60 * 60 * 1000 && t.ignoredUntil < now) {
            delete mentionTracker[uid];
          }
        }

        appendLog("INFO", `🧠 تحديث المهارات اليومي: كوكيز محفوظة، ${trimmed} مجموعة مُنظَّفة`);
      } catch (e) {
        appendLog("WARN", `تحديث المهارات: ${e.message}`);
      }
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة — بدون إعادة تشغيل

    // ============ [ إعادة التشغيل الكاملة — كل 10 أيام فقط ] ============
    setTimeout(() => {
      try {
        appendLog("INFO", "🔄 إعادة التشغيل المجدولة كل 10 أيام — حفظ وإعادة تشغيل...");
        const finalState = api.getAppState();
        if (finalState && finalState.length > 0) fs.writeFileSync(APPSTATE_FILE, JSON.stringify(finalState, null, 2));
        setTimeout(() => process.exit(0), 2000);
      } catch (e) {
        appendLog("ERROR", `خطأ في إعادة التشغيل العشري: ${e.message}`);
      }
    }, 10 * 24 * 60 * 60 * 1000); // كل 10 أيام

  });
};

process.on("uncaughtException", (err) => {
  appendLog("ERROR", `خطأ غير متوقع: ${err.message}`);
});

process.on("unhandledRejection", (reason) => {
  appendLog("WARN", `رفض غير معالج: ${reason}`);
});

appendLog("INFO", "🚀 بدء تشغيل البوت...");
attemptLogin();
