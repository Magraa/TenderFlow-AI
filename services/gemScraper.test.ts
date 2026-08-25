import { describe, it, expect } from 'vitest';
import { searchGeMBids, getGeMStates, getGeMMinistries, getGeMCities } from './gemScraperService';

describe('GeM Scraper Service', () => {
  it('should fetch dropdown options for states, ministries, and cities', async () => {
    const states = await getGeMStates();
    expect(Array.isArray(states)).toBe(true);
    expect(states.length).toBeGreaterThan(0);

    const ministries = await getGeMMinistries();
    expect(Array.isArray(ministries)).toBe(true);
    expect(ministries.length).toBeGreaterThan(0);

    const cities = await getGeMCities('MAHARASHTRA');
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    expect(cities[0].value).toBeTypeOf('string');
  }, 25000);

  it('should query live open bids successfully with location and specific date range', async () => {
    const res = await searchGeMBids({
      searchType: 'location-search',
      state_name_con: 'MAHARASHTRA',
      city_name_con: 'PUNE',
      bidEndFromCon: '01-08-2026',
      bidEndToCon: '30-09-2026',
      page: 1,
    });

    expect(res.success).toBe(true);
    expect(res.totalRecords).toBeGreaterThan(0);
    expect(res.totalRecords).toBeLessThan(40000); // Confirms it's filtered down
    expect(res.bids.length).toBeGreaterThan(0);

    const sample = res.bids[0];
    expect(sample.id).toBeTypeOf('number');
    expect(sample.bidNumber).toBeTypeOf('string');
  }, 25000);
});
