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

/* ── Internal Helpers ───────────────────────────────────────────────────── */

function buildExecutiveSummary(
  events: FeedEvent[],
  matrix: ThreatMatrix,
  counts: ReturnType<typeof clusterCounts>,
  conf: number
): string {
  const activeDomains = [
    counts.conflict > 2 && "security and conflict",
    counts.markets > 2 && "markets and energy",
    counts.infrastructure > 1 && "technology and infrastructure",
    counts.information > 2 && "policy and institutional",
  ].filter(Boolean) as string[];

  const postureContext: Record<string, string> = {
    CRITICAL: `The operating environment has deteriorated to a CRITICAL posture. Multiple high-severity signals across intersecting domains indicate compounding systemic risk that warrants immediate executive attention. The convergence of these signals is not coincidental — it reflects a structural shift in the operating environment that demands active management rather than routine monitoring.`,
    HIGH: `The operating environment is assessed at HIGH. Elevated pressure is present across two or more primary domains, generating secondary effects that increase cross-system volatility and reduce the predictability of near-term developments. Decision-makers should adopt an elevated readiness posture and prepare for potential rapid escalation.`,
    ELEVATED: `The operating environment is assessed as ELEVATED. Developing pressure in ${activeDomains[0] || "one or more primary domains"} is reshaping the intelligence picture. The cycle is fluid — conditions are moving, not static — and the direction of travel warrants active monitoring at a heightened cadence.`,
    GUARDED: `The operating environment holds at a GUARDED posture. No acute escalation pathway is indicated, though the cycle carries the persistent background tension characteristic of a globally interconnected signal environment. This is a maintenance cycle that rewards discipline and continuity over reactive posturing.`,
  };

  const summary = postureContext[matrix.overall] || postureContext.GUARDED;

  const couplingNote = activeDomains.length >= 2
    ? ` Cross-domain coupling is active between ${activeDomains.slice(0, 2).join(" and ")} — a condition that historically accelerates systemic stress and reduces the lead time available for measured response.`
    : activeDomains.length === 1
    ? ` Primary signal pressure is concentrated in ${activeDomains[0]}, with no significant cross-domain coupling detected at this time.`
    : ``;

  return `${summary}${couplingNote} This cycle processed ${events.length} signals at an average confidence of ${conf}/100. The analysis below reflects the most analytically significant developments and their assessed implications for the operating environment.`;
}

function signalWhyItMatters(domain: string): string {
  if (/Security|Defense/.test(domain))
    return `Security and defense signals carry direct implications for strategic stability, resource allocation, and partner nation posturing. Movement in this domain frequently precedes broader geopolitical shifts and can rapidly alter the conditions under which economic actors operate.`;
  if (/Markets/.test(domain))
    return `Market and energy signals affect commodity pricing, supply chain resilience, capital flow dynamics, and trade corridor stability. Volatility in this domain produces downstream effects across logistics, finance, and operational cost structures.`;
  if (/Technology|Infrastructure/.test(domain))
    return `Technology and infrastructure signals represent exposure in the systems that underpin economic activity, communications, and defense capability. Disruptions in this domain tend to amplify across all other clusters, often with nonlinear consequence profiles.`;
  if (/Policy|Domestic/.test(domain))
    return `Policy and institutional signals shape the regulatory and diplomatic operating environment. Shifts at the institutional level can rapidly alter the legal, financial, and strategic conditions under which private and public sector actors operate.`;
  return `This signal represents movement in the global operating environment with potential secondary effects across connected domains. Monitor for trajectory change and cross-domain transmission.`;
}

function signalSystemImpact(overall: string): string {
  if (overall === "CRITICAL")
    return `At CRITICAL posture, this development reinforces a pattern of compounding risk. Continued deterioration in this domain would accelerate the systemic stress assessment and may require executive-level escalation response.`;
  if (overall === "HIGH")
    return `At HIGH posture, this signal contributes to multi-domain pressure. Secondary transmission into adjacent systems is assessed as plausible within the current cycle window.`;
  if (overall === "ELEVATED")
    return `This signal is a contributing factor to the ELEVATED cycle assessment. Its isolation or escalation will be a key variable in the next posture determination.`;
  return `At GUARDED posture, this signal represents normal-range intelligence activity. Monitor for directional change and any indications of cross-domain transmission.`;
}

