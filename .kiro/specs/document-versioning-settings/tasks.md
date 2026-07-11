# Implementation Plan: Document Versioning Settings

## Overview

This feature adds comprehensive versioning settings configuration to the Magra Automation system. The enhancement will add a settings panel to control versioning behavior, including enabling/disabling versioning, limiting the number of versions per document, configuring auto-save behavior, and managing storage optimization.

## Tasks

- [ ] 1. Update Settings type with versioningSettings field
  - [ ] 1.1 Add VersioningSettings interface to types/index.ts
    - Define VersioningSettings interface with all required fields
    - _Requirements: 1.1_
  
  - [ ] 1.2 Extend Settings interface to include versioningSettings
    - Add versioningSettings: VersioningSettings to Settings type
    - _Requirements: 1.1_
  
  - [ ] 1.3 Update defaultSettings in data/schema.ts
    - Add default versioningSettings with all default values
    - _Requirements: 1.2-1.8_

- [ ] 2. Update storageService.ts for versioningSettings
  - [ ] 2.1 Update normalizeSettings function
    - Ensure versioningSettings is always present with defaults
    - _Requirements: 1.1, 1.9_
  
  - [ ] 2.2 Verify Local Storage persistence
    - Ensure versioningSettings are saved and retrieved correctly
    - _Requirements: 1.9_

- [ ] 3. Update firestoreAdapter.ts for versioningSettings
  - [ ] 3.1 Update getSettings function
    - Ensure versioningSettings is always present with defaults for new installations
    - _Requirements: 1.1, 1.9_
  
  - [ ] 3.2 Verify Firestore persistence
    - Ensure versioningSettings are saved and retrieved correctly
    - _Requirements: 1.9_

- [ ] 4. Extend documentService.ts with versioning settings support
  - [ ] 4.1 Create version creation with settings check
    - Implement createVersionWithSettings() that reads versioning settings
    - Return null if versioning is disabled
    - _Requirements: 7.1, 7.2_
  
  - [ ] 4.2 Implement version limit enforcement
    - Implement cleanupOldVersions() that removes old versions exceeding maxVersions
    - Maintain version number continuity
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.3_
  
  - [ ] 4.3 Implement version retention cleanup
    - Implement cleanupOldVersions() that removes versions older than versionRetentionDays
    - _Requirements: 7.4_
  
  - [ ] 4.4 Implement change notes validation
    - Validate change notes when changeNotesRequired is true
    - _Requirements: 7.5_

- [ ] 5. Add storage optimization (diff and compression)
  - [ ] 5.1 Implement diff algorithm for version comparison
    - Implement line-based diff algorithm
    - Store diff instead of full HTML when enableVersionComparison is true
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [ ] 5.2 Implement compression for old versions
    - Implement compression function using gzip or similar
    - Store isCompressed flag for compressed versions
    - _Requirements: 5.3_
  
  - [ ] 5.3 Implement decompression function
    - Implement decompression to restore original content
    - _Requirements: 5.4_
  
  - [ ] 5.4 Update DocumentVersion type
    - Add contentDiff field for diff storage
    - Add isCompressed field for compression flag
    - _Requirements: 5.1, 5.3_

- [ ] 6. Implement lazy loading for version history
  - [ ] 6.1 Implement version metadata loading
    - Load version metadata (date, number, change note) without full content
    - _Requirements: 6.1_
  
  - [ ] 6.2 Implement pagination for version history
    - Display versions in pages (e.g., 20 per page)
    - Show pagination controls
    - _Requirements: 6.2_
  
  - [ ] 6.3 Implement lazy content loading
    - Load full content only when specific version is selected
    - _Requirements: 6.4_
  
  - [ ] 6.4 Implement content caching
    - Cache loaded version content to avoid redundant requests
    - _Requirements: 6.5_

- [ ] 7. Update app/settings/page.tsx with Versioning Settings UI
  - [ ] 7.1 Add Versioning Settings tab
    - Add new tab section to settings page
    - _Requirements: 4.1_
  
  - [ ] 7.2 Add enabled toggle switch
    - Implement toggle for enabled/disabled
    - _Requirements: 4.2_
  
  - [ ] 7.3 Add number input fields
    - Add inputs for maxVersions, autoSaveInterval, versionRetentionDays
    - _Requirements: 4.4_
  
  - [ ] 7.4 Add checkboxes for boolean settings
    - Add checkboxes for changeNotesRequired and enableVersionComparison
    - _Requirements: 4.5_
  
  - [ ] 7.5 Implement immediate save on change
    - Save settings immediately when any field changes
    - _Requirements: 4.6_
  
  - [ ] 7.6 Add validation for invalid input
    - Validate inputs and show error messages
    - _Requirements: 4.7_

- [ ] 8. Update app/tenders/[id]/page.tsx with manual save button
  - [ ] 8.1 Add manual save button when auto-save disabled
    - Show save button only when autoSaveEnabled is false
    - _Requirements: 2.3_
  
  - [ ] 8.2 Implement manual save functionality
    - Create new version when button clicked
    - _Requirements: 2.4, 2.5_

