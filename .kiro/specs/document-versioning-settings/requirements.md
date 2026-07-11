# Requirements Document

## Introduction

This feature adds comprehensive versioning settings configuration to the Magra Automation system, a government tender management system with document versioning functionality. The system currently saves previous content before regenerating documents, but lacks configurable versioning behavior. This enhancement will add a settings panel to control versioning behavior, including enabling/disabling versioning, limiting the number of versions per document, configuring auto-save behavior, and managing storage optimization.

## Glossary

- **System**: Magra Automation - A government tender management system
- **Document Versioning**: The system's capability to save previous versions of documents before regenerating them
- **Versioning Settings**: Configuration options that control document versioning behavior
- **Auto-Save**: Automatic creation of document versions after content changes
- **Change Notes**: Optional annotations describing changes between versions
- **Version Limit**: Maximum number of versions stored per document
- **Version Retention**: Number of days versions are kept before automatic deletion
- **Version Comparison**: Feature allowing users to compare different versions of a document
- **Diff Algorithm**: Algorithm that calculates differences between document versions
- **Storage Backend**: Local Storage or Firestore where versioning data is persisted
- **Document**: A generated tender document (Vigyapti, Supply Aadesh, etc.)

## Requirements

### Requirement 1: Versioning Settings Model

**User Story:** As a system administrator, I want to configure document versioning behavior through a settings panel, so that I can customize how the system manages document history according to my organization's needs.

#### Acceptance Criteria

1. THE System SHALL provide a `versioningSettings` field in the Settings type with default values
2. THE default `enabled` setting SHALL be `true` (versioning enabled by default)
3. THE default `maxVersions` setting SHALL be `50` (keep last 50 versions per document)
4. THE default `autoSaveEnabled` setting SHALL be `true` (auto-save enabled by default)
5. THE default `autoSaveInterval` setting SHALL be `5` minutes between auto-saves
6. THE default `changeNotesRequired` setting SHALL be `false` (change notes optional)
7. THE default `versionRetentionDays` setting SHALL be `365` days before auto-deletion
8. THE default `enableVersionComparison` setting SHALL be `true` (comparison feature enabled)
9. THE System SHALL support both Local Storage and Firestore backends for versioning settings

### Requirement 2: Auto-Save Control

**User Story:** As a user, I want to control when document versions are created, so that I can balance between having frequent backups and avoiding version proliferation.

#### Acceptance Criteria

1. WHEN `autoSaveEnabled` is `true`, THE System SHALL create a new version after `autoSaveInterval` minutes following the last content change
2. WHEN `autoSaveEnabled` is `false`, THE System SHALL NOT automatically create versions on content changes
3. WHERE auto-save is disabled, THE System SHALL provide a manual save button in the document preview/editor UI
4. WHEN the manual save button is clicked, THE System SHALL create a new version with the current content
5. IF no content changes have occurred, THE System SHALL NOT create duplicate versions on save

### Requirement 3: Version Limit Enforcement

**User Story:** As a system administrator, I want to limit the number of versions stored per document to prevent unlimited storage growth, so that I can manage storage costs effectively.

#### Acceptance Criteria

1. THE System SHALL enforce the `maxVersions` limit for each document
2. WHEN the number of versions exceeds `maxVersions`, THE System SHALL automatically delete the oldest versions
3. THE System SHALL preserve the current document version and all metadata during version cleanup
4. VERSION cleanup SHALL occur before creating a new version when the limit would be exceeded
5. THE System SHALL maintain version number continuity after cleanup (no gaps in version numbers)

### Requirement 4: Settings UI

**User Story:** As a user, I want to access and modify versioning settings through a dedicated settings page, so that I can easily configure versioning behavior without needing technical knowledge.

#### Acceptance Criteria

1. THE System SHALL provide a "Versioning Settings" tab or section in the settings page
2. WHERE versioning settings are accessed, THE System SHALL display a toggle switch for `enabled`
3. WHERE versioning is disabled, THE System SHALL hide or disable version-related UI elements
4. THE System SHALL provide number input fields for `maxVersions`, `autoSaveInterval`, and `versionRetentionDays`
5. THE System SHALL provide checkboxes for `changeNotesRequired` and `enableVersionComparison`
6. WHEN a setting is changed, THE System SHALL validate the input and save it immediately
7. FOR invalid input values, THE System SHALL display an error message and retain the previous value

### Requirement 5: Storage Optimization

**User Story:** As a system administrator, I want to optimize storage usage for document versions, so that I can reduce storage costs while maintaining necessary version history.

#### Acceptance Criteria

1. WHERE `enableVersionComparison` is `true`, THE System SHALL store document versions using diff encoding instead of full HTML
2. THE System SHALL implement a diff algorithm for calculating differences between consecutive versions
3. WHERE a version is older than `versionRetentionDays`, THE System SHALL compress the version content to save space
4. FOR compressed versions, THE System SHALL provide a decompression function to restore the original content
5. THE diff algorithm SHALL produce consistent results for the same document versions

### Requirement 6: Lazy Loading

**User Story:** As a user, I want to load version history efficiently without waiting for all content to load, so that I can quickly access version information even for documents with many versions.

#### Acceptance Criteria

1. WHEN the version history panel is opened, THE System SHALL load version metadata on-demand
2. THE System SHALL paginate version history display, showing a subset of versions at a time
3. FOR each version, THE System SHALL show a preview without loading the full HTML content
4. WHEN a specific version is selected, THE System SHALL load the full content on-demand
5. THE System SHALL cache loaded version content to avoid redundant network requests

