# PRD — Grupo familiar

**Produto:** Financial Control  
**Documento:** Spec de produto + contratos de implementação  
**Versão:** 1.0  
**Status:** Pronto para implementação  
**Data:** 15/08/2026  
**Escopo:** `backend/` + `frontend/`  
**Fonte de verdade do produto base:** [`PRD.md`](./PRD.md)  
**Contrato HTTP vigente (antes desta feature):** [`API.md`](./API.md)  
**Arquitetura backend:** hexagonal — [`PRD-HEXAGONAL.md`](./PRD-HEXAGONAL.md) + `AGENTS.md`

Este documento é **spec-driven**: a implementação segue os contratos, cortes, regras e critérios abaixo. Código que não estiver previsto nesta spec não entra no PR. Qualquer desvio de rota, payload, status ou erro exige atualizar este PRD e [`API.md`](./API.md) no mesmo PR.

---

## 1. Problema

O produto nasceu como controle financeiro **familiar**, mas hoje cada conta é isolada: cada membro vê só as próprias receitas e despesas.

Famílias precisam:

1. **Convidar** outro usuário (já cadastrado) para um grupo familiar, informando o e-mail
2. Permitir que o convidado **aceite ou recuse** o convite na própria conta
3. **Notificar** quem convidou sobre a decisão
4. No **relatório geral**, filtrar por visão de grupo e agregar os lançamentos de todos os membros ativos

Sem isso, o “controle familiar” fica só no nome: não há vínculo entre contas nem visão consolidada.

---

## 2. Objetivo

Entregar o módulo **Grupo familiar** de ponta a ponta, de forma que:

1. um usuário autentique possa criar (implicitamente) / gerenciar um grupo e convidar por e-mail
2. o convidado veja o convite pendente, aceite ou recuse
3. o solicitante receba notificação in-app do resultado
4. o relatório geral aceite escopo `personal` | `family` e, em `family`, inclua lançamentos de todos os membros ativos do grupo do usuário
5. dashboard, CRUD de lançamentos e perfil **continuem pessoais** (sem mudar o isolamento padrão)
6. o backend respeite a arquitetura hexagonal (domain → application/ports → adapters; wiring só em `main.ts`)

---

## 3. Fora de escopo

- Conta bancária conjunta / carteira compartilhada (lançamentos continuam pertencendo ao `userId` que os criou)
- Convidar e-mail **não cadastrado** (sem convite por link externo / onboarding forçado)
- Um usuário pertencendo a **mais de um** grupo familiar ao mesmo tempo
- Transferência de ownership / múltiplos owners
- Push, e-mail transacional, SMS ou Telegram para notificar convites
- Filtro de grupo na dashboard (só relatório nesta entrega)
- Edição/exclusão de lançamentos de outro membro
- Exportação PDF/Excel do relatório familiar
- OAuth, 2FA
- Deploy / CI novos além do que o repo já exige

**Invariantes existentes (não negociáveis):** soft delete, valores em centavos (`Int`), parcelamento com resto na última parcela, JWT Bearer, erros `{ code, message, details? }`, enums Prisma não vazam ao domínio.

**Invariante novo:** dados de outro membro só são legíveis via escopo `family` por quem é **membro ativo** do mesmo grupo; CRUD continua restrito ao próprio `userId`.

---

## 4. Personas e glossário

| Termo | Definição |
|-------|-----------|
| Grupo familiar | Unidade lógica que agrupa usuários da mesma família para visão consolidada no relatório |
| Owner | Criador do grupo; único que pode convidar e remover membros |
| Membro ativo | Usuário com vínculo `ACTIVE` no grupo |
| Convite | Solicitação `PENDING` enviada ao e-mail de um usuário cadastrado |
| Notificação in-app | Registro persistido para o destinatário; lida/não lida; sem canal externo nesta versão |
| Escopo do relatório | `personal` (padrão, só o logado) ou `family` (todos os membros ativos do grupo) |

---

## 5. Regras de negócio

