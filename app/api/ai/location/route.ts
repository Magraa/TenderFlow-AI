import { NextRequest, NextResponse } from 'next/server';
import { generateAIDraft } from '@/services/aiClient';

function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asConfidence(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.65;
  return Math.min(1, Math.max(0, numeric));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { placeName?: string };
  const placeName = body.placeName?.trim();

  if (!placeName) {
    return NextResponse.json({ error: 'placeName is required' }, { status: 400 });
  }

  const provider = (process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER || 'mock').toLowerCase() as any;
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || '';
  const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || 'mock-1.0';

  if (provider === 'mock' || !apiKey) {
    return NextResponse.json(null);
  }

  try {
    const response = await generateAIDraft(
      { provider, apiKey, model },
      {
        systemPrompt:
          'You identify Indian municipal place metadata. Return only compact JSON with no markdown.',
        userPrompt: `For the place "${placeName}", return JSON fields englishName, hindiName, districtName, districtHindiName, stateName, stateHindiName, localBodyType, localBodyTypeHindi, confidence. If unsure, use the most likely official Indian district and confidence below 0.7. For localBodyType, output the type of municipal/local governance body (e.g. "Nagar Palika Parishad", "Nagar Parishad", "Municipal Corporation" etc.) and its Hindi transliteration/equivalent in localBodyTypeHindi.`,
        temperature: 0.1,
        maxTokens: 450,
      }
    );

    const parsed = extractJson(response.content);
    if (!parsed) return NextResponse.json(null);

    const result = {
      englishName: asString(parsed.englishName) || placeName,
      hindiName: asString(parsed.hindiName),
      districtName: asString(parsed.districtName),
      districtHindiName: asString(parsed.districtHindiName),
      stateName: asString(parsed.stateName) || 'Madhya Pradesh',
      stateHindiName: asString(parsed.stateHindiName),
      localBodyType: asString(parsed.localBodyType),
      localBodyTypeHindi: asString(parsed.localBodyTypeHindi),
      confidence: asConfidence(parsed.confidence),
      source: 'ai',
    };

    if (!result.districtName) return NextResponse.json(null);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(null);
  }
}
