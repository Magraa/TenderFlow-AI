import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { DEFAULT_AI_LIMITS } from '@/services/aiUsageService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedProvider = searchParams.get('provider') || process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini';
  const customKey = searchParams.get('apiKey');

  const provider = requestedProvider.toLowerCase();
  const apiKey = customKey || process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  const model = process.env.NEXT_PUBLIC_AI_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : provider === 'groq' ? 'llama3-70b-8192' : 'gpt-3.5-turbo');

  const limits = DEFAULT_AI_LIMITS[model] || DEFAULT_AI_LIMITS[provider] || { dailyRequests: 1500, rpm: 15, tpm: 1000000 };

  if (provider === 'mock') {
    return NextResponse.json({
      valid: true,
      provider: 'mock',
      model: 'mock-1.0',
      latencyMs: 12,
      status: 'active',
      message: 'Mock AI provider active (no external API key required).',
      limits,
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        valid: false,
        provider,
        model,
        latencyMs: 0,
        status: 'unconfigured',
        message: 'No API key configured in environment variables.',
        limits,
      },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });
      
      // Perform a minimal latency check (count tokens or test ping)
      const countResult = await geminiModel.countTokens('Ping check');
      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        valid: true,
        provider: 'gemini',
        model,
        latencyMs,
        status: 'active',
        message: `API Key active & verified! Connected to Google Gemini (${model}).`,
        details: {
          tokenCountCheck: countResult.totalTokens,
        },
        limits,
        quotaDashboardUrl: 'https://aistudio.google.com/app/apikey',
      });
    } else if (provider === 'groq') {
      const groq = new Groq({ apiKey });
      await groq.models.list();
      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        valid: true,
        provider: 'groq',
        model,
        latencyMs,
        status: 'active',
        message: 'API Key active & verified! Connected to Groq Cloud.',
        limits,
        quotaDashboardUrl: 'https://console.groq.com/keys',
      });
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      await openai.models.list();
      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        valid: true,
        provider: 'openai',
        model,
        latencyMs,
        status: 'active',
        message: 'API Key active & verified! Connected to OpenAI.',
        limits,
        quotaDashboardUrl: 'https://platform.openai.com/usage',
      });
    } else if (provider === 'nvidia') {
      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      await openai.models.list();
      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        valid: true,
        provider: 'nvidia',
        model,
        latencyMs,
        status: 'active',
        message: 'API Key active & verified! Connected to NVIDIA NIM.',
        limits,
        quotaDashboardUrl: 'https://org.ngc.nvidia.com/setup/api-keys',
      });
    }

    return NextResponse.json({
      valid: true,
      provider,
      model,
      latencyMs: Date.now() - startTime,
      status: 'active',
      message: `Connected to ${provider}.`,
      limits,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error?.message || String(error);
    const isRateLimit = errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit');
    const isInvalidKey = errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('unauthorized');

    return NextResponse.json(
      {
        valid: false,
        provider,
        model,
        latencyMs,
        status: isRateLimit ? 'rate_limited' : isInvalidKey ? 'invalid_key' : 'error',
        message: errorMsg,
        limits,
        quotaDashboardUrl: provider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : undefined,
      },
      { status: isRateLimit ? 429 : 400 }
    );
  }
}
