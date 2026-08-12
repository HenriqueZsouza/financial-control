# Financial Control

Aplicação local de controle financeiro familiar, composta por um frontend Next.js, API Express e PostgreSQL.

## Pré-requisitos

- Node.js 20+ e npm ou pnpm
- Docker e Docker Compose

## Executar localmente

```bash
# Na raiz do projeto, suba o PostgreSQL e o Adminer
cp .env.example .env
docker compose up -d

# API (outro terminal)
cp backend/.env.example backend/.env
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev

# Interface (outro terminal)
cp frontend/.env.example frontend/.env.local
cd frontend
npm install
npm run dev
```

Abra `http://localhost:3000`. A API responde em `http://localhost:3333`; `GET /health` verifica sua disponibilidade. O Adminer fica em `http://localhost:8080` (servidor `postgres`, usuário, senha e banco conforme `.env`).

## Scripts

| Diretório | Comando | Função |
|---|---|---|
| `backend` | `npm run dev` | API com recarga automática |
| `backend` | `npm run build` | Validação/compilação TypeScript |
| `backend` | `npm run prisma:studio` | Interface do banco |
| `frontend` | `npm run dev` | Interface local na porta 3000 |
| `frontend` | `npm run build` | Build de produção e validação do Next |

## Decisões importantes

- Valores são enviados e armazenados em **centavos** (`15000` equivale a R$ 150,00).
- A sessão usa JWT Bearer para o ambiente local. Os valores começam ocultos depois de cada login.
- Lançamentos excluídos recebem `deletedAt`; não são removidos do banco.
- Parcelamentos geram uma linha por mês, com a diferença de arredondamento na última parcela.

Veja [arquitetura](docs/ARCHITECTURE.md), [contratos da API](docs/API.md) e [componentes](docs/components.md) para detalhes.
