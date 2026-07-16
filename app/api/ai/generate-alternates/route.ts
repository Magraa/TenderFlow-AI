import { NextRequest, NextResponse } from "next/server";
import { generateAIDraft, AIConfig } from "@/services/aiClient";

const SYSTEM_PROMPT = `You are a helpful municipal procurement assistant.
Your job is to generate alternative item names for tender documents.
You must output ONLY valid JSON. Do not include markdown code blocks, explanation, or any surrounding text.`;

function buildUserPrompt(itemName: string, description?: string): string {
  const descText = description?.trim() ? `\nItem Description: ${description}` : "";
  return `Generate alternative item names for this item to be used across different mock quotations.
Item Name: ${itemName}${descText}

Requirements:
1. "altHindi": One short alternative Hindi name. E.g. if the item is "डस्टबिन 12L (First Grade)", the alternative could be "कचरा पेटी (प्लास्टिक)" or "प्लास्टिक डस्टबिन".
2. "altEnglish1": First short alternative English name. E.g. "HDPE Waste Bin" or "Plastic Garbage Bin".
3. "altEnglish2": Second short alternative English name. E.g. "Cylindrical Trash Can" or "12L Litter Bin".

Return exactly this JSON structure (do not wrap in markdown \`\`\`json blocks, return raw text):
{
  "altHindi": "Alternative Hindi Name",
  "altEnglish1": "Alternative English Name 1",
  "altEnglish2": "Alternative English Name 2"
}`;
}

function buildMockAlternates(itemName: string): {
  altHindi: string;
  altEnglish1: string;
  altEnglish2: string;
} {
  const base = itemName.trim();
  // Strip parentheses for alternatives
  const cleanBase = base.replace(/\s*\(.*?\)\s*/g, "");
  return {
    altHindi: `${cleanBase} (वैकल्पिक)`,
    altEnglish1: `${cleanBase} Alt A`,
    altEnglish2: `${cleanBase} Alt B`,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    itemName?: string;
    description?: string;
  };
  const itemName = typeof body.itemName === "string" ? body.itemName.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const provider = (
    process.env.AI_PROVIDER ||
    process.env.NEXT_PUBLIC_AI_PROVIDER ||
    "mock"
  ).toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || "";
  const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || "gemini-1.5-flash";

  if (provider === "mock" || !apiKey) {
    return NextResponse.json({ ...buildMockAlternates(itemName), provider: "mock" });
  }

  try {
    const config: AIConfig = { provider: provider as any, apiKey, model };
    const response = await generateAIDraft(config, {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(itemName, description),
      temperature: 0.4,
      maxTokens: 500,
    });

    const raw = response.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI alternates JSON:", raw);
      // Fallback to mocks on parse failure
      return NextResponse.json({ ...buildMockAlternates(itemName), provider: "mock_fallback" });
    }

    return NextResponse.json({
      altHindi: parsed.altHindi || `${itemName} (वैकल्पिक)`,
      altEnglish1: parsed.altEnglish1 || `${itemName} Alt A`,
      altEnglish2: parsed.altEnglish2 || `${itemName} Alt B`,
      provider: response.provider,
    });
  } catch (error) {
    console.error("Alternative names generation error:", error);
    // Fallback to mocks on error
    return NextResponse.json({ ...buildMockAlternates(itemName), provider: "error_fallback" });
  }
}
