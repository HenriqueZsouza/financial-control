# Tasks de implementação — Financial Control (v1 local)

Derivado de [`PRD.md`](./PRD.md). Ordem sugerida por dependência. Cada task tem critério de pronto alinhado às user stories e ao Definition of Done.

**Legenda de status:** `[ ]` pendente · `[~]` em progresso · `[x]` concluída

---

## Fase 0 — Fundação do monorepo

### T0.1 — Estrutura do repositório
- [ ] Criar pastas `frontend/`, `backend/`, `docs/`
- [ ] Criar `docker-compose.yml` com PostgreSQL (e Adminer/pgAdmin opcional)
- [ ] Criar `.gitignore` na raiz (node_modules, .env, dist, etc.)
- [ ] Preencher `README.md` com setup local (Docker, env, scripts)

**Pronto quando:** `docker compose up` sobe o Postgres; README explica como rodar.

### T0.2 — Backend bootstrap
- [ ] Inicializar `backend/` (TypeScript + Express + pnpm/npm)
- [ ] Configurar `tsconfig`, scripts (`dev`, `build`, `start`)
- [ ] Dotenv + `.env.example` (porta, `DATABASE_URL`, `JWT_SECRET`, CORS)
- [ ] Estrutura modular: `modules/`, `shared/` (config, middleware, errors)
- [ ] Health check (`GET /health`) e CORS para `localhost:3000`
- [ ] Resposta de erro padronizada `{ code, message, details? }`

**Pronto quando:** `pnpm dev` sobe API em `:3333`.

### T0.3 — Frontend bootstrap
- [ ] Inicializar Next.js (App Router) + TypeScript em `frontend/`
- [ ] Tailwind CSS + MUI + React Query + Zod + dayjs + Chart.js
- [ ] `.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3333`
- [ ] Provider de React Query e layout base (sem auth ainda)
- [ ] Cliente HTTP (`fetch`) com base URL e tratamento de erro

**Pronto quando:** `pnpm dev` sobe app em `:3000`.

### T0.4 — Prisma + schema + seed
- [ ] Prisma no backend com models: `User`, `Category`, `Transaction`
- [ ] Enums: `INCOME` | `EXPENSE`, `CASH` | `INSTALLMENT`
- [ ] Campos de auditoria: `createdAt`, `updatedAt`, `deletedAt?`
- [ ] Monetário padronizado (centavos `Int` **ou** `Decimal` — escolher e documentar)
- [ ] Seed de categorias: mercado, farmácia, vestuário, estudos, moradia, transporte, lazer, saúde, educação, outros
- [ ] Scripts: `prisma migrate`, `prisma seed`, `prisma studio`

**Pronto quando:** migrate + seed populam categorias; Studio abre o banco.

---

## Fase 1 — Autenticação (US-01, US-02)

### T1.1 — API Auth
- [ ] `POST /api/auth/register` — validação Zod (nome, sobrenome, email, telefone, senha, confirmação)
- [ ] Email único; senha com Bcrypt; nunca retornar `passwordHash`
- [ ] `POST /api/auth/login` — retorna JWT (Bearer ou cookie — documentar escolha)
- [ ] `GET /api/auth/me` — usuário autenticado
- [ ] Middleware `authenticate` (JWT + `userId` no request)
- [ ] Erros claros para credenciais inválidas / email duplicado

**Pronto quando:** register → login → me funcionam via HTTP (ex.: Insomnia/curl).

### T1.2 — Frontend Auth
- [ ] Página `/cadastro` com validação Zod + feedback MUI
- [ ] Sucesso redireciona para `/login` com mensagem de sucesso
- [ ] Página `/login` com erro claro em falha
- [ ] Sucesso redireciona para `/` e inicia sessão
- [ ] Guard de rotas protegidas (redirect para `/login` se sem token)
- [ ] Persistência de sessão (token) conforme contrato da API
- [ ] Estado de privacidade: valores monetários **ocultos por padrão** a cada login (olho)

**Pronto quando:** fluxo cadastro → login → área autenticada (mesmo que dashboard vazia).

---

## Fase 2 — Layout autenticado (US-04, US-07 parcial)

### T2.1 — Shell da aplicação
- [ ] Layout autenticado: sidebar + topbar
- [ ] Sidebar: Início, Cadastrar entrada/despesa, Relatório geral, Cartão de crédito (placeholder), Contas a pagar (placeholder)
- [ ] Topbar: menu usuário (Perfil, Sair)
- [ ] Rotas placeholder `/cartao-credito` e `/contas-a-pagar` com “em construção”
- [ ] Logout limpa sessão e redireciona para `/login`

**Pronto quando:** navegação entre rotas autenticadas funciona; placeholders ok.

---

## Fase 3 — Categorias

### T3.1 — API Categorias
- [ ] `GET /api/categories` (auth) — lista seed; sem soft delete de categoria na v1

**Pronto quando:** endpoint retorna as 10 categorias do seed.

### T3.2 — Frontend Categorias
- [ ] Hook/service React Query para listar categorias
- [ ] Reuso em formulário de lançamento e filtros de relatório

**Pronto quando:** selects de categoria populam a partir da API.

---

## Fase 4 — Lançamentos (US-05)

