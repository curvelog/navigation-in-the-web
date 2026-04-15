/**
 * Utility functions for the Web Explorer system.
 * Includes URL validation, text processing, ID generation, and security helpers.
 */

import crypto from 'crypto';

/**
 * Generate a unique ID for a crawl record based on URL and timestamp.
 */
export function generateId(url: string, timestamp: string): string {
  const hash = crypto.createHash('sha256').update(`${url}:${timestamp}`).digest('hex');
  return hash.substring(0, 16);
}

/**
 * Generate a deterministic ID for a site based on its domain.
 */
export function generateSiteId(domain: string): string {
  const hash = crypto.createHash('sha256').update(domain).digest('hex');
  return hash.substring(0, 12);
}

/**
 * Validate and normalize a URL.
 * Returns null if the URL is invalid.
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    let url: URL;
    if (baseUrl) {
      url = new URL(rawUrl, baseUrl);
    } else {
      url = new URL(rawUrl);
    }

    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Remove fragments
    url.hash = '';

    // Remove trailing slash for consistency (except root)
    let normalized = url.toString();
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return null;
  }
}

/**
 * Extract the domain from a URL.
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is HTTPS.
 */
export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a URL matches any of the exclude patterns.
 */
export function matchesExcludePattern(url: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Check if a domain is in the exclude list.
 */
export function isDomainExcluded(url: string, excludedDomains: string[]): boolean {
  const domain = extractDomain(url);
  if (!domain) return true;
  return excludedDomains.some(excluded => 
    domain === excluded || domain.endsWith(`.${excluded}`)
  );
}

/**
 * Clean and truncate text content for storage.
 */
export function cleanText(text: string, maxLength: number = 10000): string {
  return text
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .replace(/[^\S\n]+/g, ' ')   // Collapse spaces (keep newlines)
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
    .trim()
    .substring(0, maxLength);
}

/**
 * Extract keywords from text content.
 * Simple TF-based keyword extraction.
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'was', 'are',
    'be', 'has', 'had', 'have', 'will', 'would', 'could', 'should', 'may',
    'can', 'do', 'does', 'did', 'not', 'no', 'so', 'if', 'than', 'too',
    'very', 'just', 'about', 'up', 'out', 'all', 'also', 'as', 'its',
    'been', 'were', 'being', 'when', 'who', 'which', 'what', 'where',
    'how', 'their', 'they', 'them', 'then', 'more', 'some', 'such',
    'only', 'other', 'into', 'over', 'after', 'before', 'between',
    'each', 'any', 'most', 'both', 'through', 'during', 'under',
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'es',
    'por', 'con', 'para', 'se', 'del', 'al', 'su', 'como', 'más',
    'pero', 'sus', 'ya', 'fue', 'este', 'ha', 'son', 'está',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Categorize content based on keywords and URL patterns.
 */
export function categorizeContent(url: string, text: string, title: string): string {
  const combined = `${url} ${title} ${text}`.toLowerCase();

  const categories: Record<string, string[]> = {
    'Technology': ['technology', 'software', 'programming', 'developer', 'code', 'api', 'tech', 'digital', 'computer', 'github', 'stack'],
    'Science': ['science', 'research', 'study', 'experiment', 'discovery', 'journal', 'scientific', 'physics', 'biology', 'chemistry'],
    'News': ['news', 'breaking', 'latest', 'report', 'politics', 'world', 'national', 'international'],
    'Business': ['business', 'market', 'stock', 'economy', 'finance', 'company', 'startup', 'investment'],
    'Health': ['health', 'medical', 'disease', 'treatment', 'hospital', 'doctor', 'mental', 'wellness'],
    'Education': ['education', 'learning', 'course', 'university', 'school', 'student', 'tutorial'],
    'Entertainment': ['entertainment', 'movie', 'music', 'game', 'sport', 'celebrity', 'film'],
    'Culture': ['culture', 'art', 'museum', 'history', 'literature', 'book', 'cultural'],
    'Environment': ['environment', 'climate', 'energy', 'sustainable', 'green', 'carbon', 'pollution'],
    'Politics': ['politics', 'government', 'election', 'policy', 'congress', 'parliament', 'democrat', 'republican'],
  };

  let bestCategory = 'General';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categories)) {
    const score = keywords.reduce((acc, kw) => {
      const regex = new RegExp(kw, 'gi');
      const matches = combined.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Calculate a security score for a page based on various factors.
 */
export function calculateSecurityScore(params: {
  isHttps: boolean;
  hasCSP: boolean;
  hasRobotsTxt: boolean;
  hasXFrameOptions: boolean;
  hasXContentType: boolean;
  hasStrictTransport: boolean;
}): number {
  let score = 0;

  if (params.isHttps) score += 30;           // HTTPS is critical
  if (params.hasCSP) score += 20;             // Content Security Policy
  if (params.hasRobotsTxt) score += 10;       // Has robots.txt
  if (params.hasXFrameOptions) score += 15;   // Clickjacking protection
  if (params.hasXContentType) score += 10;    // MIME sniffing protection
  if (params.hasStrictTransport) score += 15; // HSTS

  return score;
}

/**
 * Sanitize a string for safe file system usage.
 */
export function sanitizeForFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Sleep utility for crawl delays.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
