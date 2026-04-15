import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadDailyReport, listDailyReports } from '@/src/storage/index';

/** Get the category CSS class */
function getCategoryBadgeClass(category: string): string {
  const map: Record<string, string> = {
    'Technology': 'badge-tech',
    'Science': 'badge-science',
    'News': 'badge-news',
    'Business': 'badge-business',
    'Health': 'badge-health',
    'Education': 'badge-education',
    'Entertainment': 'badge-entertainment',
    'Culture': 'badge-culture',
    'Environment': 'badge-environment',
    'Politics': 'badge-politics',
  };
  return map[category] || 'badge-general';
}

/** Get security score CSS class */
function getSecurityClass(score: number): string {
  if (score >= 80) return 'security-high';
  if (score >= 60) return 'security-medium';
  return 'security-low';
}

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const dates = await listDailyReports();
  return dates.map((date) => ({ date }));
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const report = await loadDailyReport(date);

  if (!report) {
    notFound();
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <h1>🌐 <span>Web Explorer</span></h1>
          <p>Daily Report - {date}</p>
          <nav className="nav-links">
            <Link href="/">← Home</Link>
            <Link href="/api/status">API Status</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <Link href="/" className="back-link">← Back to Index</Link>

        <h2 style={{ marginBottom: '10px' }}>📅 Report: {report.date}</h2>
        <p className="summary-text">{report.daySummary}</p>

        {/* Stats */}
        <div className="stats-grid" style={{ marginTop: '20px' }}>
          <div className="stat-card">
            <div className="value">{report.totalPagesCrawled}</div>
            <div className="label">Pages Crawled</div>
          </div>
          <div className="stat-card">
            <div className="value">{report.newSitesDiscovered}</div>
            <div className="label">Sites Discovered</div>
          </div>
          <div className="stat-card">
            <div className="value">{report.stats.avgResponseTimeMs}ms</div>
            <div className="label">Avg Response Time</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {report.stats.totalAttempted > 0
                ? Math.round((report.stats.successfulCrawls / report.stats.totalAttempted) * 100)
                : 0}%
            </div>
            <div className="label">Success Rate</div>
          </div>
        </div>

        {/* Content by Category */}
        {Object.entries(report.byCategory).map(([category, pages]) => (
          <section key={category} style={{ marginTop: '30px' }}>
            <h3>
              <span className={`badge ${getCategoryBadgeClass(category)}`}>{category}</span>
              {' '}({pages.length} pages)
            </h3>

            {pages.map((page) => (
              <div key={page.pageId} className="page-card">
                <h4>
                  <a href={page.url} target="_blank" rel="noopener noreferrer">
                    {page.title}
                  </a>
                </h4>
                <div style={{ marginBottom: '8px' }}>
                  <span className={`security-score ${getSecurityClass(page.securityScore)}`}>
                    Security: {page.securityScore}/100
                  </span>
                </div>
                <p className="summary-text">{page.shortSummary}</p>
                <details>
                  <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '0.85rem' }}>
                    Show detailed summary
                  </summary>
                  <p className="summary-text" style={{ marginTop: '8px' }}>{page.detailedSummary}</p>
                </details>
                <div className="keywords">
                  {page.topKeywords.map((kw) => (
                    <span key={kw} className="keyword-tag">{kw}</span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>

      <footer>
        <div className="container">
          <p>
            Web Explorer &copy; {new Date().getFullYear()} |{' '}
            <a href="https://github.com/curvelog/navigation-in-the-web" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
