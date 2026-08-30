# PRD — Investimentos e relatório de cartão de crédito

**Produto:** Financial Control  
**Documento:** Spec de produto + contratos de implementação  
**Versão:** 1.0  
**Status:** Pronto para implementação  
**Data:** 30/08/2026  
**Escopo:** `backend/` + `frontend/`  
**Fonte de verdade do produto base:** [`PRD.md`](./PRD.md)  
**Contrato HTTP vigente (antes desta feature):** [`API.md`](./API.md)  
**Arquitetura backend:** hexagonal — [`PRD-HEXAGONAL.md`](./PRD-HEXAGONAL.md) + `AGENTS.md`

Este documento é **spec-driven**: a implementação segue os contratos, cortes, regras e critérios abaixo. Código que não estiver previsto nesta spec não entra no PR. Qualquer desvio de rota, payload, status ou erro exige atualizar este PRD e [`API.md`](./API.md) no mesmo PR.

---

## 1. Problema

Hoje o produto só conhece dois tipos de lançamento: **entrada** (`INCOME`) e **despesa** (`EXPENSE`). Aplicar dinheiro em Tesouro, CDB, fundos ou ações é forçado a virar despesa — o que distorce o saldo do mês, os gráficos e o relatório.

Além disso, compras no cartão já existem no modelo (`CREDIT_1X` e `INSTALLMENT`), mas a rota `/cartao-credito` ainda é placeholder. O usuário não tem uma visão mensal do que entra na fatura: à vista em 1x versus parcelas do período.

Sem isso:

1. o resultado do mês mistura consumo com alocação de patrimônio
2. o relatório não permite isolar investimentos
3. o menu “Cartão de crédito” não entrega valor

---

## 2. Objetivo

Entregar, de ponta a ponta:

1. um terceiro tipo de lançamento, **investimento** (`INVESTMENT`), no CRUD, na listagem, no dashboard e no relatório
2. o filtro de **tipo** do relatório geral com a opção Investimentos (além de Entradas, Despesas e Todos)
3. na página **Cartão de crédito**, um relatório mensal das compras no cartão, separado em **à vista (1x)** e **parceladas**
4. backend hexagonal (domain → application/ports → adapters; wiring só em `main.ts`)
5. contrato HTTP, OpenAPI e [`API.md`](./API.md) alinhados

---

## 3. Fora de escopo

- Entidade “cartão” (bandeira, final, limite, dia de fechamento, vencimento)
- Pagamento da fatura como lançamento especial / conciliação
- Juros, rotativo, anuidade, cashback
- Múltiplos cartões
- Escopo familiar (`scope=family`) no relatório de cartão — permanece pessoal, como a dashboard
- Investimento como conta/posição (saldo acumulado de carteira, rentabilidade, resgate)
- Exportação PDF/Excel
- Telegram / Hermes Agent
- Contas a pagar (continua placeholder)
- OAuth, 2FA, deploy

**Invariantes existentes (não negociáveis):** soft delete, valores em centavos (`Int`), parcelamento com resto na última parcela e avanço de meses em UTC, JWT Bearer, erros `{ code, message, details? }`, enums Prisma não vazam ao domínio, isolamento por `userId`.

---

## 4. Personas e glossário

| Termo | Definição |
|-------|-----------|
| Investimento | Lançamento `type=INVESTMENT`: dinheiro alocado em ativo (não é consumo). Não entra em `totalExpense` nem no saldo do período |
| Saldo do período | `totalIncome − totalExpense`, **sem** subtrair investimentos |
| Crédito à vista (1x) | `paymentType=CREDIT_1X`: uma única linha, valor integral no mês da compra |
| Parcelada | `paymentType=INSTALLMENT`: N linhas no mesmo grupo; cada parcela tem `date` no mês de competência |
| Fatura do mês | Soma, no período filtrado, das linhas `CREDIT_1X` + `INSTALLMENT` do usuário (qualquer `type`), com `deletedAt: null` |
| Relatório de cartão | Visão mensal em `/cartao-credito`: totais e listagens à vista (1x) versus parcelas |

---

## 5. Regras de negócio

### 5.1 Tipo `INVESTMENT`

