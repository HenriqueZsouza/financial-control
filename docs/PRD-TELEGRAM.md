# PRD — Lançamentos por Telegram

**Produto:** Financial Control  
**Documento:** proposta de produto e contrato de implementação  
**Versão:** 0.1 (proposta)  
**Status:** implementado com parser determinístico, sem dependência de IA  
**Data:** 30/08/2026  
**Escopo:** `backend/` + Bot API do Telegram; sem mudança obrigatória no frontend  
**Referências:** [PRD base](./PRD.md), [API](./API.md), [arquitetura](./ARCHITECTURE.md) e `AGENTS.md`

---

## 1. Problema e oportunidade

O cadastro web de um lançamento exige abrir a aplicação, preencher o formulário e escolher campos. Para compras cotidianas isso aumenta o risco de esquecimento. O Financial Control antecipou uma integração com Telegram no PRD base, mas ainda não possui identidade Telegram, webhook, conversa nem uma entrada alternativa para os lançamentos.

Esta funcionalidade permite registrar receitas e despesas em uma conversa privada com um bot do Telegram, preservando as regras já existentes do produto: usuário dono do lançamento, valores em centavos, categoria válida, data com horário, parcelamento em UTC, soft delete e bloqueio de itens em fatura fechada.

## 2. Objetivo

Permitir que um usuário vincule sua conta ao bot e registre uma transação a partir de linguagem natural, por exemplo:

> `mercado 150,50 hoje`

O bot interpreta a mensagem, mostra um resumo e só cria o lançamento após uma confirmação explícita. O lançamento resultante é idêntico a um criado pelo formulário web e aparece normalmente em dashboard, listagem, relatório e fatura, conforme tipo e forma de pagamento.

### Métricas de sucesso

- Pelo menos 90% dos lançamentos confirmados pelo bot são criados sem correção posterior.
- Pelo menos 80% das mensagens com todos os campos obrigatórios chegam à etapa de confirmação em uma única interação.
- Zero lançamento criado sem uma ação inequívoca de confirmação do usuário.
- Taxa de falhas de webhook e de duplicidade observável por logs/métricas.

## 3. Escopo

### Dentro do escopo da primeira entrega

1. Vincular e desvincular uma conta Telegram à conta autenticada do Financial Control.
2. Receber mensagens privadas via webhook oficial do Telegram Bot API.
3. Interpretar texto livre para **despesa** e **receita**; data, categoria e forma de pagamento podem ser inferidas ou perguntadas.
4. Exibir proposta de lançamento e confirmar por botão ou comando; criar somente após confirmação.
5. Suportar `CASH`, `CREDIT_1X` e `INSTALLMENT`, incluindo número de parcelas.
6. Exibir, no Telegram, erros de validação e instruções para completar ou cancelar o rascunho.
7. Registrar origem/auditoria do lançamento e garantir idempotência para atualizações repetidas do Telegram.
8. Atualizar `docs/API.md` e OpenAPI para as rotas web de vínculo; o webhook não é uma API pública de cliente.

### Fora do escopo

- Grupos, canais, mensagens encaminhadas e conversas com mais de um participante.
- Criar, editar ou excluir lançamentos existentes pelo Telegram.
- Consulta de saldo, relatórios, fatura, contas a pagar ou notificações pelo bot.
- Cadastro/edição de categorias pelo bot.
- Áudio, imagem, OCR de recibos, anexos, localização ou importação de extrato.
- Investimentos na primeira versão (o bot pede que o usuário use o formulário web).
- Pagamento de conta, movimentação bancária real, PIX ou integração com bancos.
- Compartilhar lançamentos com o grupo familiar; o lançamento sempre pertence à conta vinculada.
- Uma segunda conta Telegram para o mesmo usuário, ou uma mesma conta Telegram vinculada a mais de um usuário.

## 4. Decisões de produto propostas

