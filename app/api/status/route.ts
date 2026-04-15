/**
 * API Route: /api/status
 * 
 * Returns the current status of the Web Explorer system,
 * including index statistics and recent activity.
 */

import { NextResponse } from 'next/server';
import { loadMasterIndex, listDailyReports } from '@/src/storage/index';
import { getJobStatus } from '@/src/main';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const index = await loadMasterIndex();
    const dates = await listDailyReports();
    const jobStatus = getJobStatus();

    return NextResponse.json({
      success: true,
      data: {
        system: {
          name: 'Web Explorer',
          version: '1.0.0',
          status: 'operational',
          uptime: process.uptime(),
        },
        index: index || {
          totalDays: 0,
          totalSites: 0,
          dates: [],
          sites: [],
        },
        recentDates: dates.slice(0, 10),
        crawlJob: jobStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
