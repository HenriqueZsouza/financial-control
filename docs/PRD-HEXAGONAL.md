# PRD — Arquitetura Hexagonal no Backend

**Produto:** Financial Control  
**Documento:** Spec de refatoração do backend  
**Versão:** 1.0  
**Status:** Aprovado para implementação  
**Data:** 13/08/2026  
**Escopo:** somente `backend/`  
**Fonte de verdade do produto:** [`PRD.md`](./PRD.md)  
**Contrato HTTP vigente:** [`API.md`](./API.md)

Este documento é **spec-driven**: a implementação segue os contratos, cortes e critérios abaixo. Código que não estiver previsto nesta spec não entra no PR.

---

## 1. Problema

O backend atual é um Express modular (`modules/*/controller.ts`) em que **controller, validação Zod, regra de negócio e Prisma convivem no mesmo arquivo**. Exemplo: `modules/transactions/controller.ts` valida input, calcula parcelas, acessa `prisma` e monta a resposta HTTP.

Isso impede:

- testar regras de negócio sem Express/Prisma
- trocar adaptadores (JWT, bcrypt, Prisma) sem reescrever casos de uso
- orientar agentes de IA a respeitar uma arquitetura estável — hoje não existe `AGENTS.md`, `CLAUDE.md`, `.cursorrules` nem `.cursor/rules/`

A v1 do produto já atende as user stories. Esta spec **não muda comportamento**. Muda **estrutura**.

---

## 2. Objetivo

Migrar `backend/` para **Arquitetura Hexagonal** (Ports & Adapters), com composição explícita na borda da aplicação, de forma que:

1. o **domínio** não conheça Express, Prisma, JWT, bcrypt nem Zod
2. cada caso de uso dependa de **ports** (interfaces), não de implementações
3. o contrato HTTP da [`API.md`](./API.md) permaneça idêntico
4. qualquer alteração futura no backend seja guiada por documentos de agente (obrigatório — §10)

---

## 3. Fora de escopo

- Frontend (`frontend/`)
- Mudança de rotas, payloads, status codes ou códigos de erro
- Migração de schema Prisma / PostgreSQL
- Deploy, CI/CD, observabilidade de produção
- Troca de Express, Prisma, JWT ou bcrypt (apenas isolamento atrás de ports)
- Telegram / Hermes Agent
- Novas features de produto

**Invariantes de produto (não negociáveis):** isolamento por `userId`, soft delete, valores em centavos (`Int`), parcelamento com ajuste na última parcela, email único, senha com bcrypt, JWT Bearer, `{ code, message, details? }`.

---

## 4. Estado atual (as-is)

```
backend/src/
├── index.ts                          # bootstrap + wiring de rotas
├── modules/
│   ├── auth/controller.ts + routes.ts
│   ├── users/controller.ts + routes.ts
│   ├── categories/controller.ts + routes.ts
│   ├── transactions/controller.ts + routes.ts
│   └── dashboard/controller.ts + routes.ts
├── shared/
│   ├── config/index.ts
│   ├── http.ts                       # AppError + errorHandler
│   ├── prisma.ts
│   └── middleware/authenticate.ts
└── types/express.d.ts
```

**Acoplamentos a eliminar:**

| Onde | O que está misturado |
|------|----------------------|
| `modules/*/controller.ts` | HTTP + Zod + regra + Prisma |
| `shared/middleware/authenticate.ts` | JWT acoplado ao Express |
| `shared/prisma.ts` | Prisma acessado direto pelos controllers |
| `auth/controller.ts` e `users/controller.ts` | bcrypt e jwt no mesmo arquivo da rota |

Não há testes automatizados (`backend/package.json` declara `tsx --test`, mas não existem arquivos `*.test.ts`).

---

## 5. Arquitetura alvo (to-be)

### 5.1 Regra de dependência

```
adapters  →  application  →  domain
     ↓              ↓
   ports (inbound / outbound)
```

- `domain` **não importa** nada de `application`, `adapters`, Express, Prisma, Zod, jwt, bcrypt.
- `application` importa apenas `domain` e **interfaces** de ports.
- `adapters` implementam ports e traduzem I/O.
- `main` (composition root) é o **único** lugar que instancia adaptadores e injeta ports nos use cases.

