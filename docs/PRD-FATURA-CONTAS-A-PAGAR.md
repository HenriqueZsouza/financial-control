# PRD — Fechamento de fatura e relatório de contas a pagar

**Produto:** Financial Control  
**Documento:** Spec de produto + contratos de implementação  
**Versão:** 1.0  
**Status:** Pronto para implementação  
**Data:** 30/08/2026  
**Escopo:** `backend/` + `frontend/`  
**Fonte de verdade do produto base:** [`PRD.md`](./PRD.md)  
**Relatório mensal do cartão (já especificado):** [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md)  
**Contrato HTTP vigente (antes desta feature):** [`API.md`](./API.md)  
**Arquitetura backend:** hexagonal — [`PRD-HEXAGONAL.md`](./PRD-HEXAGONAL.md) + `AGENTS.md`

Este documento é **spec-driven**: a implementação segue os contratos, cortes, regras e critérios abaixo. Código que não estiver previsto nesta spec não entra no PR. Qualquer desvio de rota, payload, status ou erro exige atualizar este PRD e [`API.md`](./API.md) no mesmo PR.

---

## 1. Problema

Compras no cartão (`CREDIT_1X` e `INSTALLMENT`) já entram no relatório de `/cartao-credito`, mas **não viram obrigação de pagamento**. O usuário vê o que caiu no mês e não tem como dizer “esta fatura fechou; agora eu devo pagar na data X”.

A home também não mostra a fatura em aberto. `/contas-a-pagar` continua placeholder.

Sem um fechamento **explícito**:

1. a fatura se confundiria com o calendário (fechar no fim do mês sem o usuário pedir)
2. não existiria uma conta a pagar gerada a partir do cartão
3. parcelas futuras e compras ainda não fechadas se misturariam com o que já foi “faturado”

**Invariante desta entrega:** a fatura **nunca** fecha sozinha — nem por virada de mês, nem por vencimento, nem pelo filtro de período da home. Fecha **somente** quando o usuário clica em **Fechar fatura** e confirma.

---

## 2. Objetivo

Entregar, de ponta a ponta:

1. na **home**, um card **Cartão de crédito** com a **fatura atual** (compras/parcelas em aberto) e o botão **Fechar fatura**
2. um **modal** para escolher a **data de vencimento** e confirmar o fechamento
3. ao confirmar, criar uma **conta a pagar** (snapshot do total fechado) visível em `/contas-a-pagar`
4. a tela `/contas-a-pagar` deixa de ser placeholder e vira **relatório** filtrável por mês (vencimento)
5. backend hexagonal (domain → application/ports → adapters; wiring só em `main.ts`)
6. contrato HTTP, OpenAPI e [`API.md`](./API.md) alinhados

O **cadastro manual** de contas a pagar **não** entra nesta entrega; a tela de cadastro será desenvolvida em seguida.

---

## 3. Fora de escopo

- Cadastro, edição e exclusão manuais de contas a pagar (tela de formulário)
- Marcar conta como paga, conciliar pagamento, juros de atraso
- Entidade “cartão” (bandeira, final, limite, dia de fechamento automático, vários cartões)
- Fechamento automático por calendário, cron ou virada de mês
- Recálculo da conta a pagar se o usuário alterar lançamentos depois (o valor é snapshot; ver §5.4)
- Juros, rotativo, anuidade, cashback
- Escopo familiar (`scope=family`) na fatura e nas contas a pagar — permanece pessoal
- A fatura fechada **não** gera um novo lançamento `EXPENSE` (as compras já foram lançadas)
- Exportação PDF/Excel
- Telegram / Hermes Agent
- OAuth, 2FA, deploy

**Invariantes existentes (não negociáveis):** soft delete, valores em centavos (`Int`), parcelamento com resto na última parcela e avanço de meses em UTC, JWT Bearer, erros `{ code, message, details? }`, enums Prisma não vazam ao domínio, isolamento por `userId`.

---

## 4. Personas e glossário