1. **Um grupo por usuário:** um usuário só pode ser `ACTIVE` (ou `OWNER`) em no máximo um grupo. Convite novo falha se o convidado já estiver em outro grupo ou já tiver convite `PENDING` para qualquer grupo.
2. **Criação implícita:** o primeiro convite bem-sucedido de um usuário **sem grupo** cria o grupo automaticamente, com ele como `OWNER`. Não há tela separada “criar grupo” nesta versão.
3. **Convite só para usuário existente:** o e-mail deve resolver para um `User` ativo (`deletedAt` null). Caso contrário → `USER_NOT_FOUND` (404), sem vazar se o e-mail “quase” existe de outra forma; mensagem genérica: *“Nenhum usuário encontrado com este e-mail.”*
4. **Não convidar a si mesmo:** `CANNOT_INVITE_SELF` (400).
5. **Só o owner convida e remove:** membros não-owner não convidam nem expulsam.
6. **Aceitar convite:** muda status do convite para `ACCEPTED`, cria membership `ACTIVE`, notifica o owner (`INVITE_ACCEPTED`). Se o convidado já entrou em outro grupo entre o envio e o aceite → `ALREADY_IN_FAMILY_GROUP` (409).
7. **Recusar convite:** status `DECLINED`; notifica o owner (`INVITE_DECLINED`). Convite não pode ser reaberto; owner pode enviar novo convite depois (mesmo e-mail), desde que não haja outro `PENDING`.
8. **Sair do grupo:** membro `ACTIVE` (não owner) pode sair; membership vira `LEFT`. Owner **não** sai sem dissolver o grupo.
9. **Remover membro:** owner remove membro `ACTIVE` → status `REMOVED`; notifica o removido (`MEMBER_REMOVED`).
10. **Dissolver grupo:** só owner. Todos os memberships ativos encerram (`LEFT` / grupo `DISSOLVED`); convites `PENDING` cancelam (`CANCELLED`); membros ativos são notificados (`GROUP_DISSOLVED`).
11. **Privacidade do aceite:** ao aceitar, o membro consente que **outros membros ativos** vejam seus lançamentos **somente** no relatório com `scope=family` (nome do lançamento, valor, categoria, data, tipo, e identificação do membro).
12. **Relatório `family`:** exige que o solicitante seja membro ativo do grupo; agrega lançamentos com `deletedAt: null` de todos os `userId` ativos do grupo; filtros atuais (`month`, `year`, `categoryIds`, `type`) continuam válidos; cada item inclui `member` (`id`, `firstName`, `lastName`).
13. **Relatório `personal`:** comportamento atual (só `userId` do token); campo `member` omisso ou igual ao próprio usuário — nesta spec, **omisso** no modo personal para não mudar o contrato legado além do necessário.
14. **Notificações:** criadas pelo domínio/use case no mesmo fluxo da ação; listagem paginada simples (ou lista completa ordenada por `createdAt` desc na v1); marcar como lida individualmente ou “marcar todas”.
15. **Isolamento de escrita:** `POST/PATCH/DELETE` de transações **nunca** aceitam `userId` de outro membro.

---

## 6. User stories e critérios de aceite

### US-FG-01 — Convidar membro por e-mail

**Como** owner (ou usuário sem grupo), **quero** informar o e-mail de um familiar **para** solicitar que ele entre no meu grupo.

**Critérios de aceite:**
- [ ] Campo e-mail validado (formato)
- [ ] Sucesso cria convite `PENDING` e notificação `FAMILY_INVITE_RECEIVED` para o convidado
- [ ] Se eu ainda não tenho grupo, o grupo é criado comigo como owner no mesmo fluxo
- [ ] Erros claros: usuário inexistente, auto-convite, já membro, convite pendente, sem permissão (não-owner)
- [ ] Feedback MUI (Snackbar) de sucesso/erro

### US-FG-02 — Aceitar ou recusar convite

**Como** convidado, **quero** ver convites pendentes e aceitar ou recusar **para** controlar se compartilho minha visão no relatório familiar.

**Critérios de aceite:**
- [ ] Lista de convites `PENDING` destinados a mim
- [ ] Aceitar → entro como membro ativo; owner é notificado
- [ ] Recusar → convite encerrado; owner é notificado
- [ ] Convite já respondido / cancelado não pode ser alterado (`INVITE_NOT_PENDING`)

### US-FG-03 — Notificações in-app

**Como** usuário, **quero** ver notificações do grupo **para** saber se meu convite foi aceito/recusado e se recebi um convite.

**Critérios de aceite:**
- [ ] Indicador no shell (ex.: badge no ícone) com contagem de não lidas
- [ ] Lista com tipo, mensagem, data (`DD/MM/YYYY HH:mm:ss`) e estado lida/não lida
- [ ] Tipos mínimos: `FAMILY_INVITE_RECEIVED`, `INVITE_ACCEPTED`, `INVITE_DECLINED`, `MEMBER_REMOVED`, `GROUP_DISSOLVED`
- [ ] Marcar uma ou todas como lidas

