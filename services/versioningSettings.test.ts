import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  applyLineDiff,
  compressContent,
  createLineDiff,
  decompressContent,
  defaultVersioningSettings,
  normalizeVersioningSettings,
  paginateVersions,
} from './versioningSettings';
import { DocumentVersion } from '@/types';

describe('Document Versioning Settings', () => {
  it('Feature: document-versioning-settings, Property 1: applies default values', () => {
    expect(normalizeVersioningSettings(undefined)).toEqual(defaultVersioningSettings);
    expect(normalizeVersioningSettings({ maxVersions: 0, autoSaveInterval: 1000 })).toEqual({
      ...defaultVersioningSettings,
      maxVersions: 1,
      autoSaveInterval: 60,
    });
  });

  it('Feature: document-versioning-settings, Property 7: diff round-trip is consistent', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (previous, next) => {
        const diff = createLineDiff(previous, next);
        expect(applyLineDiff(previous, diff)).toBe(next);
        expect(createLineDiff(previous, next)).toBe(diff);
      }),
      { numRuns: 100 }
    );
  });

  it('Feature: document-versioning-settings, Property 8: compression round-trip is lossless', () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        expect(decompressContent(compressContent(content))).toBe(content);
      }),
      { numRuns: 100 }
    );
  });

  it('Feature: document-versioning-settings, Property 9: pagination returns the requested subset', () => {
    const versions = Array.from({ length: 45 }, (_, index): DocumentVersion => {
      const timestamp = new Date(2026, 0, index + 1).toISOString();
      return {
        id: `version-${index + 1}`,
        documentId: 'document-1',
        versionNumber: index + 1,
        contentHTML: `<p>${index + 1}</p>`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

    const page = paginateVersions(versions, 2, 20);
    expect(page.total).toBe(45);
    expect(page.totalPages).toBe(3);
    expect(page.items).toHaveLength(20);
    expect(page.items[0].versionNumber).toBe(21);
  });
});
