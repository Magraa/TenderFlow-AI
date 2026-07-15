import { TenderItem } from '@/types';
import { getPurposeByCategory, consolidatePurposesByCategory, getHindiItemName } from './mappingService';
import { findPhrasePack } from './documentPhraseService';


/**
 * AI Context Generator
 * Generates contextual Hindi government phrases from tender items
 * Used for Vigyapti and Supply Aadesh subject lines and intro paragraphs
 */

interface ContextGenerationResult {
  purposeLine: string;
  subjectLine: string;
  itemSummary: string;
}

function hindiItemNounPhrase(productName: string): string {
  const normalized = productName.toLowerCase();

  if (normalized.includes('aluminium') && (normalized.includes('armoured') || normalized.includes('armored')) && normalized.includes('cable')) {
    // Match the common local spelling used in departments.
    return 'अल्मुनियम अर्मरड केबल';
  }

  if (normalized.includes('cable') || normalized.includes('wire')) {
    return 'केबल/वायर';
  }

  return productName;
}

/**
 * Get Hindi name for item using mapping service
 */
async function getHindiItemNameForSummary(productName: string): Promise<string> {
  try {
    return await getHindiItemName(productName);
  } catch {
    return hindiItemNounPhrase(productName);
  }
}

/**
 * Generate a human-readable Hindi government phrase describing the tender purpose
 * This is a simplified version - in production, this would call an AI service
 */
async function generateTenderPurpose(items: TenderItem[], language: 'hindi' | 'english' = 'hindi'): Promise<ContextGenerationResult> {
  if (items.length === 0) {
    return {
      purposeLine: language === 'hindi' ? 'विभिन्न सामग्री' : 'various materials',
      subjectLine: language === 'hindi' ? 'विभिन्न सामग्री सप्लाई करने बावत ।' : 'Regarding supply of various materials.',
      itemSummary: language === 'hindi' ? 'विभिन्न सामग्री' : 'various materials',
    };
  }

  const categories = new Set<string>();
  const itemNames: string[] = [];

  items.forEach((item) => {
    if (item.category) categories.add(item.category.toLowerCase());
    itemNames.push(item.productName);
  });

  const categoryArray = Array.from(categories);
  const allText = [...categoryArray, ...itemNames.map((n) => n.toLowerCase())].join(' ');

  let workType = '';
  if (allText.includes('cable') || allText.includes('wire') || allText.includes('electrical') || allText.includes('light')) {
    workType = language === 'hindi' ? 'प्रकाश व्यवस्था हेतु' : 'for lighting/electrical work';
  } else if (allText.includes('pump') || allText.includes('water') || allText.includes('pipe')) {
    workType = language === 'hindi' ? 'जल आपूर्ति कार्य हेतु' : 'for water supply work';
  } else if (allText.includes('road') || allText.includes('construction') || allText.includes('cement')) {
    workType = language === 'hindi' ? 'निर्माण कार्य हेतु' : 'for construction work';
  } else if (allText.includes('stationery') || allText.includes('office')) {
    workType = language === 'hindi' ? 'कार्यालय उपयोग हेतु' : 'for office use';
  } else {
    workType = language === 'hindi' ? 'विभिन्न कार्यों हेतु' : 'for various works';
  }

  let itemSummary = '';
  if (items.length === 1) {
    itemSummary = language === 'hindi' ? await getHindiItemNameForSummary(items[0].productName) : items[0].productName;
  } else if (items.length <= 3) {
    itemSummary =
      language === 'hindi'
        ? (await Promise.all(items.map((i) => getHindiItemNameForSummary(i.productName)))).join(', ')
        : items.map((i) => i.productName).join(', ');
  } else {
    const firstItemName = language === 'hindi' ? await getHindiItemNameForSummary(items[0].productName) : items[0].productName;
    itemSummary =
      language === 'hindi'
        ? `${firstItemName} एवं अन्य ${items.length - 1} सामग्री`
        : `${items[0].productName} and ${items.length - 1} other items`;
  }

  const purposeLine = `${workType} ${itemSummary}`;

  const subjectLine =
    language === 'hindi'
      ? `${workType} ${items.length === 1 ? await getHindiItemNameForSummary(items[0].productName) : 'सामग्री'} सप्लाई करने बावत ।`
      : `Regarding supply of ${items.length === 1 ? items[0].productName : 'materials'} ${workType}.`;

  return { purposeLine, subjectLine, itemSummary };
}
/**
 * Generate intro paragraph for Vigyapti
 */
export async function generateVigyaptiIntro(
  placeName: string,
  _districtName: string,
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  const context = await generateTenderPurpose(items, language);

  if (language === 'hindi') {
    return `एतद् द्वारा सर्व संबंधित वाणिज्य कर विभाग में पंजीकृत फर्मों को सूचित किया जाता है कि नगर परिषद ${placeName} द्वारा ${context.purposeLine} क्रय किया जाना प्रस्तावित है।`;
  }

  return `All concerned firms registered with the Commercial Tax Department are hereby informed that the Municipal Council ${placeName} proposes to purchase ${context.purposeLine}.`;
}

/**
 * Generate subject line for Supply Aadesh
 */
