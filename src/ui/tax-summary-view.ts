import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taxStyles } from '../styles/taxflow-styles.js';
import { listYears } from '../dao/years.js';
import { getRates } from '../dao/rates.js';
import { listItemTypes, type ItemTypeRow } from '../dao/items.js';
import { listEntries, type EntryRow } from '../dao/entries.js';
import { getSpouse } from '../dao/spouse.js';
import {
  taxOnIncome,
  medicareLevy,
  mlsAmount,
  refund,
  forecastFullYear,
  shiftFamilyTiers,
  deductionClaim,
} from '../services/tax-service.js';
import { aud, grouped, rawNumber } from '../utils/format.js';
import { CANONICAL_CARD_ORDER } from './tax-reorder-modal.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export class TaxSummaryView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([sharedStyles, taxStyles] as any)
      : [];
  finance: any = null;
  yearKey = '2026-2027';
  years: Array<{ year_key: string; is_locked: boolean }> = [];
  income: Array<{ item_key: string; amount: number; withheld: number }> = [];
  deductions: Array<{
    id: number;
    item_key: string;
    label: string;
    cost: number;
    work_percent: number;
  }> = [];
  spouse: any = null;
  rates: Array<{
    kind: string;
    limit_from: number;
    limit_to: number | null;
    base_amount: number;
    rate: number;
    label: string | null;
  }> = [];
  labels: Record<string, string> = {};
  incomeTypes: ItemTypeRow[] = [];
  deductionTypes: ItemTypeRow[] = [];
  payYtd: {
    gross: number;
    withheld: number;
    count: number;
    yearKey?: string;
  } | null = null;
  showForecast = true;
  showSuper = true;
  private payRefreshRequestedFor: string | null = null;

  private get weeksElapsed(): number {
    const m = /^(\d{4})-(\d{4})$/.exec(this.yearKey);
    if (!m) return 1;
    const start = Date.parse(`${m[1]}-07-01T00:00:00Z`);
    const end = Date.parse(`${m[2]}-06-30T00:00:00Z`);
    if (Number.isNaN(start) || Number.isNaN(end)) return 1;
    const now = Date.now();
    if (now >= end) return 52;
    if (now <= start) return 1;
    return Math.min(
      52,
      Math.max(1, Math.floor((now - start) / (7 * 86400000)) + 1),
    );
  }
  editingIncomeKey: string | null = null;
  editingDeductionKey: string | null = null;
  editingSpouse = false;
  cardOrder: string[] = [...CANONICAL_CARD_ORDER];
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.years = (await listYears(this.finance)) as Array<{
        year_key: string;
        is_locked: boolean;
      }>;
      if (
        this.years.length > 0 &&
        !this.years.some((y) => y.year_key === this.yearKey)
      ) {
        this.yearKey = this.years[this.years.length - 1].year_key;
      }
      const [entries, spouse, rates, incomeTypes, deductionTypes] =
        await Promise.all([
          listEntries(this.finance, this.yearKey),
          getSpouse(this.finance, this.yearKey),
          getRates(this.finance, this.yearKey),
          listItemTypes(this.finance, 'income'),
          listItemTypes(this.finance, 'deduction'),
        ]);
      const incomeEntries = (entries as EntryRow[]).filter(
        (r) => r.entry_kind === 'income',
      );
      const deductionEntries = (entries as EntryRow[]).filter(
        (r) => r.entry_kind === 'deduction',
      );
      this.income = incomeEntries.map((r) => ({
        item_key: r.item_key,
        amount: r.amount,
        withheld: r.withheld,
      }));
      this.deductions = deductionEntries.map((r) => ({
        id: r.id,
        item_key: r.item_key,
        label: r.label ?? '',
        cost: r.cost,
        work_percent: r.work_percent,
      }));
      this.spouse = spouse;
      this.rates = rates as Array<{
        kind: string;
        limit_from: number;
        limit_to: number | null;
        base_amount: number;
        rate: number;
        label: string | null;
      }>;
      this.incomeTypes = incomeTypes as ItemTypeRow[];
      this.deductionTypes = deductionTypes as ItemTypeRow[];
      this.labels = Object.fromEntries(
        (incomeTypes as Array<{ item_key: string; label: string }>).map((t) => [
          t.item_key,
          t.label,
        ]),
      );
      try {
        const saved = (await this.finance.settings?.get(
          'taxflow.cardOrder',
        )) as unknown;
        if (Array.isArray(saved)) {
          const known = (saved as unknown[]).filter(
            (t): t is string =>
              typeof t === 'string' &&
              (CANONICAL_CARD_ORDER as string[]).includes(t),
          );
          const missing = CANONICAL_CARD_ORDER.filter(
            (t) => !known.includes(t),
          );
          this.cardOrder = [...known, ...missing];
        }
      } catch {
        /* first run: canonical order */
      }
      // Host-pushed live data (mount) wins when it matches the open year.
      // Otherwise try a direct invoke (works in dev mock / host contexts;
      // panel services.invoke is a noop) and ask the host to fetch+push.
      if (this.payYtd?.yearKey !== this.yearKey) {
        this.payYtd = null;
        try {
          const ytd = (await this.finance.services?.invoke(
            'pay',
            'getYearToDateSummary',
            ['07-01', undefined, this.yearKey],
          )) as {
            gross: number;
            payg?: number;
            withheld?: number;
            payg_withholding?: number;
            count?: number;
          } | null;
          const gross = Number(ytd?.gross);
          if (ytd && Number.isFinite(gross)) {
            this.payYtd = {
              gross,
              withheld: Number(
                ytd.payg ?? ytd.withheld ?? ytd.payg_withholding ?? 0,
              ),
              count: Number(ytd.count ?? 0),
              yearKey: this.yearKey,
            };
          }
        } catch {
          this.payYtd = null;
        }
        if (!this.payYtd && typeof window !== 'undefined') {
          if (this.payRefreshRequestedFor !== this.yearKey) {
            this.payRefreshRequestedFor = this.yearKey;
            this.emit('pay-refresh', { yearKey: this.yearKey });
          }
        }
      }
      this.error = '';
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  private get locked(): boolean {
    return (
      this.years.find((y) => y.year_key === this.yearKey)?.is_locked === true
    );
  }

  private orderOf(tag: string): number {
    const i = this.cardOrder.indexOf(tag);
    return i === -1 ? 99 : i;
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  private num(v: FormDataEntryValue | null, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private wages(): { amount: number; withheld: number } {
    if (this.payYtd)
      return { amount: this.payYtd.gross, withheld: this.payYtd.withheld };
    const row = this.income.find((r) => r.item_key === 'wages');
    return {
      amount: Number(row?.amount ?? 0),
      withheld: Number(row?.withheld ?? 0),
    };
  }

  private totals(): {
    income: number;
    withheld: number;
    deductions: number;
    taxable: number;
  } {
    const w = this.wages();
    const other = this.income.filter((r) => r.item_key !== 'wages');
    const income = w.amount + other.reduce((n, r) => n + Number(r.amount), 0);
    const withheld =
      w.withheld + other.reduce((n, r) => n + Number(r.withheld), 0);
    const deductions = this.deductions.reduce(
      (n, r) => n + deductionClaim(Number(r.cost), Number(r.work_percent)),
      0,
    );
    const taxable = Math.max(0, Math.round((income - deductions) * 100) / 100);
    return { income, withheld, deductions, taxable };
  }

  private personalSuper(): number {
    const row = this.deductions.find((r) => r.item_key === 'super-personal');
    if (!row) return 0;
    return deductionClaim(Number(row.cost), Number(row.work_percent));
  }

  private bill(taxableOverride?: number): {
    tax: number;
    medicare: number;
    mls: number;
    total: number;
    result: number;
  } {
    const t = this.totals();
    const taxable = taxableOverride ?? t.taxable;
    const brackets = this.rates
      .filter((r) => r.kind === 'bracket')
      .map((r) => ({
        from: r.limit_from,
        to: r.limit_to,
        base: r.base_amount,
        rate: r.rate,
      }));
    const medicareRate =
      this.rates.find((r) => r.kind === 'medicare')?.rate ?? 0.02;
    const tax = brackets.length > 0 ? taxOnIncome(taxable, brackets) : 0;
    const medicare = medicareLevy(taxable, medicareRate);
    const spouseIncome = Number(this.spouse?.spouse_income ?? 0);
    const fringe = Number(this.spouse?.fringe_benefits ?? 0);
    const invLoss = Number(this.spouse?.investment_losses ?? 0);
    const repSuper = Number(this.spouse?.reportable_super ?? 0);
    const mlsIncome = taxable + spouseIncome + fringe + invLoss + repSuper;
    const hasSpouse =
      spouseIncome > 0 ||
      (this.spouse != null && Number(this.spouse?.children_count ?? 0) > 0);
    const kind = hasSpouse ? 'mls-family' : 'mls-single';
    let tiers = this.rates
      .filter((r) => r.kind === kind)
      .map((r) => ({ from: r.limit_from, to: r.limit_to, rate: r.rate }));
    if (hasSpouse)
      tiers = shiftFamilyTiers(tiers, Number(this.spouse?.children_count ?? 0));
    const covered = Number(this.spouse?.covered_days ?? 365);
    const mls =
      tiers.length > 0
        ? mlsAmount(
            mlsIncome,
            tiers,
            365 - Math.min(365, Math.max(0, covered)),
            365,
          )
        : 0;
    const total = tax + medicare + mls;
    return { tax, medicare, mls, total, result: refund(t.withheld, total) };
  }

  private forecast(): {
    basis: number;
    basisLabel: string;
    fullYearIncome: number;
    fullYearWithheld: number;
    fullYearTaxable: number;
    billTotal: number;
    estReturn: number;
  } {
    const t = this.totals();
    const w = this.wages();
    const other = this.income.filter((r) => r.item_key !== 'wages');
    const otherIncome = other.reduce((n, r) => n + Number(r.amount), 0);
    const otherWithheld = other.reduce((n, r) => n + Number(r.withheld), 0);
    const payCount = Number(this.payYtd?.count ?? 0);
    const basis =
      payCount > 0
        ? payCount
        : Math.min(52, Math.max(1, this.weeksElapsed || 1));
    const fullYearWages = forecastFullYear(w.amount / basis);
    const fullYearWagesWithheld = forecastFullYear(w.withheld / basis);
    const fullYearIncome =
      Math.round((fullYearWages + otherIncome) * 100) / 100;
    const fullYearWithheld =
      Math.round((fullYearWagesWithheld + otherWithheld) * 100) / 100;
    const fullYearTaxable = Math.max(
      0,
      Math.round((fullYearIncome - t.deductions) * 100) / 100,
    );
    const fullBill = this.bill(fullYearTaxable);
    return {
      basis,
      basisLabel: payCount > 0 ? `${payCount} payslips` : 'manual weeks',
      fullYearIncome,
      fullYearWithheld,
      fullYearTaxable,
      billTotal: fullBill.total,
      estReturn: refund(fullYearWithheld, fullBill.total),
    };
  }

  private saveIncome(itemKey: string, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('income-save', {
      input: {
        year_key: this.yearKey,
        item_key: itemKey,
        amount: rawNumber(fd.get('amount') as string),
        withheld: rawNumber(fd.get('withheld') as string),
      },
    });
    this.editingIncomeKey = null;
  }

  private saveDeduction(itemKey: string, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('deduction-save', {
      input: {
        year_key: this.yearKey,
        item_key: itemKey,
        cost: rawNumber(fd.get('cost') as string),
        work_percent: this.num(fd.get('work_percent'), 100),
      },
    });
    this.editingDeductionKey = null;
  }

  private saveSpouse(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('spouse-save', {
      input: {
        year_key: this.yearKey,
        spouse_income: rawNumber(fd.get('spouse_income') as string),
        fringe_benefits: rawNumber(fd.get('fringe_benefits') as string),
        super_amount: rawNumber(fd.get('super_amount') as string),
        investment_losses: 0,
        reportable_super: 0,
        has_cover: true,
        covered_days: 365,
        children_count: Math.max(
          0,
          Math.round(this.num(fd.get('children_count'))),
        ),
      },
    });
    this.editingSpouse = false;
  }

  private toggleEditor(
    prop: 'editingIncomeKey' | 'editingDeductionKey',
    key: string,
  ): void {
    const cur = (this as any)[prop] as string | null;
    (this as any)[prop] = cur === key ? null : key;
    (this as any).requestUpdate?.();
  }

  private editButton(
    prop: 'editingIncomeKey' | 'editingDeductionKey',
    key: string,
  ): unknown {
    return html`<button
      class="ghost"
      @click=${() => this.toggleEditor(prop, key)}
    >
      Edit
    </button>`;
  }

  private cancelButton(
    prop: 'editingIncomeKey' | 'editingDeductionKey',
  ): unknown {
    return html`<button
      class="ghost"
      type="button"
      @click=${() => {
        (this as any)[prop] = null;
        (this as any).requestUpdate?.();
      }}
    >
      Cancel
    </button>`;
  }

  private moneyFocus(e: Event): void {
    const input = e.target as HTMLInputElement;
    const n = rawNumber(input.value);
    input.value = Number.isFinite(n) ? String(n) : '';
    input.select?.();
  }

  private moneyBlur(e: Event): void {
    const input = e.target as HTMLInputElement;
    input.value = grouped(rawNumber(input.value));
  }

  private incomeEditor(): unknown {
    const key = this.editingIncomeKey;
    if (!key || this.locked) return '';
    if (key === 'wages' && this.payYtd) return '';
    const stored = this.income.find((r) => r.item_key === key);
    const label =
      key === 'wages'
        ? 'Wages'
        : (this.incomeTypes.find((it) => it.item_key === key)?.label ?? key);
    return html`<form
      class="tax-form inline one-row"
      @submit=${(e: Event) => this.saveIncome(key, e)}
    >
      <label
        >${label} $
        <input
          name="amount"
          type="text"
          inputmode="decimal"
          .value=${grouped(stored?.amount ?? 0)}
          @focus=${(e: Event) => this.moneyFocus(e)}
          @blur=${(e: Event) => this.moneyBlur(e)}
      /></label>
      <label
        >Withheld $
        <input
          name="withheld"
          type="text"
          inputmode="decimal"
          .value=${grouped(stored?.withheld ?? 0)}
          @focus=${(e: Event) => this.moneyFocus(e)}
          @blur=${(e: Event) => this.moneyBlur(e)}
      /></label>
      <div class="form-actions">
        <button class="btn-primary" type="submit">Save</button>
        ${this.cancelButton('editingIncomeKey')}
      </div>
    </form>`;
  }

  private deductionEditor(): unknown {
    const key = this.editingDeductionKey;
    if (!key || this.locked) return '';
    const stored = this.deductions.find((r) => r.item_key === key);
    const label =
      this.deductionTypes.find((dt) => dt.item_key === key)?.label ?? key;
    return html`<form
      class="tax-form inline one-row"
      @submit=${(e: Event) => this.saveDeduction(key, e)}
    >
      <label
        >${label} $
        <input
          name="cost"
          type="text"
          inputmode="decimal"
          .value=${grouped(stored?.cost ?? 0)}
          @focus=${(e: Event) => this.moneyFocus(e)}
          @blur=${(e: Event) => this.moneyBlur(e)}
      /></label>
      <label
        >Work %
        <input
          name="work_percent"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value=${String(stored?.work_percent ?? 100)}
      /></label>
      <div class="form-actions">
        <button class="btn-primary" type="submit">Save</button>
        ${this.cancelButton('editingDeductionKey')}
      </div>
    </form>`;
  }

  private openReorder(): void {
    const m = (this as any).renderRoot?.querySelector('#reorder') as any;
    if (m) {
      m.order = [...this.cardOrder];
      m.open = true;
      m.requestUpdate?.();
    }
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const t = this.totals();
    const b = this.bill();
    const superClaim = this.personalSuper();
    const taxableExSuper = Math.max(
      0,
      Math.round((t.income - (t.deductions - superClaim)) * 100) / 100,
    );
    const billNoSuper = this.bill(taxableExSuper);
    const currentBill = billNoSuper.total;
    const estimatedBill = b;
    const estimatedReturn = b.result;
    const w = this.wages();
    const s = this.spouse ?? {};
    const f = this.forecast();
    return html`
      <div class="view-scroll">
        <div class="topbar">
          <span class="crumb-current">Tax Summary</span>
          <div class="spacer"></div>
          <button class="filter-btn" @click=${() => this.openReorder()}>
            Reorder
          </button>
          <button
            class="filter-btn"
            @click=${() => {
              this.emit('navigate-view', { view: 'tax-items' });
              void this.finance?.ui?.requestMount('taxflow', {
                view: 'tax-items',
              });
            }}
          >
            Item Types
          </button>
        </div>
        <div class="view-container">
          <div class="view-container-inner cards">
            ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
            ${this.locked ? html`<p>Locked — figures are read-only.</p>` : ''}
            <div class="section span" style="order:${this.orderOf('income')}">
              <div class="section-header">
                <h3 class="section-title">Taxable Income</h3>
              </div>
              <div class="cols">
                <div class="cols-head-full" aria-hidden="true">
                  <div class="cols-head-group">
                    <span></span><span class="num">Amount</span
                    ><span class="num">Withheld</span><span></span>
                  </div>
                  <div class="cols-head-group">
                    <span></span><span class="num">Amount</span
                    ><span class="num">Withheld</span><span></span>
                  </div>
                </div>
                <div class="tax-row">
                  <span
                    >Wages
                    ${
                      Number(this.payYtd?.count ?? 0) > 0
                        ? `(live · ${this.payYtd?.count} payslips)`
                        : '(typed)'
                    }</span
                  ><span class="num">${aud(w.amount)}</span
                  ><span class="num">${aud(w.withheld)}</span>
                  <span
                    >${
                      this.locked || Number(this.payYtd?.count ?? 0) > 0
                        ? ''
                        : this.editButton('editingIncomeKey', 'wages')
                    }</span
                  >
                </div>
                ${this.incomeTypes
                  .filter((it) => it.item_key !== 'wages')
                  .map((it) => {
                    const stored = this.income.find(
                      (r) => r.item_key === it.item_key,
                    );
                    return html`<div class="tax-row">
                      <span>${it.label}</span
                      ><span class="num"
                        >${aud(Number(stored?.amount ?? 0))}</span
                      ><span class="num"
                        >${aud(Number(stored?.withheld ?? 0))}</span
                      >
                      <span
                        >${this.locked ? '' : this.editButton('editingIncomeKey', it.item_key)}</span
                      >
                    </div>`;
                  })}
              </div>
              ${this.incomeEditor()}
              <div class="tax-row total">
                <span>Total income</span
                ><span class="num">${aud(t.income)}</span>
              </div>
            </div>
            <div
              class="section span"
              style="order:${this.orderOf('deductions')}"
            >
              <div class="section-header">
                <h3 class="section-title">Deductions</h3>
              </div>
              <div class="cols">
                ${this.deductionTypes.map((dt) => {
                  const row = this.deductions.find(
                    (r) => r.item_key === dt.item_key,
                  );
                  const cost = Number(row?.cost ?? 0);
                  const workPercent = Number(row?.work_percent ?? 100);
                  const claim = row ? deductionClaim(cost, workPercent) : 0;
                  return html`<div class="tax-row">
                    <span>${dt.label}</span
                    ><span class="num">${aud(claim)}</span>
                    <span
                      >${this.locked ? '' : this.editButton('editingDeductionKey', dt.item_key)}</span
                    >
                  </div>`;
                })}
              </div>
              ${this.deductionEditor()}
              <div class="tax-row total">
                <span>Total deductions</span
                ><span class="num">${aud(t.deductions)}</span>
              </div>
            </div>
            <div class="section span" style="order:${this.orderOf('spouse')}">
              <div class="section-header">
                <h3 class="section-title">Spouse and Child Details</h3>
                ${
                  this.locked
                    ? ''
                    : html`<button
                        class="ghost"
                        @click=${() => {
                          this.editingSpouse = !this.editingSpouse;
                          (this as any).requestUpdate();
                        }}
                      >
                        Edit
                      </button>`
                }
              </div>
              <div class="cols">
                <div class="tax-row">
                  <span>Taxable Income</span
                  ><span class="num">${aud(Number(s.spouse_income ?? 0))}</span>
                </div>
                <div class="tax-row">
                  <span>Fringe benefits</span
                  ><span class="num"
                    >${aud(Number(s.fringe_benefits ?? 0))}</span
                  >
                </div>
                <div class="tax-row">
                  <span>Super sacrifices</span
                  ><span class="num">${aud(Number(s.super_amount ?? 0))}</span>
                </div>
                <div class="tax-row">
                  <span>Children</span
                  ><span class="num">${Number(s.children_count ?? 0)}</span>
                </div>
              </div>
              <div class="tax-row total">
                <span>Reportable total</span
                ><span class="num"
                  >${aud(
                    Number(s.spouse_income ?? 0) +
                      Number(s.fringe_benefits ?? 0) +
                      Number(s.super_amount ?? 0),
                  )}</span
                >
              </div>
              ${
                this.editingSpouse && !this.locked
                  ? html`<form
                      class="tax-form inline"
                      @submit=${(e: Event) => this.saveSpouse(e)}
                    >
                      <label
                        >Taxable Income $
                        <input
                          name="spouse_income"
                          type="text"
                          inputmode="decimal"
                          .value=${grouped(s.spouse_income ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                      /></label>
                      <label
                        >Fringe benefits $
                        <input
                          name="fringe_benefits"
                          type="text"
                          inputmode="decimal"
                          .value=${grouped(s.fringe_benefits ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                      /></label>
                      <label
                        >Super sacrifices $
                        <input
                          name="super_amount"
                          type="text"
                          inputmode="decimal"
                          .value=${grouped(s.super_amount ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                      /></label>
                      <label
                        >Children
                        <input
                          name="children_count"
                          type="number"
                          min="0"
                          value=${String(s.children_count ?? 0)}
                      /></label>
                      <div class="form-actions">
                        <button class="btn-primary" type="submit">Save</button>
                        <button
                          class="ghost"
                          type="button"
                          @click=${() => {
                            this.editingSpouse = false;
                            (this as any).requestUpdate();
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>`
                  : ''
              }
            </div>
            <div
              class="section span result-card"
              style="order:${this.orderOf('result')}"
            >
              <div class="section-header">
                <h3 class="section-title">Est. Tax Return</h3>
                <select
                  class="year-badge"
                  .value=${this.yearKey}
                  @change=${(e: Event) => {
                    this.yearKey = (e.target as HTMLSelectElement).value;
                    void this.load();
                  }}
                >
                  ${this.years.map((y) => html`<option value=${y.year_key}>${y.year_key}${y.is_locked ? ' (locked)' : ''}</option>`)}
                </select>
              </div>
              <div class="result-card-body">
                <div class="result-kpis">
                  <div class="kpi">
                    <div class="kpi-label">Taxable Income</div>
                    <div class="kpi-value">${aud(t.taxable)}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Withheld</div>
                    <div class="kpi-value">${aud(t.withheld)}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Tax rate</div>
                    <div class="kpi-value">
                      ${
                        t.taxable > 0
                          ? `${((b.tax / t.taxable) * 100).toFixed(1)}%`
                          : '0.0%'
                      }
                    </div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Tax</div>
                    <div class="kpi-value">${aud(b.tax)}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Medicare levy</div>
                    <div class="kpi-value">${aud(b.medicare)}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Medicare levy surcharge</div>
                    <div class="kpi-value">${aud(b.mls)}</div>
                  </div>
                </div>
                <div class="hero ${b.result >= 0 ? 'refund' : 'owed'}">
                  <div class="hero-value">${aud(Math.abs(b.result))}</div>
                  <div class="hero-caption">
                    ${b.result >= 0 ? 'Refund' : 'Amount owed'}
                  </div>
                </div>
              </div>
            </div>
            <div class="section" style="order:${this.orderOf('forecast')}">
              <div class="section-header">
                <h3 class="section-title">Forecast</h3>
                ${
                  Number(this.payYtd?.count ?? 0) > 0
                    ? html`<span class="pill open" title="Live salary data">
                        Live · ${this.payYtd?.count}
                      </span>`
                    : html`<span class="pill" title="No live salary data">
                        No live
                      </span>`
                }
                <label class="switch" title="Show/hide forecast">
                  <input
                    type="checkbox"
                    ?checked=${this.showForecast}
                    @change=${(e: Event) => {
                      this.showForecast = (
                        e.target as HTMLInputElement
                      ).checked;
                      (this as any).requestUpdate();
                    }}
                  />
                  <span class="slider"></span>
                </label>
              </div>
              ${
                this.showForecast
                  ? html` <div class="tax-row">
                        <span>Full-year income</span
                        ><span class="num">${aud(f.fullYearIncome)}</span>
                      </div>
                      <div class="tax-row">
                        <span>Full-year withheld</span
                        ><span class="num">${aud(f.fullYearWithheld)}</span>
                      </div>
                      <div class="tax-row">
                        <span>Full-year taxable</span
                        ><span class="num">${aud(f.fullYearTaxable)}</span>
                      </div>
                      <div class="tax-row">
                        <span>Est. full-year bill</span
                        ><span class="num">${aud(f.billTotal)}</span>
                      </div>
                      <div
                        class="tax-row total ${
                          f.estReturn >= 0
                            ? 'return-positive'
                            : 'return-negative'
                        }"
                      >
                        <span>Est. full-year return</span
                        ><span class="num">${aud(f.estReturn)}</span>
                      </div>`
                  : ''
              }
            </div>
            <div class="section" style="order:${this.orderOf('planner')}">
              <div class="section-header">
                <h3 class="section-title">Super top-up planner</h3>
                <label class="switch" title="Show/hide planner">
                  <input
                    type="checkbox"
                    ?checked=${this.showSuper}
                    @change=${(e: Event) => {
                      this.showSuper = (e.target as HTMLInputElement).checked;
                      (this as any).requestUpdate();
                    }}
                  />
                  <span class="slider"></span>
                </label>
              </div>
              ${
                this.showSuper
                  ? html` <div class="tax-row">
                        <span>Tax Bill without super</span
                        ><span class="num">${aud(currentBill)}</span>
                      </div>
                      <div class="tax-row">
                        <span>Est. Tax Bill with personal super</span
                        ><span class="num">${aud(estimatedBill.total)}</span>
                      </div>
                      <div
                        class="tax-row total ${
                          estimatedReturn >= 0
                            ? 'return-positive'
                            : 'return-negative'
                        }"
                      >
                        <span>Est. Tax Return</span
                        ><span class="num">${aud(estimatedReturn)}</span>
                      </div>`
                  : ''
              }
            </div>
            <tax-reorder-modal id="reorder"></tax-reorder-modal>
          </div>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('tax-summary-view')
) {
  customElements.define(
    'tax-summary-view',
    TaxSummaryView as unknown as CustomElementConstructor,
  );
}