| Tema | Decisão proposta | Motivo |
|---|---|---|
| Canal | Bot privado no Telegram | Evita atribuição ambígua de usuário e vazamento de dados em grupos. |
| Associação | Código de vínculo de uso único, gerado no web e enviado em `/start <código>` | Não expõe JWT nem credenciais no Telegram. |
| Gravação | Sempre em duas etapas: interpretar → confirmar | Dinheiro, categoria e cartão exigem revisão humana. |
| Interpretação | Parser determinístico por regras e perguntas de desambiguação | Mantém o comportamento previsível e sem dependência de fornecedor de IA. |
| Categoria | Inferir só quando houver correspondência inequívoca; caso contrário perguntar com opções | Evita classificar silenciosamente uma despesa na categoria errada. |
| Data | Hoje por padrão, no fuso `America/Sao_Paulo`; guardar o instante ISO resultante | Alinha o bot ao comportamento local do produto e ao contrato de transação. |
| Cartão | Só `cartão`/`crédito` explícito; à vista no cartão é `CREDIT_1X`, `N x` é `INSTALLMENT` | Não assumir uma forma de pagamento que muda saldo e fatura. |
| Confiabilidade | Deduplicar por `update_id` do Telegram e por ação de confirmação | Webhooks podem ser reenviados. |

## 5. Experiência conversacional

### 5.1 Vinculação

1. Usuário autenticado abre **Perfil → Telegram** no web e seleciona “Conectar Telegram”.
2. O sistema mostra um deep link `https://t.me/<bot>?start=<codigo>` e uma alternativa copiável `/start <codigo>`.
3. O usuário abre o bot. O código tem validade de 10 minutos, é de uso único e não contém dados pessoais.
4. O bot confirma o primeiro nome da conta vinculada e informa como registrar um lançamento.
5. Se a conta Telegram já estiver vinculada, o bot não troca o proprietário: orienta a desvincular no web antes de tentar novamente.

### 5.2 Cadastro de despesa

Exemplo completo:

```
Usuário: mercado 150,50 no cartão em 3x ontem
Bot:     Encontrei esta despesa:
         Mercado · R$ 150,50 · Mercado
         Cartão parcelado · 3x de R$ 50,16 / R$ 50,17
         Data da compra: 29/08/2026 10:30:00
         [Confirmar] [Alterar categoria] [Cancelar]
Usuário: [Confirmar]
Bot:     Pronto. Criei 3 parcelas de “Mercado”.
```

Caso a categoria não seja inequívoca:

```
Usuário: almoço 42
Bot:     Qual categoria devo usar para R$ 42,00 em “almoço”?
         [Alimentação] [Restaurante] [Outra]
```

`Outra` abre uma lista paginada das categorias existentes. O rascunho expira em 15 minutos; qualquer nova mensagem de lançamento substitui o rascunho pendente depois de o bot avisar e pedir confirmação da troca.

### 5.3 Cadastro de receita

```
Usuário: recebi 2500 salário hoje
Bot:     Encontrei esta receita:
         Salário · R$ 2.500,00 · Salário
         À vista · 30/08/2026 10:30:00
         [Confirmar] [Alterar categoria] [Cancelar]
```

O bot identifica receita por termos como “recebi”, “entrada”, “salário”, “venda” ou por um comando `/receita`. Sem indicação clara de tipo, pergunta “É uma receita ou uma despesa?” antes de continuar.

### 5.4 Comandos mínimos

| Comando | Comportamento |
|---|---|
| `/start <codigo>` | Vincula a conta se houver código válido; sem código apresenta ajuda. |
| `/despesa` | Inicia uma despesa guiada. |
| `/receita` | Inicia uma receita guiada. |
| `/cancelar` | Descarta o rascunho ativo. |
| `/ajuda` | Mostra exemplos e limites do bot. |

Os botões de confirmação usam `callback_query`; comandos textuais equivalentes (`confirmar`, `cancelar`) são aceitos enquanto houver rascunho ativo.

## 6. Regras de negócio

