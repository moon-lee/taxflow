export interface YearRow {
  id: number;
  year_key: string;
  is_locked: boolean;
}

const TABLE = 'taxflow_years';

export async function listYears(finance: any): Promise<YearRow[]> {
  const rows = (await finance.db.table(TABLE).find({})) as YearRow[];
  return rows
    .slice()
    .sort((a, b) => String(a.year_key).localeCompare(String(b.year_key)));
}

export async function createYear(
  finance: any,
  input: { year_key: string },
): Promise<number> {
  const res = (await finance.db
    .table(TABLE)
    .insert({ ...input, is_locked: false })) as { id: number };
  return res.id;
}

export async function lockYear(finance: any, yearKey: string): Promise<void> {
  await finance.db
    .table(TABLE)
    .update({ year_key: yearKey }, { is_locked: true });
}

export async function unlockYear(finance: any, yearKey: string): Promise<void> {
  await finance.db
    .table(TABLE)
    .update({ year_key: yearKey }, { is_locked: false });
}
