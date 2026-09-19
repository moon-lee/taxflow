import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export const CANONICAL_CARD_ORDER = [
  'result',
  'income',
  'deductions',
  'spouse',
  'forecast',
  'planner',
];

export const CARD_LABELS: Record<string, string> = {
  income: 'Taxable Income',
  deductions: 'Deductions',
  spouse: 'Spouse and Child Details',
  result: 'Est. Tax Return',
  forecast: 'Forecast (guess)',
  planner: 'Super top-up planner',
};

export class TaxReorderModal extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            .item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 6px 10px;
              border: 1px solid var(--ff-bg-input, #3c3c3c);
              border-left: 4px solid var(--ff-bg-input, #3c3c3c);
              border-radius: 4px;
              margin-bottom: 6px;
            }
            .item.first {
              border-left-color: var(--ff-teal, #4ec9b0);
            }
            .item.last {
              border-left-color: var(--ff-accent, #007acc);
            }
            .item .label {
              flex: 1;
            }
            .up {
              background: var(--ff-accent, #007acc);
              color: var(--ff-text-strong, #fff);
            }
            .down {
              background: var(--ff-accent-hover, #1177bb);
              color: var(--ff-text-strong, #fff);
            }
          `,
        ] as any)
      : [];
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
      <div class="backdrop">
        <div class="modal" role="dialog" aria-label="Reorder cards">
          <h2>Reorder Cards</h2>
          ${this.order.map(
            (tag, ix) =>
              html`<div
                class="item ${ix === 0 ? 'first' : ''} ${ix === this.order.length - 1 ? 'last' : ''}"
              >
                <span class="label">${CARD_LABELS[tag] ?? tag}</span>
                <button
                  class="up"
                  ?disabled=${ix === 0}
                  @click=${() => this.move(ix, -1)}
                >
                  ▲
                </button>
                <button
                  class="down"
                  ?disabled=${ix === this.order.length - 1}
                  @click=${() => this.move(ix, 1)}
                >
                  ▼
                </button>
              </div>`,
          )}
          <div class="modal-actions">
            <button
              class="ghost"
              @click=${() => {
                this.open = false;
                (this as any).requestUpdate?.();
              }}
            >
              Cancel
            </button>
            <button class="ghost" @click=${() => this.reset()}>
              Reset to default
            </button>
            <button class="primary" @click=${() => this.save()}>Save</button>
          </div>
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
