import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPurposeByCategory, setPurposeByCategory, TEMPORARY_PURPOSE_HINDI, TEMPORARY_PURPOSE_ENGLISH } from './mappingService';
import { db } from './storageService';
import * as fc from 'fast-check';

// Clean up database before and after tests
beforeEach(() => {
  db.clearDatabase();
});

afterEach(() => {
  db.clearDatabase();
});

describe('Purpose Library Lookup by Category', () => {
  describe('Property 1: Purpose Library Lookup by Category', () => {
    // Property-based test for lookup consistency
    it('should return exact professional purpose for valid category mapping - Property 1 (PBT)', async () => {
      // Property: For any category and language, if a purpose mapping exists, 
      // the lookup function shall return the exact professional purpose that was stored.
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // category
          fc.string({ minLength: 1, maxLength: 500 }), // professional purpose
          fc.constantFrom<'hindi' | 'english'>('hindi', 'english'), // language
          async (category, professionalPurpose, language) => {
            // Setup: Create a purpose mapping
            await setPurposeByCategory(category, professionalPurpose, language);
            
            // Execute: Get the purpose by category
            const result = await getPurposeByCategory(category, language);
            
            // Verify: Should return exact professional purpose
            expect(result).toBe(professionalPurpose);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return temporary purpose for invalid category', async () => {
      // Setup: No purpose mapping exists
      const category = 'non_existent_category';
      const language = 'hindi' as const;
      
      // Execute: Get the purpose by category
      const result = await getPurposeByCategory(category, language);
      
      // Verify: Should return temporary purpose
      expect(result).toBe(TEMPORARY_PURPOSE_HINDI);
    });

    it('should return temporary purpose for invalid category in English', async () => {
      // Setup: No purpose mapping exists
      const category = 'non_existent_category';
      const language = 'english' as const;
      
      // Execute: Get the purpose by category
      const result = await getPurposeByCategory(category, language);
      
      // Verify: Should return temporary purpose in English
      expect(result).toBe(TEMPORARY_PURPOSE_ENGLISH);
    });

    it('should support both Hindi and English languages for same category', async () => {
      // Setup: Create mappings for both languages
      const category = 'water_supply';
      const hindiPurpose = 'जल आपूर्ति कार्य हेतु आवश्यक सामग्री';
      const englishPurpose = 'Water supply materials required';
      
      await setPurposeByCategory(category, hindiPurpose, 'hindi');
      await setPurposeByCategory(category, englishPurpose, 'english');
      
      // Execute: Get purposes for both languages
      const hindiResult = await getPurposeByCategory(category, 'hindi');
      const englishResult = await getPurposeByCategory(category, 'english');
      
      // Verify: Should return language-specific purposes
      expect(hindiResult).toBe(hindiPurpose);
      expect(englishResult).toBe(englishPurpose);
    });

    it('should preserve all characters and formatting in professional purpose', async () => {
      // Setup: Create a purpose with special characters and formatting
      const category = 'chemicals';
      const professionalPurpose = 'रासायनिक पदार्थ (Malathion, Sodium Hypochlorite) क्रय';
      const language = 'hindi' as const;
      
      await setPurposeByCategory(category, professionalPurpose, language);
      
      // Execute: Get the purpose by category
      const result = await getPurposeByCategory(category, language);
      
      // Verify: Should preserve all characters and formatting
      expect(result).toBe(professionalPurpose);
      expect(result).toContain('(');
      expect(result).toContain(')');
    });

    it('should handle category name with underscores', async () => {
      // Setup: Create a purpose mapping with underscores in category name
      const category = 'fire_fighting_equipment';
      const professionalPurpose = 'अग्निशमन उपकरण क्रय';
      const language = 'hindi' as const;
      
      await setPurposeByCategory(category, professionalPurpose, language);
      
      // Execute: Get the purpose by category
      const result = await getPurposeByCategory(category, language);
      
      // Verify: Should return exact professional purpose
      expect(result).toBe(professionalPurpose);
    });

    it('should handle category name with spaces', async () => {
      // Setup: Create a purpose mapping with spaces in category name
      const category = 'office supplies';
      const professionalPurpose = 'कार्यालय सामग्री क्रय';
      const language = 'hindi' as const;
      
      await setPurposeByCategory(category, professionalPurpose, language);
      
      // Execute: Get the purpose by category
      const result = await getPurposeByCategory(category, language);
      
      // Verify: Should return exact professional purpose
      expect(result).toBe(professionalPurpose);
    });

    it('should increment usage count on purpose lookup', async () => {
      // Setup: Create a purpose mapping
      const category = 'construction';
      const professionalPurpose = 'निर्माण कार्य हेतु सामग्री';
      const language = 'hindi' as const;
      
      await setPurposeByCategory(category, professionalPurpose, language);
      
      // Execute: Get the purpose multiple times
      await getPurposeByCategory(category, language);
      await getPurposeByCategory(category, language);
      
      // Verify: Usage count should be incremented
      const mappings = db.listPurposeMappings();
      const mapping = mappings.find(m => m.category === category);
      expect(mapping?.usageCount).toBe(2);
    });

    // Property-based test for language-specific purposes
    it('should maintain separate purposes for Hindi and English - Property 1 extension (PBT)', async () => {
      // Property: For any category, Hindi and English purposes are stored and retrieved independently
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // category
          fc.string({ minLength: 1, maxLength: 500 }), // Hindi purpose
          fc.string({ minLength: 1, maxLength: 500 }), // English purpose
          async (category, hindiPurpose, englishPurpose) => {
            // Setup: Create mappings for both languages
            await setPurposeByCategory(category, hindiPurpose, 'hindi');
            await setPurposeByCategory(category, englishPurpose, 'english');
            
            // Execute: Get purposes for both languages
            const retrievedHindi = await getPurposeByCategory(category, 'hindi');
            const retrievedEnglish = await getPurposeByCategory(category, 'english');
            
            // Verify: Each language should return its own purpose
            expect(retrievedHindi).toBe(hindiPurpose);
            expect(retrievedEnglish).toBe(englishPurpose);
            
            // Verify they are different when purposes are different
            if (hindiPurpose !== englishPurpose) {
              expect(retrievedHindi).not.toBe(retrievedEnglish);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    // Property-based test for special characters
    it('should handle special characters in category and purpose - Property 1 extension (PBT)', async () => {
      // Property: For any category and purpose with special characters, 
      // the lookup should preserve all characters exactly
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // category with possible special chars
          fc.string({ minLength: 1, maxLength: 200 }), // purpose with possible special chars
          fc.constantFrom<'hindi', 'english'>('hindi', 'english'),
          async (category, purpose, language) => {
            // Setup: Create a purpose mapping with special characters
            await setPurposeByCategory(category, purpose, language);
            
            // Execute: Get the purpose by category
            const result = await getPurposeByCategory(category, language);
            
            // Verify: Should preserve all characters exactly
            expect(result).toBe(purpose);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
