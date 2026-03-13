import type { FeedEvent, ThreatMatrix } from "./types";

function getBrowserDateTimeParts(now: Date) {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tz = localTz || "America/Los_Angeles";
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const pick = (type: string) => parts.find(p => p.type === type)?.value || "";
  const date = `${pick("month")} ${pick("day")}, ${pick("year")}`;
  const time = `${pick("hour")}:${pick("minute")}`;
  return { date, time };
}

function getLocation(): string {
  return "Los Angeles, California";
}

export function buildRealtimeHeader(
  intelligenceCycleLine: string = "INTELLIGENCE CYCLE: DAILY",
  now: Date = new Date()
): string {
  const { date, time } = getBrowserDateTimeParts(now);
  return [
    "FROM THE OFFICE OF EXECUTIVE INTELLIGENCE",
    "RSR AXION – INTELLIGENCE SYNTHESIS SYSTEM",
    `Location: ${getLocation()}`,
    `Date: ${date}`,
    `Time: ${time}`,
    intelligenceCycleLine,
    "",
  ].join("\n");
}

export function withRealtimeHeader(
  body: string,
  intelligenceCycleLine: string = "INTELLIGENCE CYCLE: DAILY",
  now: Date = new Date()
): string {
  const trimmed = (body || "").replace(/^\s+/, "");
  const header = buildRealtimeHeader(intelligenceCycleLine, now);
  if (trimmed.startsWith("FROM THE OFFICE OF EXECUTIVE INTELLIGENCE")) return body;
  return `${header}${trimmed}`;
}

export function scoreBand(value: number): string {
  if (value >= 8) return "CRITICAL";
  if (value >= 6) return "HIGH";
  if (value >= 3) return "ELEVATED";
  return "LOW";
}

export function averageConfidence(events: FeedEvent[]): number {
  if (!events.length) return 0;
  return Math.round(events.reduce((s, e) => s + e.confidence, 0) / events.length);
}

export function formatThreatOrder(threat: string): number {
  const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, ELEVATED: 2, LOW: 1 };
  return rank[threat] || 0;
}

export function clusterCounts(events: FeedEvent[]) {
  return {
    conflict: events.filter(e =>
      /missile|drone|military|war|strike|defense|navy|air force|ukraine|iran|israel|gaza/i.test(`${e.title} ${e.summary}`)
    ).length,
    markets: events.filter(e =>
      /oil|shipping|logistics|tariff|dollar|treasury|inflation|equity|market|energy|trade/i.test(`${e.title} ${e.summary}`)
    ).length,
    infrastructure: events.filter(e =>
      /cyber|infrastructure|compute|ai|semiconductor|data|cloud|network|grid/i.test(`${e.title} ${e.summary}`)
    ).length,
    information: events.filter(e =>
      /policy|executive|congress|agency|sanction|diplomacy|summit|foreign ministry|white house|senate/i.test(`${e.title} ${e.summary}`)
    ).length,
  };
}

export function buildEscalationModel(matrix: ThreatMatrix, confidence: number, signalCount: number = 10): string {
  const severe = [matrix.conflict, matrix.markets, matrix.infrastructure, matrix.information].filter(
    x => x === "HIGH" || x === "CRITICAL"
  ).length;

  const lowCoverage = signalCount < 6;
  const lowConf = confidence < 76;
  const caveat = lowCoverage
    ? ` Note: Assessment is based on a limited signal set (${signalCount} items). Confidence in posture accuracy is reduced; additional signal ingestion is recommended before escalation decisions.`
    : lowConf
    ? ` Note: Average signal confidence is below threshold (${confidence}/100). Posture assessment should be treated as indicative, not conclusive.`
    : "";

  if (matrix.overall === "CRITICAL" || severe >= 3)
    return `Active cross-domain stress is indicated across multiple clusters. The operating environment presents compounding risk vectors. Confidence: ${confidence}/100. Recommend heightened monitoring and executive-level escalation protocols.${caveat}`;
  if (matrix.overall === "HIGH" || severe >= 2)
    return `Elevated pressure is visible across two or more active clusters. Secondary effects are plausible within the current cycle. Confidence: ${confidence}/100. Recommend sustained watch posture.${caveat}`;
  if (matrix.overall === "ELEVATED")
    return `Developing pressure is registered in at least one primary domain. The cycle remains fluid. Confidence: ${confidence}/100. Standard watch protocols apply with elevated reporting cadence.${caveat}`;
  return `Guarded posture holds. No immediate cross-domain escalation is indicated at this time. Confidence: ${confidence}/100. Routine monitoring applies.${caveat}`;
}