| Termo | Definição |
|-------|-----------|
| Fatura em aberto (fatura atual) | Conjunto de linhas `CREDIT_1X` + `INSTALLMENT` do usuário, `deletedAt: null`, **ainda sem** conta a pagar vinculada, com `date <= agora` (relógio do servidor) |
| Fechar fatura | Ação **explícita** do usuário: congela esse conjunto, soma os valores e cria uma conta a pagar com a data de vencimento escolhida |
| Conta a pagar | Obrigação com vencimento e valor em centavos. Nesta entrega, a origem é só o fechamento da fatura (`source = CREDIT_CARD_INVOICE`) |
| Snapshot | O `amount` da conta a pagar é o total no instante do fechamento; não muda depois |
| Relatório de contas a pagar | `/contas-a-pagar`: listagem filtrada pelo **mês/ano do vencimento** |
| Relatório de cartão | `/cartao-credito` (PRD anterior): continua por competência da `date` da linha, **independente** de a fatura ter sido fechada |

---

## 5. Regras de negócio

### 5.1 A fatura só fecha com clique

1. **Nenhum** job, trigger, virada de mês, filtro da dashboard ou leitura de relatório fecha fatura.
2. `GET` (home, relatório de cartão, contas a pagar) é **somente leitura**.
3. O único comando de fechamento é `POST /api/credit-card/invoices/close` disparado pelo botão **Fechar fatura** + confirmação no modal.
4. Abrir o modal **não** fecha. Cancelar **não** fecha. Falha de rede **não** fecha (não há rascunho).

### 5.2 O que entra na fatura atual

1. **Fonte:** lançamentos do usuário autenticado com `deletedAt: null`, `paymentType` em `{ CREDIT_1X, INSTALLMENT }` e **sem** `payableId`.
2. **CASH não entra.**
3. **Competência até agora:** `date <= clock.now()`. Parcelas **futuras** (`date` depois do fechamento) **permanecem em aberto** para um fechamento posterior.
4. Compras/parcelas de **meses anteriores nunca fechados** entram neste fechamento (não ficam órfãs).
5. `INCOME`, `EXPENSE` e `INVESTMENT` no cartão entram todos: o que importa é a forma de pagamento, não o tipo. O usuário deve o valor ao cartão.
6. Isolamento: somente `userId` do token.

### 5.3 Fechamento

1. O modal exige **data de vencimento** (`dueDate`, calendário `YYYY-MM-DD`). Sem data, não confirma.
2. Data de vencimento **obrigatória**; pode ser hoje, futura ou passada (fechamento atrasado). Não há default implícito que feche sem o usuário escolher — o DatePicker pode **sugerir** `hoje + 10 dias`, mas o POST só ocorre no confirmar.
3. Se não houver nenhuma linha em aberto no critério §5.2: erro de domínio `EMPTY_OPEN_INVOICE` (422). O botão na home fica **desabilitado** quando o total em aberto é `0`.
4. Operação **atômica**:
   - cria `Payable` com `amount` = soma das linhas selecionadas, `dueDate`, `source = CREDIT_CARD_INVOICE`, `status = PENDING`, `closedAt = clock.now()`
   - grava `payableId` em **todas** as linhas selecionadas
5. Nome gerado pelo servidor (não editável nesta entrega): `Fatura do cartão · venc. DD/MM/YYYY` (vencimento escolhido).
6. Fechar de novo, depois de novas compras/parcelas elegíveis, cria **outra** conta a pagar. Não há “uma fatura por mês” imposta pelo sistema.
7. Dois fechamentos concorrentes: o segundo, sem linhas restantes, recebe `EMPTY_OPEN_INVOICE`.

### 5.4 Lançamentos depois do fechamento

1. O valor da conta a pagar **não é recalculado**.
2. Soft delete ou alteração de valor de lançamento **já vinculado** a uma fatura fechada: **proibido** (`INVOICE_LOCKED`, 422). Nome/categoria/tipo seguem as regras atuais de `PATCH`, desde que não mudem `amount` nem `paymentType`.
3. Novos lançamentos de cartão nascem com `payableId = null` (fatura em aberto).
4. **Não** criar `EXPENSE` extra no fechamento. Saldo, `totalExpense` e gráficos da home **não mudam** por causa do close. A conta a pagar é obrigação, não despesa nova.

### 5.5 Relatório de contas a pagar

1. Lista contas do usuário com `deletedAt: null`, filtradas pelo **mês/ano de `dueDate`**.
2. Período omitido → mês/ano corrente (mesmo padrão do dashboard). `month` sem `year` (ou o inverso) → `VALIDATION_ERROR`.
3. Totais no servidor: `totalAmount` (soma em centavos), `count`.
4. Cadastro manual não existe: a lista pode estar vazia até o primeiro fechamento.
5. Sem `scope=family`.
6. Privacidade: valores respeitam o olho da sessão (`valuesVisible`).

