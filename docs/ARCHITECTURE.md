# Arquitetura

O projeto é um monorepo local com `frontend/` (Next.js App Router) e `backend/` (Express + Prisma). O PostgreSQL é iniciado pelo Docker Compose. O frontend acessa a API por `NEXT_PUBLIC_API_URL`.

## Camadas

- **Frontend:** páginas, componentes de UI, React Query para estado remoto e `lib/api.ts` para o contrato HTTP.
- **API:** rotas Express delegam para controllers; Zod valida a entrada antes de qualquer escrita.
- **Persistência:** Prisma é o único acesso ao PostgreSQL. Valores monetários são `Int` em centavos, eliminando erro de ponto flutuante.

## Segurança e regras

O login retorna um JWT Bearer, guardado apenas no `localStorage` para a sessão local da v1. O middleware `authenticate` extrai `userId` do token. Toda query de transação aplica esse `userId` e `deletedAt: null`; portanto, um usuário não lê nem altera recursos de outro.

Exclusões são lógicas: `DELETE` preenche `deletedAt`. Parcelamentos criam N transações em meses consecutivos com um `installmentGroupId`; a última parcela recebe os centavos restantes. O backend é a fonte de verdade para essas regras.