1. **Isolamento:** o `userId` vem exclusivamente do vínculo Telegram ativo. Mensagens nunca recebem ou escolhem `userId`, e nunca escrevem em nome de outro membro familiar.
2. **Valor:** é obrigatório, positivo e convertido para `Int` em centavos antes de chegar ao caso de uso. O parser aceita `150`, `150,50`, `R$ 150,50` e `150.50`; valores ambíguos ou maiores que o limite seguro são perguntados/recusados.
3. **Nome:** é obrigatório, máximo de 160 caracteres, e é normalizado sem inventar descrição. Se a mensagem só tiver valor, o bot pergunta a descrição.
4. **Tipo:** v1 aceita apenas `INCOME` e `EXPENSE`. Ausente ou ambíguo implica pergunta, nunca default silencioso.
5. **Categoria:** deve ser uma categoria ativa existente. Uma inferência só é pré-selecionada quando mapeamento/regra tiver confiança alta; a confirmação sempre exibe a categoria escolhida.
6. **Pagamento:** padrão é `CASH`. `cartão`, `crédito`, `1x` ou `N x` muda o rascunho apenas quando explicitamente informado. `N x` requer `2 ≤ N ≤ 120` e implica `INSTALLMENT`; `cartão 1x` implica `CREDIT_1X`.
7. **Parcelas:** usam o total informado e o mesmo `CreateTransactionUseCase`; a última parcela recebe o resto dos centavos e as datas avançam meses em UTC. A resposta do bot informa quantidade e total, nunca promete parcelas idênticas quando houver resto.
8. **Data:** padrão é o instante atual do relógio injetado. `hoje`, `ontem` e data explícita são convertidos no fuso configurado; data futura requer confirmação adicional (“Agendar para ...?”). O bot envia ISO 8601 ao caso de uso.
9. **Confirmação:** a confirmação deve apontar para um rascunho `PENDING`, pertencer ao chat vinculado e ainda não ter expirado. Confirmar duas vezes não cria duas transações.
10. **Origem:** cada linha criada recebe `source=TELEGRAM` e referência do rascunho/mensagem de confirmação. Lançamentos manuais e existentes são `source=WEB` por default na migration.
11. **Erros:** falhas de categoria, validação ou criação não devem expor detalhes internos. O rascunho permanece editável quando seguro; o bot orienta a corrigir ou cancelar.
12. **Privacidade:** o bot não mostra saldo, histórico ou valores anteriores. A resposta de sucesso mostra apenas o lançamento acabado de criar.
13. **Desvinculação:** desativar o vínculo no web invalida rascunhos pendentes imediatamente. O histórico financeiro não é apagado.

## 7. Modelo de dados proposto

### 7.1 Novas entidades

| Entidade | Campos principais | Regras/índices |
|---|---|---|
| `TelegramConnection` | `id`, `userId`, `telegramUserId` (string), `chatId` (string), `username?`, `firstName?`, `connectedAt`, `revokedAt?`, timestamps | único ativo por `userId` e por `telegramUserId`; tratar identificadores do Telegram como string para não perder precisão. |
| `TelegramLinkToken` | `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt?`, timestamps | hash do código, token nunca armazenado em claro; um código ativo por usuário; expira em 10 min. |
| `TelegramConversation` | `id`, `connectionId`, `state`, `draft Json?`, `expiresAt?`, `lastUpdateId?`, timestamps | uma conversa ativa por conexão; `state`: `IDLE`, `COLLECTING`, `AWAITING_CONFIRMATION`. |
| `TelegramWebhookUpdate` | `updateId`, `receivedAt`, `processedAt?`, `status`, `errorCode?` | `updateId` único; registro antes de processar para idempotência e diagnóstico. |

### 7.2 Alteração em `Transaction`

Adicionar, sem alterar o contrato legado de leitura:

| Campo | Tipo | Regra |
|---|---|---|
| `source` | `WEB \| TELEGRAM` | obrigatório, default `WEB`; enum próprio do domínio e mapeado no Prisma adapter. |
| `externalReference?` | `String?` | única quando preenchida; no Telegram guarda o identificador de confirmação para defesa adicional contra duplicidade. |

`source` e `externalReference` são internos nesta entrega: presenter de transação deve omiti-los das respostas existentes para preservar o contrato legado. Não é necessário criar uma entidade financeira paralela: depois de confirmado, o bot chama o mesmo port inbound `CreateTransaction` usado pelo controller HTTP.

## 8. Arquitetura e integrações

O Telegram é um novo **adapter inbound**, não um atalho para Prisma ou para controller HTTP.

```
Telegram Bot API → adapter inbound/http → ports inbound
                                      ├─ LinkTelegramAccount
                                      ├─ ProcessTelegramUpdate
                                      └─ CreateTransaction
                                                    ↓
                                         domínio / use cases atuais
                                                    ↓
                       ports outbound ← Prisma / Telegram API / NLP interpreter / Clock
```