### 5.6 Card da home

1. O card **não** segue o `PeriodFilter` da dashboard. Sempre mostra a **fatura em aberto agora** (§5.2).
2. Exibe: total em aberto, quantidade de linhas, totais à vista (1x) e parceladas.
3. Botão **Fechar fatura** (sentence case). Desabilitado se total = 0.
4. Link secundário para `/cartao-credito` (texto: `Ver relatório`).
5. Valores com `Amount` e olho da sessão.

---

## 6. User stories e critérios de aceite

### US-INV-CC-01 — Ver fatura atual na home

**Como** usuário, **quero** ver no início um card de cartão de crédito com a fatura atual **para** saber quanto está em aberto antes de fechar.

**Critérios de aceite:**
- [ ] Home (`/`) exibe card **Cartão de crédito** abaixo (ou ao lado, empilhado em `xs`) do bloco de saldo, visível junto com o resumo
- [ ] Mostra total da fatura em aberto, contagem, à vista (1x) e parceladas
- [ ] `CASH` não entra; soft-deleted não entram; parcelas com `date` futura não entram
- [ ] Compras de meses anteriores não fechadas entram no total
- [ ] Trocar o mês do `PeriodFilter` **não** altera o card da fatura em aberto
- [ ] Empty: total `0`, copy `Nenhuma compra em aberto para fechar.` e botão desabilitado
- [ ] Loading/erro do card não derrubam o restante da dashboard (query própria)
- [ ] Valores com `Amount` + olho

### US-INV-CC-02 — Fechar fatura com vencimento

**Como** usuário, **quero** fechar a fatura escolhendo a data de vencimento **para** gerar uma conta a pagar.

**Critérios de aceite:**
- [ ] Botão **Fechar fatura** abre modal (não navega)
- [ ] Modal mostra o total que será fechado e um `DatePicker` de vencimento (obrigatório)
- [ ] Confirmar chama `POST /api/credit-card/invoices/close` com `dueDate`
- [ ] Sucesso: Snackbar, modal fecha, card zera (ou resta só o que não era elegível), item aparece em `/contas-a-pagar`
- [ ] Cancelar não chama a API
- [ ] Sem linhas em aberto: 422 `EMPTY_OPEN_INVOICE`; UI não oferece o clique útil (botão disabled)
- [ ] Dashboard `balance` / `totalExpense` inalterados após o close
- [ ] Relatório `/cartao-credito` do mês das linhas **continua** listando essas compras (fechou a obrigação, não apaga o histórico)

### US-PAY-01 — Relatório de contas a pagar por mês

**Como** usuário, **quero** ver as contas a pagar do mês **para** acompanhar vencimentos (incluindo a fatura fechada).

**Critérios de aceite:**
- [ ] `/contas-a-pagar` deixa de ser `ComingSoon`
- [ ] `PeriodFilter` (padrão: mês vigente); filtro pela data de **vencimento**
- [ ] Tabela: nome, origem (chip `Fatura do cartão`), vencimento (`DD/MM/YYYY`), valor
- [ ] Card/total: soma do período e quantidade
- [ ] Empty quando não houver contas no mês; copy deixa claro que o cadastro manual virá depois e que fechar a fatura na home gera a primeira conta
- [ ] Loading e Alert de erro
- [ ] Sem botão “Nova conta” nesta entrega
- [ ] Menu “Contas a pagar” deixa de ser tratado como placeholder

---

## 7. Modelo de dados

### 7.1 Enums novos (domínio + Prisma, mapeados no adapter)

```
PayableSource: CREDIT_CARD_INVOICE
PayableStatus: PENDING
```

Nesta entrega o union tem **um** valor cada. O cadastro manual futuro acrescentará `MANUAL` e o pagamento acrescentará `PAID` — **não** implementar esses valores agora.

Migration: criar os enums no PostgreSQL. Não recriar enums existentes.

### 7.2 Payable (novo)

