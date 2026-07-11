# Requirements Document

## Introduction

This feature addresses the need to professionalize government tender document generation in the Magra Automation system. Currently, Vigyapti (Tender Notice) and Supply Aadesh (Supply Order) documents are generated using raw item names directly in the narrative, which appears unprofessional and mechanical. Government documents should be generated from the purpose/category of procurement, not raw item names.

The enhancement will introduce a procurement purpose library system that maps procurement categories to professional procurement purposes, provides Hindi transliteration for item names and supplier names, and improves document subjects and narratives using standardized government wording.

## Glossary

- **System**: Magra Automation - A government tender management system
- **Vigyapti**: Public tender notification document
- **Supply Aadesh**: Formal supply order document
- **Procurement Purpose**: Professional description of why items are being procured (e.g., "अग्निशमन एवं जल आपूर्ति कार्य हेतु सामग्री क्रय")
- **Procurement Category**: Grouping of similar items (e.g., "fire_fighting", "water_supply", "chemicals")
- **Hindi Transliteration**: Phonetic representation of English text in Devanagari script
- **Purpose Library**: Reusable database mapping categories to professional procurement purposes
- **Item Hindi Mapping**: Dictionary mapping English item names to Hindi phonetic names
- **Vendor Hindi Mapping**: Dictionary mapping vendor names and locations to Hindi
- **Tender**: A formal invitation to bid for a project
- **Firm**: A registered business entity that responds to tenders

## Requirements

### Requirement 1: Procurement Purpose Library (Category-Based)

**User Story:** As a government tender officer, I want to maintain a reusable mapping database that maps procurement categories to professional procurement purposes, so that tender documents use formal government language instead of raw item names and all items in the same category use the same purpose.

#### Acceptance Criteria

1. THE System SHALL provide a Purpose Library interface to manage mappings between procurement categories and professional procurement purposes
2. WHEN a new item is added to a tender, THE System SHALL extract the category from the item and check the Purpose Library for a matching category entry
3. IF no mapping exists for a category, THE System SHALL use a temporary purpose "संबंधित कार्य हेतु आवश्यक सामग्री" without prompting the user
4. WHERE a mapping exists, THE System SHALL use the professional procurement purpose in Vigyapti and Supply Aadesh document generation
5. THE Purpose Library SHALL support CRUD operations for managing mappings
6. FOR ALL items in a tender, THE System SHALL consolidate purposes by category and generate a single professional narrative for each unique category

### Requirement 2: Hindi Transliteration for Item Names

**User Story:** As a government tender officer, I want to display Hindi phonetic names in the item table, so that documents appear more professional and are easier for Hindi-speaking officials to read.

#### Acceptance Criteria

1. THE System SHALL maintain an Item Hindi Mapping dictionary for common items
2. WHEN displaying items in the tender form, THE System SHALL show Hindi phonetic names alongside English names
3. WHERE no Hindi mapping exists for an item, THE System SHALL call an AI transliteration API once to generate the Hindi name
4. THE System SHALL store new Hindi mappings for future use
5. FOR document generation, THE System SHALL use Hindi names in the items table when language is set to Hindi

### Requirement 3: Estimated Amount Field (Tender Level)

**User Story:** As a government tender officer, I want to add an "अनुमानित राशि" (Estimated Amount) field to the Tender for standardized budget planning, so that the total estimated budget is clearly displayed in the Vigyapti document.

#### Acceptance Criteria

1. THE System SHALL add an "अनुमानित राशि" field to the Tender
2. WHERE the user selects from predefined options, THE System SHALL provide values: 95,000, 98,000, 1,98,000
3. WHERE the user selects "Custom", THE System SHALL allow free text input for estimated amount
4. THE System SHALL store the estimated amount at the tender level (not per item)
5. FOR document generation, THE System SHALL display the estimated amount at the tender level in the Vigyapti document

### Requirement 4: Supplier Name Transliteration

**User Story:** As a government tender officer, I want to automatically display supplier names and locations in Hindi, so that documents maintain consistent professional formatting.

#### Acceptance Criteria

1. THE System SHALL maintain a Vendor Hindi Mapping dictionary for common vendors
2. WHEN generating Supply Aadesh documents, THE System SHALL display firm names in Hindi using the mapping
3. WHERE no Hindi mapping exists for a vendor, THE System SHALL call an AI transliteration API once to generate the Hindi name
4. THE System SHALL store new vendor Hindi mappings for future use
5. FOR firm addresses and cities, THE System SHALL apply the same Hindi transliteration logic

### Requirement 5: Vigyapti Narrative Improvement

**User Story:** As a government tender officer, I want to use professional government wording in Vigyapti documents instead of direct item name insertion, so that documents follow proper government formatting standards.

#### Acceptance Criteria

1. WHEN generating a Vigyapti document, THE System SHALL use the procurement purpose from the Purpose Library instead of raw item names
2. THE System SHALL generate the narrative: "एतद् द्वारा सर्व संबंधित वाणिज्य कर विभाग में पंजीकृत फर्मों को सूचित किया जाता है कि नगर परिषद [Place] द्वारा [Procurement Purpose] क्रय किया जाना प्रस्तावित है।"
3. WHERE multiple items exist, THE System SHALL consolidate purposes by category and generate a single professional narrative for each unique category
4. WHERE no mapping exists for a category, THE System SHALL use the temporary purpose "संबंधित कार्य हेतु आवश्यक सामग्री"
5. THE System SHALL support both Hindi and English language versions of the narrative
6. FOR Municipal Corporation tenders, THE System SHALL use the specialized Municipal Corporation Vigyapti template

