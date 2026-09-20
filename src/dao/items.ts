export type ItemGroup = 'income' | 'deduction' | 'offset';

export interface ItemTypeRow {
  id: number;
  item_key: string;
  label: string;
  item_group: ItemGroup;
  sort_order: number;
  is_active: boolean;
}

const TABLE = 'taxflow_item_types';

export const SEED_ITEMS: Array<{
  item_key: string;
  label: string;
  item_group: ItemGroup;
  sort_order: number;
}> = [
  { item_key: 'wages', label: 'Wages', item_group: 'income', sort_order: 1 },
  {
    item_key: 'interest',
    label: 'Gross interest',
    item_group: 'income',
    sort_order: 2,
  },
  {
    item_key: 'dividends',
    label: 'Dividends',
    item_group: 'income',
    sort_order: 3,
  },
  {
    item_key: 'managed-funds',
    label: 'Managed fund distributions',
    item_group: 'income',
    sort_order: 4,
  },
  {
    item_key: 'capital-gain',
    label: 'Net capital gain',
    item_group: 'income',
    sort_order: 5,
  },
  {
    item_key: 'foreign-income',
    label: 'Other foreign income',
    item_group: 'income',
    sort_order: 6,
  },
  {
    item_key: 'work',
    label: 'Work-related expense',
    item_group: 'deduction',
    sort_order: 1,
  },
  {
    item_key: 'div-cost',
    label: 'Dividend deductions',
    item_group: 'deduction',
    sort_order: 2,
  },
  {
    item_key: 'super-personal',
    label: 'Personal super contributions',
    item_group: 'deduction',
    sort_order: 3,
  },
  {
    item_key: 'foreign-offset',
    label: 'Foreign income offset',
    item_group: 'offset',
    sort_order: 1,
  },
];

export async function listItemTypes(
  finance: any,
  group: ItemGroup,
  includeInactive = false,
): Promise<ItemTypeRow[]> {
  const rows = (await finance.db
    .table(TABLE)
    .find({ item_group: group })) as ItemTypeRow[];
  const live = includeInactive
    ? rows
    : rows.filter((r) => r.is_active === true);
  return live.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export async function createItemType(
  finance: any,
  input: {
    item_key: string;
    label: string;
    item_group: ItemGroup;
    sort_order: number;
  },
): Promise<number> {
  const res = (await finance.db
    .table(TABLE)
    .insert({ ...input, is_active: true })) as { id: number };
  return res.id;
}

export async function setItemActive(
  finance: any,
  itemKey: string,
  active: boolean,
): Promise<void> {
  await finance.db
    .table(TABLE)
    .update({ item_key: itemKey }, { is_active: active });
}
