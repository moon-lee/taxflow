import { asBool } from '../utils/bool.js';

export interface SpouseRow {
  id: number;
  year_key: string;
  spouse_income: number;
  fringe_benefits: number;
  super_amount: number;
  investment_losses: number;
  reportable_super: number;
  has_cover: boolean;
  covered_days: number;
  children_count: number;
}

const TABLE = 'taxflow_spouse';

export async function getSpouse(
  finance: any,
  yearKey: string,
): Promise<SpouseRow | null> {
  const rows = (await finance.db
    .table(TABLE)
    .find({ year_key: yearKey })) as SpouseRow[];
  const row = rows[0] ?? null;
  return row ? { ...row, has_cover: asBool(row.has_cover) } : null;
}

export async function saveSpouse(
  finance: any,
  input: Omit<SpouseRow, 'id'>,
): Promise<void> {
  const rows = (await finance.db
    .table(TABLE)
    .find({ year_key: input.year_key })) as SpouseRow[];
  if (rows.length === 0) {
    await finance.db.table(TABLE).insert(input);
  } else {
    const { year_key: _drop, ...patch } = input;
    await finance.db.table(TABLE).update({ id: rows[0].id }, patch);
  }
}