function signalOutlook(domain: string, matrix: ThreatMatrix): string {
  if (/Security|Defense/.test(domain))
    return matrix.conflict !== "LOW"
      ? `Track escalation velocity, geographic spread, and partner nation responses. Watch for kinetic follow-on activity, diplomatic signaling, or shifts in force posture.`
      : `No immediate escalation pathway is evident from this signal. Maintain routine monitoring of conflict-adjacent indicators and partner posturing.`;
  if (/Markets/.test(domain))
    return matrix.markets !== "LOW"
      ? `Monitor for contagion effects in energy pricing, trade finance conditions, and logistics networks. Secondary market response is the key indicator to track.`
      : `Market indicators are within baseline range. Track for asymmetric shock potential and any sudden shifts in commodity or credit conditions.`;
  if (/Technology|Infrastructure/.test(domain))
    return matrix.infrastructure !== "LOW"
      ? `Follow attribution developments, patch cycle responses, and critical system advisories from national and sector authorities. Lateral spread is the primary risk vector.`
      : `No acute infrastructure threat is active. Continue standard vulnerability monitoring and advisory tracking on routine cadence.`;
  if (/Policy|Domestic/.test(domain))
    return matrix.information !== "LOW"
      ? `Track for near-term regulatory, legislative, or executive action that confirms or reverses the current institutional signaling trajectory.`
      : `Policy environment is within baseline parameters. Monitor for directional shifts in institutional stance that could precede operational environment changes.`;
  return `Monitor for trajectory change and cross-domain transmission effects in the next intelligence cycle.`;
}

export function buildEscalationModel(matrix: ThreatMatrix, confidence: number, signalCount: number = 10): string {
  const severe = [matrix.conflict, matrix.markets, matrix.infrastructure, matrix.information].filter(
    x => x === "HIGH" || x === "CRITICAL"
  ).length;

  const caveat = signalCount < 6
    ? ` Assessment note: Signal set is limited (${signalCount} items). Confidence in posture accuracy is reduced; additional ingestion is recommended before escalation decisions.`
    : confidence < 76
    ? ` Assessment note: Average cycle confidence is below threshold (${confidence}/100). Posture should be treated as directional rather than definitive.`
    : "";

  if (matrix.overall === "CRITICAL" || severe >= 3)
    return `Active cross-domain stress is confirmed across multiple clusters. The operating environment presents compounding risk vectors with high probability of systemic coupling effects. Confidence: ${confidence}/100. Recommend immediate executive notification and heightened monitoring protocols.${caveat}`;
  if (matrix.overall === "HIGH" || severe >= 2)
    return `Elevated pressure is active across two or more domains. Secondary transmission effects are plausible within the current cycle window. Confidence: ${confidence}/100. Recommend sustained elevated watch posture and contingency review.${caveat}`;
  if (matrix.overall === "ELEVATED")
    return `Developing pressure is registered in at least one primary domain. The cycle remains fluid and the direction of travel warrants accelerated monitoring cadence. Confidence: ${confidence}/100. Standard watch protocols apply with elevated reporting frequency.${caveat}`;
  return `Guarded posture holds. No immediate cross-domain escalation pathway is indicated at this time. Confidence: ${confidence}/100. Routine monitoring protocols are sufficient. Remain alert for directional change.${caveat}`;
}

/* ── Article ────────────────────────────────────────────────────────────── */