1. **Enum:** `TransactionType` passa a ser `INCOME | EXPENSE | INVESTMENT` no domínio, no Prisma (mapeado no adapter) e no contrato HTTP.
2. **Mesmas regras de pagamento:** `CASH`, `CREDIT_1X` e `INSTALLMENT` continuam válidos para investimento. Parcelamento e crédito 1x seguem as regras atuais (`isSinglePayment`, `splitInstallments`, resto na última parcela).
3. **Saldo e dashboard:** `totalExpense` soma **somente** `EXPENSE`. `totalInvestment` soma `INVESTMENT`. `openingBalance` é o saldo encerrado até o mês anterior. `balance = openingBalance + totalIncome − totalExpense`. Investimento **não** reduz o saldo e **não** entra no gráfico de gastos por categoria (`byCategory` permanece só `EXPENSE`).
4. **Relatório geral:** o filtro `type` aceita `INVESTMENT`. Os cards passam a exibir também o total de investimentos filtrados. O “resultado filtrado” permanece `entradas − despesas` (investimentos não entram nessa conta).
5. **Listagem `/lancamentos`:** o filtro de tipo inclui Investimentos. Chip e rótulo próprios; valor com `Amount` em tom `plain` (tinta), sem verde/vermelho — investimento não é entrada nem despesa.
6. **Categoria:** o usuário escolhe qualquer categoria existente. O seed ganha **Investimentos** (`slug: investimentos`) como opção natural; não é obrigatório usá-la.
7. **Atualização:** `PATCH` pode alterar `type` para/de `INVESTMENT` nas mesmas restrições atuais (parcela não altera valor nem `paymentType`).
8. **Grupo familiar:** `scope=family` no relatório inclui investimentos dos membros ativos, como qualquer outro tipo.

### 5.2 Relatório de cartão de crédito

1. **Fonte:** lançamentos do usuário autenticado com `deletedAt: null` e `paymentType` em `{ CREDIT_1X, INSTALLMENT }`. `CASH` **não** entra.
2. **Competência:** o mês/ano filtra pela `date` de cada linha (parcela cai no mês da parcela, não no mês da compra original).
3. **Dois grupos:**
   - **À vista (1x):** `paymentType = CREDIT_1X`
   - **Parceladas:** `paymentType = INSTALLMENT` (exibir `Parcela X/N`)
4. **Totais do período:** `totalCredit1x`, `totalInstallment`, `total = totalCredit1x + totalInstallment`. Contagens de linhas em cada grupo.
5. **Tipo do lançamento:** despesa, entrada ou investimento no cartão podem aparecer; o relatório agrupa por forma de pagamento, não por tipo. Na prática a maioria será `EXPENSE`.
6. **Isolamento:** somente `userId` do token. Sem `scope=family` nesta entrega.
7. **Período padrão:** mês/ano corrente, mesmo componente `PeriodFilter` das outras telas.
8. **Privacidade:** valores respeitam o olho da sessão (`valuesVisible`).

---

## 6. User stories e critérios de aceite

### US-INV-01 — Cadastrar investimento

**Como** usuário, **quero** registrar um lançamento do tipo investimento **para** separar alocação de patrimônio de despesa.

**Critérios de aceite:**
- [ ] Formulário de novo lançamento oferece Tipo: Despesa, Entrada, Investimento
- [ ] Payload envia `"type": "INVESTMENT"`; valor em centavos; categoria obrigatória
- [ ] À vista, crédito 1x e parcelado funcionam iguais aos outros tipos
- [ ] Feedback Snackbar de sucesso/erro
- [ ] Edição e exclusão (soft delete) iguais aos demais lançamentos

### US-INV-02 — Filtrar investimentos no relatório

**Como** usuário, **quero** filtrar o relatório geral por tipo Investimentos **para** ver só o que apliquei no período.

**Critérios de aceite:**
- [ ] Select Tipo: Todos | Entradas | Despesas | Investimentos
- [ ] Com Investimentos, a tabela lista só `type=INVESTMENT`
- [ ] Card “Investimentos filtrados” soma esses valores
- [ ] Resultado filtrado continua entradas − despesas (não subtrai investimento)
- [ ] Chip da linha: “Investimento” (não success/error)
- [ ] Escopo Individual / Grupo familiar continua válido com o novo tipo

