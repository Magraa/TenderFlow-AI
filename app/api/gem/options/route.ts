import { NextRequest, NextResponse } from 'next/server';
import { getGeMStates, getGeMMinistries, getGeMCities } from '@/services/gemScraperService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const state = searchParams.get('state') || '';

    const result: { states?: any[]; ministries?: any[]; cities?: any[] } = {};

    if (type === 'cities') {
      result.cities = await getGeMCities(state);
    } else {
      if (type === 'states' || type === 'all') {
        result.states = await getGeMStates();
      }
      if (type === 'ministries' || type === 'all') {
        result.ministries = await getGeMMinistries();
      }
      if (state) {
        result.cities = await getGeMCities(state);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