### Responsabilidades

- `adapters/inbound/http/controllers/telegram-webhook-controller.ts` e DTO correspondente em `adapters/inbound/http/dto/`: validam cabeçalho secreto e payload do webhook, respondem rapidamente `200` e delegam ao caso de uso. Não importam Prisma.
- `application/ports/inbound/telegram.ts`: contratos de vínculo, processamento e confirmação da conversa.
- `application/use-cases/telegram/`: máquina de estados, autorização pelo vínculo, validade, confirmação e chamada ao `CreateTransaction`.
- `application/ports/outbound/telegram-*.ts`: repositório de conexão/conversa/update, cliente que envia mensagens e port de interpretação.
- `adapters/outbound/telegram/`: cliente HTTP do Bot API e interpretador determinístico; token só na configuração. O interpretador devolve uma estrutura tipada/validada, nunca uma instrução de banco.
- `adapters/outbound/prisma/`: mapeia entidades e enum `TransactionSource`; não deixa tipos Prisma atravessarem domínio/aplicação.
- `main.ts`: único ponto que instancia cliente Telegram, repositórios, interpretador e casos de uso.

O endpoint pode executar o processamento de forma síncrona nesta fase, desde que responda dentro do prazo do Telegram. Caso o volume futuro exija, o registro do update permite mover o processamento para uma fila/worker sem alterar o contrato do caso de uso.

## 9. Contratos HTTP e webhook propostos

### 9.1 Rotas web autenticadas

| Método | Rota | Resposta | Finalidade |
|---|---|---|---|
| `POST` | `/api/integrations/telegram/link-token` | `201 { linkUrl, expiresAt }` | Gera/rotaciona código de vínculo. |
| `GET` | `/api/integrations/telegram` | `200 { connection: null \| { username?, connectedAt } }` | Exibe estado sem vazar IDs Telegram. |
| `DELETE` | `/api/integrations/telegram` | `204` | Revoga vínculo e rascunhos pendentes. |

Erros: `TELEGRAM_NOT_CONFIGURED` (503), `TELEGRAM_LINK_RATE_LIMITED` (429) e erros padrão `{ code, message, details? }`. A rota de gerar código é limitada por usuário para impedir abuso.

### 9.2 Webhook interno

`POST /integrations/telegram/webhook` recebe somente Updates oficiais. Ele exige `X-Telegram-Bot-Api-Secret-Token` igual ao segredo configurado. Não usa JWT, não entra em Swagger público e retorna `401` para segredo inválido.

O serviço registra `update_id` antes de processar. Se já tiver sido concluído, retorna `200` sem reenviar mensagens ou recriar transações. Updates sem mensagem/callback suportado retornam `200` e são marcados como ignorados.

## 10. Segurança, privacidade e operação

1. `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` são obrigatórios somente quando a feature estiver ativada; nunca aparecem em logs, respostas ou frontend.
2. O webhook deve ser HTTPS público em ambiente fora do desenvolvimento local. Localmente, a configuração do webhook exige túnel seguro ou `getUpdates` em ferramenta de desenvolvimento — este último não entra no servidor de produção.
3. Validar o segredo do cabeçalho antes de parsear/processar o update; limite de corpo deve ser explícito e conservador.
4. Não registrar texto integral de mensagens, valores ou token de vínculo nos logs de produção. Guardar somente IDs técnicos, status, códigos de erro e correlação.
5. O vínculo é revogável pelo web. Implementar limite de tentativas de vínculo e de mensagens por chat para mitigar spam.
6. O bot deve responder somente ao `chatId` vinculado e a conversas privadas; ignorar grupos e bots.
7. Dados de perfil Telegram são mínimos e opcionais. Aplicar retenção/remoção de metadados conforme política de privacidade antes de produção.
8. A configuração deve ter `TELEGRAM_ENABLED=false` por padrão, permitindo deploy do resto do sistema sem token do bot.

## 11. Critérios de aceite

### US-TG-01 — Vincular conta

**Como** usuário autenticado, **quero** conectar meu Telegram à minha conta para registrar lançamentos pelo bot.

