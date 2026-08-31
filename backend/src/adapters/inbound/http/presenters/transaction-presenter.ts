import type { Transaction } from '../../../../domain/transaction/transaction.js';

/** Keeps Telegram audit metadata internal while preserving the legacy HTTP contract. */
export function presentTransaction({ source: _source, externalReference: _externalReference, ...transaction }: Transaction) {
  return transaction;
}
