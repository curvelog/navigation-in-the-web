/**
 * Web Crawler Engine
 * 
 * Responsible for:
 * - Fetching web pages with proper security headers
 * - Respecting robots.txt
 * - Extracting text content and links using Cheerio
 * - Assessing page security
 * - Managing the crawl queue with depth-limited BFS
 * 
 * Security standards:
 * - Only processes HTTPS pages by default
 * - Validates all URLs before fetching
 * - Respects robots.txt directives
 * - Rate-limits requests
 * - Sanitizes all extracted content
 * - Follows redirect chains safely
 */

import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import type {
  CrawledPage,
  CrawlerConfig,
  SecurityInfo,
  CrawlQueue,
  QueueEntry,
  CrawlStats,
} from '../types/index';
import {
  generateId,
  normalizeUrl,
  extractDomain,
  isHttps,
  matchesExcludePattern,
  isDomainExcluded,
  cleanText,
  extractKeywords,
  categorizeContent,
  calculateSecurityScore,
  sleep,
} from '../utils/index';
import { DEFAULT_CONFIG } from '../config/index';

/**
 * Fetch robots.txt for a domain and check if crawling is allowed.
 */
async function checkRobotsTxt(
  url: string,
  userAgent: string
): Promise<{ hasRobotsTxt: boolean; allowed: boolean }> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      // No robots.txt or can't fetch = allowed
      return { hasRobotsTxt: false, allowed: true };
    }

    const robotsText = await response.text();
    const robotsParser = await import('robots-parser');
    const robots = robotsParser.default(robotsUrl, robotsText);
    const allowed = robots.isAllowed(url, userAgent) ?? true;

    return { hasRobotsTxt: true, allowed };
  } catch {
    // If we can't check, assume allowed but note no robots.txt
    return { hasRobotsTxt: false, allowed: true };
  }
}

/**
 * Assess the security of a fetched page based on response headers and URL.
 */
function assessSecurity(
  url: string,
  headers: Headers,
  robotsInfo: { hasRobotsTxt: boolean; allowed: boolean }
): SecurityInfo {
  const warnings: string[] = [];
  const urlIsHttps = isHttps(url);

  if (!urlIsHttps) {
    warnings.push('Page is not served over HTTPS');
  }

  const csp = headers.get('content-security-policy');
  const xFrameOptions = headers.get('x-frame-options');
  const xContentType = headers.get('x-content-type-options');
  const strictTransport = headers.get('strict-transport-security');

  if (!csp) warnings.push('No Content-Security-Policy header');
  if (!xFrameOptions) warnings.push('No X-Frame-Options header');
  if (!xContentType) warnings.push('No X-Content-Type-Options header');
  if (!strictTransport) warnings.push('No Strict-Transport-Security header');

  const securityScore = calculateSecurityScore({
    isHttps: urlIsHttps,
    hasCSP: !!csp,
    hasRobotsTxt: robotsInfo.hasRobotsTxt,
    hasXFrameOptions: !!xFrameOptions,
    hasXContentType: !!xContentType,
    hasStrictTransport: !!strictTransport,
  });

  return {
    isHttps: urlIsHttps,
    hasValidCert: urlIsHttps, // If fetch succeeded over HTTPS, cert is valid
    csp,
    hasRobotsTxt: robotsInfo.hasRobotsTxt,
    allowedByCrawler: robotsInfo.allowed,
    securityScore,
    warnings,
  };
}

/**
 * Extract text content and metadata from HTML using Cheerio.
 */
function extractContent(html: string, url: string): {
  title: string;
  description: string;
  textContent: string;
  links: string[];
  language: string | null;
} {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer, and other non-content elements
  $('script, style, nav, footer, header, aside, iframe, noscript, svg').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('.nav, .navbar, .footer, .sidebar, .ad, .advertisement, .cookie-banner').remove();

  const title = $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    'Untitled';

  const description = $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const language = $('html').attr('lang') ||
    $('meta[http-equiv="content-language"]').attr('content') ||
    null;

  // Extract main text content
  const mainContent = $('main, article, [role="main"], .content, .post, .entry').text() ||
    $('body').text();
  const textContent = cleanText(mainContent);

  // Extract and normalize links
  const links: string[] = [];
  const seen = new Set<string>();
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    if (href) {
      const normalized = normalizeUrl(href, url);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }
    }
  });

  return { title, description, textContent, links, language };
}

/**
 * Fetch and process a single URL.
 */
