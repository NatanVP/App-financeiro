# Finança — Personal Finance App

Monorepo containing the complete Finança Ledger personal finance system:
backend API, Telegram bot, and React Native mobile app.

```
financa/
├── backend/          FastAPI + SQLAlchemy 2 + PostgreSQL 16
├── bot/              python-telegram-bot v21 + OpenClaw bridge
├── mobile/           Expo + React Native + op-sqlite + Zustand
└── infra/            Docker Compose + Caddy + VPS provisioning
```

---

## Requirements

| Tool | Version |
|------|---------|
| Docker & Docker Compose | 24+ |
| Python | 3.12 |
| Node.js | 20 LTS |
| Expo CLI | latest (`npm i -g expo-cli`) |
| Android Studio / Xcode | for device emulation |

---

## Local Development

### 1. Clone & configure secrets

```bash
git clone <repo> financa && cd financa

# Copy and fill every variable — see comments in the file
cp infra/.env.example infra/.env
cp mobile/.env.example mobile/.env
```

**Required variables (infra/.env)**

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Strong random string |
| `SECRET_TOKEN` | Bearer token for the API (generate with `openssl rand -hex 32`) |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_ALLOWED_CHAT_ID` | Your Telegram numeric user ID |
| `OPENCLAW_API_URL` | Optional — OpenClaw agent endpoint |
| `OPENCLAW_API_KEY` | Optional — OpenClaw API key |

### 2. Start the backend + database

```bash
cd infra
docker compose up --build -d

# Watch logs
docker compose logs -f backend
```

The backend runs on **http://localhost:8000**.
Alembic migrations run automatically on container start.
OpenAPI docs: http://localhost:8000/docs

### 3. Start the Telegram bot

```bash
docker compose up -d bot
docker compose logs -f bot
```

### 4. Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

---

## Deploy to VPS (Hostinger Ubuntu 22.04)

### One-time provisioning

```bash
# Run as root on a fresh VPS
bash infra/setup.sh
```

This installs Docker, Caddy, UFW (ports 22/80/443), and sets up a daily cron backup.

### Deploy application

```bash
scp -r financa/ user@your-vps-ip:/opt/financa
ssh user@your-vps-ip

cd /opt/financa/infra
cp .env.example .env   # fill real values
nano .env

docker compose up --build -d
```

Caddy auto-provisions a TLS certificate for your domain.
Edit `infra/Caddyfile` and set `your-domain.com` before deploying.

### Update application

```bash
ssh user@your-vps-ip
cd /opt/financa
git pull
cd infra && docker compose up --build -d
```

---

## Database Backups

`infra/backup.sh` runs daily via cron (set up by `setup.sh`).
Backups are stored at `/opt/financa-backups/`, gzipped, 30-day rotation.

**Manual backup:**
```bash
bash infra/backup.sh
```

**Restore:**
```bash
gunzip -c /opt/financa-backups/financa_2026-04-13.sql.gz | \
  docker exec -i financa_postgres psql -U postgres financa