### US-FG-04 — Gerenciar grupo

**Como** owner ou membro, **quero** ver quem está no grupo e ações básicas **para** manter o círculo familiar atualizado.

**Critérios de aceite:**
- [ ] Tela/seção “Família” mostra grupo atual (nome opcional + lista de membros com papel)
- [ ] Owner: convidar, remover membro, dissolver grupo
- [ ] Membro: sair do grupo
- [ ] Usuário sem grupo: empty state + CTA para convidar (cria o grupo)

### US-FG-05 — Relatório com filtro de grupo familiar

**Como** membro ativo, **quero** filtrar o relatório por grupo familiar **para** ver entradas/despesas de todos os membros.

**Critérios de aceite:**
- [ ] Controle de escopo no relatório: `Individual` (padrão) | `Grupo familiar`
- [ ] Escopo familiar desabilitado ou com empty/erro amigável se eu não estiver em grupo
- [ ] Em modo familiar: totais e tabela incluem lançamentos de todos os membros ativos
- [ ] Coluna ou chip identificando o membro de cada linha
- [ ] Filtros de período, categoria e tipo continuam funcionando
- [ ] Soft-deleted excluídos; usuário sem membership ativo recebe `FORBIDDEN` / mensagem clara se forçar `scope=family`

---

## 7. Modelo de dados

### 7.1 Enums (domínio + Prisma mapeado no adapter)

```
FamilyGroupStatus: ACTIVE | DISSOLVED
FamilyMemberRole: OWNER | MEMBER
FamilyMembershipStatus: ACTIVE | LEFT | REMOVED
FamilyInviteStatus: PENDING | ACCEPTED | DECLINED | CANCELLED | EXPIRED
NotificationType:
  FAMILY_INVITE_RECEIVED
  INVITE_ACCEPTED
  INVITE_DECLINED
  MEMBER_REMOVED
  GROUP_DISSOLVED
```

`EXPIRED` fica reservado; nesta versão **não** há job de expiração. Convites `PENDING` não expiram automaticamente.

### 7.2 Entidades

#### FamilyGroup
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Int sequencial | PK |
| `name` | String | Default: `"Família de {firstName}"` do owner na criação; editável pelo owner (opcional nesta entrega — se não houver UI de rename, manter default) |
| `status` | FamilyGroupStatus | |
| `createdAt` / `updatedAt` | DateTime | |
| `deletedAt?` | DateTime? | soft delete alinhado ao restante do produto (dissolver preenche `deletedAt` **e** `status=DISSOLVED`) |

#### FamilyMembership
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Int | PK |
| `familyGroupId` | Int | FK |
| `userId` | Int | FK |
| `role` | FamilyMemberRole | |
| `status` | FamilyMembershipStatus | |
| `joinedAt` | DateTime | preenchido ao aceitar (owner: na criação) |
| `leftAt?` | DateTime? | saída/remoção/dissolução |
| `createdAt` / `updatedAt` | DateTime | |

**Índices / constraints:**
- Unique parcial (ou equivalente): no máximo **um** membership `ACTIVE` por `userId`
- Unique `(familyGroupId, userId)` — histórico de reentradas: se o produto permitir reentrar no futuro, criar novo registro; nesta versão, após `LEFT`/`REMOVED`, novo convite pode recriar membership `ACTIVE` (mesmo par grupo+user: atualizar o registro existente **ou** unique só para `ACTIVE` — **decisão de implementação:** preferir **um registro por `(familyGroupId, userId)`**, reativando status/`joinedAt` no aceite)

#### FamilyInvite
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Int | PK |
| `familyGroupId` | Int | FK |
| `inviterId` | Int | owner que convidou |
| `inviteeId` | Int | usuário convidado |
| `inviteeEmail` | String | snapshot do e-mail no momento do convite |
| `status` | FamilyInviteStatus | |
| `respondedAt?` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

**Constraints:**
- No máximo um convite `PENDING` por `(familyGroupId, inviteeId)`
- No máximo um `PENDING` por `inviteeId` global (convidado não acumula vários pendentes)

