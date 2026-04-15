/**
 * Main Orchestrator - Daily Crawl Job
 * 
 * This is the main entry point for the daily crawl process.
 * It coordinates all modules:
 * 1. Load configuration and previous queue state
 * 2. Run the crawler session
 * 3. Generate summaries for all crawled pages
 * 4. Create the daily report
 * 5. Update site records
 * 6. Save all data to disk
 * 7. Update the master index
 * 
 * This can be invoked by:
 * - GitHub Actions (daily cron)
 * - Vercel API endpoint
 * - Direct CLI execution
 */

import { runCrawlSession } from './crawler/index';
import { generateDailyReport, summarizePage } from './summarizer/index';
import {
  saveDailyReport,
  loadCrawlQueue,
  saveCrawlQueue,
  updateSiteRecords,
  updateMasterIndex,
  ensureDirectories,
} from './storage/index';
import { loadConfig, getCurrentDateInTimezone } from './config/index';
import type { CrawlJobStatus } from './types/index';

/** Global job status (in-memory for API access) */
let currentJobStatus: CrawlJobStatus = {
  jobId: '',
  status: 'idle',
  progress: 0,
  currentUrl: null,
  pagesCrawled: 0,
  startedAt: null,
  completedAt: null,
  error: null,
};

/**
 * Get the current job status.
 */
export function getJobStatus(): CrawlJobStatus {
  return { ...currentJobStatus };
}

/**
 * Run the complete daily crawl pipeline.
 */
export async function runDailyCrawl(): Promise<{
  success: boolean;
  date: string;
  pagesCrawled: number;
  error?: string;
}> {
  const config = loadConfig();
  const date = getCurrentDateInTimezone(config.gmtOffset);
  const jobId = `crawl-${date}-${Date.now()}`;

  currentJobStatus = {
    jobId,
    status: 'running',
    progress: 0,
    currentUrl: null,
    pagesCrawled: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌐 Web Explorer - Daily Crawl`);
  console.log(`📅 Date: ${date} (GMT${config.gmtOffset >= 0 ? '+' : ''}${config.gmtOffset})`);
  console.log(`🔗 Seed URLs: ${config.seedUrls.length}`);
  console.log(`📄 Max pages: ${config.maxPagesPerRun}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. Ensure directories exist
    await ensureDirectories();
    currentJobStatus.progress = 5;

    // 2. Load previous queue state
    const existingQueue = await loadCrawlQueue();
    currentJobStatus.progress = 10;
    console.log(`📋 Queue loaded: ${existingQueue?.pending.length || 0} pending URLs`);

    // 3. Run crawler session
    console.log('\n🕷️ Starting crawl session...\n');
    const { pages, queue, stats } = await runCrawlSession(config, existingQueue ?? undefined);
    currentJobStatus.pagesCrawled = pages.length;
    currentJobStatus.progress = 70;
    console.log(`\n✅ Crawl complete: ${pages.length} pages crawled`);

    // 4. Generate daily report
    console.log('\n📝 Generating daily report...');
    const report = generateDailyReport(date, pages, stats);
    currentJobStatus.progress = 80;

    // 5. Save daily report
    await saveDailyReport(report);
    console.log(`💾 Daily report saved: data/daily/${date}.json`);

    // 6. Update site records
    console.log('📊 Updating site records...');
    const summaries = pages.map(p => summarizePage(p));
    await updateSiteRecords(pages, summaries, date);
    currentJobStatus.progress = 90;

    // 7. Save queue for next run
    await saveCrawlQueue(queue);
    console.log(`📋 Queue saved: ${queue.pending.length} pending URLs for next run`);

    // 8. Update master index
    const index = await updateMasterIndex();
    console.log(`📇 Master index updated: ${index.totalDays} days, ${index.totalSites} sites`);

    currentJobStatus.status = 'completed';
    currentJobStatus.progress = 100;
    currentJobStatus.completedAt = new Date().toISOString();

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Daily crawl completed successfully!');
    console.log(`📄 Pages: ${pages.length} | 🌐 Sites: ${index.totalSites} | ⏱️ Duration: ${stats.durationSeconds.toFixed(1)}s`);
    console.log(`${'='.repeat(60)}\n`);

    return { success: true, date, pagesCrawled: pages.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    currentJobStatus.status = 'failed';
    currentJobStatus.error = errorMessage;
    currentJobStatus.completedAt = new Date().toISOString();

    console.error(`\n❌ Daily crawl failed: ${errorMessage}`);
    return { success: false, date, pagesCrawled: 0, error: errorMessage };
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const result = await runDailyCrawl();
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('main.ts') || 
  process.argv[1].endsWith('main.js')
);
if (isMainModule) {
  main().catch(console.error);
}
