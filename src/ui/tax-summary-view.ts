import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taxStyles } from '../styles/taxflow-styles.js';
import { listYears } from '../dao/years.js';
import { getRates } from '../dao/rates.js';
import { listItemTypes, type ItemTypeRow } from '../dao/items.js';
import { listIncome } from '../dao/income.js';
import { listDeductions } from '../dao/deductions.js';
import { getSpouse } from '../dao/spouse.js';
import {
  taxOnIncome,
  medicareLevy,
  mlsAmount,
  refund,
  forecastFullYear,
  superTopUp,
  shiftFamilyTiers,
  deductionClaim,
} from '../services/tax-service.js';
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
  payYtd: { gross: number; withheld: number } | null = null;
  topUp = 0;
  weeksElapsed = 9;
  editingDeductionId: number | null = null;
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
      const [income, deductions, spouse, rates, incomeTypes, deductionTypes] =
        await Promise.all([
          listIncome(this.finance, this.yearKey),
          listDeductions(this.finance, this.yearKey),
          getSpouse(this.finance, this.yearKey),
          getRates(this.finance, this.yearKey),
          listItemTypes(this.finance, 'income'),
          listItemTypes(this.finance, 'deduction'),
        ]);
      this.income = income as Array<{
        item_key: string;
        amount: number;
        withheld: number;
      }>;
      this.deductions = deductions as Array<{
        id: number;
        item_key: string;
        label: string;
        cost: number;
        work_percent: number;
      }>;
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
      try {
        const ytd = (await this.finance.services?.invoke(
          'pay',
          'getYearToDateSummary',
          {},
        )) as { gross: number; withheld: number } | null;
        this.payYtd =
          ytd && Number.isFinite(Number(ytd.gross))
            ? { gross: Number(ytd.gross), withheld: Number(ytd.withheld ?? 0) }
            : null;
      } catch {
        this.payYtd = null;
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

  private bill(): {
    tax: number;
    medicare: number;
    mls: number;
    total: number;
    result: number;
  } {
    const t = this.totals();
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
    const tax = brackets.length > 0 ? taxOnIncome(t.taxable, brackets) : 0;
    const medicare = medicareLevy(t.taxable, medicareRate);
    const spouseIncome = Number(this.spouse?.spouse_income ?? 0);
    const fringe = Number(this.spouse?.fringe_benefits ?? 0);
    const invLoss = Number(this.spouse?.investment_losses ?? 0);
    const repSuper = Number(this.spouse?.reportable_super ?? 0);
    const mlsIncome = t.taxable + spouseIncome + fringe + invLoss + repSuper;
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

  private saveIncome(itemKey: string, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('income-save', {
      input: {
        year_key: this.yearKey,
        item_key: itemKey,
        amount: this.num(fd.get('amount')),
        withheld: this.num(fd.get('withheld')),
      },
    });
  }

  private createDeduction(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('deduction-create', {
      input: {
        year_key: this.yearKey,
        item_key: String(fd.get('item_key') ?? 'work'),
        label: String(fd.get('label') ?? '').trim(),
        cost: this.num(fd.get('cost')),
        work_percent: this.num(fd.get('work_percent'), 100),
      },
    });
    (e.target as HTMLFormElement).reset();
  }

  private editDeduction(id: number, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('deduction-edit', {
      id,
      patch: {
        label: String(fd.get('label') ?? '').trim(),
        cost: this.num(fd.get('cost')),
        work_percent: this.num(fd.get('work_percent'), 100),
      },
    });
    this.editingDeductionId = null;
  }

  private deleteDeduction(id: number): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this deduction?')
    )
      return;
    this.emit('deduction-delete', { id });
  }

  private saveSpouse(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('spouse-save', {
      input: {
        year_key: this.yearKey,
        spouse_income: this.num(fd.get('spouse_income')),
        fringe_benefits: this.num(fd.get('fringe_benefits')),
        super_amount: this.num(fd.get('super_amount')),
        investment_losses: this.num(fd.get('investment_losses')),
        reportable_super: this.num(fd.get('reportable_super')),
        has_cover: fd.get('has_cover') === 'on',
        covered_days: Math.min(
          366,
          Math.max(0, Math.round(this.num(fd.get('covered_days'), 365))),
        ),
        children_count: Math.max(
          0,
          Math.round(this.num(fd.get('children_count'))),
        ),
      },
    });
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
    const plan = superTopUp(
      t.taxable,
      this.topUp,
      brackets.length > 0
        ? brackets
        : [{ from: 0, to: null, base: 0, rate: 0 }],
      medicareRate,
    );
    const w = this.wages();
    const s = this.spouse ?? {};
    return html`
      <div class="topbar">
        <span class="crumb-current">Tax Summary</span>
        <div class="spacer"></div>
        <button class="filter-btn" @click=${() => this.openReorder()}>
          Reorder
        </button>
        <button
          class="filter-btn"
          @click=${() => {
            void this.finance?.ui?.requestMount('taxflow', {
              view: 'tax-items',
            });
          }}
        >
          Item Types
        </button>
        <select
          .value=${this.yearKey}
          @change=${(e: Event) => {
            this.yearKey = (e.target as HTMLSelectElement).value;
            void this.load();
          }}
        >
          ${this.years.map((y) => html`<option value=${y.year_key}>${y.year_key}${y.is_locked ? ' (locked)' : ''}</option>`)}
        </select>
      </div>
      <div class="view-container">
        <div class="view-container-inner cards">
          ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
          ${this.locked ? html`<p>Locked — figures are read-only.</p>` : ''}
          <div class="section" style="order:${this.orderOf('income')}">
            <div class="section-header">
              <h3 class="section-title">Income</h3>
            </div>
            <div class="tax-row">
              <span>Wages ${this.payYtd ? '(from Salary)' : '(typed)'}</span
              ><span class="num">${w.amount.toFixed(2)}</span>
            </div>
            ${this.income.filter((r) => r.item_key !== 'wages').map((r) => html`<div class="tax-row"><span>${this.labels[r.item_key] ?? r.item_key}</span><span class="num">${Number(r.amount).toFixed(2)}</span></div>`)}
            <div class="tax-row total">
              <span>Total income</span
              ><span class="num">${t.income.toFixed(2)}</span>
            </div>
            ${
              this.locked
                ? ''
                : this.incomeTypes.map((it) => {
                    const row = this.income.find(
                      (r) => r.item_key === it.item_key,
                    );
                    return html`<form
                      class="tax-form"
                      @submit=${(e: Event) => this.saveIncome(it.item_key, e)}
                    >
                      <label
                        >${it.label} $
                        <input
                          name="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value=${String(row?.amount ?? 0)}
                      /></label>
                      <label
                        >Withheld $
                        <input
                          name="withheld"
                          type="number"
                          min="0"
                          step="0.01"
                          value=${String(row?.withheld ?? 0)}
                      /></label>
                      <button class="btn-primary" type="submit">Save</button>
                    </form>`;
                  })
            }
          </div>
          <div class="section" style="order:${this.orderOf('deductions')}">
            <div class="section-header">
              <h3 class="section-title">Deductions</h3>
            </div>
            ${this.deductions.map(
              (r) =>
                html`<div class="tax-row">
                    <span>${r.label} (${r.work_percent}%)</span
                    ><span class="num"
                      >${deductionClaim(Number(r.cost), Number(r.work_percent)).toFixed(2)}</span
                    >
                  </div>
                  ${
                    this.locked
                      ? ''
                      : this.editingDeductionId === r.id
                        ? html`<form
                            class="tax-form"
                            @submit=${(e: Event) => this.editDeduction(r.id, e)}
                          >
                            <label
                              >Label
                              <input name="label" value=${r.label} required
                            /></label>
                            <label
                              >Cost $
                              <input
                                name="cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value=${String(r.cost)}
                                required
                            /></label>
                            <label
                              >Work %
                              <input
                                name="work_percent"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value=${String(r.work_percent)}
                                required
                            /></label>
                            <button class="btn-primary" type="submit">
                              Save
                            </button>
                            <button
                              class="ghost"
                              type="button"
                              @click=${() => {
                                this.editingDeductionId = null;
                                (this as any).requestUpdate();
                              }}
                            >
                              Cancel
                            </button>
                          </form>`
                        : html`<button
                              class="ghost"
                              @click=${() => {
                                this.editingDeductionId = r.id;
                                (this as any).requestUpdate();
                              }}
                            >
                              Edit
                            </button>
                            <button
                              class="ghost"
                              @click=${() => this.deleteDeduction(r.id)}
                            >
                              Delete
                            </button>`
                  }`,
            )}
            <div class="tax-row total">
              <span>Total deductions</span
              ><span class="num">${t.deductions.toFixed(2)}</span>
            </div>
            ${
              this.locked
                ? ''
                : html`<form
                    class="tax-form"
                    @submit=${(e: Event) => this.createDeduction(e)}
                  >
                    <label
                      >Type
                      <select name="item_key">
                        ${this.deductionTypes.map((dt) => html`<option value=${dt.item_key}>${dt.label}</option>`)}
                      </select></label
                    >
                    <label
                      >Label
                      <input name="label" placeholder="Internet" required
                    /></label>
                    <label
                      >Cost $
                      <input
                        name="cost"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    /></label>
                    <label
                      >Work %
                      <input
                        name="work_percent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value="100"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Add deduction
                    </button>
                  </form>`
            }
          </div>
          <div class="section" style="order:${this.orderOf('spouse')}">
            <div class="section-header">
              <h3 class="section-title">Spouse</h3>
            </div>
            <div class="tax-row">
              <span>Reportable total</span
              ><span class="num"
                >${(Number(s.spouse_income ?? 0) + Number(s.fringe_benefits ?? 0) + Number(s.super_amount ?? 0)).toFixed(2)}</span
              >
            </div>
            ${
              this.locked
                ? ''
                : html`<form
                    class="tax-form"
                    @submit=${(e: Event) => this.saveSpouse(e)}
                  >
                    <label
                      >Income $
                      <input
                        name="spouse_income"
                        type="number"
                        min="0"
                        step="0.01"
                        value=${String(s.spouse_income ?? 0)}
                    /></label>
                    <label
                      >Fringe benefits $
                      <input
                        name="fringe_benefits"
                        type="number"
                        min="0"
                        step="0.01"
                        value=${String(s.fringe_benefits ?? 0)}
                    /></label>
                    <label
                      >Super $
                      <input
                        name="super_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value=${String(s.super_amount ?? 0)}
                    /></label>
                    <label
                      >Investment losses $
                      <input
                        name="investment_losses"
                        type="number"
                        min="0"
                        step="0.01"
                        value=${String(s.investment_losses ?? 0)}
                    /></label>
                    <label
                      >Reportable super $
                      <input
                        name="reportable_super"
                        type="number"
                        min="0"
                        step="0.01"
                        value=${String(s.reportable_super ?? 0)}
                    /></label>
                    <label class="check-row"
                      ><input
                        name="has_cover"
                        type="checkbox"
                        ?checked=${s.has_cover ?? true}
                      />
                      Hospital cover</label
                    >
                    <label
                      >Covered days
                      <input
                        name="covered_days"
                        type="number"
                        min="0"
                        max="366"
                        value=${String(s.covered_days ?? 365)}
                    /></label>
                    <label
                      >Children
                      <input
                        name="children_count"
                        type="number"
                        min="0"
                        value=${String(s.children_count ?? 0)}
                    /></label>
                    <button class="btn-primary" type="submit">
                      Save spouse
                    </button>
                  </form>`
            }
          </div>
          <div class="section" style="order:${this.orderOf('mls')}">
            <div class="section-header">
              <h3 class="section-title">Surcharge (MLS)</h3>
            </div>
            <div class="tax-row">
              <span>MLS amount</span
              ><span class="num">${b.mls.toFixed(2)}</span>
            </div>
          </div>
          <div class="section span" style="order:${this.orderOf('result')}">
            <div class="section-header">
              <h3 class="section-title">Result</h3>
            </div>
            <div class="kpi-row">
              <div class="kpi">
                <div class="kpi-label">Taxable</div>
                <div class="kpi-value">${t.taxable.toFixed(2)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Tax</div>
                <div class="kpi-value">${b.tax.toFixed(2)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Medicare</div>
                <div class="kpi-value">${b.medicare.toFixed(2)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Surcharge</div>
                <div class="kpi-value">${b.mls.toFixed(2)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Withheld</div>
                <div class="kpi-value">${t.withheld.toFixed(2)}</div>
              </div>
            </div>
            <div class="hero ${b.result >= 0 ? 'refund' : 'owed'}">
              <div class="hero-value">${Math.abs(b.result).toFixed(2)}</div>
              <div class="hero-caption">
                ${b.result >= 0 ? 'Refund' : 'Amount owed'}
              </div>
            </div>
          </div>
          <div class="section" style="order:${this.orderOf('forecast')}">
            <div class="section-header">
              <h3 class="section-title">Forecast (guess)</h3>
            </div>
            <label
              >Weeks so far
              <input
                type="number"
                min="1"
                max="52"
                .value=${String(this.weeksElapsed)}
                @input=${(e: Event) => {
                  this.weeksElapsed =
                    Number((e.target as HTMLInputElement).value) || 1;
                  (this as any).requestUpdate();
                }}
            /></label>
            <div class="tax-row">
              <span>Full-year income (avg x 52)</span
              ><span class="num"
                >${forecastFullYear(t.income / this.weeksElapsed).toFixed(2)}</span
              >
            </div>
          </div>
          <div class="section" style="order:${this.orderOf('planner')}">
            <div class="section-header">
              <h3 class="section-title">Super top-up planner</h3>
            </div>
            <label
              >Extra super $
              <input
                type="number"
                min="0"
                .value=${String(this.topUp)}
                @input=${(e: Event) => {
                  this.topUp =
                    Number((e.target as HTMLInputElement).value) || 0;
                  (this as any).requestUpdate();
                }}
            /></label>
            <div class="tax-row">
              <span>New bill</span
              ><span class="num">${plan.newBill.toFixed(2)}</span>
            </div>
            <div class="tax-row total">
              <span>Extra saving</span
              ><span class="num">${plan.saving.toFixed(2)}</span>
            </div>
          </div>
          <tax-reorder-modal id="reorder"></tax-reorder-modal>
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
