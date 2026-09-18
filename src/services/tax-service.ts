export interface BracketRow {
  from: number;
  to: number | null;
  base: number;
  rate: number;
}

export interface MlsTier {
  from: number;
  to: number | null;
  rate: number;
}

/** Port of the sheet's getTaxAmounts: same shape, per-year constants. Whole dollars, rounded up. */
export function taxOnIncome(income: number, brackets: BracketRow[]): number {
  const b = brackets.find(
    (r) => income >= r.from && (r.to === null || income <= r.to),
  );
  if (!b) throw new Error(`no bracket covers income ${income}`);
  const over = b.from === 0 ? 0 : income - (b.from - 1);
  return Math.ceil(b.base + over * b.rate);
}

/** Sheet F11: ROUNDUP(income * rate, 0). Flat 2% in v1, no low-income cut-off. */
export function medicareLevy(taxableIncome: number, rate: number): number {
  return Math.ceil(taxableIncome * rate);
}

/** Sheet F12. Tiers are pre-shifted for children (+1500 per child after the first, ATO rule). */
export function mlsAmount(
  mlsIncome: number,
  tiers: MlsTier[],
  uncoveredDays: number,
  daysInYear: number,
): number {
  const t = tiers.find(
    (r) => mlsIncome >= r.from && (r.to === null || mlsIncome <= r.to),
  );
  if (!t) throw new Error(`no MLS tier covers income ${mlsIncome}`);
  return Math.ceil(mlsIncome * t.rate * (uncoveredDays / daysInYear));
}

/** Sheet F17. Positive = refund, negative = amount owed. */
export function refund(totalWithheld: number, totalBill: number): number {
  return Math.round((totalWithheld - totalBill) * 100) / 100;
}

/** Sheet F18 shape: average weekly pay x 52 = full-year income. */
export function forecastFullYear(weeklyAverage: number): number {
  return Math.round(weeklyAverage * 52 * 100) / 100;
}

export interface TopUpResult {
  adjustedTaxable: number;
  newBill: number;
  saving: number;
}

/** Sheet F9/F19 planner: what-if extra personal super before June 30. */
export function superTopUp(
  taxableIncome: number,
  extraSuper: number,
  brackets: BracketRow[],
  medicareRate: number,
): TopUpResult {
  const adjustedTaxable = Math.max(
    0,
    Math.round((taxableIncome - extraSuper) * 100) / 100,
  );
  const oldBill =
    taxOnIncome(taxableIncome, brackets) +
    medicareLevy(taxableIncome, medicareRate);
  const newBill =
    taxOnIncome(adjustedTaxable, brackets) +
    medicareLevy(adjustedTaxable, medicareRate);
  return { adjustedTaxable, newBill, saving: oldBill - newBill };
}

/** Family tier shift: +1500 per dependent child after the first (ATO rule). */
export function shiftFamilyTiers(
  tiers: MlsTier[],
  childrenCount: number,
): MlsTier[] {
  const shift = 1500 * Math.max(0, childrenCount - 1);
  return tiers.map((t) => ({
    from: t.from + (t.from === 0 ? 0 : shift),
    to: t.to === null ? null : t.to + shift,
    rate: t.rate,
  }));
}

/** Deduction claim: cost x work-use %. */
export function deductionClaim(cost: number, workPercent: number): number {
  return Math.round(cost * (workPercent / 100) * 100) / 100;
}
