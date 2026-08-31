'use client';

import Chip from '@mui/material/Chip';
import { transactionTypeLabel } from '../lib/transaction-ui';
import type { TransactionType } from '../lib/types';

export function TransactionTypeChip({ type }: { type: TransactionType }) {
  if (type === 'INVESTMENT') {
    return <Chip size="small" variant="outlined" label={transactionTypeLabel(type)} />;
  }

  return (
    <Chip
      size="small"
      color={type === 'INCOME' ? 'success' : 'error'}
      label={transactionTypeLabel(type)}
    />
  );
}
