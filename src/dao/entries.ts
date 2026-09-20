export type EntryKind = 'income' | 'deduction';

export interface EntryRow {
  id: number;
  year_key: string;
  item_key: string;
  entry_kind: EntryKind;
  label: string | null;
  amount: number;
  withheld: number;
  cost: number;
  work_percent: number;
}

const TABLE = 'taxflow_entries';

export async function listEntries(
  finance: any,
  yearKey: string,
  entryKind?: EntryKind,
): Promise<EntryRow[]> {
  const filter: Record<string, unknown> = { year_key: yearKey };
  if (entryKind) filter.entry_kind = entryKind;
  return (await finance.db.table(TABLE).find(filter)) as EntryRow[];
}

/** Slot upsert: one row per item per year per kind — update when it exists, insert when not. */
export async function upsertEntry(
  finance: any,
  input: {
    year_key: string;
    item_key: string;
    entry_kind: EntryKind;
    label?: string | null;
    amount?: number;
    withheld?: number;
    cost?: number;
    work_percent?: number;
  },
): Promise<void> {
  const rows = (await finance.db.table(TABLE).find({
    year_key: input.year_key,
    item_key: input.item_key,
    entry_kind: input.entry_kind,
  })) as EntryRow[];
  const defaults = {
    label: null,
    amount: 0,
    withheld: 0,
    cost: 0,
    work_percent: 100,
  };
  if (rows.length === 0) {
    await finance.db.table(TABLE).insert({ ...defaults, ...input });
  } else {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (
        k !== 'year_key' &&
        k !== 'item_key' &&
        k !== 'entry_kind' &&
        v !== undefined
      )
        patch[k] = v;
    }
    await finance.db.table(TABLE).update({ id: rows[0].id }, patch);
  }
}

export async function createEntry(
  finance: any,
  input: {
    year_key: string;
    item_key: string;
    entry_kind: EntryKind;
    label?: string | null;
    amount?: number;
    withheld?: number;
    cost?: number;
    work_percent?: number;
  },
): Promise<number> {
  const res = (await finance.db.table(TABLE).insert(input)) as { id: number };
  return res.id;
}

export async function updateEntry(
  finance: any,
  id: number,
  patch: {
    label?: string | null;
    amount?: number;
    withheld?: number;
    cost?: number;
    work_percent?: number;
  },
): Promise<void> {
  await finance.db.table(TABLE).update({ id }, patch);
}

export async function deleteEntry(finance: any, id: number): Promise<void> {
  await finance.db.table(TABLE).delete({ id });
}