#### Notification
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Int | PK |
| `userId` | Int | destinatário |
| `type` | NotificationType | |
| `title` | String | curto |
| `body` | String | mensagem legível |
| `payload` | Json? | ex.: `{ inviteId, familyGroupId }` para deep-link |
| `readAt?` | DateTime? | null = não lida |
| `createdAt` | DateTime | |

---

## 8. Contratos de comportamento (spec)

### 8.1 Convidar

```
Dado usuário A autenticado sem grupo
Quando InviteFamilyMember(email de B cadastrado e sem grupo)
Então cria FamilyGroup (A=OWNER ACTIVE), FamilyInvite PENDING, Notification FAMILY_INVITE_RECEIVED para B

Dado A já é OWNER ACTIVE
Quando InviteFamilyMember(email de B elegível)
Então cria apenas Invite + Notification (não cria segundo grupo)

Dado A é MEMBER ACTIVE (não owner)
Quando InviteFamilyMember
Então DomainError FORBIDDEN (403)

Dado email inexistente / soft-deleted
Quando InviteFamilyMember
Então DomainError USER_NOT_FOUND (404)

Dado email = A
Então CANNOT_INVITE_SELF (400)

Dado B já ACTIVE em qualquer grupo
Então ALREADY_IN_FAMILY_GROUP (409)

Dado B já tem Invite PENDING
Então INVITE_ALREADY_PENDING (409)
```

### 8.2 Responder convite

```
Dado Invite PENDING para B
Quando AcceptFamilyInvite(inviteId) como B
Então Invite ACCEPTED; Membership ACTIVE MEMBER; Notification INVITE_ACCEPTED para inviter

Dado Invite PENDING para B
Quando DeclineFamilyInvite(inviteId) como B
Então Invite DECLINED; Notification INVITE_DECLINED para inviter; sem membership

Dado Invite não PENDING ou não pertence a B
Então INVITE_NOT_PENDING ou NOT_FOUND (404 sem vazar)
```

### 8.3 Sair / remover / dissolver

```
Dado MEMBER ACTIVE
Quando LeaveFamilyGroup
Então membership LEFT; owner notificado? — nesta versão: Notification opcional MEMBER_LEFT (incluir tipo MEMBER_LEFT se implementar; senão documentar ausência). Spec mínima: owner vê a lista atualizada sem membro.

Dado OWNER
Quando LeaveFamilyGroup
Então DomainError OWNER_CANNOT_LEAVE (400) — deve Dissolver

Dado OWNER remove membro M
Então M REMOVED; Notification MEMBER_REMOVED para M

Dado OWNER dissolve
Então grupo DISSOLVED + deletedAt; memberships ACTIVE → LEFT; invites PENDING → CANCELLED;
     Notifications GROUP_DISSOLVED para membros que eram ACTIVE (exceto o owner, opcional)
```

### 8.4 Relatório / listagem com escopo

```
Dado scope omitido ou scope=personal
Quando ListTransactions
Então comportamento idêntico ao atual (só userId do token)

Dado scope=family e usuário ACTIVE no grupo G
Quando ListTransactions com filtros
Então retorna lançamentos de todos userId ACTIVE em G, deletedAt null, filtros aplicados
    cada item inclui member: { id, firstName, lastName }

Dado scope=family e usuário sem grupo ACTIVE
Então DomainError FORBIDDEN (403) code FAMILY_SCOPE_FORBIDDEN

Dado scope inválido
Então VALIDATION_ERROR (400)
```

**Dashboard:** sem mudança nesta entrega (`GetDashboardSummary` permanece pessoal).

---

## 9. API (contratos a acrescentar em `docs/API.md`)

Auth: `Authorization: Bearer <token>` em todas as rotas abaixo. IDs inteiros sequenciais. Erros `{ code, message, details? }`.

### 9.1 Família