export function buildSitrepBlock(
  events: FeedEvent[],
  counts: { conflict: number; markets: number; infrastructure: number; information: number },
  matrix: ThreatMatrix
): string {
  const avg = averageConfidence(events);
  const conflictItems = events
    .filter(e => /missile|drone|military|war|strike|defense|navy|air force|ukraine|iran|israel|gaza/i.test(`${e.title} ${e.summary}`))
    .slice(0, 3)
    .map(e => `  – ${e.title}`)
    .join("\n") || "  – No active conflict items flagged this cycle.";

  const marketItems = events
    .filter(e => /oil|shipping|logistics|tariff|dollar|treasury|inflation|equity|market|energy|trade/i.test(`${e.title} ${e.summary}`))
    .slice(0, 3)
    .map(e => `  – ${e.title}`)
    .join("\n") || "  – No significant market items flagged this cycle.";

  const infraItems = events
    .filter(e => /cyber|infrastructure|compute|ai|semiconductor|data|cloud|network|grid/i.test(`${e.title} ${e.summary}`))
    .slice(0, 3)
    .map(e => `  – ${e.title}`)
    .join("\n") || "  – No infrastructure items flagged this cycle.";

  const policyItems = events
    .filter(e => /policy|executive|congress|agency|sanction|diplomacy|summit|foreign ministry|white house|senate/i.test(`${e.title} ${e.summary}`))
    .slice(0, 3)
    .map(e => `  – ${e.title}`)
    .join("\n") || "  – No policy items flagged this cycle.";

  return [
    `CONFLICT SITREP [${matrix.conflict}] — ${counts.conflict} items ingested`,
    conflictItems,
    "",
    `MARKET SITREP [${matrix.markets}] — ${counts.markets} items ingested`,
    marketItems,
    "",
    `INFRASTRUCTURE SITREP [${matrix.infrastructure}] — ${counts.infrastructure} items ingested`,
    infraItems,
    "",
    `POLICY/INFORMATION SITREP [${matrix.information}] — ${counts.information} items ingested`,
    policyItems,
    "",
    `OVERALL SITREP`,
    `Threat posture is assessed at ${matrix.overall}. Average cycle confidence is ${avg}/100.`,
    `Total signals processed: ${events.length}. Cross-domain correlation is ${counts.conflict && counts.markets ? "active" : counts.conflict || counts.markets ? "partial" : "not detected"} this cycle.`,
  ].join("\n");
}