### US-INV-03 — Ver investimentos na listagem e no dashboard

**Como** usuário, **quero** reconhecer investimentos na listagem e no resumo do mês **para** não misturá-los com gastos.

**Critérios de aceite:**
- [ ] `/lancamentos`: filtro de tipo inclui Investimentos; chip e `Amount` `plain`
- [ ] Dashboard: indicador “Investimentos do período” com `totalInvestment`
- [ ] Saldo disponível e total de saídas **não** incluem investimentos
- [ ] Gráfico de gastos por categoria permanece só despesas

### US-CC-01 — Relatório mensal do cartão

**Como** usuário, **quero** ver no cartão de crédito o que caiu no mês à vista (1x) e o que é parcela **para** acompanhar a fatura.

**Critérios de aceite:**
- [ ] `/cartao-credito` deixa de ser placeholder (`ComingSoon`)
- [ ] Filtro de mês/ano (padrão: mês vigente)
- [ ] Três totais: à vista (1x), parceladas, total da fatura
- [ ] Duas seções (ou tabelas) distintas: compras 1x e parcelas do mês
- [ ] Parcela exibe `X/N`, nome, categoria, data (`DD/MM/YYYY HH:mm:ss`) e valor
- [ ] Empty state quando não houver compras no período
- [ ] Loading e erro com Alert; valores com `Amount` e olho da sessão
- [ ] `CASH` não aparece
- [ ] Soft-deleted não aparecem

---

## 7. Modelo de dados

### 7.1 Enums

```
TransactionType: INCOME | EXPENSE | INVESTMENT
PaymentType:     CASH | CREDIT_1X | INSTALLMENT   (sem mudança)
```

Migration Prisma: acrescentar valor `INVESTMENT` ao enum PostgreSQL (`ALTER TYPE ... ADD VALUE`). Não recriar o enum.

### 7.2 Category (seed)

Acrescentar ao seed existente (upsert por `slug`, sem quebrar categorias já usadas):

| name | slug |
|------|------|
| Investimentos | investimentos |

Ícone opcional; se o seed atual não preenche `icon`, manter o padrão.

### 7.3 Transaction

Nenhuma coluna nova. `type` passa a aceitar `INVESTMENT`. Índices atuais (`userId+date`, `userId+deletedAt`, `installmentGroupId`) permanecem.

### 7.4 Dashboard summary (contrato)

`GET /api/dashboard/summary` ganha campo obrigatório:

| Campo | Tipo | Regra |
|-------|------|--------|
| `totalInvestment` | Int (centavos) | soma de `INVESTMENT` no período; `0` se vazio |

Campos existentes não mudam de significado: `totalIncome`, `totalExpense`, `balance`, `byCategory`.

Clientes antigos que ignorem o campo extra continuam corretos. O frontend desta entrega **deve** exibir `totalInvestment`.

---

## 8. Contratos de comportamento (spec)

### 8.1 Criar / listar investimento

```
Dado usuário autenticado e categoria válida
Quando CreateTransaction(type=INVESTMENT, paymentType=CASH, amount=100000)
Então cria 1 lançamento INVESTMENT; não altera totalExpense nem balance do dashboard
     totalInvestment do período inclui 100000

Dado type=INVESTMENT e paymentType=INSTALLMENT, installmentsCount=3, amount=100
Quando CreateTransaction
Então 3 linhas INVESTMENT no mesmo grupo; resto na última; datas +1 mês UTC

Dado GET /api/transactions?type=INVESTMENT
Então retorna só INVESTMENT do userId (e filtros de período/categoria/scope)

Dado GET /api/transactions?type=EXPENSE
Então INVESTMENT não entra (comportamento legado preservado)

Dado type inválido (ex. "SAVING")
Então VALIDATION_ERROR (400)
```

### 8.2 Dashboard

```
Dado no período: INCOME 5000, EXPENSE 1800, INVESTMENT 2000, openingBalance 0
Quando GetDashboardSummary
Então totalIncome=5000, totalExpense=1800, totalInvestment=2000, openingBalance=0, balance=3200
     byCategory só categorias de EXPENSE

Dado mês anterior encerrou com 30000 (entradas − despesas anteriores)
Quando GetDashboardSummary do mês seguinte sem movimentos
Então openingBalance=30000, balance=30000
```

