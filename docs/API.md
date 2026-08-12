# API — Financial Control

Base local: `http://localhost:3333`. Erros usam `{ "code", "message", "details?" }`. Rotas autenticadas exigem `Authorization: Bearer <token>`.

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
{ "type": "EXPENSE", "name": "Mercado", "amount": 15000, "categoryId": "<id>", "paymentType": "CASH", "date": "2026-08-12" }
```

Para parcelar, envie `paymentType: "INSTALLMENT"` e `installmentsCount`. A API distribui as parcelas mensalmente.
