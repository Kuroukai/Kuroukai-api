# Kuroukai Free API v2.0 (Uso interno)

API simples para criar, validar e gerenciar chaves de acesso temporárias (SQLite) com um painel admin básico (React + Vite). Projeto para uso do time Kuroukai.

Este README foca no que é necessário para rodar, operar e manter o serviço internamente.

## Visão geral

- Node.js + Express (API)
- SQLite3 (banco local por arquivo)
- Painel Admin em React/Vite (build estático servido sob /admin)
- Sessões de admin em memória (apenas para dev/ambiente interno)

Estrutura:

```
src/
├── app.js                 # Bootstrap do Express
├── config/
│   ├── index.js          # Carrega variáveis e opções
│   └── database.js       # Conexão SQLite + schema
├── controllers/          # Regras dos endpoints
├── middleware/           # Validação, erros, auth admin
├── routes/               # Rotas /api, /admin, /
├── services/             # keyService (regras de negócio)
└── utils/                # keyUtils, logger

dashboard/                # Painel Admin (Vite + React)
api/index.js              # Entrypoint serverless (Vercel)
vercel.json               # Rewrites e build
scripts/create-key.js     # Script CLI para criar chave
keys.db                   # Banco local (ignorado no git)
```

## Pré-requisitos

- Node 18+
- NPM 9+

## Configuração (ENV)

Copie o template e ajuste:

```powershell
Copy-Item .env.example .env
```

O servidor carrega automaticamente o arquivo .env (dotenv). Principais variáveis (ver .env.example para detalhes):
- PORT: porta do servidor (padrão 3000)
- NODE_ENV: development|production
- DATABASE_PATH: caminho do arquivo SQLite (./keys.db localmente)
- CORS_ORIGIN: origem permitida. Se for usar cookies (credenciais), evite '*'
- CORS_CREDENTIALS: true|false para enviar cookies/headers em CORS
- RATE_LIMIT_WINDOW / RATE_LIMIT_MAX: rate limiting por IP
- DEFAULT_KEY_HOURS / MAX_KEY_HOURS: duração padrão e máxima das chaves
- LOG_LEVEL: error|warn|info|debug
- IP_PREFERENCE: public|private (preferência de IP mostrado em logs/UI; padrão private em dev)
- ADMIN_USERNAME / ADMIN_PASSWORD: login do admin (sessão em memória)

## Como rodar

Desenvolvimento (com reload):

```powershell
npm install
npm run dev
```

Produção local:

```powershell
npm start
```

Admin (local):
- Acesse http://localhost:3000/admin/login e entre com ADMIN_USERNAME/ADMIN_PASSWORD
- Se já tiver build do painel, use http://localhost:3000/admin/

Build do painel (opcional em dev, obrigatório para deploy):

```powershell
# Build completo (executa o build do dashboard a partir da raiz):
npm run build

# Ou rodar o painel em modo dev (porta 5173, ajuste CORS_ORIGIN se necessário)
cd dashboard
npm install
npm run dev
```

## Endpoints principais

Chaves (/api/keys):
- POST /api/keys/create
    - body: { "user_id": string, "hours"?: number }
    - 200: { msg, code: 200, data: { key_id, user_id, expires_at, valid_for_hours } }
    - 409: usuário já tem chave ativa (retorna dados da chave existente)
- GET /api/keys/validate/:keyId
    - 200/410/404 com { valid, code, time_remaining, usage_count, ... }
- GET /api/keys/info/:keyId
    - 200/410/404 com { data: {...} }
- GET /api/keys/user/:userId
    - 200 com lista de chaves do usuário
- DELETE /api/keys/:keyId
    - 200 ao deletar, 404 se não existir

Aplicação:
- GET /bind/:keyId.js → retorna um JS seguro com o resultado (sem eval)
- GET /test/:keyId → página minimalista que carrega o /bind
- GET /health → status básico da API

