import { NextRequest, NextResponse } from 'next/server';
import { getGeMCorrigendum } from '@/services/gemScraperService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bidId = searchParams.get('bidId');

    if (!bidId) {
      return NextResponse.json(
        { success: false, error: 'Missing bidId parameter' },
        { status: 400 }
      );
    }

    const result = await getGeMCorrigendum(bidId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch corrigendum' },
      { status: 500 }
    );
  }
}
