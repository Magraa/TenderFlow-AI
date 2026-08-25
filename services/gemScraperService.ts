import { GeMSearchFilters, GeMTender, GeMSearchResponse, GeMDropdownOption } from '@/types/gem';

interface SessionCache {
  cookieStr: string;
  csrfToken: string;
  expiresAt: number;
}

let cachedSession: SessionCache | null = null;

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const AJAX_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://bidplus.gem.gov.in',
  'Referer': 'https://bidplus.gem.gov.in/advance-search',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

function extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  const cause = error?.cause ? (error.cause.message || error.cause.code || JSON.stringify(error.cause)) : '';
  const msg = error?.message || String(error);
  if (cause && !msg.includes(cause)) {
    return `${msg} (Cause: ${cause})`;
  }
  return msg;
}

/**
 * Obtain a valid session cookie and CSRF token from GeM advance-search page.
 */
export async function getGeMSession(forceRefresh = false): Promise<{ cookieStr: string; csrfToken: string }> {
  const now = Date.now();
  if (!forceRefresh && cachedSession && cachedSession.expiresAt > now) {
    return {
      cookieStr: cachedSession.cookieStr,
      csrfToken: cachedSession.csrfToken,
    };
  }

  const response = await fetch('https://bidplus.gem.gov.in/advance-search', {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize GeM session: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract cookies
  let rawCookies: string[] = [];
  if (typeof response.headers.getSetCookie === 'function') {
    rawCookies = response.headers.getSetCookie();
  } else {
    const header = response.headers.get('set-cookie');
    if (header) rawCookies = [header];
  }

  const cookiePairs: string[] = [];
  rawCookies.forEach((c) => {
    const firstPart = c.split(';')[0].trim();
    if (firstPart) cookiePairs.push(firstPart);
  });

  const cookieStr = cookiePairs.join('; ');

  // Extract CSRF Token
  const csrfMatch =
    html.match(/'csrf_bd_gem_nk':\s*'([a-f0-9]+)'/i) ||
    html.match(/csrf_bd_gem_nk\s*[:=]\s*['"]([a-f0-9]+)['"]/i) ||
    html.match(/name="csrf_bd_gem_nk"\s+value="([a-f0-9]+)"/i);

  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  if (!csrfToken) {
    throw new Error('Could not find CSRF token on GeM advance-search page');
  }

  // Cache for 15 minutes
  cachedSession = {
    cookieStr,
    csrfToken,
    expiresAt: now + 15 * 60 * 1000,
  };

  return { cookieStr, csrfToken };
}

/**
 * Normalizes raw doc array fields returned by Solr / GeM backend.
 */
function unwrap<T>(val: any, defaultVal: T): T {
  if (Array.isArray(val)) {
    return (val.length > 0 ? val[0] : defaultVal) as T;
  }
  return (val !== undefined && val !== null ? val : defaultVal) as T;
}

function normalizeDoc(raw: Record<string, any>): GeMTender {
  const id = Number(unwrap(raw.b_id, 0));
  const bidNumber = String(unwrap(raw.b_bid_number, ''));
  const categoryName = String(unwrap(raw.b_category_name, ''));
  const totalQuantity = Number(unwrap(raw.b_total_quantity, 1));
  const startDate = String(unwrap(raw.final_start_date_sort, ''));
  const endDate = String(unwrap(raw.final_end_date_sort, ''));
  const ministryName = String(unwrap(raw.ba_official_details_minName, ''));
  const departmentName = String(unwrap(raw.ba_official_details_deptName, ''));
  const buyerStatus = String(unwrap(raw.b_buyer_status, ''));
  const bidType = Number(unwrap(raw.b_bid_type, 1));
  
  const isRA = bidType === 2 || bidType === 5;
  const isBunch = Boolean(unwrap(raw.b_is_bunch, 0));
  const isHighValue = Boolean(unwrap(raw.is_high_value, 0));
  const isCustomItem = Boolean(unwrap(raw.b_is_custom_item, 0));
  const isSinglePacket = Boolean(unwrap(raw.ba_is_single_packet, 0));
  const isGlobalTendering = Boolean(unwrap(raw.ba_is_global_tendering, 0));

  let docPrefix = 'showbidDocument';
  if (bidType === 5) {
    docPrefix = 'showdirectradocumentPdf';
  } else if (bidType === 2) {
    docPrefix = 'showradocumentPdf';
  }

  const pdfUrl = `https://bidplus.gem.gov.in/${docPrefix}/${id}`;
  const corrigendumUrl = `https://bidplus.gem.gov.in/bidding/bid/viewCorrigendum/${id}`;

  const items = Array.isArray(raw.bd_category_name)
    ? raw.bd_category_name.map(String)
    : categoryName
    ? [categoryName]
    : [];

  return {
    id,
    bidNumber,
    categoryName,
    items,
    totalQuantity,
    startDate,
    endDate,
    ministryName,
    departmentName,
    buyerStatus,
    bidType,
    isRA,
    isBunch,
    isHighValue,
    isCustomItem,
    isSinglePacket,
    isGlobalTendering,
    pdfUrl,
    corrigendumUrl,
    raw,
  };
}

function toGeMDateFormat(d?: string): string {
  if (!d || !d.trim()) return '';
  const trimmed = d.trim();
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  }
  return trimmed;
}

/**
 * Searches GeM open tenders with given filters and pagination.
 */
export async function searchGeMBids(filters: GeMSearchFilters, isRetry = false): Promise<GeMSearchResponse> {
  try {
    const { cookieStr, csrfToken } = await getGeMSession(isRetry);

    const payload: Record<string, any> = {
      page: filters.page || 1,
    };

    if (filters.searchType === 'bidNumber') {
      payload.searchType = 'bidNumber';
      payload.bidNumber = filters.bidNumber || '';
      payload.category = filters.category || '';
      payload.bidEndFrom = toGeMDateFormat(filters.bidEndFrom);
      payload.bidEndTo = toGeMDateFormat(filters.bidEndTo);
    } else if (filters.searchType === 'ministry-search') {
      payload.searchType = 'ministry-search';
      payload.ministry = filters.ministry || '';
      payload.buyerState = filters.buyerState || '';
      payload.organization = filters.organization || '';
      payload.department = filters.department || '';
      payload.bidEndFromMin = toGeMDateFormat(filters.bidEndFromMin || filters.bidEndFrom);
      payload.bidEndToMin = toGeMDateFormat(filters.bidEndToMin || filters.bidEndTo);
    } else if (filters.searchType === 'location-search' || filters.searchType === 'con') {
      payload.searchType = 'con';
      payload.state_name_con = filters.state_name_con || '';
      payload.city_name_con = filters.city_name_con || '';
      payload.bidEndFromCon = toGeMDateFormat(filters.bidEndFromCon || filters.bidEndFrom);
      payload.bidEndToCon = toGeMDateFormat(filters.bidEndToCon || filters.bidEndTo);
    } else if (filters.searchType === 'boq-search' || filters.searchType === 'boq') {
      payload.searchType = 'boq';
      payload.boqtitle_con = filters.boqtitle_con || '';
      payload.bidvalue = filters.bidvalue || '';
      payload.bidEndFromBoq = toGeMDateFormat(filters.bidEndFromBoq || filters.bidEndFrom);
      payload.bidEndToBoq = toGeMDateFormat(filters.bidEndToBoq || filters.bidEndTo);
    } else {
      payload.searchType = 'bidNumber';
    }

    const formData = new URLSearchParams();
    formData.append('payload', JSON.stringify(payload));
    formData.append('csrf_bd_gem_nk', csrfToken);

    const response = await fetch('https://bidplus.gem.gov.in/search-bids', {
      method: 'POST',
      headers: {
        ...AJAX_HEADERS,
        Cookie: cookieStr,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    if (response.status === 422 && !isRetry) {
      // Session or token expired, retry once with fresh session
      return await searchGeMBids(filters, true);
    }

    const data = await response.json();

    if (data.code === 404 || data.message === 'No data found') {
      return {
        success: true,
        totalRecords: 0,
        page: filters.page || 1,
        pageSize: 10,
        totalPages: 0,
        bids: [],
      };
    }

    if (data.code === 200 && data.response?.response) {
      const resp = data.response.response;
      const totalRecords = resp.numFound || 0;
      const rawDocs = resp.docs || [];
      const bids = rawDocs.map(normalizeDoc);
      const pageSize = 10;
      const totalPages = Math.ceil(totalRecords / pageSize);

      return {
        success: true,
        totalRecords,
        page: filters.page || 1,
        pageSize,
        totalPages,
        bids,
      };
    }

    return {
      success: false,
      totalRecords: 0,
      page: filters.page || 1,
      pageSize: 10,
      totalPages: 0,
      bids: [],
      error: data.message || `Unexpected response code: ${data.code}`,
    };
  } catch (error: any) {
    if (!isRetry) {
      return await searchGeMBids(filters, true);
    }
    return {
      success: false,
      totalRecords: 0,
      page: filters.page || 1,
      pageSize: 10,
      totalPages: 0,
      bids: [],
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Fetches Corrigendum HTML details for a specific bid ID.
 */
export async function getGeMCorrigendum(bidId: number | string): Promise<{ success: boolean; html: string; error?: string }> {
  try {
    const response = await fetch(`https://bidplus.gem.gov.in/bidding/bid/viewCorrigendum/${bidId}`, {
      headers: {
        ...DEFAULT_HEADERS,
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return { success: false, html: '', error: `Status ${response.status}` };
    }

    const html = await response.text();
    return { success: true, html };
  } catch (error: any) {
    return { success: false, html: '', error: extractErrorMessage(error) };
  }
}

/**
 * Fetch States list from GeM.
 */
export async function getGeMStates(): Promise<GeMDropdownOption[]> {
  try {
    const { cookieStr, csrfToken } = await getGeMSession();
    const formData = new URLSearchParams();
    formData.append('csrf_bd_gem_nk', csrfToken);

    const res = await fetch('https://bidplus.gem.gov.in/state-list-adv', {
      method: 'POST',
      headers: {
        ...AJAX_HEADERS,
        Cookie: cookieStr,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();
    const list = Array.isArray(json) ? json : json?.data || [];
    if (Array.isArray(list)) {
      return list
        .filter(Boolean)
        .map((item: any) => {
          if (typeof item === 'string') {
            return { value: item, label: item };
          }
          const name = String(item.state_name || item.name || item.value || '').trim();
          return { value: name, label: name };
        })
        .filter((opt) => opt.value.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch Ministry list from GeM.
 */
export async function getGeMMinistries(): Promise<GeMDropdownOption[]> {
  try {
    const { cookieStr, csrfToken } = await getGeMSession();
    const formData = new URLSearchParams();
    formData.append('csrf_bd_gem_nk', csrfToken);

    const res = await fetch('https://bidplus.gem.gov.in/ministry-list-adv', {
      method: 'POST',
      headers: {
        ...AJAX_HEADERS,
        Cookie: cookieStr,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();
    const list = json?.data?.MinistryList || (Array.isArray(json) ? json : json?.data || []);
    if (Array.isArray(list)) {
      return list
        .filter(Boolean)
        .map((item: any) => {
          if (typeof item === 'string') {
            return { value: item, label: item };
          }
          const name = String(item.ministry_name || item.name || item.value || '').trim();
          return { value: name, label: name };
        })
        .filter((opt) => opt.value.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch Cities list for a specific State from GeM.
 */
export async function getGeMCities(stateName: string): Promise<GeMDropdownOption[]> {
  if (!stateName || !stateName.trim()) return [];
  try {
    const { cookieStr, csrfToken } = await getGeMSession();
    const formData = new URLSearchParams();
    formData.append('csrf_bd_gem_nk', csrfToken);
    formData.append('state_name', stateName.trim());

    const res = await fetch('https://bidplus.gem.gov.in/city-list-adv', {
      method: 'POST',
      headers: {
        ...AJAX_HEADERS,
        Cookie: cookieStr,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    const seen = new Set<string>();
    const options: GeMDropdownOption[] = [];

    list.forEach((item: any) => {
      const city = String(item?.city_name || '').trim();
      if (city && !seen.has(city.toUpperCase())) {
        seen.add(city.toUpperCase());
        options.push({ value: city.toUpperCase(), label: city.toUpperCase() });
      }
    });

    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  } catch {
    return [];
  }
}
