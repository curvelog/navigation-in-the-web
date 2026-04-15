import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadSiteRecord, listSiteRecords } from '@/src/storage/index';

/** Get security score CSS class */
function getSecurityClass(score: number): string {
  if (score >= 80) return 'security-high';
  if (score >= 60) return 'security-medium';
  return 'security-low';
}

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const sites = await listSiteRecords();
  return sites.map((site) => ({ id: site.id }));
}

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await loadSiteRecord(id);

  if (!site) {
    notFound();
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <h1>🌐 <span>Web Explorer</span></h1>
          <p>Site Detail - {site.domain}</p>
          <nav className="nav-links">
            <Link href="/">← Home</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <Link href="/" className="back-link">← Back to Index</Link>

        <h2 style={{ marginBottom: '10px' }}>
          🌍 {site.title || site.domain}
        </h2>
        <p className="summary-text">{site.description || 'No description available'}</p>

        {/* Site Info */}
        <div className="stats-grid" style={{ marginTop: '20px' }}>
          <div className="stat-card">
            <div className="value">
              <a href={site.baseUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1rem' }}>
                {site.domain}
              </a>
            </div>
            <div className="label">Domain</div>
          </div>
          <div className="stat-card">
            <div className="value">{site.crawlCount}</div>
            <div className="label">Times Crawled</div>
          </div>
          <div className="stat-card">
            <div className="value">
              <span className={`security-score ${getSecurityClass(site.avgSecurityScore)}`}>
                {site.avgSecurityScore}/100
              </span>
            </div>
            <div className="label">Avg Security Score</div>
          </div>
          <div className="stat-card">
            <div className="value" style={{ fontSize: '1rem' }}>{site.status}</div>
            <div className="label">Status</div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <p className="meta">
            <strong>First Discovered:</strong> {site.firstDiscovered} |{' '}
            <strong>Last Crawled:</strong> {site.lastCrawled}
          </p>
          <p className="meta" style={{ marginTop: '8px' }}>
            <strong>Categories:</strong> {site.categories.join(', ')}
          </p>
        </div>

        {/* Summary History */}
        {site.summaryHistory.length > 0 && (
          <section style={{ marginTop: '30px' }}>
            <h3>📜 Summary History</h3>
            {site.summaryHistory.slice().reverse().map((entry, i) => (
              <div key={i} className="page-card">
                <h4>{entry.date}</h4>
                <p className="summary-text">{entry.summary}</p>
              </div>
            ))}
          </section>
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