Import proibido (lint conceitual / review):

| De | Para | Motivo |
|----|------|--------|
| `domain/**` | `adapters/**`, `express`, `@prisma/client`, `zod`, `jsonwebtoken`, `bcryptjs` | núcleo puro |
| `application/**` | `adapters/**`, `express`, `@prisma/client` | use case não fala com infra |
| `adapters/inbound/**` | `@prisma/client` | HTTP não persiste |
| `adapters/outbound/**` | `express` | persistência não fala HTTP |

`@prisma/client` **enums** (`TransactionType`, `PaymentType`) não podem vazar para o domínio. O domínio define os próprios tipos; o adapter Prisma mapeia.

### 5.2 Árvore de pastas (obrigatória)

```
backend/src/
├── main.ts                              # composition root (substitui index.ts)
├── domain/
│   ├── shared/
│   │   ├── errors.ts                    # DomainError (código de negócio)
│   │   ├── money.ts                     # centavos: Int positivo
│   │   └── period.ts                    # mês/ano → intervalo UTC
│   ├── user/
│   ├── category/
│   └── transaction/
├── application/
│   ├── ports/
│   │   ├── inbound/                     # driving: contratos dos use cases
│   │   └── outbound/                    # driven: repos, hasher, token, clock
│   └── use-cases/
│       ├── auth/
│       ├── users/
│       ├── categories/
│       ├── transactions/
│       └── dashboard/
├── adapters/
│   ├── inbound/
│   │   └── http/
│   │       ├── app.ts                   # Express app factory
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── dto/                     # Zod — só nesta camada
│   │       ├── middleware/
│   │       └── presenters/              # DomainError → HTTP { code, message }
│   └── outbound/
│       ├── prisma/
│       ├── security/                    # bcrypt hasher + jwt token
│       └── clock/
└── config/
```

Prisma schema e seed **permanecem** em `backend/prisma/`. O client Prisma vive só em `adapters/outbound/prisma/`.

### 5.3 Bounded contexts (módulos de domínio)

| Contexto | Entidades / VOs | Regras que saem do controller atual |
|----------|-----------------|-------------------------------------|
| User / Auth | `User`, `Email`, `PasswordHash` | email único; hash nunca retornado; soft delete no login |
| Category | `Category` | listagem ordenada por nome |
| Transaction | `Transaction`, `InstallmentGroup`, `Money`, `Period` | à vista vs N parcelas; resto de centavos na última; isolamento `userId`; soft delete; restrição de PATCH em parcela |
| Dashboard | (consulta — sem entidade própria) | saldo do período = entradas − saídas; ignora `deletedAt` |

---

## 6. Ports

### 6.1 Inbound (driving) — use cases

Cada port inbound é uma interface com **um** método. Controllers HTTP chamam o use case; não contém regra.

| Port | Método | Origem atual |
|------|--------|--------------|
| `RegisterUser` | `execute(input) → UserPublic` | `auth.register` |
| `LoginUser` | `execute(input) → { token, user }` | `auth.login` |
| `GetCurrentUser` | `execute(userId) → UserPublic` | `auth.me` |
| `UpdateCurrentUser` | `execute(userId, input) → UserPublic` | `users.updateMe` |
| `ListCategories` | `execute() → Category[]` | `categories.list` |
| `CreateTransaction` | `execute(userId, input) → Transaction[]` | `transactions.create` |
| `ListTransactions` | `execute(userId, filters) → Transaction[]` | `transactions.list` |
| `GetTransaction` | `execute(userId, id) → Transaction` | `transactions.getById` |
| `UpdateTransaction` | `execute(userId, id, input) → Transaction` | `transactions.update` |
| `DeleteTransaction` | `execute(userId, id) → void` | `transactions.remove` |
| `GetDashboardSummary` | `execute(userId, period) → Summary` | `dashboard.summary` |

### 6.2 Outbound (driven) — infraestrutura

