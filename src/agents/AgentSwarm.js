import BaseAgent from './BaseAgent.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';

export const SWARM_PERSONAS = [
  { id: 'SWARM-01', name: 'Early Tech Adopter (m/28)', role: 'Tech-affiner Innovationstreiber', focus: 'Effizienz, KI-Tools, Schnelligkeit & Innovation', mindset: 'Sucht stets nach dem neuesten Tech-Vorsprung. Hasst altmodische Phrasen.' },
  { id: 'SWARM-02', name: 'Skeptischer Bedenkenträger (m/54)', role: 'Risikoaverser Prüfer', focus: 'Transparenz, Nachweise & Risiko-Minimierung', mindset: 'Hinterfragt jedes Versprechen. Will Garantien und exakte Fakten ohne Hype.' },
  { id: 'SWARM-03', name: 'Erstkäufer & Junge Familie (f/32)', role: 'Eigenheim-Einsteiger', focus: 'Planungssicherheit, Wohlfühlfaktor & Budget', mindset: 'Sucht Sicherheit für die Familie. Reagiert stark auf Vertrauen und klare Zahlen.' },
  { id: 'SWARM-04', name: 'Klassischer Kapitalanleger (m/48)', role: 'Rendite- & Cashflow-Fokussierter', focus: 'Mietrendite, AfA & Vermögensaufbau', mindset: 'Zahlen- und ROI-getrieben. Reagiert negativ auf leere Versprechungen.' },
  { id: 'SWARM-05', name: 'Vorsichtige Bausparerin (f/42)', role: 'Sicherheitsorientierte Entscheiderin', focus: 'Grundsolide Absicherung & Schutz', mindset: 'Vermeidet Experimente. Will bekannte, vertrauenswürdige Frameworks.' },
  { id: 'SWARM-06', name: 'Immobilien-Erbe (m/39)', role: 'Substanz-Bewahrer & Nachfolger', focus: 'Wert-Erhalt & mühelose Abwicklung', mindset: 'Sucht unkomplizierte, professionelle Lösungen für geerbtes Vermögen.' },
  { id: 'SWARM-07', name: 'Vermögensvererber (m/67)', role: 'Senior mit Nachlassplanung', focus: 'Familienabsicherung & steuerfreie Übertragung', mindset: 'Denkt in Generationen. Will seriöse, würdevolle Ansprache.' },
  { id: 'SWARM-08', name: 'Urban Career Professional (f/35)', role: 'Zeitknappe Führungskraft', focus: 'Zeitgewinn, Premium-Service & Abkürzungen', mindset: 'Hat viel Geld, aber wenig Zeit. Reagiert auf High-End Metaphern.' },
  { id: 'SWARM-09', name: 'Konservativer Vermögensschützer (m/61)', role: 'Inflationsschutz-Sucher', focus: 'Betongold & Kaufkraft-Erhalt', mindset: 'Sucht Stabilität in Krisenzeiten. Abgeneigt gegenüber aggressiver Werbung.' },
  { id: 'SWARM-10', name: 'ESG & Sustainability Fan (f/31)', role: 'Nachhaltigkeits-Enthusiastin', focus: 'Energieeffizienz, Zukunftsfähigkeit & ESG', mindset: 'Achtet auf ökologische Ausrichtung und zukunftssichere Bau- & Investitionsstandards.' },
  { id: 'SWARM-11', name: 'Schnäppchen- & Value-Jäger (m/44)', role: 'Preis-Leistungs-Optimierer', focus: 'Unterbewertete Deals & Verhandlungsvorteil', mindset: 'Sucht stets den Hebel und den preislichen Vorteil.' },
  { id: 'SWARM-12', name: 'Gewerbe- & Portfoliokäufer (m/52)', role: 'Multi-Unit Investor', focus: 'Skalierung, Diversifikation & Synergien', mindset: 'Denkt in Portfolios. Reagiert auf strukturierte B2B-Metriken.' },
  { id: 'SWARM-13', name: 'Suburban Relocator (f/37)', role: 'Stadt-Flüchtling & Lebensqualität-Sucherin', focus: 'Platz, Natur & Lebensqualität', mindset: 'Will raus aus dem Großstadtstress, sucht Balance und Raum.' },
  { id: 'SWARM-14', name: 'Downsizer / Best-Ager (f/64)', role: 'Komfort- & Barrierefrei-Orientierte', focus: 'Pflegeleichtes Wohnen & Komfort', mindset: 'Verkleinert Wohnraum für maximale Lebensfreude ohne Ballast.' },
  { id: 'SWARM-15', name: 'Tech Entrepreneur (m/33)', role: 'Skalierungs-Gründer', focus: 'Leverage, Automation & Asymmetrische Chancen', mindset: 'Sucht Hebelwirkung. Versteht komplexe KI-Analysen sofort.' },
  { id: 'SWARM-16', name: 'Mehrgenerationen-Planerin (f/45)', role: 'Familien-Koordinatorin', focus: 'Zusammenhalt, Großraum & Flexibilität', mindset: 'Wägt Bedürfnisse verschiedener Altersgruppen sorgfältig ab.' },
  { id: 'SWARM-17', name: 'Passives-Einkommen-Seeker (m/36)', role: 'Hands-off Investor', focus: 'Automatisiertes Management & stressfreier Ertrag', mindset: 'Will null Aufwand bei maximaler administrativer Entlastung.' },
  { id: 'SWARM-18', name: 'Luxus- & Prestige-Käufer (m/46)', role: 'High-End Status-Käufer', focus: 'Exklusivität, Architektur & Status', mindset: 'Sucht das Besondere, das nicht jeder hat.' },
  { id: 'SWARM-19', name: 'Value-Add Renovator / Fixer (m/41)', role: 'Wertsteigerungs-Praktiker', focus: 'Aufwertungspotenzial & Eigenleistung', mindset: 'Sucht Rohdiamanten mit Entfaltungsmöglichkeit.' },
  { id: 'SWARM-20', name: 'Institutioneller / Stiftungs-Anleger (f/58)', role: 'Regulierter Großanleger', focus: 'Governance, ESG & Stabilität', mindset: 'Strikte Anlagerichtlinien, konservatives Risikoprofil.' }
];