| Campo | Tipo | Regra |
|-------|--------|--------|
| `id` | Int sequencial | PK |
| `userId` | Int | dono; índice |
| `name` | String | gerado no close |
| `amount` | Int | centavos; snapshot |
| `dueDate` | DateTime | calendário; filtro do relatório usa mês/ano UTC desta data |
| `source` | PayableSource | `CREDIT_CARD_INVOICE` |
| `status` | PayableStatus | `PENDING` |
| `closedAt` | DateTime | instante do close (`clock.now()`) |
| `createdAt` / `updatedAt` | DateTime | |
| `deletedAt` | DateTime? | soft delete (sem API de delete nesta entrega) |

Índices: `userId + dueDate`, `userId + deletedAt`.

`@@map("payables")`.

### 7.3 Transaction

Nova coluna opcional:

| Campo | Tipo | Regra |
|-------|--------|--------|
| `payableId` | Int? | `null` = em aberto; preenchido no close; FK para `payables` |

Índice: `payableId`.

Nenhuma mudança em `TransactionType` / `PaymentType`.

### 7.4 Relação

- Um `Payable` tem N `Transaction`.
- Uma `Transaction` tem no máximo um `payableId`.
- Contas manuais futuras não terão transações vinculadas; o modelo já permite `Payable` sem linhas.

---

## 8. Contratos de comportamento (spec)

### 8.1 Fatura em aberto

```
Dado EXPENSE CREDIT_1X 8500 (date = agora), EXPENSE INSTALLMENT parcela futura (date = +1 mês),
     EXPENSE CASH 15000, EXPENSE CREDIT_1X já vinculada a outro payable
Quando GetOpenCreditCardInvoice
Então total = 8500, credit1xCount = 1, installmentCount = 0
     CASH, parcela futura e linha já fechada não entram

Dado CREDIT_1X de julho ainda sem payableId e hoje é 30/08/2026
Quando GetOpenCreditCardInvoice
Então a linha de julho entra (mês anterior não fechado)

Dado usuário B com compras em aberto
Quando A consulta a fatura em aberto
Então compras de B não aparecem
```

### 8.2 Fechar fatura

```
Dado fatura em aberto total 43500 e dueDate = 2026-09-10
Quando CloseCreditCardInvoice
Então cria Payable amount=43500, dueDate=2026-09-10, source=CREDIT_CARD_INVOICE, status=PENDING
     as linhas elegíveis recebem payableId
     GetOpenCreditCardInvoice passa a total=0 (salvo novas linhas ou futuras)
     GetDashboardSummary inalterado em totalExpense e balance

Dado fatura em aberto vazia
Quando CloseCreditCardInvoice
Então EMPTY_OPEN_INVOICE (422); nenhum Payable criado

Dado dueDate ausente ou inválida
Quando POST close
Então VALIDATION_ERROR (400)

Dado usuário não autenticado
Então UNAUTHENTICATED (401)
```

### 8.3 Contas a pagar

```
Dado Payable vencendo em 10/09/2026
Quando ListPayables(month=9, year=2026)
Então o item entra em items e em totalAmount

Dado o mesmo Payable
Quando ListPayables(month=8, year=2026)
Então não entra

Dado month sem year
Então VALIDATION_ERROR (400)

Dado período omitido em 30/08/2026
Então filtra agosto/2026
```

### 8.4 Lançamento travado

```
Dado lançamento com payableId preenchido
Quando DeleteTransaction
Então INVOICE_LOCKED (422); deletedAt permanece null

Dado o mesmo lançamento
Quando PATCH amount ou paymentType
Então INVOICE_LOCKED (422)
```

---

## 9. API (contratos a acrescentar em `docs/API.md`)

Auth: `Authorization: Bearer <token>`. IDs inteiros sequenciais. Erros `{ code, message, details? }`. Valores em centavos. Datas de vencimento: `YYYY-MM-DD`.

### 9.1 Fatura em aberto

| Método | Endpoint | Query | Sucesso |
|--------|----------|-------|---------|
| GET | `/api/credit-card/open-invoice` | — | `200` |

```json
{
  "total": 43500,
  "totalCredit1x": 13500,
  "totalInstallment": 30000,
  "credit1xCount": 2,
  "installmentCount": 1,
  "itemCount": 3
}
```

Sem lista completa de lançamentos neste endpoint (o detalhe continua em `GET /api/credit-card/report`). Totais calculados no servidor.

### 9.2 Fechar fatura

