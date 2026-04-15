/**
 * Tests for the storage module
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  ensureDirectories,
  saveDailyReport,
  loadDailyReport,
  listDailyReports,
  saveSiteRecord,
  loadSiteRecord,
  listSiteRecords,
  saveCrawlQueue,
  loadCrawlQueue,
  updateMasterIndex,
  loadMasterIndex,
} from '../src/storage/index';
import type { DailyReport, SiteRecord, CrawlQueue } from '../src/types/index';

// Use a temporary data directory for tests
const TEST_DATA_DIR = path.join(process.cwd(), 'data');

beforeAll(async () => {
  await ensureDirectories();
});

describe('Storage: Daily Reports', () => {
  const mockReport: DailyReport = {
    date: '2026-01-15',
    daySummary: 'Test day summary',
    totalPagesCrawled: 5,
    newSitesDiscovered: 3,
    byCategory: {
      'Technology': [{
        pageId: 'p1',
        url: 'https://example.com',
        title: 'Example',
        shortSummary: 'Short summary',
        detailedSummary: 'Detailed summary',
        topKeywords: ['test'],
        category: 'Technology',
        securityScore: 85,
        summarizedAt: '2026-01-15T10:00:00Z',
      }],
    },
    pages: [{
      pageId: 'p1',
      url: 'https://example.com',
      title: 'Example',
      shortSummary: 'Short summary',
      detailedSummary: 'Detailed summary',
      topKeywords: ['test'],
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

  it('should save and load a daily report', async () => {
    await saveDailyReport(mockReport);
    const loaded = await loadDailyReport('2026-01-15');
    expect(loaded).not.toBeNull();
    expect(loaded!.date).toBe('2026-01-15');
    expect(loaded!.totalPagesCrawled).toBe(5);
  });

  it('should return null for non-existent date', async () => {
    const loaded = await loadDailyReport('9999-12-31');
    expect(loaded).toBeNull();
  });

  it('should list daily reports', async () => {
    const dates = await listDailyReports();
    expect(dates).toContain('2026-01-15');
  });

  // Cleanup test data
  afterAll(async () => {
    try {
      await fs.unlink(path.join(TEST_DATA_DIR, 'daily', '2026-01-15.json'));
    } catch { /* ignore */ }
  });
});

describe('Storage: Site Records', () => {
  const mockSite: SiteRecord = {
    id: 'test-site-001',
    domain: 'example.com',
    baseUrl: 'https://example.com',
    title: 'Example Site',
    description: 'A test site',
    firstDiscovered: '2026-01-15',
    lastCrawled: '2026-01-15',
    crawlCount: 1,
    avgSecurityScore: 85,
    categories: ['Technology'],
    summaryHistory: [{ date: '2026-01-15', summary: 'Test summary' }],
    status: 'active',
  };

  it('should save and load a site record', async () => {
    await saveSiteRecord(mockSite);
    const loaded = await loadSiteRecord('test-site-001');
    expect(loaded).not.toBeNull();
    expect(loaded!.domain).toBe('example.com');
  });

  it('should return null for non-existent site', async () => {
    const loaded = await loadSiteRecord('non-existent');
    expect(loaded).toBeNull();
  });

  it('should list site records', async () => {
    const sites = await listSiteRecords();
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.some(s => s.id === 'test-site-001')).toBe(true);
  });

  afterAll(async () => {
    try {
      await fs.unlink(path.join(TEST_DATA_DIR, 'sites', 'test-site-001.json'));
    } catch { /* ignore */ }
  });
});

describe('Storage: Crawl Queue', () => {
  const mockQueue: CrawlQueue = {
    pending: [{
      url: 'https://example.com/next',
      depth: 1,
      sourceUrl: 'https://example.com',
      addedAt: '2026-01-15T10:00:00Z',
      priority: 1,
    }],
    completed: ['https://example.com'],
    failed: [],
    lastUpdated: '2026-01-15T10:00:00Z',
  };

  it('should save and load crawl queue', async () => {
    await saveCrawlQueue(mockQueue);
    const loaded = await loadCrawlQueue();
    expect(loaded).not.toBeNull();
    expect(loaded!.pending.length).toBe(1);
    expect(loaded!.completed.length).toBe(1);
  });

  afterAll(async () => {
    try {
      await fs.unlink(path.join(TEST_DATA_DIR, 'queue.json'));
    } catch { /* ignore */ }
  });
});

describe('Storage: Master Index', () => {
  it('should update and load master index', async () => {
    const index = await updateMasterIndex();
    expect(index).not.toBeNull();
    expect(index.lastUpdated).toBeTruthy();

    const loaded = await loadMasterIndex();
    expect(loaded).not.toBeNull();
    expect(loaded!.lastUpdated).toBeTruthy();
  });
});
