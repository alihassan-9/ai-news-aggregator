# AI News Aggregator

A news app that actually thinks. It pulls headlines from two sources, runs them through Google Gemini to generate summaries and figure out whether the tone is positive, neutral, or negative — then shows everything on a clean dashboard you can filter and search through.

Built with FastAPI, PostgreSQL, Next.js, and Docker. The whole stack runs with one command.

---

## What it does

- Fetches news from **NewsAPI** and **GNews** (two independent sources)
- Stores articles in a **PostgreSQL** database, skipping duplicates automatically
- Sends each article to **Google Gemini** to get a 2–3 sentence summary and a sentiment label
- Shows everything on a dashboard with live filters for sentiment, source, and keyword search
- Comes with a full **REST API** and Swagger docs at `/docs`

The sentiment analysis is an original feature — not in the base tutorial. It lets you see at a glance whether the day's news is mostly positive, negative, or neutral.

---

## Tech stack

| Layer | What's used |
|---|---|
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 15, SQLAlchemy 2.0 |
| AI / LLM | Google Gemini 2.0 Flash |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Server | Nginx (reverse proxy + static files) |
| Deployment | Docker, Docker Compose |
| News sources | NewsAPI, GNews |

---

## Getting started

### You'll need

- Docker and Docker Compose installed
- Three free API keys:
  - [NewsAPI](https://newsapi.org) — free tier, takes 1 minute to sign up
  - [GNews](https://gnews.io) — same
  - [Google Gemini](https://aistudio.google.com) — free, just sign in with Google

### Setup

**1. Clone the repo**
```bash
git clone <repository-url>
cd ai-news-aggregator
```

**2. Create your `.env` file**
```bash
cp .env.example .env
```

**3. Open `.env` and paste in your keys**
```env
NEWSAPI_KEY=your_key_here
GNEWS_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```
Leave the database values as they are — Docker handles those automatically.

**4. Start everything**
```bash
docker-compose up --build
```

That's it. On first run it fetches articles and processes them through Gemini automatically. Give it a minute, then open the dashboard.

**Dashboard:** http://localhost:8080
**API docs:** http://localhost:8000/docs

---

## Project structure

```
ai-news-aggregator/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # startup, CORS, lifespan
│       ├── core/config.py       # database connection
│       ├── models/article.py    # SQLAlchemy model
│       ├── routers/articles.py  # API endpoints
│       └── services/
│           ├── ai_service.py    # Gemini summarization + sentiment
│           ├── ingestion.py     # orchestrates the fetch → store → AI pipeline
│           └── news_sources.py  # NewsAPI and GNews fetchers
│
├── frontend/ai-news-aggregator/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── app/page.tsx         # main dashboard
│       ├── app/globals.css      # design system
│       ├── lib/api.ts           # API calls
│       └── types/index.ts       # TypeScript types
│
└── db/
    └── init.sql                 # initial schema (tables + indexes)
```

---

## API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/articles` | get articles, supports filters |
| `GET` | `/api/articles/{id}` | single article detail |
| `POST` | `/api/ingest` | manually trigger a fresh fetch + AI run |
| `GET` | `/api/stats` | counts and sentiment breakdown |

**Filter options for `/api/articles`:**
- `sentiment` — `positive`, `neutral`, or `negative`
- `source` — `newsapi` or `gnews`
- `search` — keyword in title or description
- `limit` / `offset` — pagination

**Manual refresh:**
```bash
curl -X POST http://localhost:8000/api/ingest
```
Or just click the **Sync** button on the dashboard.

---

## How the AI part works

When articles come in, the backend sends each one to Gemini with a prompt like:

> "Summarize this article in 2–3 sentences and classify its sentiment as positive, neutral, or negative. Return valid JSON."

Gemini returns both the summary and the sentiment in one call. The result gets saved back to the database and shown on the card immediately. If Gemini wraps the JSON in markdown code blocks (it sometimes does), the backend strips that out before parsing.

---

## Deployment

The project includes a `render.yaml` for one-click deployment on [Render](https://render.com) (free tier). See the deployment steps in the project report.

---

## Notes

- Free API tiers have rate limits — the app batches requests to stay within them
- The Render free tier spins down after 15 minutes of inactivity, so the first load after a gap takes ~30 seconds
- The `.env` file is gitignored — never commit real API keys
