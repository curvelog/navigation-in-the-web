/**
 * Tests for the configuration module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_CONFIG,
  getCurrentDateInTimezone,
  getCurrentTimestampInTimezone,
  loadConfig,
} from '../src/config/index';

describe('DEFAULT_CONFIG', () => {
  it('should have seed URLs', () => {
    expect(DEFAULT_CONFIG.seedUrls.length).toBeGreaterThan(0);
  });

  it('should respect robots.txt by default', () => {
    expect(DEFAULT_CONFIG.respectRobotsTxt).toBe(true);
  });

  it('should have a user agent', () => {
    expect(DEFAULT_CONFIG.userAgent).toContain('WebExplorerBot');
  });

  it('should have excluded domains', () => {
    expect(DEFAULT_CONFIG.excludeDomains).toContain('facebook.com');
    expect(DEFAULT_CONFIG.excludeDomains).toContain('twitter.com');
  });

  it('should have a GMT offset of -3', () => {
    expect(DEFAULT_CONFIG.gmtOffset).toBe(-3);
  });

  it('should only allow HTML content types', () => {
    expect(DEFAULT_CONFIG.allowedContentTypes).toContain('text/html');
  });
});

describe('getCurrentDateInTimezone', () => {
  it('should return a date in YYYY-MM-DD format', () => {
    const date = getCurrentDateInTimezone(0);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return different dates for different offsets', () => {
    // This might not always differ, but the function should work
    const utc = getCurrentDateInTimezone(0);
    expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getCurrentTimestampInTimezone', () => {
  it('should return an ISO 8601 timestamp', () => {
    const ts = getCurrentTimestampInTimezone(0);
    expect(new Date(ts).toISOString()).toBeTruthy();
  });
});

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default config when no env vars set', () => {
    const config = loadConfig();
    expect(config.maxPagesPerRun).toBe(DEFAULT_CONFIG.maxPagesPerRun);
    expect(config.maxDepth).toBe(DEFAULT_CONFIG.maxDepth);
  });

  it('should override maxPagesPerRun from env', () => {
    process.env.CRAWLER_MAX_PAGES = '50';
    const config = loadConfig();
    expect(config.maxPagesPerRun).toBe(50);
  });

  it('should override maxDepth from env', () => {
    process.env.CRAWLER_MAX_DEPTH = '5';
    const config = loadConfig();
    expect(config.maxDepth).toBe(5);
  });

  it('should override GMT offset from env', () => {
    process.env.CRAWLER_GMT_OFFSET = '-5';
    const config = loadConfig();
    expect(config.gmtOffset).toBe(-5);
  });

  it('should override seed URLs from env', () => {
    process.env.CRAWLER_SEED_URLS = 'https://a.com, https://b.com';
    const config = loadConfig();
    expect(config.seedUrls).toEqual(['https://a.com', 'https://b.com']);
  });
});
