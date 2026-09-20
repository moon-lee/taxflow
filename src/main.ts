import type { FinanceApi } from 'finance';
import { ExtensionLogger } from 'finance-logger';
import './styles/ext-tokens.css';

const logger = new ExtensionLogger('taxflow');
let _finance: FinanceApi | null = null;

export async function registerUIComponents(): Promise<void> {
  if (typeof window !== 'undefined') await import('./ui/index.js');
}

const openView =
  (finance: FinanceApi, childTag: string): (() => Promise<void>) =>
  async () => {
    await finance.ui?.requestMount('taxflow', { view: childTag });
  };

interface PayYtd {
  gross: number;
  withheld: number;
  count: number;
  yearKey: string;
}

/** Host-side only: panel services.invoke is a noop, so the panel can never
 * reach the pay service directly. Fetch here (host has the real bridge) and
 * push the result to the panel, mirroring the dashboard refresh pattern. */
async function fetchPayYtd(
  finance: FinanceApi,
  yearKey: string,
): Promise<PayYtd | null> {
  try {
    const ytd = (await finance.services?.invoke('pay', 'getYearToDateSummary', [
      '07-01',
      undefined,
      yearKey,
    ])) as {
      gross: number;
      payg?: number;
      withheld?: number;
      payg_withholding?: number;
      count?: number;
    } | null;
    const gross = Number(ytd?.gross);
    if (!ytd || !Number.isFinite(gross)) return null;
    return {
      gross,
      withheld: Number(ytd.payg ?? ytd.withheld ?? ytd.payg_withholding ?? 0),
      count: Number(ytd.count ?? 0),
      yearKey,
    };
  } catch (e) {
    logger.error('fetchPayYtd failed', e);
    return null;
  }
}

export async function activate(
  finance: FinanceApi,
  ctx: { viewId?: string } & Record<string, unknown> = {},
): Promise<void> {
  _finance = finance;
  finance.commands.registerCommand('taxflow.show-summary', 'Tax Summary', () =>
    openView(finance, 'tax-summary')(),
  );
  finance.commands.registerCommand('taxflow.show-rates', 'Tax Rates', () =>
    openView(finance, 'tax-rates')(),
  );
  finance.commands.registerCommand(
    'taxflow.refresh-pay',
    'Refresh salary data',
    async (...args: unknown[]) => {
      const first = args[0] as { yearKey?: unknown } | string | undefined;
      const yearKey =
        typeof first === 'string'
          ? first
          : typeof first?.yearKey === 'string'
            ? first.yearKey
            : undefined;
      if (!yearKey) return;
      const payYtd = await fetchPayYtd(finance, yearKey);
      try {
        await (finance.ui as any)?.pushData?.('taxflow', {
          payYtd,
          payYearKey: yearKey,
        });
      } catch (e) {
        logger.error('push payYtd failed', e);
      }
    },
  );
  const { createTaxService } = await import('./services/tax-summary.js');
  finance.services.register('tax', createTaxService(finance as any));
  try {
    const { seedIfEmpty } = await import('./dao/seed.js');
    await seedIfEmpty(finance as any);
  } catch (e) {
    logger.error('taxflow seed failed', e);
  }
  if (typeof window !== 'undefined') await import('./ui/index.js');
  if (ctx.viewId && typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      const { TaxOrchestrator } = await import('./ui/tax-orchestrator.js');
      const el = document.createElement('tax-orchestrator') as any;
      app.innerHTML = '';
      app.appendChild(el);
      const baseData = {
        viewId: ctx.viewId,
        ...(ctx as Record<string, unknown>),
      };
      queueMicrotask(() => void el.init(finance, baseData));
      setTimeout(() => {
        if (el.finance == null) void el.setFinance(finance);
      }, 50);
      app.addEventListener('mount-update', (e: Event) => {
        void el.init(finance, {
          ...baseData,
          ...((e as CustomEvent).detail ?? {}),
        });
      });
    }
  }
}

export function deactivate(): void {
  if (_finance) _finance.services.unregister('tax');
  _finance = null;
  logger.info('deactivate taxflow');
}
