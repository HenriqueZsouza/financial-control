# Arquitetura

O projeto é um monorepo local com `frontend/` (Next.js App Router) e `backend/` (Express + Prisma). PostgreSQL roda pelo Docker Compose e o frontend acessa a API por `NEXT_PUBLIC_API_URL`.

## Backend: Arquitetura Hexagonal

O backend organiza dependências de fora para dentro:

```
adapters (HTTP, Prisma, bcrypt, JWT) → application (use cases e ports) → domain
                                                    ↑
                                          ports inbound/outbound
```

- **Domain** contém entidades, tipos, Value Objects (`Money`, `Period`) e `DomainError`; não conhece framework ou infraestrutura.
- **Application** declara ports e implementa casos de uso. Ela recebe repositórios, segurança, relógio e gerador de IDs por injeção.
- **Adapters inbound** traduzem HTTP: Express, rotas, controllers finos, DTOs Zod, autenticação e apresentação de erros. A documentação OpenAPI/Swagger centralizada também vive em `adapters/inbound/http/openapi/`.
- **Adapters outbound** implementam os ports por Prisma, bcrypt, JWT, relógio e IDs sequenciais. Enums Prisma são mapeados nesta borda.
- **`backend/src/main.ts`** é o composition root: é o único lugar que instancia adaptadores e os conecta aos casos de uso.

O contrato HTTP em [API.md](./API.md) permanece o mesmo; HTTP é apenas o adapter inbound. Prisma continua sendo o único acesso ao PostgreSQL, e valores monetários seguem sendo `Int` em centavos.

## Frontend

O frontend é Next.js App Router com React Query. A UI interativa vem do **MUI** (tema em `frontend/lib/theme.ts`): botões, campos, selects, diálogos, alertas e snackbars não são recriados em CSS. Datas passam por **dayjs** (`frontend/lib/dates.ts`) no formato de exibição `DD/MM/YYYY HH:mm:ss`; o calendário enviado à API continua `YYYY-MM-DD`. A cor saturada só aparece em valores monetários.

As regras operacionais para futuras mudanças estão em [AGENTS.md](../AGENTS.md), com espelhos para Claude e Cursor. A especificação completa da migração está em [PRD-HEXAGONAL.md](./PRD-HEXAGONAL.md).

## Invariantes

JWT Bearer identifica o usuário. Toda query padrão de transação aplica `userId` e `deletedAt: null`; exclusões são lógicas. Parcelamentos criam lançamentos mensais de mesmo grupo e deixam os centavos restantes na última parcela. Erros HTTP usam `{ code, message, details? }`.
