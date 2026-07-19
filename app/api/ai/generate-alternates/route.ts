import { NextRequest, NextResponse } from "next/server";
import { generateAIDraft, AIConfig } from "@/services/aiClient";

const SYSTEM_PROMPT = `You are an expert municipal procurement assistant and translator.
Your task is to take a raw item name and raw description (which may be mixed or contain detailed specs within the item name) and generate a complete, structured item mapping pack for procurement tender documents.
You MUST output ONLY valid JSON. Do not include markdown code blocks, explanation, or any surrounding text.`;

function buildUserPrompt(rawName: string, rawDescription?: string): string {
  const descText = rawDescription?.trim() ? `\nRaw Description: ${rawDescription}` : "";
  return `Analyze the following procurement item input:
Raw Item Name: ${rawName}${descText}

CRITICAL INSTRUCTIONS:
1. Parse the input: If the Raw Item Name contains embedded specifications (e.g. capacity, material, size), separate the main Item Name from its detailed Description/Specifications.
2. "englishName": Create a clean, professional, detailed primary English Item Name.
3. "englishDescription": Create/extract detailed English specifications & description.
4. "hindiName": Provide an accurate Hindi transliteration/translation of the primary English Name.
5. "hindiDescription": Provide an accurate Hindi transliteration/translation of the primary English Description.
6. "altHindiName": (Alternative Hindi Name 1 for Firm 1) - A slightly shorter variant Hindi name for the exact same item.
7. "altHindiName2": (Alternative Hindi Name 2 for Firm 2) - An even simpler/shorter variant Hindi name than altHindiName.
8. "altEnglishName1": (Alternative English Name 1 for Firm 1) - A slightly shorter variant English name for the exact same item.
9. "altEnglishName2": (Alternative English Name 2 for Firm 2) - An even simpler/shorter variant English name than altEnglishName1.

Return EXACTLY this JSON structure (no markdown wrapper):
{
  "englishName": "Clean Detailed English Name",
  "englishDescription": "Detailed English Specifications",
  "hindiName": "प्राथमिक हिन्दी नाम",
  "hindiDescription": "प्राथमिक हिन्दी विवरण",
  "altHindiName": "वैकल्पिक हिन्दी नाम 1",
  "altHindiName2": "वैकल्पिक हिन्दी नाम 2",
  "altEnglishName1": "Alternative English Name 1",
  "altEnglishName2": "Alternative English Name 2"
}`;
}

function buildMockPack(rawName: string, rawDescription?: string) {
  const base = rawName.trim().replace(/\s*\(.*?\)\s*/g, "");
  return {
    englishName: base || rawName,
    englishDescription: rawDescription || "",
    hindiName: base || rawName,
    hindiDescription: rawDescription || "",
    altHindiName: `${base} (वैकल्पिक 1)`,
    altHindiName2: `${base} (वैकल्पिक 2)`,
    altEnglishName1: `${base} Alt 1`,
    altEnglishName2: `${base} Alt 2`,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    itemName?: string;
    rawName?: string;
    description?: string;
    rawDescription?: string;
  };

  const rawName = (body.rawName || body.itemName || "").trim();
  const rawDescription = (body.rawDescription || body.description || "").trim();

  if (!rawName) {
    return NextResponse.json({ error: "rawName or itemName is required" }, { status: 400 });
  }

  const provider = (
    process.env.AI_PROVIDER ||
    process.env.NEXT_PUBLIC_AI_PROVIDER ||
    "mock"
  ).toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || "";
  const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || "gemini-1.5-flash";

  if (provider === "mock" || !apiKey) {
    const mockData = buildMockPack(rawName, rawDescription);
    return NextResponse.json({ ...mockData, altHindi: mockData.altHindiName, provider: "mock" });
  }

  try {
    const config: AIConfig = { provider: provider as any, apiKey, model };
    const response = await generateAIDraft(config, {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(rawName, rawDescription),
      temperature: 0.4,
      maxTokens: 700,
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
      const mockData = buildMockPack(rawName, rawDescription);
      return NextResponse.json({ ...mockData, altHindi: mockData.altHindiName, provider: "mock_fallback" });
    }

    const englishName = parsed.englishName || rawName;
    const englishDescription = parsed.englishDescription || rawDescription;
    const hindiName = parsed.hindiName || rawName;
    const hindiDescription = parsed.hindiDescription || rawDescription;
    const altHindiName = parsed.altHindiName || `${hindiName} (वैकल्पिक 1)`;
    const altHindiName2 = parsed.altHindiName2 || `${hindiName} (वैकल्पिक 2)`;
    const altEnglishName1 = parsed.altEnglishName1 || `${englishName} Alt 1`;
    const altEnglishName2 = parsed.altEnglishName2 || `${englishName} Alt 2`;

    return NextResponse.json({
      rawName,
      rawDescription,
      englishName,
      englishDescription,
      hindiName,
      hindiDescription,
      altHindiName,
      altHindiName2,
      altEnglishName1,
      altEnglishName2,
      // Backward compatibility fields
      altHindi: altHindiName,
      provider: response.provider,
    });
  } catch (err) {
    console.error("Error in generate-alternates API:", err);
    const mockData = buildMockPack(rawName, rawDescription);
    return NextResponse.json({ ...mockData, altHindi: mockData.altHindiName, provider: "mock_fallback" });
  }
}