### 8.3 Relatório geral (frontend)

```
Dado filtro Tipo = Investimentos
Quando a página carrega GET /api/transactions?...&type=INVESTMENT
Então tabela só investimentos; card de investimentos = soma; resultado = 0 − 0
     (não há entradas/despesas no recorte)

Dado filtro Tipo = Todos
Então cards somam cada tipo à parte; resultado = soma INCOME − soma EXPENSE
```

### 8.4 Relatório de cartão

```
Dado no mês 08/2026:
  EXPENSE CREDIT_1X 8500
  EXPENSE INSTALLMENT parcela 2/12 com date em agosto, amount 30000
  EXPENSE CASH 15000
  INVESTMENT CREDIT_1X 5000
Quando GetCreditCardReport(month=8, year=2026)
Então credit1x inclui 8500 e 5000 (totalCredit1x=13500)
     installment inclui 30000
     CASH não entra
     total=43500

Dado usuário B com compras no cartão
Quando A chama o relatório
Então compras de B não aparecem

Dado lançamento soft-deleted CREDIT_1X
Então não entra nos totais nem nas listas

Dado mês/ano omitidos
Então usa o período atual do relógio (mesmo padrão do dashboard)

Dado month sem year (ou o inverso)
Então VALIDATION_ERROR (400)
```

---

## 9. API (contratos a acrescentar em `docs/API.md`)

Auth: `Authorization: Bearer <token>`. IDs inteiros sequenciais. Erros `{ code, message, details? }`. Valores em centavos.

### 9.1 Extensões em rotas existentes

| Recurso | Mudança |
|---------|---------|
| `TransactionType` | enum `INCOME`, `EXPENSE`, `INVESTMENT` |
| `POST /api/transactions` | `type` aceita `INVESTMENT`; exemplo OpenAPI de investimento à vista |
| `PATCH /api/transactions/:id` | idem |
| `GET /api/transactions` | query `type` aceita `INVESTMENT` |
| `GET /api/dashboard/summary` | resposta inclui `totalInvestment` (int) |

Exemplo de criação:

```json
{
  "type": "INVESTMENT",
  "name": "Tesouro Selic",
  "amount": 100000,
  "categoryId": 11,
  "paymentType": "CASH",
  "date": "2026-08-30T18:00:00.000Z"
}
```

`categoryId` é o id real da categoria Investimentos após o seed (não hardcodar `11` na implementação).

### 9.2 Nova rota — relatório de cartão

| Método | Endpoint | Query | Sucesso |
|--------|----------|-------|---------|
| GET | `/api/credit-card/report` | `month`, `year` (juntos ou omitidos → mês atual) | `200` corpo abaixo |

```json
{
  "period": { "month": 8, "year": 2026 },
  "totalCredit1x": 13500,
  "totalInstallment": 30000,
  "total": 43500,
  "credit1xCount": 2,
  "installmentCount": 1,
  "credit1x": [ { "…Transaction" } ],
  "installments": [ { "…Transaction" } ]
}
```

Cada item em `credit1x` e `installments` usa o **mesmo serializer** de `GET /api/transactions` (inclui `category`; **sem** `member`, escopo pessoal). Ordenação: `date desc`, depois `createdAt desc`.

Erros:

| Status | code | Quando |
|--------|------|--------|
| 400 | `VALIDATION_ERROR` | período inválido |
| 401 | `UNAUTHENTICATED` | token ausente/inválido |

Não criar query `paymentTypes` em `GET /api/transactions` nesta entrega — o relatório de cartão tem endpoint próprio.

---

## 10. Arquitetura backend (hexagonal)

### 10.1 Onde colocar