export function buildArticle(
  events: FeedEvent[],
  matrix: ThreatMatrix,
  mode: string,
  now: Date = new Date()
): string {
  const { date } = getBrowserDateTimeParts(now);
  const lead = events[0];
  const headline = lead?.title || "Intelligence Cycle Report";
  const secondaryHeadlines = events.slice(1, 4).map(e => e.title).join("; ");
  const domains = [...new Set(events.slice(0, 8).map(e => e.domain))].join(", ");
  const conf = averageConfidence(events);
  const cycleLabel = mode === "weekly" ? "Weekly Intelligence Cycle" : "Daily Intelligence Cycle";

  const header = buildRealtimeHeader(`INTELLIGENCE CYCLE: ${mode.toUpperCase()}`, now);

  return [
    header,
    `RSR AXION – ${cycleLabel.toUpperCase()} ARTICLE OUTPUT`,
    ``,
    `HEADLINE`,
    headline,
    ``,
    `SUBHEAD`,
    secondaryHeadlines
      ? `Cross-domain signals continue across ${domains} with overall threat posture assessed at ${matrix.overall}.`
      : `The current intelligence cycle reflects conditions across ${domains} with threat posture at ${matrix.overall}.`,
    ``,
    `OPENING PARAGRAPH`,
    `The ${cycleLabel.toLowerCase()} for ${date} reflects a threat environment assessed at ${matrix.overall}. Signal intake across ${events.length} items spanning ${domains} reveals a cycle characterized by ${matrix.conflict === "HIGH" || matrix.conflict === "CRITICAL" ? "active conflict pressure" : matrix.markets === "HIGH" || matrix.markets === "CRITICAL" ? "significant market stress" : "measured geopolitical activity"}. Cycle confidence stands at ${conf}/100 across all active signal sources.`,
    ``,
    `BACKGROUND CONTEXT`,
    `RSR AXION synthesizes open-source intelligence signals from verified news and institutional sources across global affairs, security, economic, infrastructure, and policy domains. The system applies threat scoring, cross-cluster correlation, and confidence weighting to produce executive-ready intelligence assessments. Each cycle reflects the most recent available signals at the time of synthesis.`,
    ``,
    `CURRENT DEVELOPMENTS`,
    events.slice(0, 6).map((e, i) => `${i + 1}. [${e.domain}] ${e.title}${e.summary ? `\n   ${e.summary.slice(0, 160)}` : ""}`).join("\n\n"),
    ``,
    `STRATEGIC ANALYSIS`,
    `The current signal environment reflects ${matrix.overall === "CRITICAL" ? "a convergence of high-severity threats requiring immediate attention from senior leadership" : matrix.overall === "HIGH" ? "compounding pressure across multiple domains that warrants elevated monitoring and response readiness" : matrix.overall === "ELEVATED" ? "developing pressure in at least one primary domain with potential for rapid escalation if left unmonitored" : "a guarded environment with no immediate escalation indicated, though persistent monitoring remains essential"}.`,
    `Conflict pressure is rated ${matrix.conflict}. Economic stress is rated ${matrix.markets}. Infrastructure exposure is rated ${matrix.infrastructure}. Policy and information pressure is rated ${matrix.information}.`,
    ``,
    `SYSTEM-LEVEL IMPLICATIONS`,
    `At the system level, the current cycle suggests ${matrix.conflict !== "LOW" && matrix.markets !== "LOW" ? "active coupling between security and economic domains, increasing cross-domain volatility and reducing predictive certainty" : matrix.infrastructure !== "LOW" ? "infrastructure and technical vulnerabilities may amplify the effects of political or economic shocks" : matrix.information !== "LOW" ? "institutional and policy movement is reshaping the operating environment in ways that may have downstream economic and security effects" : "no dominant coupling is detected; domain interactions remain manageable under current conditions"}.`,
    ``,
    `FORWARD OUTLOOK`,
    `AXION assesses the short-term operating picture as ${matrix.overall}. Watch indicators for the next cycle include: escalation in ${[matrix.conflict !== "LOW" && "security/conflict domain", matrix.markets !== "LOW" && "energy and trade corridors", matrix.infrastructure !== "LOW" && "infrastructure and cyber exposure", matrix.information !== "LOW" && "policy and institutional signaling"].filter(Boolean).join("; ") || "no specific domains flagged at this time"}.`,
    `Cycle Confidence: ${conf}/100.`,
    ``,
    `END OF ARTICLE OUTPUT`,
  ].join("\n");
}

