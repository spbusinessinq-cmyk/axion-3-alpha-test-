import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || (IS_PROD ? 5000 : 3001);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

/* ── Feed Sources ─────────────────────────────────────────── */
const FEED_SOURCES = [
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",           domain: "Global Affairs" },
  { url: "https://feeds.reuters.com/Reuters/worldNews",                       domain: "Global Affairs" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml",                       domain: "Global Affairs" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml",                         domain: "Global Affairs" },
  { url: "https://feeds.feedburner.com/foreignpolicy/latest",                 domain: "Global Affairs" },
  { url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml", domain: "Security / Defense" },
  { url: "https://breakingdefense.com/feed/",                                 domain: "Security / Defense" },
  { url: "https://www.thedrive.com/the-war-zone/rss",                         domain: "Security / Defense" },
  { url: "https://www.cisa.gov/news.xml",                                     domain: "Technology Systems" },
  { url: "https://krebsonsecurity.com/feed/",                                 domain: "Technology Systems" },
  { url: "https://www.darkreading.com/rss.xml",                               domain: "Technology Systems" },
  { url: "https://feeds.reuters.com/Reuters/businessNews",                    domain: "Markets" },
  { url: "https://www.eia.gov/rss/news.xml",                                  domain: "Markets" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",        domain: "Domestic / Policy" },
  { url: "https://thehill.com/feed/",                                         domain: "Domestic / Policy" },
];

function classifyDomain(title, fallback) {
  if (/military|missile|drone|defense|navy|air.?force|troops|combat|weapon|warship|fighter|bomb|strike|war|conflict|artillery/i.test(title)) return "Security / Defense";
  if (/cyber|ransomware|hack|malware|infrastructure|ai\b|compute|chip|cloud|data.?breach|vulnerability|exploit|zero.?day|botnet/i.test(title)) return "Technology Systems";
  if (/market|oil|energy|shipping|trade|treasury|inflation|equity|tariff|sanction|commodity|port|supply.?chain|crude|lng|brent|nasdaq|dow/i.test(title)) return "Markets";
  if (/white house|senate|congress|executive|agency|department|administration|federal|election|legislation|policy|vote|president|minister|parliament/i.test(title)) return "Domestic / Policy";
  return fallback;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, "");
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeEntities(m[1].trim()) : "";
}

async function fetchFeed(url, fallbackDomain, perFeed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RSR-AXION/1.0 (intelligence-synthesis)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const text = await res.text();

    const results = [];
    const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let m;
    let count = 0;
    while ((m = itemRe.exec(text)) !== null && count < perFeed) {
      const block = m[1];
      const title = extractTag(block, "title");
      if (!title || title.length < 6) { count++; continue; }
      const desc = extractTag(block, "description")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
      results.push({
        id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: "RSR Signal Feed",
        domain: classifyDomain(title, fallbackDomain),
        title,
        summary: desc,
        severity: Math.floor(Math.random() * 4) + 1,
        confidence: 68 + Math.floor(Math.random() * 27),
        timestamp: new Date().toISOString(),
      });
      count++;
    }
    return results;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/* ── /api/signals ─────────────────────────────────────────── */
app.get("/api/signals", async (req, res) => {
  const PER_FEED = 12;
  const buckets = await Promise.race([
    Promise.allSettled(
      FEED_SOURCES.map(({ url, domain }) => fetchFeed(url, domain, PER_FEED))
    ),
    new Promise(resolve => setTimeout(() => resolve([]), 10000)),
  ]);

  const raw = (Array.isArray(buckets) ? buckets : []).flatMap(r =>
    r.status === "fulfilled" ? r.value : []
  );

  const seen = new Set();
  const signals = raw.filter(e => {
    const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json({ signals, count: signals.length });
});

/* ── Static (production only) ─────────────────────────────── */
if (IS_PROD) {
  const dist = join(__dirname, "dist");
  app.use(express.static(dist));
  app.get("*", (_, res) => res.sendFile(join(dist, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RSR AXION API server running on port ${PORT} [${IS_PROD ? "production" : "development"}]`);
});