export async function crawlPage(
  url: string,
  config: CrawlerConfig = DEFAULT_CONFIG
): Promise<CrawledPage | null> {
  const startTime = Date.now();

  try {
    // Validate URL
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return null;
    }

    // Check domain exclusions
    if (isDomainExcluded(normalized, config.excludeDomains)) {
      return null;
    }

    // Check URL pattern exclusions
    if (matchesExcludePattern(normalized, config.excludePatterns)) {
      return null;
    }

    // Check robots.txt if configured
    let robotsInfo = { hasRobotsTxt: false, allowed: true };
    if (config.respectRobotsTxt) {
      robotsInfo = await checkRobotsTxt(normalized, config.userAgent);
      if (!robotsInfo.allowed) {
        return null;
      }
    }

    // Fetch the page
    const response = await fetch(normalized, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
      },
      redirect: config.followRedirects ? 'follow' : 'manual',
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });

    if (!response.ok) {
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    const isAllowedType = config.allowedContentTypes.some(
      type => contentType.toLowerCase().includes(type)
    );
    if (!isAllowedType) {
      return null;
    }

    // Get response body
    const html = await response.text();
    const contentSize = new TextEncoder().encode(html).length;

    if (contentSize > config.maxContentSize) {
      return null;
    }

    // Assess security
    const security = assessSecurity(normalized, response.headers, robotsInfo);

    // Skip pages below minimum security score
    if (security.securityScore < config.minSecurityScore) {
      return null;
    }

    // Extract content
    const { title, description, textContent, links, language } = extractContent(html, normalized);

    // Sanitize title and description
    const safeTitle = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
    const safeDescription = sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} });

    const responseTimeMs = Date.now() - startTime;
    const crawledAt = new Date().toISOString();
    const keywords = extractKeywords(textContent);
    const category = categorizeContent(normalized, textContent, safeTitle);

    const page: CrawledPage = {
      id: generateId(normalized, crawledAt),
      url: normalized,
      finalUrl: response.url || normalized,
      statusCode: response.status,
      title: safeTitle,
      description: safeDescription,
      textContent,
      links: links.slice(0, 100), // Limit links stored
      security,
      crawledAt,
      language,
      contentType,
      responseTimeMs,
      contentSize,
      keywords,
      category,
    };

    return page;
  } catch (error) {
    // Log but don't throw - crawl errors are expected
    console.error(`[Crawler] Error crawling ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Run a full crawl session starting from seed URLs.
 * Uses breadth-first traversal with depth limiting.
 */
export async function runCrawlSession(
  config: CrawlerConfig = DEFAULT_CONFIG,
  existingQueue?: CrawlQueue
): Promise<{ pages: CrawledPage[]; queue: CrawlQueue; stats: CrawlStats }> {
  const startTime = Date.now();
  const pages: CrawledPage[] = [];
  const completed = new Set<string>(existingQueue?.completed || []);
  const failed: Array<{ url: string; error: string; failedAt: string; retryCount: number }> = [];

  // Initialize queue
  const queue: QueueEntry[] = existingQueue?.pending || config.seedUrls.map(url => ({
    url,
    depth: 0,
    sourceUrl: null,
    addedAt: new Date().toISOString(),
    priority: 0,
  }));

  let totalAttempted = 0;
  let blockedByRobots = 0;
  let securityIssues = 0;
  let totalResponseTime = 0;
  let totalDataBytes = 0;

  // Process queue with BFS
  while (queue.length > 0 && pages.length < config.maxPagesPerRun) {
    // Sort by priority (lower first) then by depth (shallower first)
    queue.sort((a, b) => a.priority - b.priority || a.depth - b.depth);

    const entry = queue.shift()!;
    const normalizedUrl = normalizeUrl(entry.url);

    if (!normalizedUrl || completed.has(normalizedUrl)) {
      continue;
    }

    completed.add(normalizedUrl);
    totalAttempted++;

    // Polite crawl delay
    if (totalAttempted > 1) {
      await sleep(config.requestDelayMs);
    }

    console.log(`[Crawler] (${pages.length + 1}/${config.maxPagesPerRun}) Crawling: ${normalizedUrl}`);

    const page = await crawlPage(normalizedUrl, config);

    if (page) {
      pages.push(page);
      totalResponseTime += page.responseTimeMs;
      totalDataBytes += page.contentSize;

      if (page.security.securityScore < 70) {
        securityIssues++;
      }

      // Add discovered links to queue (if within depth limit)
      if (entry.depth < config.maxDepth) {
        for (const link of page.links) {
          const normalizedLink = normalizeUrl(link);
          if (normalizedLink && !completed.has(normalizedLink)) {
            if (!isDomainExcluded(normalizedLink, config.excludeDomains) &&
                !matchesExcludePattern(normalizedLink, config.excludePatterns)) {
              queue.push({
                url: normalizedLink,
                depth: entry.depth + 1,
                sourceUrl: normalizedUrl,
                addedAt: new Date().toISOString(),
                priority: entry.depth + 1, // Deeper = lower priority
              });
            }
          }
        }
      }
    } else {
      failed.push({
        url: normalizedUrl,
        error: 'Crawl returned null (excluded, blocked, or error)',
        failedAt: new Date().toISOString(),
        retryCount: 0,
      });
    }
  }

  const durationSeconds = (Date.now() - startTime) / 1000;
  const categoriesFound = [...new Set(pages.map(p => p.category))];

  const stats: CrawlStats = {
    totalAttempted,
    successfulCrawls: pages.length,
    failedCrawls: failed.length,
    blockedByRobots,
    securityIssues,
    avgResponseTimeMs: pages.length > 0 ? Math.round(totalResponseTime / pages.length) : 0,
    totalDataBytes,
    durationSeconds,
    categoriesFound,
  };

  const crawlQueue: CrawlQueue = {
    pending: queue.slice(0, 1000), // Keep top 1000 pending URLs for next run
    completed: Array.from(completed),
    failed,
    lastUpdated: new Date().toISOString(),
  };

  return { pages, queue: crawlQueue, stats };
}
