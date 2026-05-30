# Requirements Document

## Introduction

This feature addresses UI/UX improvements for the Manage Firms page in the Magra Tender Automation Platform. The current page provides firm management functionality but has several usability issues that impact efficiency and user experience. This refactoring will modernize the interface while maintaining all existing functionality.

## Glossary

- **Manage Firms Page**: The settings page where users configure firm-specific letterhead profiles, layout settings, and AI prompts
- **Firm Profile**: A complete configuration including letterhead image, signature/stamp images, language preference, fit mode, layout controls, and AI prompts
- **Letterhead Fit Mode**: How the letterhead image is displayed (contain, cover, or stretch)
- **Content Start Y**: Vertical position where document content begins on the letterhead
- **Page Padding Left**: Horizontal padding for document content
- **Firm Style Profile**: Predefined layout configuration templates (govt_formal, minimal_business, bilingual, table_heavy)
- **AI Prompts**: Firm-specific instructions for AI-powered document drafting
- **Preview Frame**: Real-time visual representation of letterhead configuration before saving

## Requirements

### Requirement 1: Enhanced Firm List View

**User Story:** As a firm administrator, I want to see firm information at a glance, so that I can quickly identify and manage firms.

#### Acceptance Criteria

1. WHEN the Manage Firms page loads, THE List View SHALL display each firm with its name, default language, style profile, and fit mode
2. WHEN a firm has a letterhead image, THE List View SHALL show a thumbnail preview
3. WHILE viewing the firm list, THE System SHALL support sorting by name, language, and style profile
4. WHERE a firm has no letterhead image, THE System SHALL display a placeholder icon
5. WHEN the firm list contains more than 10 firms, THE System SHALL implement pagination with 10 firms per page

### Requirement 2: Improved Form Layout

**User Story:** As a firm administrator, I want a well-organized form for creating/editing firms, so that I can efficiently configure all settings without confusion.

#### Acceptance Criteria

1. WHEN the Add/Edit Firm dialog opens, THE Form SHALL be organized into logical sections with clear headings
2. WHEN configuring firm details, THE System SHALL group related fields together (branding, layout, AI prompts)
3. WHILE editing layout controls, THE System SHALL provide visual feedback for slider adjustments
4. WHERE a field has validation errors, THE System SHALL display inline error messages
5. WHEN the form is submitted, THE System SHALL validate all required fields before saving

### Requirement 3: Enhanced Preview Functionality

**User Story:** As a firm administrator, I want to see an accurate preview of my letterhead configuration, so that I can verify settings before saving.

#### Acceptance Criteria

1. WHEN any form field changes, THE Preview Frame SHALL update in real-time
2. WHEN the letterhead fit mode changes, THE Preview Frame SHALL immediately reflect the new fit style
3. WHILE adjusting the contentStartY slider, THE System SHALL display the current snapped value
4. WHERE guide lines are enabled, THE Preview Frame SHALL show safe zone, boundary, and bleed guides
5. WHEN the preview is opened in a separate dialog, THE System SHALL render the full letterhead with all guides

### Requirement 4: Streamlined Style Application

**User Story:** As a firm administrator, I want to quickly copy layout settings from existing firms, so that I can maintain consistency across multiple firms.

#### Acceptance Criteria

1. WHEN a firm is selected as style source, THE System SHALL highlight the selection
2. WHEN the "Duplicate Firm Style" button is clicked, THE System SHALL copy all layout and AI prompt settings
3. WHILE copying style settings, THE System SHALL display a success notification
4. WHERE no firm is selected, THE "Duplicate Firm Style" button SHALL be disabled
5. WHEN style is copied, THE System SHALL preserve the current firm name and branding images

### Requirement 5: Better Error Handling

**User Story:** As a firm administrator, I want clear error messages when something goes wrong, so that I can quickly resolve issues.

#### Acceptance Criteria

1. WHEN form validation fails, THE System SHALL display specific error messages for each invalid field
2. WHEN file upload fails, THE System SHALL show a descriptive error message
3. IF a firm deletion is attempted, THE System SHALL prompt for confirmation before proceeding
4. WHEN saving fails due to network or storage issues, THE System SHALL display a recovery option
5. WHERE an unexpected error occurs, THE System SHALL log the error and show a user-friendly message

### Requirement 6: Improved Navigation and Context

**User Story:** As a firm administrator, I want clear navigation context, so that I understand where I am in the application.

#### Acceptance Criteria

1. WHEN the Manage Firms page loads, THE Header SHALL display "Manage Firms" as the page title
2. WHEN navigating from settings, THE System SHALL provide a "Back to Settings" button
3. WHERE no firms exist, THE System SHALL display a helpful message with a "Create First Firm" button
4. WHEN a firm is successfully created, updated, or deleted, THE System SHALL show a temporary success message
5. WHILE operations are in progress, THE System SHALL disable relevant buttons and show loading indicators

### Requirement 7: Responsive Design

