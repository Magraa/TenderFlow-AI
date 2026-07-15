import { NextRequest, NextResponse } from "next/server";
import { generateAIDraft, AIConfig } from "@/services/aiClient";
import { DocumentPhrases } from "@/types";

const SYSTEM_PROMPT = `You are a municipal government tender document assistant for Indian local bodies.
Your job is to generate reusable Hindi phrase packs for government procurement tenders.
All Hindi text must use formal municipal government language appropriate for Madhya Pradesh district authorities.
Return ONLY valid JSON. No explanation, no markdown, no code blocks — just the JSON object.`;

function buildUserPrompt(itemName: string, description?: string): string {
  const descLine = description?.trim()
    ? `\nItem Description: ${description.trim()}`
    : "";

  return `Analyze this procurement item and generate a reusable document phrase pack.

Item: ${itemName}${descLine}

Rules:
1. categoryName: Short generic English name (1-2 words) covering all variants. Example: "12L HDPE Dustbin" becomes "Dustbin", "GI Pipe 1 inch" becomes "Pipe"
2. categoryId: lowercase slug of categoryName (no spaces, use underscores)
3. keywords: array of 4-8 common variants/synonyms (all lowercase)
4. All Hindi phrases must be formal government style
5. supplyOrder.subject: Starts with purpose clause, ends with "बाबत।"
6. quotationMain.english: A clear English subject line for the main quotation letter, e.g. "To give the Quotations of Dustbin."
7. quotationMain.hindi: Hindi transliteration of the English quotation subject line
8. quotation.purchaseLine: One concise Hindi line stating what is being purchased
9. quotationAltHindi.subject: Alternate Hindi inquiry subject line
10. quotationAltEnglish.subject: An alternate English version of inquiry subject
11. bill.itemDescription: One-line formal bill/invoice description in Hindi

${description?.trim() ? "Use the description to make all phrases more specific and accurate." : ""}

Return exactly this JSON structure (no markdown, just JSON):
{
  "categoryName": "Dustbin",
  "categoryId": "dustbin",
  "keywords": ["dustbin", "waste bin", "pedal bin", "garbage bin"],
  "phrases": {
    "supplyOrder": {
      "subject": "स्वच्छता हेतु डस्टबिन सप्लाई करने बाबत।"
    },
    "quotationMain": {
      "english": "To give the Quotations of Dustbin.",
      "hindi": "डस्टबिन के कोटेशन देने हेतु।"
    },
    "quotation": {
      "purchaseLine": "स्वच्छता हेतु डस्टबिन क्रय किया जाना है।"
    },
    "quotationAltHindi": {
      "subject": "सफाई सामग्री के कुटेशन देने बाबत।"
    },
    "quotationAltEnglish": {
      "subject": "To give the Quotations of Cleaning Material."
    },
    "bill": {
      "itemDescription": "स्वच्छता सामग्री डस्टबिन की आपूर्ति हेतु।"
    }
  }
}`;
}

function buildMockPhrases(itemName: string): {
  categoryName: string;
  categoryId: string;
  keywords: string[];
  phrases: DocumentPhrases;
} {
  const base = itemName.trim();
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return {
    categoryName: base,
    categoryId: slug,
    keywords: [base.toLowerCase()],
    phrases: {
      supplyOrder: { subject: `${base} सप्लाई करने बाबत।` },
      quotationMain: {
        english: `To give the Quotations of ${base}.`,
        hindi: `${base} के कोटेशन देने हेतु।`,
      },
      quotation: { purchaseLine: `${base} क्रय किया जाना है।` },
      quotationAltHindi: { subject: `${base} के कुटेशन देने बाबत।` },
      quotationAltEnglish: { subject: `To give the Quotations of ${base}.` },
      bill: { itemDescription: `${base} की आपूर्ति हेतु।` },
    },
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
    return NextResponse.json({ ...buildMockPhrases(itemName), provider: "mock" });
  }

  try {
    const config: AIConfig = { provider: provider as any, apiKey, model };
    const response = await generateAIDraft(config, {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(itemName, description),
      temperature: 0.3,
      maxTokens: 900,
    });

    const raw = response.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI phrase pack JSON:", raw);
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
    }

    if (!parsed.categoryName || !parsed.phrases) {
      return NextResponse.json({ error: "AI response missing required fields", raw }, { status: 502 });
    }

    // Ensure quotationMain is present, fall back gracefully
    if (!parsed.phrases.quotationMain) {
      parsed.phrases.quotationMain = {
        english: parsed.phrases.quotationAltEnglish?.subject || `To give the Quotations of ${parsed.categoryName}.`,
        hindi: parsed.phrases.quotationAltHindi?.subject || `${parsed.categoryName} के कोटेशन देने हेतु।`,
      };
    }

    return NextResponse.json({
      categoryName: parsed.categoryName,
      categoryId: parsed.categoryId || parsed.categoryName.toLowerCase().replace(/\s+/g, "_"),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [itemName.toLowerCase()],
      phrases: parsed.phrases as DocumentPhrases,
      provider: response.provider,
    });
  } catch (error) {
    console.error("Phrase pack generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}
