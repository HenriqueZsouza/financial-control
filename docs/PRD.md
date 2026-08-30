# PRD — Financial Control

**Produto:** Aplicação web de controle financeiro familiar  
**Versão do documento:** 1.0  
**Status:** Em construção  
**Última atualização:** 11/08/2026

---

## 1. Visão geral

O **Financial Control** é uma aplicação web para controle financeiro familiar. O usuário poderá registrar entradas e despesas, acompanhar saldo e relatórios mensais, e gerenciar seu perfil.

Em uma fase futura, haverá integração com **Telegram** via **Hermes Agent**, permitindo cadastrar lançamentos por chat (ex.: *"compra de mercado R$150,00"*), que serão registrados automaticamente na conta do usuário.

**Escopo deste PRD:** módulo web + API backend. A integração com Telegram **não faz parte da v1**.

Specs incrementais (implementação segue o documento da feature, não este arquivo sozinho):

- Grupo familiar: [`PRD-FAMILY-GROUP.md`](./PRD-FAMILY-GROUP.md)
- Investimentos + relatório mensal de cartão: [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md)
- Fechamento de fatura + relatório de contas a pagar: [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md)

---

## 2. Ambiente de execução

### 2.1 Execução local (v1)

Por enquanto, **todo o projeto será rodado localmente**. Não há deploy em produção, CI/CD ou infraestrutura cloud nesta fase.

| Componente        | Ambiente local                          |
|-------------------|-----------------------------------------|
| Frontend          | `http://localhost:3000` (Next.js)       |
| Backend           | `http://localhost:3333` (Express)       |
| Banco de dados    | PostgreSQL via Docker Compose           |
| Visualização DB   | Prisma Studio (`npx prisma studio`)     |
| Admin opcional    | Adminer/pgAdmin no Docker (se configurado) |

**Premissas:**
- Desenvolvedor com Docker, Node.js e npm/yarn/pnpm instalados
- Variáveis de ambiente via `.env` / `.env.example` em `frontend/` e `backend/`
- Comunicação frontend ↔ backend na rede local (CORS configurado para `localhost`)
- Dados e usuários são de desenvolvimento/teste local; não há SLA, backup automatizado ou alta disponibilidade

**Fora de escopo na v1 (local):**
- Deploy em VPS, AWS, Vercel, Railway, etc.
- Domínio customizado, HTTPS em produção, CDN
- Monitoramento, logs centralizados, alertas
- Backup automatizado do banco

Quando o produto evoluir para produção, este documento será atualizado com requisitos de deploy, segurança e operação.

---

## 3. Stack tecnológica

### Frontend (`frontend/`)
| Tecnologia   | Uso                                      |
|-------------|-------------------------------------------|
| TypeScript  | Linguagem                                 |
| Next.js     | Framework React (App Router)              |
| React Query | Server state / cache de requisições       |
| MUI         | Botões, modais, alerts, feedback UI       |
| Tailwind CSS| Layout, espaçamento, utilitários          |
| Chart.js    | Gráficos da dashboard                     |
| dayjs       | Manipulação de datas                      |
| Zod         | Validação de formulários                  |
| fetch       | Requisições HTTP (nativo)                 |

### Backend (`backend/`)
| Tecnologia   | Uso                                      |
|-------------|-------------------------------------------|
| TypeScript  | Linguagem                                 |
| Node.js     | Runtime                                   |
| Express     | API HTTP (adapter inbound)                |
| Prisma      | ORM (adapter outbound)                    |
| PostgreSQL  | Banco de dados relacional                 |
| Zod         | Validação de entrada (somente HTTP)       |
| Bcrypt      | Hash de senhas (adapter)                  |
| Dotenv      | Variáveis de ambiente                     |
| OpenAPI / Swagger UI | Documentação interativa HTTP — ver [PRD-SWAGGER.md](./PRD-SWAGGER.md) |
| Docker      | PostgreSQL e serviços auxiliares        |

Arquitetura alvo do backend: hexagonal (Ports & Adapters). Spec de migração: [`PRD-HEXAGONAL.md`](./PRD-HEXAGONAL.md).

### Estrutura do repositório
```
financial-control/
├── frontend/
├── backend/
├── docs/
│   └── PRD.md          # este documento
├── docker-compose.yml
└── README.md
```

