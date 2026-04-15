import Link from 'next/link';
import { loadMasterIndex, listDailyReports, loadDailyReport } from '@/src/storage/index';

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

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  const index = await loadMasterIndex();
  const dates = await listDailyReports();

  // Load recent reports for display
  const recentReports = [];
  for (const date of dates.slice(0, 30)) {
    const report = await loadDailyReport(date);
    if (report) {
      recentReports.push(report);
    }
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <h1>🌐 <span>Web Explorer</span></h1>
          <p>Automated daily web discovery, exploration, and summarization</p>
          <nav className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/api/status">API Status</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="value">{index?.totalDays || 0}</div>
            <div className="label">Days Recorded</div>
          </div>
          <div className="stat-card">
            <div className="value">{index?.totalSites || 0}</div>
            <div className="label">Sites Discovered</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {recentReports.reduce((sum, r) => sum + r.totalPagesCrawled, 0)}
            </div>
            <div className="label">Total Pages</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {new Set(recentReports.flatMap(r => Object.keys(r.byCategory))).size}
            </div>
            <div className="label">Categories</div>
          </div>
        </div>

        {/* Date Index */}
        <h2 style={{ marginBottom: '20px' }}>📅 Daily Reports</h2>

        {recentReports.length === 0 ? (
          <div className="empty-state">
            <h2>No reports yet</h2>
            <p>The first daily crawl will generate reports automatically.</p>
            <p style={{ marginTop: '10px' }}>
              You can trigger a crawl manually via the <Link href="/api/crawl">API endpoint</Link>.
            </p>
          </div>
        ) : (
          <ul className="date-list">
            {recentReports.map((report) => (
              <li key={report.date} className="date-item">
                <Link href={`/day/${report.date}`}>
                  <h3>📅 {report.date}</h3>
                </Link>
                <p className="summary-text">{report.daySummary}</p>
                <div className="meta">
                  <strong>{report.totalPagesCrawled}</strong> pages crawled |{' '}
                  <strong>{report.newSitesDiscovered}</strong> sites |{' '}
                  {Object.keys(report.byCategory).map((cat) => (
                    <span key={cat} className={`badge ${getCategoryBadgeClass(cat)}`}>
                      {cat}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
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
