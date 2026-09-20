import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taxStyles } from '../styles/taxflow-styles.js';
import { listYears } from '../dao/years.js';
import {
  listItemTypes,
  type ItemGroup,
  type ItemTypeRow,
} from '../dao/items.js';
import { listEntries } from '../dao/entries.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export class TaxItemsView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([sharedStyles, taxStyles] as any)
      : [];
  finance: any = null;
  yearKey = '2026-2027';
  years: Array<{ year_key: string; is_locked: boolean }> = [];
  types: ItemTypeRow[] = [];
  incomeKeys: string[] = [];
  deductionKeys: string[] = [];
  error = '';
  showNewItemType = false;

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
      const [incomeTypes, deductionTypes, offsetTypes, entries] =
        await Promise.all([
          listItemTypes(this.finance, 'income'),
          listItemTypes(this.finance, 'deduction'),
          listItemTypes(this.finance, 'offset'),
          listEntries(this.finance, this.yearKey),
        ]);
      this.types = [
        ...(incomeTypes as ItemTypeRow[]),
        ...(deductionTypes as ItemTypeRow[]),
        ...(offsetTypes as ItemTypeRow[]),
      ];
      this.incomeKeys = (
        entries as Array<{ entry_kind: string; item_key: string }>
      )
        .filter((r) => r.entry_kind === 'income')
        .map((r) => r.item_key);
      this.deductionKeys = (
        entries as Array<{ entry_kind: string; item_key: string }>
      )
        .filter((r) => r.entry_kind === 'deduction')
        .map((r) => r.item_key);
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

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  private back(): void {
    this.emit('navigate-view', { view: 'tax-summary' });
    void this.finance?.ui?.requestMount('taxflow', { view: 'tax-summary' });
  }

  private itemInUse(itemKey: string): boolean {
    return (
      this.incomeKeys.includes(itemKey) || this.deductionKeys.includes(itemKey)
    );
  }

  private createItem(e: Event): void {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const label = String(fd.get('label') ?? '').trim();
    if (!label) return;
    const itemKey =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
    this.emit('item-create', {
      input: {
        item_key: itemKey,
        label,
        item_group: String(fd.get('item_group') ?? 'income'),
        sort_order: this.types.length + 1,
      },
    });
    (e.target as HTMLFormElement).reset();
    this.showNewItemType = false;
    (this as any).requestUpdate?.();
  }

  private toggleNewItemType(): void {
    this.showNewItemType = !this.showNewItemType;
    if (!this.showNewItemType) {
      const form = this.renderRoot?.querySelector(
        '.tax-form',
      ) as HTMLFormElement | null;
      form?.reset();
    }
    (this as any).requestUpdate?.();
  }

  private cancelNewItemType(): void {
    this.showNewItemType = false;
    (this as any).requestUpdate?.();
  }

  private deactivateItem(itemKey: string): void {
    this.emit('item-deactivate', { itemKey });
  }

  private renderGroup(group: ItemGroup, title: string): unknown {
    const cls = group === 'income' ? 'section income-full' : 'section';
    return html`<div class=${cls}>
      <div class="section-header">
        <h3 class="section-title">${title} types</h3>
      </div>
      ${this.types
        .filter((it) => it.item_group === group)
        .map(
          (it) =>
            html`<div class="tax-row">
              <span>${it.label}</span>
              <span
                >${
                  this.itemInUse(it.item_key)
                    ? html`<span class="num">in use</span>`
                    : this.locked
                      ? ''
                      : html`<button
                          class="ghost"
                          @click=${() => this.deactivateItem(it.item_key)}
                        >
                          Deactivate
                        </button>`
                }</span
              >
            </div>`,
        )}
    </div>`;
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      <div class="view-scroll">
        <div class="topbar">
          <span class="crumb-current">Item Types</span>
          <div class="spacer"></div>
          <button class="filter-btn" @click=${() => this.toggleNewItemType()}>
            New Item Type
          </button>
          <button class="filter-btn" @click=${() => this.back()}>Back</button>
        </div>
        <div class="view-container">
          <div class="view-container-inner cards">
            ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
            ${this.renderGroup('income', 'Income')}
            ${this.renderGroup('deduction', 'Deduction')}
            ${this.renderGroup('offset', 'Offset')}
            ${
              this.showNewItemType
                ? html`<div class="section span">
                    <div class="section-header">
                      <h3 class="section-title">New item type</h3>
                    </div>
                    ${
                      this.locked
                        ? html`<p>
                            Locked — unlock ${this.yearKey} to add item types.
                          </p>`
                        : html`<form
                            class="tax-form"
                            @submit=${(e: Event) => this.createItem(e)}
                          >
                            <label
                              >Label<input
                                name="label"
                                placeholder="Bank fees"
                                required
                            /></label>
                            <label
                              >Group
                              <select name="item_group">
                                <option value="income">income</option>
                                <option value="deduction">deduction</option>
                                <option value="offset">offset</option>
                              </select></label
                            >
                            <div class="form-actions">
                              <button class="btn-primary" type="submit">
                                Save
                              </button>
                              <button
                                class="ghost"
                                type="button"
                                @click=${() => this.cancelNewItemType()}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>`
                    }
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('tax-items-view')
) {
  customElements.define(
    'tax-items-view',
    TaxItemsView as unknown as CustomElementConstructor,
  );
}