---

## 4. Personas e objetivos

**Persona principal:** usuário ou família que deseja controlar finanças pessoais com interface clara, estilo “home de banco”, e no futuro lançamentos rápidos via Telegram.

**Objetivos da v1:**
1. Cadastro e login seguros
2. Dashboard com visão do mês vigente e filtros históricos
3. CRUD de entradas e despesas (à vista ou parcelado)
4. Relatórios com filtro por categorias
5. Perfil editável e logout
6. Frontend e backend configurados e conectados **localmente**

---

## 5. Escopo funcional

### 5.1 Dentro do escopo (v1)

| Módulo              | Descrição                                              |
|---------------------|--------------------------------------------------------|
| Autenticação        | Cadastro, login, sessão JWT                            |
| Dashboard           | Saldo, entradas, saídas, gráficos, filtro por mês      |
| Lançamentos         | Criar, listar, editar, excluir (soft delete)           |
| Categorias          | Seed inicial + filtro em relatórios                    |
| Relatório geral     | Filtros por mês e categorias                           |
| Perfil              | Editar dados (exceto email) + sair                     |
| Menu lateral        | Atalhos para funcionalidades                           |
| Auditoria           | `createdAt`, `updatedAt`, `deletedAt` em operações     |

### 5.2 Fora do escopo (v1)

- Bot Telegram / Hermes Agent
- Deploy em produção
- Multi-usuário familiar compartilhado (conta conjunta) — spec em [`PRD-FAMILY-GROUP.md`](./PRD-FAMILY-GROUP.md)
- Cartão de crédito completo (limite, vários cartões, fechamento automático) — relatório mensal 1x vs parcelas: [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md); fechamento **explícito** da fatura: [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md)
- Cadastro manual e pagamento de contas a pagar — o **relatório por vencimento** (alimentado pelo fechamento da fatura) está em [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md)
- OAuth social, 2FA, notificações push
- Exportação de relatórios (PDF/Excel)

---

## 6. User stories e critérios de aceite

### US-01 — Cadastro

**Como** visitante, **quero** me cadastrar na plataforma **para** criar minha conta.

**Campos obrigatórios:**
- Nome
- Sobrenome
- Email
- Telefone
- Senha
- Confirmação de senha

**Critérios de aceite:**
- [ ] Validação de campos obrigatórios e formatos (email, telefone)
- [ ] Senha deve ser igual à confirmação
- [ ] Email único no sistema
- [ ] Senha armazenada com Bcrypt (nunca em texto plano)
- [ ] Após sucesso, redirecionamento para `/login` com mensagem de sucesso (MUI)

---

### US-02 — Login

**Como** usuário cadastrado, **quero** entrar com email e senha **para** acessar minha área.

**Critérios de aceite:**
- [ ] Credenciais inválidas exibem erro claro
- [ ] Sucesso redireciona para dashboard (`/`)
- [ ] Valores monetários iniciam **ocultos** a cada novo login (ícone de olho)
- [ ] Sessão mantida via JWT (Bearer token ou cookie, conforme implementação)

---

### US-03 — Dashboard (Home)

**Como** usuário autenticado, **quero** ver um resumo financeiro do mês **para** acompanhar minha situação.

**Elementos da tela:**
- Saldo disponível (com ícone olho para mostrar/ocultar)
- Total de entradas (mês vigente)
- Total de saídas (mês vigente)
- Investimentos do período (não entram no saldo) — [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md)
- Gráficos (ex.: entradas vs saídas; gastos por categoria)
- Card de cartão de crédito com fatura em aberto e ação **Fechar fatura** — [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md)
- Filtro por mês/ano (padrão: mês atual)
- Saldo anterior herdado do mês encerrado

**Critérios de aceite:**
- [ ] Layout estilo “home de banco” (cards + gráficos)
- [ ] Filtro altera todos os indicadores do período
- [ ] Saldo disponível herda o encerramento do mês anterior (positivo ou negativo)
- [ ] Privacidade: valores ocultos por padrão após login
- [ ] Dados restritos ao usuário logado

---

### US-04 — Menu lateral

**Como** usuário autenticado, **quero** um menu lateral **para** acessar as funcionalidades.

