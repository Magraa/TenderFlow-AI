/**
 * Unit utilities — shared across forms and template rendering.
 *
 * Stores units in English internally (e.g., "Litre", "KG").
 * Converts to Hindi display form when rendering Hindi documents.
 */

// ─── Canonical unit list shown in the dropdown ────────────────────────────────

export interface UnitOption {
  value: string;   // English canonical (stored in DB)
  label: string;   // Display label in the form
  hindi: string;   // Hindi equivalent for document rendering
}

export const UNIT_OPTIONS: UnitOption[] = [
  { value: 'Nos',    label: 'Nos (Numbers)',        hindi: 'नग' },
  { value: 'piece',  label: 'Piece',                hindi: 'नग' },
  { value: 'Set',    label: 'Set',                  hindi: 'सेट' },
  { value: 'Job',    label: 'Job / Lump-sum',       hindi: 'जॉब' },
  { value: 'Pair',   label: 'Pair',                 hindi: 'जोड़ी' },
  { value: 'KG',     label: 'KG (Kilogram)',        hindi: 'किलो' },
  { value: 'Gram',   label: 'Gram',                 hindi: 'ग्राम' },
  { value: 'Quintal',label: 'Quintal',              hindi: 'क्विंटल' },
  { value: 'MT',     label: 'MT (Metric Ton)',      hindi: 'मेट्रिक टन' },
  { value: 'Litre',  label: 'Litre',                hindi: 'लीटर' },
  { value: 'L',      label: 'L (Litre shorthand)',  hindi: 'लीटर' },
  { value: 'ML',     label: 'ML (Millilitre)',      hindi: 'मिली लीटर' },
  { value: 'Meter',  label: 'Meter',                hindi: 'मीटर' },
  { value: 'RM',     label: 'RM (Running Meter)',   hindi: 'रनिंग मीटर' },
  { value: 'Sqm',    label: 'Sqm (Sq. Meter)',      hindi: 'वर्ग मीटर' },
  { value: 'Cum',    label: 'Cum (Cubic Meter)',     hindi: 'घन मीटर' },
  { value: 'Feet',   label: 'Feet',                 hindi: 'फीट' },
  { value: 'Inch',   label: 'Inch',                 hindi: 'इंच' },
  { value: 'Roll',   label: 'Roll',                 hindi: 'रोल' },
  { value: 'Box',    label: 'Box',                  hindi: 'बक्सा' },
  { value: 'Packet', label: 'Packet',               hindi: 'पैकेट' },
  { value: 'Bag',    label: 'Bag',                  hindi: 'बोरी' },
  { value: 'Bundle', label: 'Bundle',               hindi: 'बंडल' },
  { value: 'Drum',   label: 'Drum',                 hindi: 'ड्रम' },
  { value: 'Tin',    label: 'Tin',                  hindi: 'टिन' },
  { value: 'Can',    label: 'Can / Container',      hindi: 'कैन' },
  { value: 'Day',    label: 'Day',                  hindi: 'दिन' },
  { value: 'Month',  label: 'Month',                hindi: 'माह' },
  { value: 'Trip',   label: 'Trip',                 hindi: 'ट्रिप' },
];

// Fast lookup map: English value → Hindi string
const _hindiMap: Record<string, string> = Object.fromEntries(
  UNIT_OPTIONS.map((u) => [u.value.toLowerCase(), u.hindi])
);

/**
 * Convert an English unit string to its Hindi equivalent.
 * Falls back to the original string if no mapping found.
 *
 * @example
 *   toHindiUnit('Litre')  // → 'लीटर'
 *   toHindiUnit('KG')     // → 'किलो'
 *   toHindiUnit('Nos')    // → 'नग'
 *   toHindiUnit('CustomXYZ') // → 'CustomXYZ' (passthrough)
 */
export function toHindiUnit(unit: string | undefined): string {
  if (!unit) return 'नग';
  return _hindiMap[unit.toLowerCase()] ?? unit;
}

/**
 * Returns true if the given unit value matches a known canonical option.
 */
export function isKnownUnit(unit: string): boolean {
  return unit.toLowerCase() in _hindiMap;
}
