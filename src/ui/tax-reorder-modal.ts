import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export const CANONICAL_CARD_ORDER = [
  'income',
  'deductions',
  'spouse',
  'mls',
  'result',
  'forecast',
  'planner',
];

export const CARD_LABELS: Record<string, string> = {
  income: 'Income',
  deductions: 'Deductions',
  spouse: 'Spouse',
  mls: 'Surcharge (MLS)',
  result: 'Result',
  forecast: 'Forecast (guess)',
  planner: 'Super top-up planner',
};

export class TaxReorderModal extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined' ? ([sharedStyles] as any) : [];
  open = false;
  order: string[] = [...CANONICAL_CARD_ORDER];

  private move(ix: number, dir: -1 | 1): void {
    const j = ix + dir;
    if (j < 0 || j >= this.order.length) return;
    const next = this.order.slice();
    const tmp = next[ix];
    next[ix] = next[j];
    next[j] = tmp;
    this.order = next;
    (this as any).requestUpdate?.();
  }

  private save(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('card-order-change', {
        detail: { order: this.order.slice() },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private reset(): void {
    this.order = [...CANONICAL_CARD_ORDER];
    (this as any).requestUpdate?.();
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined' || !this.open) return html``;
    return html`
      <div class="modal">
        <div class="modal-inner">
          <h3>Reorder cards</h3>
          ${this.order.map(
            (tag, ix) =>
              html`<div class="section-item">
                <span>${CARD_LABELS[tag] ?? tag}</span>
                <button @click=${() => this.move(ix, -1)} ?disabled=${ix === 0}>
                  Up
                </button>
                <button
                  @click=${() => this.move(ix, 1)}
                  ?disabled=${ix === this.order.length - 1}
                >
                  Down
                </button>
              </div>`,
          )}
          <button class="btn-primary" @click=${() => this.save()}>Save</button>
          <button @click=${() => this.reset()}>Reset</button>
          <button
            @click=${() => {
              this.open = false;
              (this as any).requestUpdate?.();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('tax-reorder-modal')
) {
  customElements.define(
    'tax-reorder-modal',
    TaxReorderModal as unknown as CustomElementConstructor,
  );
}