| Port | Responsabilidade | Adapter |
|------|------------------|---------|
| `UserRepository` | persistir / buscar usuário (sem `passwordHash` em leituras públicas) | Prisma |
| `CategoryRepository` | listar e `exists(id)` | Prisma |
| `TransactionRepository` | CRUD + listagem filtrada + agregações do dashboard; sempre com `userId` + `deletedAt: null` nas queries padrão | Prisma |
| `PasswordHasher` | `hash` / `compare` | bcryptjs |
| `TokenIssuer` | `sign(userId)` / `verify(token) → userId` | jsonwebtoken |
| `Clock` | `now()` | `Date` (facilita teste de competência/mês) |
| `IdGenerator` | UUID do `installmentGroupId` | `crypto.randomUUID` |

**Regra:** nenhum use case instancia Prisma, bcrypt ou jwt. Só recebe ports no construtor (ou factory no composition root).

---

## 7. Contratos de comportamento (spec)

Comportamento copiado dos controllers atuais. Testes de use case devem cobrir estes casos **sem HTTP**.

### 7.1 Auth

```
Dado email ainda não cadastrado
Quando RegisterUser com senhas iguais e campos válidos
Então persiste passwordHash (nunca o texto) e retorna UserPublic (201 no adapter HTTP)

Dado email já existente
Quando RegisterUser
Então DomainError EMAIL_ALREADY_EXISTS (409 no HTTP)

Dado credenciais inválidas OU usuário com deletedAt
Quando LoginUser
Então DomainError INVALID_CREDENTIALS (401) — mesma mensagem, sem vazar se o email existe

Dado credenciais válidas
Quando LoginUser
Então retorna token + UserPublic (sem passwordHash)

Dado userId inexistente ou deletado
Quando GetCurrentUser
Então DomainError NOT_FOUND
```

### 7.2 Users

```
Dado usuário autenticado
Quando UpdateCurrentUser sem nenhum campo
Então DomainError NO_CHANGES (400)

Dado password enviado
Quando UpdateCurrentUser
Então exige confirmPassword igual; persiste novo hash; email ignorado mesmo se enviado
```

### 7.3 Transactions

```
Dado paymentType = CASH
Quando CreateTransaction
Então cria 1 registro; installmentsCount = null

Dado paymentType = INSTALLMENT e installmentsCount = N (2..120)
Quando CreateTransaction amount = A
Então cria N registros no mesmo installmentGroupId
    amount[i] = floor(A/N) para i < N
    amount[N] = floor(A/N) + (A % N)
    date[i] = addMonths(date, i) em UTC
    soma(amount) = A

Dado categoryId inexistente
Quando CreateTransaction ou UpdateTransaction
Então DomainError INVALID_CATEGORY (400)

Dado lançamento de outro userId OU deletedAt preenchido
Quando Get / Update / Delete
Então DomainError NOT_FOUND — não vaza existência

Dado transação com installmentGroupId
Quando UpdateTransaction alterar amount ou paymentType
Então DomainError INSTALLMENT_RESTRICTION (422)

Dado paymentType = INSTALLMENT no PATCH
Então DomainError PAYMENT_TYPE_RESTRICTION (422)

Dado DeleteTransaction
Então preenche deletedAt; não remove a linha
```

### 7.4 Dashboard

```
Dado month/year omitidos
Quando GetDashboardSummary
Então usa mês/ano correntes do Clock

Dado período inválido
Então DomainError INVALID_PERIOD (400)

Saldo = totalIncome − totalExpense do período, só do userId, deletedAt null
byCategory: apenas EXPENSE, ordenado por total desc
```

### 7.5 HTTP (adapter inbound)

O adapter HTTP **não altera** o contrato de [`API.md`](./API.md):

| Item | Spec |
|------|------|
| Base | `http://localhost:3333` |
| Auth | `Authorization: Bearer <token>` nas rotas já protegidas |
| Erro | `{ code, message, details? }` |
| Zod inválido | `400 VALIDATION_ERROR` com `details: flatten()` |
| DomainError | mapeado 1:1 para o `status` + `code` atuais |
| 404 rota | `{ code: "NOT_FOUND", message: "Rota não encontrada." }` |
| Health | `GET /health` permanece fora do hexágono de domínio |

Zod existe **somente** em `adapters/inbound/http/dto/`.

---

