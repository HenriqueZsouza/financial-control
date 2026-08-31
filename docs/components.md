# Componentes e módulos principais

| Módulo | Responsabilidade | Estados |
|---|---|---|
| `lib/auth.tsx` | Sessão, logout e privacidade de valores | carregando usuário, sem sessão |
| `lib/api.ts` | Fetch, Bearer token e normalização de falhas | erro HTTP como `ApiError` |
| `lib/theme.ts` | Tema MUI (tinta + cor só no dinheiro) | — |
| `lib/dates.ts` | dayjs pt-BR; exibição `DD/MM/YYYY HH:mm:ss` | data inválida → `—` |
| `lib/feedback.tsx` | Snackbar global de sucesso/erro/aviso | aberto / fechado |
| `AppShell` | Drawer, topbar, guarda de autenticação | loading, mobile menu |
| `TransactionForm` | Criar e editar lançamentos (entrada, despesa, investimento); reais → centavos; DatePicker | categorias carregando, erro, salvando |
| `TransactionTypeChip` | Rótulo do tipo: Entrada, Despesa, Investimento | — |
| `DashboardCharts` | Gráficos Chart.js (import dinâmico); saídas só despesas | vazio para despesas |
| Página `/cartao-credito` | Relatório mensal 1x vs parcelas (`GET /api/credit-card/report`) | loading, erro, vazio |
| `OpenInvoiceCard` | Card da home com fatura em aberto e ação de fechar | loading, erro, vazio (total 0), botão disabled |
| `CloseInvoiceDialog` | Modal de vencimento + confirmação do fechamento da fatura | aberto, pendente, DatePicker |
| Página `/contas-a-pagar` | Relatório de contas a pagar por mês de vencimento | loading, erro, vazio |
| `PeriodFilter` | Seleção reutilizável de mês/ano (MUI Select); `disableFuture` no relatório geral | período corrente |
| `ConfirmDialog` | Confirmação destrutiva (MUI Dialog) | aberto, pendente |
| `Amount` | Valor em BRL com blur de privacidade | visível / oculto |

`TransactionForm` recebe opcionalmente `initial` (lançamento existente) e `onSaved`. Os hooks React Query recarregam dados após mutações ou mudanças dos filtros. O dashboard começa com `valuesVisible=false` a cada login; o estado é somente de memória e não é enviado à API.

Botões, campos, selects, alertas, snackbars e diálogos vêm do MUI. Não recriar esses padrões em CSS.