| Camada | Conteúdo |
|--------|----------|
| `domain/transaction/` | `TransactionType` inclui `INVESTMENT`; sem entidade nova |
| `application/ports/inbound/transactions.ts` | `TransactionType` já flui; sem mudança de assinatura além do union |
| `application/ports/inbound/credit-card.ts` | `GetCreditCardReport` |
| `application/ports/outbound/transaction-repository.ts` | `summary` passa a devolver `totalInvestment`; novo método `creditCardReport(userId, period)` **ou** `list` com filtro de `paymentTypes` usado só pelo use case (não expor o filtro na HTTP de listagem nesta entrega) |
| `application/use-cases/dashboard/` | `balance` inalterado; passar `totalInvestment` adiante |
| `application/use-cases/credit-card/` | `GetCreditCardReportUseCase` |
| `adapters/outbound/prisma/` | mapper `toPrismaType` vira `switch` com `INVESTMENT`; `summary` agrega o terceiro tipo; query do relatório filtra `paymentType in (CREDIT_1X, INSTALLMENT)` |
| `adapters/inbound/http/` | DTO Zod (`INVESTMENT` + schema do report); `CreditCardController`; rota em `api-routes.ts`; OpenAPI |
| `main.ts` | wiring do use case e controller |

Proibido: Prisma no domain/use case; Zod fora de `adapters/inbound/http/dto/`; instanciar repositório no controller.

### 10.2 Port inbound

```ts
export interface CreditCardReport {
  period: { month: number; year: number };
  totalCredit1x: number;
  totalInstallment: number;
  total: number;
  credit1xCount: number;
  installmentCount: number;
  credit1x: Transaction[];
  installments: Transaction[];
}

export interface GetCreditCardReport {
  execute(userId: number, period?: { month: number; year: number }): Promise<CreditCardReport>;
}
```

Totais são soma em centavos no servidor (não confiar em soma no cliente como fonte de verdade).

### 10.3 Testes obrigatórios (`npm test` em `backend/`)

Use cases com ports fake:

- criar `INVESTMENT` à vista e parcelado
- dashboard: investimento não entra em `totalExpense` / `balance`; entra em `totalInvestment`
- listar com `type=INVESTMENT` não devolve `EXPENSE`
- relatório de cartão: inclui `CREDIT_1X` e `INSTALLMENT` do mês; exclui `CASH`; exclui `deletedAt`; isola `userId`
- investimento `CREDIT_1X` entra no relatório de cartão (no grupo 1x)
- período omitido usa o relógio

Não exigir suíte HTTP extra além do que o repo já fizer para contrato; atualizar OpenAPI é obrigatório.

---

## 11. Frontend

### 11.1 Rotas

| Rota | Mudança |
|------|---------|
| `/lancamentos/novo` e edição | opção Investimento no select Tipo |
| `/lancamentos` | filtro Tipo + chip/Amount |
| `/relatorios` | filtro Tipo + card de investimentos + chip na tabela |
| `/` (dashboard) | bloco “Investimentos do período” |
| `/cartao-credito` | substitui `ComingSoon` pelo relatório mensal |

Sem rota nova. Item de menu “Cartão de crédito” já existe no `AppShell`.

### 11.2 UI (MUI)

- Selects: `TextField select` + `MenuItem` (não recriar em CSS)
- Relatório de cartão: `PageHeader` + `PeriodFilter` + cards `Paper` + duas `Table` (ou uma tabela com seção por grupo)
- Empty: componente `Empty` existente
- Loading: `CircularProgress`
- Erro: `Alert`
- Datas: `formatDateTime` (`DD/MM/YYYY HH:mm:ss`)
- Valores: `Amount`; 1x e parcelas usam tone `expense` (saída via cartão). Investimento na listagem/relatório geral: tone `plain`
- Chip investimento: `variant="outlined"`, label `Investimento` (sem `color="success"` / `error"`)
- Não adicionar terceira cor saturada na paleta (`tokens`); tese visual permanece verde/vermelho só em dinheiro de entrada/despesa

Copy (sentence case):

- Página cartão: eyebrow `Fatura`, título `Cartão de crédito`, descrição `Compras à vista em 1x e parcelas que caem neste mês.`
- Cards: `À vista (1x)`, `Parceladas`, `Total do mês`
- Seções: `Compras à vista (1x)`, `Parcelas do mês`
- Empty: convite a lançar compra com pagamento crédito 1x ou parcelado

Gráfico da dashboard: **não** incluir investimentos na série de saídas.

### 11.3 Tipos e cliente