- [ ] Perfil apresenta estado conectado/desconectado e ação apropriada.
- [ ] Código é opaco, único, de uso único e expira em 10 minutos.
- [ ] `/start <código>` válido vincula somente o chat privado que o enviou.
- [ ] Código expirado/usado e Telegram já vinculado mostram erro claro, sem alterar proprietário.
- [ ] Desvincular no web impede novas gravações imediatamente e não apaga transações antigas.

### US-TG-02 — Registrar despesa por texto

**Como** usuário vinculado, **quero** informar uma despesa em linguagem natural para não abrir o formulário web.

- [ ] Texto completo identifica descrição, valor, tipo, categoria, pagamento e data quando expressos.
- [ ] Campos ausentes/ambíguos são perguntados um a um ou por opções.
- [ ] Proposta mostra todos os campos efetivos e não cria nada antes de confirmar.
- [ ] Confirmar cria a mesma quantidade de linhas e regra de centavos do fluxo web.
- [ ] Lançamento aparece na listagem e afeta dashboard/fatura conforme as regras existentes.
- [ ] Cancelar ou expirar não cria lançamento.

### US-TG-03 — Registrar receita por texto

**Como** usuário vinculado, **quero** registrar uma receita pelo bot.

- [ ] O bot aceita expressão ou comando de receita e solicita os mesmos campos necessários.
- [ ] Receita à vista confirmada cria um `INCOME` com `paymentType=CASH` salvo se o usuário indicar outra forma válida.
- [ ] Tipo ambíguo nunca vira despesa por default.

### US-TG-04 — Confiabilidade e segurança

- [ ] Mesmo `update_id` processado repetidamente gera no máximo uma confirmação e uma criação.
- [ ] Duplo clique/duplo callback de confirmação cria no máximo um conjunto de transações.
- [ ] Webhook sem segredo correto não é processado.
- [ ] Chat não vinculado recebe instrução para vincular, sem criar rascunho.
- [ ] Nenhuma classe em `domain/` ou `application/` importa SDK Telegram, Express, Zod, Prisma ou cliente de IA.

## 12. Plano de implementação sugerido

1. **Fundação e dados:** migrations, modelos de domínio, ports de repositório, `Transaction.source`, configuração feature-flag e testes de mapeamento Prisma.
2. **Vínculo:** casos de uso e rotas web; tela mínima no Perfil; testes de expiração, unicidade e revogação.
3. **Bot determinístico:** adapter webhook + cliente Telegram; comandos, rascunho guiado e confirmação para dados estruturados; testes com fakes dos ports.
4. **Parser de texto:** interpretador por regras para padrões conhecidos, seguido por perguntas de desambiguação. Medir campos faltantes e erros.
5. **Operação:** deduplicação, rate limit, logs estruturados/health e documentação de configuração segura do webhook.

## 13. Testes obrigatórios

- Casos de uso com repositórios, clock, cliente Telegram e interpretador falsos: vínculo, expiração, revogação, categoria, data, pagamento, parcelas, cancelamento e confirmação.
- Idempotência: mesmo `update_id`, callback repetido e corrida de confirmação.
- Integração HTTP: segredo do webhook, status de rotas de vínculo e formato de erro.
- Adapter Prisma: mapeamento de `source`, referência externa e filtros de vínculo ativos.
- Regressão de transações: criação do bot delega a `CreateTransactionUseCase`; regras de fatura fechada, saldo, soft delete e parcelamento continuam válidas.
- Executar `npm test` e `npm run build` em `backend/`; caso haja UI, também `npm run build` em `frontend/`.

## 14. Questões para aprovação antes de implementar

1. **Data/hora:** confirmar que o fuso padrão do usuário será `America/Sao_Paulo` nesta fase (o perfil hoje não armazena timezone).
2. **Categorias:** validar se a inferência pode usar um dicionário inicial por slug/nome ou se deve sempre perguntar quando o texto não citar uma categoria existente.
3. **Cartão:** confirmar que “no cartão” sem parcelas significa compra `CREDIT_1X`, como definido neste documento.
4. **Infraestrutura:** disponibilizar URL HTTPS pública, token do bot e segredo de webhook antes de homologação real; o ambiente atual é estritamente local.
