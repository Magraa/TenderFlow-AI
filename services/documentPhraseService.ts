import { DocumentPhraseMapping, DocumentPhrases } from "@/types";
import { dataService } from "./dataService";

/**
 * Document Phrase Service
 *
 * High-level orchestrator for phrase pack lookups, AI generation, and storage.
 *
 * Flow:
 *  1. findByKeyword(itemName)  → returns existing pack if found
 *  2. generateAndSave(itemName) → calls /api/ai/generate-phrase-pack, stores, returns pack
 *  3. getOrGenerate(itemName)   → combination of the two above
 */

// ─── Low-level lookup ───────────────────────────────────────────────────────

export async function findPhrasePack(keyword: string): Promise<DocumentPhraseMapping | undefined> {
  try {
    return await dataService.documentPhraseMappings.findByKeyword(keyword);
  } catch (error) {
    console.error("[documentPhraseService] findPhrasePack error:", error);
    return undefined;
  }
}

// ─── AI Generation ──────────────────────────────────────────────────────────

export interface GeneratedPhrasePack {
  categoryName: string;
  categoryId: string;
  keywords: string[];
  phrases: DocumentPhrases;
  provider: string;
}

export async function generatePhrasePack(
  itemName: string,
  description?: string
): Promise<GeneratedPhrasePack | null> {
  try {
    const response = await fetch("/api/ai/generate-phrase-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName, description }),
    });

    if (!response.ok) {
      console.error("[documentPhraseService] API error:", response.status);
      return null;
    }

    return (await response.json()) as GeneratedPhrasePack;
  } catch (error) {
    console.error("[documentPhraseService] generatePhrasePack error:", error);
    return null;
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function savePhrasePack(
  pack: GeneratedPhrasePack,
  itemName: string,
  description?: string
): Promise<DocumentPhraseMapping> {
  // Check if category already exists and merge keywords instead of duplicating
  const existing = await dataService.documentPhraseMappings.getByCategory(pack.categoryId);

  if (existing) {
    const mergedKeywords = Array.from(
      new Set([...existing.keywords, itemName.toLowerCase(), ...pack.keywords])
    );
    const patch: any = {
      keywords: mergedKeywords,
      usageCount: existing.usageCount + 1,
      lastUsedAt: new Date().toISOString(),
    };
    if (description && !existing.englishDescription) {
      patch.englishDescription = description;
    }
    const updated = await dataService.documentPhraseMappings.update(existing.id, patch);
    return updated || existing;
  }

  return dataService.documentPhraseMappings.create({
    categoryName: pack.categoryName,
    categoryId: pack.categoryId,
    keywords: Array.from(new Set([itemName.toLowerCase(), ...pack.keywords])),
    phrases: pack.phrases,
    generatedByAI: pack.provider !== "mock",
    approved: false,
    usageCount: 1,
    lastUsedAt: new Date().toISOString(),
    englishDescription: description || '',
  });
}

// ─── Get or Generate (main entry point) ──────────────────────────────────────

export interface GetOrGenerateOptions {
  mode?: 'auto' | 'force' | 'manual';
  categoryId?: string;
}

export async function getOrGeneratePhrasePack(
  itemName: string,
  description?: string,
  options?: GetOrGenerateOptions
): Promise<DocumentPhraseMapping | null> {
  const mode = options?.mode || 'auto';

  // 1. Manual mode: Associate item name with a specific category
  if (mode === 'manual' && options?.categoryId) {
    const existingCategory = await dataService.documentPhraseMappings.getByCategory(options.categoryId);
    if (existingCategory) {
      const mergedKeywords = Array.from(
        new Set([...existingCategory.keywords, itemName.toLowerCase()])
      );
      const patch: any = {
        keywords: mergedKeywords,
        usageCount: existingCategory.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      };
      if (description && !existingCategory.englishDescription) {
        patch.englishDescription = description;
      }
      const updated = await dataService.documentPhraseMappings.update(existingCategory.id, patch);
      return updated || existingCategory;
    }
    // Fall back to auto if category not found
  }

  // 2. Auto mode: Try DB lookup first
  if (mode === 'auto') {
    const existing = await findPhrasePack(itemName);
    if (existing) {
      // Increment usage in background
      const patch: any = {
        usageCount: existing.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      };
      if (description && !existing.englishDescription) {
        patch.englishDescription = description;
      }
      dataService.documentPhraseMappings.update(existing.id, patch).catch(console.error);
      return existing;
    }
  }

  // 3. Force mode or Fallback: Generate via AI
  const generated = await generatePhrasePack(itemName, description);
  if (!generated) return null;

  return savePhrasePack(generated, itemName, description);
}

// ─── Add keyword to existing category ────────────────────────────────────────

export async function addKeywordToCategory(
  categoryId: string,
  keyword: string
): Promise<boolean> {
  const existing = await dataService.documentPhraseMappings.getByCategory(categoryId);
  if (!existing) return false;

  if (existing.keywords.includes(keyword.toLowerCase())) return true;

  await dataService.documentPhraseMappings.update(existing.id, {
    keywords: [...existing.keywords, keyword.toLowerCase()],
  });
  return true;
}

// ─── Get phrase for a specific document slot ─────────────────────────────────

export async function getPhraseForSupplyOrderSubject(itemName: string): Promise<string | null> {
  const pack = await findPhrasePack(itemName);
  return pack?.phrases.supplyOrder.subject ?? null;
}

export async function getPhraseForQuotationLine(itemName: string): Promise<string | null> {
  const pack = await findPhrasePack(itemName);
  return pack?.phrases.quotation.purchaseLine ?? null;
}