| Método | Endpoint | Corpo | Sucesso |
|--------|----------|-------|---------|
| POST | `/api/credit-card/invoices/close` | `{ "dueDate": "2026-09-10" }` | `201` Payable |

```json
{
  "id": 1,
  "name": "Fatura do cartão · venc. 10/09/2026",
  "amount": 43500,
  "dueDate": "2026-09-10",
  "source": "CREDIT_CARD_INVOICE",
  "status": "PENDING",
  "closedAt": "2026-08-30T21:00:00.000Z",
  "createdAt": "2026-08-30T21:00:00.000Z"
}
```

Erros:

| Status | code | Quando |
|--------|------|--------|
| 400 | `VALIDATION_ERROR` | `dueDate` ausente/inválida |
| 401 | `UNAUTHENTICATED` | token ausente/inválido |
| 422 | `EMPTY_OPEN_INVOICE` | nada em aberto para fechar |

### 9.3 Relatório de contas a pagar

| Método | Endpoint | Query | Sucesso |
|--------|----------|-------|---------|
| GET | `/api/payables` | `month`, `year` (juntos ou omitidos → mês atual) | `200` |

```json
{
  "period": { "month": 9, "year": 2026 },
  "totalAmount": 43500,
  "count": 1,
  "items": [
    {
      "id": 1,
      "name": "Fatura do cartão · venc. 10/09/2026",
      "amount": 43500,
      "dueDate": "2026-09-10",
      "source": "CREDIT_CARD_INVOICE",
      "status": "PENDING",
      "closedAt": "2026-08-30T21:00:00.000Z",
      "createdAt": "2026-08-30T21:00:00.000Z"
    }
  ]
}
```

Ordenação: `dueDate asc`, depois `id asc`.

Erros: `400 VALIDATION_ERROR` (período), `401 UNAUTHENTICATED`.

Não criar `POST /api/payables` nesta entrega.

### 9.4 Rotas existentes

| Recurso | Mudança |
|---------|---------|
| `GET /api/credit-card/report` | Sem mudança de contrato. Continua por `date` do mês, **incluindo** linhas já fechadas |
| `GET /api/dashboard/summary` | Sem campos novos (fatura em aberto é endpoint próprio) |
| `DELETE` / `PATCH` transação | passam a poder responder `422 INVOICE_LOCKED` |

---

## 10. Arquitetura backend (hexagonal)

### 10.1 Onde colocar

| Camada | Conteúdo |
|--------|----------|
| `domain/payable/` | `Payable`, `PayableSource`, `PayableStatus`; sem Prisma |
| `domain/transaction/` | `payableId: number \| null` na entidade |
| `domain/shared/errors.ts` | `EMPTY_OPEN_INVOICE`, `INVOICE_LOCKED` |
| `application/ports/inbound/credit-card.ts` | `GetOpenCreditCardInvoice`, `CloseCreditCardInvoice` |
| `application/ports/inbound/payables.ts` | `ListPayables`, tipo `Payable` de aplicação se não reexportar o domínio |
| `application/ports/outbound/payable-repository.ts` | `create`, `list(userId, period)` |
| `application/ports/outbound/transaction-repository.ts` | `listOpenCreditCard(userId, now)`, `attachPayable(ids, payableId)`; `findActiveById` / delete / update consultam `payableId` |
| `application/use-cases/credit-card/` | `GetOpenCreditCardInvoiceUseCase`, `CloseCreditCardInvoiceUseCase` |
| `application/use-cases/payables/` | `ListPayablesUseCase` |
| `application/use-cases/transactions/` | delete/update: se `payableId` → `INVOICE_LOCKED` |
| `adapters/outbound/prisma/` | models, mapper de enums, transação Prisma **dentro do adapter** no close (criar payable + updateMany das linhas). Use case **não** importa Prisma |
| `adapters/inbound/http/` | DTOs Zod, `CreditCardController` (open + close), `PayableController`, rotas, OpenAPI |
| `error-presenter.ts` | `EMPTY_OPEN_INVOICE` e `INVOICE_LOCKED` → 422 |
| `main.ts` | wiring |

Proibido: Prisma no domain/use case; Zod fora de `adapters/inbound/http/dto/`; instanciar repositório no controller.

O close precisa de atomicidade. Opções alinhadas ao hexágono:

- **Preferida:** port outbound `closeInvoice(userId, dueDate, closedAt, name, items)` implementado no adapter Prisma com `$transaction`, **ou**
- `PayableRepository.create` + `TransactionRepository.attachPayable` executados pelo use case **somente se** o adapter de payable receber um port de unidade de trabalho já existente. Se o repo **não** tiver UoW, o adapter de payable (ou um `PrismaCreditCardInvoiceRepository`) encapsula os dois writes numa transação. O use case continua falando com **um** port de comando `CloseInvoiceStore`.

Não abrir `$transaction` no use case.

### 10.2 Ports inbound (esboço)

```ts
export interface OpenCreditCardInvoice {
  total: number;
  totalCredit1x: number;
  totalInstallment: number;
  credit1xCount: number;
  installmentCount: number;
  itemCount: number;
}

export interface GetOpenCreditCardInvoice {
  execute(userId: number): Promise<OpenCreditCardInvoice>;
}

export interface CloseCreditCardInvoice {
  execute(userId: number, input: { dueDate: Date }): Promise<Payable>;
}

export interface PayableList {
  period: { month: number; year: number };
  totalAmount: number;
  count: number;
  items: Payable[];
}

export interface ListPayables {
  execute(userId: number, period?: { month: number; year: number }): Promise<PayableList>;
}
```

### 10.3 Testes obrigatórios (`npm test` em `backend/`)

Use cases com ports fake:

- fatura em aberto: inclui `CREDIT_1X`/`INSTALLMENT` sem `payableId` e `date <= now`; exclui `CASH`, `deletedAt`, `date` futura, outro `userId`, já fechadas
- close: cria payable com soma correta, vincula ids, esvazia a fatura em aberto
- close com lista vazia → `EMPTY_OPEN_INVOICE`
- close **não** altera `totalExpense` / `balance`
- parcelas futuras não entram no close de hoje e entram num close depois que `date` chegar
- list payables filtra por mês de `dueDate`; período omitido usa o relógio
- delete/update de valor em lançamento com `payableId` → `INVOICE_LOCKED`
- isolamento por `userId`

Atualizar OpenAPI é obrigatório. Não exigir suíte HTTP extra além do padrão do repo.

Após backend: `npm test` e `npm run build` em `backend/`.

---

## 11. Frontend

### 11.1 Rotas

| Rota | Mudança |
|-------|---------|
| `/` | card **Cartão de crédito** + modal de fechamento |
| `/contas-a-pagar` | substitui `ComingSoon` pelo relatório mensal |
| `/cartao-credito` | sem mudança de layout obrigatória |

Sem rota de “nova conta a pagar”.

### 11.2 UI (MUI)

- Card da home: `Paper` + `Typography` overline `Cartão de crédito` + `Amount` (tone `expense`) + `Button` **Fechar fatura** + `Button` text **Ver relatório**
- Modal: `Dialog` próprio (`CloseInvoiceDialog`) — **não** reutilizar `ConfirmDialog` (esse é destrutivo, botão error, sem DatePicker)
  - título: `Fechar fatura`
  - texto: total a fechar
  - `DatePicker` (`DATE_FORMAT`) label `Vencimento`
  - ações: `Cancelar` / `Confirmar fechamento` (`contained`, **não** `color="error"`)
- Relatório: `PageHeader` + `PeriodFilter` + card de total + `Table`
- Empty / `CircularProgress` / `Alert` / Snackbar (`useFeedback`)
- Chip origem: `variant="outlined"`, label `Fatura do cartão`
- Vencimento: `DD/MM/YYYY` (calendário). Não usar `new Date()` / `toLocaleDateString`
- Cards empilham em `xs`

Copy (sentence case):

- Card home: overline `Cartão de crédito`; apoio `Fatura em aberto`; botão `Fechar fatura`
- Empty do card: `Nenhuma compra em aberto para fechar.`
- Página contas: eyebrow `Vencimentos`, título `Contas a pagar`, descrição `Contas com vencimento neste mês. O cadastro manual será liberado em breve; por enquanto elas nascem ao fechar a fatura do cartão.`
- Empty da tabela: `Nenhuma conta a pagar neste mês.`
- Snackbar sucesso: `Fatura fechada. A conta a pagar foi lançada.`

### 11.3 Tipos e cliente

