export type RateKind =
  'bracket' | 'medicare' | 'mls-single' | 'mls-family' | 'link';

export interface RateRow {
  id: number;
  year_key: string;
  kind: RateKind;
  limit_from: number;
  limit_to: number | null;
  base_amount: number;
  rate: number;
  label: string | null;
}

const TABLE = 'taxflow_rates';

export async function getRates(
  finance: any,
  yearKey: string,
): Promise<RateRow[]> {
  return (await finance.db
    .table(TABLE)
    .find({ year_key: yearKey })) as RateRow[];
}

export async function saveRate(
  finance: any,
  input: {
    year_key: string;
    kind: RateKind;
    limit_from: number;
    limit_to: number | null;
    base_amount: number;
    rate: number;
    label?: string | null;
  },
): Promise<number> {
  const res = (await finance.db.table(TABLE).insert(input)) as { id: number };
  return res.id;
}

export async function updateRate(
  finance: any,
  id: number,
  patch: {
    limit_from: number;
    limit_to: number | null;
    base_amount: number;
    rate: number;
  },
): Promise<void> {
  await finance.db.table(TABLE).update({ id }, patch);
}

export async function deleteRate(finance: any, id: number): Promise<void> {
  await finance.db.table(TABLE).delete({ id });
}

export async function copyRates(
  finance: any,
  fromYear: string,
  toYear: string,
): Promise<void> {
  const rows = await getRates(finance, fromYear);
  for (const r of rows) {
    await finance.db.table(TABLE).insert({
      year_key: toYear,
      kind: r.kind,
      limit_from: r.limit_from,
      limit_to: r.limit_to,
      base_amount: r.base_amount,
      rate: r.rate,
      label: r.label,
    });
  }
}
