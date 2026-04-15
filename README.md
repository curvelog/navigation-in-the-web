# 🌐 Web Explorer

**Automated Daily Web Discovery, Exploration, and Summarization System**

Web Explorer is an autonomous web crawler that daily discovers, processes, and summarizes content from across the web. It generates date-indexed reports with summaries for each discovered site, building a growing knowledge base of web content over time.

## 🎯 Key Features

- **Daily Automated Crawling**: Scheduled via GitHub Actions (06:00 UTC / 03:00 GMT-3)
- **Security-First**: Only processes HTTPS sites, respects robots.txt, validates security headers
- **Content Summarization**: Extractive summarization of crawled pages (no external APIs needed)
- **Category Detection**: Automatic content categorization (Technology, Science, News, Business, etc.)
- **Date-Indexed Reports**: Daily JSON reports organized by date
- **Site Registry**: Long-term tracking of discovered sites with summary history
- **Web Interface**: Next.js frontend with dark theme, deployed to Vercel
- **API Endpoints**: RESTful API for triggering crawls and checking status
- **Extensible Architecture**: Modular design ready for future enhancements

## 📁 Project Structure

```
navigation-in-the-web/
├── app/                        # Next.js App Router (frontend)
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (date index)
│   ├── globals.css             # Global styles
│   ├── api/
│   │   ├── crawl/route.ts      # POST: trigger crawl, GET: status
│   │   └── status/route.ts     # System status endpoint
│   ├── day/[date]/page.tsx     # Daily report detail page
│   └── site/[id]/page.tsx      # Individual site detail page
├── src/
│   ├── main.ts                 # Main orchestrator (CLI & API entry)
│   ├── types/index.ts          # TypeScript type definitions
│   ├── config/index.ts         # Configuration (seed URLs, settings)
│   ├── crawler/index.ts        # Web crawler engine
│   ├── summarizer/index.ts     # Content summarizer
│   ├── storage/index.ts        # File-based data persistence
│   ├── reporter/index.ts       # Markdown report generator
│   └── utils/index.ts          # Utility functions
├── data/                       # Crawl data (auto-generated)
│   ├── daily/                  # Daily reports (YYYY-MM-DD.json)
│   ├── sites/                  # Site records ({id}.json)
│   ├── index.json              # Master index
│   └── queue.json              # Crawl queue state
├── tests/                      # Test suite
├── .github/workflows/          # GitHub Actions
│   └── daily-crawl.yml         # Daily crawl schedule
├── vercel.json                 # Vercel deployment config
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── vitest.config.ts            # Test configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/curvelog/navigation-in-the-web.git
cd navigation-in-the-web
npm install
```

### Run a Crawl (CLI)

```bash
npm run crawl
```

### Start the Web Interface

```bash
npm run dev
# Open http://localhost:3000
```

### Run Tests

```bash
npm test
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRAWLER_MAX_PAGES` | `100` | Maximum pages to crawl per run |
| `CRAWLER_MAX_DEPTH` | `2` | Maximum crawl depth from seed URLs |
| `CRAWLER_DELAY_MS` | `2000` | Delay between requests (ms) |
| `CRAWLER_GMT_OFFSET` | `-3` | GMT offset for daily scheduling |
| `CRAWLER_SEED_URLS` | See config | Comma-separated seed URLs |
| `CRAWLER_MIN_SECURITY_SCORE` | `50` | Minimum security score to index |
| `CRAWLER_API_KEY` | *(none)* | API key for `/api/crawl` endpoint |

### Seed URLs

Default seed URLs include major news, technology, science, and reference sites. Customize via the `CRAWLER_SEED_URLS` environment variable or by editing `src/config/index.ts`.

## 🔒 Security Standards

