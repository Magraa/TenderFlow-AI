import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { GeMAIAnalysis, GeMTender, GeMLinkedDoc } from '@/types/gem';
import { getGeMSession, searchGeMBids } from '@/services/gemScraperService';

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  Referer: 'https://bidplus.gem.gov.in/advance-search',
};

async function downloadGeMPdf(pdfUrl: string, bidNumber?: string): Promise<Buffer> {
  let targetUrl = pdfUrl.trim();
  if (targetUrl.startsWith('/')) {
    targetUrl = `https://bidplus.gem.gov.in${targetUrl}`;
  }

  let buffer: Buffer | null = null;
  let isPdf = false;

  // Try direct fetch if targetUrl looks valid
  if (targetUrl.startsWith('http')) {
    let res = await fetch(targetUrl, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);

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

    if (res && res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      isPdf = buffer.length > 50 && buffer.slice(0, 4).toString('ascii') === '%PDF';
    }
  }

  // If buffer is NOT a valid PDF and we have a bidNumber, search GeM to find the real PDF URL!
  if (!isPdf && bidNumber) {
    try {
      console.log(`[GeM AI Analysis] Target ${targetUrl} did not yield valid PDF, searching GeM for ${bidNumber}...`);
      const searchRes = await searchGeMBids({
        searchType: 'bidNumber',
        bidNumber: bidNumber,
      });

      if (searchRes.bids && searchRes.bids.length > 0 && searchRes.bids[0].pdfUrl) {
        const realPdfUrl = searchRes.bids[0].pdfUrl;
        console.log(`[GeM AI Analysis] Found real PDF URL via search: ${realPdfUrl}`);
        if (realPdfUrl !== targetUrl) {
          return await downloadGeMPdf(realPdfUrl);
        }
      }
    } catch (searchErr) {
      console.warn(`[GeM AI Analysis] GeM search fallback failed:`, searchErr);
    }
  }

  if (!buffer || !isPdf) {
    throw new Error(`Failed to download valid GeM PDF for ${bidNumber || targetUrl}. The document was not accessible or returned invalid content.`);
  }

  return buffer;
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

function extractJson(text: string): any {
  if (!text) return null;
  let cleanText = text.trim();

  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }

  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;

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

export async function analyzeGeMTenderDirectly(
  pdfUrl: string,
  tender?: GeMTender,
  customBidNumber?: string
): Promise<GeMAIAnalysis> {
  const targetPdfUrl = pdfUrl || tender?.pdfUrl;
  if (!targetPdfUrl) {
    throw new Error('pdfUrl or tender is required for analysis');
  }

  const bidNumber = customBidNumber || tender?.bidNumber;

  try {
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
      throw new Error(
        'AI API Key is not configured. Please add AI_API_KEY or NEXT_PUBLIC_AI_API_KEY to your environment.'
      );
    }

    // Step 1: Download Main GeM PDF (with bidNumber fallback search)
    const mainPdfBuffer = await downloadGeMPdf(targetPdfUrl, bidNumber);

    // Step 2: Extract Relevant Buyer Uploaded ATC Document URLs from main PDF
    const secondaryDocs = extractRelevantPdfLinks(mainPdfBuffer);
    console.log(`[GeM AI Analysis] Found ${secondaryDocs.length} relevant secondary documents in ${targetPdfUrl}:`, secondaryDocs);

    // Step 3: Fetch secondary attachment PDFs in parallel (strictly ensuring valid PDF magic header)
    const attachedBuffers: { title: string; url: string; buffer: Buffer }[] = [];
    await Promise.all(
      secondaryDocs.map(async (doc) => {
        try {
          const buf = await downloadGeMPdf(doc.url);
          if (buf && buf.length > 50 && buf.slice(0, 4).toString('ascii') === '%PDF') {
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
      usedModel = modelName;

      const model = genAI.getGenerativeModel({
        model: modelName,
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

      attachedBuffers.forEach((att) => {
        if (att.buffer && att.buffer.slice(0, 4).toString('ascii') === '%PDF') {
          promptParts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: att.buffer.toString('base64'),
            },
          });
        }
      });

      const attachedNotes = attachedBuffers.length > 0
        ? `\nNote: ${attachedBuffers.length} Buyer Uploaded ATC / Technical Specification document(s) have been attached directly with this prompt. Analyze all attached sheets thoroughly.`
        : '';

      promptParts.push({
        text: `${SYSTEM_ANALYSIS_PROMPT}\n\nAnalyze this GeM Bid Document (Bid Number: ${
          bidNumber || 'N/A'
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
            content: `Analyze GeM Bid: ${bidNumber || 'N/A'}. Main PDF URL: ${targetPdfUrl}. Secondary attached docs: ${JSON.stringify(
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
            content: `Analyze GeM Bid: ${bidNumber || 'N/A'}. Main PDF URL: ${targetPdfUrl}. Secondary attached docs: ${JSON.stringify(
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
      throw new Error('AI failed to produce structured JSON analysis. Raw response: ' + rawAiResponse.slice(0, 300));
    }

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

    return analysis;
  } catch (error: any) {
    console.error('Error in analyzeGeMTenderDirectly:', error);
    throw error;
  }
}
