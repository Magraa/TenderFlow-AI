import { DocumentVersion, Settings, VersioningSettings } from '@/types';

export const defaultVersioningSettings: VersioningSettings = {
  enabled: true,
  maxVersions: 50,
  autoSaveEnabled: true,
  autoSaveInterval: 5,
  changeNotesRequired: false,
  versionRetentionDays: 365,
  enableVersionComparison: true,
};

export const versioningSettingRanges = {
  maxVersions: { min: 1, max: 1000 },
  autoSaveInterval: { min: 1, max: 60 },
  versionRetentionDays: { min: 7, max: 3650 },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function normalizeVersioningSettings(raw: Partial<VersioningSettings> | undefined): VersioningSettings {
  const source = raw || {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultVersioningSettings.enabled,
    maxVersions: clamp(
      typeof source.maxVersions === 'number' ? source.maxVersions : defaultVersioningSettings.maxVersions,
      versioningSettingRanges.maxVersions.min,
      versioningSettingRanges.maxVersions.max
    ),
    autoSaveEnabled:
      typeof source.autoSaveEnabled === 'boolean'
        ? source.autoSaveEnabled
        : defaultVersioningSettings.autoSaveEnabled,
    autoSaveInterval: clamp(
      typeof source.autoSaveInterval === 'number'
        ? source.autoSaveInterval
        : defaultVersioningSettings.autoSaveInterval,
      versioningSettingRanges.autoSaveInterval.min,
      versioningSettingRanges.autoSaveInterval.max
    ),
    changeNotesRequired:
      typeof source.changeNotesRequired === 'boolean'
        ? source.changeNotesRequired
        : defaultVersioningSettings.changeNotesRequired,
    versionRetentionDays: clamp(
      typeof source.versionRetentionDays === 'number'
        ? source.versionRetentionDays
        : defaultVersioningSettings.versionRetentionDays,
      versioningSettingRanges.versionRetentionDays.min,
      versioningSettingRanges.versionRetentionDays.max
    ),
    enableVersionComparison:
      typeof source.enableVersionComparison === 'boolean'
        ? source.enableVersionComparison
        : defaultVersioningSettings.enableVersionComparison,
  };
}

export function normalizeSettingsVersioning<T extends Partial<Settings>>(settings: T): T & { versioningSettings: VersioningSettings } {
  return {
    ...settings,
    versioningSettings: normalizeVersioningSettings(settings.versioningSettings),
  };
}

export function validateVersioningSetting(
  key: keyof Pick<VersioningSettings, 'maxVersions' | 'autoSaveInterval' | 'versionRetentionDays'>,
  value: number
): string {
  const range = versioningSettingRanges[key];
  if (!Number.isFinite(value)) return 'Value must be a valid number';
  if (value < range.min || value > range.max) {
    return `Value must be between ${range.min} and ${range.max}`;
  }
  return '';
}

export type LineDiffOperation = { type: 'same' | 'add' | 'remove'; value: string };

export function createLineDiff(previous: string, next: string): string {
  const previousLines = previous.split('\n');
  const nextLines = next.split('\n');
  const operations: LineDiffOperation[] = [];
  const maxLength = Math.max(previousLines.length, nextLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    const beforeLine = previousLines[index];
    const afterLine = nextLines[index];
    if (beforeLine === afterLine) {
      operations.push({ type: 'same', value: beforeLine ?? '' });
    } else {
      if (beforeLine !== undefined) operations.push({ type: 'remove', value: beforeLine });
      if (afterLine !== undefined) operations.push({ type: 'add', value: afterLine });
    }
  }

  return JSON.stringify(operations);
}

export function applyLineDiff(_previous: string, diff: string): string {
  const operations = JSON.parse(diff) as LineDiffOperation[];
  return operations
    .filter((operation) => operation.type === 'same' || operation.type === 'add')
    .map((operation) => operation.value)
    .join('\n');
}

export function compressContent(content: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'utf8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(content)));
}

export function decompressContent(content: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(content)));
}

export function paginateVersions(
  versions: DocumentVersion[],
  page = 1,
  pageSize = 20
): { items: DocumentVersion[]; total: number; page: number; pageSize: number; totalPages: number } {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(versions.length / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * safePageSize;
  return {
    items: versions.slice(start, start + safePageSize),
    total: versions.length,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