- `frontend/lib/types.ts`: `TransactionType = 'INCOME' \| 'EXPENSE' \| 'INVESTMENT'`; `Summary` ganha `totalInvestment`
- `services.creditCardReport(month, year)` → `GET /api/credit-card/report`
- `queryKeys.creditCard(month, year)`
- Formulário Zod: `type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT'])`
- Invalidar `creditCard` + `summary` + `transactions` + `report` após criar/editar/excluir lançamento

### 11.4 Acessibilidade e responsivo

- Tabelas com scroll horizontal em viewport estreita (`minWidth` como em `/lancamentos`)
- Cards empilham em `xs`, lado a lado em `md`
- Foco visível padrão MUI do tema

### 11.5 Documentação de componentes

Atualizar/criar `.md` da página de cartão e do formulário de lançamento se o repo documentar esses pontos (`docs/components/` ou ao lado do componente), conforme [`PRD.md`](./PRD.md) §11.

---

## 12. Ordem de implementação sugerida

| Fase | Entrega | Pronto quando |
|------|---------|---------------|
| F1 | Prisma: enum `INVESTMENT` + seed categoria + mapper | migrate + seed ok |
| F2 | Create/list/update + dashboard `totalInvestment` + testes | `npm test` cobre §8.1–8.2 |
| F3 | Use case `GetCreditCardReport` + HTTP + OpenAPI + `API.md` | Swagger lista a rota |
| F4 | Frontend: tipo no form, listagem, relatório, dashboard | US-INV-01 a 03 |
| F5 | Frontend: `/cartao-credito` | US-CC-01 |

Não misturar com refactors não pedidos. Wiring só em `main.ts`. Após backend: `npm test` e `npm run build` em `backend/`.

---

## 13. Definition of Done

- [ ] Migration Prisma com `INVESTMENT`; seed de categoria `investimentos`
- [ ] Use cases testados com fakes (investimento + relatório de cartão)
- [ ] `npm test` e `npm run build` ok em `backend/`
- [ ] `docs/API.md` e OpenAPI: enum, `totalInvestment`, `GET /api/credit-card/report`
- [ ] Formulário cria investimento; listagem e relatório filtram o tipo
- [ ] Dashboard: saldo/saídas sem investimento; card de investimentos visível
- [ ] `/cartao-credito`: totais 1x, parceladas e total; duas listagens; `CASH` ausente
- [ ] Soft delete e isolamento por usuário preservados
- [ ] Sem violação hexagonal (`AGENTS.md`)
- [ ] [`PRD.md`](./PRD.md) deixa de tratar cartão como placeholder desta entrega (link para este documento)

---

## 14. Decisões fechadas nesta spec

| Tema | Decisão |
|------|--------|
| Identificador do tipo | `INVESTMENT` (inglês, alinhado a `INCOME` / `EXPENSE`); label UI “Investimento” |
| Efeito no saldo | Investimento **não** entra em `totalExpense`, `openingBalance` nem em `balance` |
| Cor do valor | `Amount` `plain` (tinta); sem novo token saturado |
| Categoria obrigatória | Sim, como os outros tipos; seed oferece “Investimentos” |
| Pagamento de investimento | Mesmas opções (`CASH`, `CREDIT_1X`, `INSTALLMENT`) |
| Cartão: fonte | Somente `CREDIT_1X` e `INSTALLMENT` do próprio usuário no mês da `date` |
| Cartão: API | Endpoint dedicado `GET /api/credit-card/report` (não filtrar só no cliente) |
| Cartão: família | Fora desta entrega |
| Fatura / vencimento / vários cartões | Fora desta entrega |
| Listagem `/lancamentos` | Inclui filtro do novo tipo (necessário para o CRUD ficar coerente) |

---

## 15. Relação com o PRD base

Esta entrega:

1. estende US-05 (tipos de lançamento) e US-06 (filtro do relatório) de [`PRD.md`](./PRD.md)
2. materializa o item de roadmap “cartão de crédito completo” no corte **relatório mensal 1x vs parcelas** (não gestão de fatura)

Após merge da implementação, atualizar no `PRD.md`:

- `Transaction.type`: incluir `INVESTMENT`
- filtro do relatório: Entrada / Despesa / Investimento
- `/cartao-credito`: deixar de ser placeholder; apontar para este documento
- dashboard: mencionar `totalInvestment`
- fora de escopo v1: remover “cartão apenas placeholder” ou marcar como entregue via este PRD
