import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taxStyles } from '../styles/taxflow-styles.js';
import { listYears } from '../dao/years.js';
import { getRates, type RateKind } from '../dao/rates.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

interface RateRowView {
  kind: string;
  limit_from: number;
  limit_to: number | null;
  base_amount: number;
  rate: number;
  label: string | null;
}

export class TaxRatesView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([sharedStyles, taxStyles] as any)
      : [];
  finance: any = null;
  yearKey = '2026-2027';
  years: Array<{
    year_key: string;
    start_date: string;
    end_date: string;
    is_locked: boolean;
  }> = [];
  rates: RateRowView[] = [];
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.years = (await listYears(this.finance)) as Array<{
        year_key: string;
        start_date: string;
        end_date: string;
        is_locked: boolean;
      }>;
      if (
        this.years.length > 0 &&
        !this.years.some((y) => y.year_key === this.yearKey)
      ) {
        this.yearKey = this.years[this.years.length - 1].year_key;
      }
      this.rates = (await getRates(
        this.finance,
        this.yearKey,
      )) as RateRowView[];
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

  private ofKind(kind: RateKind): RateRowView[] {
    return this.rates.filter((r) => r.kind === kind);
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

  private saveBracket(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const toRaw = String(fd.get('to') ?? '').trim();
    this.emit('rates-save', {
      input: {
        year_key: this.yearKey,
        kind: 'bracket',
        limit_from: this.num(fd.get('from')),
        limit_to: toRaw === '' ? null : this.num(fd.get('to')),
        base_amount: this.num(fd.get('base')),
        rate: this.num(fd.get('rate')),
        label: null,
      },
    });
    (e.target as HTMLFormElement).reset();
  }

  private saveMedicare(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    this.emit('rates-save', {
      input: {
        year_key: this.yearKey,
        kind: 'medicare',
        limit_from: 0,
        limit_to: null,
        base_amount: 0,
        rate: this.num(fd.get('rate')),
        label: 'Flat rate (v1)',
      },
    });
  }

  private saveMls(kind: RateKind, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const toRaw = String(fd.get('to') ?? '').trim();
    this.emit('rates-save', {
      input: {
        year_key: this.yearKey,
        kind,
        limit_from: this.num(fd.get('from')),
        limit_to: toRaw === '' ? null : this.num(fd.get('to')),
        base_amount: 0,
        rate: this.num(fd.get('rate')),
        label: null,
      },
    });
    (e.target as HTMLFormElement).reset();
  }

  private saveLink(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const url = String(fd.get('url') ?? '').trim();
    if (!url) return;
    this.emit('rates-save', {
      input: {
        year_key: this.yearKey,
        kind: 'link',
        limit_from: 0,
        limit_to: null,
        base_amount: 0,
        rate: 0,
        label: url,
      },
    });
    (e.target as HTMLFormElement).reset();
  }

  private copyYear(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const yearKey = String(fd.get('year_key') ?? '').trim();
    if (!yearKey) return;
    this.emit('year-copy', {
      input: {
        year_key: yearKey,
        start_date: String(fd.get('start_date') ?? ''),
        end_date: String(fd.get('end_date') ?? ''),
      },
      fromYear: this.yearKey,
    });
    (e.target as HTMLFormElement).reset();
  }

  private toggleLock(): void {
    this.emit('year-lock', { yearKey: this.yearKey, locked: this.locked });
  }

  private money(n: number): string {
    return Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const brackets = this.ofKind('bracket');
    const medicare = this.ofKind('medicare')[0];
    const mlsSingle = this.ofKind('mls-single');
    const mlsFamily = this.ofKind('mls-family');
    const links = this.ofKind('link');
    return html`
      <div class="topbar">
        <span class="crumb-current">Tax Rates</span>
        <div class="spacer"></div>
        <select
          .value=${this.yearKey}
          @change=${(e: Event) => {
            this.yearKey = (e.target as HTMLSelectElement).value;
            void this.load();
          }}
        >
          ${this.years.map((y) => html`<option value=${y.year_key}>${y.year_key}${y.is_locked ? ' (locked)' : ''}</option>`)}
        </select>
        <button class="filter-btn" @click=${() => this.toggleLock()}>
          ${this.locked ? 'Unlock' : 'Lock'}
        </button>
      </div>
      <div class="view-container">
        <div class="view-container-inner">
          ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
          ${this.locked ? html`<p>Locked — unlock to edit rates.</p>` : ''}
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Years</h3>
            </div>
            ${this.years.map((y) => html`<div class="tax-row"><span>${y.year_key} (${y.start_date} – ${y.end_date})</span><span class="num">${y.is_locked ? 'locked' : 'open'}</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form @submit=${(e: Event) => this.copyYear(e)}>
                    <label
                      >New year
                      <input name="year_key" placeholder="2027-2028" required
                    /></label>
                    <label
                      >Start
                      <input
                        name="start_date"
                        type="date"
                        value="2027-07-01"
                        required
                    /></label>
                    <label
                      >End
                      <input
                        name="end_date"
                        type="date"
                        value="2028-06-30"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Copy ${this.yearKey} rates to new year
                    </button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Tax brackets</h3>
            </div>
            ${brackets.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)} @ ${(Number(r.rate) * 100).toFixed(1)}%</span><span class="num">base $${this.money(r.base_amount)}</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form @submit=${(e: Event) => this.saveBracket(e)}>
                    <label
                      >From <input name="from" type="number" min="0" required
                    /></label>
                    <label
                      >To (blank = no top)
                      <input name="to" type="number" min="0"
                    /></label>
                    <label
                      >Base <input name="base" type="number" min="0" required
                    /></label>
                    <label
                      >Rate (0.3 = 30%)
                      <input
                        name="rate"
                        type="number"
                        min="0"
                        step="0.001"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Add bracket
                    </button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Medicare levy</h3>
            </div>
            <div class="tax-row">
              <span>Flat rate</span
              ><span class="num"
                >${(Number(medicare?.rate ?? 0.02) * 100).toFixed(1)}%</span
              >
            </div>
            ${
              this.locked
                ? ''
                : html`<form @submit=${(e: Event) => this.saveMedicare(e)}>
                    <label
                      >Rate (0.02 = 2%)
                      <input
                        name="rate"
                        type="number"
                        min="0"
                        step="0.001"
                        value="0.02"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Save Medicare rate
                    </button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">MLS tiers (single)</h3>
            </div>
            ${mlsSingle.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</span><span class="num">${(Number(r.rate) * 100).toFixed(2)}%</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form
                    @submit=${(e: Event) => this.saveMls('mls-single', e)}
                  >
                    <label
                      >From <input name="from" type="number" min="0" required
                    /></label>
                    <label
                      >To (blank = no top)
                      <input name="to" type="number" min="0"
                    /></label>
                    <label
                      >Rate
                      <input
                        name="rate"
                        type="number"
                        min="0"
                        step="0.0001"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Add single tier
                    </button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">MLS tiers (family)</h3>
            </div>
            ${mlsFamily.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</span><span class="num">${(Number(r.rate) * 100).toFixed(2)}%</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form
                    @submit=${(e: Event) => this.saveMls('mls-family', e)}
                  >
                    <label
                      >From <input name="from" type="number" min="0" required
                    /></label>
                    <label
                      >To (blank = no top)
                      <input name="to" type="number" min="0"
                    /></label>
                    <label
                      >Rate
                      <input
                        name="rate"
                        type="number"
                        min="0"
                        step="0.0001"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Add family tier
                    </button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Reference links</h3>
            </div>
            ${links.map((r) => html`<div class="tax-row"><span>${r.label}</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form @submit=${(e: Event) => this.saveLink(e)}>
                    <label
                      >URL
                      <input
                        name="url"
                        type="url"
                        placeholder="https://…"
                        required
                    /></label>
                    <button class="btn-primary" type="submit">Add link</button>
                  </form>`
            }
          </div>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('tax-rates-view')
) {
  customElements.define(
    'tax-rates-view',
    TaxRatesView as unknown as CustomElementConstructor,
  );
}
