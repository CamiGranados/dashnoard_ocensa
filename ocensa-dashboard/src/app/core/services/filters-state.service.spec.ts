import { describe, expect, it } from 'vitest';
import { validateAppliedDashboardFilters } from './filters-state.service';

describe('validateAppliedDashboardFilters', () => {
  it('accepts the exact canonical tank, year and month populations', () => {
    expect(
      validateAppliedDashboardFilters(
        { tank: 'TK7311', year: ['2025', 2026], month: 5 },
        { tank: 'TK7311', years: [2026, 2025], months: [5] },
      ),
    ).toEqual([]);
  });

  it('requires absence of a dimension when the user did not request it', () => {
    expect(
      validateAppliedDashboardFilters(
        { tank: 'TK7311' },
        { tank: null, years: [], months: [] },
      ).map((issue) => issue.code),
    ).toContain('DASHBOARD_FILTER_TANK_MISMATCH');
  });

  it('rejects omitted, duplicated, invalid and aliased calendar filters', () => {
    const codes = validateAppliedDashboardFilters(
      { year: ['2026', '2026'], months: [5] },
      { tank: null, years: [2026], months: [5] },
    ).map((issue) => issue.code);

    expect(codes).toContain('DASHBOARD_FILTER_YEAR_MISMATCH');
    expect(codes).toContain('DASHBOARD_FILTER_MONTH_MISMATCH');
    expect(codes).toContain('DASHBOARD_FILTER_ALIAS_INVALID');
    expect(codes).toContain('DASHBOARD_FILTER_UNREQUESTED_DIMENSION');
  });

  it('rejects any server-side filter dimension that the dashboard did not request', () => {
    const codes = validateAppliedDashboardFilters(
      { tank: 'TK7311', source: 'CIC', group: 'BSR', from: '2026-01-01' },
      { tank: 'TK7311', years: [], months: [] },
    ).map((issue) => issue.code);

    expect(codes).toContain('DASHBOARD_FILTER_UNREQUESTED_DIMENSION');
  });

  it('allows only an explicitly declared fixed module dimension', () => {
    expect(
      validateAppliedDashboardFilters(
        { tank: 'TK7311', method: 'coupon' },
        { tank: 'TK7311', years: [], months: [] },
        { method: 'coupon' },
      ),
    ).toEqual([]);

    expect(
      validateAppliedDashboardFilters(
        { tank: 'TK7311', method: 'electrochemical' },
        { tank: 'TK7311', years: [], months: [] },
        { method: 'coupon' },
      ).map((issue) => issue.code),
    ).toContain('DASHBOARD_FILTER_ADDITIONAL_MISMATCH');
  });
});