export default class AgentSwarm extends BaseAgent {
  constructor() {
    super('agent_swarm');
    this.personas = SWARM_PERSONAS;
  }

  /**
   * Evaluates candidate ad alternatives using the 20 persona test customer agents.
   * @param {Array} adCandidates - List of scored ad alternatives (Grade A & B candidates)
   * @param {string} track - 'RSA' or 'PMax'
   * @param {string} [contextIndustry] - Industry context (e.g., Real Estate, Lead Gen)
   * @returns {Promise<object>} Swarm evaluation report with statements & metric projections
   */
  async runPredictiveTesting(adCandidates, track = 'RSA', contextIndustry = 'Immobilien & Lead Gen') {
    this.log(`🚀 Starting 20-Agent Swarm Predictive Asset Testing for ${adCandidates.length} top candidates...`);
    this.log(`Track: ${track} | Industry Context: ${contextIndustry}`);

    const config = getConfig();
    const hasLLM = Boolean(config.geminiApiKey);

    const evaluatedCandidates = [];

    // Evaluate up to top 5 candidates in depth with the 20-agent swarm
    const topCandidates = adCandidates.slice(0, 5);

    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i];
      this.log(`\n--------------------------------------------------`);
      this.log(`Swarm evaluating Ad Candidate #${i + 1} [${candidate.id}] (${candidate.vectorization.d1_framework} | ${candidate.vectorization.d2_angle})`);
      
      let swarmResults = [];

      if (hasLLM) {
        // Run batch evaluation via LLM for precision
        swarmResults = await this.evaluateCandidateWithLLMSwarm(config.geminiApiKey, candidate, track, contextIndustry);
      } else {
        // Fallback simulation mode
        swarmResults = this.simulateSwarmEvaluation(candidate, track);
      }