- `Payable`, `OpenCreditCardInvoice`, `PayableList` em `frontend/lib/types.ts`
- `services.openCreditCardInvoice()`, `closeCreditCardInvoice({ dueDate })`, `payables(month, year)`
- `queryKeys.openInvoice`, `queryKeys.payables(month, year)`
- Após close: invalidar `openInvoice`, `payables`, `creditCard`, `transactions` (não é necessário invalidar `summary` por mudança de saldo, mas pode invalidar se o lock afetar listagens)

### 11.4 Acessibilidade e responsivo

- Foco no DatePicker ao abrir o modal
- Tabela com scroll horizontal em viewport estreita
- Botão disabled com tooltip ou texto de apoio quando total = 0

### 11.5 Documentação de componentes

Atualizar [`docs/components.md`](./components.md): card da home, `CloseInvoiceDialog`, página `/contas-a-pagar`.

---

## 12. Ordem de implementação sugerida

| Fase | Entrega | Pronto quando |
|------|---------|---------------|
| F1 | Prisma: `Payable`, enums, `Transaction.payableId` | migrate ok |
| F2 | Use cases open + close + list + lock no delete/update + testes | `npm test` cobre §8 |
| F3 | HTTP + OpenAPI + `API.md` | Swagger lista as três rotas |
| F4 | Frontend: card + modal na home | US-INV-CC-01 e 02 |
| F5 | Frontend: `/contas-a-pagar` | US-PAY-01 |

Não misturar com cadastro manual nem com “marcar como pago”. Wiring só em `main.ts`.

---

## 13. Definition of Done

- [ ] Migration Prisma: `payables` + `payableId` nas transações
- [ ] Use cases testados com fakes (open, close, list, lock, isolamento, parcela futura)
- [ ] `npm test` e `npm run build` ok em `backend/`
- [ ] `docs/API.md` e OpenAPI: open-invoice, close, GET payables, `INVOICE_LOCKED`
- [ ] Home: card da fatura em aberto; fecha **somente** no confirmar do modal
- [ ] Filtro de mês da dashboard não fecha e não muda o total em aberto
- [ ] Conta a pagar aparece no relatório do mês do **vencimento**
- [ ] Sem `POST` de cadastro manual; `/contas-a-pagar` não é mais placeholder
- [ ] Close não cria despesa nova nem altera saldo
- [ ] Soft delete e isolamento por usuário preservados
- [ ] Sem violação hexagonal (`AGENTS.md`)
- [ ] [`PRD.md`](./PRD.md) aponta para este documento

---

## 14. Decisões fechadas nesta spec

| Tema | Decisão |
|------|--------|
| Quem fecha a fatura | **Só o usuário**, no botão + confirmar. Zero automação |
| Recorte da fatura atual | Cartão em aberto, `date <= now`, qualquer mês passado não fechado; parcelas futuras de fora |
| Uma fatura por mês? | Não. Cada close gera uma conta; o usuário decide quando |
| Efeito no saldo | Nenhum. Não nasce `EXPENSE` no close |
| Vencimento | Escolhido no modal; snapshot na conta a pagar; filtro do relatório usa essa data |
| Cadastro manual | Fora; a lista pode começar vazia |
| Pagar a conta | Fora; status só `PENDING` |
| Família | Fora |
| API da fatura em aberto | Endpoint dedicado; **não** inflar `GET /api/dashboard/summary` |
| Relatório de cartão | Continua por competência; linhas fechadas **continuam** visíveis no mês da `date` |
| Modal | Dialog com DatePicker; não usar `ConfirmDialog` destrutivo |
| Card vs período da home | Independente do `PeriodFilter` |

---

## 15. Relação com o PRD base e o PRD de cartão

Esta entrega:

1. materializa o recorte **fechamento explícito de fatura → conta a pagar** do roadmap de cartão/contas (sem gestão de limite nem vários cartões)
2. **não** altera as regras de `INVESTMENT` nem o `GET /api/credit-card/report` de [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md)
3. substitui o placeholder de `/contas-a-pagar` **somente** pelo relatório; o CRUD manual permanece futuro

Após merge da implementação, atualizar no [`PRD.md`](./PRD.md):

- specs incrementais: link para este documento
- `/contas-a-pagar`: relatório por vencimento (não placeholder)
- dashboard: card de cartão com fatura em aberto
- fora de escopo v1: cadastro manual de contas a pagar e pagamento da fatura continuam fora; fechamento automático continua fora
