# NEXT — 4 alterações e o que implicam (uso interno)

Este documento lista as mudanças planejadas, o que fazer no código/infra e os impactos operacionais para nosso uso interno.

## 1) Serverless (Vercel) com persistência de dados

Problema: no Vercel o filesystem é efêmero; SQLite local em arquivo não é persistente. Precisamos de banco gerenciado.

Opção A — Postgres (recomendado para persistência real)
- O que mudar
	- Adicionar dependência: `pg` (ou `@vercel/postgres`/driver serverless do Neon)
	- ENV: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` (ou `POSTGRES_URL`/`DATABASE_URL`)
	- Alterar `src/config/database.js` para abrir pool/conexão Postgres em vez de sqlite3
	- Atualizar SQL em `src/services/keyService.js`:
		- `CURRENT_TIMESTAMP` (ok) e funções de data: substituir `strftime`/`datetime('now', ...)` por `NOW()` e `NOW() - interval 'X hours'`
	- Criar schema:
		- Tabela `access_keys` com as mesmas colunas (tipos compatíveis)
- Implicações
	- Dados persistentes e compartilhados entre instâncias/deploys
	- Custo/latência de DB gerenciado; atenção ao pool e limites de conexões em serverless
	- Precisamos de migração inicial (copiar dados da `keys.db`, se houver)
- Rollout
	1. Provisionar Postgres (Vercel Postgres/Neon/Railway) e setar ENVs no Vercel
	2. Subir schema e testar em ambiente de testes
	3. Virar o tráfego apontando `DATABASE_URL`/ENVs para o Postgres

Opção B — Turso/libSQL (mantém modelo "SQLite", porém remoto)
- O que mudar
	- Dependência: cliente libSQL
	- ENV: `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN`
	- `database.js` para usar o client libSQL
- Implicações
	- Persistência remota com simplicidade de SQLite
	- Custo menor e boa adequação a serverless

Recomendação: Postgres (mais padrão e com bom tooling) ou Turso (simplicidade). Decidir conforme preferência do time.

## 2) Sessões de admin (de memória → JWT ou Redis)

Limitação atual: sessões vivem em memória do processo. Em reinícios/escala horizontal elas somem. Adequado só para uso interno básico.

Opção A — JWT (stateless, recomendado em serverless)
- O que mudar
	- ENV: `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_TTL` (ex.: `15m` ou `24h`)
	- No login: gerar JWT e enviar em cookie HttpOnly (SameSite=strict; `secure` em produção)
	- Middleware: validar JWT em rotas `/admin/*` protegidas
	- Logout: limpar cookie (revogação opcional com blacklist em Redis)
- Implicações
	- Stateless: funciona em serverless sem shared state
	- Revogação imediata exige lista de bloqueio (opcional) ou rotação de secret

Opção B — Redis (Upstash)
- O que mudar
	- Dependências: cliente Redis (ou `connect-redis` + `express-session`)
	- ENV: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
	- Armazenar sessões no Redis em vez de memória
- Implicações
	- Sessões persistem entre pods/reinícios
	- Custo e latência de rede; gerenciar expiração das sessões

Recomendação: JWT para simplicidade em serverless. Redis se preferir sessões tradicionais e revogação/controle mais direto.

## 3) CORS — o que é e como aplicar aqui

O que é: política do navegador que controla se uma página em um domínio pode chamar sua API em outro domínio. Não é firewall; não impede chamadas server-to-server.

No projeto:
- `CORS_ORIGIN` define a origem permitida. Em dev: `http://localhost:5173` (Vite). Em prod: domínio do painel/app interno.
- `CORS_CREDENTIALS=true` quando precisar enviar cookies/headers de credenciais. Nunca usar com origem `*`.

Implicações:
- Afeta apenas browsers (fetch/XHR). Clientes server-side ignoram CORS.
- Para o admin com cookie, é obrigatório usar origem específica + `credentials: 'include'` no fetch.

## 4) Limitar acesso à API (endurecimento)

Objetivo: restringir o acesso da API para uso do time. Combinar camadas.

Camada 1 — Segredo interno por header
- O que mudar
	- ENV: `INTERNAL_API_SECRET`
	- Middleware global em `/api/*` exigindo header `x-internal-secret: <valor>`
	- Exceções: defina quais rotas ficam públicas (ex.: `/health`) se necessário
- Implicações
	- Bloqueia clientes que não conheçam o segredo (simples e efetivo)
	- Devs precisam configurar header nos clients internos

Camada 2 — Allowlist de IP
- O que mudar
	- ENV: `ALLOWED_IPS` (CSV: `1.2.3.4,5.6.7.8/32` etc.)
	- Middleware que verifica `req.ip` (com `trust proxy` ligado em produção) e bloqueia fora da lista
- Implicações
	- Funciona bem para IPs fixos/VPN
	- Em Vercel, respeitar `x-forwarded-for`; atenção a IPv6 e mudanças de IP

Camada 3 — Rate limit mais rígido
- O que mudar
	- Ajustar `RATE_LIMIT_WINDOW` e `RATE_LIMIT_MAX` por ambiente
- Implicações
	- Reduz abuso e picos acidentais

Camada 4 (opcional) — JWT/Bearer por cliente
- O que mudar
	- Emitir tokens por serviço/usuário interno e validar em middleware
- Implicações
	- Auditoria/identidade por cliente

Recomendação prática: aplicar agora `x-internal-secret` + allowlist de IP + CORS restrito; evoluir para JWT se precisar identidade por cliente.

---

Resumo do que precisa de ENV nova
- Serverless DB (Postgres): `DATABASE_URL` ou `PG*`
- Turso/libSQL (alternativa): `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN`
- JWT (admin): `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_TTL`
- Redis (admin): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Endurecimento API: `INTERNAL_API_SECRET`, `ALLOWED_IPS`

Ordem sugerida de implementação
1) Endurecimento mínimo (x-internal-secret + CORS restrito) — rápido e baixo risco
2) Allowlist de IP — se tiver IPs estáveis/VPN
3) Migração do DB para Postgres/Turso — garante persistência
4) Sessões admin → JWT — compatível com serverless, remove limitação atual

Backout (plano de reversão)
- Endurecimento: desabilitar middleware/ENVs
- Postgres/Turso: apontar `DATABASE_PATH` de volta para SQLite local (apenas em ambiente não-serverless)
- JWT/Redis: voltar para sessão em memória (apenas internamente)
