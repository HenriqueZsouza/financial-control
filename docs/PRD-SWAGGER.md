# PRD — Documentação OpenAPI / Swagger no Backend

**Produto:** Financial Control  
**Documento:** Spec de documentação interativa da API  
**Versão:** 1.0  
**Status:** Pronto para implementação  
**Data:** 13/08/2026  
**Escopo:** somente `backend/` (adapter HTTP) + docs relacionados  
**Fonte de verdade do produto:** [`PRD.md`](./PRD.md)  
**Contrato HTTP vigente:** [`API.md`](./API.md)  
**Arquitetura:** [`PRD-HEXAGONAL.md`](./PRD-HEXAGONAL.md) / [`AGENTS.md`](../AGENTS.md)

Este documento é **spec-driven**: a implementação segue os contratos, cortes e critérios abaixo. Código fora desta spec não entra no PR.

---

## 1. Problema

O contrato HTTP está descrito em [`API.md`](./API.md) de forma resumida (tabela de rotas). Isso funciona como referência rápida, mas:

- não permite **explorar e testar** endpoints no browser (try-it-out)
- não documenta schemas completos de request/response, query params e erros
- não oferece **Bearer JWT** configurável na UI para rotas autenticadas
- novos colaboradores e agentes precisam inferir detalhes a partir do código (DTOs Zod + controllers)

Não existe OpenAPI/Swagger no repositório hoje (`swagger`, `openapi`, `swagger-ui` ausentes).

---

## 2. Objetivo

Expor documentação **OpenAPI 3.x** com **Swagger UI** no backend local, de forma que:

1. cubra **100%** das rotas de [`API.md`](./API.md) (incluindo `/health`)
2. permita autenticar com **JWT Bearer** e executar requests a partir da UI
3. permaneça isolada no **adapter inbound HTTP** — sem vazar para `domain/` ou `application/`
4. o contrato HTTP **não mude** (mesmas rotas, status, payloads e códigos de erro)
5. `API.md` continue como resumo humano; a spec OpenAPI seja a fonte detalhada para exploração

**URL alvo (local):** `http://localhost:3333/api/docs`  
**Spec JSON (opcional, recomendado):** `http://localhost:3333/api/docs.json`

---

## 3. Fora de escopo

- Frontend (`frontend/`)
- Mudança de rotas, payloads, status codes ou códigos de erro
- Geração automática de clientes TypeScript para o frontend
- Publicação da docs em produção / domínio público / autenticação da própria UI
- Redoc, Stoplight, Postman Collections ou Insomnia como entregável principal
- Documentação de ports, use cases ou domínio (apenas HTTP)
- Alteração de Prisma / migrations
- CI que falhe se OpenAPI divergir do runtime (pode ser follow-up)

**Invariantes (não negociáveis):** isolamento hexagonal; contrato de [`API.md`](./API.md); erros `{ code, message, details? }`; JWT Bearer nas rotas protegidas.

---

## 4. Estado atual (as-is)

```
backend/src/adapters/inbound/http/
├── app.ts                 # Express + /health + /api + errorHandler
├── routes/api-routes.ts   # monta rotas auth, users, categories, transactions, dashboard
├── controllers/           # controllers finos
├── dto/                   # Zod (auth, transactions, dashboard)
├── middleware/            # authenticate (JWT)
└── presenters/            # DomainError / Zod → HTTP
```

Documentação humana: [`docs/API.md`](./API.md).  
Nenhuma rota `/docs`. Nenhuma dependência OpenAPI/Swagger no `package.json`.

---

## 5. Arquitetura alvo (to-be)

### 5.1 Onde vive no hexágono

Documentação OpenAPI/Swagger é **concern de borda HTTP**.

| Camada | Pode tocar Swagger/OpenAPI? |
|--------|-----------------------------|
| `domain/` | ❌ Não |
| `application/` | ❌ Não |
| `adapters/outbound/` | ❌ Não |
| `adapters/inbound/http/` | ✅ Sim |
| `main.ts` | ✅ Apenas wiring se necessário (preferir montar em `app.ts`) |
| `config/` | ✅ Flag opcional `SWAGGER_ENABLED` (default `true` em local) |

Import proibido: qualquer arquivo de OpenAPI/Swagger importar Prisma, use cases ou domínio além de tipos já usados na borda HTTP (não é necessário importar domínio).

