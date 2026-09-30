# AgenticMatch — Autonomous AI Dating Platform

> Each user is represented by an autonomous AI agent synthesized purely from their public LinkedIn and Instagram. The agents date each other on their human's behalf, generate real-time date transcripts, and produce personalized compatibility rankings.

## Quickstart

```bash
# 1. Clone / navigate to the project
cd agentic-match

# 2. Install dependencies
npm install

# 3. Configure environment (all keys are optional)
cp .env.example .env.local
# Edit .env.local — the app works fully without any keys

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All keys are **optional**. Without them, the app runs on a deterministic local engine with the 25-candidate seed dataset — perfect for demos.

| Variable | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | LLM-authored transcripts & persona synthesis | _heuristic engine_ |
| `OPENAI_MODEL` | Model to use | `gpt-4o-mini` |
| `PROXYCURL_API_KEY` | Live LinkedIn scraping | _synthetic fallback_ |
| `APIFY_TOKEN` | Live Instagram scraping | _synthetic fallback_ |

---

## Application Structure

```
app/
├── candidates/       # Candidate directory grid (25 agents)
├── dates/            # Live date arena with animated transcript
├── rankings/         # Compatibility leaderboard + heatmap
└── profile/[id]/     # Individual agent profile page

app/api/
├── analyze/          # POST — synthesize a new persona from URLs
├── simulate/         # POST — run a date between two agents
├── rankings/         # GET  — compatibility rankings for one agent
├── heatmap/          # GET  — full NxN affinity matrix
└── quick-date/       # GET  — one-click demo pair

lib/
├── agents/
│   ├── analyzer.ts       # Persona Synthesizer Agent
│   ├── datingSimulator.ts # Autonomous Dating Harness Agent
│   ├── ranker.ts         # Matchmaker & Ranking Judge Agent
│   └── orchestrator.ts   # Coordinates the three agents
├── engine/
│   └── heuristics.ts     # Deterministic local simulation engine
└── scraping/
    ├── proxycurl.ts      # LinkedIn scraper (Proxycurl API)
    ├── apify.ts          # Instagram scraper (Apify)
    └── mock.ts           # Fallback synthetic data generator

data/
└── seed_candidates.json  # 25 pre-analyzed candidate profiles
```

---

## Core AI Pipeline

### 1. Persona Synthesizer (`lib/agents/analyzer.ts`)
- Scrapes LinkedIn via Proxycurl API
- Scrapes Instagram via Apify
- Sends both to GPT-4o-mini for psychographic profiling
- Falls back to heuristic synthesis if scraping or LLM fails

### 2. Autonomous Dating Harness (`lib/agents/datingSimulator.ts`)
- Takes two `CandidateProfile` objects
- Generates a 6-turn blind date conversation via LLM
- Falls back to the deterministic transcript generator

### 3. Matchmaker & Ranking Judge (`lib/agents/ranker.ts`)
- Evaluates the date transcript + profiles
- Returns compatibility score (0-100), 6 dimension scores, verdict
- Falls back to heuristic scoring

---

## Features

- **Candidate Directory** — 25-card grid with avatar, headline, location, interest tags
- **Date Arena** — Animated chat stream with typing indicators; "Quick Date" for instant demos; "Deep Date" for LLM-authored sessions
- **Compatibility Rankings** — Full leaderboard for any candidate; "View Transcript" drawer
- **Compatibility Heatmap** — Interactive NxN grid; click any cell to open the full transcript
- **Test Custom Links** — Modal to paste any LinkedIn + Instagram URL; synthesizes a new agent and instantly ranks them against the pool
- **Profile Pages** — Dual-column layout: Source Data Snapshot vs AI Synthesis; Green Flags vs Red Flags cards; Top 5 compatible agents

---

## Demo Mode (No API Keys Required)

The app ships with a **deterministic local simulation engine** that:
- Uses pre-computed analysis for all 25 seed candidates
- Generates consistent, plausible date transcripts from profile data
- Computes compatibility scores using psychographic affinity algorithms
- Runs entirely client-side with no network calls

Hit **"One-Click Quick Date"** in the Date Arena for an instant, pre-computed demo pair.
