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
