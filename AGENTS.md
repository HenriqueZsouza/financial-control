# Instruções do repositório

- `frontend/` é Next.js; preserve o contrato de `docs/API.md` ao consumir a API.
- `backend/` usa Arquitetura Hexagonal. Leia estas regras antes de mudar qualquer arquivo do backend.

## Backend hexagonal

```
backend/src/
  domain/                 # entidades, VOs e DomainError; núcleo puro
  application/
    ports/inbound/        # contratos dos casos de uso
    ports/outbound/       # contratos de I/O
    use-cases/            # orquestra as regras por meio de ports
  adapters/
    inbound/http/         # Express, controllers, DTOs Zod, middleware e presenters
    outbound/prisma/      # Prisma e mapeamento de enums
    outbound/security/    # bcrypt e JWT
    outbound/clock/       # relógio e UUID reais
  config/                 # configuração de ambiente
  main.ts                 # único composition root
```

### Dependências permitidas

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `domain/` | TypeScript e o próprio domínio | `adapters/`, Express, Prisma, Zod, JWT, bcrypt |
| `application/` | `domain/`, ports | `adapters/`, Express, Prisma |
| `adapters/inbound/` | application/domain/Express/Zod | Prisma |
| `adapters/outbound/` | ports/domain/infra necessária | Express |

✅ `application/use-cases/...` importa `ports/outbound/...`.

❌ `domain/...` importa `@prisma/client`.

❌ controller ou use case instancia `prisma`.

❌ domain/application importam `express`, `zod`, `jsonwebtoken` ou `bcryptjs`.

❌ domain usa enums de `@prisma/client`; defina tipos próprios e mapeie no adapter Prisma.

❌ coloque Zod fora de `adapters/inbound/http/dto/` ou crie um atalho `service/` que fure o hexágono.

Não altere rotas, payloads, status ou erros sem atualizar `docs/API.md` e o PRD de produto aplicável.

### Onde colocar código novo

- Regra de negócio: `domain/` ou `application/use-cases/`.
- Novo I/O: port outbound e adapter Prisma/security/clock.
- HTTP, Zod ou OpenAPI/Swagger: `adapters/inbound/http/` (a spec centralizada fica em `openapi/`).
- Instanciação e injeção: somente `main.ts`.

Para criar um caso de uso: (1) modele tipos/erros no domínio; (2) crie o port inbound e o use case; (3) adicione port outbound se necessário; (4) implemente o adapter; (5) crie DTO Zod e controller fino; (6) registre em `main.ts`; (7) teste o use case com fakes dos ports.

### Invariantes e testes

- Toda transação é isolada por `userId` e leituras padrão filtram `deletedAt: null`.
- Exclusão é soft delete; valores são `Int` em centavos.
- Parcelas compartilham grupo, distribuem o resto na última e avançam meses em UTC.
- Autenticação é JWT Bearer; erros HTTP usam `{ code, message, details? }`.
- Teste casos de uso com ports fake (`npm test` em `backend/`); só acrescente testes HTTP quando o contrato mudar.

Definition of Done de PR de backend: respeitar estas camadas/imports, preservar `docs/API.md`, atualizar `docs/ARCHITECTURE.md` se a estrutura mudar e atualizar este arquivo, `CLAUDE.md` e a rule Cursor se a regra arquitetural mudar.
