/**
 * API Route: /api/crawl
 * 
 * Triggers a daily crawl job. Protected by an API key.
 * 
 * Methods:
 * - POST: Start a new crawl job
 * - GET: Get current crawl job status
 */

import { NextResponse } from 'next/server';
import { runDailyCrawl, getJobStatus } from '@/src/main';

/**
 * Validate the API key from the request.
 */
function isAuthorized(request: Request): boolean {
  const apiKey = process.env.CRAWLER_API_KEY;
  // If no API key is configured, allow access (for development)
  if (!apiKey) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === apiKey) return true;
  }

  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  if (queryKey === apiKey) return true;

  return false;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if already running
  const currentStatus = getJobStatus();
  if (currentStatus.status === 'running') {
    return NextResponse.json(
      {
        success: false,
        error: 'A crawl job is already running',
        status: currentStatus,
      },
      { status: 409 }
    );
  }

  // Run the crawl asynchronously
  // Don't await - let it run in the background
  const crawlPromise = runDailyCrawl();

  // For serverless environments, we need to await
  // For long-running servers, we could fire-and-forget
  if (process.env.VERCEL) {
    // On Vercel, we have limited execution time, so run synchronously
    const result = await crawlPromise;
    return NextResponse.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  // For non-serverless, start and return immediately
  crawlPromise.catch(err => console.error('Crawl job error:', err));

  return NextResponse.json({
    success: true,
    message: 'Crawl job started',
    status: getJobStatus(),
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    status: getJobStatus(),
    timestamp: new Date().toISOString(),
  });
}