- **HTTPS Only**: By default, only HTTPS pages are processed
- **robots.txt Compliance**: Fully respects robots.txt directives
- **Rate Limiting**: Configurable delay between requests (default: 2s)
- **Content Sanitization**: All extracted content is sanitized with `sanitize-html`
- **Security Scoring**: Each page receives a security score (0-100) based on:
  - HTTPS usage (30 points)
  - Content Security Policy (20 points)
  - X-Frame-Options (15 points)
  - Strict-Transport-Security (15 points)
  - X-Content-Type-Options (10 points)
  - robots.txt presence (10 points)
- **Security Headers**: The web interface sets strict security headers
- **Input Validation**: All URLs are validated and normalized before processing
- **No External Data Sharing**: Summarization is done locally, no data sent to APIs

## 📊 API Reference

### `POST /api/crawl`
Trigger a new crawl job.

**Headers:**
- `Authorization: Bearer <API_KEY>` (if `CRAWLER_API_KEY` is set)

**Response:**
```json
{
  "success": true,
  "message": "Crawl job started",
  "status": { ... }
}
```

### `GET /api/crawl`
Get current crawl job status.

### `GET /api/status`
Get system status including index statistics.

## 🔄 GitHub Actions

The daily crawl runs automatically via GitHub Actions:
- **Schedule**: Every day at 06:00 UTC (03:00 GMT-3)
- **Manual trigger**: Available via `workflow_dispatch`
- **Auto-commit**: Results are committed to the `data/` directory

## 🌍 Vercel Deployment

1. Connect the repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy - the web interface will be live
4. Optionally configure Vercel Cron Jobs for server-side crawling

## 📋 Architecture

### Crawl Pipeline

```
1. Load Config → 2. Load Queue → 3. Crawl Pages → 4. Summarize
                                       ↓
5. Generate Daily Report → 6. Update Site Records → 7. Save Data → 8. Update Index
```

### Data Flow

```
Seed URLs → Crawler → Security Check → Content Extraction → Summarization
                                              ↓
                                     Daily Report (JSON)
                                              ↓
                                     Site Records (JSON)
                                              ↓
                                     Master Index (JSON)
                                              ↓
                                     Web Frontend (Next.js)
```

## 🗺️ Roadmap (Year-long Plan)

### Phase 1 (Months 1-2): Foundation ✅
- [x] Core crawler engine with security validation
- [x] Extractive summarization
- [x] File-based storage with date indexing
- [x] Next.js web interface
- [x] GitHub Actions daily automation
- [x] Vercel deployment support
- [x] Test suite

### Phase 2 (Months 3-4): Enhanced Discovery
- [ ] Intelligent URL prioritization (PageRank-like scoring)
- [ ] Multi-language content detection and summarization
- [ ] RSS feed integration for real-time content discovery
- [ ] Sitemap.xml parsing for deeper crawling
- [ ] Duplicate content detection

### Phase 3 (Months 5-6): Search Engine
- [ ] Full-text search index (Lunr.js or similar)
- [ ] Search API endpoint
- [ ] Search UI with filters (date, category, keyword)
- [ ] Auto-complete suggestions
- [ ] Related content recommendations

### Phase 4 (Months 7-8): AI Enhancement
- [ ] AI-powered abstractive summarization (optional OpenAI/Anthropic integration)
- [ ] Topic clustering and trend detection
- [ ] Sentiment analysis
- [ ] Named entity recognition
- [ ] Content change detection

### Phase 5 (Months 9-10): Scale & Performance
- [ ] Database migration (SQLite or PostgreSQL)
- [ ] Distributed crawling support
- [ ] CDN-backed image/preview caching
- [ ] Incremental static regeneration
- [ ] Rate limit management per domain

### Phase 6 (Months 11-12): Advanced Features
- [ ] User accounts and personalization
- [ ] Custom crawl targets per user
- [ ] Email/notification digests
- [ ] API access with rate limiting
- [ ] Analytics dashboard
- [ ] Export functionality (PDF, CSV, RSS)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

ISC License - See [LICENSE](LICENSE) for details.

---

*Built with ❤️ as an automated web exploration system*
