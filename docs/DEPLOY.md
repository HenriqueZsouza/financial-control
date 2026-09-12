# Deploy (Neon + Render + Vercel)

Sobe API e frontend em produção free; o Postgres local é migrado para o Neon.

## 1. Neon (banco)

1. Crie um projeto em [Neon](https://neon.tech) e copie a connection string (`DATABASE_URL`).
2. No Mac, com o dump local:

```bash
# Exemplo — use a URL do Neon (com sslmode=require)
psql "$NEON_DATABASE_URL" -f backups/financial_control_YYYYMMDD-HHMMSS.sql
```

Alternativa com `pg_restore` se o dump for custom; o dump deste projeto é SQL plain (`pg_dump`).

3. Confira contagens (ex.: `transactions`, `users`) contra o local.

> Não rode `prisma db seed` em produção se o dump já trouxe os dados.

## 2. Render (backend)

1. Conecte o repo `HenriqueZsouza/financial-control` no [Render](https://render.com).
2. Crie um **Web Service** com Docker:
   - Dockerfile: `backend/Dockerfile`
   - Context: `backend`
   - Ou use o `render.yaml` na raiz (Blueprint).
3. Variáveis (obrigatórias):

| Nome | Notas |
|---|---|
| `DATABASE_URL` | URL do Neon |
| `JWT_SECRET` | segredo longo (≥16) |
| `JWT_EXPIRES_IN` | ex. `7d` |
| `FRONTEND_URL` | URL do Vercel (+ `http://localhost:3000` se ainda usar local), separadas por vírgula |
| `TELEGRAM_ENABLED` | `true` |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_BOT_USERNAME` | sem `@` |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` |
| `SWAGGER_ENABLED` | `false` em produção |

4. Health check: `GET /health`.
5. Plano free hiberna ~15 min sem tráfego.

## 3. Vercel (frontend)

1. Importe o mesmo repo no [Vercel](https://vercel.com).
2. **Root Directory:** `frontend`.
3. Env: `NEXT_PUBLIC_API_URL` = URL pública da API no Render (sem barra final).
4. Deploy.

## 4. Telegram webhook

Com a API no ar:

```bash
curl --fail-with-body -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://SUA-API.onrender.com/integrations/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d 'allowed_updates=["message","callback_query"]'
```

Confirme com `getWebhookInfo`.

## 5. Keepalive (recomendado)

Configure um cron gratuito (ex. [cron-job.org](https://cron-job.org)) a cada 10 minutos:

`GET https://SUA-API.onrender.com/health`

Isso reduz cold start no webhook do Telegram. Abrir o frontend também acorda a API, mas não a mantém aquecida sozinho.

## 6. Frontend local (opcional)

Em `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://SUA-API.onrender.com
```

E inclua `http://localhost:3000` em `FRONTEND_URL` no Render.
