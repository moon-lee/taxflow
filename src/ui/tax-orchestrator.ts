// Task 1 stub — full orchestrator lands in Task 4.
import { LitElement } from 'lit';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export class TaxOrchestrator extends Base {
  finance: any = null;
  view = 'tax-summary';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
  }

  async init(f: any, _mount: Record<string, unknown> = {}): Promise<void> {
    this.finance = f;
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
