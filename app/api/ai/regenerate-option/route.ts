import { NextRequest, NextResponse } from "next/server";
import { generateAIDraft, AIConfig } from "@/services/aiClient";

const SYSTEM_PROMPT = `You are an expert government procurement specialist and Hindi/English translator.
Your task is to regenerate a single specific item name or clause based on user instructions and item context.
You MUST output ONLY the final regenerated text string. Do not include markdown code blocks, explanation, quotes, or conversational filler.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      type = 'item_name',
      targetField = 'altHindiName',
      itemName = '',
      description = '',
      currentValue = '',
      customPrompt = '',
      language = 'hindi',
    } = body;

    if (!itemName && !currentValue && !customPrompt) {
      return NextResponse.json({ error: 'At least itemName, currentValue, or customPrompt is required.' }, { status: 400 });
    }

    const provider = (
      process.env.AI_PROVIDER ||
      process.env.NEXT_PUBLIC_AI_PROVIDER ||
      "mock"
    ).toLowerCase();
    const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || "";
    const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || "gemini-1.5-flash";

    if (provider === "mock" || !apiKey) {
      const mockResult = customPrompt
        ? `${currentValue || itemName} (${customPrompt.slice(0, 15)})`
        : `${currentValue || itemName} (Regenerated)`;
      return NextResponse.json({ value: mockResult, provider: 'mock' });
    }

    let userInstruction = `Context:
- Item Name: ${itemName}
${description ? `- Item Description: ${description}` : ''}
${currentValue ? `- Current Value: ${currentValue}` : ''}
- Target Language: ${language}
- Target Field Type: ${targetField}
${customPrompt ? `- Specific Custom User Prompt / Instruction: ${customPrompt}` : ''}

Generate a concise, professional government procurement ${type === 'item_name' ? 'item title/name' : 'subject/clause'} following these rules:
1. If Target Language is 'hindi', return pure Hindi (Devanagari script).
2. If Target Language is 'english', return formal English.
3. Obey any custom user prompt instructions provided above.
4. Output ONLY the plain text string, nothing else.`;

    const config: AIConfig = { provider: provider as any, apiKey, model };
    const response = await generateAIDraft(config, {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userInstruction,
      temperature: 0.5,
      maxTokens: 250,
    });

    const cleaned = response.content
      .replace(/^```(?:json|text)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .replace(/^"|"$/g, '')
      .trim();

    return NextResponse.json({
      value: cleaned || currentValue || itemName,
      provider: response.provider,
    });
  } catch (err) {
    console.error('Error in regenerate-option API:', err);
    return NextResponse.json({ error: 'Failed to regenerate option' }, { status: 500 });
  }
}
