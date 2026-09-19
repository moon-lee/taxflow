import { describe, it, expect } from 'vitest';
import { listYears, lockYear } from '../src/dao/years.js';
import {
  createItemType,
  setItemActive,
  listItemTypes,
} from '../src/dao/items.js';
import {
  listEntries,
  upsertEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../src/dao/entries.js';
import { deductionClaim } from '../src/services/tax-service.js';

function mockFinance() {
  const store: Record<string, Array<Record<string, unknown>>> = {};
  let seq = 1;
  const table = (name: string) => ({
    find: async (q: Record<string, unknown> = {}) => {
      const rows = store[name] ?? [];
      return rows.filter((r) =>
        Object.entries(q).every(([k, v]) => r[k] === v),
      );
    },
    insert: async (input: Record<string, unknown>) => {
      const row = { id: seq++, ...input };
      (store[name] ??= []).push(row);
      return { id: row.id };
    },
    update: async (
      filter: Record<string, unknown>,
      patch: Record<string, unknown>,
    ) => {
      let n = 0;
      for (const r of store[name] ?? []) {
        if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
          Object.assign(r, patch);
          n += 1;
        }
      }
      return { affected: n };
    },
    delete: async (filter: Record<string, unknown>) => {
      const rows = store[name] ?? [];
      const keep = rows.filter(
        (r) => !Object.entries(filter).every(([k, v]) => r[k] === v),
      );
      const n = rows.length - keep.length;
      store[name] = keep;
      return { affected: n };
    },
    count: async () => (store[name] ?? []).length,
  });
  return { db: { table } };
}

describe('years dao', () => {
  it('inserts then locks a year', async () => {
    const finance = mockFinance();
    const { createYear } = await import('../src/dao/years.js');
    await createYear(finance, {
      year_key: '2026-2027',
    });
    expect(await listYears(finance)).toHaveLength(1);
    await lockYear(finance, '2026-2027');
    expect((await listYears(finance))[0].is_locked).toBe(true);
  });
});

describe('items dao', () => {
  it('creates then deactivates an item type', async () => {
    const finance = mockFinance();
    await createItemType(finance, {
      item_key: 'wages',
      label: 'Wages',
      group: 'income',
      sort_order: 1,
    });
    expect(await listItemTypes(finance, 'income')).toHaveLength(1);
    await setItemActive(finance, 'wages', false);
    expect(await listItemTypes(finance, 'income')).toHaveLength(0);
    expect(await listItemTypes(finance, 'income', true)).toHaveLength(1);
  });
});

describe('entries dao (income kind)', () => {
  it('upserts one row per item per year (sheet: wages 13595.45)', async () => {
    const finance = mockFinance();
    await upsertEntry(finance, {
      year_key: '2026-2027',
      item_key: 'wages',
      kind: 'income',
      amount: 13595.45,
      withheld: 2899,
    });
    await upsertEntry(finance, {
      year_key: '2026-2027',
      item_key: 'wages',
      kind: 'income',
      amount: 14000,
      withheld: 3000,
    });
    const rows = await listEntries(finance, '2026-2027', 'income');
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(14000);
  });
});

describe('entries dao (deduction kind)', () => {
  it('upserts one slot per item per year (sheet: work 1290 x 40% = 516)', async () => {
    const finance = mockFinance();
    await upsertEntry(finance, {
      year_key: '2026-2027',
      item_key: 'work',
      kind: 'deduction',
      cost: 1290,
      work_percent: 40,
    });
    await upsertEntry(finance, {
      year_key: '2026-2027',
      item_key: 'work',
      kind: 'deduction',
      cost: 1000,
      work_percent: 50,
    });
    const rows = await listEntries(finance, '2026-2027', 'deduction');
    expect(rows).toHaveLength(1);
    expect(deductionClaim(rows[0].cost, rows[0].work_percent)).toBe(500);
  });

  it('supports row CRUD by id', async () => {
    const finance = mockFinance();
    const id = await createEntry(finance, {
      year_key: '2026-2027',
      item_key: 'work',
      kind: 'deduction',
      label: 'Internet',
      cost: 1290,
      work_percent: 40,
    });
    const rows = await listEntries(finance, '2026-2027', 'deduction');
    expect(rows).toHaveLength(1);
    expect(deductionClaim(rows[0].cost, rows[0].work_percent)).toBe(516);
    await updateEntry(finance, id, { cost: 1000 });
    expect((await listEntries(finance, '2026-2027', 'deduction'))[0].cost).toBe(
      1000,
    );
    await deleteEntry(finance, id);
    expect(await listEntries(finance, '2026-2027', 'deduction')).toHaveLength(
      0,
    );
  });

  it('keeps kinds separate within one table', async () => {
    const finance = mockFinance();
    await upsertEntry(finance, {
      year_key: '2026-2027',
      item_key: 'wages',
      kind: 'income',
      amount: 100,
      withheld: 10,
    });
    await createEntry(finance, {
      year_key: '2026-2027',
      item_key: 'work',
      kind: 'deduction',
      label: 'Tools',
      cost: 50,
      work_percent: 100,
    });
    expect(await listEntries(finance, '2026-2027')).toHaveLength(2);
    expect(await listEntries(finance, '2026-2027', 'income')).toHaveLength(1);
  });
});
