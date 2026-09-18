export interface IncomeRow {
  id: number;
  year_key: string;
  item_key: string;
  amount: number;
  withheld: number;
}

const TABLE = 'taxflow_income';

export async function listIncome(
  finance: any,
  yearKey: string,
): Promise<IncomeRow[]> {
  return (await finance.db
    .table(TABLE)
    .find({ year_key: yearKey })) as IncomeRow[];
}

/** One row per item per year: update when the row exists, insert when it does not. */
export async function upsertIncome(
  finance: any,
  input: {
    year_key: string;
    item_key: string;
    amount: number;
    withheld: number;
  },
): Promise<void> {
  const rows = (await finance.db.table(TABLE).find({
    year_key: input.year_key,
    item_key: input.item_key,
  })) as IncomeRow[];
  if (rows.length === 0) {
    await finance.db.table(TABLE).insert(input);
  } else {
    await finance.db
      .table(TABLE)
      .update(
        { id: rows[0].id },
        { amount: input.amount, withheld: input.withheld },
      );
  }
}