### 5.2 Árvore de pastas (obrigatória)

```
backend/src/adapters/inbound/http/
├── openapi/
│   ├── openapi-document.ts      # documento OpenAPI 3 (paths, components, security)
│   ├── schemas.ts               # schemas reutilizáveis (User, Transaction, Error, …)
│   └── register-swagger.ts      # monta Swagger UI + serve JSON
├── app.ts                       # chama registerSwagger(app) antes do 404
└── …
```

Alternativa aceitável (mesmo escopo): um único `openapi/openapi-document.ts` + `register-swagger.ts` se `schemas` ficar inline — desde que fique sob `adapters/inbound/http/openapi/`.

### 5.3 Stack obrigatória

| Peça | Escolha | Motivo |
|------|---------|--------|
| Spec | OpenAPI **3.0** ou **3.1** | padrão de mercado |
| UI | `swagger-ui-express` | integração direta com Express |
| Spec no runtime | objeto JS/TS servido em memória **ou** YAML estático em `openapi/` | evita acoplar JSDoc espalhado nas rotas |
| Validação | continua Zod nos DTOs | OpenAPI **documenta**; Zod **valida** |

**Decisão preferida (obrigatória nesta spec):** documento OpenAPI **centralizado em TypeScript** (objeto), não `swagger-jsdoc` com anotações JSDoc nas rotas.

Motivos:

- controllers devem permanecer finos (hexágono)
- evita poluir rotas com blocos `@openapi`
- facilita diff e review do contrato
- alinha com “uma fonte detalhada” além do `API.md`

**Não usar** nesta v1: `@asteasolutions/zod-to-openapi` / geração automática a partir do Zod. Pode ser follow-up se a manutenção manual do documento ficar custosa.

Dependências a adicionar em `backend/package.json`:

- `swagger-ui-express`
- `@types/swagger-ui-express` (dev)

---

## 6. Conteúdo da especificação (obrigatório)

### 6.1 Metadados

```yaml
openapi: 3.0.3
info:
  title: Financial Control API
  version: 1.0.0
  description: API local do Financial Control. Valores monetários em centavos (Int).
servers:
  - url: http://localhost:3333
    description: Ambiente local
```

### 6.2 Segurança

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

- Rotas públicas: `POST /api/auth/register`, `POST /api/auth/login`, `GET /health`
- Demais rotas sob `/api/*`: `security: [{ bearerAuth: [] }]`
- Na Swagger UI, o botão **Authorize** deve aceitar o token retornado pelo login (sem prefixo duplicado se a UI já enviar `Bearer`)

### 6.3 Endpoints a documentar

| Método | Path | Auth | Request | Response sucesso |
|--------|------|------|---------|------------------|
| GET | `/health` | Não | — | `{ status, timestamp }` |
| POST | `/api/auth/register` | Não | body register | `201` usuário (sem `passwordHash`) |
| POST | `/api/auth/login` | Não | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | Sim | — | usuário |
| PATCH | `/api/users/me` | Sim | campos opcionais + senha | usuário |
| GET | `/api/categories` | Sim | — | lista de categorias |
| GET | `/api/transactions` | Sim | query: `month`, `year`, `categoryIds`, `type` | lista |
| POST | `/api/transactions` | Sim | create (CASH ou INSTALLMENT) | lançamento(s) criado(s) |
| GET | `/api/transactions/{id}` | Sim | — | lançamento |
| PATCH | `/api/transactions/{id}` | Sim | campos editáveis | lançamento |
| DELETE | `/api/transactions/{id}` | Sim | — | `204` sem body |
| GET | `/api/dashboard/summary` | Sim | query: `month`, `year` | totais e breakdown |

A descrição de cada operação deve mencionar restrições já existentes no produto, em linguagem curta:

- `amount` em **centavos** (`integer`)
- `paymentType: INSTALLMENT` exige `installmentsCount` (2–120)
- `month` e `year` juntos ou nenhum dos dois
- soft delete: DELETE não remove fisicamente
- parcelamento: várias linhas com mesmo grupo; resto na última parcela

### 6.4 Schemas mínimos (`components.schemas`)

Obrigatórios:

| Schema | Campos principais |
|--------|-------------------|
| `ErrorResponse` | `code: string`, `message: string`, `details?: object` |
| `User` | `id`, `firstName`, `lastName`, `email`, `phone`, `createdAt`, `updatedAt` (sem hash) |
| `AuthLoginResponse` | `token`, `user` |
| `Category` | `id`, `name`, … (espelhar resposta real do controller) |
| `Transaction` | `id`, `type`, `name`, `amount`, `categoryId`, `paymentType`, `date`, campos de parcela/grupo se existirem na resposta |
| `CreateTransactionRequest` | alinhado ao `createTransactionSchema` |
| `UpdateTransactionRequest` | alinhado ao `updateTransactionSchema` |
| `RegisterRequest` / `LoginRequest` / `UpdateUserRequest` | alinhados aos DTOs Zod |
| `DashboardSummary` | alinhado à resposta do dashboard |

Enums documentados:

- `TransactionType`: `INCOME` \| `EXPENSE`
- `PaymentType`: `CASH` \| `INSTALLMENT`

### 6.5 Respostas de erro (por operação, o que fizer sentido)

Documentar ao menos:

| HTTP | `code` típico | Quando |
|------|---------------|--------|
| 400 | `VALIDATION_ERROR` | Zod |
| 400 | `NO_CHANGES`, `INVALID_CATEGORY`, `INVALID_TYPE`, `INVALID_PERIOD` | domínio |
| 401 | `INVALID_CREDENTIALS` / ausência/token inválido | auth |
| 404 | `NOT_FOUND` | recurso ou rota |
| 409 | `EMAIL_ALREADY_EXISTS` | register |
| 422 | `INSTALLMENT_RESTRICTION`, `PAYMENT_TYPE_RESTRICTION` | regras de parcela |
| 500 | `INTERNAL_ERROR` | inesperado |

Não é obrigatório listar **todos** os códigos em **todas** as operações; é obrigatório:

1. ter o schema `ErrorResponse`
2. nas operações críticas (register, login, create/update transaction), listar os códigos mais comuns
3. nas protegidas, documentar `401` sem/com token inválido

### 6.6 Exemplos

Obrigatório pelo menos um exemplo de:

- register
- login
- create transaction `CASH`
- create transaction `INSTALLMENT`
- dashboard summary

Exemplo CASH (já alinhado a `API.md`):

```json
{
  "type": "EXPENSE",
  "name": "Mercado",
  "amount": 15000,
  "categoryId": "<id>",
  "paymentType": "CASH",
  "date": "2026-08-12"
}
```

---

## 7. Comportamento da UI e do servidor

### 7.1 Montagem

Em `createHttpApp`:

1. CORS + JSON (como hoje)
2. `GET /health`
3. `registerSwagger(app)` → UI em `/api/docs` e JSON em `/api/docs.json`
4. `app.use('/api', apiRoutes(...))`
5. 404 + `errorHandler`

Swagger **não** passa pelo middleware `authenticate`.

### 7.2 Flags de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| `SWAGGER_ENABLED` | `true` | Se `false`, não monta UI nem JSON |

Documentar em `backend/.env.example`. Em ambiente local de desenvolvimento deve permanecer habilitado.

### 7.3 Aparência / UX mínima

- Título “Financial Control API”
- Persistência do token na UI (`persistAuthorization: true` no setup do swagger-ui)
- Não exigir login na própria página de docs

---

## 8. Cortes de implementação

### Corte 1 — Dependências + esqueleto OpenAPI

- Instalar `swagger-ui-express` + types
- Criar `openapi-document.ts` com `info`, `servers`, `securitySchemes`, path `/health`
- Criar `register-swagger.ts` e plugar em `app.ts`
- Confirmar UI em `http://localhost:3333/api/docs`

**Pronto quando:** a página Swagger abre e mostra ao menos `/health`.

### Corte 2 — Auth + Users + Categories

- Documentar register, login, me, patch users/me, categories
- Schemas `User`, requests de auth, `ErrorResponse`
- Security Bearer nas protegidas

**Pronto quando:** fluxo Authorize → `GET /api/auth/me` funciona na UI após login.

### Corte 3 — Transactions + Dashboard

- Documentar CRUD de transactions + summary
- Query params, path params, exemplos CASH/INSTALLMENT
- Erros 400/401/404/422 relevantes