### Requirement 7: Integration with documentService

**User Story:** As a developer, I want the versioning system to respect the versioning settings when creating and managing versions, so that user preferences are consistently enforced.

#### Acceptance Criteria

1. WHEN creating a new version, THE documentService SHALL read the current versioning settings
2. WHERE `enabled` is `false`, THE documentService SHALL skip version creation and continue without error
3. WHERE `enabled` is `true`, THE documentService SHALL check `maxVersions` before creating a new version
4. THE documentService SHALL enforce `versionRetentionDays` by removing old versions during cleanup
5. WHERE `changeNotesRequired` is `true`, THE documentService SHALL require change notes before saving

### Requirement 8: Backward Compatibility

**User Story:** As a user, I want existing documents to continue working without requiring migration, so that I can adopt the new versioning settings without disrupting my existing work.

#### Acceptance Criteria

1. WHEN the settings are updated, THE System SHALL apply default values for new settings to existing installations
2. FOR existing documents, THE System SHALL continue to work with default settings until explicitly configured
3. THE System SHALL not break existing document generation workflows when versioning settings change
4. WHERE versioning is disabled, THE System SHALL continue to allow document generation without creating versions
5. FOR existing documents with versions, THE System SHALL respect the new `maxVersions` and `versionRetentionDays` settings on next cleanup

## Non-Functional Requirements

### Performance
1. WHEN reading versioning settings, THE System SHALL complete the operation within 100ms
2. FOR version cleanup operations, THE System SHALL complete cleanup of up to 100 old versions within 5 seconds
3. WHEN loading version history, THE System SHALL display initial list within 1 second for documents with up to 50 versions

### Usability
1. WHERE versioning is disabled, THE System SHALL display a clear message explaining that versions will not be saved
2. THE System SHALL provide visual feedback when auto-save is in progress
3. FOR version limit exceeded, THE System SHALL inform the user that old versions have been automatically deleted

### Maintainability
1. THE System SHALL store versioning settings in a structured format that supports version control
2. FOR each setting, THE System SHALL track creation date and last modified date
3. THE System SHALL provide logging for versioning operations for debugging purposes

### Data Persistence
1. ALL versioning settings SHALL be persisted in the database and survive system restarts
2. THE System SHALL provide backup and restore functionality for versioning settings
3. WHERE settings are updated, THE System SHALL persist changes before applying them

## Data Model Requirements

### Versioning Settings

```typescript
interface VersioningSettings {
  enabled: boolean;
  maxVersions: number;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;  // minutes
  changeNotesRequired: boolean;
  versionRetentionDays: number;
  enableVersionComparison: boolean;
}
```

**Fields:**
- `enabled`: Boolean - Toggle to enable/disable versioning completely
- `maxVersions`: Number - Maximum number of versions to keep per document (default: 50)
- `autoSaveEnabled`: Boolean - Enable/disable auto-save on content changes (default: true)
- `autoSaveInterval`: Number - Minutes between auto-saves (default: 5)
- `changeNotesRequired`: Boolean - Require change notes before creating versions (default: false)
- `versionRetentionDays`: Number - Days before auto-deleting old versions (default: 365)
- `enableVersionComparison`: Boolean - Enable version comparison/diff feature (default: true)

## Integration Points with Existing System

### Modified Services

#### documentService.ts
1. Add versioning settings check before creating versions
2. Implement version limit enforcement
3. Implement version retention cleanup
4. Add support for diff encoding when `enableVersionComparison` is true

#### Settings Type (types/index.ts)
1. Add `versioningSettings: VersioningSettings` field to Settings interface

#### storageService.ts
1. Update settings normalization to include versioningSettings with defaults
2. Ensure versioningSettings persist to Local Storage

#### firestoreAdapter.ts
1. Update settings normalization to include versioningSettings with defaults
2. Ensure versioningSettings persist to Firestore

### Modified Components

#### app/settings/page.tsx
1. Add "Versioning Settings" tab/section
2. Add toggle for enabled/disabled
3. Add number inputs for maxVersions, autoSaveInterval, versionRetentionDays
4. Add checkboxes for changeNotesRequired, enableVersionComparison

#### components/documentViewer.tsx
1. Add manual save button when auto-save is disabled
2. Show versioning status (enabled/disabled)
3. Display version history with lazy loading

## User Stories Summary

| Role | Feature | Benefit |
|------|---------|---------|
| System Administrator | Configure versioning settings | Customize versioning behavior to organization needs |
| User | Control auto-save behavior | Balance between backup frequency and version control |
| System Administrator | Limit versions per document | Manage storage costs effectively |
| User | View and manage version settings | Easy configuration without technical knowledge |
| System Administrator | Optimize storage usage | Reduce storage costs while maintaining history |
| User | Efficient version history loading | Quick access to version information |
| Developer | Respect settings in documentService | Consistent enforcement of user preferences |
| User | Continue using existing documents | Seamless adoption without migration |

## Implementation Constraints

1. **No Breaking Changes**: Existing functionality must continue to work
2. **Default Values**: All settings must have sensible defaults
3. **Backend Support**: Both Local Storage and Firestore must be supported
4. **Real-time Updates**: Settings changes must take effect immediately
5. **Validation**: All user inputs must be validated before saving