| Método | Endpoint | Corpo / query | Sucesso | Erros relevantes |
|--------|----------|---------------|---------|------------------|
| GET | `/api/family` | — | Grupo atual + membros **ou** `204`/`null` se sem grupo — **decisão:** `200` com `{ group: null }` para simplificar o frontend | — |
| POST | `/api/family/invites` | `{ "email": string }` | `201` invite | `400` `CANNOT_INVITE_SELF`, `403` `FORBIDDEN`, `404` `USER_NOT_FOUND`, `409` `ALREADY_IN_FAMILY_GROUP` / `INVITE_ALREADY_PENDING` |
| GET | `/api/family/invites/received` | — | lista de convites `PENDING` recebidos | — |
| GET | `/api/family/invites/sent` | — | convites enviados (owner; opcional filtrar status) | `403` se não owner / sem grupo |
| POST | `/api/family/invites/:id/accept` | — | `200` grupo + membership | `404`, `409` `ALREADY_IN_FAMILY_GROUP`, `422` `INVITE_NOT_PENDING` |
| POST | `/api/family/invites/:id/decline` | — | `204` | `404`, `422` `INVITE_NOT_PENDING` |
| DELETE | `/api/family/members/:userId` | — | `204` (owner remove) | `403`, `404`, `400` se tentar remover a si como owner |
| POST | `/api/family/leave` | — | `204` | `400` `OWNER_CANNOT_LEAVE`, `404` se sem grupo |
| POST | `/api/family/dissolve` | — | `204` | `403` se não owner |

### 9.2 Notificações

| Método | Endpoint | Corpo / query | Sucesso |
|--------|----------|---------------|---------|
| GET | `/api/notifications` | `unreadOnly?` bool opcional | `{ notifications, unreadCount }` |
| POST | `/api/notifications/:id/read` | — | `204` |
| POST | `/api/notifications/read-all` | — | `204` |

### 9.3 Relatório / transações (extensão)

`GET /api/transactions` ganha query opcional:

| Query | Valores | Default |
|-------|---------|---------|
| `scope` | `personal` \| `family` | `personal` |

Resposta de cada lançamento **quando `scope=family`:**

```json
{
  "id": 10,
  "userId": 2,
  "type": "EXPENSE",
  "name": "Mercado",
  "amount": 15000,
  "categoryId": 1,
  "paymentType": "CASH",
  "date": "2026-08-15",
  "member": { "id": 2, "firstName": "Ana", "lastName": "Silva" }
}
```

Com `scope=personal`, o campo `member` **não** é enviado (compatibilidade).

---

## 10. Arquitetura backend (hexagonal)

### 10.1 Onde colocar

| Camada | Conteúdo |
|--------|----------|
| `domain/family/` | entidades, VOs, erros (`DomainError` codes da §8) |
| `domain/notification/` | tipo de notificação + regras mínimas de leitura |
| `application/ports/inbound/family*` | Invite, Accept, Decline, GetFamily, Leave, Remove, Dissolve |
| `application/ports/inbound/notifications*` | List, MarkRead, MarkAllRead |
| `application/ports/outbound/` | `FamilyGroupRepository`, `FamilyInviteRepository`, `NotificationRepository` (+ extensão de `TransactionRepository.list` para múltiplos `userId`) |
| `application/use-cases/family/` | orquestra regras §5–§8 |
| `application/use-cases/notifications/` | listagem / leitura |
| `adapters/outbound/prisma/` | models + mappers; enums Prisma ↔ domínio |
| `adapters/inbound/http/` | routes, controllers finos, DTOs Zod em `dto/` |
| `main.ts` | único composition root |

### 10.2 Ports inbound (mínimo)

| Port | Método |
|------|--------|
| `GetMyFamily` | `execute(userId) → FamilyView \| null` |
| `InviteFamilyMember` | `execute(userId, email) → InviteView` |
| `ListReceivedInvites` | `execute(userId) → InviteView[]` |
| `AcceptFamilyInvite` | `execute(userId, inviteId) → FamilyView` |
| `DeclineFamilyInvite` | `execute(userId, inviteId) → void` |
| `RemoveFamilyMember` | `execute(ownerId, memberUserId) → void` |
| `LeaveFamilyGroup` | `execute(userId) → void` |
| `DissolveFamilyGroup` | `execute(ownerId) → void` |
| `ListNotifications` | `execute(userId, unreadOnly?) → { items, unreadCount }` |
| `MarkNotificationRead` | `execute(userId, id) → void` |
| `MarkAllNotificationsRead` | `execute(userId) → void` |

`ListTransactions` / repositório: filtros passam a aceitar `scope` resolvido no use case (use case carrega `memberUserIds` do grupo e chama o port outbound com `userIds[]`).

### 10.3 Testes obrigatórios

Cobrir use cases com fakes dos ports (`npm test` em `backend/`):

- criar grupo no primeiro convite
- aceitar / recusar + criação de notificação
- conflitos 409 (já em grupo, pending)
- `scope=family` agrega só ACTIVE; membro LEFT não entra
- owner não leave; dissolve cancela pendentes
- isolamento: aceitar convite de outro usuário → NOT_FOUND