**Pronto quando:** create CASH e list com `month`/`year` executáveis na UI.

### Corte 4 — Docs de produto + DoD

- Atualizar [`API.md`](./API.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`PRD.md`](./PRD.md) (ponteiro)
- Mencionar URL do Swagger no README se existir seção de API
- Checklist §11

**Pronto quando:** docs apontam para `/api/docs` e o contrato HTTP permanece o mesmo.

Ordem dos cortes é sequencial. Não misturar geração automática Zod→OpenAPI neste PR.

---

## 9. Critérios de aceite

- [ ] `GET /api/docs` serve a Swagger UI
- [ ] `GET /api/docs.json` (ou equivalente configurado) devolve OpenAPI 3 válido
- [ ] Todos os endpoints da §6.3 aparecem na spec
- [ ] Authorize com JWT funciona nas rotas protegidas
- [ ] Schemas de request batem com os DTOs Zod atuais (campos, enums, obrigatoriedade)
- [ ] `amount` documentado como inteiro em centavos
- [ ] Nenhum import de Swagger/OpenAPI em `domain/` ou `application/`
- [ ] `npm test` e `npm run build` no `backend/` passam
- [ ] Contrato de [`API.md`](./API.md) inalterado (apenas menção à docs interativa)
- [ ] Com `SWAGGER_ENABLED=false`, UI/JSON não são montados

---

## 10. Atualização de docs

No mesmo PR da implementação:

| Doc | O que muda |
|-----|------------|
| [`API.md`](./API.md) | No topo: link para `http://localhost:3333/api/docs` (Swagger UI). Contrato tabular permanece. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Nota: OpenAPI/Swagger vive em `adapters/inbound/http/openapi/`. |
| [`PRD.md`](./PRD.md) | Uma linha no stack backend: documentação OpenAPI/Swagger — ver este PRD. |
| [`TASKS.md`](./TASKS.md) | Opcional: task apontando para este PRD (não reabrir tasks da v1). |
| `backend/.env.example` | `SWAGGER_ENABLED=true` |
| `AGENTS.md` / rules | Só se a regra de “onde colocar HTTP” precisar citar `openapi/` — preferir atualizar se agentes costumarem criar docs no lugar errado |

---

## 11. Definition of Done

- [ ] Pastas da §5.2 criadas; registro em `app.ts`
- [ ] Dependências instaladas; UI acessível localmente
- [ ] Spec cobre §6.3 com security, schemas e exemplos mínimos
- [ ] Try-it-out: register → login → Authorize → categories → create transaction → dashboard
- [ ] Domain/application sem vestígios de Swagger
- [ ] Docs da §10 atualizados
- [ ] `npm test` + `npm run build` em `backend/`
- [ ] Nenhum endpoint de negócio novo; nenhuma migration

---

## 12. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Spec OpenAPI divergir do Zod | Review cruzado com `dto/*.ts`; exemplos copiados dos schemas reais |
| Controllers engordarem com JSDoc | Proibido nesta spec — documento centralizado |
| Expor docs sem querer em deploy futuro | `SWAGGER_ENABLED` já previsto |
| Confundir `API.md` vs OpenAPI | `API.md` = resumo; OpenAPI = detalhe explorável; ambos no DoD |

Rollback: remover `openapi/`, desfazer registro em `app.ts`, remover deps.

---

## 13. Glossário

| Termo | Definição neste projeto |
|-------|-------------------------|
| OpenAPI | Spec padrão (JSON/YAML) que descreve a API HTTP |
| Swagger UI | Interface web que renderiza OpenAPI e permite try-it-out |
| Spec centralizada | Documento em `adapters/inbound/http/openapi/`, sem JSDoc nas rotas |
| Try-it-out | Execução real do request a partir da UI contra o server local |
| Bearer JWT | Schema de segurança HTTP; header `Authorization: Bearer <token>` |

---

## 14. Follow-ups (explicitamente fora deste PR)

- Gerar OpenAPI a partir dos Zod DTOs (`zod-to-openapi`) para reduzir drift
- Exportar a spec no CI e validar breaking changes
- Gerar client TypeScript para o `frontend/`
- Redoc como visualização alternativa
- Desabilitar Swagger por default em produção quando houver deploy
