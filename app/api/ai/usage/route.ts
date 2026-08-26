import { NextRequest, NextResponse } from 'next/server';
import { aiUsageService } from '@/services/aiUsageService';

export async function GET(_request: NextRequest) {
  try {
    const quotaInfo = aiUsageService.getQuotaInfo();
    return NextResponse.json({
      success: true,
      quota: quotaInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch AI usage' },
      { status: 500 }
    );
  }
}
