# Stacks locais (local vs produção)

No Mac você pode apontar o projeto para o ambiente local (Docker) ou para os recursos de produção (API no Render + Postgres no Neon).

## Comandos

Na raiz do repositório:

```bash
./scripts/use-stack.sh local      # Docker + API local
./scripts/use-stack.sh prod-api  # Front local → API de produção (mais seguro)
./scripts/use-stack.sh prod      # Front → API prod + backend/.env no Neon
./scripts/use-stack.sh status
```

Depois de trocar o stack, **reinicie** `npm run dev` no frontend (e no backend, se estiver rodando).

## Arquivos

| Arquivo | Versionado? | Função |
|---|---|---|
| `frontend/.env.prod.example` | sim | Modelo do front em prod |
| `frontend/.env.prod.local` | **não** | URL da API Render |
| `backend/.env.prod.example` | sim | Modelo do backend no Neon |
| `backend/.env.prod.local` | **não** | `DATABASE_URL` / JWT de produção |
| `backend/.env.local.stack` | **não** | Backup automático do `.env` local |

## Recomendações

- No dia a dia, prefira **`prod-api`**: a UI local fala com a API no Render; o banco de produção só é tocado pela API remota.
- Use **`prod`** só quando precisar do Prisma Studio / API local no Neon. Mantenha `TELEGRAM_ENABLED=false` no `.env.prod.local` para não brigar com o webhook de produção.
- Nunca faça commit de `.env`, `.env.local` ou `.env.prod.local`.
