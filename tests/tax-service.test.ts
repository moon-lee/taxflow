import { describe, it, expect } from 'vitest';
import {
  taxOnIncome,
  medicareLevy,
  mlsAmount,
  refund,
  superTopUp,
} from '../src/services/tax-service.js';
import type { BracketRow, MlsTier } from '../src/services/tax-service.js';

const BRACKETS_2026: BracketRow[] = [
  { from: 0, to: 18200, base: 0, rate: 0 },
  { from: 18201, to: 45000, base: 0, rate: 0.15 },
  { from: 45001, to: 135000, base: 4020, rate: 0.3 },
  { from: 135001, to: 190000, base: 31020, rate: 0.37 },
  { from: 190001, to: null, base: 51370, rate: 0.45 },
];

const MLS_SINGLE_2026: MlsTier[] = [
  { from: 0, to: 105000, rate: 0 },
  { from: 105001, to: 123000, rate: 0.01 },
  { from: 123001, to: 164000, rate: 0.0125 },
  { from: 164001, to: null, rate: 0.015 },
];

describe('taxOnIncome (sheet: 10,850.83 -> 0)', () => {
  it('returns 0 below the threshold', () => {
    expect(taxOnIncome(10850.83, BRACKETS_2026)).toBe(0);
  });
  it('applies 15% in the second bracket', () => {
    expect(taxOnIncome(45000, BRACKETS_2026)).toBe(4020);
  });
  it('applies 30% in the third bracket', () => {
    expect(taxOnIncome(50000, BRACKETS_2026)).toBe(5520);
  });
  it('applies 45% at the top', () => {
    expect(taxOnIncome(200000, BRACKETS_2026)).toBe(55870);
  });
});

describe('medicareLevy (sheet F11: 10,850.83 -> 218)', () => {
  it('rounds up to whole dollars like the sheet', () => {
    expect(medicareLevy(10850.83, 0.02)).toBe(218);
  });
});

describe('mlsAmount', () => {
  it('is 0 under the base tier', () => {
    expect(mlsAmount(100000, MLS_SINGLE_2026, 365, 365)).toBe(0);
  });
  it('charges 1% in tier 1 for a full uncovered year', () => {
    expect(mlsAmount(110000, MLS_SINGLE_2026, 365, 365)).toBe(1100);
  });
  it('pro-rates by uncovered days', () => {
    expect(mlsAmount(110000, MLS_SINGLE_2026, 183, 365)).toBe(552);
  });
});

describe('refund (sheet F17: 2899 - 218 = 2681)', () => {
  it('returns positive when over-withheld', () => {
    expect(refund(2899, 218)).toBe(2681);
  });
  it('returns negative when tax is owed', () => {
    expect(refund(100, 218)).toBe(-118);
  });
});

describe('superTopUp (sheet F9/F19 planner)', () => {
  it('lowers the bill when extra super is added', () => {
    const r = superTopUp(50000, 5000, BRACKETS_2026, 0.02);
    expect(r.adjustedTaxable).toBe(45000);
    expect(r.newBill).toBe(4020 + Math.ceil(45000 * 0.02));
    expect(r.saving).toBe(5520 + Math.ceil(50000 * 0.02) - r.newBill);
  });
});

