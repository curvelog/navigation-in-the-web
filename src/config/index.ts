/**
 * Default configuration for the Web Explorer crawler.
 * 
 * This configuration follows the highest security standards:
 * - Respects robots.txt by default
 * - Uses a polite crawl delay
 * - Identifies itself with a proper user agent
 * - Only processes HTTPS sites by default
 * - Excludes known problematic domains
 * 
 * GMT Offset: UTC-3 (Argentina/Buenos Aires) for daily scheduling
 */

import type { CrawlerConfig } from '../types/index';

/** Default crawler configuration */
export const DEFAULT_CONFIG: CrawlerConfig = {
  seedUrls: [
    // Major news & information sources
    'https://news.ycombinator.com',
    'https://www.reuters.com',
    'https://www.bbc.com/news',
    'https://www.theguardian.com',
    'https://www.npr.org',
    // Technology
    'https://techcrunch.com',
    'https://arstechnica.com',
    'https://www.theverge.com',
    'https://dev.to',
    'https://github.com/trending',
    // Science
    'https://www.nature.com',
    'https://www.sciencedaily.com',
    'https://www.newscientist.com',
    // Open data & reference
    'https://www.wikipedia.org',
    'https://data.gov',
    // International
    'https://www.infobae.com',
    'https://www.clarin.com',
    'https://www.lanacion.com.ar',
  ],

  maxPagesPerRun: 100,
  maxDepth: 2,
  requestDelayMs: 2000,
  requestTimeoutMs: 30000,
  userAgent: 'WebExplorerBot/1.0 (+https://github.com/curvelog/navigation-in-the-web; responsible-crawler)',
  respectRobotsTxt: true,

  excludeDomains: [
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    // Exclude social media that blocks crawlers
    'pinterest.com',
    'snapchat.com',
    // Exclude sites requiring authentication
    'gmail.com',
    'outlook.com',
    'mail.yahoo.com',
  ],

  excludePatterns: [
    /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff)$/i,
    /\.(mp3|mp4|avi|mkv|webm|ogg|wav|flac)$/i,
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)$/i,
    /\.(css|js|woff|woff2|ttf|eot)$/i,
    /\/login\b/i,
    /\/signup\b/i,
    /\/register\b/i,
    /\/auth\b/i,
    /\/admin\b/i,
    /\/cart\b/i,
    /\/checkout\b/i,
    /\/account\b/i,
    /\?.*password/i,
    /\?.*token/i,
  ],

  minSecurityScore: 50,
  gmtOffset: -3, // GMT-3 (Buenos Aires, Argentina)
  maxContentSize: 5 * 1024 * 1024, // 5MB
  followRedirects: true,
  maxRedirects: 5,

  allowedContentTypes: [
    'text/html',
    'application/xhtml+xml',
  ],
};

/**
 * Get the current date string in the configured timezone.
 */
export function getCurrentDateInTimezone(gmtOffset: number = DEFAULT_CONFIG.gmtOffset): string {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localMs = utcMs + (gmtOffset * 3600000);
  const localDate = new Date(localMs);
  return localDate.toISOString().split('T')[0]!;
}

/**
 * Get the current timestamp in the configured timezone.
 */
export function getCurrentTimestampInTimezone(gmtOffset: number = DEFAULT_CONFIG.gmtOffset): string {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localMs = utcMs + (gmtOffset * 3600000);
  return new Date(localMs).toISOString();
}

/**
 * Load configuration from environment variables, merging with defaults.
 */
export function loadConfig(): CrawlerConfig {
  const config = { ...DEFAULT_CONFIG };

  if (process.env.CRAWLER_MAX_PAGES) {
    config.maxPagesPerRun = parseInt(process.env.CRAWLER_MAX_PAGES, 10);
  }
  if (process.env.CRAWLER_MAX_DEPTH) {
    config.maxDepth = parseInt(process.env.CRAWLER_MAX_DEPTH, 10);
  }
  if (process.env.CRAWLER_DELAY_MS) {
    config.requestDelayMs = parseInt(process.env.CRAWLER_DELAY_MS, 10);
  }
  if (process.env.CRAWLER_GMT_OFFSET) {
    config.gmtOffset = parseInt(process.env.CRAWLER_GMT_OFFSET, 10);
  }
  if (process.env.CRAWLER_SEED_URLS) {
    config.seedUrls = process.env.CRAWLER_SEED_URLS.split(',').map(u => u.trim());
  }
  if (process.env.CRAWLER_MIN_SECURITY_SCORE) {
    config.minSecurityScore = parseInt(process.env.CRAWLER_MIN_SECURITY_SCORE, 10);
  }

  return config;
}
