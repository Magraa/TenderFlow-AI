import { TenderDocType } from '@/types';

/**
 * Department-Based Template System
 * Maps departments to their specific template versions
 * Future-ready for multiple government departments
 */

export interface DepartmentTemplateConfig {
  vigyapti: string;
  supplyAadesh: string;
  quotation?: string;
  bill?: string;
}

export const DEPARTMENT_TEMPLATES: Record<string, DepartmentTemplateConfig> = {
  'नगर परिषद': {
    vigyapti: 'nagar-parishad-vigyapti-v1',
    supplyAadesh: 'nagar-parishad-supply-v1',
    quotation: 'nagar-parishad-quotation-v1',
    bill: 'nagar-parishad-bill-v1',
  },
  'Municipal Council': {
    vigyapti: 'municipal-council-vigyapti-v1',
    supplyAadesh: 'municipal-council-supply-v1',
    quotation: 'municipal-council-quotation-v1',
    bill: 'municipal-council-bill-v1',
  },
  'Municipal Corporation': {
    vigyapti: 'municipal-corporation-vigyapti-v1',
    supplyAadesh: 'municipal-corporation-supply-v1',
    quotation: 'municipal-corporation-quotation-v1',
    bill: 'municipal-corporation-bill-v1',
  },
  'नगर निगम': {
    vigyapti: 'nagar-nigam-vigyapti-v1',
    supplyAadesh: 'nagar-nigam-supply-v1',
  },
  'लोक निर्माण विभाग': {
    vigyapti: 'pwd-vigyapti-v1',
    supplyAadesh: 'pwd-supply-v1',
  },
  'PWD': {
    vigyapti: 'pwd-vigyapti-v1',
    supplyAadesh: 'pwd-supply-v1',
  },
  'जल निगम': {
    vigyapti: 'jal-nigam-vigyapti-v1',
    supplyAadesh: 'jal-nigam-supply-v1',
  },
  'ग्राम पंचायत': {
    vigyapti: 'gram-panchayat-vigyapti-v1',
    supplyAadesh: 'gram-panchayat-supply-v1',
  },
  'स्मार्ट सिटी': {
    vigyapti: 'smart-city-vigyapti-v1',
    supplyAadesh: 'smart-city-supply-v1',
  },
  'विद्युत विभाग': {
    vigyapti: 'electricity-vigyapti-v1',
    supplyAadesh: 'electricity-supply-v1',
  },
};

/**
 * Get template identifier for a department and document type
 */
export function getDepartmentTemplate(
  departmentName: string,
  docType: TenderDocType
): string | null {
  const config = DEPARTMENT_TEMPLATES[departmentName];
  if (!config) return null;

  switch (docType) {
    case 'vigyapti':
      return config.vigyapti;
    case 'supply_aadesh':
      return config.supplyAadesh;
    case 'quotation_main':
    case 'quotation_alt_1':
    case 'quotation_alt_2':
      return config.quotation || null;
    case 'firm_bill':
      return config.bill || null;
    default:
      return null;
  }
}

/**
 * Check if a department has custom templates configured
 */
export function hasDepartmentTemplates(departmentName: string): boolean {
  return departmentName in DEPARTMENT_TEMPLATES;
}

/**
 * Get all supported departments
 */
export function getSupportedDepartments(): string[] {
  return Object.keys(DEPARTMENT_TEMPLATES);
}
