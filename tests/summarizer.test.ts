/**
 * Tests for the summarizer module
 */

import { describe, it, expect } from 'vitest';
import { summarizePage, generateDailyReport } from '../src/summarizer/index';
import type { CrawledPage, CrawlStats } from '../src/types/index';

function createMockPage(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    id: 'test-page-001',
    url: 'https://example.com/article',
    finalUrl: 'https://example.com/article',
    statusCode: 200,
    title: 'Test Article Title',
    description: 'A test article about technology and programming.',
    textContent: 'This is a significant article about modern software development. The latest trends in programming show a shift towards functional paradigms. New frameworks are being released every month, making it important for developers to stay updated. Cloud computing continues to grow as more companies migrate their infrastructure. Security remains a critical concern in the software industry.',
    links: ['https://example.com/link1', 'https://example.com/link2'],
    security: {
      isHttps: true,
      hasValidCert: true,
      csp: "default-src 'self'",
      hasRobotsTxt: true,
      allowedByCrawler: true,
      securityScore: 85,
      warnings: [],
    },
    crawledAt: '2026-01-15T10:00:00Z',
    language: 'en',
    contentType: 'text/html',
    responseTimeMs: 250,
    contentSize: 5000,
    keywords: ['software', 'development', 'programming', 'technology', 'security'],
    category: 'Technology',
    ...overrides,
  };
}

describe('summarizePage', () => {
  it('should generate a summary with required fields', () => {
    const page = createMockPage();
    const summary = summarizePage(page);

    expect(summary.pageId).toBe(page.id);
    expect(summary.url).toBe(page.url);
    expect(summary.title).toBe(page.title);
    expect(summary.shortSummary).toBeTruthy();
    expect(summary.detailedSummary).toBeTruthy();
    expect(summary.topKeywords.length).toBeGreaterThan(0);
    expect(summary.category).toBe('Technology');
    expect(summary.securityScore).toBe(85);
    expect(summary.summarizedAt).toBeTruthy();
  });

  it('should limit shortSummary to 300 characters', () => {
    const page = createMockPage({
      textContent: 'Long sentence '.repeat(100),
    });
    const summary = summarizePage(page);
    expect(summary.shortSummary.length).toBeLessThanOrEqual(300);
  });

  it('should limit detailedSummary to 1000 characters', () => {
    const page = createMockPage({
      textContent: 'Another long text sentence about various topics. '.repeat(100),
    });
    const summary = summarizePage(page);
    expect(summary.detailedSummary.length).toBeLessThanOrEqual(1000);
  });

  it('should include top keywords from the page', () => {
    const page = createMockPage({
      keywords: ['javascript', 'react', 'nodejs', 'typescript', 'web', 'development'],
    });
    const summary = summarizePage(page);
    expect(summary.topKeywords.length).toBeLessThanOrEqual(5);
  });
});

describe('generateDailyReport', () => {
  const mockStats: CrawlStats = {
    totalAttempted: 10,
    successfulCrawls: 8,
    failedCrawls: 2,
    blockedByRobots: 0,
    securityIssues: 1,
    avgResponseTimeMs: 300,
    totalDataBytes: 50000,
    durationSeconds: 60,
    categoriesFound: ['Technology', 'Science'],
  };

  it('should generate a report with date and summary', () => {
    const pages = [createMockPage()];
    const report = generateDailyReport('2026-01-15', pages, mockStats);

    expect(report.date).toBe('2026-01-15');
    expect(report.daySummary).toBeTruthy();
    expect(report.totalPagesCrawled).toBe(1);
    expect(report.pages.length).toBe(1);
    expect(report.generatedAt).toBeTruthy();
    expect(report.stats).toBe(mockStats);
  });

  it('should organize pages by category', () => {
    const pages = [
      createMockPage({ id: 'p1', category: 'Technology' }),
      createMockPage({ id: 'p2', category: 'Science', title: 'Science Article' }),
      createMockPage({ id: 'p3', category: 'Technology', title: 'Another Tech' }),
    ];
    const report = generateDailyReport('2026-01-15', pages, mockStats);

    expect(report.byCategory['Technology']?.length).toBe(2);
    expect(report.byCategory['Science']?.length).toBe(1);
  });

  it('should handle empty pages array', () => {
    const report = generateDailyReport('2026-01-15', [], mockStats);

    expect(report.totalPagesCrawled).toBe(0);
    expect(report.pages.length).toBe(0);
    expect(report.daySummary).toContain('No pages');
  });

  it('should count unique domains as new sites', () => {
    const pages = [
      createMockPage({ id: 'p1', url: 'https://example.com/a' }),
      createMockPage({ id: 'p2', url: 'https://example.com/b' }),
      createMockPage({ id: 'p3', url: 'https://other.com/c' }),
    ];
    const report = generateDailyReport('2026-01-15', pages, mockStats);

    expect(report.newSitesDiscovered).toBe(2); // example.com and other.com
  });
});
