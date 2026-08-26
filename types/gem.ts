export type GeMSearchType = 'bidNumber' | 'ministry-search' | 'location-search' | 'boq-search' | 'con' | 'boq';

export interface GeMSearchFilters {
  searchType: GeMSearchType;
  // Bid / Category Search
  bidNumber?: string;
  category?: string;
  bidEndFrom?: string; // DD-MM-YYYY
  bidEndTo?: string;   // DD-MM-YYYY

  // Ministry Search
  ministry?: string;
  buyerState?: string;
  organization?: string;
  department?: string;
  bidEndFromMin?: string;
  bidEndToMin?: string;

  // Location Search
  state_name_con?: string;
  city_name_con?: string;
  bidEndFromCon?: string;
  bidEndToCon?: string;

  // BOQ Search
  boqtitle_con?: string;
  bidvalue?: string;
  bidEndFromBoq?: string;
  bidEndToBoq?: string;

  page?: number;
}

export interface GeMTender {
  id: number;
  bidNumber: string;
  categoryName: string;
  items: string[];
  totalQuantity: number;
  startDate: string; // ISO format
  endDate: string;   // ISO format
  ministryName?: string;
  departmentName?: string;
  buyerStatus?: string;
  bidType: number; // 1: Bid, 2/5: RA
  isRA: boolean;
  isBunch: boolean;
  isHighValue: boolean;
  isCustomItem: boolean;
  isSinglePacket: boolean;
  isGlobalTendering: boolean;
  pdfUrl: string;
  corrigendumUrl: string;
  raw?: Record<string, any>;
}

export interface GeMSearchResponse {
  success: boolean;
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  bids: GeMTender[];
  error?: string;
}

export interface GeMDropdownOption {
  value: string;
  label: string;
}

export interface GeMItemDetail {
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  specifications?: Record<string, string> | string;
  consignees?: Array<{
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    quantity?: number;
    deliveryDays?: number;
  }>;
  deliveryDays?: number;
}

export interface GeMEMDDetail {
  required: boolean;
  amount: number;
  currency?: string;
  exemptionAllowed?: boolean;
  exemptionCriteria?: string;
  pbgPercentage?: number;
  pbgAmount?: number;
  advisory?: string;
}

export interface GeMEstimatedValue {
  amount?: number;
  currency?: string;
  isEstimatedProvided?: boolean;
  rawText?: string;
}

export interface GeMEligibilityCriteria {
  turnover?: string;
  experienceYears?: number;
  pastPerformancePercent?: number;
  certificatesRequired?: string[];
  oemAuthorizationRequired?: boolean;
  msePreference?: string;
  miiPreference?: string;
}

export interface GeMLinkedDoc {
  title: string;
  url: string;
  docType?: string;
  extractedSummary?: string;
}

export interface GeMAIAnalysis {
  ministryName?: string;
  departmentName?: string;
  organisationName?: string;
  officeName?: string;
  townName?: string;
  districtName?: string;
  stateName?: string;
  placeDisplay?: string; // e.g. "Porsa (Morena)"
  buyerName?: string;
  buyerAddress?: string;
  bidNumber?: string;
  itemTitle?: string;
  totalQuantity?: number;
  items: GeMItemDetail[];
  emdAmount?: GeMEMDDetail;
  estimatedBidValue?: GeMEstimatedValue;
  buyerAddedTerms?: string[];
  eligibilityCriteria?: GeMEligibilityCriteria;
  importantDates?: {
    publishDate?: string;
    bidEndDate?: string;
    bidOpeningDate?: string;
    raDate?: string;
  };
  linkedDocuments?: GeMLinkedDoc[];
  summaryHindi?: string;
  summaryEnglish?: string;
  analyzedAt: string;
  modelUsed?: string;
}

export interface GeMStarredTender {
  id: string; // "gem_starred_" + id/bidNumber
  gemBidId: number;
  bidNumber: string;
  categoryName: string;
  items: string[];
  totalQuantity: number;
  startDate: string;
  endDate: string;
  ministryName?: string;
  departmentName?: string;
  townName?: string;
  districtName?: string;
  placeDisplay?: string;
  buyerStatus?: string;
  bidType: number;
  isRA: boolean;
  isBunch: boolean;
  isHighValue: boolean;
  isCustomItem: boolean;
  isSinglePacket: boolean;
  isGlobalTendering: boolean;
  pdfUrl: string;
  corrigendumUrl: string;
  starredAt: string;
  aiAnalysis?: GeMAIAnalysis;
  aiAnalysisStatus?: 'idle' | 'analyzing' | 'completed' | 'failed';
  aiAnalysisError?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeMTenderAnalysisRecord {
  id: string; // bidNumber or docId
  bidNumber: string;
  gemBidId?: number;
  aiAnalysis: GeMAIAnalysis;
  updatedAt: string;
}

export interface GeMScanProfile {
  id: string;
  name: string; // e.g. "Morena - Urban Development"
  enabled: boolean;
  
  // Search Filters
  consigneeState: string; // e.g., "MADHYA PRADESH"
  consigneeCity: string;  // e.g., "MORENA"
  department?: string;    // single or primary department
  departments?: string[];  // multiple departments support
  ministry?: string;
  category?: string;
  
  // Date Settings
  daysAhead: number; // e.g., 30 (Rolling window from today to today + daysAhead)
  
  // Automation Preferences
  intervalMinutes: number; // e.g., 60, 180, 360, 720
  autoAnalyze: boolean;    // Automatically trigger AI analysis
  autoStar: boolean;       // Automatically star/save to dashboard
  
  // Runtime State
  lastRunAt?: string;      // ISO timestamp
  lastStatus?: 'idle' | 'success' | 'failed' | 'running';
  lastFoundCount?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeMScanLog {
  id: string;
  profileId: string;
  profileName: string;
  runAt: string;
  durationMs: number;
  status: 'success' | 'failed';
  totalBidsFound: number;
  newBidsCount: number;
  analyzedCount: number;
  error?: string;
}