export function buildArticle(
  events: FeedEvent[],
  matrix: ThreatMatrix,
  mode: string,
  now: Date = new Date()
): string {
  const { date } = getBrowserDateTimeParts(now);
  const lead = events[0];
  const headline = lead?.title || "Intelligence Cycle Report";
  const conf = averageConfidence(events);
  const counts = clusterCounts(events);
  const cycleLabel = mode === "weekly" ? "Weekly Intelligence Cycle" : "Daily Intelligence Cycle";
  const domains = [...new Set(events.slice(0, 10).map(e => e.domain))].join(", ");
  const header = buildRealtimeHeader(`INTELLIGENCE CYCLE: ${mode.toUpperCase()}`, now);

  const activeDomains = [
    counts.conflict > 2 && "security",
    counts.markets > 2 && "market",
    counts.infrastructure > 1 && "infrastructure",
    counts.information > 2 && "policy",
  ].filter(Boolean) as string[];

  const subhead = activeDomains.length >= 2
    ? `${activeDomains.slice(0, 2).map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(" and ")} pressures intersect as the ${cycleLabel.toLowerCase()} reflects a ${matrix.overall.toLowerCase()} operating posture across ${events.length} processed signals.`
    : `AXION assesses the ${date} intelligence cycle at ${matrix.overall} with primary signal activity across ${domains}.`;

  const openingCharacter = matrix.conflict !== "LOW"
    ? "kinetic and defense-related"
    : matrix.markets !== "LOW"
    ? "economic and energy"
    : matrix.infrastructure !== "LOW"
    ? "infrastructure and technology"
    : "broadly distributed";

  const openingCoupling = counts.conflict > 2 && counts.markets > 2
    ? `The co-movement of security and market signals is the analytically notable feature of this cycle — a configuration that historically reduces predictive certainty and increases the probability of correlated risk materializing across domains simultaneously.`
    : counts.conflict > 2
    ? `Security and defense signals dominate the cycle. The information environment reflects active tension in at least one conflict-adjacent theater, with potential for economic and logistics transmission.`
    : counts.markets > 2
    ? `Economic and energy signals are the leading driver of the current cycle. Market dynamics and resource allocation pressures are shaping the posture assessment more than any kinetic development.`
    : `Signals are broadly distributed across domains without a single dominant cluster. This breadth-over-focus pattern is characteristic of a transitional or accumulation phase.`;

  const opening = `The RSR AXION ${cycleLabel.toLowerCase()} for ${date} reflects an operating environment assessed at ${matrix.overall}. Across ${events.length} processed signals at a cycle confidence of ${conf}/100, the dominant signal character is ${openingCharacter} in nature. ${openingCoupling}`;

  const background = `RSR AXION synthesizes open-source intelligence signals in real time from verified public sources spanning defense, economics, technology, international affairs, and policy. The system applies domain classification, severity scoring, confidence weighting, and cross-cluster correlation to produce structured assessments calibrated for executive decision-support. The intelligence posture model operates across four primary domains — Conflict/Security, Markets/Energy, Infrastructure/Technology, and Policy/Information — and derives an overall threat posture from their interaction and coupling patterns. This output reflects the state of the intelligence environment at the time of synthesis and is intended to inform, not replace, expert judgment.`;

  const developments = events.slice(0, 6).map((e, i) => {
    const ctx = e.summary ? e.summary.slice(0, 200) : "No additional context available from source.";
    return `${i + 1}. [${e.domain}] — Confidence: ${e.confidence}/100\n   Signal: ${e.title}\n   Context: ${ctx}`;
  }).join("\n\n") || "No primary developments identified in this cycle.";

  const strategicCharacter = matrix.overall === "CRITICAL"
    ? `At CRITICAL posture, the cycle is an active management environment — not a routine monitoring window. The convergence of high-severity signals across multiple domains indicates structural stress in the operating environment. Decision-makers cannot treat these signals as independent events; the coupling itself is a risk factor.`
    : matrix.overall === "HIGH"
    ? `At HIGH posture, cross-domain pressure is generating measurable secondary effects. The coupling of elevated clusters means that a disruption originating in one domain will transmit into adjacent systems with reduced friction compared to baseline conditions. The operating picture requires active scenario planning, not passive observation.`
    : matrix.overall === "ELEVATED"
    ? `At ELEVATED posture, the cycle is actively developing. The current period presents a window in which disciplined monitoring, anticipatory positioning, and stakeholder communication can meaningfully reduce exposure to consequential surprise. The direction of travel is more important than the current position.`
    : `The GUARDED posture reflects an environment in which normal background tension is present without acute escalation. The appropriate response is disciplined monitoring continuity. Complacency during guarded periods is the primary analytical risk — conditions can shift rapidly and without strong leading indicators.`;

  const strategicAnalysis = `The ${date} cycle is characterized by a ${matrix.overall.toLowerCase()} posture with ${activeDomains.length >= 2 ? `demonstrable coupling between the ${activeDomains.join(" and ")} domains` : activeDomains.length === 1 ? `primary pressure concentration in the ${activeDomains[0]} domain` : `signals distributed across domains without dominant coupling`}. ${strategicCharacter} Conflict pressure is rated ${matrix.conflict}. Economic stress is rated ${matrix.markets}. Infrastructure exposure is rated ${matrix.infrastructure}. Policy and information pressure is rated ${matrix.information}.`;

  const systemImplications = matrix.conflict !== "LOW" && matrix.markets !== "LOW"
    ? `The intersection of security and economic pressure in this cycle represents the highest-consequence configuration in the AXION model. Conflict-driven market shocks, supply chain fragility under geopolitical stress, and energy corridor vulnerability are all active risk pathways. The coupling is not simply additive — it introduces a volatility multiplier that reduces the effectiveness of single-domain response strategies. Organizations with dual exposure to security environments and commodity markets should treat this cycle as a period of heightened contingency planning, not routine operations.`
    : matrix.infrastructure !== "LOW"
    ? `Infrastructure and technology vulnerabilities carry a disproportionate consequence profile in the current cycle. While individual signals may appear bounded in scope, the systemic nature of digital and physical infrastructure means cascading failures are possible from limited initial events. The current cycle's infrastructure signal density is sufficient to warrant proactive hardening assessments and resilience review in technology-dependent operating environments.`
    : matrix.information !== "LOW"
    ? `The density of policy and institutional signals in this cycle indicates that the regulatory and diplomatic operating environment is actively being reshaped. Organizations operating in policy-sensitive sectors — energy, finance, defense, technology — should monitor for near-term executive or legislative action that could materially alter their operating conditions. Institutional signaling of this type frequently precedes formal regulatory or diplomatic action within one to three cycles.`
    : `The current cycle operates within normal parameters. No systemic amplification pathway is indicated. Standard operating procedures and monitoring protocols are appropriate for this posture level. The primary risk at GUARDED is analytical drift — the gradual erosion of signal discipline that occurs during quiet periods.`;

  const watchItems = [
    matrix.conflict !== "LOW" && "conflict-domain escalation velocity, geographic spread, and partner nation responses",
    matrix.markets !== "LOW" && "energy pricing trajectories, trade finance conditions, and supply chain stress signals",
    matrix.infrastructure !== "LOW" && "cyber threat attribution developments, critical system advisories, and infrastructure resilience metrics",
    matrix.information !== "LOW" && "legislative, executive, and diplomatic signaling for directional confirmation or reversal",
  ].filter(Boolean) as string[];

  const outlook = `AXION projects the short-term operating picture at ${matrix.overall}. ${watchItems.length > 0 ? `The next intelligence cycle should prioritize: ${watchItems.join("; ")}. ` : ""}A posture revision — upward or downward — requires confirming signals across at least two independent domains. Cycle confidence of ${conf}/100 supports the current assessment as ${conf >= 80 ? "reliable and actionable" : conf >= 70 ? "directional but not definitive" : "indicative — additional signal ingestion is recommended before high-confidence posture conclusions are drawn"}.`;

  return [
    header,
    `RSR AXION – ${cycleLabel.toUpperCase()} ARTICLE OUTPUT`,
    ``,
    `HEADLINE`,
    headline,
    ``,
    `SUBHEAD`,
    subhead,
    ``,
    `OPENING PARAGRAPH`,
    opening,
    ``,
    `BACKGROUND CONTEXT`,
    background,
    ``,
    `CURRENT DEVELOPMENTS`,
    developments,
    ``,
    `STRATEGIC ANALYSIS`,
    strategicAnalysis,
    ``,
    `SYSTEM-LEVEL IMPLICATIONS`,
    systemImplications,
    ``,
    `FORWARD OUTLOOK`,
    outlook,
    ``,
    `END OF ARTICLE OUTPUT`,
  ].join("\n");
}

