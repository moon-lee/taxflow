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
