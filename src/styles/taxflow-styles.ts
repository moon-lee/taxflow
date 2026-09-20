import { css } from 'lit';

export const taxStyles = css`
  /* Cards grid (spec §1). Panel look comes from ext-layout .section. */
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ff-space-4, 16px);
    align-items: stretch;
    grid-auto-flow: dense;
  }
  .cards .section {
    margin-bottom: 0;
    padding-bottom: var(--ff-space-3, 12px);
  }
  .cards .section > *:not(.section-header) {
    margin-left: var(--ff-space-4, 16px);
    margin-right: var(--ff-space-4, 16px);
  }
  /* Long unbroken text (e.g. URLs) wraps instead of overflowing narrow cards. */
  .cards .section .tax-row > span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .cards .section.span {
    grid-column: 1 / -1;
  }
  /* Modal element lives inside .cards but must not take a grid cell. */
  .cards > tax-reorder-modal {
    display: contents;
  }
  /* Item-types 3-panel: Income spans 2 rows (left), Deductions + Offsets stack on the right. */
  .cards .section.income-full {
    grid-row: span 2;
  }
  /* Row columns inside full-width cards: two items per row. */
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: var(--ff-space-4, 16px);
  }
  .cols > * {
    min-width: 0;
  }
  /* Fixed value column so amounts align across both columns. */
  .cols .tax-row > span:first-child {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cols .tax-row .num {
    flex: 0 0 auto;
    min-width: 112px;
  }
  .cols .tax-row > span:last-child {
    flex: 0 0 64px;
    text-align: right;
  }
  /* Full-width header: one heading group per item column. */
  .cols-head-full {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: var(--ff-space-4, 16px);
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
  }
  .cols-head-group {
    display: flex;
    gap: var(--ff-space-3, 12px);
    align-items: baseline;
    padding: 6px 0;
    min-width: 0;
  }
  .cols-head-group > span:first-child {
    flex: 1 1 auto;
    min-width: 0;
  }
  .cols-head-group .num {
    flex: 0 0 auto;
    min-width: 112px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ff-text-muted, #858585);
    font-size: var(--ff-font-xs, 11px);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .cols-head-group > span:last-child {
    flex: 0 0 64px;
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
  /* Accent top edge on all cards. */
  .cards .section {
    border-top: 3px solid var(--ff-accent, #007acc);
  }
  .result-card .kpi {
    background: var(--ff-bg-subpanel, #2a2a2a);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: var(--ff-radius-lg, 6px);
    padding: var(--ff-space-3, 12px) var(--ff-space-2, 8px);
  }
  .result-card-body {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
    gap: var(--ff-space-4, 16px);
    align-items: stretch;
    margin-top: var(--ff-space-3, 12px);
  }
  .result-card .hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
    padding: var(--ff-space-4, 16px);
    background: var(--ff-bg-subpanel, #2a2a2a);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: var(--ff-radius-lg, 6px);
  }
  .result-kpis {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: var(--ff-space-2, 8px);
    align-content: stretch;
  }
  .hero {
    text-align: center;
    padding: var(--ff-space-4, 16px) 0 var(--ff-space-2, 8px);
  }
  .hero-value {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 0.5px;
    font-variant-numeric: tabular-nums;
  }
  .hero.refund .hero-value {
    color: var(--ff-success, #4ec9b0);
  }
  .hero.owed .hero-value {
    color: var(--ff-danger, #f48771);
  }
  .hero-caption {
    font-size: var(--ff-font-sm, 12px);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ff-text-muted, #858585);
  }
  /* KPI row */
  .kpi-row {
    display: flex;
    gap: var(--ff-space-2, 8px);
    margin-top: var(--ff-space-3, 12px);
  }
  .kpi {
    flex: 1 1 0;
    text-align: center;
    padding: var(--ff-space-2, 8px) 0;
  }
  .kpi-label {
    font-size: var(--ff-font-sm, 12px);
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
  /* Single-row inline editors (amount + withheld + Save/Cancel). */
  .tax-form.inline {
    grid-template-columns: 1fr 1fr auto auto;
    align-items: end;
  }
  .tax-form.inline.one-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto;
    align-items: end;
  }
  .tax-form.inline.one-row input,
  .tax-form.inline.one-row .btn-primary,
  .tax-form.inline.one-row .ghost {
    height: 34px;
    box-sizing: border-box;
  }
  .tax-form.inline.one-row .form-actions {
    display: contents;
  }
  .tax-form.inline.one-row .btn-primary {
    grid-column: 3;
    justify-self: end;
  }
  .tax-form.inline.one-row .ghost {
    grid-column: 4;
    justify-self: end;
    align-self: end;
  }
  .tax-form.inline.single {
    grid-template-columns: 1fr;
  }
  .tax-form.inline .btn-primary {
    grid-column: 3;
    justify-self: end;
  }
  .tax-form.inline .ghost {
    grid-column: 4;
    justify-self: end;
    align-self: end;
  }
  /* Tight right-aligned button cluster. */
  .form-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: var(--ff-space-2, 8px);
  }
  /* Inline "Open" link button — accent-colored, no background, underline on hover. */
  .icon-btn {
    background: transparent;
    border: 0;
    padding: 0 4px;
    font-size: var(--ff-font-sm, 12px);
    font-weight: 600;
    line-height: 1.5;
    color: var(--ff-accent, #007acc);
    cursor: pointer;
    text-decoration: none;
    font-family: inherit;
    transition: color 0.12s ease;
  }
  .icon-btn:hover {
    color: var(--ff-accent-hover, #1188dd);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .icon-btn:focus-visible {
    outline: 1px solid var(--ff-accent, #007acc);
    outline-offset: 1px;
    border-radius: 2px;
  }
  .tax-form.inline label {
    flex-direction: row;
    align-items: center;
  }
  .tax-form.inline input,
  .tax-form.inline select {
    flex: 1 1 auto;
    min-width: 0;
  }
  .check-row {
    flex-direction: row !important;
    align-items: center;
    gap: var(--ff-space-2, 8px) !important;
  }
  /* Item-types 3-panel layout: Income (left, full height) | Deductions (right top) + Offsets (right bottom). */
  .items-grid {
    display: flex;
    gap: 12px;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
  }
  .items-grid .col-left,
  .items-grid .col-right {
    flex: 1 1 50%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .items-grid .section {
    margin-bottom: 0;
    flex: 1 1 auto;
  }
  @media (max-width: 760px) {
    .items-grid {
      flex-direction: column;
    }
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
  /* Clickable rows (bracket click-to-edit). */
  .tax-table tbody tr.clickable {
    cursor: pointer;
  }
  /* Group the year badge + Lock button together on the right of a header. */
  .header-controls {
    display: flex;
    align-items: center;
    gap: var(--ff-space-2, 8px);
  }
  /* Lock/Unlock button — pill style matching the year badge. */
  .filter-btn {
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-border, #3e3e3e);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: var(--ff-font-xs, 11px);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition:
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .filter-btn:hover {
    border-color: var(--ff-accent, #007acc);
  }
  .filter-btn[aria-pressed='true'],
  .filter-btn.locked {
    color: var(--ff-success, #4ec9b0);
    border-color: var(--ff-success, #4ec9b0);
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
  /* Finance year badge in the Row 1 header. */
  .year-badge {
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text-strong, #ffffff);
    border: 1px solid var(--ff-accent, #007acc);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: var(--ff-font-sm, 12px);
    font-weight: 700;
    outline: none;
    cursor: pointer;
  }
  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .cards .section.span {
      grid-column: auto;
    }
    .cols {
      grid-template-columns: 1fr;
    }
    .cols-head-full {
      grid-template-columns: 1fr;
    }
    .cols-head-group:last-child {
      display: none;
    }
    .tax-form {
      grid-template-columns: 1fr;
    }
    .tax-form.inline {
      grid-template-columns: 1fr;
    }
    .tax-form.inline.one-row {
      grid-template-columns: 1fr;
    }
    .tax-form.inline.one-row .form-actions {
      grid-column: 1 / -1;
      display: flex;
    }
    .tax-form.inline.one-row .btn-primary,
    .tax-form.inline.one-row .ghost {
      grid-column: auto;
      justify-self: start;
    }
    .kpi-row {
      flex-wrap: wrap;
    }
    .result-card-body {
      grid-template-columns: 1fr;
    }
    .result-card .hero {
      min-height: 0;
    }
    .result-kpis {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;