export async function generateSupplyAadeshSubject(
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  const context = await generateTenderPurpose(items, language);
  
  if (language === 'hindi') {
    return `विषय:- ${context.subjectLine}`;
  } else {
    return `Subject: ${context.subjectLine}`;
  }
}

/**
 * Generate body paragraph for Supply Aadesh
 */
export async function generateSupplyAadeshBody(
  _firmName: string,
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  if (items.length > 0) {
    const firstItem = items[0];
    const pack = await findPhrasePack(firstItem.category || firstItem.productName);
    if (pack) {
      const itemSummary = language === 'hindi' ? (pack.phrases.bill?.itemDescription || pack.categoryName) : pack.categoryName;
      if (language === 'hindi') {
        return `विशेषान्तर्गत आपको अवगत कराया जाता है कि आपके द्वारा प्रस्तुत ${itemSummary} के संबंध में कोटेशन दिनांक ............. के माध्यम से सप्लाई हेतु निवेदन किया गया था, जो दर न्यूनतम होने से कार्यालय द्वारा दर स्वीकृत की गई है।\n\nअतः आप निम्न सामग्री की सप्लाई को सात दिवस में प्रस्तुत करें।`;
      } else {
        return `Dear Sir/Madam,\n\nWith reference to the rates submitted by you for ${itemSummary}, you are hereby informed that your firm has been selected for the supply of the following materials. Please ensure timely delivery within the specified timeframe.`;
      }
    }
  }

  const context = await generateTenderPurpose(items, language);

  if (language === 'hindi') {
    return `विशेषान्तर्गत आपको अवगत कराया जाता है कि आपके द्वारा प्रस्तुत ${context.itemSummary} के संबंध में कोटेशन दिनांक ............. के माध्यम से सप्लाई हेतु निवेदन किया गया था, जो दर न्यूनतम होने से कार्यालय द्वारा दर स्वीकृत की गई है।\n\nअतः आप निम्न सामग्री की सप्लाई को सात दिवस में प्रस्तुत करें।`;
  } else {
    return `Dear Sir/Madam,\n\nWith reference to the rates submitted by you for ${context.itemSummary}, you are hereby informed that your firm has been selected for the supply of the following materials. Please ensure timely delivery within the specified timeframe.`;
  }
}

/**
 * Generate professional purpose line using category-based mapping
 * For single category
 */
export async function generatePurposeLineByCategory(
  category: string,
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  return await getPurposeByCategory(category, language);
}

/**
 * Generate professional purpose line using category-based mapping
 * For multiple items (consolidates purposes by category)
 */
export async function generatePurposeLineByCategoryForItems(
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  return await consolidatePurposesByCategory(items, language);
}

/**
 * Generate Vigyapti intro using professional purposes
 */
export async function generateVigyaptiIntroWithPurpose(
  placeName: string,
  _districtName: string,
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  if (items.length > 0) {
    const firstItem = items[0];
    const pack = await findPhrasePack(firstItem.category || firstItem.productName);
    if (pack) {
      if (language === 'hindi') {
        const purchaseLine = pack.phrases.quotation.purchaseLine || `${pack.categoryName} क्रय किया जाना है।`;
        return `एतद् द्वारा सर्व संबंधित वाणिज्य कर विभाग में पंजीकृत फर्मों को सूचित किया जाता है कि नगर परिषद ${placeName} में ${purchaseLine}`;
      } else {
        const categoryName = pack.categoryName || firstItem.productName;
        return `All concerned firms registered with the Commercial Tax Department are hereby informed that the Municipal Council ${placeName} proposes to purchase ${categoryName}.`;
      }
    }
  }

  const purpose = await generatePurposeLineByCategoryForItems(items, language);
  
  if (language === 'hindi') {
    return `एतद् द्वारा सर्व संबंधित वाणिज्य कर विभाग में पंजीकृत फर्मों को सूचित किया जाता है कि नगर परिषद ${placeName} द्वारा ${purpose} क्रय किया जाना प्रस्तावित है।`;
  }
  
  return `All concerned firms registered with the Commercial Tax Department are hereby informed that the Municipal Council ${placeName} proposes to purchase ${purpose}.`;
}

/**
 * Generate Supply Aadesh subject using professional purposes
 */
export async function generateSupplyAadeshSubjectWithPurpose(
  items: TenderItem[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  if (items.length > 0) {
    const firstItem = items[0];
    const pack = await findPhrasePack(firstItem.category || firstItem.productName);
    if (pack) {
      if (language === 'hindi') {
        return `विषय:- ${pack.phrases.supplyOrder.subject}`;
      } else {
        return `Subject: ${pack.phrases.quotationMain?.english || pack.phrases.quotationAltEnglish.subject}`;
      }
    }
  }

  const purpose = await generatePurposeLineByCategoryForItems(items, language);
  
  if (language === 'hindi') {
    return `विषय:- ${purpose} सप्लाई करने बावत ।`;
  } else {
    return `Subject: Regarding supply of ${purpose}.`;
  }
}


export const aiContextGenerator = {
  generateTenderPurpose,
  generateVigyaptiIntro,
  generateSupplyAadeshSubject,
  generateSupplyAadeshBody,
  generatePurposeLineByCategory,
  generatePurposeLineByCategoryForItems,
  generateVigyaptiIntroWithPurpose,
  generateSupplyAadeshSubjectWithPurpose,
};
