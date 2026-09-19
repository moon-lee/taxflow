# TaxFlow UI Style Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Tax Summary and Tax Rates pages (plus reorder modal) using style-folder CSS: cards grid + refund/owed hero, shared form/table/button patterns from the vendored layout.

**Architecture:** New CSS lives only in `src/styles/taxflow-styles.ts`; views gain `class` hooks only (no logic, event, DAO, or service changes). Reuse vendored primitives (`.section`, `.btn-primary`, `.ghost`, `.table-wrap`, `.modal`, `.backdrop`, `.modal-actions`, `.field-error`) — never edit vendored files.

**Tech Stack:** TypeScript strict, Lit 3, `var(--ff-*)` tokens (dark + `body.light-theme` free), Prettier `--single-quote`, Vitest, SDK `cli.mjs` build.

---

## File Structure

```
D:/finance_flow_ext/taxflow/
  src/styles/taxflow-styles.ts   # rewrite: grid, rows, hero, KPI, forms, tables, pills, responsive (Task 1)
  src/ui/tax-summary-view.ts     # class hooks: span cards, result hero+KPI, tax-form, ghost buttons (Task 2)
  src/ui/tax-rates-view.ts       # tables, pills, tax-form classes (Task 3)
  src/ui/tax-reorder-modal.ts    # backdrop/modal/modal-actions markup (Task 4)
```

---

## Global Constraints

- Never edit `refresh` files (`src/finance.d.ts`, `src/vendor/**`, `src/styles/ext-layout.css`, `ext-tokens.css`, `shared-styles.ts`).
- No hardcoded colors — every value via `var(--ff-*, fallback)`.
- No logic changes: same events, payloads, DAO calls, calculations. Only `class="..."` additions and element restructuring inside `render()` that preserves bindings.
- After every file change: `npx prettier --write --single-quote <file>` then `npx tsc --noEmit` (only pre-existing `src/mock/finance-mock.ts` errors allowed), `npm test` (20/20), `npm run build` green before commit. Ask before every commit.

---

### Task 1: Rewrite the stylesheet

**Files:**
- Modify: `D:/finance_flow_ext/taxflow/src/styles/taxflow-styles.ts`

- [ ] **Step 1: Write the new stylesheet**

Replace the full content of `src/styles/taxflow-styles.ts` with:

