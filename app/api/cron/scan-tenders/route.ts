import { NextRequest, NextResponse } from 'next/server';
import { runAllDueProfiles, runProfileScan } from '@/services/serverTenderScanner';
import { db } from '@/services/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for multi-bid scanning and AI analysis

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.NEXT_PUBLIC_CRON_SECRET;
  if (!cronSecret) {
    // In local development or if no secret is configured, allow request
    return true;
  }

  const authHeader = req.headers.get('authorization');
  const xCronSecret = req.headers.get('x-cron-secret');
  const urlSecret = req.nextUrl.searchParams.get('secret');

  if (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === cronSecret) {
    return true;
  }
  if (xCronSecret && xCronSecret.trim() === cronSecret) {
    return true;
  }
  if (urlSecret && urlSecret.trim() === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  return handleCronScan(req);
}

export async function POST(req: NextRequest) {
  return handleCronScan(req);
}

async function handleCronScan(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET token' },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');
    const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';

    let bodyData: any = {};
    if (req.method === 'POST') {
      bodyData = await req.json().catch(() => ({}));
    }

    const targetProfilePayload = bodyData?.profile;
    if (targetProfilePayload && targetProfilePayload.consigneeState) {
      const result = await runProfileScan(targetProfilePayload);
      return NextResponse.json({
        success: result.success,
        mode: 'direct-profile-payload',
        profileId: targetProfilePayload.id || 'payload',
        result,
      });
    }

    const targetProfileId = profileId || bodyData?.profileId;
    const isForce = force || Boolean(bodyData?.force);

    if (targetProfileId) {
      const profile = await db.getGeMScanProfile(targetProfileId);
      if (!profile) {
        return NextResponse.json(
          { success: false, error: `Scan profile "${targetProfileId}" not found` },
          { status: 404 }
        );
      }

      const result = await runProfileScan(profile);
      return NextResponse.json({
        success: result.success,
        mode: 'single-profile',
        profileId: targetProfileId,
        result,
      });
    }

    const results = await runAllDueProfiles(isForce);
    const totalNewBids = results.reduce((acc, curr) => acc + curr.newBidsCount, 0);
    const totalAnalyzed = results.reduce((acc, curr) => acc + curr.analyzedCount, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      mode: isForce ? 'force-all-enabled' : 'due-profiles',
      executedProfilesCount: results.length,
      totalNewBidsFound: totalNewBids,
      totalAnalyzedCount: totalAnalyzed,
      results,
    });
  } catch (error: any) {
    console.error('[API Cron Scan-Tenders Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal error during automated tender scan',
      },
      { status: 500 }
    );
  }
}
