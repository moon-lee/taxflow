---
version: 0.1.0
created: 2026-09-19
last_updated: 2026-09-19T19:00:00+10:00
status: approved
---

# TaxFlow UI Style Overhaul — Design

Goal: full visual overhaul of the Tax Summary and Tax Rates pages (plus reorder modal).
Direction (approved 2026-09-19): app tokens, own layout — summary cards grid + big
refund/owed hero. Text-only brainstorming; styling lives in the style folder.

## Constraints

- All new CSS goes in `src/styles/taxflow-styles.ts` (author-owned). Never edit vendored
  snapshots (`src/styles/ext-layout.css`, `ext-tokens.css`, `shared-styles.ts`,
  `src/finance.d.ts`, `src/vendor/**`) — `refresh` overwrites them.
- Tokens only: every color/spacing/font/radius via `var(--ff-*)`. No hardcoded hex.
  Light-theme (`body.light-theme` overrides) works with no extra code.
- Views get `class` additions only. No logic, event, DAO, or service changes. All
  `CustomEvent` names and payload shapes stay exactly as the orchestrator handles them.
- Card order still driven by `orderOf()` inline `order` styles; grid is visual only.

## 1. Summary cards grid

- Each `.section` also gets `card`: `background: var(--ff-bg-panel)`,
  `border: 1px solid var(--ff-border)`, `border-radius: var(--ff-radius-lg)`,
  padding `var(--ff-space-4)`, section titles in `font-lg` strong.
- `.view-container-inner.cards` becomes a 2-column grid (`gap: var(--ff-space-4)`);
  result, forecast, planner, item-types span both columns; single column under ~640px.
- `.tax-row` keeps label/value split, tabular numbers, muted labels, hairline dividers.

## 2. Result hero

- Refund/owed row becomes a hero strip: `font-3xl` number, tabular;
  `var(--ff-success)` when refund, `var(--ff-danger)` when owed; small caption
  (`Refund` / `Amount owed`).
- The other result lines (taxable, tax, Medicare, surcharge, withheld) render as a
  KPI row: centered label (uppercase, `font-xs`, muted) over value (`font-xl`, strong).

## 3. Forms and buttons

- One form pattern in both views: grid rows (`label` muted `font-sm` above input),
  inputs/selects with `var(--ff-bg-input)` background, `var(--ff-border)` border,
  `radius-md`, accent focus ring; number inputs right-aligned tabular.
- Submits use `.btn-primary`; row edit/delete and lock toggle are quiet buttons
  (transparent, muted, hover to text-strong; delete hover to danger).
- Locked years keep the read-only note and hide all forms (no logic change).

## 4. Rates view

- Bracket and MLS-single/MLS-family rows become tables: uppercase `font-xs` muted
  headers (From / To / Base / Rate), tabular body, hairline row dividers.
- Each editor collapses to one inline add-row form reusing the §3 form pattern.
- Year list rows get open/locked pills (success/muted); reference links render as
  items with ellipsis overflow.

## 5. Topbar and reorder modal

- Keep canonical `.topbar` markup; year `select` and Reorder/Lock buttons use the
  quiet-button style with accent hover.
- Reorder modal content gets panel background, border, `radius-xl`, section-item
  rows with Up/Down buttons, full-width primary Save.

## 6. Verification

- `npx prettier --check --single-quote` on touched files; `npx tsc --noEmit` clean
  for extension code (pre-existing `finance-mock.ts` warnings excluded);
  `npm test` 20/20; `npm run build` green.
- Owner visually checks `npm run dev` (Tax Summary + Tax Rates dropdown).

## Self-review

- No placeholders; every section names exact classes/tokens and the file they live in.
- Consistent: grid honors `orderOf()` (§6 constraint); events/payloads untouched;
  light-theme free via tokens.
- Scope: one spec, styling only. No behavior, data-model, or cross-extension changes.
- Unambiguous: "cards grid" = grid on `.cards` container, `order` inline styles kept;
  "hero" = refund/owed strip + KPI row in the result card.
