# Instruções para Claude Code

Siga integralmente [AGENTS.md](./AGENTS.md), especialmente a seção **Backend hexagonal**. Ela é a fonte normativa para mudanças em `backend/`: separação domain/application/adapters, ports, composição somente em `backend/src/main.ts`, proibições de import e invariantes/testes.

Antes de concluir uma mudança no backend, execute `npm test` e `npm run build` dentro de `backend/` quando o ambiente permitir.