## 8. Mapeamento de erros (domínio → HTTP)

| DomainError.code | HTTP | Mensagem (manter) |
|------------------|------|-------------------|
| `EMAIL_ALREADY_EXISTS` | 409 | Já existe uma conta com este email. |
| `INVALID_CREDENTIALS` | 401 | Email ou senha inválidos. |
| `NOT_FOUND` | 404 | `{recurso} não encontrado.` |
| `NO_CHANGES` | 400 | Informe ao menos um campo para atualizar. |
| `INVALID_CATEGORY` | 400 | A categoria informada não existe. |
| `INVALID_TYPE` | 400 | Tipo de lançamento inválido. |
| `INVALID_PERIOD` | 400 | Mês e ano devem formar um período válido. |
| `INSTALLMENT_RESTRICTION` | 422 | Não é possível alterar valor ou pagamento de uma parcela. |
| `PAYMENT_TYPE_RESTRICTION` | 422 | Crie um novo lançamento para alterar para parcelado. |
| `UNAUTHENTICATED` | 401 | Token ausente / inválido (adapter HTTP, não domínio) |
| `VALIDATION_ERROR` | 400 | Dados inválidos. (adapter Zod) |
| `INTERNAL_ERROR` | 500 | Ocorreu um erro inesperado. |

`AppError` de `shared/http.ts` é substituído por `DomainError` no núcleo + mapper HTTP no presenter. O formato JSON **não muda**.

---

## 9. Estratégia de migração (cortes implementáveis)

Ordem obrigatória. Cada corte deixa a API no ar. Não fazer big-bang.

### Corte 0 — Fundação hexagonal (sem mover regras)

- Criar pastas da §5.2
- Extrair `DomainError` e mapper HTTP
- Composition root em `main.ts` (app Express factory)
- `Clock` e `IdGenerator` com adapters reais
- **Não** mudar endpoints

**Pronto quando:** `pnpm dev` sobe; `/health` e todas as rotas atuais respondem igual.

### Corte 1 — Categories (menor contexto)

- `Category` no domain + `ListCategories` + `CategoryRepository` + Prisma adapter
- Controller HTTP só valida (se houver) e chama o use case

**Pronto quando:** `GET /api/categories` idêntico; use case testado com repo fake.

### Corte 2 — Auth + Users

- Ports: `UserRepository`, `PasswordHasher`, `TokenIssuer`
- Use cases: Register, Login, GetCurrentUser, UpdateCurrentUser
- Middleware `authenticate` usa `TokenIssuer.verify` (ainda no adapter HTTP)

**Pronto quando:** register / login / me / PATCH users/me idênticos; testes dos 4 use cases com fakes.

### Corte 3 — Transactions

- Domain: `Money`, `Period`, split de parcelas (função pura)
- Use cases CRUD + `TransactionRepository`
- Restrições de PATCH de parcela no domínio, não no controller

**Pronto quando:** CRUD + parcelamento idênticos; testes cobrem §7.3.

### Corte 4 — Dashboard

- `GetDashboardSummary` usa `TransactionRepository` de agregação (ou port específico `DashboardReader`)
- Default de mês/ano via `Clock`

**Pronto quando:** `GET /api/dashboard/summary` idêntico; teste com repo fake.

### Corte 5 — Remoção do as-is

