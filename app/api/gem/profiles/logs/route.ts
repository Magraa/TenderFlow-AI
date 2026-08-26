import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await db.listGeMScanLogs(profileId, limit);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list scan logs' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.clearGeMScanLogs();
    return NextResponse.json({ success: true, message: 'Scan logs cleared successfully' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to clear scan logs' },
      { status: 500 }
    );
  }
}
