import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainError } from '../../../../domain/shared/errors.js';
import { errorHandler } from './error-presenter.js';

test('presenter mapeia DomainError sem alterar o formato HTTP', () => {
  const res = { statusCode: 0, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
  errorHandler(new DomainError('INVALID_CATEGORY', 'A categoria informada não existe.'), {} as any, res as any, (() => undefined) as any);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { code: 'INVALID_CATEGORY', message: 'A categoria informada não existe.' });
});