```

---

## API Reference

All endpoints require header: `Authorization: Bearer <SECRET_TOKEN>`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Monthly summary (income, expenses, surplus) |
| GET | `/api/dashboard/cashflow` | 12-month cashflow bars |
| GET/POST | `/api/accounts` | Accounts list / create |
| GET/POST | `/api/transactions` | Transactions list / create |
| GET/POST | `/api/debts` | Debts list / create |
| POST | `/api/debts/{id}/payment` | Register a debt payment |
| GET/POST | `/api/goals` | Goals list / create |
| POST | `/api/goals/{id}/contribution` | Add goal contribution |
| GET/POST | `/api/budgets` | Budgets list / create |
| GET | `/api/budgets/variance` | Budget vs. actual this month |
| GET/POST | `/api/bills` | Bills list / create |
| POST | `/api/bills/{id}/mark-paid` | Mark bill as paid |
| GET/PUT | `/api/allocation` | Get/update allocation percentages |
| GET/POST | `/api/categories` | Categories list / create |
| POST | `/api/sync/push` | Push local changes (LWW sync) |
| POST | `/api/sync/pull` | Pull server changes since timestamp |
| POST | `/api/import` | Upload OFX or CSV bank statement |
| POST | `/api/agent-log` | Log Telegram bot action |

---

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + command list |
| `/saldo` | Current account balances + monthly summary |
| `/lancamento <valor> <descrição>` | Quick transaction (with confirmation) |
| `/relatorio` | Monthly income / expense / surplus |
| `/dividas` | Active debts overview |
| `/metas` | Goals progress |
| `/contas` | Pending bills |
| `/ai <pergunta>` | Forward to OpenClaw AI agent |
| `/ajuda` | Help text |

---

## Mobile App Screens

| Route | Screen |
|-------|--------|
| `/(tabs)/` | Dashboard — hero card, cashflow chart, categories, reserve |
| `/(tabs)/transactions` | Transactions list with date groups + filters |
| `/(tabs)/goals` | Goals with circular progress + quarterly chart |
| `/(tabs)/more` | Settings: allocation sliders, sync, navigation |
| `/new-transaction` | Bottom sheet: type toggle, numpad, category, account |
| `/debts` | Debts list with summary card + criticality badge |
| `/debts/[id]` | Debt detail: metrics, trajectory, optimal scenario |
| `/debts/[id]/simulator` | Interactive simulator: strategy selector + payment slider |
| `/budgets` | Budgets with progress bars + over/ok filter |
| `/bills` | Bills (Contas a Pagar): overdue/pending/paid sections |

---

## Tech Stack

### Backend
- **FastAPI** — async REST API
- **SQLAlchemy 2.x** (async) — ORM with `Mapped`/`mapped_column`
- **Alembic** — async migrations
- **PostgreSQL 16** — primary datastore (money as `BIGINT` cents)
- **pydantic-settings** — config from `.env`
- **ofxparse** — OFX bank statement parser

### Bot
- **python-telegram-bot 21** — polling mode
- **httpx** — async API client
- **OpenClaw bridge** — optional AI agent forwarding

### Mobile
- **Expo SDK 51** with Expo Router (file-based navigation)
- **op-sqlite** — performant local SQLite (WAL mode, FK enabled)
- **Zustand** — lightweight state management
- **expo-linear-gradient** — CTA gradients
- **@react-native-community/slider** — debt simulator slider
- **date-fns** — date utilities
- TypeScript `strict: true` throughout

### Infra
- **Docker Compose** — orchestrates postgres + backend + bot
- **Caddy** — reverse proxy + automatic TLS
- **UFW** — firewall (22/80/443 only)

---

## Financial Rules

- **Money is always stored in cents** (integer). Never float.
  - PostgreSQL: `BIGINT`
  - TypeScript: branded type `Money = number & { __brand: 'Money' }`
- **PMT formula** (Price table amortization) used for debt simulation and minimum payment calculation.
- **Allocation**: `reserve% + debts% + goals% = 100`. Goals bucket receives the remainder to prevent rounding drift.
- **Sync**: offline-first, last-write-wins by `updated_at`. Server wins if `server.updated_at > client.updated_at`.
- **Soft deletes**: `deleted_at` timestamp on transactions, accounts, debts, goals. Never hard-deleted.

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests cover all financial calculation functions with:
- Happy path
- Edge cases (balance=0, rate=0, term=1 month)
- Infeasible scenarios (payment ≤ monthly interest)

---

## Desvios da Spec (Deviations from spec)

### Correções aplicadas (alinhamento seletivo com `projeto-app-financeiro.md`)

As seções abaixo documentam cada ajuste feito em relação à spec, cada divergência mantida com justificativa técnica, e decisões de arquitetura deliberadas.

---

#### Correção 1 — Bot Telegram: polling → webhook

**O que foi corrigido:** O bot originalmente usava `run_polling()`. Foi migrado para webhook HTTP.

- Endpoint exposto em `POST /telegram/webhook/<secret_path>` (path aleatório como segurança extra).
- O token secreto é validado pelo header `X-Telegram-Bot-Api-Secret-Token` que o Telegram injeta.
- PTB usa seu próprio servidor aiohttp interno (porta 8443); Caddy faz proxy reverso via `handle /telegram/webhook/*`.
- Variáveis novas: `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET`, `BOT_WEBHOOK_PORT`.

**Por que webhook:** Polling requer que o processo fique consultando a API do Telegram continuamente. Webhook é orientado a eventos, sem latência de pooling, e é o modelo esperado em produção.

---

#### Correção 2 — Tabelas ausentes: recorrências, provisões anuais, reserva de emergência

**O que foi adicionado:**

- Tabela `recurrences` — template de transação em JSONB, regra de repetição em RRULE (ex: `FREQ=MONTHLY`), `next_run DATE`, `active BOOL`.
- Tabela `annual_provisions` — gastos anuais divididos em 12 parcelas mensais (IPVA, seguro, etc.).
- Tabela `emergency_reserve` — singleton (id=1) com `target_months`, `target_cents`, `current_cents`, `account_id`.
- CRUD completo no backend para cada tabela.
- Cron worker via **APScheduler** dentro do lifespan do FastAPI (sem container separado, sem Redis): roda às 06h horário de Brasília, materializa transações cujo `next_run ≤ hoje`, avança `next_run` pelo rrule.
- Consultas de leitura no bot Telegram (`/recorrencias`, `/reserva`).
- Telas no app: **Mais → Recorrências**, **Mais → Provisões Anuais**, **Mais → Reserva de Emergência**.

---

#### Correção 3 — Backup remoto com rclone + Backblaze B2

**O que foi corrigido:** `backup.sh` só fazia rotação local. Agora:

- Retenção local: **7 dias** (era 30).
- Retenção remota: **30 dias** via `rclone delete --min-age 30d`.
- Dump é copiado para B2 com `rclone copy` logo após a criação.
- Variáveis: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `RCLONE_REMOTE`.

**Configuração do Backblaze B2:**

```bash
# 1. Criar conta em backblaze.com
# 2. Account → App Keys → Create a New Application Key (Read/Write no bucket)
# 3. Na VPS:
rclone config
# → n (new remote) → nome: b2financa → type: b2
# → account_id: <B2_KEY_ID> → key: <B2_APPLICATION_KEY> → confirm
# 4. Criar bucket (nome único globalmente):
rclone mkdir b2financa:financa-backups
# 5. Testar:
rclone ls b2financa:financa-backups
```

Adicionar ao crontab (`crontab -e`):
```
0 3 * * * /opt/financa/infra/backup.sh >> /var/log/financa-backup.log 2>&1
```

---

#### Correção 4 — Campo `source` nas transações

**O que foi adicionado:** `source TEXT NOT NULL DEFAULT 'app'` na tabela `transactions`.

Valores válidos: `app | telegram | agent | import | recurring`

- `recurring` — definido pelo worker de recorrências.
- `telegram` — definido pelo bot ao criar transações via `/gasto`.
- `import` — definido pelo parser OFX/CSV.
- `agent` — reservado para integrações futuras (OpenClaw).
- Filtro opcional em `GET /transactions?source=telegram`.

---

#### Correção 5 — Orçamentos por mês (`year_month`)

**O que foi corrigido:** A constraint antiga era `UNIQUE(category_id)`, impedindo orçamentos históricos. Agora:

- Schema: `(category_id, year_month CHAR(7))` com constraint composta `UNIQUE(category_id, year_month)`.
- `year_month` segue o formato `YYYY-MM` (ex: `2026-04`).
- `GET /budgets?year_month=YYYY-MM` — padrão: mês corrente.
- `POST /budgets/copy-previous?target_month=&source_month=` — copia categorias que ainda não existem no mês alvo.
- Tela de orçamentos no app inclui **seletor de mês** (navegar para frente/trás) e botão **"Copiar mês ant."**.

---

#### Correção 6 — Plano global de quitação de dívidas

**O que foi adicionado (complementar ao simulador individual existente):**

- `POST /debts/plan?monthly_budget_cents=&strategy=both`
- Input: orçamento mensal total para dívidas.
- Output: tabela Avalanche vs Bola de Neve com detalhes por dívida (meses para quitar, juros totais).
- **Regra de criticidade:** dívidas com taxa ≥ 8% a.m. sempre aparecem no topo de ambas as estratégias, independentemente do saldo ou posição na estratégia.
- Nova tela `app/debts/plan.tsx` com comparação lado a lado e destaque de economia da Avalanche.
- Acessível via **Mais → Plano de Quitação**.

---

### Divergências mantidas (com justificativa)

| Decisão | Justificativa |
|---------|---------------|
| **Caddy em vez de Nginx** | Zero-config TLS automático via ACME/Let's Encrypt. O `Caddyfile` tem 20 linhas vs. ~80 de nginx equivalente. Custo de migração > benefício. |
| **Branded `Money` type em vez de dinero.js** | `dinero.js` adiciona ~40 KB ao bundle mobile. O tipo `Money` customizado cobre 100% dos casos de uso, é tipado em TypeScript e sem dependência externa. |
| **Simulador individual de dívidas (3 estratégias)** | Complementar ao Plano Global. O simulador individual (Mínimo / Livre / 12 Meses) opera em uma única dívida com slider de valor; o Plano Global opera sobre o portfólio completo. São casos de uso distintos. |
| **LWW sync por `updated_at` + `dirty BOOLEAN`** | Mais simples que CRDTs para app single-user. O campo `dirty = 1` em todas as tabelas SQLite locais permite `SELECT WHERE dirty=1` eficiente para identificar pendências de sync sem varredura completa. `dirty` é zerado a 0 após push confirmado. |
| **Autenticação por Bearer token estático** | App pessoal, single-user. JWT adiciona complexidade (refresh tokens, revogação) sem benefício para esse caso de uso. |
| **`ofxparse` + heurísticas de banco** | Cobre OFX e os principais CSVs do mercado BR (Nubank, Inter, Itaú). Adicionar um novo banco é inserir uma função no parser. |

---

### Redis — omissão deliberada

**Redis não foi incluído no stack.** Justificativa:

- O único caso de uso para Redis seria queue de jobs (recorrências, notificações). Para um app single-user com volume de dezenas de transações/dia, **APScheduler dentro do processo FastAPI** tem overhead zero e simplifica o deploy.
- Adicionar Redis significaria: novo container, configuração de senha, conexão do worker, serialização/desserialização de jobs — tudo para substituir um `scheduler.add_job()`.
- **Quando revisitar:** Se o volume de recorrências exceder ~500/dia ou se múltiplos workers forem necessários (horizontalmente), migrar para Celery + Redis (ou ARQ que é async-native) é trivial — os endpoints de materialização já existem como funções isoladas.

---

### Decisões autônomas iniciais (spec estava incompleta)

| Decisão | Rationale |
|----------|-----------|
| Static Bearer token auth (no JWT) | Personal app — single user, no session management needed |
| `ofxparse` for OFX parsing | More stable than manual XML parsing; supports major Brazilian banks |
| Bank detection via filename heuristics | Nubank CSV has distinct header; Inter has date format difference; OFX detected by magic bytes |
| LWW sync with server-wins on tie | Simpler than CRDTs for single-user scenario; `updated_at` microseconds make ties extremely rare |
| `goals` bucket gets allocation remainder | Prevents 1-cent rounding drift from summing to ≠ surplus |
| Slider step = 100 cents (R$1) | Granular enough for simulation; prevents excessive re-renders |
| Soft delete on all financial records | Audit trail; enables sync tombstoning |
| `device_id` on transactions | Required for future multi-device conflict resolution |
| Caddy instead of Nginx | Zero-config TLS; simpler Caddyfile vs nginx.conf |