```ts
import { css } from 'lit';

export const taxStyles = css`
  /* Cards grid (spec §1). Panel look comes from ext-layout .section. */
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ff-space-4, 16px);
    align-items: start;
  }
  .cards .section {
    margin-bottom: 0;
    padding-bottom: var(--ff-space-3, 12px);
  }
  .cards .section > *:not(.section-header) {
    margin-left: var(--ff-space-4, 16px);
    margin-right: var(--ff-space-4, 16px);
  }
  .cards .section.span {
    grid-column: 1 / -1;
  }
  /* Label/value rows */
  .tax-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--ff-space-3, 12px);
    padding: 6px 0;
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
  }
  .tax-row.total {
    font-weight: 700;
  }
  .tax-row.total > span {
    color: var(--ff-text-strong, #ffffff);
  }
  .tax-row .num {
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }
  /* Result hero (spec §2) */
  .hero {
    text-align: center;
    padding: var(--ff-space-4, 16px) 0 var(--ff-space-2, 8px);
  }
  .hero-value {
    font-size: var(--ff-font-3xl, 21px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .hero.refund .hero-value {
    color: var(--ff-success, #4ec9b0);
  }
  .hero.owed .hero-value {
    color: var(--ff-danger, #f48771);
  }
  .hero-caption {
    font-size: var(--ff-font-xs, 11px);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ff-text-muted, #858585);
  }
  /* KPI row */
  .kpi-row {
    display: flex;
    gap: var(--ff-space-2, 8px);
  }
  .kpi {
    flex: 1 1 0;
    text-align: center;
    padding: var(--ff-space-2, 8px) 0;
  }
  .kpi-label {
    font-size: var(--ff-font-xs, 11px);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--ff-text-muted, #858585);
    margin-bottom: 2px;
  }
  .kpi-value {
    font-size: var(--ff-font-xl, 17px);
    font-weight: 600;
    color: var(--ff-text-strong, #ffffff);
    font-variant-numeric: tabular-nums;
  }
  /* Forms (spec §3) */
  .tax-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ff-space-2, 8px) var(--ff-space-3, 12px);
    margin-top: var(--ff-space-3, 12px);
    padding-top: var(--ff-space-3, 12px);
    border-top: 1px solid var(--ff-border, #3e3e3e);
  }
  .tax-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--ff-font-sm, 12px);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--ff-text-muted, #858585);
  }
  .tax-form input,
  .tax-form select {
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: var(--ff-radius-md, 4px);
    padding: 6px 10px;
    font-size: var(--ff-font-base, 14px);
    font-family: inherit;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    outline: none;
  }
  .tax-form input:focus,
  .tax-form select:focus {
    border-color: var(--ff-accent, #007acc);
  }
  .tax-form input[type='number'] {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .tax-form .btn-primary {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .check-row {
    flex-direction: row !important;
    align-items: center;
    gap: var(--ff-space-2, 8px) !important;
  }
  .check-row input {
    width: auto;
  }
  /* Tables (spec §4) */
  .tax-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--ff-font-md, 13px);
  }
  .tax-table th {
    text-align: left;
    padding: 8px 12px;
    font-size: var(--ff-font-xs, 11px);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ff-text-muted, #858585);
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
  }
  .tax-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
    color: var(--ff-text, #d4d4d4);
  }
  .tax-table td.num,
  .tax-table th.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  /* Open/locked pills */
  .pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: var(--ff-font-xs, 11px);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid var(--ff-border, #3e3e3e);
    color: var(--ff-text-muted, #858585);
  }
  .pill.open {
    color: var(--ff-success, #4ec9b0);
    border-color: var(--ff-success, #4ec9b0);
  }
  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .cards .section.span {
      grid-column: auto;
    }
    .tax-form {
      grid-template-columns: 1fr;
    }
    .kpi-row {
      flex-wrap: wrap;
    }
  }
`;
```

- [ ] **Step 2: Format-check the stylesheet**

Run: `cd D:/finance_flow_ext/taxflow && npx prettier --check --single-quote "src/styles/taxflow-styles.ts"`
Expected: `All matched files use Prettier code style!` (run `--write` first if not).

---

### Task 2: Summary view class hooks

**Files:**
- Modify: `D:/finance_flow_ext/taxflow/src/ui/tax-summary-view.ts` (render only; no handler/logic changes)

- [ ] **Step 1: Full-width cards**

Make 4 edits — in each, insert `span` into the section class:

1. `<div class="section" style="order:${this.orderOf('result')}">` → `<div class="section span" style="order:${this.orderOf('result')}">`
2. `<div class="section" style="order:${this.orderOf('forecast')}">` → `<div class="section span" style="order:${this.orderOf('forecast')}">`
3. `<div class="section" style="order:${this.orderOf('planner')}">` → `<div class="section span" style="order:${this.orderOf('planner')}">`
4. `<div class="section" style="order:99">` → `<div class="section span" style="order:99">`

- [ ] **Step 2: Result KPI row + hero**

Replace the result card body (lines 692–714):

```html
            <div class="tax-row">
              <span>Taxable income</span
              ><span class="num">${t.taxable.toFixed(2)}</span>
            </div>
            <div class="tax-row">
              <span>Tax on income</span
              ><span class="num">${b.tax.toFixed(2)}</span>
            </div>
            <div class="tax-row">
              <span>Medicare levy</span
              ><span class="num">${b.medicare.toFixed(2)}</span>
            </div>
            <div class="tax-row">
              <span>Surcharge</span><span class="num">${b.mls.toFixed(2)}</span>
            </div>
            <div class="tax-row">
              <span>Tax withheld</span
              ><span class="num">${t.withheld.toFixed(2)}</span>
            </div>
            <div class="tax-row total">
              <span>${b.result >= 0 ? 'Refund' : 'Owed'}</span
              ><span class="num">${Math.abs(b.result).toFixed(2)}</span>
            </div>
```

with:

```html
            <div class="kpi-row">
              <div class="kpi"><div class="kpi-label">Taxable</div><div class="kpi-value">${t.taxable.toFixed(2)}</div></div>
              <div class="kpi"><div class="kpi-label">Tax</div><div class="kpi-value">${b.tax.toFixed(2)}</div></div>
              <div class="kpi"><div class="kpi-label">Medicare</div><div class="kpi-value">${b.medicare.toFixed(2)}</div></div>
              <div class="kpi"><div class="kpi-label">Surcharge</div><div class="kpi-value">${b.mls.toFixed(2)}</div></div>
              <div class="kpi"><div class="kpi-label">Withheld</div><div class="kpi-value">${t.withheld.toFixed(2)}</div></div>
            </div>
            <div class="hero ${b.result >= 0 ? 'refund' : 'owed'}">
              <div class="hero-value">${Math.abs(b.result).toFixed(2)}</div>
              <div class="hero-caption">${b.result >= 0 ? 'Refund' : 'Amount owed'}</div>
            </div>
```

- [ ] **Step 3: Form classes**

Add `class="tax-form"` to every `<form` in the file (6 forms: income save, deduction edit, deduction create, spouse save, item create). Each edit keeps the existing `@submit` handler, e.g.:

`<form @submit=${(e: Event) => this.saveIncome(it.item_key, e)}>` → `<form class="tax-form" @submit=${(e: Event) => this.saveIncome(it.item_key, e)}>`

Do the same for the `editDeduction`, `createDeduction`, `saveSpouse`, and `createItem` forms.

- [ ] **Step 4: Quiet buttons + checkbox row**

1. Edit + Delete deduction buttons: add `class="ghost"` to both `<button>` elements in the `editingDeductionId !== r.id` branch; add `class="ghost"` to the Cancel button in the edit form.
2. Item-type Deactivate button: `<button @click=${() => this.deactivateItem(it.item_key)}>Deactivate</button>` → `<button class="ghost" @click=${() => this.deactivateItem(it.item_key)}>Deactivate</button>`.
3. Spouse hospital-cover label: `<label><input name="has_cover"` → `<label class="check-row"><input name="has_cover"`.

---

### Task 3: Rates view tables, pills, form classes

**Files:**
- Modify: `D:/finance_flow_ext/taxflow/src/ui/tax-rates-view.ts` (render only)

- [ ] **Step 1: Year pills**

Replace:

```html
${this.years.map((y) => html`<div class="tax-row"><span>${y.year_key} (${y.start_date} – ${y.end_date})</span><span class="num">${y.is_locked ? 'locked' : 'open'}</span></div>`)}
```

with:

```html
${this.years.map((y) => html`<div class="tax-row"><span>${y.year_key} (${y.start_date} – ${y.end_date})</span><span class="pill ${y.is_locked ? 'locked' : 'open'}">${y.is_locked ? 'locked' : 'open'}</span></div>`)}
```

- [ ] **Step 2: Bracket table**

Replace:

```html
${brackets.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)} @ ${(Number(r.rate) * 100).toFixed(1)}%</span><span class="num">base $${this.money(r.base_amount)}</span></div>`)}
```

with:

```html
<div class="table-wrap"><table class="tax-table">
              <thead><tr><th>From</th><th>To</th><th class="num">Rate</th><th class="num">Base</th></tr></thead>
              <tbody>${brackets.map((r) => html`<tr><td>$${this.money(r.limit_from)}</td><td>${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</td><td class="num">${(Number(r.rate) * 100).toFixed(1)}%</td><td class="num">$${this.money(r.base_amount)}</td></tr>`)}</tbody>
            </table></div>
```

- [ ] **Step 3: MLS tables**

Replace the single-tier rows:

```html
${mlsSingle.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</span><span class="num">${(Number(r.rate) * 100).toFixed(2)}%</span></div>`)}
```

with:

```html
<div class="table-wrap"><table class="tax-table">
              <thead><tr><th>From</th><th>To</th><th class="num">Rate</th></tr></thead>
              <tbody>${mlsSingle.map((r) => html`<tr><td>$${this.money(r.limit_from)}</td><td>${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</td><td class="num">${(Number(r.rate) * 100).toFixed(2)}%</td></tr>`)}</tbody>
            </table></div>
```

and the family-tier rows:

```html
${mlsFamily.map((r) => html`<div class="tax-row"><span>$${this.money(r.limit_from)} – ${r.limit_to === null ? '∞' : '$' + this.money(r.limit_to)}</span><span class="num">${(Number(r.rate) * 100).toFixed(2)}%</span></div>`)}
```

with the same table shape over `mlsFamily`.

- [ ] **Step 4: Form classes**

Add `class="tax-form"` to all 6 forms (`copyYear`, `saveBracket`, `saveMedicare`, both `saveMls`, `saveLink`), keeping each `@submit` handler unchanged.

---

### Task 4: Reorder modal primitives

**Files:**
- Modify: `D:/finance_flow_ext/taxflow/src/ui/tax-reorder-modal.ts` (render only)

- [ ] **Step 1: Backdrop + panel markup**

Replace:

```html
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
```

with:

```html
      <div class="backdrop">
        <div class="modal">
          <h3>Reorder cards</h3>
          ${this.order.map(
            (tag, ix) =>
              html`<div class="tax-row">
                <span>${CARD_LABELS[tag] ?? tag}</span>
                <span>
                  <button class="ghost" @click=${() => this.move(ix, -1)} ?disabled=${ix === 0}>
                    Up
                  </button>
                  <button
                    class="ghost"
                    @click=${() => this.move(ix, 1)}
                    ?disabled=${ix === this.order.length - 1}
                  >
                    Down
                  </button>
                </span>
              </div>`,
          )}
          <div class="modal-actions">
            <button class="ghost" @click=${() => this.reset()}>Reset</button>
            <button
              class="ghost"
              @click=${() => {
                this.open = false;
                (this as any).requestUpdate?.();
              }}
            >
              Cancel
            </button>
            <button class="btn-primary" @click=${() => this.save()}>Save</button>
          </div>
        </div>
      </div>
```

---

### Task 5: Verify + commit

- [ ] **Step 1: Format**

Run: `cd D:/finance_flow_ext/taxflow && npx prettier --write --single-quote "src/styles/taxflow-styles.ts" "src/ui/tax-summary-view.ts" "src/ui/tax-rates-view.ts" "src/ui/tax-reorder-modal.ts"`
Expected: all files styled, follow-up `--check` passes.

- [ ] **Step 2: Types + tests + build**

Run: `cd D:/finance_flow_ext/taxflow && npx tsc --noEmit`
Expected: only the 4 pre-existing `src/mock/finance-mock.ts` implicit-`any` errors.

Run: `cd D:/finance_flow_ext/taxflow && npm test`
Expected: 20/20 pass.

Run: `cd D:/finance_flow_ext/taxflow && npm run build`
Expected: `Built taxflow -> .../build/extension`.

- [ ] **Step 3: Commit (ask first)**

```bash
cd D:/finance_flow_ext/taxflow && git add src/styles/taxflow-styles.ts src/ui docs/superpowers/plans/2026-09-19-taxflow-ui-style.md && git commit -m "style(taxflow): cards grid, result hero, tables, modal polish"
```

---

## Self-review

- **Spec coverage:** §1 grid → Task 1 `.cards` + Task 2 `span` hooks. §2 hero → Task 1 `.hero`/`.kpi` + Task 2 Step 2. §3 forms/buttons → Task 1 `.tax-form` + Tasks 2–3 form classes, `ghost` buttons, `check-row`. §4 rates tables/pills → Task 3. §5 topbar/modal → Task 4 (`backdrop`/`modal`/`modal-actions` vendored; topbar untouched as spec requires). §6 verification → Task 5.
- **Placeholders:** none — full stylesheet content, exact old/new markup, exact commands and expected outputs.
- **Type consistency:** class names match between stylesheet and markup edits (`cards`, `span`, `hero refund|owed`, `hero-value`, `hero-caption`, `kpi-row`, `kpi`, `kpi-label`, `kpi-value`, `tax-form`, `check-row`, `tax-table`, `pill open|locked`, `ghost`, `backdrop`, `modal`, `modal-actions`). No handler, prop, or event-name changes anywhere.
