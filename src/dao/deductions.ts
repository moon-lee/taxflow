export interface DeductionRow {
  id: number;
  year_key: string;
  item_key: string;
  label: string;
  cost: number;
  work_percent: number;
}

const TABLE = 'taxflow_deductions';

export async function listDeductions(
  finance: any,
  yearKey: string,
): Promise<DeductionRow[]> {
  return (await finance.db
    .table(TABLE)
    .find({ year_key: yearKey })) as DeductionRow[];
}

export async function createDeduction(
  finance: any,
  input: {
    year_key: string;
    item_key: string;
    label: string;
    cost: number;
    work_percent: number;
  },
): Promise<number> {
  const res = (await finance.db.table(TABLE).insert(input)) as { id: number };
  return res.id;
}

export async function updateDeduction(
  finance: any,
  id: number,
  patch: { label: string; cost: number; work_percent: number },
): Promise<void> {
  await finance.db.table(TABLE).update({ id }, patch);
}

export async function deleteDeduction(finance: any, id: number): Promise<void> {
  await finance.db.table(TABLE).delete({ id });
}