- [ ] 9. Update components/documentViewer.tsx with version history
  - [ ] 9.1 Add version history panel
    - Display list of versions with lazy loading
    - _Requirements: 6.1, 6.2_
  
  - [ ] 9.2 Implement version selection
    - Load full content when version selected
    - _Requirements: 6.4_
  
  - [ ] 9.3 Show versioning status
    - Display whether versioning is enabled or disabled
    - _Requirements: 4.3_

- [ ] 10. Write property-based tests for all correctness properties
  - [ ] 10.1 Write property test for Property 1: Settings Default Values
    - **Validates: Requirements 1.1-1.8**
  
  - [ ] 10.2 Write property test for Property 2: Settings Persistence
    - **Validates: Requirements 1.1, 4.6**
  
  - [ ] 10.3 Write property test for Property 3: Version Creation Respects Enabled Flag
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ] 10.4 Write property test for Property 4: Version Limit Enforcement
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
  
  - [ ] 10.5 Write property test for Property 5: Version Number Continuity
    - **Validates: Requirements 3.4**
  
  - [ ] 10.6 Write property test for Property 6: Version Retention Cleanup
    - **Validates: Requirements 7.4**
  
  - [ ] 10.7 Write property test for Property 7: Diff Encoding Consistency
    - **Validates: Requirements 5.1, 5.2, 5.5**
  
  - [ ] 10.8 Write property test for Property 8: Compression Round-Trip
    - **Validates: Requirements 5.3, 5.4**
  
  - [ ] 10.9 Write property test for Property 9: Lazy Loading Pagination
    - **Validates: Requirements 6.2**
  
  - [ ] 10.10 Write property test for Property 10: Settings Change Immediate Effect
    - **Validates: Requirements 4.6**
  
  - [ ] 10.11 Write property test for Property 11: Backward Compatibility Defaults
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 11. Write unit tests for edge cases and error conditions
  - [ ] 11.1 Write unit tests for settings normalization
    - Test default value application
    - Test validation for all input fields
    - _Requirements: 1.1-1.8, 4.6, 4.7_
  
  - [ ] 11.2 Write unit tests for version creation
    - Test version creation when enabled=true and enabled=false
    - Test version limit enforcement
    - Test version retention cleanup
    - Test change notes validation
    - _Requirements: 2.1-2.5, 3.1-3.5, 7.1-7.5_
  
  - [ ] 11.3 Write unit tests for diff algorithm
    - Test diff calculation for small, large, and identical versions
    - Test diff application to recreate updated version
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [ ] 11.4 Write unit tests for compression
    - Test compression/decompression round-trip
    - Test error handling for large content
    - _Requirements: 5.3, 5.4_
  
  - [ ] 11.5 Write unit tests for lazy loading
    - Test pagination with various version counts
    - Test caching behavior
    - _Requirements: 6.1-6.5_

- [ ] 12. Write integration tests for end-to-end workflows
  - [ ] 12.1 Write integration test for version creation with settings
    - Test end-to-end workflow with enabled/disabled settings
    - _Requirements: 7.1-7.5_
  
  - [ ] 12.2 Write integration test for version cleanup
    - Test version limit enforcement
    - Test version retention cleanup
    - _Requirements: 3.1-3.5, 7.4_
  
  - [ ] 12.3 Write integration test for settings persistence
    - Test settings saved to Local Storage
    - Test settings saved to Firestore
    - _Requirements: 1.9, 4.6_
  
  - [ ] 12.4 Write integration test for manual save workflow
    - Test save button when auto-save disabled
    - _Requirements: 2.3-2.5_
  
  - [ ] 12.5 Write integration test for version history loading
    - Test lazy loading with pagination
    - Test content caching
    - _Requirements: 6.1-6.5_

- [ ] 13. Test backward compatibility
  - [ ] 13.1 Test existing documents with new settings
    - Verify existing documents continue to work with default settings
    - _Requirements: 8.1, 8.2_
  
  - [ ] 13.2 Test settings migration for existing installations
    - Verify default values applied on first read
    - _Requirements: 8.1_
  
  - [ ] 13.3 Test existing document generation workflows
    - Verify no breaking changes to existing workflows
    - _Requirements: 8.3_

- [ ] 14. Update user documentation
  - [ ] 14.1 Update settings page documentation
    - Document versioning settings options
    - Include screenshots
    - _Requirements: 4.1-4.7_
  
  - [ ] 14.2 Document version management
    - Explain version history and cleanup
    - Include usage tips
    - _Requirements: 3.1-3.5, 6.1-6.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Deploy to staging environment
  - Deploy to staging environment
  - Verify all functionality works correctly
  - _Requirements: All_

- [ ] 17. Deploy to production
  - Deploy to production environment
  - Monitor for any issues
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- Backward compatibility testing ensures existing functionality is not broken

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "5.4", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 3, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "8.1", "8.2", "9.1", "9.2", "9.3"] },
    { "id": 4, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "10.10", "10.11", "11.1", "11.2", "11.3", "11.4", "11.5", "12.1", "12.2", "12.3", "12.4", "12.5", "13.1", "13.2", "13.3"] },
    { "id": 5, "tasks": ["14.1", "14.2"] },
    { "id": 6, "tasks": ["15"] },
    { "id": 7, "tasks": ["16"] },
    { "id": 8, "tasks": ["17"] }
  ]
}
```
