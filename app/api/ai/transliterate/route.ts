import { NextRequest, NextResponse } from 'next/server';
import { transliterate, AIConfig, AITransliterateRequest } from '@/services/aiClient';

function extractText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
  const text = extractText(body.text);
  const sourceLanguage = extractText(body.sourceLanguage || 'english');
  const targetLanguage = extractText(body.targetLanguage || 'hindi');

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const provider = (process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER || 'mock').toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || '';
  const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || 'mock-1.0';

  // Use mock if no API key or mock provider
  if (provider === 'mock' || !apiKey) {
    return NextResponse.json({ transliteratedText: text, provider: 'mock', model: 'mock-1.0' });
  }

  try {
    const config: AIConfig = { provider, apiKey, model };
    const req: AITransliterateRequest = {
      text,
      sourceLanguage,
      targetLanguage,
    };

    const result = await transliterate(config, req);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Transliteration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Transliteration failed: ${errorMessage}` }, { status: 500 });
  }
}