Admin (uso interno, sessão em memória):
- GET /admin/login → página de login
- POST /admin/auth/login → autentica e seta cookie admin_session
- POST /admin/auth/logout → finaliza sessão
- GET /admin/ → dashboard (depende do build do Vite)
- GET /admin/api/stats → métricas básicas
- GET /admin/api/session → info da sessão atual
- GET /admin/api/sessions → sessões ativas
- DELETE /admin/api/sessions → limpa todas as sessões

Exemplos rápidos (PowerShell):

```powershell
# Criar chave
curl.exe -X POST "http://localhost:3000/api/keys/create" -H "Content-Type: application/json" -d '{"user_id":"user123","hours":24}'

# Validar
curl.exe "http://localhost:3000/api/keys/validate/<KEY_ID>"

# Info
curl.exe "http://localhost:3000/api/keys/info/<KEY_ID>"

# Todas as chaves de um usuário
curl.exe "http://localhost:3000/api/keys/user/user123"

# Deletar
curl.exe -X DELETE "http://localhost:3000/api/keys/<KEY_ID>"
```

Se você usa o plugin REST Client no VS Code, veja `docs/examples.http`.

## Notas de segurança e operação

- Sessões de admin são em memória: reinícios/novos pods zeram as sessões. Não usar para produção pública.
- Cookies do admin usam SameSite=strict e secure em produção; exija HTTPS.
- Se CORS_CREDENTIALS=true, não use CORS_ORIGIN='*'. Defina a origem do painel/app do time.
- Em produção/atrás de proxy (Vercel, etc.) o app já configura trust proxy quando NODE_ENV=production.
- Rate limit básico por IP está habilitado (ajuste RATE_LIMIT_* conforme necessário).
- Logs: ajuste LOG_LEVEL. Em produção, evite 'debug'.

## Persistência e Deploy

SQLite local:
- Por padrão usa `./keys.db` (versionado no .gitignore). O arquivo é criado automaticamente.
- Em Windows, mantenha caminhos simples (sem caracteres especiais) para evitar erros de permissão.

Serverless (Vercel):
- O entrypoint é `api/index.js` que reusa a instância do Express entre invocações.
- `database.js` usa `/tmp/keys.db` quando detecta ambiente serverless. /tmp é efêmero e por instância.
- Isso significa: os dados NÃO são duráveis nem compartilhados entre instâncias. Adequado apenas para demo/labs.
- Se precisar persistência real, use um SQLite hospedado (e.g., mounted volume) ou migre para um DB gerenciado (Postgres/MySQL) e ajuste `database.js`/`keyService.js`.

Build/Rotas no Vercel (`vercel.json`):
- `npm run build` na raiz faz build do painel (dashboard/dist)
- Rewrites importantes:
    - `/admin` → `/admin/` (barra final)
    - `/admin/assets/*` → estáticos do `dashboard/dist`
    - `/admin/*` → `dashboard/dist/index.html`
    - `/api/*`, `/admin/api/*`, `/admin/auth/*` → função serverless `api/index.js`
    - Qualquer outra rota → `api/index.js`

Observação sobre lockfile no dashboard: o build usa `npm --prefix dashboard ci`. Se falhar por ausência de package-lock.json, troque para `npm --prefix dashboard install` localmente e/ou gere o lockfile.

Nota: No Windows PowerShell, use curl.exe para evitar alias do Invoke-WebRequest nos exemplos.

## Script utilitário (CLI)

Criação assistida de chave:

```powershell
node scripts/create-key.js
```

O script pergunta o ambiente (localhost ou produção), user_id e horas, e faz a chamada ao endpoint.

## Problemas comuns

- SQLITE_CANTOPEN / permissões: ajuste DATABASE_PATH para um diretório gravável.
- CORS bloqueando cookies: defina CORS_ORIGIN para a origem exata do painel/app e CORS_CREDENTIALS=true.
- 409 ao criar chave: o usuário já possui chave ativa; a resposta inclui dados e tempo restante.
- 410 em validate/info: chave expirada.

---

Projeto interno do time Kuroukai.


