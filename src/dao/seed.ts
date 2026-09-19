import { SEED_ITEMS } from './items.js';

const YEAR = '2026-2027';

export async function seedIfEmpty(finance: any): Promise<void> {
  const years = (await finance.db.table('taxflow_years').find({})) as Array<{
    year_key: string;
  }>;
  if (years.length > 0) return;
  await finance.db.table('taxflow_years').insert({
    year_key: YEAR,
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
      .insert({ year_key: YEAR, kind: 'bracket', ...b, label: null });
  }
  await finance.db.table('taxflow_rates').insert({
    year_key: YEAR,
    kind: 'medicare',
    limit_from: 0,
    limit_to: null,
    base_amount: 0,
    rate: 0.02,
    label: 'Flat 2% (v1)',
  });
  const mlsSingle = [
    { limit_from: 0, limit_to: 105000, rate: 0 },
    { limit_from: 105001, limit_to: 123000, rate: 0.01 },
    { limit_from: 123001, limit_to: 164000, rate: 0.0125 },
    { limit_from: 164001, limit_to: null, rate: 0.015 },
  ];
  for (const t of mlsSingle) {
    await finance.db.table('taxflow_rates').insert({
      year_key: YEAR,
      kind: 'mls-single',
      ...t,
      base_amount: 0,
      label: null,
    });
  }
  const mlsFamily = [
    { limit_from: 0, limit_to: 210000, rate: 0 },
    { limit_from: 210001, limit_to: 246000, rate: 0.01 },
    { limit_from: 246001, limit_to: 328000, rate: 0.0125 },
    { limit_from: 328001, limit_to: null, rate: 0.015 },
  ];
  for (const t of mlsFamily) {
    await finance.db.table('taxflow_rates').insert({
      year_key: YEAR,
      kind: 'mls-family',
      ...t,
      base_amount: 0,
      label: null,
    });
  }
  const links = [
    'https://www.ato.gov.au/rates/individual-income-tax-rates/',
    'https://paycalculator.com.au/',
    'https://www.homeloanexperts.com.au/mortgage-calculators/income-tax-calculator/',
  ];
  for (const url of links) {
    await finance.db.table('taxflow_rates').insert({
      year_key: YEAR,
      kind: 'link',
      limit_from: 0,
      limit_to: null,
      base_amount: 0,
      rate: 0,
      label: url,
    });
  }
  for (const item of SEED_ITEMS) {
    await finance.db
      .table('taxflow_item_types')
      .insert({ ...item, is_active: true });
  }
}
