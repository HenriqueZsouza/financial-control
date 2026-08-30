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
| GET | `/api/transactions` | `month`, `year`, `categoryIds`, `type` (`INCOME` \| `EXPENSE` \| `INVESTMENT`), `scope=personal|family` opcionais | lançamentos |
| POST | `/api/transactions` | tipo, nome, `amount` em centavos, categoria, pagamento, data | lançamentos criados |
| GET/PATCH/DELETE | `/api/transactions/:id` | campos editáveis / — | lançamento / 204 |
| GET | `/api/dashboard/summary` | `month`, `year` | totais (`openingBalance`, `totalIncome`, `totalExpense`, `totalInvestment`, `balance`) e categorias |
| GET | `/api/credit-card/report` | `month`, `year` opcionais | fatura do mês: totais e listas `credit1x` / `installments` |
| GET | `/api/credit-card/open-invoice` | — | fatura em aberto (totais; não fecha) |
| POST | `/api/credit-card/invoices/close` | `{ "dueDate": "AAAA-MM-DD" }` | conta a pagar (201) |
| GET | `/api/payables` | `month`, `year` opcionais | contas a pagar do mês de vencimento |
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

Para investir, use `"type": "INVESTMENT"`. Investimentos não entram em `totalExpense` nem no `balance` do dashboard.

`balance` do dashboard é `openingBalance + totalIncome − totalExpense`. `openingBalance` é o saldo encerrado do mês anterior (entradas − despesas com `date` anterior ao início do período), positivo ou negativo.

Para parcelar, envie `paymentType: "INSTALLMENT"` e `installmentsCount`. A API distribui as parcelas mensalmente.

`GET /api/credit-card/report` devolve as compras `CREDIT_1X` e as parcelas `INSTALLMENT` do período (`date` de cada linha). `CASH` não entra. Sem `month`/`year`, usa o mês atual. Linhas já vinculadas a uma fatura fechada **continuam** no relatório.

`GET /api/credit-card/open-invoice` soma só o que ainda não foi fechado, com `date` até o instante atual. A fatura **não** fecha sozinha: só `POST /api/credit-card/invoices/close` com `dueDate` cria a conta a pagar (snapshot). Sem linhas em aberto: `422 EMPTY_OPEN_INVOICE`.

`GET /api/payables` filtra pelo mês/ano do **vencimento**. Sem período, usa o mês atual. Não há `POST /api/payables` nesta versão.

Lançamento já vinculado a fatura fechada não pode ser excluído nem ter valor/pagamento alterados (`422 INVOICE_LOCKED`).

## Grupo familiar e notificações

O primeiro convite válido cria o grupo e torna quem convidou o único owner. O convidado precisa já ter cadastro e pode aceitar ou recusar em sua própria conta. Erros específicos incluem `USER_NOT_FOUND`, `CANNOT_INVITE_SELF`, `ALREADY_IN_FAMILY_GROUP`, `INVITE_ALREADY_PENDING` e `INVITE_NOT_PENDING`.

No relatório, `scope=personal` é o padrão e mantém a resposta legada. Com `scope=family`, somente membros ativos podem consultar os lançamentos ativos de todos os membros; cada item passa a incluir `member: { id, firstName, lastName }`. Sem grupo ativo, a API retorna `403 FAMILY_SCOPE_FORBIDDEN`.
