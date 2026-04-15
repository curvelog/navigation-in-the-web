/**
 * Core type definitions for the Web Explorer system.
 * These types define the data structures used throughout the crawler,
 * summarizer, storage, and reporting modules.
 */

/** Represents the security assessment of a crawled page */
export interface SecurityInfo {
  /** Whether the page uses HTTPS */
  isHttps: boolean;
  /** Whether the SSL certificate is valid */
  hasValidCert: boolean;
  /** Content Security Policy header if present */
  csp: string | null;
  /** Whether the site has a robots.txt */
  hasRobotsTxt: boolean;
  /** Whether we are allowed to crawl per robots.txt */
  allowedByCrawler: boolean;
  /** Security score from 0-100 */
  securityScore: number;
  /** Any security warnings found */
  warnings: string[];
}

/** Represents a single crawled web page */
export interface CrawledPage {
  /** Unique identifier for this crawl record */
  id: string;
  /** The URL that was crawled */
  url: string;
  /** The resolved/final URL after redirects */
  finalUrl: string;
  /** HTTP status code */
  statusCode: number;
  /** Page title */
  title: string;
  /** Meta description */
  description: string;
  /** Main text content extracted from the page */
  textContent: string;
  /** Links found on the page */
  links: string[];
  /** Security assessment */
  security: SecurityInfo;
  /** When this page was crawled (ISO 8601) */
  crawledAt: string;
  /** Content language if detected */
  language: string | null;
  /** Content type header */
  contentType: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Size of the response body in bytes */
  contentSize: number;
  /** Keywords extracted from content */
  keywords: string[];
  /** Category of the content (auto-detected) */
  category: string;
}

/** Summary of a single crawled page */
export interface PageSummary {
  /** Reference to the crawled page ID */
  pageId: string;
  /** The URL */
  url: string;
  /** Page title */
  title: string;
  /** Short summary (1-3 sentences) */
  shortSummary: string;
  /** Longer detailed summary */
  detailedSummary: string;
  /** Top keywords */
  topKeywords: string[];
  /** Content category */
  category: string;
  /** Security score */
  securityScore: number;
  /** When summarized */
  summarizedAt: string;
}

/** Daily report containing all crawled pages for a specific date */
export interface DailyReport {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Overall summary of the day's findings */
  daySummary: string;
  /** Total pages crawled */
  totalPagesCrawled: number;
  /** Total new sites discovered */
  newSitesDiscovered: number;
  /** Pages organized by category */
  byCategory: Record<string, PageSummary[]>;
  /** List of all page summaries */
  pages: PageSummary[];
  /** When this report was generated */
  generatedAt: string;
  /** Stats about the crawl */
  stats: CrawlStats;
}

/** Statistics about a crawl run */
export interface CrawlStats {
  /** Total URLs attempted */
  totalAttempted: number;
  /** Successful crawls */
  successfulCrawls: number;
  /** Failed crawls */
  failedCrawls: number;
  /** Blocked by robots.txt */
  blockedByRobots: number;
  /** Security issues found */
  securityIssues: number;
  /** Average response time */
  avgResponseTimeMs: number;
  /** Total data downloaded in bytes */
  totalDataBytes: number;
  /** Duration of the crawl in seconds */
  durationSeconds: number;
  /** Categories found */
  categoriesFound: string[];
}

/** Configuration for the crawler */
export interface CrawlerConfig {
  /** Seed URLs to start crawling from */
  seedUrls: string[];
  /** Maximum number of pages to crawl per run */
  maxPagesPerRun: number;
  /** Maximum crawl depth from seed URLs */
  maxDepth: number;
  /** Delay between requests in milliseconds */
  requestDelayMs: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** User agent string */
  userAgent: string;
  /** Whether to respect robots.txt */
  respectRobotsTxt: boolean;
  /** Domains to exclude */
  excludeDomains: string[];
  /** URL patterns to exclude */
  excludePatterns: RegExp[];
  /** Minimum security score to index a page (0-100) */
  minSecurityScore: number;
  /** GMT offset for daily scheduling (e.g., -3 for GMT-3) */
  gmtOffset: number;
  /** Maximum content size to process in bytes */
  maxContentSize: number;
  /** Whether to follow redirects */
  followRedirects: boolean;
  /** Maximum redirects to follow */
  maxRedirects: number;
  /** Content types to process */
  allowedContentTypes: string[];
}

/** Represents the state of the crawler queue */
export interface CrawlQueue {
  /** URLs pending to be crawled */
  pending: QueueEntry[];
  /** URLs that have been crawled */
  completed: string[];
  /** URLs that failed */
  failed: FailedEntry[];
  /** Last updated timestamp */
  lastUpdated: string;
}

/** Entry in the crawl queue */
export interface QueueEntry {
  /** URL to crawl */
  url: string;
  /** Depth from seed URL */
  depth: number;
  /** Source URL that linked to this */
  sourceUrl: string | null;
  /** When this was added to the queue */
  addedAt: string;
  /** Priority (lower = higher priority) */
  priority: number;
}

/** Entry for a failed crawl */
export interface FailedEntry {
  /** URL that failed */
  url: string;
  /** Error message */
  error: string;
  /** When the failure occurred */
  failedAt: string;
  /** Number of retry attempts */
  retryCount: number;
}

/** Site registry entry - long-term record of a discovered site */
export interface SiteRecord {
  /** Unique site ID */
  id: string;
  /** Domain of the site */
  domain: string;
  /** Base URL */
  baseUrl: string;
  /** Site title */
  title: string;
  /** Site description */
  description: string;
  /** When first discovered */
  firstDiscovered: string;
  /** When last crawled */
  lastCrawled: string;
  /** Number of times crawled */
  crawlCount: number;
  /** Average security score across crawls */
  avgSecurityScore: number;
  /** Categories of content found */
  categories: string[];
  /** History of summaries by date */
  summaryHistory: Array<{
    date: string;
    summary: string;
  }>;
  /** Current status */
  status: 'active' | 'inactive' | 'blocked' | 'error';
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/** Crawl job status */
export interface CrawlJobStatus {
  /** Job ID */
  jobId: string;
  /** Current status */
  status: 'idle' | 'running' | 'completed' | 'failed';
  /** Progress percentage */
  progress: number;
  /** Current URL being crawled */
  currentUrl: string | null;
  /** Pages crawled so far */
  pagesCrawled: number;
  /** When the job started */
  startedAt: string | null;
  /** When the job completed */
  completedAt: string | null;
  /** Error if failed */
  error: string | null;
}
