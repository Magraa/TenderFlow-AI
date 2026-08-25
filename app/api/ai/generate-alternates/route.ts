import { NextRequest, NextResponse } from "next/server";
import { generateAIDraft, AIConfig } from "@/services/aiClient";

const SYSTEM_PROMPT = `You are an expert municipal procurement assistant and translator.
Your task is to take a raw item name and raw description (which may be mixed or contain detailed specs within the item name) and generate a complete, structured item mapping pack for procurement tender documents.
You MUST output ONLY valid JSON. Do not include markdown code blocks, explanation, or any surrounding text.`;

function buildUserPrompt(rawName: string, rawDescription?: string): string {
  const descText = rawDescription?.trim() ? `\nRaw Description: ${rawDescription}` : "";
  const hasDesc = Boolean(rawDescription?.trim());
  return `Analyze the following procurement item input:
Raw Item Name: ${rawName}${descText}

CRITICAL INSTRUCTIONS:
1. Parse the input: If the Raw Item Name contains embedded specifications (e.g. capacity, material, size), separate the main Item Name from its detailed Description/Specifications.
2. "englishName": Create a clean, professional, detailed primary English Item Name.
3. "englishDescription": Create/extract detailed English specifications & description.
4. "hindiName": Provide an accurate Hindi transliteration/translation of the primary English Name.
5. "hindiDescription": Provide an accurate Hindi transliteration/translation of the primary English Description.
6. "altHindiName": (Alt Hindi 1 - Medium) - A medium-length alternative Hindi name variant for competing firm bids.
7. "altHindiName2": (Alt Hindi 2 - Short) - A concise, shorter alternative Hindi name variant.
8. "altEnglishName1": (Alt Eng 1 - Medium) - A medium-length alternative English name variant.
9. "altEnglishName2": (Alt Eng 2 - Short) - A concise, shorter alternative English name variant.
${hasDesc ? `10. "altHindiDescription1": (Alt Hindi Desc 1 - Medium) - Medium length Hindi description variant for Alt 1.
11. "altHindiDescription2": (Alt Hindi Desc 2 - Short) - Short concise Hindi description variant for Alt 2.
12. "altEnglishDescription1": (Alt Eng Desc 1 - Medium) - Medium length English description variant for Alt 1.
13. "altEnglishDescription2": (Alt Eng Desc 2 - Short) - Short concise English description variant for Alt 2.
14. "altHindiName3": (Alt Hindi 3 - Combined Medium) - A single combined paragraph/phrase merging both Item Name & Description in Hindi (medium length).
15. "altHindiName4": (Alt Hindi 4 - Combined Short) - A single concise combined phrase merging both Item Name & Description in Hindi (short length).
16. "altEnglishName3": (Alt Eng 3 - Combined Medium) - A single combined paragraph/phrase merging both Item Name & Description in English (medium length).
17. "altEnglishName4": (Alt Eng 4 - Combined Short) - A single concise combined phrase merging both Item Name & Description in English (short length).` : ''}

Return EXACTLY this JSON structure (no markdown wrapper):
{
  "englishName": "Clean Detailed English Name",
  "englishDescription": "Detailed English Specifications",
  "hindiName": "प्राथमिक हिन्दी नाम",
  "hindiDescription": "प्राथमिक हिन्दी विवरण",
  "altHindiName": "वैकल्पिक हिन्दी नाम 1",
  "altHindiName2": "वैकल्पिक हिन्दी नाम 2",
  "altEnglishName1": "Alternative English Name 1",
  "altEnglishName2": "Alternative English Name 2"${hasDesc ? `,
  "altHindiDescription1": "वैकल्पिक हिन्दी विवरण 1 (मध्यम)",
  "altHindiDescription2": "वैकल्पिक हिन्दी विवरण 2 (संक्षिप्त)",
  "altEnglishDescription1": "Alternative English Description 1 (Medium)",
  "altEnglishDescription2": "Alternative English Description 2 (Short)",
  "altHindiName3": "संयुक्त नाम एवं विवरण (मध्यम)",
  "altHindiName4": "संयुक्त नाम एवं विवरण (संक्षिप्त)",
  "altEnglishName3": "Combined Name & Description (Medium)",
  "altEnglishName4": "Combined Name & Description (Short)"` : ''}
}`;
}

function buildMockPack(rawName: string, rawDescription?: string) {
  const base = rawName.trim().replace(/\s*\(.*?\)\s*/g, "");
  const desc = rawDescription?.trim() || "";
  return {
    englishName: base || rawName,
    englishDescription: desc,
    hindiName: base || rawName,
    hindiDescription: desc,
    altHindiName: `${base} (मध्यम 1)`,
    altHindiName2: `${base} (संक्षिप्त 2)`,
    altHindiDescription1: desc ? `${desc} (मध्यम 1)` : "",
    altHindiDescription2: desc ? `${desc.slice(0, 30)}` : "",
    altEnglishDescription1: desc ? `${desc} (Medium 1)` : "",
    altEnglishDescription2: desc ? `${desc.slice(0, 30)}` : "",
    altHindiName3: desc ? `${base} सहित ${desc}` : "",
    altHindiName4: desc ? `${base} (${desc.slice(0, 20)})` : "",
    altEnglishName1: `${base} (Medium 1)`,
    altEnglishName2: `${base} (Short 2)`,
    altEnglishName3: desc ? `${base} with ${desc}` : "",
    altEnglishName4: desc ? `${base} (${desc.slice(0, 20)})` : "",
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
      maxTokens: 950,
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
    const altHindiDescription1 = parsed.altHindiDescription1 || (rawDescription ? `${hindiDescription}` : "");
    const altHindiDescription2 = parsed.altHindiDescription2 || (rawDescription ? `${hindiDescription.slice(0, 30)}` : "");
    const altEnglishDescription1 = parsed.altEnglishDescription1 || (rawDescription ? `${englishDescription}` : "");
    const altEnglishDescription2 = parsed.altEnglishDescription2 || (rawDescription ? `${englishDescription.slice(0, 30)}` : "");
    const altHindiName3 = parsed.altHindiName3 || (rawDescription ? `${hindiName} ${hindiDescription}` : "");
    const altHindiName4 = parsed.altHindiName4 || (rawDescription ? `${hindiName}` : "");
    const altEnglishName1 = parsed.altEnglishName1 || `${englishName} Alt 1`;
    const altEnglishName2 = parsed.altEnglishName2 || `${englishName} Alt 2`;
    const altEnglishName3 = parsed.altEnglishName3 || (rawDescription ? `${englishName} ${englishDescription}` : "");
    const altEnglishName4 = parsed.altEnglishName4 || (rawDescription ? `${englishName}` : "");

    return NextResponse.json({
      rawName,
      rawDescription,
      englishName,
      englishDescription,
      hindiName,
      hindiDescription,
      altHindiName,
      altHindiName2,
      altHindiDescription1,
      altHindiDescription2,
      altEnglishDescription1,
      altEnglishDescription2,
      altHindiName3,
      altHindiName4,
      altEnglishName1,
      altEnglishName2,
      altEnglishName3,
      altEnglishName4,
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
