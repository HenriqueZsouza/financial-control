# Financial Control

Aplicação web de controle financeiro familiar — v1 local (Next.js + Express + PostgreSQL).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Next.js 14 (App Router), TypeScript, MUI, Tailwind CSS, React Query, Chart.js |
| Backend | Express, TypeScript, Prisma ORM, PostgreSQL, Zod, Bcrypt |
| Banco | PostgreSQL 16 (Docker) |
| Dev | Docker Compose, Prisma Studio, Adminer |

## Estrutura

```
financial-control/
├── frontend/          # Next.js app
├── backend/           # Express API
├── docs/              # PRD, ARCHITECTURE, API
├── docker-compose.yml # PostgreSQL + Adminer
├── .env.example       # Variáveis de ambiente
└── README.md
```

## Pré-requisitos

- Docker & Docker Compose
- Node.js 20+ e pnpm (ou npm/yarn)
- Git

## Setup local

```bash
# 1. Clone e entre na pasta
cd financial-control

# 2. Suba o banco
docker compose up -d

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env se necessário (senhas, portas, JWT_SECRET)

# 4. Backend
cd backend
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed   # categorias iniciais
pnpm dev              # http://localhost:3333

# 5. Frontend (novo terminal)
cd ../frontend
pnpm install
pnpm dev              # http://localhost:3000
```

## Acessos

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3333 |
| Prisma Studio | `cd backend && pnpm prisma studio` |
| Adminer | http://localhost:8080 (Server: `postgres`, User/Pass/DB: `financial_control`) |

## Scripts úteis

```bash
# Backend
cd backend
pnpm dev              # Desenvolvimento (tsx watch)
pnpm build            # Compila para dist/
pnpm start            # Produção (node dist/)
pnpm prisma studio    # UI do banco
pnpm prisma migrate dev  # Nova migration
pnpm prisma db seed   # Reexecuta seed

# Frontend
cd frontend
pnpm dev              # Desenvolvimento (Turbopack)
pnpm build            # Build produção
pnpm start            # Servidor produção
pnpm lint             # ESLint
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```env
# Database
DB_USER=financial_control
DB_PASSWORD=financial_control
DB_NAME=financial_control
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public

# Backend
BACKEND_PORT=3333
JWT_SECRET=gere-uma-chave-forte-aqui
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Documentação

- `docs/PRD.md` — Requisitos do produto (v1)
- `docs/ARCHITECTURE.md` — Decisões de arquitetura (a criar)
- `docs/API.md` — Contratos da API (a criar)

## Roadmap

- **v1** (atual): Web + API local
- **v2**: Integração Telegram via Hermes Agent
- **v3**: Deploy produção, HTTPS, monitoramento
- **v4**: Conta familiar, cartão de crédito, contas a pagar

## Licença

MIT — uso livre para estudo e projeto pessoal.