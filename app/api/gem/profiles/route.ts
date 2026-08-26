import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const profiles = await db.listGeMScanProfiles();
    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list scan profiles' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.name || !data.consigneeState || !data.consigneeCity) {
      return NextResponse.json(
        { success: false, error: 'name, consigneeState, and consigneeCity are required.' },
        { status: 400 }
      );
    }

    const saved = await db.saveGeMScanProfile(data);
    return NextResponse.json({ success: true, profile: saved });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save scan profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    await db.deleteGeMScanProfile(id);
    return NextResponse.json({ success: true, message: 'Scan profile deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete scan profile' },
      { status: 500 }
    );
  }
}