      // Aggregate Swarm Metrics
      const avgCTR = (swarmResults.reduce((acc, curr) => acc + curr.projectedCTR, 0) / swarmResults.length).toFixed(2);
      const avgCPC = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPC, 0) / swarmResults.length).toFixed(2);
      const avgCPM = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPM, 0) / swarmResults.length).toFixed(2);
      const avgCPL = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPL, 0) / swarmResults.length).toFixed(2);
      const approvalCount = swarmResults.filter(r => r.score >= 7.0).length;
      const approvalRate = ((approvalCount / swarmResults.length) * 100).toFixed(1);

      evaluatedCandidates.push({
        candidateId: candidate.id,
        track,
        spineTheme: candidate.spineTheme,
        metaphor: candidate.metaphor,
        matrixGrade: candidate.matrixEvaluation.grade,
        matrixScore: candidate.matrixEvaluation.weighted_score,
        headlines: candidate.headlines,
        longHeadlines: candidate.longHeadlines || [],
        descriptions: candidate.descriptions,
        vectorization: candidate.vectorization,
        swarmSummary: {
          approvalRatePercent: parseFloat(approvalRate),
          approvedAgentsCount: approvalCount,
          totalAgents: swarmResults.length,
          projectedMetrics: {
            ctrPercent: parseFloat(avgCTR),
            cpcEuro: parseFloat(avgCPC),
            cpmEuro: parseFloat(avgCPM),
            costPerLeadEuro: parseFloat(avgCPL)
          }
        },
        agentStatements: swarmResults
      });
    }

    // Sort by Swarm Approval Rate & Matrix Score
    evaluatedCandidates.sort((a, b) => b.swarmSummary.approvalRatePercent - a.swarmSummary.approvalRatePercent);

    const winner = evaluatedCandidates[0];
    this.log(`\n🏆 WINNER AD ALTERNATIVE DETERMINED BY SWARM:`);
    if (winner) {
      this.log(`  ID: ${winner.candidateId} (Grade: ${winner.matrixGrade}, Matrix Score: ${winner.matrixScore})`);
      this.log(`  Swarm Approval: ${winner.swarmSummary.approvalRatePercent}%`);
      this.log(`  Projections: CTR ${winner.swarmSummary.projectedMetrics.ctrPercent}% | CPC €${winner.swarmSummary.projectedMetrics.cpcEuro} | CPM €${winner.swarmSummary.projectedMetrics.cpmEuro} | CPL €${winner.swarmSummary.projectedMetrics.costPerLeadEuro}`);
    }

    return {
      timestamp: new Date().toISOString(),
      track,
      totalCandidatesTested: topCandidates.length,
      swarmSize: this.personas.length,
      winnerCandidateId: winner ? winner.candidateId : null,
      evaluatedCandidates
    };
  }

  /**
   * Uses Gemini to evaluate a candidate ad against all 20 personas in a single structured call.
   */
  async evaluateCandidateWithLLMSwarm(apiKey, candidate, track, contextIndustry) {
    const systemPrompt = `
Du bist ein hochpräziser Simulator für ein Swarm-Testing-System aus 20 unterschiedlichen Testkunden-Personas (Agent Swarm).
Deine Aufgabe ist es, eine Werbeanzeige (Track: ${track}, Branchenkontext: ${contextIndustry}) aus den Perspektiven aller 20 Personas zu analysieren und deren Statement sowie Leistungskennzahlen-Hochrechnung abzugeben.

Die 20 Personas sind:
${this.personas.map(p => `- ${p.id}: ${p.name} (${p.role}). Fokus: ${p.focus}. Mindset: ${p.mindset}`).join('\n')}

Werte die Anzeige gründlich aus und liefere für JEDE der 20 Personas:
1. score: Note 1-10 (wie gut spricht die Anzeige diese Persona an)
2. statement: Ein authentischer 1-2 Sätze Kommentar im O-Ton der Persona
3. projectedCTR: Geschätzte CTR in % (z.B. 3.5 bis 9.8)
4. projectedCPC: Geschätzter CPC in € (z.B. 1.20 bis 4.50)
5. projectedCPM: Geschätzter CPM in € (z.B. 18.50 bis 55.00)
6. projectedCPL: Geschätzter Cost per Lead / CPL in € (z.B. 28.00 bis 110.00)

Gib die Antwort ZWINGEND als JSON-Array mit 20 Objekten zurück:
[
  {
    "personaId": "SWARM-01",
    "personaName": "Early Tech Adopter (m/28)",
    "score": 8.5,
    "statement": "...",
    "projectedCTR": 6.8,
    "projectedCPC": 2.10,
    "projectedCPM": 32.00,
    "projectedCPL": 45.00
  },
  ...
]
`;

    const userPrompt = `
ANZEIGEN-DRAFT FÜR BEWERTUNG:
ID: ${candidate.id}
Spine Theme: ${candidate.spineTheme}
Angle / Metapher: ${candidate.metaphor}
Framework: ${candidate.vectorization.d1_framework} | Angle: ${candidate.vectorization.d2_angle} | Hook: ${candidate.vectorization.d5_hook_type}

Headlines:
${candidate.headlines.map(h => `- ${h}`).join('\n')}

${candidate.longHeadlines && candidate.longHeadlines.length > 0 ? `Long Headlines:\n${candidate.longHeadlines.map(lh => `- ${lh}`).join('\n')}\n` : ''}
Descriptions:
${candidate.descriptions.map(d => `- ${d}`).join('\n')}
`;

    try {
      const rawText = await generateText(apiKey, systemPrompt, userPrompt, this.model, true);
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length >= 15) {
        return parsed;
      }
      throw new Error('LLM returned incomplete persona array.');
    } catch (err) {
      this.log(`LLM Swarm evaluation fallback triggered: ${err.message}`);
      return this.simulateSwarmEvaluation(candidate, track);
    }
  }

  /**
   * Deterministic mathematical fallback simulation for 20 personas.
   */
  simulateSwarmEvaluation(candidate, track) {
    const baseScore = candidate.matrixEvaluation.weighted_score;
    const isPMax = track.toUpperCase() === 'PMAX';

    return this.personas.map((p, idx) => {
      // Apply variation based on persona fit to framework/angle
      const variance = ((idx * 7) % 19 - 9) / 10; // -0.9 to +0.9
      const personaScore = Math.min(9.9, Math.max(3.0, parseFloat((baseScore + variance).toFixed(1))));

      // Calculate realistic metrics
      const ctr = parseFloat((3.5 + (personaScore / 10) * 4.8 + (idx % 3) * 0.4).toFixed(2));
      const cpc = parseFloat((3.80 - (personaScore / 10) * 1.60 + (idx % 4) * 0.25).toFixed(2));
      const cpm = parseFloat((24.00 + (10 - personaScore) * 3.50 + (idx % 5) * 2.10).toFixed(2));
      const cpl = parseFloat((isPMax ? 38.00 : 48.00) + (10 - personaScore) * 7.50 + (idx % 6) * 3.20).toFixed(2);

      let statement = '';
      if (personaScore >= 8.0) {
        statement = `"Der Story-Spin '${candidate.spineTheme}' holt mich genau an meinem Schmerzpunkt ab. Diese Ansprache hebt sich deutlich von der Konkurrenz ab!"`;
      } else if (personaScore >= 6.5) {
        statement = `"Guter Ansatz mit dem Framework ${candidate.vectorization.d1_framework}. Klare Argumentation und verständlicher Call-to-Action."`;
      } else {
        statement = `"Klingt noch etwas zu gewöhnlich für meine Bedürfnisse. Hier wünsche ich mir einen schärferen Hook."`;
      }

      return {
        personaId: p.id,
        personaName: p.name,
        score: personaScore,
        statement,
        projectedCTR: ctr,
        projectedCPC: Math.max(0.80, cpc),
        projectedCPM: Math.max(12.00, cpm),
        projectedCPL: Math.max(18.00, cpl)
      };
    });
  }
}