### Requirement 6: Supply Aadesh Subject Improvement

**User Story:** As a government tender officer, I want to generate professional subjects for Supply Aadesh documents from procurement purpose, not item names, so that documents follow proper government formatting standards.

#### Acceptance Criteria

1. WHEN generating a Supply Aadesh document, THE System SHALL generate the subject from the procurement purpose instead of raw item names
2. THE System SHALL use the format: "विषय:- [Procurement Purpose] सप्लाई करने बावत ।"
3. WHERE the language is English, THE System SHALL generate: "Subject: Regarding supply of [Items] [Purpose]."
4. THE System SHALL use the consolidated procurement purpose for multi-item tenders
5. FOR Municipal Corporation tenders, THE System SHALL use the specialized Municipal Corporation Supply Aadesh template

### Requirement 7: Reusable Master Dictionaries

**User Story:** As a system administrator, I want to maintain reusable master dictionaries for purpose mappings, item Hindi mappings, and vendor Hindi mappings, so that mappings can be shared across tenders and departments.

#### Acceptance Criteria

1. THE System SHALL provide a Master Dictionaries interface to manage all mapping dictionaries
2. THE System SHALL maintain three separate dictionaries: Purpose Library, Item Hindi Mapping, and Vendor Hindi Mapping
3. WHERE a mapping exists in any dictionary, THE System SHALL use it automatically for all relevant documents
4. THE System SHALL allow bulk import and export of dictionary data
5. FOR new mappings, THE System SHALL require user confirmation before saving to the dictionary

### Requirement 8: Integration with Existing Document Generation

**User Story:** As a developer, I want the enhancement to integrate seamlessly with existing document generation services, so that no existing functionality is broken.

#### Acceptance Criteria

1. THE System SHALL maintain backward compatibility with existing Vigyapti and Supply Aadesh generation
2. WHERE no mappings exist for a category, THE System SHALL use the temporary purpose "संबंधित कार्य हेतु आवश्यक सामग्री"
3. THE System SHALL work with both AI-generated and template-based document generation
4. FOR all document types, THE System SHALL preserve existing layout and formatting
5. THE System SHALL not require changes to existing tender creation workflows

## Non-Functional Requirements

### Performance
1. WHEN checking the Purpose Library for a mapping, THE System SHALL complete the lookup within 100ms
2. FOR bulk dictionary operations (import/export), THE System SHALL handle up to 1000 entries within 5 seconds

### Usability
1. WHERE a user needs to add a new mapping, THE System SHALL provide clear guidance on professional procurement purpose formatting
2. THE System SHALL display a visual indicator when a professional purpose is being used vs. raw item name
3. FOR Hindi transliteration, THE System SHALL provide a preview of the generated Hindi text before document generation

### Maintainability
1. THE System SHALL store all dictionaries in a structured format that supports version control
2. FOR each dictionary entry, THE System SHALL track creation date, last modified date, and modifier
3. THE System SHALL provide an audit log for all dictionary modifications

### Data Persistence
1. ALL dictionary mappings SHALL be persisted in the database and survive system restarts
2. THE System SHALL provide backup and restore functionality for dictionary data
3. FOR each mapping, THE System SHALL store the source (user-provided or AI-generated)

## Data Model Requirements

### Purpose Mapping (Category-Based)
- **category**: String - The procurement category (e.g., "fire_fighting", "water_supply")
- **professional_purpose**: String - The professional procurement purpose in Hindi/English
- **language**: Enum - 'hindi' | 'english'
- **usage_count**: Number - Track how often this mapping is used
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Item Hindi Mapping
- **english_name**: String - The English item name
- **hindi_name**: String - The Hindi phonetic transliteration
- **is_auto_generated**: Boolean - Whether this was auto-generated or user-provided
- **usage_count**: Number
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Vendor Hindi Mapping
- **english_name**: String - The English vendor name or location
- **hindi_name**: String - The Hindi phonetic transliteration
- **is_auto_generated**: Boolean
- **usage_count**: Number
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Tender Estimated Amount
- **estimated_amount**: Number - Total estimated budget for the tender (optional)

## Integration Points with Existing System

### Existing Services to Modify
1. **aiContextGenerator.ts**: Extend to use Purpose Library for generating purpose lines
2. **governmentTemplates.ts**: Update to use professional procurement purposes in Vigyapti and Supply Aadesh generation
3. **dataService.ts**: Add dictionary management methods

### New Services to Create
1. **mappingService.ts**: Simplified service for managing purpose and Hindi mappings

### Database Collections to Add
1. **purposeMappings**: Store procurement purpose mappings (category-based)
2. **itemHindiMappings**: Store item Hindi transliterations
3. **vendorHindiMappings**: Store vendor Hindi transliterations

## User Stories Summary

| Role | Feature | Benefit |
|------|---------|---------|
| Government Tender Officer | Maintain procurement purpose library | Professional document generation |
| Government Tender Officer | Hindi transliteration for items | Better readability for Hindi officials |
| Government Tender Officer | Estimated amount field | Standardized budget planning |
| Government Tender Officer | Supplier name transliteration | Consistent professional formatting |
| System Administrator | Master dictionaries management | Reusable mappings across system |
| Developer | Integration with existing services | Seamless enhancement without breaking changes |