### T4.1 — API Transactions
- [ ] `GET /api/transactions` — query: `month`, `year`, `categoryIds`, `type`; ignora soft delete; filtra por `userId`
- [ ] `GET /api/transactions/:id` — detalhe (só do dono)
- [ ] `POST /api/transactions` — à vista (1 registro) ou parcelado (N registros + `installmentGroupId`, `installmentNumber`, ajuste de centavos na última parcela)
- [ ] `PATCH /api/transactions/:id` — update + `updatedAt`
- [ ] `DELETE /api/transactions/:id` — soft delete (`deletedAt`)
- [ ] Isolamento por usuário em todas as operações

**Pronto quando:** CRUD completo testado; parcelado gera N linhas com soma = valor total.

### T4.2 — Frontend Lançamentos
- [ ] `/lancamentos` — listagem com filtros básicos
- [ ] `/lancamentos/novo` — formulário (tipo, nome, valor, categoria, pagamento, parcelas, data)
- [ ] Edição e exclusão com confirmação + feedback MUI
- [ ] Soft delete: item some da listagem padrão
- [ ] Validação Zod nos formulários

**Pronto quando:** usuário cria à vista e parcelado, edita e exclui com feedback visual.

---

## Fase 5 — Dashboard (US-03)

### T5.1 — API Dashboard
- [ ] `GET /api/dashboard/summary?month=&year=`
- [ ] Retorna: total entradas, total saídas, saldo do período (entradas − saídas), breakdown por categoria
- [ ] Apenas dados do usuário; exclui soft delete

**Pronto quando:** summary bate com lançamentos do mês filtrado.

### T5.2 — Frontend Dashboard (`/`)
- [ ] Cards: saldo, entradas, saídas (estilo “home de banco”)
- [ ] Toggle olho mostrar/ocultar valores (default oculto pós-login)
- [ ] Filtro mês/ano (default: mês atual) atualiza todos os indicadores
- [ ] Gráficos Chart.js (entradas vs saídas; gastos por categoria)
- [ ] Estados loading / empty / error

**Pronto quando:** filtro de mês e privacidade do olho atendem US-03.

---

## Fase 6 — Relatórios (US-06)

### T6.1 — Relatório geral (reuso da API de transactions)
- [ ] Página `/relatorios` com filtros: mês/ano, categorias (multi-select), tipo opcional
- [ ] Listagem e/ou agregação conforme filtros
- [ ] Só dados do usuário; sem soft-deleted

**Pronto quando:** filtros alteram a visão; critérios US-06 ok.

---

## Fase 7 — Perfil (US-07)

### T7.1 — API Perfil
- [ ] `PATCH /api/users/me` — nome, sobrenome, telefone; senha opcional (com confirmação)
- [ ] Email **não** editável (ignorar se enviado)

**Pronto quando:** update persiste; email permanece intacto.

### T7.2 — Frontend Perfil
- [ ] Página `/perfil` com campos editáveis + email readonly
- [ ] Troca de senha opcional com confirmação
- [ ] Feedback MUI de sucesso/erro
- [ ] Logout no menu superior (já em T2.1 — validar ponta a ponta)

**Pronto quando:** perfil + logout atendem US-07.

---

## Fase 8 — Documentação e fechamento DoD

### T8.1 — Docs globais
- [ ] `docs/ARCHITECTURE.md` (camadas, auth, soft delete, monetário)
- [ ] `docs/API.md` (contratos da seção 9 do PRD)
- [ ] `README.md` completo (pré-requisitos, compose, migrate, seed, front/back)

### T8.2 — Docs de componentes
- [ ] `.md` para componentes/hooks/services principais (auth, dashboard, lançamentos, relatórios, perfil, layout)
- [ ] Incluir: responsabilidade, props/contrato, regras, dependências, exemplos, estados loading/error/empty

### T8.3 — Checklist Definition of Done (PRD §12)
- [ ] `docker compose up` sobe PostgreSQL
- [ ] Backend + Prisma na porta configurada
- [ ] Frontend em `:3000` consome API local
- [ ] Fluxo cadastro → login → dashboard
- [ ] Valores ocultos no login; toggle olho
- [ ] Filtro de mês na dashboard
- [ ] CRUD lançamentos (à vista e parcelado)
- [ ] Soft delete operacional
- [ ] Relatório com filtro de categorias
- [ ] Perfil editável (exceto email) + logout
- [ ] Docs `.md` dos componentes principais
- [ ] `.env.example` em frontend e backend

---

## Ordem sugerida de execução (resumo)

```
T0.1 → T0.2 → T0.4 → T1.1
                 ↘ T0.3 → T1.2 → T2.1
T1.1 → T3.1 → T4.1 → T5.1
T3.1/T3.2 + T4.1 → T4.2 → T5.2 → T6.1
T1.1 → T7.1 → T7.2
Tudo acima → T8.1 → T8.2 → T8.3
```

---

## Fora de escopo (não criar tasks na v1)

- Telegram / Hermes Agent
- Deploy, CI/CD, HTTPS, backups
- Conta familiar compartilhada
- Cartão de crédito e contas a pagar completos (só placeholder)
- OAuth, 2FA, push, export PDF/Excel

---

## Mapa rápido: User Story → Tasks

| US | Tasks |
|----|--------|
| US-01 Cadastro | T1.1, T1.2 |
| US-02 Login | T1.1, T1.2 |
| US-03 Dashboard | T5.1, T5.2 |
| US-04 Menu lateral | T2.1 |
| US-05 Lançamentos | T4.1, T4.2 |
| US-06 Relatório | T6.1 (+ T4.1) |
| US-07 Perfil/logout | T2.1, T7.1, T7.2 |
| Infra / DoD | T0.*, T3.*, T8.* |
