/**
 * Tests for the reporter module (markdown generation)
 */

import { describe, it, expect } from 'vitest';
import {
  generateDailyMarkdown,
  generateSiteMarkdown,
  generateIndexMarkdown,
} from '../src/reporter/index';
import type { DailyReport, SiteRecord } from '../src/types/index';

describe('generateDailyMarkdown', () => {
  const mockReport: DailyReport = {
    date: '2026-01-15',
    daySummary: 'A great day of exploration.',
    totalPagesCrawled: 5,
    newSitesDiscovered: 3,
    byCategory: {
      'Technology': [{
        pageId: 'p1',
        url: 'https://example.com',
        title: 'Tech Article',
        shortSummary: 'About technology',
        detailedSummary: 'A detailed look at modern technology trends and developments.',
        topKeywords: ['tech', 'software'],
        category: 'Technology',
        securityScore: 85,
        summarizedAt: '2026-01-15T10:00:00Z',
      }],
    },
    pages: [{
      pageId: 'p1',
      url: 'https://example.com',
      title: 'Tech Article',
      shortSummary: 'About technology',
      detailedSummary: 'A detailed look at modern technology trends and developments.',
      topKeywords: ['tech', 'software'],
      category: 'Technology',
      securityScore: 85,
      summarizedAt: '2026-01-15T10:00:00Z',
    }],
    generatedAt: '2026-01-15T10:00:00Z',
    stats: {
      totalAttempted: 10,
      successfulCrawls: 5,
      failedCrawls: 5,
      blockedByRobots: 0,
      securityIssues: 0,
      avgResponseTimeMs: 200,
      totalDataBytes: 10000,
      durationSeconds: 30,
      categoriesFound: ['Technology'],
    },
  };

  it('should generate valid markdown with title', () => {
    const md = generateDailyMarkdown(mockReport);
    expect(md).toContain('# 🌐 Web Explorer - Daily Report: 2026-01-15');
  });

  it('should include summary section', () => {
    const md = generateDailyMarkdown(mockReport);
    expect(md).toContain('## 📊 Summary');
    expect(md).toContain('A great day of exploration.');
  });

  it('should include statistics table', () => {
    const md = generateDailyMarkdown(mockReport);
    expect(md).toContain('## 📈 Statistics');
    expect(md).toContain('Pages Crawled');
    expect(md).toContain('5');
  });

  it('should include category sections', () => {
    const md = generateDailyMarkdown(mockReport);
    expect(md).toContain('Technology');
    expect(md).toContain('Tech Article');
  });

  it('should include security scores', () => {
    const md = generateDailyMarkdown(mockReport);
    expect(md).toContain('85/100');
  });
});

describe('generateSiteMarkdown', () => {
  const mockSite: SiteRecord = {
    id: 'test-001',
    domain: 'example.com',
    baseUrl: 'https://example.com',
    title: 'Example Site',
    description: 'Test description',
    firstDiscovered: '2026-01-01',
    lastCrawled: '2026-01-15',
    crawlCount: 5,
    avgSecurityScore: 90,
    categories: ['Technology', 'Science'],
    summaryHistory: [
      { date: '2026-01-15', summary: 'Latest findings' },
      { date: '2026-01-14', summary: 'Previous findings' },
    ],
    status: 'active',
  };

  it('should generate markdown with site title', () => {
    const md = generateSiteMarkdown(mockSite);
    expect(md).toContain('# 🌐 Site Report: example.com');
  });

  it('should include site overview table', () => {
    const md = generateSiteMarkdown(mockSite);
    expect(md).toContain('example.com');
    expect(md).toContain('active');
    expect(md).toContain('2026-01-01');
  });

  it('should include summary history', () => {
    const md = generateSiteMarkdown(mockSite);
    expect(md).toContain('Summary History');
    expect(md).toContain('Latest findings');
    expect(md).toContain('Previous findings');
  });
});

describe('generateIndexMarkdown', () => {
  it('should generate index with dates table', () => {
    const dates = [
      { date: '2026-01-15', pageCount: 10, categories: ['Technology'] },
      { date: '2026-01-14', pageCount: 8, categories: ['Science'] },
    ];
    const md = generateIndexMarkdown(dates, 25);

    expect(md).toContain('# 🌐 Web Explorer - Index');
    expect(md).toContain('2026-01-15');
    expect(md).toContain('2026-01-14');
    expect(md).toContain('25');
  });

  it('should show empty state when no dates', () => {
    const md = generateIndexMarkdown([], 0);
    expect(md).toContain('No reports generated yet');
  });
});