---

## 11. Frontend

### 11.1 Rotas

| Rota | Protegida | Descrição |
|------|-----------|-----------|
| `/familia` | Sim | Estado do grupo, membros, convidar, sair/dissolver |
| `/notificacoes` | Sim | Lista de notificações (alternativa: drawer no shell — **decisão:** página + badge no topbar) |

Relatório (`/relatorios`): novo controle de escopo; sem rota nova.

### 11.2 Shell

- Item de menu: **Família** (ícone MUI, ex. `FamilyRestroom` / `Groups`)
- Topbar: ícone de notificações com badge de `unreadCount` (poll React Query com staleTime curto ou refetch on focus)
- Snackbar via `useFeedback` nos fluxos de convite/resposta

### 11.3 UI (MUI)

- Formulário de convite: `TextField` e-mail + `Button`
- Convites recebidos: `Alert` / lista com `Button` Aceitar | Recusar
- Membros: `Table` ou lista com `Chip` de papel (Owner / Membro)
- Relatório: `TextField select` Escopo — Individual | Grupo familiar
- Datas com `lib/dates.ts` (`DD/MM/YYYY HH:mm:ss`)
- Valores com `Amount` (cor só no dinheiro)

### 11.4 Cliente API / React Query

- Estender `services` e `queryKeys` (`family`, `familyInvites`, `notifications`, `report` incluindo `scope`)
- Invalidar `family` + `notifications` após accept/decline/invite
- Invalidar `report` ao mudar escopo

### 11.5 Documentação de componentes

Atualizar/criar `.md` para telas/componentes novos relevantes (`docs/components/` ou ao lado do componente), conforme [`PRD.md`](./PRD.md) §11.

---

## 12. Ordem de implementação sugerida

| Fase | Entrega | Pronto quando |
|------|---------|---------------|
| F1 | Prisma: models + migration + mappers domínio | migrate sobe; enums mapeados |
| F2 | Use cases família + notificações + testes fake | `npm test` cobre §8 |
| F3 | HTTP DTOs/controllers/routes + OpenAPI + `API.md` | Swagger e `API.md` alinhados |
| F4 | Extensão `ListTransactions` com `scope` | personal inalterado; family agregado |
| F5 | Frontend `/familia` + notificações no shell | fluxo convite → aceite → badge |
| F6 | Frontend relatório com escopo | coluna membro + totais consolidados |

Não misturar com refactors não pedidos. Wiring só em `main.ts`.

---

## 13. Definition of Done

- [ ] Migration Prisma aplicada; seed não quebra
- [ ] Use cases de família/notificações testados com ports fake
- [ ] `npm test` e `npm run build` ok em `backend/`
- [ ] `docs/API.md` e OpenAPI atualizados com rotas e `scope`
- [ ] Fluxo E2E local: A convida B → B aceita → A vê notificação de aceite → ambos veem membros
- [ ] B recusa → A vê notificação de recusa; B não aparece como membro
- [ ] Relatório Individual = só eu; Grupo familiar = todos ACTIVE com coluna de membro
- [ ] Usuário sem grupo não consegue `scope=family`
- [ ] Dashboard/CRUD pessoais intactos
- [ ] Frontend: menu Família, badge de notificações, filtros do relatório
- [ ] Sem violação das regras hexagonais (`AGENTS.md`)

---

## 14. Decisões fechadas nesta spec

| Tema | Decisão |
|------|--------|
| Canal de notificação | Somente in-app |
| Convidado | Precisa já ter conta |
| Quantidade de grupos | Máx. 1 membership ACTIVE por usuário |
| Quem convida | Só OWNER |
| Criação do grupo | Implícita no primeiro convite |
| Escopo familiar | Só no relatório (`GET /api/transactions?scope=family`) |
| Consentimento | Aceitar convite = autorizar leitura no relatório familiar pelos membros ACTIVE |
| Expiração de convite | Não automática nesta versão |

---

## 15. Relação com o PRD base

Esta feature materializa o item de roadmap “conta familiar compartilhada” do [`PRD.md`](./PRD.md), com o corte **visão consolidada no relatório** (não carteira única).

Após merge da implementação, atualizar no `PRD.md`:

- remover “Multi-usuário familiar compartilhado” de fora de escopo da v1 (ou marcar como entregue via este PRD)
- apontar link para este documento
- ajustar glossário / user stories se necessário
