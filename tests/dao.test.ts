import { describe, it, expect } from 'vitest';
import { listYears, lockYear } from '../src/dao/years.js';
import {
  createItemType,
  setItemActive,
  listItemTypes,
} from '../src/dao/items.js';
import { upsertIncome, listIncome } from '../src/dao/income.js';
import { createDeduction, listDeductions } from '../src/dao/deductions.js';
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
      start_date: '2026-07-01',
      end_date: '2027-06-30',
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

describe('income dao', () => {
  it('upserts one row per item per year (sheet: wages 13595.45)', async () => {
    const finance = mockFinance();
    await upsertIncome(finance, {
      year_key: '2026-2027',
      item_key: 'wages',
      amount: 13595.45,
      withheld: 2899,
    });
    await upsertIncome(finance, {
      year_key: '2026-2027',
      item_key: 'wages',
      amount: 14000,
      withheld: 3000,
    });
    const rows = await listIncome(finance, '2026-2027');
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(14000);
  });
});

describe('deductions dao', () => {
  it('creates items and claim math matches (sheet: internet 1290 x 40% = 516)', async () => {
    const finance = mockFinance();
    await createDeduction(finance, {
      year_key: '2026-2027',
      item_key: 'work',
      label: 'Internet',
      cost: 1290,
      work_percent: 40,
    });
    const rows = await listDeductions(finance, '2026-2027');
    expect(rows).toHaveLength(1);
    expect(deductionClaim(rows[0].cost, rows[0].work_percent)).toBe(516);
  });
});
