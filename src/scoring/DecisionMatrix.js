/**
 * AI Asset Decision Matrix
 * Based on C:\Users\User\Downloads\AI Asset Decision Matrix.md
 * 
 * Vectorization Dimensions (Input-Achsen):
 * D1 - Framework: PAS | AIDA | FAB | MVP Pivot | Big Five | DISG
 * D2 - Angle: ROI Proof | Risk Reduction | Speed | Authority | Scarcity | Status | Unconventional Metaphor | Pattern Interrupt
 * D3 - Lifecycle Stage: Lead | Prospect | SAL | Opportunity | Customer
 * D4 - Market Sophistication: 1 (Broad / Erklärung) | 2 (Aware / Vergleich) | 3 (Narrow / Insider)
 * D5 - Hook Type: Benefit | Proof | Urgency | Paradox | Curiosity | Uniqueness
 * D6 - Sentiment: -1.0 ... 0 ... +1.0
 * 
 * 5 Score-Achsen (1-10):
 * - conversion: Kauf-/Lead-Wahrscheinlichkeit
 * - audience: Passung zur Zielgruppe
 * - sentiment: Emotionale Richtung & Stärke
 * - hook: Aufmerksamkeit / Pattern Interrupt
 * - tension: Dramaturgy & Progression (Spannungskurve)
 * 
 * Weighted Score Formula:
 * weighted_score = 0.35 * conversion + 0.20 * audience + 0.15 * hook + 0.15 * tension + 0.15 * sentiment
 * 
 * Classification:
 * Grade A (PMF-Kandidat): weighted_score >= 8.0  -> Skalieren / Budget hoch
 * Grade B (Testwürdig):  6.5 <= weighted_score < 8.0 -> Mehr Varianten erzeugen
 * Grade C (Grenzwertig): 5.0 <= weighted_score < 6.5 -> Nur low-budget testen
 * Grade D (Noise):       weighted_score < 5.0 -> Kill / archivieren
 */

export class DecisionMatrix {
  constructor(customWeights = null) {
    this.weights = customWeights || {
      conversion: 0.35,
      audience: 0.20,
      hook: 0.15,
      tension: 0.15,
      sentiment: 0.15
    };
  }

  /**
   * Calculates composite weighted score and assigns letter grade (A/B/C/D).
   * @param {object} scores - { conversion, audience, sentiment, hook, tension }
   * @returns {object} { weighted_score, grade, action }
   */
  evaluateScores(scores) {
    const conversion = Math.min(10, Math.max(1, Number(scores.conversion) || 5));
    const audience = Math.min(10, Math.max(1, Number(scores.audience) || 5));
    const sentiment = Math.min(10, Math.max(1, Number(scores.sentiment) || 5));
    const hook = Math.min(10, Math.max(1, Number(scores.hook) || 5));
    const tension = Math.min(10, Math.max(1, Number(scores.tension) || 5));

    const weighted_score = parseFloat((
      this.weights.conversion * conversion +
      this.weights.audience * audience +
      this.weights.hook * hook +
      this.weights.tension * tension +
      this.weights.sentiment * sentiment
    ).toFixed(2));

    let grade = 'D';
    let action = 'Kill / archivieren';

    if (weighted_score >= 8.0) {
      grade = 'A';
      action = 'PMF-Kandidat (Skalieren / Budget hoch)';
    } else if (weighted_score >= 6.5) {
      grade = 'B';
      action = 'Testwürdig (Mehr Varianten erzeugen)';
    } else if (weighted_score >= 5.0) {
      grade = 'C';
      action = 'Grenzwertig (Nur low-budget testen)';
    } else {
      grade = 'D';
      action = 'Noise (Kill / archivieren)';
    }

    return {
      scores: { conversion, audience, sentiment, hook, tension },
      weighted_score,
      grade,
      action
    };
  }

  /**
   * Vectorizes an ad asset with D1-D6 dimensions and evaluates its Decision Matrix score.
   */
  vectorizeAndScore(adAsset, vectorData, scoreData) {
    const evaluation = this.evaluateScores(scoreData);
    
    return {
      id: adAsset.id || `AD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      track: adAsset.track || 'RSA', // 'RSA' or 'PMax'
      headlines: adAsset.headlines || [],
      longHeadlines: adAsset.longHeadlines || [],
      descriptions: adAsset.descriptions || [],
      spineTheme: adAsset.spineTheme || '',
      metaphor: adAsset.metaphor || '',
      vectorization: {
        d1_framework: vectorData.d1_framework || 'PAS',
        d2_angle: vectorData.d2_angle || 'Pattern Interrupt',
        d3_lifecycle_stage: vectorData.d3_lifecycle_stage || 'Lead',
        d4_market_sophistication: vectorData.d4_market_sophistication || 2,
        d5_hook_type: vectorData.d5_hook_type || 'Uniqueness',
        d6_sentiment: vectorData.d6_sentiment !== undefined ? vectorData.d6_sentiment : 0.6
      },
      matrixEvaluation: evaluation
    };
  }
}

export default DecisionMatrix;
