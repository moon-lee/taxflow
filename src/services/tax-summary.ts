import { listIncome } from '../dao/income.js';
import { listDeductions } from '../dao/deductions.js';
import { getSpouse } from '../dao/spouse.js';
import { getRates } from '../dao/rates.js';
import {
  taxOnIncome,
  medicareLevy,
  mlsAmount,
  refund,
  shiftFamilyTiers,
  deductionClaim,
} from './tax-service.js';

export interface TaxEstimate {
  income: number;
  withheld: number;
  deductions: number;
  taxable: number;
  tax: number;
  medicare: number;
  mls: number;
  mlsTier: string;
  mlsRate: number;
  total: number;
  refund: number;
}

export interface MlsSummary {
  tier: string;
  rate: number;
  amount: number;
}

const TIER_NAMES = ['Base', 'Tier 1', 'Tier 2', 'Tier 3'];

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Full-year estimate for one year. extraSuper>0 runs the F9/F19 planner. Null on empty/error. */
export async function loadEstimate(
  finance: any,
  yearKey: string,
  extraSuper = 0,
): Promise<TaxEstimate | null> {
  try {
    const [incomeRows, deductionRows, spouse, rateRows] = await Promise.all([
      listIncome(finance, yearKey),
      listDeductions(finance, yearKey),
      getSpouse(finance, yearKey),
      getRates(finance, yearKey),
    ]);
    if (incomeRows.length === 0 && deductionRows.length === 0) return null;
    const typedWages = (
      incomeRows as Array<{
        item_key: string;
        amount: number;
        withheld: number;
      }>
    ).find((r) => r.item_key === 'wages');
    let wages = {
      amount: Number(typedWages?.amount ?? 0),
      withheld: Number(typedWages?.withheld ?? 0),
    };
    try {
      const ytd = (await finance.services?.invoke(
        'pay',
        'getYearToDateSummary',
        {},
      )) as {
        gross: number;
        withheld: number;
      } | null;
      if (ytd && Number.isFinite(Number(ytd.gross))) {
        wages = {
          amount: Number(ytd.gross),
          withheld: Number(ytd.withheld ?? 0),
        };
      }
    } catch {
      /* typed fallback */
    }
    const other = (
      incomeRows as Array<{
        item_key: string;
        amount: number;
        withheld: number;
      }>
    ).filter((r) => r.item_key !== 'wages');
    const income = round2(
      wages.amount + other.reduce((n, r) => n + Number(r.amount), 0),
    );
    const withheld = round2(
      wages.withheld + other.reduce((n, r) => n + Number(r.withheld), 0),
    );
    const deductions = round2(
      (deductionRows as Array<{ cost: number; work_percent: number }>).reduce(
        (n, r) => n + deductionClaim(Number(r.cost), Number(r.work_percent)),
        0,
      ),
    );
    const taxable = Math.max(0, round2(income - deductions - extraSuper));
    const brackets = (
      rateRows as Array<{
        kind: string;
        limit_from: number;
        limit_to: number | null;
        base_amount: number;
        rate: number;
      }>
    )
      .filter((r) => r.kind === 'bracket')
      .map((r) => ({
        from: r.limit_from,
        to: r.limit_to,
        base: r.base_amount,
        rate: r.rate,
      }));
    if (brackets.length === 0) return null;
    const medicareRate =
      (rateRows as Array<{ kind: string; rate: number }>).find(
        (r) => r.kind === 'medicare',
      )?.rate ?? 0.02;
    const tax = taxOnIncome(taxable, brackets);
    const medicare = medicareLevy(taxable, medicareRate);
    const spouseIncome = Number((spouse as any)?.spouse_income ?? 0);
    const children = Number((spouse as any)?.children_count ?? 0);
    const hasSpouse = spouseIncome > 0 || children > 0;
    const kind = hasSpouse ? 'mls-family' : 'mls-single';
    let tiers = (
      rateRows as Array<{
        kind: string;
        limit_from: number;
        limit_to: number | null;
        rate: number;
      }>
    )
      .filter((r) => r.kind === kind)
      .map((r) => ({ from: r.limit_from, to: r.limit_to, rate: r.rate }));
    if (hasSpouse) tiers = shiftFamilyTiers(tiers, children);
    const mlsIncome =
      taxable +
      spouseIncome +
      Number((spouse as any)?.fringe_benefits ?? 0) +
      Number((spouse as any)?.investment_losses ?? 0) +
      Number((spouse as any)?.reportable_super ?? 0);
    const covered = Number((spouse as any)?.covered_days ?? 365);
    const tierIx = tiers.findIndex(
      (r) => mlsIncome >= r.from && (r.to === null || mlsIncome <= r.to),
    );
    const mlsTier = TIER_NAMES[tierIx] ?? 'Base';
    const mlsRate = tierIx >= 0 ? tiers[tierIx].rate : 0;
    const mls =
      tiers.length > 0
        ? mlsAmount(
            mlsIncome,
            tiers,
            365 - Math.min(365, Math.max(0, covered)),
            365,
          )
        : 0;
    const total = tax + medicare + mls;
    return {
      income,
      withheld,
      deductions,
      taxable,
      tax,
      medicare,
      mls,
      mlsTier,
      mlsRate,
      total,
      refund: refund(withheld, total),
    };
  } catch {
    return null;
  }
}

export async function getMlsSummary(
  finance: any,
  yearKey: string,
): Promise<MlsSummary | null> {
  const e = await loadEstimate(finance, yearKey, 0);
  if (!e) return null;
  return { tier: e.mlsTier, rate: e.mlsRate, amount: e.mls };
}

/** ADR-0005 provider: method dispatch keeps existing consumers untouched when methods are added. */
export function createTaxService(
  finance: any,
): Record<string, (params: any) => Promise<unknown>> {
  return {
    getEstimate: (p: { yearKey: string }) =>
      loadEstimate(finance, p.yearKey, 0),
    getEstimateWithSuper: (p: { yearKey: string; extraSuper: number }) =>
      loadEstimate(finance, p.yearKey, p.extraSuper),
    getMls: (p: { yearKey: string }) => getMlsSummary(finance, p.yearKey),
  };
}