- Apagar `src/modules/` e `src/shared/` antigos
- Garantir zero import de Prisma/Express no domain e application
- Atualizar [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Pronto quando:** `rg "from '@prisma/client'" src/domain src/application` vazio; `rg "from 'express'" src/domain src/application` vazio.

### Corte 6 — Documentos de agente (obrigatório, ver §10)

Não é opcional e **não pode ser o último item “se der tempo”**. Sem estes arquivos o corte 6 está incompleto e o PR não fecha.

---

## 10. Documentos de instrução para agentes (obrigatório)

### 10.1 Por que existe

Qualquer alteração futura no backend (feature, bugfix, agente de IA, humano) **deve seguir a arquitetura já existente**, não reinventar camadas nem acoplar Prisma/Express no domínio.

Esta spec **exige** a criação dos arquivos abaixo no **mesmo PR** da migração hexagonal. São entregáveis de primeira classe, com o mesmo peso dos use cases.

### 10.2 Arquivos que DEVEM ser criados

Criar **os três** (mais as Cursor rules). Não escolher um só.

| Arquivo | Ferramenta | Papel |
|---------|------------|--------|
| `AGENTS.md` (raiz do repo) | Cursor, Codex e agentes genéricos | Instruções canônicas do monorepo + ponteiro para o backend hexagonal |
| `CLAUDE.md` (raiz do repo) | Claude Code | Mesmo conteúdo normativo do backend; pode apontar para `AGENTS.md` e complementar só o que for específico do Claude |
| `.cursorrules` (raiz do repo) | Cursor (legado) | Deve existir e **redirecionar** para `AGENTS.md` + `.cursor/rules/` — não duplicar um terceiro texto longo |
| `.cursor/rules/backend-hexagonal.mdc` | Cursor (atual) | Rule com `globs: backend/**/*.ts` (e prisma), `alwaysApply: false`, texto operacional curto |

O conteúdo **normativo** (o que pode / não pode) vive em `AGENTS.md`. `CLAUDE.md` e a rule `.mdc` **não divergem**: ou copiam as regras do backend ou dizem “seguir `AGENTS.md` seção Backend hexagonal” e repetem só o checklist curto.

### 10.3 Conteúdo mínimo obrigatório (os três documentos / a rule)

Cada um dos arquivos de agente (ou a seção que eles referenciam) **precisa** conter, de forma explícita e acionável:

1. **Onde está o hexágono** — árvore da §5.2 e o que cada camada pode importar.
2. **Regra de dependência** — tabela da §5.1 (proibido domain→adapters, application→Prisma/Express, etc.).
3. **Onde entra código novo:**
   - regra de negócio → `domain/` ou `application/use-cases/`
   - persistência → port outbound + adapter Prisma
   - HTTP / Zod → `adapters/inbound/http/`
   - wiring → somente `main.ts`
4. **Proibições:**
   - não instanciar `prisma` em controller ou use case
   - não importar `express` no domain/application
   - não usar enums do `@prisma/client` no domain
   - não colocar Zod no domain
   - não criar atalho “service” que fure o hexágono
   - não alterar contrato HTTP sem atualizar `docs/API.md` e este PRD de produto
5. **Como adicionar um caso de uso novo** (passo a passo):
   1. tipos/erros no `domain`
   2. port inbound + implementação em `application/use-cases`
   3. port outbound se precisar de I/O novo
   4. adapter Prisma/security
   5. DTO Zod + controller HTTP fino
   6. registrar no composition root
   7. teste do use case com fake do port
6. **Invariantes de negócio** a preservar: `userId`, `deletedAt`, centavos, parcelas, JWT Bearer, formato de erro.
7. **Testes:** use case com ports fake; adapter HTTP só se o contrato mudar.
8. **Definition of Done de qualquer PR de backend:**
   - respeita pastas e imports da spec
   - não quebra `docs/API.md`
   - atualiza `docs/ARCHITECTURE.md` se a estrutura mudar
   - atualiza `AGENTS.md` / `CLAUDE.md` / `.cursor/rules/backend-hexagonal.mdc` se a regra arquitetural mudar

### 10.4 Tom e formato

- Escrever como **regras de execução**, não como ensaio.
- Incluir exemplos curtos ✅ / ❌ de import (domain importando Prisma = ❌).
- Em português (pt-BR), alinhado ao restante de `docs/`.
- `AGENTS.md` cobre o monorepo em poucas linhas (front vs back) e detalha o backend.
- A rule Cursor deve ter frontmatter:

```yaml
---
description: Arquitetura hexagonal do backend — obrigatória em qualquer mudança em backend/
globs: backend/**/*.{ts,tsx},backend/prisma/**
alwaysApply: false
---
```

### 10.5 Critério de aceite desta seção

- [ ] `AGENTS.md` existe na raiz e descreve as regras da §10.3
- [ ] `CLAUDE.md` existe na raiz e não contradiz `AGENTS.md`
- [ ] `.cursorrules` existe na raiz e aponta para `AGENTS.md` + `.cursor/rules/`
- [ ] `.cursor/rules/backend-hexagonal.mdc` existe com globs de `backend/`
- [ ] Os quatro arquivos são commitados no mesmo PR da migração
- [ ] [`ARCHITECTURE.md`](./ARCHITECTURE.md) passa a descrever o hexágono e aponta para `AGENTS.md`

**Sem estes arquivos, a refatoração está incompleta** — o objetivo da spec é que a arquitetura sobreviva à próxima alteração, inclusive feita por agente.

---

## 11. Testes (spec)

Não há testes hoje. Esta migração **introduz** testes de use case. Não é necessário e2e HTTP em todos os cortes se o contrato for preservado por review + smoke manual.

| Tipo | Obrigatório | Ferramenta | Escopo |
|------|-------------|------------|--------|
| Use case + fake ports | Sim | `tsx --test` já no `package.json` | §7.1–7.4 |
| Função pura de parcelas | Sim | idem | soma = total; resto na última |
| Mapper DomainError → HTTP | Sim | idem | tabela §8 |
| Teste de controller Express | Não na v1 desta spec | — | opcional |

Fakes: in-memory `UserRepository`, `TransactionRepository`, `PasswordHasher` determinístico, `TokenIssuer` fake, `Clock` fixo.

**Não** subir PostgreSQL nos testes de use case.

---

## 12. Compatibilidade e risco

| Risco | Mitigação |
|-------|-----------|
| Quebrar frontend | Contrato HTTP congelado; smoke: cadastro → login → CRUD → dashboard |
| Vazamento de Prisma no domain | Corte 5 com `rg` na CI local / review |
| Divergência de regras no parcelamento | extrair função pura **antes** de mover o resto do create |
| Documentos de agente desatualizados | §10 no DoD; mudança de pasta exige atualizar os quatro arquivos |

Rollback: git revert do PR; schema não muda.

---

## 13. Atualização de docs de produto

No mesmo PR:

| Doc | O que muda |
|-----|------------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | substituir “camadas” atuais pelo hexágono; citar composition root e ports |
| [`API.md`](./API.md) | **não** muda contrato; pode notar que HTTP é adapter inbound |
| [`PRD.md`](./PRD.md) | uma linha no §3 Backend: “Arquitetura hexagonal — ver `PRD-HEXAGONAL.md`” |
| [`TASKS.md`](./TASKS.md) | não reabrir tasks da v1; este PRD tem os próprios cortes |

---

## 14. Definition of Done

- [ ] Pastas da §5.2 no lugar; `src/modules/` removido
- [ ] Domain e application sem Express, Prisma, Zod, jwt, bcrypt
- [ ] Todos os use cases da §6.1 implementados e wired em `main.ts`
- [ ] Contrato [`API.md`](./API.md) inalterado (mesmos status, codes, shapes)
- [ ] Testes dos cenários §7 (auth, users, transactions, dashboard, parcelas)
- [ ] Smoke local: register → login → categories → lançamento à vista e parcelado → PATCH/DELETE → dashboard
- [ ] [`ARCHITECTURE.md`](./ARCHITECTURE.md) atualizado
- [ ] **`AGENTS.md`, `CLAUDE.md`, `.cursorrules` e `.cursor/rules/backend-hexagonal.mdc` criados conforme §10**
- [ ] Nenhum endpoint novo, nenhuma migration Prisma

---

## 15. Glossário

| Termo | Definição neste projeto |
|-------|-------------------------|
| Hexágono / Ports & Adapters | Núcleo (domain + application) isolado; I/O entra e sai por ports |
| Port inbound | Contrato do caso de uso chamado pelo adapter HTTP |
| Port outbound | Contrato de persistência/segurança implementado por Prisma/bcrypt/jwt |
| Composition root | `main.ts` — único ponto que liga adapters aos use cases |
| DomainError | Erro de negócio sem status HTTP; o presenter HTTP mapeia |
| Spec-driven | Implementar só o que esta spec descreve; cortes na ordem da §9 |
| Documento de agente | `AGENTS.md` / `CLAUDE.md` / `.cursorrules` / rule `.mdc` — regras que todo agente deve seguir ao tocar o backend |
