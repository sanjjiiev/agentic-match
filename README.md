# AgenticMatch — Agentic Dating Platform

**25 real people. Two sources each. Agents that date on their behalf.**

Each person is synthesized into an autonomous AI agent from their LinkedIn and Instagram. The agents date each other, producing voice-calibrated transcripts, deep personality analysis, and cited chemistry intelligence reports.

---

## Quickstart

```bash
npm install
npm run dev
# → http://localhost:3000
```

Works fully without any API keys. All 25 profiles are pre-loaded with personality profiles and voice calibration.

---

## Features

### Core
- **25 seed profiles** — diverse tech, research, art, sports backgrounds across 14 cities
- **Profile pages** — AI synthesis, green/red flags, hobbies, needs, professional ambition
- **Date Arena** — agents debate, probe, and date in real time with animated transcripts
- **Rankings board** — every person ranked against all others
- **Compatibility Heatmap** — 25×25 interactive affinity matrix
- **Custom Link Analyzer** — paste any LinkedIn + Instagram, get a synthesized profile

### Unique / Differentiating

| Feature | Description |
|---|---|
| 🗣️ **Authentic Voice Mode** | Agent learns to write like the real person — extracted from Instagram captions and LinkedIn writing style |
| 🧠 **Deep Personality Architecture** | Big Five (OCEAN), Attachment Style, Love Language, Conflict Style, Shadow Traits, Secret Strengths |
| 💭 **Inner Monologue** | Toggle to see what each agent is *really thinking* under every message during the date |
| 🔬 **Chemistry Intelligence Report** | Cited convergence + tension points with evidence from actual profile data. Executive verdict + long-term prognosis |
| 🔁 **3-Date Arc** | Progressive three-date narrative (ice-breaker → probe → verdict) with memory |
| 💾 **Persistent Agent Memory** | Agents remember previous dates. Date 2 references Date 1 specifically |
| 💬 **Ask Your Agent** | Chat interface on every profile — talk directly to the AI agent in that person's voice |
| 📱 **Telegram Notifications** | POST /api/notify to send match summary via Telegram bot |
| 🌐 **Playwright Scraper** | 3-tier pipeline: Playwright → Proxycurl API → Apify API → Synthetic |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS, Radix UI primitives |
| AI / LLM | OpenAI GPT-4o-mini (gpt-4o-mini) |
| LinkedIn scraping | Proxycurl API → Playwright automation → Synthetic fallback |
| Instagram scraping | Apify Actor → Playwright automation → Synthetic fallback |
| Memory | In-process globalThis singleton (Mem0-style design) |
| Notifications | Telegram Bot API |

---

## Environment Variables

```env
# LLM (optional — unlocks real transcripts and persona synthesis)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# LinkedIn scraping (optional)
PROXYCURL_API_KEY=...

# Instagram scraping (optional)
APIFY_TOKEN=...

# Browser automation (optional)
PLAYWRIGHT_ENABLED=false

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN=...
```

---

## Architecture

```
LinkedIn URL + Instagram URL
         ↓
  3-Tier Scraping Pipeline:
    1. Playwright browser automation
    2. Proxycurl API (LinkedIn) / Apify (Instagram)
    3. Synthetic heuristic data
         ↓
  Parallel LLM Analysis:
    - Persona synthesis (PersonaAnalysis)
    - Personality profiling (Big Five + Attachment + Love Language)
    - Voice extraction (formality, humor, rhythm, catchphrases)
         ↓
  CandidateProfile stored in global store
         ↓
  Dating Simulation (voice-calibrated + inner monologue):
    - Quick mode: deterministic heuristic engine (~1ms)
    - Deep mode: voice-calibrated LLM transcript + judgment
    - 3-Date Arc: progressive dates with persistent memory
         ↓
  Rankings: all-vs-all heuristic + Chemistry Intelligence Report
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/candidates` | GET | List all candidates |
| `/api/analyze` | POST | Analyze new LinkedIn + Instagram URLs |
| `/api/simulate` | POST | Run single date between two agents |
| `/api/multi-date` | POST | Run 3-date progressive arc |
| `/api/rankings` | GET | Get rankings for a candidate |
| `/api/heatmap` | GET | NxN affinity matrix |
| `/api/quick-date` | GET | Pre-computed demo date |
| `/api/ask-agent` | POST | Chat with a candidate's agent |
| `/api/notify` | POST | Send Telegram match notification |

---

## Overall Explanation (200 chars)

*Each person gets an AI agent synthesized from LinkedIn + Instagram. Agents date on their behalf, produce voice-calibrated transcripts, personality profiles, and cited chemistry intelligence reports.*