export function buildBulletin(
  events: FeedEvent[],
  matrix: ThreatMatrix,
  patterns: string[],
  mode: string,
  now: Date = new Date()
): string {
  const conf = averageConfidence(events);
  const header = buildRealtimeHeader(`INTELLIGENCE CYCLE: ${mode.toUpperCase()}`, now);

  const watchIndicators = [
    matrix.conflict !== "LOW" && "Continued movement in conflict and security domains",
    matrix.markets !== "LOW" && "Energy, shipping, and market corridor volatility",
    matrix.infrastructure !== "LOW" && "Infrastructure and cyber exposure events",
    matrix.information !== "LOW" && "Policy, diplomatic, and institutional signaling",
  ].filter(Boolean) as string[];

  return [
    header,
    `RSR AXION – INTELLIGENCE BULLETIN`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `THREAT POSTURE`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Overall:         ${matrix.overall}`,
    `Conflict:        ${matrix.conflict}`,
    `Markets:         ${matrix.markets}`,
    `Infrastructure:  ${matrix.infrastructure}`,
    `Policy/Info:     ${matrix.information}`,
    `Confidence:      ${conf}/100`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `KEY DEVELOPMENTS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    events.slice(0, 7).map(e => `• [${e.domain}] ${e.title}`).join("\n") || "• No primary signals available.",
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `STRATEGIC IMPLICATION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    patterns.length
      ? patterns.map(p => `• ${p}`).join("\n")
      : `• No dominant cross-domain coupling detected in this cycle. Standard monitoring protocols apply.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `WATCH INDICATORS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    watchIndicators.length
      ? watchIndicators.map(w => `• ${w}`).join("\n")
      : `• No elevated watch indicators at this time. Routine monitoring applies.`,
    ``,
    `END OF BULLETIN`,
  ].join("\n");
}

export function buildFullBrief(
  sourceSet: FeedEvent[],
  matrix: ThreatMatrix,
  patterns: string[],
  mode: string,
  depth: "full" | "quick",
  now: Date = new Date()
): string {
  const { date, time } = getBrowserDateTimeParts(now);
  const location = getLocation();
  const cycleLabel = depth === "quick" ? "QUICK" : mode === "weekly" ? "WEEKLY" : "DAILY";
  const briefTitle = depth === "quick" ? "Quick Brief" : mode === "weekly" ? "Weekly Brief" : "Daily Brief";
  const conf = averageConfidence(sourceSet);
  const headline = sourceSet.map(e => `• ${e.title}`).join("\n") || "• No primary signals identified.";
  const escalation = buildEscalationModel(matrix, conf, sourceSet.length);

  const header = [
    "FROM THE OFFICE OF EXECUTIVE INTELLIGENCE",
    "RSR AXION – INTELLIGENCE SYNTHESIS SYSTEM",
    `Location: ${location}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `INTELLIGENCE CYCLE: ${cycleLabel}`,
    "",
  ].join("\n");

  if (depth === "quick") {
    return [
      header,
      `RSR AXION – ${briefTitle.toUpperCase()}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `THREAT POSTURE SUMMARY`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Overall Threat Posture: ${matrix.overall}`,
      `Cycle Confidence:       ${conf}/100`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `PRIMARY SIGNAL HEADLINES`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      headline,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `BOTTOM LINE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `AXION assesses the immediate operating picture as ${matrix.overall}. ${escalation}`,
      ``,
      `END OF QUICK BRIEF`,
    ].join("\n");
  }

  const sitrep = buildSitrepBlock(sourceSet, clusterCounts(sourceSet), matrix);

  const strategicImplications = [
    matrix.conflict !== "LOW" && matrix.markets !== "LOW"
      ? "Conflict and market signals are co-moving, suggesting that geopolitical escalation is transmitting into economic systems. Decision-makers should anticipate dual-domain volatility in the near term."
      : null,
    matrix.markets !== "LOW" && matrix.infrastructure !== "LOW"
      ? "Infrastructure and market stress are overlapping through logistics, energy, and compute exposure. Disruption in one domain is likely to amplify in the other."
      : null,
    matrix.information !== "LOW" && matrix.conflict !== "LOW"
      ? "Policy and institutional movement is reinforcing the wider security operating picture. Diplomatic signaling may precede or follow kinetic escalation."
      : null,
    matrix.infrastructure !== "LOW"
      ? "Technology and infrastructure vulnerabilities represent a silent pressure vector. Cyber exposure and supply chain fragility remain elevated risk multipliers."
      : null,
  ]
    .filter(Boolean)
    .join("\n\n") ||
    "The operating environment holds at guarded. No dominant cross-domain coupling is detected at this time. Standard monitoring protocols are sufficient.";

  const watchIndicators = [
    matrix.conflict !== "LOW" && "Monitor security and conflict signals for escalation velocity and geographic spread",
    matrix.markets !== "LOW" && "Track energy, shipping, and trade corridor developments for market contagion risk",
    matrix.infrastructure !== "LOW" && "Maintain elevated watch on cyber, infrastructure, and technology disruption events",
    matrix.information !== "LOW" && "Follow policy, diplomatic, and institutional signaling for strategic intent signals",
    "Continue signal ingestion across all four primary domains on standard cycle cadence",
  ]
    .filter(Boolean)
    .map(w => `• ${w}`)
    .join("\n");

  return [
    header,
    `RSR AXION – ${briefTitle.toUpperCase()}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `THREAT POSTURE SUMMARY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Overall Threat Posture:          ${matrix.overall}`,
    `Conflict Index:                  ${matrix.conflict}`,
    `Economic Stress Index:           ${matrix.markets}`,
    `Infrastructure Exposure Index:   ${matrix.infrastructure}`,
    `Information / Policy Index:      ${matrix.information}`,
    `Cycle Confidence:                ${conf}/100`,
    `Signals Processed:               ${sourceSet.length}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `PRIMARY SIGNAL HEADLINES`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    headline,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `PATTERN DETECTION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    patterns.length
      ? patterns.map(p => `• ${p}`).join("\n")
      : "• No major cross-signal cluster detected during this cycle.",
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `AUTOMATIC SITREP`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    sitrep,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `STRATEGIC IMPLICATIONS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    strategicImplications,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `FORWARD WATCH INDICATORS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    watchIndicators,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `THREAT ESCALATION MODEL`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    escalation,
    ``,
    `END OF ${briefTitle.toUpperCase()}`,
  ].join("\n");
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildPrintHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html><head><title>RSR AXION Brief</title><style>body{font-family:'Courier New',Courier,monospace;padding:40px;background:#fff;color:#111}pre{white-space:pre-wrap;line-height:1.7;font-size:13px}h1{font-family:Arial,sans-serif;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:8px}</style></head><body><h1>RSR AXION — INTELLIGENCE BRIEF</h1><pre>${escaped}</pre></body></html>`;
}

export function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
