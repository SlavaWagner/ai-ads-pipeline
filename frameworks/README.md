# Google Ads Copywriting Frameworks & Hook Pipelines

This directory contains the complete framework library used by **`ai-ads-pipeline`** and available as modular Make.com blueprints for automated RSA & Performance Max asset creation.

---

## 1. Slava Wagner Automations Frameworks (`slava-wagner-automations/`)

Contains **50 full-scale Make.com blueprints** (25 for Responsive Search Ads, 25 for Performance Max Asset Groups) alongside [`SWA Alle meine Frameworks.md`](slava-wagner-automations/SWA%20Alle%20meine%20Frameworks.md).

### Implemented Strategic Frameworks:
- **Core Marketing**: 4P Marketing Mix, 7P Service Marketing, AIDA (Attention-Interest-Desire-Action), PAS (Problem-Agitation-Solution)
- **Business Strategy**: SWOT Analysis, Business Model Canvas, Value Proposition Canvas, Three Horizons Framework, Ten Types of Innovation, Core Competence Analysis, Value Chain Analysis
- **Audience & Psychology**: Customer Persona Template, Empathy Map, Customer Journey Mapping, Lifecycles, Market Sophistication, Angle Recognition
- **Growth & Acquisition**: Hook Model, Growth Hacking Funnel, Conversion Funnel Analysis, Copywriting Archetypes

Each blueprint connects directly to Google Ads API and Google Gemini to automatically generate grounded, high-converting ad assets tailored to the specific framework.

---

## 2. 50 Hook Pipelines (`50-hook-pipelines/`)

Contains **50 dedicated Hook-Driven Make.com blueprints** (25 RSA, 25 PMax) engineered to test high-interrupt psychographic hooks:

- **Authority & Proof**: *Autoritäts-Hook*, *Beweis-Hook*, *Social-Proof-Hook*, *Demonstrations-Hook*, *Insider-Hook*
- **Tension & Urgency**: *Dringlichkeits-Hook*, *Warnungs-Hook*, *Fehler-Hook*, *Schmerz-Hook*, *Problem-Hook*
- **Curiosity & Paradox**: *Neugier-Hook*, *Geheimnis-Hook*, *Kontrarian-Hook*, *Mythen-Hook*, *Überraschungs-Hook*
- **Status & Identity**: *Status-Hook*, *Identitäts-Hook*, *Zugehörigkeits-Hook*, *Einzigartigkeits-Hook*, *Wunsch-Traum-Hook*
- **Mechanism & Logic**: *Mechanismus-Hook*, *Spezifitäts-Hook*, *Vergleichs-Hook*, *Vorteils-Hook*, *Story-Hook*

---

## 3. Usage with the CLI Tool

In `ai-ads-pipeline`, you can target any framework during generation:
```bash
node bin/index.js run-workflow --framework pas
node bin/index.js run-workflow --framework angles
node bin/index.js run-workflow --framework copywritings
```
The system will inject the corresponding framework methodology into the Copywriter Agent's system prompt.
