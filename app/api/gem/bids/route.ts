import { NextRequest, NextResponse } from 'next/server';
import { searchGeMBids } from '@/services/gemScraperService';
import { GeMSearchFilters } from '@/types/gem';

export async function POST(req: NextRequest) {
  try {
    const filters: GeMSearchFilters = await req.json();
    const result = await searchGeMBids(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        totalRecords: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        bids: [],
        error: error?.message || 'Internal server error while fetching bids',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchType = (searchParams.get('searchType') || 'bidNumber') as any;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const category = searchParams.get('category') || undefined;
    const bidNumber = searchParams.get('bidNumber') || undefined;
    const bidEndFrom = searchParams.get('bidEndFrom') || undefined;
    const bidEndTo = searchParams.get('bidEndTo') || undefined;
    const ministry = searchParams.get('ministry') || undefined;
    const buyerState = searchParams.get('buyerState') || undefined;
    const organization = searchParams.get('organization') || undefined;
    const department = searchParams.get('department') || undefined;
    const state_name_con = searchParams.get('state_name_con') || undefined;
    const city_name_con = searchParams.get('city_name_con') || undefined;
    const boqtitle_con = searchParams.get('boqtitle_con') || undefined;
    const bidvalue = searchParams.get('bidvalue') || undefined;

    const filters: GeMSearchFilters = {
      searchType,
      page,
      category,
      bidNumber,
      bidEndFrom,
      bidEndTo,
      ministry,
      buyerState,
      organization,
      department,
      state_name_con,
      city_name_con,
      boqtitle_con,
      bidvalue,
      bidEndFromMin: bidEndFrom,
      bidEndToMin: bidEndTo,
      bidEndFromCon: bidEndFrom,
      bidEndToCon: bidEndTo,
      bidEndFromBoq: bidEndFrom,
      bidEndToBoq: bidEndTo,
    };

    const result = await searchGeMBids(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        totalRecords: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        bids: [],
        error: error?.message || 'Internal server error while fetching bids',
      },
      { status: 500 }
    );
  }
}
