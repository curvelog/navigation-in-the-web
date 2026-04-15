/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateSiteId,
  normalizeUrl,
  extractDomain,
  isHttps,
  matchesExcludePattern,
  isDomainExcluded,
  cleanText,
  extractKeywords,
  categorizeContent,
  calculateSecurityScore,
  sanitizeForFilename,
  truncate,
  formatBytes,
} from '../src/utils/index';

describe('generateId', () => {
  it('should generate a 16-character hex string', () => {
    const id = generateId('https://example.com', '2026-01-01T00:00:00Z');
    expect(id).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = generateId('https://example.com', '2026-01-01T00:00:00Z');
    const id2 = generateId('https://other.com', '2026-01-01T00:00:00Z');
    expect(id1).not.toBe(id2);
  });

  it('should be deterministic', () => {
    const id1 = generateId('https://example.com', '2026-01-01T00:00:00Z');
    const id2 = generateId('https://example.com', '2026-01-01T00:00:00Z');
    expect(id1).toBe(id2);
  });
});

describe('generateSiteId', () => {
  it('should generate a 12-character hex string', () => {
    const id = generateSiteId('example.com');
    expect(id).toHaveLength(12);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });
});

describe('normalizeUrl', () => {
  it('should return null for invalid URLs', () => {
    expect(normalizeUrl('not-a-url')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
  });

  it('should accept http and https URLs', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('should reject non-http protocols', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('should remove fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('should resolve relative URLs with a base', () => {
    expect(normalizeUrl('/page', 'https://example.com')).toBe('https://example.com/page');
    expect(normalizeUrl('sub/page', 'https://example.com/base/')).toBe('https://example.com/base/sub/page');
  });

  it('should remove trailing slash except for root', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
  });
});

describe('extractDomain', () => {
  it('should extract the hostname', () => {
    expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
    expect(extractDomain('https://example.com')).toBe('example.com');
  });

  it('should return null for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBeNull();
  });
});

describe('isHttps', () => {
  it('should return true for HTTPS URLs', () => {
    expect(isHttps('https://example.com')).toBe(true);
  });

  it('should return false for HTTP URLs', () => {
    expect(isHttps('http://example.com')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isHttps('not-a-url')).toBe(false);
  });
});

describe('matchesExcludePattern', () => {
  const patterns = [/\.jpg$/i, /\/login\b/i, /\/admin\b/i];

  it('should match URLs that contain excluded patterns', () => {
    expect(matchesExcludePattern('https://example.com/image.jpg', patterns)).toBe(true);
    expect(matchesExcludePattern('https://example.com/login', patterns)).toBe(true);
  });

  it('should not match clean URLs', () => {
    expect(matchesExcludePattern('https://example.com/article', patterns)).toBe(false);
  });
});

describe('isDomainExcluded', () => {
  const excluded = ['facebook.com', 'twitter.com'];

  it('should exclude listed domains', () => {
    expect(isDomainExcluded('https://facebook.com/page', excluded)).toBe(true);
    expect(isDomainExcluded('https://www.facebook.com/page', excluded)).toBe(true);
  });

  it('should not exclude unlisted domains', () => {
    expect(isDomainExcluded('https://example.com', excluded)).toBe(false);
  });

  it('should return true for invalid URLs', () => {
    expect(isDomainExcluded('not-a-url', excluded)).toBe(true);
  });
});

describe('cleanText', () => {
  it('should normalize whitespace', () => {
    expect(cleanText('hello    world')).toBe('hello world');
  });

  it('should truncate to maxLength', () => {
    const long = 'a'.repeat(20000);
    expect(cleanText(long, 100).length).toBe(100);
  });

  it('should trim', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });
});

describe('extractKeywords', () => {
  it('should extract common words as keywords', () => {
    const text = 'technology software programming development technology software programming';
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('technology');
    expect(keywords).toContain('software');
  });

  it('should filter out stop words', () => {
    const text = 'the and but for technology';
    const keywords = extractKeywords(text);
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('and');
  });

  it('should limit to maxKeywords', () => {
    const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
    const keywords = extractKeywords(text, 5);
    expect(keywords.length).toBeLessThanOrEqual(5);
  });
});

describe('categorizeContent', () => {
  it('should detect technology content', () => {
    expect(categorizeContent('https://dev.to', 'software programming code developer', 'Dev Community')).toBe('Technology');
  });

  it('should detect science content', () => {
    expect(categorizeContent('https://nature.com', 'research study scientific discovery journal', 'Nature')).toBe('Science');
  });

  it('should detect news content', () => {
    expect(categorizeContent('https://bbc.com', 'breaking news latest report world', 'BBC News')).toBe('News');
  });

  it('should return General for ambiguous content', () => {
    expect(categorizeContent('https://example.com', 'lorem ipsum dolor sit amet', 'Example')).toBe('General');
  });
});

describe('calculateSecurityScore', () => {
  it('should give maximum score for all security features', () => {
    const score = calculateSecurityScore({
      isHttps: true,
      hasCSP: true,
      hasRobotsTxt: true,
      hasXFrameOptions: true,
      hasXContentType: true,
      hasStrictTransport: true,
    });
    expect(score).toBe(100);
  });

  it('should give 0 for no security features', () => {
    const score = calculateSecurityScore({
      isHttps: false,
      hasCSP: false,
      hasRobotsTxt: false,
      hasXFrameOptions: false,
      hasXContentType: false,
      hasStrictTransport: false,
    });
    expect(score).toBe(0);
  });

  it('should give 30 for HTTPS only', () => {
    const score = calculateSecurityScore({
      isHttps: true,
      hasCSP: false,
      hasRobotsTxt: false,
      hasXFrameOptions: false,
      hasXContentType: false,
      hasStrictTransport: false,
    });
    expect(score).toBe(30);
  });
});

describe('sanitizeForFilename', () => {
  it('should remove special characters', () => {
    expect(sanitizeForFilename('hello world!')).toBe('hello-world');
  });

  it('should collapse multiple dashes', () => {
    expect(sanitizeForFilename('a---b')).toBe('a-b');
  });

  it('should truncate to 100 characters', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeForFilename(long).length).toBeLessThanOrEqual(100);
  });
});

describe('truncate', () => {
  it('should not truncate short text', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});
