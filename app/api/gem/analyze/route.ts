import { NextRequest, NextResponse } from 'next/server';
import { analyzeGeMTenderDirectly } from '@/services/gemAnalysisService';
import { GeMTender } from '@/types/gem';

export const maxDuration = 60; // Allow longer timeout for PDF download and AI processing

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pdfUrl, bidNumber, tender } = body as {
      pdfUrl?: string;
      bidNumber?: string;
      tender?: GeMTender;
    };

    const targetPdfUrl = pdfUrl || tender?.pdfUrl;
    if (!targetPdfUrl) {
      return NextResponse.json(
        { success: false, error: 'pdfUrl or tender is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeGeMTenderDirectly(targetPdfUrl, tender, bidNumber);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing GeM tender PDF in POST handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to analyze tender PDF',
      },
      { status: 500 }
    );
  }
}
