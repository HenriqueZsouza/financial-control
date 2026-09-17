import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleBasedTelegramInterpreter } from './rule-based-telegram-interpreter.js';

const now = new Date('2026-08-30T13:30:00.000Z');
const interpreter = new RuleBasedTelegramInterpreter();

test('interpreter: extrai campos independentemente da ordem', () => {
  const variants = [
    'compra no credito de 100 mercado',
    '100 mercado credito',
    'mercado 100 no cartão',
    'no crédito mercado 100',
    'crédito 100 mercado',
  ];
  for (const text of variants) {
    const draft = interpreter.interpret(text, now);
    assert.equal(draft.type, 'EXPENSE', text);
    assert.equal(draft.amount, 10000, text);
    assert.equal(draft.paymentType, 'CREDIT_1X', text);
    assert.equal(draft.name, 'mercado', text);
  }
});

test('interpreter: reconhece receita, parcelas e data relativa', () => {
  assert.deepEqual(interpreter.interpret('recebi 2500 salário', now), {
    amount: 250000,
    type: 'INCOME',
    name: 'salario',
  });
  assert.equal(interpreter.interpret('mercado 300 parcelado em 3x', now).paymentType, 'INSTALLMENT');
  assert.equal(interpreter.interpret('mercado 300 parcelado em 3x', now).installmentsCount, 3);
  assert.equal(interpreter.interpret('gastei 50 no uber ontem', now).date, new Date(now.getTime() - 86_400_000).toISOString());
  assert.equal(interpreter.interpret('gastei 50 no uber ontem', now).amount, 5000);
  assert.equal(interpreter.interpret('mercado 150,50 hoje', now).amount, 15050);
});

test('interpreter: “a vista” não deixa resto na descrição', () => {
  const variants = ['mercado 100,00 a vista', 'mercado 100,00 à vista', 'a vista mercado 100'];
  for (const text of variants) {
    const draft = interpreter.interpret(text, now);
    assert.equal(draft.name, 'mercado', text);
    assert.equal(draft.amount, 10000, text);
    assert.equal(draft.paymentType, 'CASH', text);
  }
});

test('interpreter: crédito à vista e parcelado também limpam a descrição', () => {
  const credit = [
    'mercado 100,00 no credito',
    'mercado 100,00 no cartão',
    'mercado 100,00 credito a vista',
    'crédito à vista mercado 100',
  ];
  for (const text of credit) {
    const draft = interpreter.interpret(text, now);
    assert.equal(draft.name, 'mercado', text);
    assert.equal(draft.amount, 10000, text);
    assert.equal(draft.paymentType, 'CREDIT_1X', text);
    assert.equal(draft.installmentsCount, undefined, text);
  }

  const installments = [
    'mercado 100,00 parcelado em 3x',
    'mercado 100 3x no cartão',
    '3x mercado 100 credito',
  ];
  for (const text of installments) {
    const draft = interpreter.interpret(text, now);
    assert.equal(draft.name, 'mercado', text);
    assert.equal(draft.amount, 10000, text);
    assert.equal(draft.paymentType, 'INSTALLMENT', text);
    assert.equal(draft.installmentsCount, 3, text);
  }
});
