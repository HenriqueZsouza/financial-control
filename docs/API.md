# API — Financial Control

Base local: `http://localhost:3333`. Erros usam `{ "code", "message", "details?" }`. Rotas autenticadas exigem `Authorization: Bearer <token>`. IDs de usuário, categoria, lançamento e grupo de parcelas são inteiros sequenciais (`1`, `2`, `3`…).

Para explorar o contrato completo e executar requests localmente, abra a [Swagger UI](http://localhost:3333/api/docs). A spec JSON está em `http://localhost:3333/api/docs.json`; esta página permanece como resumo rápido.

| Método | Rota | Corpo/consulta | Retorno |
|---|---|---|---|
| POST | `/api/auth/register` | nome, sobrenome, email, telefone, senha, confirmação | usuário (201) |
| POST | `/api/auth/login` | `email`, `password` | `token`, usuário |
| GET | `/api/auth/me` | — | usuário |
| PATCH | `/api/users/me` | nome, sobrenome, telefone, senha opcional | usuário |
| GET | `/api/categories` | — | categorias seed |
| GET | `/api/transactions` | `month`, `year`, `categoryIds`, `type`, `scope=personal|family` opcionais | lançamentos |
| POST | `/api/transactions` | tipo, nome, `amount` em centavos, categoria, pagamento, data | lançamentos criados |
| GET/PATCH/DELETE | `/api/transactions/:id` | campos editáveis / — | lançamento / 204 |
| GET | `/api/dashboard/summary` | `month`, `year` | totais e categorias |
| GET | `/api/family` | — | `{ group }`, sendo `group: null` sem grupo ativo |
| POST | `/api/family/invites` | `email` | convite (201) e criação implícita do grupo |
| GET | `/api/family/invites/received` | — | convites pendentes recebidos (inclui `inviter: { firstName, lastName }`) |
| POST | `/api/family/invites/:id/accept` | — | grupo atualizado |
| POST | `/api/family/invites/:id/decline` | — | 204 |
| DELETE | `/api/family/members/:userId` | — | 204; somente owner |
| POST | `/api/family/leave` | — | 204; owner deve dissolver |
| POST | `/api/family/dissolve` | — | 204; somente owner |
| GET | `/api/notifications` | `unreadOnly` opcional | `{ notifications: { items, unreadCount } }` |
| POST | `/api/notifications/:id/read` | — | 204 |
| POST | `/api/notifications/read-all` | — | 204 |

Exemplo de criação à vista (`date` aceita `AAAA-MM-DD` ou ISO 8601 com horário; o frontend envia ISO com o horário da operação):

```json
{ "type": "EXPENSE", "name": "Mercado", "amount": 15000, "categoryId": 1, "paymentType": "CASH", "date": "2026-08-12T18:30:00.000Z" }
```

Com `AAAA-MM-DD` apenas, a API aplica o horário atual do servidor no dia informado.
Para crédito à vista (1x), use `paymentType: "CREDIT_1X"` — um único lançamento, sem grupo de parcelas.

Para parcelar, envie `paymentType: "INSTALLMENT"` e `installmentsCount`. A API distribui as parcelas mensalmente.

## Grupo familiar e notificações

O primeiro convite válido cria o grupo e torna quem convidou o único owner. O convidado precisa já ter cadastro e pode aceitar ou recusar em sua própria conta. Erros específicos incluem `USER_NOT_FOUND`, `CANNOT_INVITE_SELF`, `ALREADY_IN_FAMILY_GROUP`, `INVITE_ALREADY_PENDING` e `INVITE_NOT_PENDING`.

No relatório, `scope=personal` é o padrão e mantém a resposta legada. Com `scope=family`, somente membros ativos podem consultar os lançamentos ativos de todos os membros; cada item passa a incluir `member: { id, firstName, lastName }`. Sem grupo ativo, a API retorna `403 FAMILY_SCOPE_FORBIDDEN`.
