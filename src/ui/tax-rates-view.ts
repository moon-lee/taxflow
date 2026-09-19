import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taxStyles } from '../styles/taxflow-styles.js';
import { listYears } from '../dao/years.js';
import { getRates, type RateKind } from '../dao/rates.js';
import { grouped, rawNumber } from '../utils/format.js';
import { aud } from '../utils/format.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

interface RateRowView {
  id: number;
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
    is_locked: boolean;
  }> = [];
  rates: RateRowView[] = [];
  editingBracketId: number | null = null;
  editingMlsId: number | null = null;
  editingLinkId: number | null = null;
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

  private saveBracket(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const toRaw = String(fd.get('to') ?? '').trim();
    const patch = {
      limit_from: rawNumber(fd.get('from') as string),
      limit_to: toRaw === '' ? null : rawNumber(fd.get('to') as string),
      base_amount: rawNumber(fd.get('base') as string),
      rate: this.num(fd.get('rate')),
    };
    if (this.editingBracketId !== null) {
      this.emit('rates-save', { id: this.editingBracketId, patch });
      this.editingBracketId = null;
    } else {
      this.emit('rates-save', {
        input: {
          year_key: this.yearKey,
          kind: 'bracket',
          ...patch,
          label: null,
        },
      });
      (e.target as HTMLFormElement).reset();
    }
  }

  private editBracket(r: RateRowView): void {
    if (this.locked) return;
    this.editingBracketId = r.id;
    (this as any).requestUpdate?.();
  }

  private editMls(r: RateRowView): void {
    if (this.locked) return;
    this.editingMlsId = r.id;
    (this as any).requestUpdate?.();
  }

  private saveMedicare(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const medicare = this.ofKind('medicare')[0];
    if (medicare) {
      this.emit('rates-save', {
        id: medicare.id,
        patch: {
          limit_from: 0,
          limit_to: null,
          base_amount: 0,
          rate: this.num(fd.get('rate')),
        },
      });
    } else {
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
  }

  private saveMls(kind: RateKind, e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const toRaw = String(fd.get('to') ?? '').trim();
    if (this.editingMlsId !== null) {
      this.emit('rates-save', {
        id: this.editingMlsId,
        patch: {
          limit_from: rawNumber(fd.get('from') as string),
          limit_to: toRaw === '' ? null : rawNumber(fd.get('to') as string),
          rate: this.num(fd.get('rate')),
        },
      });
      this.editingMlsId = null;
    } else {
      this.emit('rates-save', {
        input: {
          year_key: this.yearKey,
          kind,
          limit_from: rawNumber(fd.get('from') as string),
          limit_to: toRaw === '' ? null : rawNumber(fd.get('to') as string),
          base_amount: 0,
          rate: this.num(fd.get('rate')),
          label: null,
        },
      });
      (e.target as HTMLFormElement).reset();
    }
  }

  private saveLink(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const url = String(fd.get('url') ?? '').trim();
    if (!url) return;
    if (this.editingLinkId !== null) {
      this.emit('rates-save', {
        id: this.editingLinkId,
        patch: {
          limit_from: 0,
          limit_to: null,
          base_amount: 0,
          rate: 0,
          label: url,
        },
      });
      this.editingLinkId = null;
    } else {
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
  }

  private editLink(r: RateRowView): void {
    if (this.locked) return;
    this.editingLinkId = r.id;
    (this as any).requestUpdate?.();
  }

  private copyYear(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const yearKey = String(fd.get('year_key') ?? '').trim();
    if (!yearKey) return;
    this.emit('year-copy', {
      input: {
        year_key: yearKey,
      },
      fromYear: this.yearKey,
    });
    (e.target as HTMLFormElement).reset();
  }

  private toggleLock(): void {
    this.emit('year-lock', { yearKey: this.yearKey, locked: this.locked });
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
      </div>
      <div class="view-container">
        <div class="view-container-inner cards">
          ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
          ${this.locked ? html`<p>Locked — unlock to edit rates.</p>` : ''}
          <div class="section span">
            <div class="section-header">
              <h3 class="section-title">Years</h3>
              <div class="header-controls">
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
                <button
                  class="filter-btn ${this.locked ? 'locked' : ''}"
                  @click=${() => this.toggleLock()}
                >
                  ${this.locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            </div>
            ${this.years.map((y) => html`<div class="tax-row"><span>${y.year_key}</span><span class="pill ${y.is_locked ? 'locked' : 'open'}">${y.is_locked ? 'locked' : 'open'}</span></div>`)}
            ${
              this.locked
                ? ''
                : html`<form
                    class="tax-form"
                    @submit=${(e: Event) => this.copyYear(e)}
                  >
                    <label
                      >New year
                      <input name="year_key" placeholder="2027-2028" required
                    /></label>
                    <button class="btn-primary" type="submit">
                      Copy ${this.yearKey} rates to new year
                    </button>
                  </form>`
            }
          </div>
          <div class="section span">
            <div class="section-header">
              <h3 class="section-title">Tax brackets</h3>
            </div>
            <div class="table-wrap">
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th class="num">Rate</th>
                    <th class="num">Base</th>
                  </tr>
                </thead>
                <tbody>
                  ${brackets.map(
                    (r) =>
                      html`<tr
                        class=${this.locked ? '' : 'clickable'}
                        @click=${() => this.editBracket(r)}
                      >
                        <td>${aud(r.limit_from)}</td>
                        <td>${r.limit_to === null ? '∞' : aud(r.limit_to)}</td>
                        <td class="num">
                          ${(Number(r.rate) * 100).toFixed(1)}%
                        </td>
                        <td class="num">${aud(r.base_amount)}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>
            ${(() => {
              if (this.locked) return '';
              const editRow =
                brackets.find((r) => r.id === this.editingBracketId) ?? null;
              return html`<form
                class="tax-form"
                @submit=${(e: Event) => this.saveBracket(e)}
              >
                <label
                  >From
                  <input
                    name="from"
                    type="text"
                    inputmode="decimal"
                    .value=${grouped(editRow?.limit_from ?? 0)}
                    @focus=${(e: Event) => this.moneyFocus(e)}
                    @blur=${(e: Event) => this.moneyBlur(e)}
                    required
                /></label>
                <label
                  >To (blank = no top)
                  <input
                    name="to"
                    type="text"
                    inputmode="decimal"
                    .value=${editRow?.limit_to === null || editRow?.limit_to === undefined ? '' : grouped(editRow.limit_to)}
                    @focus=${(e: Event) => this.moneyFocus(e)}
                    @blur=${(e: Event) => this.moneyBlur(e)}
                /></label>
                <label
                  >Base
                  <input
                    name="base"
                    type="text"
                    inputmode="decimal"
                    .value=${grouped(editRow?.base_amount ?? 0)}
                    @focus=${(e: Event) => this.moneyFocus(e)}
                    @blur=${(e: Event) => this.moneyBlur(e)}
                    required
                /></label>
                <label
                  >Rate (0.3 = 30%)
                  <input
                    name="rate"
                    type="number"
                    min="0"
                    step="0.001"
                    .value=${editRow ? String(editRow.rate) : ''}
                    required
                /></label>
                <div class="form-actions">
                  <button class="btn-primary" type="submit">
                    ${editRow ? 'Save bracket' : 'Add bracket'}
                  </button>
                  ${
                    editRow
                      ? html`<button
                          class="ghost"
                          type="button"
                          @click=${() => {
                            this.editingBracketId = null;
                            (this as any).requestUpdate?.();
                          }}
                        >
                          Cancel
                        </button>`
                      : ''
                  }
                </div>
              </form>`;
            })()}
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">MLS tiers (single)</h3>
            </div>
            <div class="table-wrap">
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th class="num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${mlsSingle.map(
                    (r) =>
                      html`<tr
                        class=${this.locked ? '' : 'clickable'}
                        @click=${() => this.editMls(r)}
                      >
                        <td>${aud(r.limit_from)}</td>
                        <td>${r.limit_to === null ? '∞' : aud(r.limit_to)}</td>
                        <td class="num">
                          ${(Number(r.rate) * 100).toFixed(2)}%
                        </td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>
            ${
              this.locked
                ? ''
                : (() => {
                    const editRow =
                      mlsSingle.find((r) => r.id === this.editingMlsId) ?? null;
                    return html`<form
                      class="tax-form"
                      @submit=${(e: Event) => this.saveMls('mls-single', e)}
                    >
                      <label
                        >From
                        <input
                          name="from"
                          type="text"
                          inputmode="decimal"
                          .value=${grouped(editRow?.limit_from ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                          required
                      /></label>
                      <label
                        >To (blank = no top)
                        <input
                          name="to"
                          type="text"
                          inputmode="decimal"
                          .value=${editRow?.limit_to === null || editRow?.limit_to === undefined ? '' : grouped(editRow.limit_to)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                      /></label>
                      <label
                        >Rate
                        <input
                          name="rate"
                          type="number"
                          min="0"
                          step="0.0001"
                          .value=${editRow ? String(editRow.rate) : ''}
                          required
                      /></label>
                      <div class="form-actions">
                        <button class="btn-primary" type="submit">
                          ${editRow ? 'Save tier' : 'Add single tier'}
                        </button>
                        ${
                          editRow
                            ? html`<button
                                class="ghost"
                                type="button"
                                @click=${() => {
                                  this.editingMlsId = null;
                                  (this as any).requestUpdate?.();
                                }}
                              >
                                Cancel
                              </button>`
                            : ''
                        }
                      </div>
                    </form>`;
                  })()
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">MLS tiers (family)</h3>
            </div>
            <div class="table-wrap">
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th class="num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${mlsFamily.map(
                    (r) =>
                      html`<tr
                        class=${this.locked ? '' : 'clickable'}
                        @click=${() => this.editMls(r)}
                      >
                        <td>${aud(r.limit_from)}</td>
                        <td>${r.limit_to === null ? '∞' : aud(r.limit_to)}</td>
                        <td class="num">
                          ${(Number(r.rate) * 100).toFixed(2)}%
                        </td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>
            ${
              this.locked
                ? ''
                : (() => {
                    const editRow =
                      mlsFamily.find((r) => r.id === this.editingMlsId) ?? null;
                    return html`<form
                      class="tax-form"
                      @submit=${(e: Event) => this.saveMls('mls-family', e)}
                    >
                      <label
                        >From
                        <input
                          name="from"
                          type="text"
                          inputmode="decimal"
                          .value=${grouped(editRow?.limit_from ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                          required
                      /></label>
                      <label
                        >To (blank = no top)
                        <input
                          name="to"
                          type="text"
                          inputmode="decimal"
                          .value=${editRow?.limit_to === null || editRow?.limit_to === undefined ? '' : grouped(editRow.limit_to)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                      /></label>
                      <label
                        >Rate
                        <input
                          name="rate"
                          type="number"
                          min="0"
                          step="0.0001"
                          .value=${editRow ? String(editRow.rate) : ''}
                          required
                      /></label>
                      <div class="form-actions">
                        <button class="btn-primary" type="submit">
                          ${editRow ? 'Save tier' : 'Add family tier'}
                        </button>
                        ${
                          editRow
                            ? html`<button
                                class="ghost"
                                type="button"
                                @click=${() => {
                                  this.editingMlsId = null;
                                  (this as any).requestUpdate?.();
                                }}
                              >
                                Cancel
                              </button>`
                            : ''
                        }
                      </div>
                    </form>`;
                  })()
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Medicare levy</h3>
            </div>
            ${
              this.locked
                ? html`<div class="tax-row">
                    <span>Flat rate</span
                    ><span class="num"
                      >${(Number(medicare?.rate ?? 0.02) * 100).toFixed(1)}%</span
                    >
                  </div>`
                : html`<form
                    class="tax-form inline single"
                    @submit=${(e: Event) => this.saveMedicare(e)}
                  >
                    <label
                      >Rate (0.02 = 2%)
                      <input
                        name="rate"
                        type="number"
                        min="0"
                        step="0.001"
                        .value=${String(medicare?.rate ?? '0.02')}
                        required
                    /></label>
                    <button class="btn-primary" type="submit">Save</button>
                  </form>`
            }
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Reference links</h3>
            </div>
            ${links.map(
              (r) =>
                html`<div
                  class="tax-row ${this.locked ? '' : 'clickable'}"
                  @click=${() => {
                    if (this.locked) return;
                    this.editLink(r);
                  }}
                >
                  <span>${r.label}</span>
                  <button
                    class="icon-btn"
                    type="button"
                    title="Open in browser"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined' && r.label)
                        window.open(r.label, '_blank', 'noopener');
                    }}
                  >
                    Open
                  </button>
                </div>`,
            )}
            ${
              this.locked
                ? ''
                : (() => {
                    const editRow =
                      links.find((r) => r.id === this.editingLinkId) ?? null;
                    return html`<form
                      class="tax-form inline single"
                      @submit=${(e: Event) => this.saveLink(e)}
                    >
                      <label
                        >URL
                        <input
                          name="url"
                          type="url"
                          placeholder="https://…"
                          .value=${editRow ? String(editRow.label ?? '') : ''}
                          required
                      /></label>
                      <div class="form-actions">
                        <button class="btn-primary" type="submit">
                          ${editRow ? 'Save link' : 'Add link'}
                        </button>
                        ${
                          editRow
                            ? html`<button
                                class="ghost"
                                type="button"
                                @click=${() => {
                                  this.editingLinkId = null;
                                  (this as any).requestUpdate?.();
                                }}
                              >
                                Cancel
                              </button>`
                            : ''
                        }
                      </div>
                    </form>`;
                  })()
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
