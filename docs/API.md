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
| GET | `/api/transactions` | `month`, `year`, `categoryIds`, `type` opcionais | lançamentos |
| POST | `/api/transactions` | tipo, nome, `amount` em centavos, categoria, pagamento, data | lançamentos criados |
| GET/PATCH/DELETE | `/api/transactions/:id` | campos editáveis / — | lançamento / 204 |
| GET | `/api/dashboard/summary` | `month`, `year` | totais e categorias |

Exemplo de criação à vista:

```json
{ "type": "EXPENSE", "name": "Mercado", "amount": 15000, "categoryId": 1, "paymentType": "CASH", "date": "2026-08-12" }
```

Para crédito à vista (1x), use `paymentType: "CREDIT_1X"` — um único lançamento, sem grupo de parcelas.

Para parcelar, envie `paymentType: "INSTALLMENT"` e `installmentsCount`. A API distribui as parcelas mensalmente.
