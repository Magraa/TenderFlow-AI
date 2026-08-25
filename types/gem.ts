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