/* ── Bulletin ───────────────────────────────────────────────────────────── */

export function buildBulletin(
  events: FeedEvent[],
  matrix: ThreatMatrix,
  patterns: string[],
  mode: string,
  now: Date = new Date()
): string {
  const conf = averageConfidence(events);
  const counts = clusterCounts(events);
  const header = buildRealtimeHeader(`INTELLIGENCE CYCLE: ${mode.toUpperCase()}`, now);

  const keyDevelopments = events.slice(0, 6).map((e, i) => {
    const whyItMatters = (() => {
      if (/Security|Defense/.test(e.domain)) return "Defense/security movement with implications for strategic stability and partner posturing.";
      if (/Markets/.test(e.domain)) return "Economic signal with downstream implications for commodity pricing, trade flows, and market conditions.";
      if (/Technology|Infrastructure/.test(e.domain)) return "Infrastructure or technology exposure with systemic risk potential across connected domains.";
      if (/Policy|Domestic/.test(e.domain)) return "Policy signal with near-term regulatory or diplomatic significance.";
      return "Cross-domain intelligence signal — monitor for secondary transmission effects.";
    })();
    return `${i + 1}. [${e.domain}] ${e.title}\n   Why It Matters: ${whyItMatters}`;
  }).join("\n\n") || "No primary signals available this cycle.";

  const patternText = patterns.length > 0
    ? patterns.map(p => `• ${p}`).join("\n")
    : `• No dominant cross-domain pattern is confirmed in this cycle.`;

  const crossDomainAssessment = counts.conflict > 2 && counts.markets > 2
    ? `Security and market signals are co-active. This coupling configuration increases systemic risk and reduces the predictability of near-term developments in both domains.`
    : counts.conflict > 2
    ? `Security cluster is the dominant driver this cycle. Monitor for economic and logistics transmission effects as the leading secondary risk.`
    : counts.markets > 2
    ? `Market and energy pressure is the leading signal type. Watch for security-adjacent ripple effects, particularly in resource-competitive geographies.`
    : counts.infrastructure > 1
    ? `Infrastructure and technology signals carry the highest latent risk in this cycle. System exposure events often do not generate high-frequency signals — their consequence profile is nonlinear.`
    : `Signal distribution is broad without convergence. No concentrated pattern pressure is confirmed.`;

  const watchIndicators = [
    matrix.conflict !== "LOW" && `• Conflict/Security: Track escalation velocity, geographic spread, and partner nation responses`,
    matrix.markets !== "LOW" && `• Markets/Energy: Monitor commodity pricing, trade logistics, and financial system stress indicators`,
    matrix.infrastructure !== "LOW" && `• Infrastructure/Cyber: Track threat actor activity, critical advisories, and system resilience signals`,
    matrix.information !== "LOW" && `• Policy/Diplomacy: Watch for legislative, executive, or institutional action confirming current signaling`,
    `• Posture revision requires three confirming signals across two or more independent domains`,
  ].filter(Boolean).join("\n");

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
    `Signals:         ${events.length} processed`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `KEY DEVELOPMENTS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    keyDevelopments,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `STRATEGIC IMPLICATION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    patternText,
    ``,
    crossDomainAssessment,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `WATCH INDICATORS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    watchIndicators,
    ``,
    `END OF BULLETIN`,
  ].join("\n");
}

/* ── Full Brief ─────────────────────────────────────────────────────────── */

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
  const escalation = buildEscalationModel(matrix, conf, sourceSet.length);
  const counts = clusterCounts(sourceSet);

  const header = [
    "FROM THE OFFICE OF EXECUTIVE INTELLIGENCE",
    "RSR AXION – INTELLIGENCE SYNTHESIS SYSTEM",
    `Location: ${location}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `INTELLIGENCE CYCLE: ${cycleLabel}`,
    "",
  ].join("\n");

  /* ── Quick Brief ── */
  if (depth === "quick") {
    const execSummary = buildExecutiveSummary(sourceSet, matrix, counts, conf);
    const topSignals = sourceSet.slice(0, 8).map(e => `• [${e.domain}] ${e.title}`).join("\n")
      || "• No primary signals identified.";

    return [
      header,
      `RSR AXION – ${briefTitle.toUpperCase()}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `EXECUTIVE SUMMARY`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      execSummary,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `THREAT POSTURE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Overall Threat Posture:  ${matrix.overall}`,
      `Conflict Index:          ${matrix.conflict}`,
      `Economic Stress:         ${matrix.markets}`,
      `Infrastructure:          ${matrix.infrastructure}`,
      `Policy/Information:      ${matrix.information}`,
      `Cycle Confidence:        ${conf}/100`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `PRIMARY SIGNALS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      topSignals,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `OPERATOR TAKEAWAY`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `AXION assesses the immediate operating picture as ${matrix.overall}. ${escalation}`,
      ``,
      `END OF QUICK BRIEF`,
    ].join("\n");
  }

  /* ── Full Brief ── */
  const execSummary = buildExecutiveSummary(sourceSet, matrix, counts, conf);

  const primarySignalBlock = sourceSet.slice(0, 5).map((e, i) => [
    `SIGNAL ${i + 1}  ·  ${e.domain.toUpperCase()}  ·  CONFIDENCE ${e.confidence}/100`,
    `Signal:         ${e.title}`,
    `Context:        ${e.summary ? e.summary.slice(0, 200) : "No additional context available from source."}`,
    `Why It Matters: ${signalWhyItMatters(e.domain)}`,
    `System Impact:  ${signalSystemImpact(matrix.overall)}`,
    `Outlook:        ${signalOutlook(e.domain, matrix)}`,
  ].join("\n")).join("\n\n") || "• No primary signals identified in this cycle.";

  const patternText = patterns.length > 0
    ? patterns.map(p => `• ${p}`).join("\n")
    : `• No dominant cross-domain cluster pattern is confirmed in this cycle.`;

  const activeClusters = [
    counts.conflict > 2 && "Conflict / Security",
    counts.markets > 2 && "Markets / Energy",
    counts.infrastructure > 1 && "Infrastructure / Technology",
    counts.information > 2 && "Policy / Information",
  ].filter(Boolean) as string[];

  const crossDomainNote = activeClusters.length >= 3
    ? `Cross-domain correlation is compound. Active signal pressure is detected across ${activeClusters.join(", ")}. When three or more clusters are simultaneously elevated, systemic feedback loops become more likely — and the lead time for measured response compresses.`
    : activeClusters.length === 2
    ? `Cross-domain correlation is partial. Pressure is co-locating across ${activeClusters.join(" and ")}. Monitor for transmission effects between these two clusters; that is where the consequential risk is most likely to develop.`
    : activeClusters.length === 1
    ? `Signal pressure is concentrated in ${activeClusters[0]}. No significant cross-cluster coupling is detected. The risk remains domain-contained at this time.`
    : `Signals are distributed across domains without forming a concentrated pattern. The cycle is characterized by breadth rather than focus — a condition that can mask cumulative pressure.`;

  const strategicInterpretation = [
    matrix.conflict !== "LOW" && matrix.markets !== "LOW"
      ? `Security-economic coupling is active in this cycle. When conflict and market signals co-move, the risk is not simply additive — the coupling itself introduces a volatility multiplier that reduces the effectiveness of single-domain response strategies. Energy supply disruption, logistics constraint, and financial system pressure can compound simultaneously under these conditions. Decision-makers should plan for correlated, not independent, risk scenarios in the near term.`
      : null,
    matrix.markets !== "LOW" && matrix.infrastructure !== "LOW"
      ? `Market and infrastructure signals are intersecting through logistics corridors, energy systems, and technology dependency chains. A disruption originating in either domain will tend to propagate into the other with reduced friction. Supply chain resilience and system redundancy are the primary structural buffers against this coupling dynamic.`
      : null,
    matrix.information !== "LOW" && matrix.conflict !== "LOW"
      ? `Policy and institutional signaling is reinforcing the security picture. Diplomatic activity, legislative movement, and executive action are frequently leading indicators of kinetic or economic escalation. This convergence between information and conflict signals warrants heightened interpretive attention and anticipatory positioning.`
      : null,
    matrix.infrastructure !== "LOW"
      ? `Infrastructure and technology pressure represents a low-visibility, high-consequence risk vector. Cyber exposure, AI system dependencies, and critical network vulnerabilities do not generate high-frequency signals — but their failure modes are nonlinear and their impact profiles are disproportionate to the volume of preceding indicators. The current cycle warrants particular attention to this domain.`
      : null,
  ].filter(Boolean).join("\n\n") ||
    `The current operating environment holds at a guarded posture. No single domain presents acute pressure, and cross-domain coupling remains at baseline levels. This is a maintenance cycle — the appropriate response is disciplined monitoring rather than elevated readiness. Conditions can shift rapidly; signal continuity is the primary risk management instrument available at this posture level.`;

  const operatorTakeaway = [
    `• Threat posture: ${matrix.overall}. ${matrix.overall === "GUARDED" ? "No immediate escalation pathway is indicated. Maintain monitoring continuity." : matrix.overall === "ELEVATED" ? "At least one domain is generating above-baseline pressure. Elevate monitoring cadence." : matrix.overall === "HIGH" ? "Multi-domain pressure is active. Secondary effects are plausible. Prepare contingency review." : "Compounding systemic risk is indicated. Executive-level attention is warranted."}`,
    counts.conflict > 2 ? `• Security/conflict cluster is active (${counts.conflict} flagged signals). This domain warrants priority attention in the next review cycle.` : null,
    counts.markets > 2 ? `• Market/energy signals are elevated (${counts.markets} flagged signals). Monitor commodity pricing and trade logistics for contagion indicators.` : null,
    counts.infrastructure > 1 ? `• Infrastructure/technology exposure is present (${counts.infrastructure} flagged signals). Cyber and system resilience indicators should remain on the active watch list.` : null,
    counts.information > 2 ? `• Policy/institutional activity is elevated (${counts.information} flagged signals). Regulatory or diplomatic action may follow in the near term.` : null,
    `• Cycle confidence: ${conf}/100. ${conf >= 80 ? "Confidence is sufficient to support reliance on this assessment." : conf >= 70 ? "Confidence is moderate — treat as directional, not definitive." : "Confidence is below threshold. Treat as indicative only; additional signal ingestion is recommended."}`,
    `• Next cycle priority: ${matrix.conflict !== "LOW" ? "conflict domain" : matrix.markets !== "LOW" ? "market and energy signals" : "maintain all domains at standard monitoring cadence"}.`,
  ].filter(Boolean).join("\n");

  const watchIndicators = [
    matrix.conflict !== "LOW" && `• Conflict/Security: Monitor escalation velocity, geographic spread, and partner nation responses. Watch for kinetic follow-on activity, diplomatic repositioning, or shifts in force posture.`,
    matrix.markets !== "LOW" && `• Markets/Energy: Track energy pricing trajectories, trade finance conditions, logistics network stress, and credit market responses to geopolitical developments.`,
    matrix.infrastructure !== "LOW" && `• Infrastructure/Cyber: Monitor for threat actor attribution, patch cycle responses, and critical system advisories from national cybersecurity and sector authorities.`,
    matrix.information !== "LOW" && `• Policy/Information: Watch for legislative, executive, or diplomatic action that confirms or reverses current institutional signaling trends. Three-cycle pattern confirmation is the analytical threshold.`,
    `• Maintain signal ingestion on standard cycle cadence. Posture revision requires confirming signals across at least two independent domains.`,
  ].filter(Boolean).join("\n");

  return [
    header,
    `RSR AXION – ${briefTitle.toUpperCase()}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `EXECUTIVE SUMMARY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    execSummary,
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
    `PRIMARY SIGNALS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    primarySignalBlock,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `PATTERN ANALYSIS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    patternText,
    ``,
    crossDomainNote,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `STRATEGIC INTERPRETATION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    strategicInterpretation,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `OPERATOR TAKEAWAY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    operatorTakeaway,
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

/* ── Utilities ──────────────────────────────────────────────────────────── */

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