**Itens mínimos:**
- Início / Dashboard
- Cadastrar entrada/despesa
- Relatório geral
- Cartão de crédito — relatório mensal ([`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md))
- Contas a pagar — relatório por vencimento ([`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md)); cadastro manual ainda fora

**Critérios de aceite:**
- [ ] Menu visível em layout autenticado
- [ ] Navegação entre rotas funcional
- [ ] Placeholders exibem mensagem ou página em construção

---

### US-05 — Cadastro de entradas e despesas

**Como** usuário, **quero** registrar lançamentos **para** manter meu controle atualizado.

**Campos:**
| Campo            | Tipo / opções                          |
|------------------|----------------------------------------|
| Tipo             | Entrada (`INCOME`), Despesa (`EXPENSE`) ou Investimento (`INVESTMENT`) — spec em [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md) |
| Nome             | Texto                                  |
| Valor total      | Monetário                              |
| Categoria        | Select (mercado, farmácia, etc.)       |
| Pagamento        | À vista (`CASH`) ou Parcelado (`INSTALLMENT`) |
| Parcelas         | Select (2 a N), se parcelado           |
| Data             | Data do lançamento (default: hoje)     |

**Critérios de aceite:**
- [ ] À vista: um único lançamento
- [ ] Parcelado: N parcelas geradas (regra de centavos na última parcela)
- [ ] Create/update/delete com `createdAt`, `updatedAt`, `deletedAt`
- [ ] Soft delete: registro não aparece em listagens padrão
- [ ] Feedback visual de sucesso/erro (MUI)

---

### US-06 — Relatório geral

**Como** usuário, **quero** filtrar lançamentos por categorias e período **para** analisar meus gastos.

**Filtros:**
- Mês/ano (sem meses futuros)
- Categorias (multi-select)
- Tipo (entrada / despesa / investimento) — opcional; spec do tipo investimento em [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md)

**Critérios de aceite:**
- [ ] Listagem/agregação conforme filtros
- [ ] Filtro de período não oferece mês/ano futuros
- [ ] Apenas dados do usuário logado
- [ ] Exclui registros com soft delete

---

### US-07 — Perfil e logout

**Como** usuário, **quero** editar meus dados e sair da conta **para** manter informações atualizadas e encerrar a sessão.

**Menu superior direito:**
- Acessar perfil
- Sair

**Campos editáveis no perfil:**
- Nome, sobrenome, telefone
- Senha (opcional, com confirmação)
- Email: **somente leitura**

**Critérios de aceite:**
- [ ] Email não editável
- [ ] Alterações persistidas na API
- [ ] Logout limpa sessão e redireciona para login

---

## 7. Regras de negócio

1. **Isolamento por usuário:** todo recurso financeiro pertence ao `userId` do token; nunca expor dados de outros usuários.
2. **Soft delete:** queries padrão ignoram registros com `deletedAt` preenchido.
3. **Saldo disponível:** o mês herda o saldo encerrado do anterior (`openingBalance` = entradas − despesas com data anterior ao período, positivo ou negativo). O saldo exibido é `openingBalance + entradas do mês − saídas do mês`. Investimentos não entram.
4. **Valores monetários:** armazenar em centavos (Int) ou `Decimal` no Prisma; padronizar em toda a API.
5. **Categorias iniciais (seed):** mercado, farmácia, vestuário, estudos, moradia, transporte, lazer, saúde, educação, outros.
6. **Privacidade (olho):** comportamento apenas no frontend/sessão; resetado a cada login; não persiste no backend na v1.
7. **Timestamps:** `createdAt` e `updatedAt` automáticos; `deletedAt` preenchido no soft delete.
8. **Parcelamento:** valor total dividido em N parcelas; diferença de arredondamento ajustada na última parcela.

---

## 8. Modelo de dados (resumo)

### User
- `id` (inteiro sequencial), `firstName`, `lastName`, `email` (unique), `phone`, `passwordHash`
- `createdAt`, `updatedAt`, `deletedAt?`

### Category
- `id` (inteiro sequencial), `name`, `slug`, `icon?`
- `createdAt`, `updatedAt`

