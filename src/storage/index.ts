/**
 * Storage Layer
 * 
 * Handles all file-based data persistence for the Web Explorer.
 * Data is stored as JSON files organized by date and site.
 * 
 * Directory structure:
 *   data/
 *     daily/
 *       YYYY-MM-DD.json          - Daily report
 *     sites/
 *       {site-id}.json           - Site registry records
 *     queue.json                 - Crawl queue state
 *     index.json                 - Master index of all dates and sites
 */

import fs from 'fs/promises';
import path from 'path';
import type {
  DailyReport,
  SiteRecord,
  CrawlQueue,
  CrawledPage,
  PageSummary,
} from '../types/index';
import { generateSiteId, extractDomain } from '../utils/index';

/** Base data directory */
const DATA_DIR = path.join(process.cwd(), 'data');
const DAILY_DIR = path.join(DATA_DIR, 'daily');
const SITES_DIR = path.join(DATA_DIR, 'sites');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

/** Master index structure */
interface MasterIndex {
  lastUpdated: string;
  totalDays: number;
  totalSites: number;
  dates: Array<{
    date: string;
    pageCount: number;
    categories: string[];
  }>;
  sites: Array<{
    id: string;
    domain: string;
    title: string;
    lastCrawled: string;
    crawlCount: number;
  }>;
}

/**
 * Ensure all required directories exist.
 */
export async function ensureDirectories(): Promise<void> {
  await fs.mkdir(DAILY_DIR, { recursive: true });
  await fs.mkdir(SITES_DIR, { recursive: true });
}

/**
 * Save a daily report to disk.
 */
export async function saveDailyReport(report: DailyReport): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(DAILY_DIR, `${report.date}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Load a daily report from disk.
 */
export async function loadDailyReport(date: string): Promise<DailyReport | null> {
  try {
    const filePath = path.join(DAILY_DIR, `${date}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as DailyReport;
  } catch {
    return null;
  }
}

/**
 * List all available daily report dates.
 */
export async function listDailyReports(): Promise<string[]> {
  try {
    await ensureDirectories();
    const files = await fs.readdir(DAILY_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse(); // Most recent first
  } catch {
    return [];
  }
}

/**
 * Save or update a site record.
 */
export async function saveSiteRecord(record: SiteRecord): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(SITES_DIR, `${record.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

/**
 * Load a site record.
 */
export async function loadSiteRecord(siteId: string): Promise<SiteRecord | null> {
  try {
    const filePath = path.join(SITES_DIR, `${siteId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as SiteRecord;
  } catch {
    return null;
  }
}

/**
 * List all site records.
 */
export async function listSiteRecords(): Promise<SiteRecord[]> {
  try {
    await ensureDirectories();
    const files = await fs.readdir(SITES_DIR);
    const records: SiteRecord[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(SITES_DIR, file), 'utf-8');
          records.push(JSON.parse(data) as SiteRecord);
        } catch {
          // Skip corrupt files
        }
      }
    }
    return records.sort((a, b) => b.lastCrawled.localeCompare(a.lastCrawled));
  } catch {
    return [];
  }
}

/**
 * Update or create site records from crawled pages.
 */
export async function updateSiteRecords(
  pages: CrawledPage[],
  summaries: PageSummary[],
  date: string
): Promise<void> {
  const summaryMap = new Map(summaries.map(s => [s.pageId, s]));

  // Group pages by domain
  const byDomain = new Map<string, CrawledPage[]>();
  for (const page of pages) {
    const domain = extractDomain(page.url);
    if (domain) {
      const existing = byDomain.get(domain) || [];
      existing.push(page);
      byDomain.set(domain, existing);
    }
  }

  for (const [domain, domainPages] of byDomain) {
    const siteId = generateSiteId(domain);
    let record = await loadSiteRecord(siteId);

    const firstPage = domainPages[0]!;
    const pageSummaries = domainPages
      .map(p => summaryMap.get(p.id))
      .filter((s): s is PageSummary => !!s);

    const combinedSummary = pageSummaries
      .map(s => s.shortSummary)
      .join(' | ');

    if (record) {
      // Update existing record
      record.lastCrawled = date;
      record.crawlCount += 1;
      record.avgSecurityScore = Math.round(
        (record.avgSecurityScore * (record.crawlCount - 1) +
          firstPage.security.securityScore) / record.crawlCount
      );
      record.categories = [
        ...new Set([...record.categories, ...domainPages.map(p => p.category)]),
      ];
      record.summaryHistory.push({ date, summary: combinedSummary });
      // Keep last 365 summaries
      if (record.summaryHistory.length > 365) {
        record.summaryHistory = record.summaryHistory.slice(-365);
      }
    } else {
      // Create new record
      record = {
        id: siteId,
        domain,
        baseUrl: `https://${domain}`,
        title: firstPage.title,
        description: firstPage.description,
        firstDiscovered: date,
        lastCrawled: date,
        crawlCount: 1,
        avgSecurityScore: firstPage.security.securityScore,
        categories: [...new Set(domainPages.map(p => p.category))],
        summaryHistory: [{ date, summary: combinedSummary }],
        status: 'active',
      };
    }

    await saveSiteRecord(record);
  }
}

/**
 * Save crawl queue state.
 */
export async function saveCrawlQueue(queue: CrawlQueue): Promise<void> {
  await ensureDirectories();
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
}

/**
 * Load crawl queue state.
 */
export async function loadCrawlQueue(): Promise<CrawlQueue | null> {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(data) as CrawlQueue;
  } catch {
    return null;
  }
}

/**
 * Update the master index file.
 */
export async function updateMasterIndex(): Promise<MasterIndex> {
  await ensureDirectories();

  const dates = await listDailyReports();
  const sites = await listSiteRecords();

  const dateEntries = [];
  for (const date of dates) {
    const report = await loadDailyReport(date);
    if (report) {
      dateEntries.push({
        date: report.date,
        pageCount: report.totalPagesCrawled,
        categories: Object.keys(report.byCategory),
      });
    }
  }

  const index: MasterIndex = {
    lastUpdated: new Date().toISOString(),
    totalDays: dates.length,
    totalSites: sites.length,
    dates: dateEntries,
    sites: sites.map(s => ({
      id: s.id,
      domain: s.domain,
      title: s.title,
      lastCrawled: s.lastCrawled,
      crawlCount: s.crawlCount,
    })),
  };

  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

/**
 * Load the master index.
 */
export async function loadMasterIndex(): Promise<MasterIndex | null> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data) as MasterIndex;
  } catch {
    return null;
  }
}
