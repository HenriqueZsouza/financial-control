# Componentes e módulos principais

| Módulo | Responsabilidade | Estados |
|---|---|---|
| `lib/auth.tsx` | Sessão, logout e privacidade de valores | carregando usuário, sem sessão |
| `lib/api.ts` | Fetch, Bearer token e normalização de falhas | erro HTTP como `ApiError` |
| `TransactionForm` | Criar e editar lançamentos; converte reais para centavos | categorias carregando, erro, salvando |
| `DashboardCharts` | Gráficos Chart.js do resumo mensal | vazio para despesas |
| `PeriodFilter` | Seleção reutilizável de mês/ano | período corrente |

`TransactionForm` recebe opcionalmente `initial` (lançamento existente) e `onSaved`. Os hooks React Query recarregam dados após mutações ou mudanças dos filtros. O dashboard começa com `valuesVisible=false` a cada login; o estado é somente de memória e não é enviado à API.