### Transaction
- `id`, `userId`, `categoryId` (inteiros sequenciais)
- `type`: `INCOME` | `EXPENSE` | `INVESTMENT` (investimento: [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md))
- `name`, `amount`
- `paymentType`: `CASH` | `INSTALLMENT`
- `installmentsCount?`, `installmentGroupId?`, `installmentNumber?`
- `date` (data de competência)
- `createdAt`, `updatedAt`, `deletedAt?`

---

## 9. API (contratos mínimos)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/auth/register` | Não | Cadastro |
| POST | `/api/auth/login` | Não | Login |
| GET | `/api/auth/me` | Sim | Usuário logado |
| PATCH | `/api/users/me` | Sim | Atualizar perfil |
| GET | `/api/categories` | Sim | Listar categorias |
| GET | `/api/transactions` | Sim | Listar (query: month, year, categoryIds, type) |
| POST | `/api/transactions` | Sim | Criar lançamento |
| GET | `/api/transactions/:id` | Sim | Detalhe |
| PATCH | `/api/transactions/:id` | Sim | Atualizar |
| DELETE | `/api/transactions/:id` | Sim | Soft delete |
| GET | `/api/dashboard/summary` | Sim | Resumo (query: month, year) |

Respostas de erro padronizadas: `{ code, message, details? }`.

---

## 10. Rotas frontend

| Rota | Protegida | Descrição |
|------|-----------|-----------|
| `/cadastro` | Não | Formulário de cadastro |
| `/login` | Não | Login |
| `/` | Sim | Dashboard |
| `/lancamentos` | Sim | Listagem de lançamentos |
| `/lancamentos/novo` | Sim | Novo lançamento |
| `/relatorios` | Sim | Relatório geral |
| `/perfil` | Sim | Edição de perfil |
| `/cartao-credito` | Sim | Relatório mensal 1x vs parcelas — [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md) |
| `/contas-a-pagar` | Sim | Relatório de contas a pagar por vencimento — [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md) |

Layout autenticado: sidebar + topbar (menu usuário).

---

## 11. Documentação de componentes

Sempre que um componente React, hook, service ou módulo relevante for **criado ou atualizado**, deve existir um arquivo `.md` com:

- Responsabilidade
- Props / parâmetros / contrato
- Regras de negócio ou UI
- Dependências
- Exemplos de uso
- Estados: loading, error, empty

Local sugerido: ao lado do componente ou em `docs/components/<Nome>.md`.

Documentos globais adicionais:
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `README.md` (setup local)

---

## 12. Definition of Done (v1 local)

- [ ] `docker compose up` sobe PostgreSQL localmente
- [ ] Backend conecta ao Prisma e responde na porta configurada
- [ ] Frontend sobe em `localhost:3000` e consome a API local
- [ ] Fluxo: cadastro → login → dashboard
- [ ] Valores ocultos no login; toggle do olho funciona
- [ ] Filtro de mês na dashboard
- [ ] CRUD de lançamentos (à vista e parcelado)
- [ ] Soft delete operacional
- [ ] Relatório com filtro de categorias
- [ ] Perfil editável (exceto email) + logout
- [ ] Documentação `.md` dos componentes principais
- [ ] `.env.example` em frontend e backend

---

## 13. Roadmap (pós-v1)

| Fase | Entrega |
|------|---------|
| v1 | Web + API rodando **localmente** (este PRD) |
| v2 | Integração Telegram via Hermes Agent |
| v3 | Deploy produção, HTTPS, backups, monitoramento |
| v4 | Grupo familiar (convites + relatório consolidado) — [`PRD-FAMILY-GROUP.md`](./PRD-FAMILY-GROUP.md); cartão (limite/vários cartões) e cadastro/pagamento de contas a pagar. Relatório mensal de cartão + investimento: [`PRD-INVESTIMENTOS-CARTAO.md`](./PRD-INVESTIMENTOS-CARTAO.md). Fechamento explícito de fatura + relatório de contas: [`PRD-FATURA-CONTAS-A-PAGAR.md`](./PRD-FATURA-CONTAS-A-PAGAR.md) |

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| Lançamento | Entrada, despesa ou investimento registrado pelo usuário |
| Soft delete | Exclusão lógica via `deletedAt`, sem remover do banco |
| Mês vigente | Mês/ano corrente no fuso do usuário/servidor |
| Hermes Agent | Integração futura para bot Telegram |
| v1 local | Primeira versão executada apenas em ambiente de desenvolvimento local |