**User Story:** As a firm administrator using different devices, I want the page to work well on all screen sizes, so that I can manage firms efficiently.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Layout SHALL adapt to a single-column form
2. WHEN the viewport width is at least 1024px, THE Layout SHALL display the form and preview side-by-side
3. WHILE scrolling on mobile devices, THE System SHALL ensure form fields remain accessible
4. WHERE the preview frame is displayed, THE System SHALL maintain aspect ratio on all screen sizes
5. WHEN the firm list is displayed, THE System SHALL show at least 3 firms per row on large screens

### Requirement 8: Accessibility

**User Story:** As a user with accessibility needs, I want the interface to be fully accessible, so that I can manage firms using assistive technologies.

#### Acceptance Criteria

1. WHEN navigating with a keyboard, THE System SHALL support tab-based navigation through all interactive elements
2. WHERE form fields have labels, THE System SHALL associate labels with their respective inputs
3. WHEN a dialog opens, THE System SHALL trap focus within the dialog until it is closed
4. WHEN error messages are displayed, THE System SHALL use appropriate ARIA attributes
5. WHERE icons are used, THE System SHALL provide text alternatives or aria-labels

### Requirement 9: Performance Optimization

**User Story:** As a user with many firms, I want the page to load and respond quickly, so that I can manage firms efficiently.

#### Acceptance Criteria

1. WHEN the page loads with up to 50 firms, THE System SHALL render the list within 1 second
2. WHEN form fields change, THE System SHALL update the preview within 200ms
3. WHILE uploading images, THE System SHALL show a progress indicator for files larger than 1MB
4. WHEN pagination is active, THE System SHALL only render firms on the current page
5. WHERE preview rendering is complex, THE System SHALL use debouncing to reduce unnecessary updates

### Requirement 10: Data Persistence

**User Story:** As a firm administrator, I want my changes to be saved reliably, so that I don't lose my configuration.

#### Acceptance Criteria

1. WHEN a firm is successfully saved, THE System SHALL persist the data to localStorage
2. WHEN a firm is deleted, THE System SHALL remove it from localStorage
3. WHILE loading firms, THE System SHALL handle cases where localStorage is empty or corrupted
4. WHEN data cannot be saved due to storage limits, THE System SHALL notify the user with options
5. WHERE a firm has no letterhead image, THE System SHALL allow saving without validation errors

### Requirement 11: Image Upload and Management

**User Story:** As a firm administrator, I want to easily upload and manage images, so that I can configure firm branding without technical difficulties.

#### Acceptance Criteria

1. WHEN a letterhead image is uploaded, THE System SHALL validate it is an image file
2. WHEN signature or stamp images are uploaded, THE System SHALL accept PNG and other common image formats
3. WHILE uploading, THE System SHALL convert images to data URLs for localStorage storage
4. WHERE an image fails to upload, THE System SHALL provide a clear error message
5. WHEN images are displayed in the preview, THE System SHALL handle missing images gracefully

### Requirement 12: Form State Management

**User Story:** As a firm administrator, I want the form to maintain state correctly, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN switching between create and edit modes, THE System SHALL reset the form to appropriate initial state
2. WHEN the dialog is closed without saving, THE System SHALL discard any unsaved changes
3. WHILE editing, THE System SHALL preserve the current form values across minor interactions
4. WHEN applying style from another firm, THE System SHALL merge settings with current values appropriately
5. WHERE form validation fails, THE System SHALL retain all entered values for correction

### Requirement 13: User Feedback and Notifications

**User Story:** As a firm administrator, I want clear feedback on my actions, so that I know what happened after I perform an operation.

#### Acceptance Criteria

1. WHEN a firm is successfully created, THE System SHALL display a success notification for 2 seconds
2. WHEN a firm is successfully updated, THE System SHALL display a success notification for 2 seconds
3. WHEN a firm is successfully deleted, THE System SHALL display a success notification for 2 seconds
4. WHEN an error occurs, THE System SHALL display an error notification until manually dismissed
5. WHILE operations are in progress, THE System SHALL show loading indicators on relevant buttons

### Requirement 14: Dialog Management

**User Story:** As a firm administrator, I want dialogs to behave predictably, so that I can complete tasks without confusion.

#### Acceptance Criteria

1. WHEN the Add New Firm button is clicked, THE System SHALL open a dialog in create mode
2. WHEN the Edit button is clicked for a firm, THE System SHALL open a dialog in edit mode with pre-filled data
3. WHEN the Cancel button is clicked, THE System SHALL close the dialog without saving
4. WHEN the Save Firm button is clicked, THE System SHALL validate and save the form data
5. WHERE validation fails, THE System SHALL keep the dialog open and highlight errors

### Requirement 15: Preview Dialog Enhancement

**User Story:** As a firm administrator, I want to view firm previews in detail, so that I can verify the complete letterhead rendering.

#### Acceptance Criteria

1. WHEN the Preview button is clicked for a firm, THE System SHALL open a dedicated preview dialog
2. WHEN the preview dialog opens, THE System SHALL render the complete letterhead with all guides
3. WHILE the preview dialog is open, THE System SHALL allow scrolling if content exceeds viewport
4. WHEN the preview dialog is closed, THE System SHALL clean up any temporary resources
5. WHERE the preview HTML is large, THE System SHALL use an iframe for proper rendering isolation
