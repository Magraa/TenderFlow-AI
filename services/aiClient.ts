import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { aiUsageService } from './aiUsageService';

export type AIProvider = 'gemini' | 'openai' | 'groq' | 'nvidia' | 'mock';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface AIDraftRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIDraftResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
}

// Mock AI for development (no API key needed)
async function mockAIDraft(request: AIDraftRequest): Promise<AIDraftResponse> {
  return {
    content: `<div class="doc-body">
      <h2>${request.userPrompt.substring(0, 50)}...</h2>
      <p>Mock AI response generated without API key.</p>
      <p>System: ${request.systemPrompt.substring(0, 50)}...</p>
    </div>`,
    provider: 'mock',
    model: 'mock-1.0',
  };
}

function normalizeGeminiModel(model: string): string {
  return model || 'gemini-2.0-flash';
}

// Gemini AI integration
async function geminiAIDraft(request: AIDraftRequest, apiKey: string, model: string = 'gemini-1.5-flash'): Promise<AIDraftResponse> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const normalizedModel = normalizeGeminiModel(model);
    const geminiModel = genAI.getGenerativeModel({ model: normalizedModel });
    
    const prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text() || '';
    
    return {
      content: content,
      provider: 'gemini',
      model: normalizedModel,
      tokensUsed: (response as any).usageMetadata?.totalTokenCount || (response as any).usage?.totalTokens,
    };
  } catch (error) {
    console.error('Gemini AI error:', error);
    throw new Error(`Gemini AI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// OpenAI integration
async function openAIDraft(request: AIDraftRequest, apiKey: string, model: string = 'gpt-3.5-turbo'): Promise<AIDraftResponse> {
  try {
    const openai = new OpenAI({ apiKey });
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    });
    
    const content = completion.choices[0]?.message?.content || '';
    
    return {
      content: content,
      provider: 'openai',
      model: model,
      tokensUsed: completion.usage?.total_tokens,
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error(`OpenAI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Groq integration
async function groqAIDraft(request: AIDraftRequest, apiKey: string, model: string = 'llama3-70b-8192'): Promise<AIDraftResponse> {
  try {
    const groq = new Groq({ apiKey });
    
    const chatCompletion = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    });
    
    const content = chatCompletion.choices[0]?.message?.content || '';
    
    return {
      content: content,
      provider: 'groq',
      model: model,
      tokensUsed: chatCompletion.usage?.total_tokens,
    };
  } catch (error) {
    console.error('Groq error:', error);
    throw new Error(`Groq failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// NVIDIA NIM integration
async function nvidiaAIDraft(request: AIDraftRequest, apiKey: string, model: string = 'meta/llama3-70b'): Promise<AIDraftResponse> {
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    });
    
    const content = completion.choices[0]?.message?.content || '';
    
    return {
      content: content,
      provider: 'nvidia',
      model: model,
      tokensUsed: completion.usage?.total_tokens,
    };
  } catch (error) {
    console.error('NVIDIA AI error:', error);
    throw new Error(`NVIDIA AI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate AI draft using configured provider
 */
export async function generateAIDraft(config: AIConfig, request: AIDraftRequest): Promise<AIDraftResponse> {
  const startTime = Date.now();
  let response: AIDraftResponse;

  try {
    switch (config.provider) {
      case 'gemini':
        response = await geminiAIDraft(request, config.apiKey, config.model);
        break;
      case 'openai':
        response = await openAIDraft(request, config.apiKey, config.model);
        break;
      case 'groq':
        response = await groqAIDraft(request, config.apiKey, config.model);
        break;
      case 'nvidia':
        response = await nvidiaAIDraft(request, config.apiKey, config.model);
        break;
      case 'mock':
      default:
        response = await mockAIDraft(request);
        break;
    }

    aiUsageService.recordUsage({
      feature: 'draft',
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      success: true,
      durationMs: Date.now() - startTime,
    });

    return response;
  } catch (err: any) {
    aiUsageService.recordUsage({
      feature: 'draft',
      provider: config.provider,
      model: config.model,
      success: false,
      durationMs: Date.now() - startTime,
      error: err?.message || String(err),
    });
    throw err;
  }
}

/**
 * Get available AI providers
 */
export function getAvailableProviders(): AIProvider[] {
  return ['gemini', 'openai', 'groq', 'nvidia', 'mock'];
}

/**
 * Get default model for each provider
 */
export function getDefaultModel(provider: AIProvider): string {
  const models: Record<AIProvider, string> = {
    gemini: 'gemini-1.5-flash',
    openai: 'gpt-3.5-turbo',
    groq: 'llama3-70b-8192',
    nvidia: 'meta/llama3-70b',
    mock: 'mock-1.0',
  };
  return models[provider] || models.mock;
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const names: Record<AIProvider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    groq: 'Groq',
    nvidia: 'NVIDIA NIM',
    mock: 'Mock (Development)',
  };
  return names[provider] || provider;
}

/**
 * Transliteration request interface
 */
export interface AITransliterateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Transliteration response interface
 */
export interface AITransliterateResponse {
  transliteratedText: string;
  provider: AIProvider;
  model: string;
}

// Mock transliteration for development
async function mockTransliterate(request: AITransliterateRequest): Promise<AITransliterateResponse> {
  // Simple mock: just return the text with some transformation
  return {
    transliteratedText: request.text.replace(/[a-zA-Z]/g, (c) => {
      const codes = 'abcdefghijklmnopqrstuvwxyz';
      const idx = codes.indexOf(c.toLowerCase());
      return idx >= 0 ? 'abcdefghijklmnopqrstuvwxyz'.charAt((idx + 1) % 26) : c;
    }),
    provider: 'mock',
    model: 'mock-1.0',
  };
}

// Gemini transliteration
async function geminiTransliterate(
  request: AITransliterateRequest,
  apiKey: string,
  model: string = 'gemini-1.5-flash'
): Promise<AITransliterateResponse> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const normalizedModel = normalizeGeminiModel(model);
    const geminiModel = genAI.getGenerativeModel({ model: normalizedModel });
    
    const prompt = `You are a professional translator and transliterator between English and Hindi.
Translate and/or transliterate the following text from ${request.sourceLanguage} to ${request.targetLanguage}:
"${request.text}"

CRITICAL RULES:
1. Semantically TRANSLATE descriptive words, common nouns, and adjectives (e.g., 'domestic distribution' should be translated to 'घरेलू उपयोग हेतु वितरण', and 'घरेलू उपयोग हेतु वितरण' should be translated to 'domestic distribution'). Do not phonetically transliterate them.
2. Phonetically TRANSLITERATE brand names, technical abbreviations, or loanwords that are commonly used in the target language (e.g., 'HDPE' -> 'एचडीपीई', 'Litre' -> 'लीटर', 'Dustbin' -> 'डस्टबिन', 'synthetic rubber' -> 'सिंथेटिक रबर').
3. Keep the translation natural and professional for municipal tender/procurement contexts.
4. If there is a separator like '|||', preserve the separator '|||' in the exact same position in the output.
5. Return ONLY the final translated/transliterated text. Do not add quotes, markdown formatting, explanations, or introductory text.`;
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const transliteratedText = response.text()?.trim() || request.text;
    
    return {
      transliteratedText,
      provider: 'gemini',
      model: normalizedModel,
    };
  } catch (error) {
    console.error('Gemini transliteration error:', error);
    throw new Error(`Gemini transliteration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// OpenAI transliteration
async function openaiTransliterate(
  request: AITransliterateRequest,
  apiKey: string,
  model: string = 'gpt-3.5-turbo'
): Promise<AITransliterateResponse> {
  try {
    const openai = new OpenAI({ apiKey });
    
    const systemPrompt = `You are a professional translator and transliterator between English and Hindi.
CRITICAL RULES:
1. Semantically TRANSLATE descriptive words, common nouns, and adjectives (e.g., 'domestic distribution' -> 'घरेलू उपयोग हेतु वितरण', 'घरेलू उपयोग हेतु वितरण' -> 'domestic distribution'). Do not phonetically transliterate them.
2. Phonetically TRANSLITERATE brand names, technical abbreviations, or loanwords that are commonly used in the target language (e.g., 'HDPE' -> 'एचडीपीई', 'Litre' -> 'लीटर', 'Dustbin' -> 'डस्टबिन', 'synthetic rubber' -> 'सिंथेटिक रबर').
3. Keep the translation natural and professional for municipal tender/procurement contexts.
4. If there is a separator like '|||', preserve the separator '|||' in the exact same position in the output.
5. Return ONLY the final translated/transliterated text. Do not add quotes, markdown formatting, explanations, or introductory text.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Translate/transliterate from ${request.sourceLanguage} to ${request.targetLanguage}: "${request.text}"` },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });
    
    const transliteratedText = completion.choices[0]?.message?.content?.trim() || request.text;
    
    return {
      transliteratedText,
      provider: 'openai',
      model: model,
    };
  } catch (error) {
    console.error('OpenAI transliteration error:', error);
    throw new Error(`OpenAI transliteration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Groq transliteration
async function groqTransliterate(
  request: AITransliterateRequest,
  apiKey: string,
  model: string = 'llama3-70b-8192'
): Promise<AITransliterateResponse> {
  try {
    const groq = new Groq({ apiKey });
    
    const systemPrompt = `You are a professional translator and transliterator between English and Hindi.
CRITICAL RULES:
1. Semantically TRANSLATE descriptive words, common nouns, and adjectives (e.g., 'domestic distribution' -> 'घरेलू उपयोग हेतु वितरण', 'घरेलू उपयोग हेतु वितरण' -> 'domestic distribution'). Do not phonetically transliterate them.
2. Phonetically TRANSLITERATE brand names, technical abbreviations, or loanwords that are commonly used in the target language (e.g., 'HDPE' -> 'एचडीपीई', 'Litre' -> 'लीटर', 'Dustbin' -> 'डस्टबिन', 'synthetic rubber' -> 'सिंथेटिक रबर').
3. Keep the translation natural and professional for municipal tender/procurement contexts.
4. If there is a separator like '|||', preserve the separator '|||' in the exact same position in the output.
5. Return ONLY the final translated/transliterated text. Do not add quotes, markdown formatting, explanations, or introductory text.`;

    const chatCompletion = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Translate/transliterate from ${request.sourceLanguage} to ${request.targetLanguage}: "${request.text}"` },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });
    
    const transliteratedText = chatCompletion.choices[0]?.message?.content?.trim() || request.text;
    
    return {
      transliteratedText,
      provider: 'groq',
      model: model,
    };
  } catch (error) {
    console.error('Groq transliteration error:', error);
    throw new Error(`Groq transliteration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transliterate text using configured AI provider
 */
export async function transliterate(config: AIConfig, request: AITransliterateRequest): Promise<AITransliterateResponse> {
  const startTime = Date.now();
  let response: AITransliterateResponse;

  try {
    switch (config.provider) {
      case 'gemini':
        response = await geminiTransliterate(request, config.apiKey, config.model);
        break;
      case 'openai':
        response = await openaiTransliterate(request, config.apiKey, config.model);
        break;
      case 'groq':
        response = await groqTransliterate(request, config.apiKey, config.model);
        break;
      case 'nvidia':
        // Use OpenAI-compatible API for NVIDIA
        response = await openaiTransliterate(request, config.apiKey, config.model);
        break;
      case 'mock':
      default:
        response = await mockTransliterate(request);
        break;
    }

    aiUsageService.recordUsage({
      feature: 'transliterate',
      provider: response.provider,
      model: response.model,
      success: true,
      durationMs: Date.now() - startTime,
    });

    return response;
  } catch (err: any) {
    aiUsageService.recordUsage({
      feature: 'transliterate',
      provider: config.provider,
      model: config.model,
      success: false,
      durationMs: Date.now() - startTime,
      error: err?.message || String(err),
    });
    throw err;
  }
}
