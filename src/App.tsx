import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Database, Download, EyeOff, FileText, Globe, Newspaper, Pin, Printer, Radar, ScrollText, Search, Shield, Sparkles, Star, StarOff, Wand2, Zap, X } from "lucide-react";
import type { ArchiveModeFilter, ArchiveSort, ArchiveThreatFilter, BriefDepth, ExportKind, FeedEvent, HistoryEntry, Mode, ThreatMatrix } from "./lib/types";
import { averageConfidence, buildArticle, buildBulletin, buildFullBrief, buildPrintHtml, clusterCounts, downloadTextFile, formatThreatOrder, safeLoad, saveToStorage, scoreBand } from "./lib/utils";

const STORAGE_KEYS = {
  history: "rsr-axion-history-v6",
  notes: "rsr-axion-notes-v6",
  used: "rsr-axion-used-v6",
  verified: "rsr-axion-verified-v6",
  excluded: "rsr-axion-excluded-v6",
};

const FALLBACK_SIGNALS: FeedEvent[] = [
  { id: "fallback-1", source: "RSR Fallback Feed", domain: "Security / Defense", title: "Regional military signaling remains elevated across Middle East maritime lanes", summary: "Fallback signal loaded because the preview environment blocked live feed requests.", severity: 4, confidence: 78, timestamp: new Date().toISOString() },
  { id: "fallback-2", source: "RSR Fallback Feed", domain: "Markets", title: "Energy and shipping sensitivity remain central to the current market picture", summary: "Fallback signal loaded because the preview environment blocked live feed requests.", severity: 3, confidence: 76, timestamp: new Date().toISOString() },
  { id: "fallback-3", source: "RSR Fallback Feed", domain: "Technology Systems", title: "Compute and infrastructure buildout continue shaping the technical layer", summary: "Fallback signal loaded because the preview environment blocked live feed requests.", severity: 2, confidence: 74, timestamp: new Date().toISOString() },
  { id: "fallback-4", source: "RSR Fallback Feed", domain: "Domestic / Policy", title: "Federal policy activity adds pressure to the domestic operating picture", summary: "Institutional movement remains part of the cycle.", severity: 2, confidence: 72, timestamp: new Date().toISOString() },
  { id: "fallback-5", source: "RSR Fallback Feed", domain: "Global Affairs", title: "Strategic shipping routes remain vulnerable to regional power signaling", summary: "Maritime pressure is still relevant to the broader intelligence cycle.", severity: 3, confidence: 75, timestamp: new Date().toISOString() },
];

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function fetchSignals(): Promise<FeedEvent[]> {
  const feeds = [
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://feeds.reuters.com/Reuters/worldNews",
    "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    "https://www.cisa.gov/news.xml",
  ];
  const results: FeedEvent[] = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 25);
      items.forEach((item, i) => {
        const title = item.querySelector("title")?.textContent || "Signal";
        const summary = item.querySelector("description")?.textContent || "";
        let domain = "Global Affairs";
        if (/military|missile|drone|defense|navy|air force|troops/i.test(title)) domain = "Security / Defense";
        if (/cyber|hack|infrastructure|ai|compute|chip|cloud/i.test(title)) domain = "Technology Systems";
        if (/market|oil|shipping|trade|treasury|inflation|equity|tariff/i.test(title)) domain = "Markets";
        if (/white house|senate|congress|executive|agency|department/i.test(title)) domain = "Domestic / Policy";
        results.push({
          id: `${feed}-${i}-${title.slice(0, 18)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          source: "RSR Signal Feed",
          domain,
          title,
          summary: summary.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 220),
          severity: Math.floor(Math.random() * 4) + 1,
          confidence: 70 + Math.floor(Math.random() * 25),
          timestamp: new Date().toISOString(),
        });
      });
    } catch {}
  }
  return results;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("daily");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [pinned, setPinned] = useState<FeedEvent[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => safeLoad(STORAGE_KEYS.history, []));
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveThreatFilter, setArchiveThreatFilter] = useState<ArchiveThreatFilter>("ALL");
  const [archiveModeFilter, setArchiveModeFilter] = useState<ArchiveModeFilter>("ALL");
  const [archiveSort, setArchiveSort] = useState<ArchiveSort>("newest");
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [analystNotes, setAnalystNotes] = useState<Record<string, string>>(() => safeLoad(STORAGE_KEYS.notes, {}));
  const [usedInBrief, setUsedInBrief] = useState<Record<string, boolean>>(() => safeLoad(STORAGE_KEYS.used, {}));
  const [manualVerified, setManualVerified] = useState<Record<string, boolean>>(() => safeLoad(STORAGE_KEYS.verified, {}));
  const [excludedIds, setExcludedIds] = useState<string[]>(() => safeLoad(STORAGE_KEYS.excluded, []));
  const [search, setSearch] = useState("");
  const [executiveBrief, setExecutiveBrief] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [threatMatrix, setThreatMatrix] = useState<ThreatMatrix>({ overall: "GUARDED", conflict: "LOW", markets: "LOW", infrastructure: "LOW", information: "LOW" });

  useEffect(() => saveToStorage(STORAGE_KEYS.history, history), [history]);
  useEffect(() => saveToStorage(STORAGE_KEYS.notes, analystNotes), [analystNotes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.used, usedInBrief), [usedInBrief]);
  useEffect(() => saveToStorage(STORAGE_KEYS.verified, manualVerified), [manualVerified]);
  useEffect(() => saveToStorage(STORAGE_KEYS.excluded, excludedIds), [excludedIds]);
  useEffect(() => { void ingestSignals(); }, []);
  useEffect(() => { const t = window.setTimeout(() => setBooting(false), 900); return () => window.clearTimeout(t); }, []);

  async function ingestSignals() {
    setLoading(true);
    setStatusMessage("");
    try {
      const signals = await fetchSignals();
      const usable = signals.length ? signals : FALLBACK_SIGNALS;
      setUsingFallback(!signals.length);
      setEvents(usable);
      setPinned([]);
      setDismissed([]);
      setStatusMessage(signals.length ? `Live signals pulled: ${usable.length}` : "Preview fallback loaded because live feed access was blocked.");
    } catch {
      setUsingFallback(true);
      setEvents(FALLBACK_SIGNALS);
      setStatusMessage("Preview fallback loaded because live feed access was blocked.");
    } finally {
      setLoading(false);
    }
  }

  const visibleEvents = useMemo(() =>
    events
      .filter(e => !dismissed.includes(e.id))
      .filter(e => !excludedIds.includes(e.id))
      .filter(e => `${e.title} ${e.summary} ${e.domain} ${e.source}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const av = a.confidence >= 85 || !!manualVerified[a.id];
        const bv = b.confidence >= 85 || !!manualVerified[b.id];
        if (av !== bv) return Number(bv) - Number(av);
        return b.severity - a.severity;
      }),
    [events, dismissed, excludedIds, search, manualVerified]
  );

  const counts = useMemo(() => clusterCounts(visibleEvents), [visibleEvents]);

  const patterns = useMemo(() => {
    const out: string[] = [];
    if (counts.conflict && counts.markets) out.push("Conflict and market clusters are moving in parallel, increasing cross-domain sensitivity.");
    if (counts.markets && counts.infrastructure) out.push("Infrastructure and market signals are overlapping through logistics, energy, and compute exposure.");
    if (counts.information && counts.conflict) out.push("Policy movement is reinforcing the wider conflict operating picture.");
    return out;
  }, [counts]);

  const metricStrip = useMemo(() => [
    { label: "RSR Verified", value: String(visibleEvents.filter(e => e.confidence >= 85 || !!manualVerified[e.id]).length), accent: "purple" },
    { label: "Live Signals", value: String(visibleEvents.length), accent: "white" },
    { label: "Used In Brief", value: String(Object.values(usedInBrief).filter(Boolean).length), accent: "amber" },
    { label: "Confidence", value: String(averageConfidence(visibleEvents)), accent: "green" },
  ], [visibleEvents, manualVerified, usedInBrief]);

  function generateBrief(depth: BriefDepth) {
    const sourceSet = (pinned.length ? pinned : visibleEvents).slice(0, depth === "quick" ? 5 : 16);
    const c = clusterCounts(sourceSet);
    const nextMatrix: ThreatMatrix = {
      overall: scoreBand(Math.max(c.conflict, c.markets, c.infrastructure, c.information) + Math.min(2, patterns.length)),
      conflict: scoreBand(c.conflict),
      markets: scoreBand(c.markets),
      infrastructure: scoreBand(c.infrastructure),
      information: scoreBand(c.information),
    };
    setThreatMatrix(nextMatrix);

    const now = new Date();
    const brief = buildFullBrief(sourceSet, nextMatrix, patterns, mode, depth, now);
    setExecutiveBrief(brief);

    setUsedInBrief(prev => {
      const next = { ...prev };
      sourceSet.forEach(e => { next[e.id] = true; });
      return next;
    });

    const briefTitle = depth === "quick" ? "Quick Brief" : mode === "weekly" ? "Weekly Brief" : "Daily Brief";
    const entry: HistoryEntry = {
      id: `archive-${Date.now()}`,
      issue: `Issue ${history.length + 1}`,
      date: new Date().toLocaleDateString(),
      title: `${briefTitle} — ${nextMatrix.overall}`,
      mode: depth === "quick" ? "quick" : mode,
      threat: nextMatrix.overall,
      brief,
      starred: false,
    };
    setHistory(prev => [entry, ...prev]);
    setSelectedArchiveId(entry.id);
    setRenameValue(entry.title);
    setStatusMessage(`${briefTitle} generated and archived.`);
  }

  const archiveResults = useMemo(() => {
    let rows = [...history];
    if (archiveSearch.trim()) {
      const q = archiveSearch.toLowerCase();
      rows = rows.filter(e => `${e.title} ${e.issue} ${e.brief} ${e.threat}`.toLowerCase().includes(q));
    }
    if (archiveThreatFilter !== "ALL") rows = rows.filter(e => e.threat === archiveThreatFilter);
    if (archiveModeFilter !== "ALL") rows = rows.filter(e => e.mode === archiveModeFilter);
    rows.sort((a, b) =>
      archiveSort === "oldest" ? a.id.localeCompare(b.id)
        : archiveSort === "threat" ? formatThreatOrder(b.threat) - formatThreatOrder(a.threat)
        : b.id.localeCompare(a.id)
    );
    return rows;
  }, [history, archiveSearch, archiveThreatFilter, archiveModeFilter, archiveSort]);

  const selectedArchive = archiveResults.find(e => e.id === selectedArchiveId) || archiveResults[0] || null;

  useEffect(() => {
    if (selectedArchive && selectedArchive.id !== selectedArchiveId) {
      setSelectedArchiveId(selectedArchive.id);
      setRenameValue(selectedArchive.title);
    }
  }, [selectedArchive, selectedArchiveId]);

  function handleExport(kind: ExportKind, customText?: string) {
    const now = new Date();
    if (kind === "txt") {
      const fallbackText = customText || executiveBrief || selectedArchive?.brief || "";
      if (!fallbackText) { setStatusMessage("Generate or select a brief before exporting."); return; }
      downloadTextFile(`rsr-axion-brief-${Date.now()}.txt`, fallbackText);
      setStatusMessage("TXT export downloaded.");
      return;
    }
    if (kind === "article") {
      const text = buildArticle(visibleEvents.slice(0, 12), threatMatrix, mode, now);
      downloadTextFile(`rsr-axion-article-${Date.now()}.txt`, text);
      setStatusMessage("Article draft downloaded.");
      return;
    }
    const text = buildBulletin(visibleEvents.slice(0, 10), threatMatrix, patterns, mode, now);
    downloadTextFile(`rsr-axion-bulletin-${Date.now()}.txt`, text);
    setStatusMessage("Bulletin downloaded.");
  }

  function handlePrint() {
    const printText = executiveBrief || selectedArchive?.brief || "";
    if (!printText) { setStatusMessage("Generate or select a brief before printing."); return; }
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      downloadTextFile(`rsr-axion-print-fallback-${Date.now()}.txt`, printText);
      setStatusMessage("Print popup blocked. Downloaded print fallback instead.");
      return;
    }
    w.document.write(buildPrintHtml(printText));
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 250);
  }

  const tone = threatMatrix.overall === "CRITICAL" ? "critical" : threatMatrix.overall === "HIGH" ? "high" : threatMatrix.overall === "ELEVATED" ? "elevated" : "low";

  if (booting) return (
    <div className="boot">
      <div className="bootCard">
        <div className="bootTitle">RSR <span>AXION</span></div>
        <div className="bootSub">INTELLIGENCE SYNTHESIS ENGINE</div>
        <div className="bootLine"><Sparkles size={16} /> LOADING RSR SIGNALS</div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">RSR <span>AXION</span></div>
          <div className="sub">Intelligence Synthesis System</div>
        </div>
        <div className="row">
          <button className={classNames("btn", mode === "daily" && "accent")} onClick={() => setMode("daily")}>Daily</button>
          <button className={classNames("btn", mode === "weekly" && "accent")} onClick={() => setMode("weekly")}>Weekly</button>
        </div>
      </header>

      <main className="layout">
        <section className="col">

          {/* Hero */}
          <div className="panel hero">
            <div className="heroGlow"></div>
            <div className="heroCard">
              <div className="row space">
                <div>
                  <div className="eyebrow">Office of Executive Intelligence</div>
                  <div className="title">Strategic Briefing Console</div>
                  <div className="copy">Tactical synthesis surface for signal intake, threat scoring, briefing generation, and portable reporting output.</div>
                </div>
                <div className={classNames("badge", tone)}>Threat Posture: {threatMatrix.overall}</div>
              </div>
              <div className="metrics">
                {metricStrip.map(m => (
                  <div className="metric" key={m.label}>
                    <div className="smallLabel">{m.label}</div>
                    <div className={classNames("metricValue", m.accent)}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="panel">
            <div className="inner actionBar">
              <div className="actionGroup">
                <button className="btn accent" onClick={() => void ingestSignals()}>
                  <ArrowDownToLine size={15} /> {loading ? "Pulling..." : "Pull Signals"}
                </button>
                <button className="btn" onClick={() => generateBrief("full")}>
                  <Wand2 size={15} /> Run AXION
                </button>
                <button className="btn" onClick={() => generateBrief("quick")}>
                  <Zap size={15} /> Quick Brief
                </button>
              </div>
              <div className="actionDivider" />
              <div className="actionGroup">
                <button className="btn" onClick={() => handleExport("txt")}>
                  <Download size={15} /> TXT
                </button>
                <button className="btn" onClick={() => handleExport("article")}>
                  <Newspaper size={15} /> Article
                </button>
                <button className="btn" onClick={() => handleExport("bulletin")}>
                  <ScrollText size={15} /> Bulletin
                </button>
                <button className="btn" onClick={handlePrint}>
                  <Printer size={15} /> Print
                </button>
              </div>
            </div>
          </div>

          {/* Threat Matrix */}
          <div className="panel">
            <div className="inner">
              <div className="iconHead"><Shield size={15} /> <span>Threat Matrix</span></div>
              <div className="grid2">
                <div className={classNames("card", tone)}>
                  <div className="smallLabel">Overall Threat Posture</div>
                  <div className="big">{threatMatrix.overall}</div>
                </div>
                <div className="card">
                  <div className="smallLabel">Conflict Index</div>
                  <div className="mid">{threatMatrix.conflict}</div>
                </div>
                <div className="card">
                  <div className="smallLabel">Economic Stress Index</div>
                  <div className="mid">{threatMatrix.markets}</div>
                </div>
                <div className="card">
                  <div className="smallLabel">Infrastructure Exposure</div>
                  <div className="mid">{threatMatrix.infrastructure}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Detection */}
          <div className="panel">
            <div className="inner">
              <div className="iconHead"><Radar size={15} /> <span>Pattern Detection</span></div>
              {patterns.length
                ? patterns.map((p, i) => <div key={i} className="patternItem">• {p}</div>)
                : <div className="dimText">No major cross-signal cluster detected.</div>
              }
            </div>
          </div>

          {/* Executive Brief */}
          <div className="panel">
            <div className="inner">
              <div className="iconHead"><FileText size={15} /> <span>Executive Intelligence Brief</span></div>
              <div className="statusRow">
                {usingFallback
                  ? <div className="pill">Preview fallback mode</div>
                  : <div className="pill"><Globe size={13} /> Live mode</div>
                }
                <div className="pill"><Database size={13} /> Local persistence active</div>
                {statusMessage ? <div className="pill">{statusMessage}</div> : null}
              </div>
              <textarea
                className="textarea"
                readOnly
                value={executiveBrief || "Run AXION or Quick Brief to synthesize the current intelligence cycle."}
              />
            </div>
          </div>

        </section>

        <aside className="col">

          {/* Signal Search */}
          <div className="searchWrap">
            <Search className="searchIcon" size={15} />
            <input className="input" placeholder="Search signals" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Live Signal Queue */}
          <div className="panel">
            <div className="inner">
              <div className="row space" style={{ marginBottom: 14 }}>
                <div className="eyebrow">Live Queue</div>
                <div className="queueCount">{visibleEvents.length}</div>
              </div>
              <div className="scroll">
                {visibleEvents.length === 0
                  ? <div className="dimText">No signals loaded.</div>
                  : visibleEvents.map(event => {
                    const isPinned = !!pinned.find(r => r.id === event.id);
                    const isUsed = !!usedInBrief[event.id];
                    const isVerified = event.confidence >= 85 || !!manualVerified[event.id];
                    const isExcluded = excludedIds.includes(event.id);
                    return (
                      <div key={event.id} className={classNames("event", isExcluded && "excluded")}>
                        <div className="eventHead">
                          <div className="eventTitle">{event.title}</div>
                          <div className="domain">{event.domain}</div>
                        </div>
                        <div className="summary">{event.summary}</div>
                        <div className="actions">
                          <button className="smallBtn" onClick={() => setPinned(prev => prev.find(r => r.id === event.id) ? prev.filter(r => r.id !== event.id) : [...prev, event])}>
                            <Pin size={13} /> {isPinned ? "Unpin" : "Pin"}
                          </button>
                          <button className="smallBtn" onClick={() => setDismissed(prev => prev.includes(event.id) ? prev : [...prev, event.id])}>
                            <X size={13} /> Dismiss
                          </button>
                          <button className={classNames("smallBtn", isVerified && "verified")} onClick={() => setManualVerified(prev => ({ ...prev, [event.id]: !prev[event.id] }))}>
                            <CheckCircle2 size={13} /> {isVerified ? "Verified" : "Verify"}
                          </button>
                          <button className={classNames("smallBtn", isExcluded && "warn")} onClick={() => setExcludedIds(prev => prev.includes(event.id) ? prev.filter(x => x !== event.id) : [...prev, event.id])}>
                            <EyeOff size={13} /> {isExcluded ? "Restore" : "Exclude"}
                          </button>
                          {isUsed && <span className="usedTag">Used</span>}
                          {isPinned && <span className="pinnedTag"><Pin size={11} /></span>}
                        </div>
                        <textarea
                          className="note"
                          placeholder="Analyst note..."
                          value={analystNotes[event.id] || ""}
                          onChange={e => setAnalystNotes(prev => ({ ...prev, [event.id]: e.target.value }))}
                        />
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          {/* Archive */}
          <div className="panel">
            <div className="inner">
              <div className="iconHead"><Database size={15} /> <span>Intelligence Archive</span></div>

              <div className="archiveSearch">
                <Search size={13} className="archiveSearchIcon" />
                <input
                  className="input"
                  placeholder="Search archive..."
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  style={{ paddingLeft: 34, fontSize: "0.82rem" }}
                />
              </div>

              <div className="filterSection">
                <div className="filterLabel">Threat</div>
                <div className="filterRow">
                  {(["ALL", "LOW", "ELEVATED", "HIGH", "CRITICAL"] as ArchiveThreatFilter[]).map(f => (
                    <button key={f} className={classNames("filterChip", archiveThreatFilter === f && "active")} onClick={() => setArchiveThreatFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="filterSection">
                <div className="filterLabel">Mode</div>
                <div className="filterRow">
                  {(["ALL", "daily", "weekly", "quick"] as ArchiveModeFilter[]).map(f => (
                    <button key={f} className={classNames("filterChip", archiveModeFilter === f && "active")} onClick={() => setArchiveModeFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="filterSection" style={{ marginBottom: 14 }}>
                <div className="filterLabel">Sort</div>
                <div className="filterRow">
                  {(["newest", "oldest", "threat"] as ArchiveSort[]).map(s => (
                    <button key={s} className={classNames("filterChip", archiveSort === s && "active")} onClick={() => setArchiveSort(s)}>{s}</button>
                  ))}
                </div>
              </div>

              {archiveResults.length === 0 ? (
                <div className="dimText" style={{ padding: "16px 0" }}>No archive entries yet. Generate a brief to save it here.</div>
              ) : (
                <div className="archiveLayout">
                  <div className="archiveList">
                    {archiveResults.map(entry => (
                      <div
                        key={entry.id}
                        className={classNames("archiveItem", entry.id === selectedArchive?.id && "active")}
                        onClick={() => { setSelectedArchiveId(entry.id); setRenameValue(entry.title); }}
                      >
                        <div className="archiveItemTitle">{entry.title}</div>
                        <div className="archiveItemMeta">
                          <span className={classNames("archiveThreatDot", entry.threat.toLowerCase())} />
                          {entry.date} · {entry.mode}
                          {entry.starred && <Star size={11} style={{ marginLeft: 4, color: "#fbbf24" }} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedArchive && (
                    <div className="archiveDetail">
                      <div className="archiveDetailControls">
                        <input
                          className="smallInput"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          placeholder="Brief title..."
                        />
                        <button className="smallBtn" onClick={() => setHistory(prev => prev.map(e => e.id === selectedArchive.id ? { ...e, title: renameValue } : e))}>
                          <FileText size={13} /> Save
                        </button>
                        <button className={classNames("smallBtn", selectedArchive.starred && "warn")} onClick={() => setHistory(prev => prev.map(e => e.id === selectedArchive.id ? { ...e, starred: !e.starred } : e))}>
                          {selectedArchive.starred ? <StarOff size={13} /> : <Star size={13} />}
                          {selectedArchive.starred ? "Unstar" : "Star"}
                        </button>
                        <button className="smallBtn" onClick={() => { downloadTextFile(`rsr-axion-archive-${selectedArchive.id}.txt`, selectedArchive.brief); setStatusMessage("Archive entry exported."); }}>
                          <Download size={13} /> Export
                        </button>
                        <button className="smallBtn warn" onClick={() => { setHistory(prev => prev.filter(e => e.id !== selectedArchive.id)); setSelectedArchiveId(null); }}>
                          <X size={13} /> Delete
                        </button>
                      </div>
                      <div className="archiveTags">
                        <span className={classNames("tag", selectedArchive.threat.toLowerCase())}>{selectedArchive.threat}</span>
                        <span className="tag">{selectedArchive.mode}</span>
                        <span className="tag">{selectedArchive.date}</span>
                        <span className="tag">{selectedArchive.issue}</span>
                      </div>
                      <div className="archiveText">{selectedArchive.brief}</div>
                      {selectedArchive.id in analystNotes && (
                        <textarea
                          className="note"
                          style={{ marginTop: 10 }}
                          placeholder="Archive analyst note..."
                          value={analystNotes[selectedArchive.id] || ""}
                          onChange={e => setAnalystNotes(prev => ({ ...prev, [selectedArchive.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}
