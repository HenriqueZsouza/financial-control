#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="${1:-}"

usage() {
  cat <<USAGE
Uso: ./scripts/use-stack.sh <local|prod|prod-api|status>

  local     Frontend → API local (localhost:3333). Backend/.env local (Docker).
  prod-api  Frontend → API de produção (Render). Banco via API remota.
  prod      Frontend → API de produção + backend/.env apontando ao Neon (Prisma Studio / API local no banco prod).
  status    Mostra o stack ativo.

Arquivos (gitignored):
  frontend/.env.prod.local
  backend/.env.prod.local
USAGE
}

backup_if_exists() {
  local f="$1"
  if [[ -f "$f" ]]; then
    cp "$f" "$f.bak.$(date +%Y%m%d-%H%M%S)"
  fi
}

write_frontend_local() {
  local url="$1"
  backup_if_exists "$ROOT/frontend/.env.local"
  printf 'NEXT_PUBLIC_API_URL=%s\n' "$url" > "$ROOT/frontend/.env.local"
  echo "frontend/.env.local → $url"
}

activate_backend_local() {
  if [[ ! -f "$ROOT/backend/.env" ]]; then
    cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  fi
  # restore from local backup marker if we saved one
  if [[ -f "$ROOT/backend/.env.local.stack" ]]; then
    cp "$ROOT/backend/.env.local.stack" "$ROOT/backend/.env"
    echo "backend/.env ← .env.local.stack (Docker local)"
  else
    echo "backend/.env mantido (certifique-se de que aponta para localhost Docker)"
  fi
}

activate_backend_prod() {
  local src="$ROOT/backend/.env.prod.local"
  if [[ ! -f "$src" ]]; then
    echo "Falta $src — copie de backend/.env.prod.example e preencha." >&2
    exit 1
  fi
  # save current local env once
  if [[ -f "$ROOT/backend/.env" && ! -f "$ROOT/backend/.env.local.stack" ]]; then
    cp "$ROOT/backend/.env" "$ROOT/backend/.env.local.stack"
  fi
  backup_if_exists "$ROOT/backend/.env"
  cp "$src" "$ROOT/backend/.env"
  echo "backend/.env ← .env.prod.local (Neon produção)"
}

case "$STACK" in
  local)
    write_frontend_local "http://localhost:3333"
    activate_backend_local
    echo local > "$ROOT/.stack"
    echo "Stack: local (Docker + API local)"
    ;;
  prod-api)
    if [[ -f "$ROOT/frontend/.env.prod.local" ]]; then
      backup_if_exists "$ROOT/frontend/.env.local"
      cp "$ROOT/frontend/.env.prod.local" "$ROOT/frontend/.env.local"
      echo "frontend/.env.local ← .env.prod.local"
    else
      write_frontend_local "https://financial-control-api-wugv.onrender.com"
    fi
    activate_backend_local
    echo prod-api > "$ROOT/.stack"
    echo "Stack: prod-api (UI local → API Render / banco prod)"
    echo "Reinicie o frontend (npm run dev) para pegar o NEXT_PUBLIC_API_URL."
    ;;
  prod)
    if [[ -f "$ROOT/frontend/.env.prod.local" ]]; then
      backup_if_exists "$ROOT/frontend/.env.local"
      cp "$ROOT/frontend/.env.prod.local" "$ROOT/frontend/.env.local"
    else
      write_frontend_local "https://financial-control-api-wugv.onrender.com"
    fi
    activate_backend_prod
    echo prod > "$ROOT/.stack"
    echo "Stack: prod (UI → Render; backend local no Neon)"
    echo "Atenção: mudanças locais no backend afetam o banco de produção."
    echo "Telegram fica desligado no .env.prod.local por segurança."
    echo "Reinicie frontend e backend."
    ;;
  status)
    if [[ -f "$ROOT/.stack" ]]; then
      echo "Stack ativo: $(cat "$ROOT/.stack")"
    else
      echo "Stack ativo: (não definido)"
    fi
    if [[ -f "$ROOT/frontend/.env.local" ]]; then
      echo -n "Frontend API: "
      grep '^NEXT_PUBLIC_API_URL=' "$ROOT/frontend/.env.local" | cut -d= -f2-
    fi
    if [[ -f "$ROOT/backend/.env" ]]; then
      echo -n "Backend DB host: "
      python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
for line in Path("backend/.env").read_text().splitlines():
    if line.startswith("DATABASE_URL="):
        raw=line.split("=",1)[1].strip().strip('"').strip("'")
        print(urlparse(raw).hostname or "?")
        break
else:
    print("?")
PY
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac
