/**
 * Content Summarizer Module
 * 
 * Generates summaries for crawled pages using extractive summarization.
 * This is a local, privacy-respecting summarizer that doesn't send data
 * to external APIs. It uses text analysis techniques to extract the most
 * important sentences from the content.
 * 
 * Features:
 * - Extractive summarization (selects key sentences)
 * - Multi-language support (English and Spanish)
 * - Keyword-based relevance scoring
 * - Category-aware summarization
 */

import type { CrawledPage, PageSummary, DailyReport, CrawlStats } from '../types/index';
import { truncate } from '../utils/index';

/**
 * Score a sentence based on relevance factors.
 */
function scoreSentence(sentence: string, keywords: string[], position: number, totalSentences: number): number {
  let score = 0;

  // Position score: first and last sentences are usually more important
  if (position === 0) score += 3;
  else if (position === 1) score += 2;
  else if (position === totalSentences - 1) score += 1;
  else score += 0.5;

  // Length score: prefer medium-length sentences
  const wordCount = sentence.split(/\s+/).length;
  if (wordCount >= 10 && wordCount <= 30) score += 2;
  else if (wordCount >= 5 && wordCount <= 50) score += 1;
  else score += 0.2;

  // Keyword score
  const lowerSentence = sentence.toLowerCase();
  for (const keyword of keywords) {
    if (lowerSentence.includes(keyword.toLowerCase())) {
      score += 1.5;
    }
  }

  // Signal words
  const signalWords = [
    'important', 'significant', 'key', 'major', 'critical', 'new', 'latest',
    'breaking', 'update', 'announce', 'launch', 'discover', 'reveal',
    'importante', 'significativo', 'clave', 'nuevo', 'último', 'anuncio',
  ];
  for (const word of signalWords) {
    if (lowerSentence.includes(word)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Split text into sentences, handling multiple languages.
 */
function splitSentences(text: string): string[] {
  // Split on sentence boundaries
  const sentences = text
    .split(/(?<=[.!?¿¡])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter very short fragments

  return sentences;
}

/**
 * Generate a short extractive summary from text content.
 */
function extractiveSummary(text: string, keywords: string[], maxSentences: number = 3): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return text.substring(0, 200);

  // Score all sentences
  const scored = sentences.map((sentence, index) => ({
    sentence,
    score: scoreSentence(sentence, keywords, index, sentences.length),
    originalIndex: index,
  }));

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Take top sentences and re-order by original position
  const topSentences = scored
    .slice(0, maxSentences)
    .sort((a, b) => a.originalIndex - b.originalIndex);

  return topSentences.map(s => s.sentence).join(' ');
}

/**
 * Generate a summary for a single crawled page.
 */
export function summarizePage(page: CrawledPage): PageSummary {
  const shortSummary = extractiveSummary(page.textContent, page.keywords, 2);
  const detailedSummary = extractiveSummary(page.textContent, page.keywords, 5);

  return {
    pageId: page.id,
    url: page.url,
    title: page.title,
    shortSummary: truncate(shortSummary, 300),
    detailedSummary: truncate(detailedSummary, 1000),
    topKeywords: page.keywords.slice(0, 5),
    category: page.category,
    securityScore: page.security.securityScore,
    summarizedAt: new Date().toISOString(),
  };
}

/**
 * Generate a daily summary from all page summaries.
 */
function generateDaySummary(summaries: PageSummary[]): string {
  if (summaries.length === 0) {
    return 'No pages were successfully crawled today.';
  }

  const categories = new Map<string, number>();
  for (const summary of summaries) {
    categories.set(summary.category, (categories.get(summary.category) || 0) + 1);
  }

  const categoryList = Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat} (${count})`)
    .join(', ');

  const topSites = summaries
    .slice(0, 5)
    .map(s => `"${truncate(s.title, 50)}" - ${s.shortSummary}`)
    .join(' | ');

  return `Today's web exploration discovered ${summaries.length} pages across categories: ${categoryList}. Highlights: ${topSites}`;
}

/**
 * Generate a complete daily report from crawled pages.
 */
export function generateDailyReport(
  date: string,
  pages: CrawledPage[],
  stats: CrawlStats
): DailyReport {
  // Generate summaries for all pages
  const summaries = pages.map(page => summarizePage(page));

  // Organize by category
  const byCategory: Record<string, PageSummary[]> = {};
  for (const summary of summaries) {
    if (!byCategory[summary.category]) {
      byCategory[summary.category] = [];
    }
    byCategory[summary.category]!.push(summary);
  }

  // Generate day summary
  const daySummary = generateDaySummary(summaries);

  // Count new sites (unique domains)
  const domains = new Set(pages.map(p => new URL(p.url).hostname));

  return {
    date,
    daySummary,
    totalPagesCrawled: pages.length,
    newSitesDiscovered: domains.size,
    byCategory,
    pages: summaries,
    generatedAt: new Date().toISOString(),
    stats,
  };
}
