import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { ExtensionLogger } from 'finance-logger';
import { upsertEntry } from '../dao/entries.js';
import { saveSpouse } from '../dao/spouse.js';
import { saveRate, copyRates } from '../dao/rates.js';
import { createItemType, setItemActive } from '../dao/items.js';
import { lockYear, unlockYear } from '../dao/years.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);
const logger = new ExtensionLogger('taxflow');

export type TaxTag = 'tax-summary' | 'tax-rates' | 'tax-items';

export class TaxOrchestrator extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            #child {
              flex: 1;
              min-height: 0;
              display: block;
              overflow: hidden;
            }
          `,
        ] as any)
      : [];
  finance: any = null;
  view: TaxTag = 'tax-summary';
  mountData: Record<string, unknown> = {};
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.pushFinance();
  }

  async init(f: any, mount: Record<string, unknown> = {}): Promise<void> {
    this.finance = f;
    this.mountData = mount;
    const v = (mount.view ?? mount.viewId) as string | undefined;
    this.view =
      v === 'tax-rates'
        ? 'tax-rates'
        : v === 'tax-items'
          ? 'tax-items'
          : 'tax-summary';
    await this.pushFinance();
  }

  navigate(tag: TaxTag): void {
    this.view = tag;
    (this as any).requestUpdate?.();
    void this.pushFinance();
  }

  private child(): any {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    return root?.querySelector('#child');
  }

  private async pushFinance(): Promise<void> {
    (this as any).requestUpdate?.();
    await Promise.resolve();
    const c = this.child() as any;
    if (c && this.finance) {
      Object.assign(c, this.mountData);
      c.finance = this.finance;
    }
    if (c && typeof c.setFinance === 'function') {
      try {
        await c.setFinance(this.finance);
      } catch (e: any) {
        this.error = String(e?.message || e);
      }
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const guard =
      (fn: (detail: any) => Promise<void>) =>
      async (e: Event): Promise<void> => {
        try {
          await fn((e as CustomEvent).detail ?? {});
          await this.pushFinance();
        } catch (err: any) {
          this.error = String(err?.message || err);
          logger.error('handler failed', err);
          (this as any).requestUpdate?.();
        }
      };
    this.addEventListener(
      'income-save',
      guard(async (d) => {
        await upsertEntry(this.finance, { kind: 'income', ...d.input });
      }),
    );
    this.addEventListener(
      'deduction-save',
      guard(async (d) => {
        await upsertEntry(this.finance, { kind: 'deduction', ...d.input });
      }),
    );
    this.addEventListener(
      'spouse-save',
      guard(async (d) => {
        await saveSpouse(this.finance, d.input);
      }),
    );
    this.addEventListener(
      'rates-save',
      guard(async (d) => {
        await saveRate(this.finance, d.input);
      }),
    );
    this.addEventListener(
      'year-copy',
      guard(async (d) => {
        const { createYear } = await import('../dao/years.js');
        await createYear(this.finance, d.input);
        await copyRates(this.finance, d.fromYear, d.input.year_key);
      }),
    );
    this.addEventListener(
      'year-lock',
      guard(async (d) => {
        if (d.locked) await unlockYear(this.finance, d.yearKey);
        else await lockYear(this.finance, d.yearKey);
      }),
    );
    this.addEventListener(
      'item-create',
      guard(async (d) => {
        await createItemType(this.finance, d.input);
      }),
    );
    this.addEventListener(
      'item-deactivate',
      guard(async (d) => {
        await setItemActive(this.finance, d.itemKey, false);
      }),
    );
    this.addEventListener(
      'card-order-change',
      guard(async (d) => {
        await this.finance.settings.set('taxflow.cardOrder', d.order);
      }),
    );
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      ${
        this.error
          ? html`<div class="view-container">
              <div class="view-container-inner">
                <p class="field-error">Error: ${this.error}</p>
              </div>
            </div>`
          : ''
      }
      ${this.view === 'tax-summary' ? html`<tax-summary-view id="child"></tax-summary-view>` : ''}
      ${this.view === 'tax-rates' ? html`<tax-rates-view id="child"></tax-rates-view>` : ''}
      ${this.view === 'tax-items' ? html`<tax-items-view id="child"></tax-items-view>` : ''}
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('tax-orchestrator')
) {
  customElements.define(
    'tax-orchestrator',
    TaxOrchestrator as unknown as CustomElementConstructor,
  );
}
