import { GeMScanProfile, GeMTender, GeMSearchFilters, GeMAIAnalysis } from '@/types/gem';
import { searchGeMBids } from '@/services/gemScraperService';
import { analyzeGeMTenderDirectly } from '@/services/gemAnalysisService';
import { db } from '@/services/db';

export interface ScanExecutionResult {
  profileId: string;
  profileName: string;
  success: boolean;
  totalFound: number;
  newBidsCount: number;
  analyzedCount: number;
  newBids: string[];
  error?: string;
  durationMs: number;
}

/**
 * Format a Date object to DD-MM-YYYY required by GeM advance search API
 */
function formatDateToGeM(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Executes a tender scan for a single configured profile.
 */
export async function runProfileScan(profile: GeMScanProfile): Promise<ScanExecutionResult> {
  const startTime = Date.now();
  console.log(`[Auto-Scanner] Starting scan for profile "${profile.name}" (State: ${profile.consigneeState}, City: ${profile.consigneeCity}, Dept: ${profile.department || 'All'})...`);

  try {
    // 1. Calculate Date Range
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + (Number(profile.daysAhead) || 30));

    const fromDateStr = formatDateToGeM(now);
    const toDateStr = formatDateToGeM(futureDate);

    // 2. Prepare cities list
    const targetCities = Array.isArray(profile.consigneeCities) && profile.consigneeCities.length > 0
      ? profile.consigneeCities.map((c) => c.trim().toUpperCase()).filter(Boolean)
      : profile.consigneeCity?.trim() ? [profile.consigneeCity.trim().toUpperCase()] : [''];

    // Prepare target departments list
    const targetDepartments = Array.isArray(profile.departments) && profile.departments.length > 0
      ? profile.departments.map((d) => d.trim()).filter(Boolean)
      : profile.department?.trim() ? [profile.department.trim()] : [];

    const allFetchedBidsMap = new Map<string, GeMTender>();

    // 3. Query GeM API for each city configured
    for (const city of targetCities) {
      const filters: GeMSearchFilters = {
        searchType: 'location-search',
        state_name_con: profile.consigneeState,
        city_name_con: city || undefined,
        department: targetDepartments.length === 1 ? targetDepartments[0] : undefined,
        ministry: profile.ministry || undefined,
        buyerState: profile.consigneeState || undefined,
        category: profile.category || undefined,
        bidEndFrom: fromDateStr,
        bidEndTo: toDateStr,
        bidEndFromCon: fromDateStr,
        bidEndToCon: toDateStr,
        bidEndFromMin: fromDateStr,
        bidEndToMin: toDateStr,
        page: 1,
      };

      try {
        const response = await searchGeMBids(filters);
        if (response && response.success && Array.isArray(response.bids)) {
          response.bids.forEach((bid) => {
            const key = (bid.bidNumber || String(bid.id)).trim().toUpperCase();
            allFetchedBidsMap.set(key, bid);
          });
        }
      } catch (err: any) {
        console.warn(`[Auto-Scanner] Failed to fetch bids for city "${city}":`, err?.message);
      }
    }

    let allBids: GeMTender[] = Array.from(allFetchedBidsMap.values());

    // Filter by departments if one or more departments are specified (OR matching)
    if (targetDepartments.length > 0) {
      const lowerTerms = targetDepartments.map((d) => d.toLowerCase());
      const matched = allBids.filter((b) => {
        const dName = (b.departmentName || '').toLowerCase();
        const mName = (b.ministryName || '').toLowerCase();
        const bStatus = (b.buyerStatus || '').toLowerCase();
        const combined = `${dName} ${mName} ${bStatus}`;
        return lowerTerms.some((term) => combined.includes(term));
      });
      if (matched.length > 0 || allBids.length > 0) {
        allBids = matched;
      }
    }

    // 4. Fetch already starred/saved tenders & analyses to detect brand-new bids
    const existingStarred = (await db.listStarredGeMTenders()) || [];
    const existingAnalyses = (await db.listGeMAIAnalyses()) || {};

    const knownBids = new Set<string>();
    existingStarred.forEach((st) => {
      if (st.bidNumber) knownBids.add(st.bidNumber.trim().toUpperCase());
      if (st.gemBidId) knownBids.add(String(st.gemBidId));
    });
    Object.keys(existingAnalyses).forEach((k) => knownBids.add(k.trim().toUpperCase()));

    const newBidsToProcess: GeMTender[] = [];
    for (const bid of allBids) {
      const bidKey = (bid.bidNumber || '').trim().toUpperCase();
      const idKey = String(bid.id || '');
      if (!knownBids.has(bidKey) && !knownBids.has(idKey)) {
        newBidsToProcess.push(bid);
      }
    }

    console.log(`[Auto-Scanner] Profile "${profile.name}": Found ${allBids.length} total bids, ${newBidsToProcess.length} are brand new.`);

    let analyzedCount = 0;
    const newBidNumbers: string[] = [];

    // Max AI analyses per single scan run to protect API quota and avoid serverless timeouts
    const MAX_AI_ANALYSES_PER_RUN = 10;
    let aiCallsRemaining = profile.autoAnalyze ? MAX_AI_ANALYSES_PER_RUN : 0;
    let hitRateLimit = false;

    // 5. Process new bids: Auto-star & Auto-Analyze with Rate Limiting Protection
    for (const bid of newBidsToProcess) {
      newBidNumbers.push(bid.bidNumber);

      let tenderAnalysis: GeMAIAnalysis | undefined = undefined;

      // Auto AI Analysis with Safety Pacing
      if (profile.autoAnalyze && bid.pdfUrl && aiCallsRemaining > 0 && !hitRateLimit) {
        try {
          console.log(`[Auto-Scanner] Auto-analyzing bid ${bid.bidNumber} (${analyzedCount + 1}/${Math.min(newBidsToProcess.length, MAX_AI_ANALYSES_PER_RUN)} in batch)...`);
          tenderAnalysis = await analyzeGeMTenderDirectly(bid.pdfUrl, bid, bid.bidNumber);
          if (tenderAnalysis) {
            analyzedCount++;
            aiCallsRemaining--;
            // Save to global permanent analyses repository
            await db.saveGeMAIAnalysis(bid.bidNumber, bid.id, tenderAnalysis);
          }

          // Safety delay between AI requests to respect 15 RPM free tier limits
          if (aiCallsRemaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
        } catch (aiErr: any) {
          const errMsg = aiErr?.message || '';
          console.warn(`[Auto-Scanner] AI Analysis failed for bid ${bid.bidNumber}:`, errMsg);
          if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit')) {
            console.warn('[Auto-Scanner] API Rate limit reached. Deferring remaining AI analyses to next interval.');
            hitRateLimit = true;
          }
        }
      }

      // Auto-Star to Dashboard (All bids are saved safely even if pending analysis)
      if (profile.autoStar) {
        try {
          await db.starGeMTender(
            bid,
            tenderAnalysis,
            `Auto-scanned by profile: ${profile.name}`
          );
        } catch (starErr: any) {
          console.warn(`[Auto-Scanner] Could not auto-star bid ${bid.bidNumber}:`, starErr?.message);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // 6. Update Profile Status
    await db.saveGeMScanProfile({
      ...profile,
      lastRunAt: new Date().toISOString(),
      lastStatus: 'success',
      lastFoundCount: allBids.length,
      lastError: undefined,
    });

    // 7. Save Scan Log
    await db.saveGeMScanLog({
      profileId: profile.id,
      profileName: profile.name,
      runAt: new Date().toISOString(),
      durationMs,
      status: 'success',
      totalBidsFound: allBids.length,
      newBidsCount: newBidsToProcess.length,
      analyzedCount,
    });

    return {
      profileId: profile.id,
      profileName: profile.name,
      success: true,
      totalFound: allBids.length,
      newBidsCount: newBidsToProcess.length,
      analyzedCount,
      newBids: newBidNumbers,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error?.message || 'Unknown scan error';
    console.error(`[Auto-Scanner] Profile "${profile.name}" failed:`, errorMsg);

    // Update Profile Error Status
    await db.saveGeMScanProfile({
      ...profile,
      lastRunAt: new Date().toISOString(),
      lastStatus: 'failed',
      lastError: errorMsg,
    });

    // Save Failure Log
    await db.saveGeMScanLog({
      profileId: profile.id,
      profileName: profile.name,
      runAt: new Date().toISOString(),
      durationMs,
      status: 'failed',
      totalBidsFound: 0,
      newBidsCount: 0,
      analyzedCount: 0,
      error: errorMsg,
    });

    return {
      profileId: profile.id,
      profileName: profile.name,
      success: false,
      totalFound: 0,
      newBidsCount: 0,
      analyzedCount: 0,
      newBids: [],
      error: errorMsg,
      durationMs,
    };
  }
}

/**
 * Runs all enabled scan profiles that are due for execution (or forces all if forceAll=true).
 */
export async function runAllDueProfiles(forceAll = false): Promise<ScanExecutionResult[]> {
  const allProfiles: GeMScanProfile[] = (await db.listGeMScanProfiles()) || [];
  const enabledProfiles = allProfiles.filter((p: GeMScanProfile) => p.enabled);

  const now = Date.now();
  const dueProfiles = enabledProfiles.filter((profile: GeMScanProfile) => {
    if (forceAll) return true;
    if (!profile.lastRunAt) return true; // never run before

    const lastRunTime = new Date(profile.lastRunAt).getTime();
    const intervalMs = (Number(profile.intervalMinutes) || 60) * 60 * 1000;
    return now - lastRunTime >= intervalMs;
  });

  console.log(`[Auto-Scanner] Found ${allProfiles.length} total profiles, ${enabledProfiles.length} enabled, ${dueProfiles.length} due for run.`);

  const results: ScanExecutionResult[] = [];
  for (const profile of dueProfiles) {
    const res = await runProfileScan(profile);
    results.push(res);
  }

  return results;
}
