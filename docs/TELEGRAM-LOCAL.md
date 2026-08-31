# Rodar o bot do Telegram localmente

Este guia ativa o cadastro de receitas e despesas pelo Telegram em ambiente local. O bot usa a Bot API do Telegram e um parser determinístico; não requer Hermes Agent, Nvidia, DeepSeek nem outro provedor de IA.

## Pré-requisitos

- Projeto instalado conforme o [README](../README.md).
- PostgreSQL local em execução (`docker compose up -d`, na raiz).
- Node.js 20+.
- [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) instalado.
- Uma conta Telegram.

## 1. Criar o bot

1. No Telegram, abra `@BotFather`.
2. Envie `/newbot` e conclua a criação.
3. Guarde o token informado pelo BotFather em um local seguro.
4. Anote o username do bot, sem `@` (por exemplo, `MeuFinanceiroBot`).

> Nunca envie o token do bot em chats, commits ou logs. Caso ele seja exposto, use `/revoke` no `@BotFather` e gere outro.

## 2. Preparar o backend e o banco

Na raiz do projeto, inicie o banco caso ainda não esteja ativo:

```bash
docker compose up -d
```

Depois, no backend, gere o cliente Prisma e aplique as migrations — incluindo a da integração Telegram:

```bash
cd backend
npm install
npm run prisma:generate
npx prisma migrate dev
npm run prisma:seed
```

## 3. Configurar as variáveis de ambiente

Copie o exemplo se ainda não houver um arquivo local:

```bash
cp .env.example .env
```

Gere um segredo aleatório para proteger o webhook:

```bash
openssl rand -hex 32
```

No arquivo `backend/.env`, preencha ou atualize estas variáveis:

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN="token_recebido_do_botfather"
TELEGRAM_BOT_USERNAME="MeuFinanceiroBot"
TELEGRAM_WEBHOOK_SECRET="resultado_do_openssl_rand"
```

O `TELEGRAM_WEBHOOK_SECRET` é criado por você; ele **não** é a URL do Cloudflare. O username não deve incluir `@`.

## 4. Iniciar a API e criar o túnel HTTPS

Em um terminal, inicie a API:

```bash
cd backend
npm run dev
```

Em outro terminal, exponha a porta local da API:

```bash
cloudflared tunnel --url http://localhost:3333
```

Copie a URL HTTPS exibida pelo Cloudflare, por exemplo:

```text
https://exemplo.trycloudflare.com
```

Verifique se ela alcança a API:

```bash
curl https://exemplo.trycloudflare.com/health
```

A resposta esperada contém `"status":"ok"`.

## 5. Registrar o webhook no Telegram

No terminal do backend, carregue as variáveis do `.env` apenas na sessão atual:

```bash
cd backend
set -a
source .env
set +a
```

Registre o webhook usando a URL atual do Cloudflare:

```bash
curl --fail-with-body -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://exemplo.trycloudflare.com/integrations/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d 'allowed_updates=["message","callback_query"]'
```

Substitua somente `https://exemplo.trycloudflare.com` pela URL que o seu túnel mostrou. Não substitua `${TELEGRAM_BOT_TOKEN}` nem `${TELEGRAM_WEBHOOK_SECRET}` pelos valores manualmente: elas são variáveis carregadas do `.env`.

Confirme o registro:

```bash
curl --fail-with-body \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

A resposta deve trazer a URL configurada. Se houver `last_error_message`, corrija a causa indicada antes de testar o bot.

> URLs `trycloudflare.com` são temporárias. Ao reiniciar o túnel, registre novamente o webhook com a nova URL. Para produção, use um Tunnel nomeado com subdomínio fixo.

## 6. Conectar a conta e testar

1. Inicie o frontend (`cd frontend && npm run dev`) e acesse `http://localhost:3000`.
2. Faça login.
3. Abra **Perfil → Conectar Telegram**.
4. Abra o link gerado e envie o comando `/start <código>` ao bot.
5. Teste um lançamento guiado:

```text
/despesa
mercado 150,50 hoje
```

6. Toque em **Confirmar**. O lançamento deve aparecer no sistema web.

Também é possível usar `/receita`, `/cancelar` e `/ajuda`.

## Diagnóstico rápido

| Sintoma | Verificação |
|---|---|
| Bot não responde | Confirme que a API e o `cloudflared` continuam em execução; abra `<url-do-tunel>/health`. |
| Telegram mostra entrega pendente | Rode `getWebhookInfo` e verifique `last_error_message`. |
| API retorna `TELEGRAM_NOT_CONFIGURED` | Confira `TELEGRAM_ENABLED=true` e reinicie a API. |
| Erro `zsh: unrecognized modifier` | Não escreva o token dentro de `${...}`; carregue o `.env` e use literalmente `${TELEGRAM_BOT_TOKEN}` no comando. |
| Túnel reiniciou | Registre outra vez o webhook com a nova URL `trycloudflare.com`. |
| Código de vínculo expirou | Gere um novo link em **Perfil → Conectar Telegram**; ele vale por 10 minutos. |

Para encerrar os testes locais, pare a API e o Cloudflare Tunnel com `Ctrl+C`. O webhook pode continuar apontando para a URL temporária, mas não receberá respostas até um novo túnel ser criado e registrado.
