import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { GeMAIAnalysis, GeMTender, GeMLinkedDoc } from '@/types/gem';
import { getGeMSession } from '@/services/gemScraperService';

export const maxDuration = 60; // Allow longer timeout for PDF download and AI processing

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  Referer: 'https://bidplus.gem.gov.in/advance-search',
};

async function downloadGeMPdf(pdfUrl: string): Promise<Buffer> {
  let targetUrl = pdfUrl.trim();
  if (targetUrl.startsWith('/')) {
    targetUrl = `https://bidplus.gem.gov.in${targetUrl}`;
  }

  // First try direct fetch
  let res = await fetch(targetUrl, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  // If failed, try with GeM session cookie
  if (!res || !res.ok) {
    try {
      const session = await getGeMSession();
      res = await fetch(targetUrl, {
        headers: {
          ...DEFAULT_HEADERS,
          Cookie: session.cookieStr,
        },
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      // Ignore session failure and check response
    }
  }

  if (!res || !res.ok) {
    throw new Error(`Failed to download GeM PDF from ${targetUrl} (Status: ${res?.status || 'Network Error'})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extracts relevant secondary document URLs (such as Buyer uploaded ATC files)
 * while strictly skipping boilerplate GeM General Terms and Conditions (GTC) and feedback links.
 */
function extractRelevantPdfLinks(pdfBuffer: Buffer): { title: string; url: string }[] {
  const content = pdfBuffer.toString('binary');
  const foundUrls = new Set<string>();

  // 1. Match /URI (http...)
  const uriRegex = /\/URI\s*\((https?:\/\/[^\)\s]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = uriRegex.exec(content)) !== null) {
    if (match[1]) foundUrls.add(match[1].trim());
  }

  // 2. Match /URI <hex>
  const hexUriRegex = /\/URI\s*<([0-9a-fA-F]+)>/gi;
  while ((match = hexUriRegex.exec(content)) !== null) {
    try {
      const hex = match[1];
      let decoded = '';
      for (let i = 0; i < hex.length; i += 2) {
        decoded += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      if (decoded.startsWith('http')) {
        foundUrls.add(decoded.trim());
      }
    } catch {
      // ignore hex parse error
    }
  }

  // 3. Match raw URLs in PDF streams
  const rawUrlRegex = /https?:\/\/[a-zA-Z0-9_\-\.\/]+(?:buyer-atc-upload|download-atc-file|showbidDocument|show-atc|\.pdf)[^\s<>"'\(\)\[\]{}]*/gi;
  while ((match = rawUrlRegex.exec(content)) !== null) {
    if (match[0]) foundUrls.add(match[0].trim());
  }

  // Filter URLs: strictly SKIP boilerplate GTC / SLA / Feedback
  const relevantDocs: { title: string; url: string }[] = [];

  for (const url of foundUrls) {
    const lower = url.toLowerCase();

    // STRICTLY SKIP: Boilerplate General Terms and Conditions / SLA / Service links / Feedback
    if (
      lower.includes('page/detail/34') ||
      lower.includes('general-terms') ||
      lower.includes('general_terms') ||
      lower.includes('/gtc') ||
      lower.includes('service-level-agreement') ||
      lower.includes('terms-and-conditions') ||
      lower.includes('feedback') ||
      lower.includes('contact-us') ||
      lower.startsWith('mailto:')
    ) {
      continue;
    }

    // Keep Buyer uploaded ATC documents, specification files, attachments
    if (
      lower.includes('buyer-atc') ||
      lower.includes('buyer_atc') ||
      lower.includes('atc') ||
      lower.includes('download-atc') ||
      lower.includes('spec') ||
      lower.includes('upload') ||
      lower.endsWith('.pdf') ||
      lower.includes('showbid')
    ) {
      let docTitle = 'Buyer Uploaded ATC / Technical Specification Document';
      if (lower.includes('spec')) {
        docTitle = 'Buyer Technical Specification Document';
      } else if (lower.includes('atc')) {
        docTitle = 'Buyer Added ATC Document';
      }

      relevantDocs.push({
        title: docTitle,
        url,
      });
    }
  }

  return relevantDocs.slice(0, 5); // Limit to top 5 attachments
}

function extractJson(text: string): Record<string, any> | null {
  if (!text) return null;
  // Remove markdown code blocks if present
  let cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error('Failed to parse AI JSON:', err, cleanText.slice(0, 300));
    return null;
  }
}

const SYSTEM_ANALYSIS_PROMPT = `You are an expert Government e-Marketplace (GeM) tender analyst specializing in Indian government procurement bids.
Your task is to analyze the provided GeM Tender Bid document PDF along with any attached Buyer-uploaded ATC / Technical Specification documents (such as uploaded ATC specification sheets, technical parameters, BOQ sheets, amended conditions, handwritten notes/stamps).

CRITICAL INSTRUCTIONS FOR ATTACHED BUYER UPLOADED DOCUMENTS & SPECIFICATIONS:
- The user has provided the main Bid Document AND the attached Buyer-uploaded ATC / Specification documents.
- You MUST thoroughly analyze ALL documents together.
- Extract complete technical specifications and parameters from the attached buyer specification sheet (such as Voltage range, LED Lumen Output/watt, Frequency range, Power Factor, CRI, Protection Level / IP rating including any amendments like IP-66 vs IP-67, Impact Protection IK level, Total Harmonic Distortion, Surge Protection Internal & External, LED Life Expectancy, LM Report, make/model, etc.).
- If there are additional items or specific technical parameters in the attached buyer ATC document, add them directly to the "items" and "specifications" fields and highlight them in the summary!
- Note any specific handwritten or stamped notes or amendments in the ATC sheet (e.g. amendments changing IP-67 to IP-66 or special buyer instructions).
- DO NOT summarize or include boilerplate GeM General Terms and Conditions (GTC). Focus strictly on this specific tender's requirements, buyer-added terms, item specifications, and financials.

Key data to extract:
1. Ministry / State Name (मं ालय/रा!य का नाम/Ministry/State Name)
2. Department Name (विभाग का नाम/Department Name)
3. Organisation Name (संगठन का नाम/Organisation Name)
4. Office Name (कार्यालय का नाम/Office Name)
5. Buyer Name & Address if available
6. Total Quantity (item total Qty) and Unit
7. Full Item Details & Technical Specifications:
   - Item Name / Category
   - Specifications (key parameters, dimensions, capacity, voltage, lumens, CRI, surge protection, IP ratings, amendments, make/model requirements)
   - Consignees and Delivery locations with quantities & delivery days
8. EMD Amount & ePBG Details:
   - Is EMD required?
   - Exact EMD Amount (ईएमडी राशि) in INR (Rs.)
   - Exemption criteria (for MSEs, Startups, etc. Note: if Buyer ATC explicitly states "EMD exemption is not allowed to anyone", highlight this!)
   - ePBG / Performance Security Percentage (%) and Amount
   - EMD Advisory
9. Estimated Bid Value / Price:
   - Estimated Bid Value in INR (if disclosed, else indicate undisclosed)
10. Buyer Added Bid Specific Terms and Conditions (ATC):
    - Extract all buyer-added text ATC clauses AND terms from the buyer-uploaded document.
11. Eligibility & Compliance Criteria:
    - Minimum Average Annual Turnover of Bidder
    - Years of Past Experience Required
    - Past Performance percentage
    - Mandatory Certificates / Documents Required (GST, PAN, OEM Authorization, ISO, etc.)
    - MII (Make In India) and MSE purchase preferences
12. Important Dates:
    - Bid Publish Date, Bid End Date/Time, Bid Opening Date/Time, RA Date if applicable
13. Any Secondary Linked Attachment URLs or Documents mentioned in the PDF.
14. Executive Summary:
    - A crisp 3-4 sentence summary in Hindi (हिंदी सारांश) mentioning the product, quantities, key buyer ATC conditions, and technical parameters.
    - A crisp 3-4 sentence summary in English highlighting scope, budget, and key buyer terms.

Return ONLY valid JSON matching this exact structure:
{
  "ministryName": "string",
  "departmentName": "string",
  "organisationName": "string",
  "officeName": "string",
  "townName": "string (e.g. Porsa)",
  "districtName": "string (e.g. Morena)",
  "stateName": "string (e.g. Madhya Pradesh)",
  "placeDisplay": "string (e.g. Porsa (Morena))",
  "buyerName": "string",
  "buyerAddress": "string",
  "bidNumber": "string",
  "itemTitle": "string",
  "totalQuantity": 100,
  "items": [
    {
      "name": "Item name",
      "category": "Category",
      "quantity": 10,
      "unit": "pieces / nos / meters / etc",
      "specifications": "Key specifications and technical parameters extracted from both main bid and buyer uploaded ATC sheet (e.g. Voltage: 100-300V, Lumens: >=110 lm/W, IP-66/67, Surge: 4kV/10kV, etc.)",
      "consignees": [
        {
          "name": "Consignee officer name",
          "address": "Consignee address",
          "city": "City",
          "state": "State",
          "pincode": "Pincode",
          "quantity": 10,
          "deliveryDays": 30
        }
      ],
      "deliveryDays": 30
    }
  ],
  "emdAmount": {
    "required": true,
    "amount": 25000,
    "currency": "INR",
    "exemptionAllowed": false,
    "exemptionCriteria": "Details on whether EMD exemption is allowed or strictly disallowed by Buyer ATC",
    "pbgPercentage": 3,
    "pbgAmount": 15000,
    "advisory": "EMD in favor of..."
  },
  "estimatedBidValue": {
    "amount": 500000,
    "currency": "INR",
    "isEstimatedProvided": true,
    "rawText": "Rs. 5,00,000 / Undisclosed"
  },
  "buyerAddedTerms": [
    "1. Clause text...",
    "2. Clause text..."
  ],
  "eligibilityCriteria": {
    "turnover": "Rs. 14 Lakhs",
    "experienceYears": 2,
    "pastPerformancePercent": 40,
    "certificatesRequired": ["GST Registration", "OEM Authorization Certificate", "PAN Card", "CA Turnover Certificate with UDIN", "Make in India Certificate", "Warranty Declaration"],
    "oemAuthorizationRequired": true,
    "msePreference": "No",
    "miiPreference": "No"
  },
  "importantDates": {
    "publishDate": "DD-MM-YYYY",
    "bidEndDate": "DD-MM-YYYY HH:MM",
    "bidOpeningDate": "DD-MM-YYYY HH:MM",
    "raDate": ""
  },
  "linkedDocuments": [
    {
      "title": "Buyer Technical Specification Document",
      "url": "https://..."
    }
  ],
  "summaryHindi": "हिंदी में विस्तृत एवं संक्षिप्त सारांश जिसमें वस्तु, मात्रा, तकनीकी विशिष्टताएँ तथा क्रेता की मुख्य शर्तें शामिल हों...",
  "summaryEnglish": "Crisp summary in English highlighting scope, technical specifications, and key buyer terms."
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pdfUrl, bidNumber, tender } = body as {
      pdfUrl?: string;
      bidNumber?: string;
      tender?: GeMTender;
    };

    const targetPdfUrl = pdfUrl || tender?.pdfUrl;
    if (!targetPdfUrl) {
      return NextResponse.json(
        { success: false, error: 'pdfUrl or tender is required' },
        { status: 400 }
      );
    }

    const provider = (
      process.env.AI_PROVIDER ||
      process.env.NEXT_PUBLIC_AI_PROVIDER ||
      'gemini'
    ).toLowerCase();
    const apiKey =
      process.env.AI_API_KEY ||
      process.env.NEXT_PUBLIC_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';
    const modelName =
      process.env.AI_MODEL ||
      process.env.NEXT_PUBLIC_AI_MODEL ||
      'gemini-2.5-flash';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'AI API Key is not configured. Please add AI_API_KEY or NEXT_PUBLIC_AI_API_KEY to your environment.',
        },
        { status: 500 }
      );
    }

    // Step 1: Download Main GeM PDF
    const mainPdfBuffer = await downloadGeMPdf(targetPdfUrl);

    // Step 2: Extract Relevant Buyer Uploaded ATC Document URLs from main PDF
    const secondaryDocs = extractRelevantPdfLinks(mainPdfBuffer);
    console.log(`[GeM AI Analysis] Found ${secondaryDocs.length} relevant secondary documents in ${targetPdfUrl}:`, secondaryDocs);

    // Step 3: Fetch secondary attachment PDFs in parallel
    const attachedBuffers: { title: string; url: string; buffer: Buffer }[] = [];
    await Promise.all(
      secondaryDocs.map(async (doc) => {
        try {
          const buf = await downloadGeMPdf(doc.url);
          // Verify it's a PDF or binary file
          if (buf && buf.length > 100) {
            attachedBuffers.push({
              title: doc.title,
              url: doc.url,
              buffer: buf,
            });
          }
        } catch (err) {
          console.warn(`[GeM AI Analysis] Could not download secondary document from ${doc.url}:`, err);
        }
      })
    );

    let rawAiResponse = '';
    let usedModel = modelName;

    // Step 4: Call Multimodal Gemini AI with Main PDF + all attached Buyer ATC PDFs
    if (provider === 'gemini' || !provider || provider === 'google') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const resolvedModel = modelName.includes('gemini') ? modelName : 'gemini-2.5-flash';
      usedModel = resolvedModel;
      const model = genAI.getGenerativeModel({
        model: resolvedModel,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const promptParts: any[] = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: mainPdfBuffer.toString('base64'),
          },
        },
      ];

      // Add all attached buyer uploaded ATC specification documents
      attachedBuffers.forEach((att) => {
        promptParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: att.buffer.toString('base64'),
          },
        });
      });

      const attachedNotes = attachedBuffers.length > 0
        ? `\nNote: ${attachedBuffers.length} Buyer Uploaded ATC / Technical Specification document(s) have been attached directly with this prompt. Analyze all attached sheets thoroughly.`
        : '';

      promptParts.push({
        text: `${SYSTEM_ANALYSIS_PROMPT}\n\nAnalyze this GeM Bid Document (Bid Number: ${
          bidNumber || tender?.bidNumber || 'N/A'
        }).${attachedNotes}\nReturn full structured JSON as specified.`,
      });

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      rawAiResponse = response.text() || '';
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: modelName || 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_ANALYSIS_PROMPT },
          {
            role: 'user',
            content: `Analyze GeM Bid: ${bidNumber || tender?.bidNumber || 'N/A'}. Main PDF URL: ${targetPdfUrl}. Secondary attached docs: ${JSON.stringify(
              secondaryDocs
            )}`,
          },
        ],
        temperature: 0.1,
      });
      rawAiResponse = completion.choices[0]?.message?.content || '';
    } else if (provider === 'groq') {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model: modelName || 'llama3-70b-8192',
        messages: [
          { role: 'system', content: SYSTEM_ANALYSIS_PROMPT },
          {
            role: 'user',
            content: `Analyze GeM Bid: ${bidNumber || tender?.bidNumber || 'N/A'}. Main PDF URL: ${targetPdfUrl}. Secondary attached docs: ${JSON.stringify(
              secondaryDocs
            )}`,
          },
        ],
        temperature: 0.1,
      });
      rawAiResponse = completion.choices[0]?.message?.content || '';
    }

    const parsedJson = extractJson(rawAiResponse);
    if (!parsedJson) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI failed to produce structured JSON analysis.',
          rawContent: rawAiResponse.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    // Build list of all linked documents including discovered attachments
    const allLinkedDocs: GeMLinkedDoc[] = [];
    const seenUrls = new Set<string>();

    if (Array.isArray(parsedJson.linkedDocuments)) {
      parsedJson.linkedDocuments.forEach((d: any) => {
        if (d?.url && !seenUrls.has(d.url)) {
          seenUrls.add(d.url);
          allLinkedDocs.push({
            title: String(d.title || 'Attached Document'),
            url: String(d.url),
          });
        }
      });
    }

    secondaryDocs.forEach((d) => {
      if (!seenUrls.has(d.url)) {
        seenUrls.add(d.url);
        allLinkedDocs.push(d);
      }
    });

    let town = String(parsedJson.townName || '').trim();
    let district = String(parsedJson.districtName || '').trim();
    const state = String(parsedJson.stateName || parsedJson.ministryName || tender?.ministryName || '').trim();

    // Fallback extraction from officeName if town/district was omitted
    const officeStr = String(parsedJson.officeName || '').toLowerCase();
    if (!town && officeStr.includes('porsa')) {
      town = 'Porsa';
      if (!district) district = 'Morena';
    }

    let placeDisplay = String(parsedJson.placeDisplay || '').trim();
    if (!placeDisplay) {
      if (town && district) {
        placeDisplay = `${town} (${district})`;
      } else if (town) {
        placeDisplay = town;
      } else if (district) {
        placeDisplay = district;
      }
    }

    const analysis: GeMAIAnalysis = {
      ministryName: parsedJson.ministryName || tender?.ministryName || '',
      departmentName: parsedJson.departmentName || tender?.departmentName || '',
      organisationName: parsedJson.organisationName || '',
      officeName: parsedJson.officeName || '',
      townName: town || undefined,
      districtName: district || undefined,
      stateName: state || undefined,
      placeDisplay: placeDisplay || undefined,
      buyerName: parsedJson.buyerName || '',
      buyerAddress: parsedJson.buyerAddress || '',
      bidNumber: parsedJson.bidNumber || bidNumber || tender?.bidNumber || '',
      itemTitle: parsedJson.itemTitle || tender?.categoryName || '',
      totalQuantity: Number(parsedJson.totalQuantity) || tender?.totalQuantity || 1,
      items: Array.isArray(parsedJson.items)
        ? parsedJson.items.map((it: any) => ({
            name: String(it.name || it.itemTitle || 'Item'),
            category: it.category ? String(it.category) : undefined,
            quantity: Number(it.quantity) || 1,
            unit: String(it.unit || 'piece'),
            specifications: it.specifications || '',
            consignees: Array.isArray(it.consignees) ? it.consignees : [],
            deliveryDays: Number(it.deliveryDays) || undefined,
          }))
        : (tender?.items || []).map((name) => ({
            name,
            quantity: tender?.totalQuantity || 1,
            unit: 'piece',
          })),
      emdAmount: parsedJson.emdAmount
        ? {
            required: Boolean(parsedJson.emdAmount.required),
            amount: Number(parsedJson.emdAmount.amount) || 0,
            currency: parsedJson.emdAmount.currency || 'INR',
            exemptionAllowed: Boolean(parsedJson.emdAmount.exemptionAllowed),
            exemptionCriteria: parsedJson.emdAmount.exemptionCriteria || '',
            pbgPercentage: Number(parsedJson.emdAmount.pbgPercentage) || undefined,
            pbgAmount: Number(parsedJson.emdAmount.pbgAmount) || undefined,
            advisory: parsedJson.emdAmount.advisory || '',
          }
        : undefined,
      estimatedBidValue: parsedJson.estimatedBidValue
        ? {
            amount: Number(parsedJson.estimatedBidValue.amount) || undefined,
            currency: parsedJson.estimatedBidValue.currency || 'INR',
            isEstimatedProvided: Boolean(parsedJson.estimatedBidValue.isEstimatedProvided),
            rawText: parsedJson.estimatedBidValue.rawText || '',
          }
        : undefined,
      buyerAddedTerms: Array.isArray(parsedJson.buyerAddedTerms)
        ? parsedJson.buyerAddedTerms.map(String)
        : [],
      eligibilityCriteria: parsedJson.eligibilityCriteria
        ? {
            turnover: parsedJson.eligibilityCriteria.turnover || '',
            experienceYears: Number(parsedJson.eligibilityCriteria.experienceYears) || 0,
            pastPerformancePercent:
              Number(parsedJson.eligibilityCriteria.pastPerformancePercent) || 0,
            certificatesRequired: Array.isArray(
              parsedJson.eligibilityCriteria.certificatesRequired
            )
              ? parsedJson.eligibilityCriteria.certificatesRequired
              : [],
            oemAuthorizationRequired: Boolean(
              parsedJson.eligibilityCriteria.oemAuthorizationRequired
            ),
            msePreference: parsedJson.eligibilityCriteria.msePreference || '',
            miiPreference: parsedJson.eligibilityCriteria.miiPreference || '',
          }
        : undefined,
      importantDates: parsedJson.importantDates || {
        publishDate: '',
        bidEndDate: tender?.endDate || '',
        bidOpeningDate: '',
        raDate: '',
      },
      linkedDocuments: allLinkedDocs,
      summaryHindi: parsedJson.summaryHindi || '',
      summaryEnglish: parsedJson.summaryEnglish || '',
      analyzedAt: new Date().toISOString(),
      modelUsed: usedModel,
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing GeM tender PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to analyze tender PDF',
      },
      { status: 500 }
    );
  }
}
