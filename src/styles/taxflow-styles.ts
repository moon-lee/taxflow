import { css } from 'lit';

export const taxStyles = css`
  .tax-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--ff-border, #333);
  }
  .tax-row.total {
    font-weight: 700;
  }
  .tax-row .num {
    font-variant-numeric: tabular-nums;
  }
  .cards {
    display: flex;
    flex-direction: column;
  }
`;