describe('tax service (sheet numbers)', () => {
  function mockFinance() {
    const store: Record<string, Array<Record<string, unknown>>> = {};
    let seq = 1;
    const table = (name: string) => ({
      find: async (q: Record<string, unknown> = {}) => {
        const rows = store[name] ?? [];
        return rows.filter((r) =>
          Object.entries(q).every(([k, v]) => r[k] === v),
        );
      },
      insert: async (input: Record<string, unknown>) => {
        const row = { id: seq++, ...input };
        (store[name] ??= []).push(row);
        return { id: row.id };
      },
      update: async (
        filter: Record<string, unknown>,
        patch: Record<string, unknown>,
      ) => {
        let n = 0;
        for (const r of store[name] ?? []) {
          if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
            Object.assign(r, patch);
            n += 1;
          }
        }
        return { affected: n };
      },
      delete: async () => ({ affected: 0 }),
      count: async () => (store[name] ?? []).length,
    });
    return { db: { table } };
  }

  async function seed(finance: any): Promise<void> {
    await finance.db.table('taxflow_years').insert({
      year_key: '2026-2027',
      is_locked: false,
    });
    const brackets = [
      { limit_from: 0, limit_to: 18200, base_amount: 0, rate: 0 },
      { limit_from: 18201, limit_to: 45000, base_amount: 0, rate: 0.15 },
      { limit_from: 45001, limit_to: 135000, base_amount: 4020, rate: 0.3 },
      { limit_from: 135001, limit_to: 190000, base_amount: 31020, rate: 0.37 },
      { limit_from: 190001, limit_to: null, base_amount: 51370, rate: 0.45 },
    ];
    for (const b of brackets) {
      await finance.db
        .table('taxflow_rates')
        .insert({ year_key: '2026-2027', kind: 'bracket', ...b, label: null });
    }
    await finance.db.table('taxflow_rates').insert({
      year_key: '2026-2027',
      kind: 'medicare',
      limit_from: 0,
      limit_to: null,
      base_amount: 0,
      rate: 0.02,
      label: null,
    });
    const single = [
      { limit_from: 0, limit_to: 105000, rate: 0 },
      { limit_from: 105001, limit_to: 123000, rate: 0.01 },
      { limit_from: 123001, limit_to: 164000, rate: 0.0125 },
      { limit_from: 164001, limit_to: null, rate: 0.015 },
    ];
    for (const t of single) {
      await finance.db.table('taxflow_rates').insert({
        year_key: '2026-2027',
        kind: 'mls-single',
        ...t,
        base_amount: 0,
        label: null,
      });
    }
    const family = [
      { limit_from: 0, limit_to: 210000, rate: 0 },
      { limit_from: 210001, limit_to: 246000, rate: 0.01 },
      { limit_from: 246001, limit_to: 328000, rate: 0.0125 },
      { limit_from: 328001, limit_to: null, rate: 0.015 },
    ];
    for (const t of family) {
      await finance.db.table('taxflow_rates').insert({
        year_key: '2026-2027',
        kind: 'mls-family',
        ...t,
        base_amount: 0,
        label: null,
      });
    }
    await finance.db.table('taxflow_entries').insert({
      year_key: '2026-2027',
      item_key: 'wages',
      kind: 'income',
      label: null,
      amount: 13595.45,
      withheld: 2899,
      cost: 0,
      work_percent: 100,
    });
    await finance.db.table('taxflow_entries').insert({
      year_key: '2026-2027',
      item_key: 'interest',
      kind: 'income',
      label: null,
      amount: 5.94,
      withheld: 0,
      cost: 0,
      work_percent: 100,
    });
    await finance.db.table('taxflow_entries').insert({
      year_key: '2026-2027',
      item_key: 'work',
      kind: 'deduction',
      label: 'Internet',
      amount: 0,
      withheld: 0,
      cost: 1290,
      work_percent: 40,
    });
    await finance.db.table('taxflow_spouse').insert({
      year_key: '2026-2027',
      spouse_income: 107331,
      fringe_benefits: 16999,
      super_amount: 0,
      investment_losses: 0,
      reportable_super: 0,
      has_cover: false,
      covered_days: 0,
      children_count: 3,
    });
  }

  it('getEstimate matches sheet math (taxable 13085.39, medicare 262, refund 2637)', async () => {
    const { createTaxService } = await import('../src/services/tax-summary.js');
    const finance = mockFinance();
    await seed(finance);
    const svc = createTaxService(finance);
    expect(await svc.getEstimate({ yearKey: '2026-2027' })).toEqual({
      income: 13601.39,
      withheld: 2899,
      deductions: 516,
      taxable: 13085.39,
      tax: 0,
      medicare: 262,
      mls: 0,
      mlsTier: 'Base',
      mlsRate: 0,
      total: 262,
      refund: 2637,
    });
  });

  it('getEstimateWithSuper lowers the bill (extra 5000 -> refund 2737)', async () => {
    const { createTaxService } = await import('../src/services/tax-summary.js');
    const finance = mockFinance();
    await seed(finance);
    const svc = createTaxService(finance);
    const e = (await svc.getEstimateWithSuper({
      yearKey: '2026-2027',
      extraSuper: 5000,
    })) as { taxable: number; refund: number };
    expect(e.taxable).toBe(8085.39);
    expect(e.refund).toBe(2737);
  });

  it('getMls returns the base tier for low combined income', async () => {
    const { createTaxService } = await import('../src/services/tax-summary.js');
    const finance = mockFinance();
    await seed(finance);
    const svc = createTaxService(finance);
    expect(await svc.getMls({ yearKey: '2026-2027' })).toEqual({
      tier: 'Base',
      rate: 0,
      amount: 0,
    });
  });

  it('family MLS charges tier 1 on high combined income (no cover, 3 kids)', async () => {
    const { createTaxService } = await import('../src/services/tax-summary.js');
    const finance = mockFinance();
    await seed(finance);
    await finance.db
      .table('taxflow_spouse')
      .update({ year_key: '2026-2027' }, { spouse_income: 200000 });
    const svc = createTaxService(finance);
    expect(await svc.getMls({ yearKey: '2026-2027' })).toEqual({
      tier: 'Tier 1',
      rate: 0.01,
      amount: 2301,
    });
  });

  it('returns null for an empty year', async () => {
    const { createTaxService } = await import('../src/services/tax-summary.js');
    const svc = createTaxService(mockFinance());
    expect(await svc.getEstimate({ yearKey: '2026-2027' })).toBeNull();
  });
});
