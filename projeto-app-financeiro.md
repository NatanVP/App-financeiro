# App Financeiro Pessoal com Integração OpenClaw via Telegram

Projeto de uso pessoal. Sem publicação em loja, sem login, sem multiusuário. Foco em controle financeiro real, planejamento de quitação de dívidas e operação por linguagem natural via Telegram.

---

## 1. Stack Definitiva

### Mobile
- **React Native + Expo (SDK mais recente estável)**
- Build via **EAS Build local** → APK instalado direto no aparelho
- TypeScript obrigatório
- Estado: **Zustand**
- Navegação: **Expo Router** (file-based)
- Charts: **Victory Native XL** ou **react-native-gifted-charts**
- Formulários: **react-hook-form** + **zod**
- Datas: **date-fns**
- Dinheiro: **dinero.js**

### Banco local (offline-first)
- **op-sqlite** (mais rápido que expo-sqlite)
- Migrations versionadas em arquivos `.sql`
- Valores monetários sempre em **centavos (INTEGER)**

### Backend na VPS Hostinger
- **FastAPI** (Python)
- **PostgreSQL 16**
- **Redis** para fila e cache
- **Nginx** reverse proxy
- **Certbot/Let's Encrypt** para HTTPS
- **Docker Compose**
- **Alembic** para migrations

### Bot Telegram
- **python-telegram-bot v21+** (async)
- Webhook (não polling)
- Filtro por `chat_id` autorizado

### Integração OpenClaw
- Tools expostas: `criar_transacao`, `consultar_saldo`, `listar_dividas`, `simular_quitacao`, etc.
- Validação Pydantic em toda tool
- Log estruturado de cada ação do agente

### Sincronização app ↔ VPS
- Offline-first com sync incremental
- Cada registro tem `updated_at` e `sync_status`
- Conflito: last-write-wins por `updated_at`
- Sync ao abrir o app, ao voltar do background, a cada 5 min

### Segurança
- Token Bearer em variável de ambiente
- HTTPS obrigatório
- IP whitelist opcional via Cloudflare
- Bot só responde ao seu `chat_id`
- Backup diário do Postgres para Backblaze B2 ou Google Drive via rclone

---

## 2. Arquitetura

```
┌─────────────────┐         HTTPS + Bearer Token         ┌──────────────────────┐
│  App Mobile     │ ◄──────────────────────────────────► │  VPS Hostinger       │
│  React Native   │                                       │  ┌────────────────┐  │
│  + SQLite local │                                       │  │ Nginx (HTTPS)  │  │
└─────────────────┘                                       │  └───────┬────────┘  │
                                                          │          │           │
                                                          │  ┌───────▼────────┐  │
┌─────────────────┐         Webhook                       │  │ FastAPI        │  │
│  Telegram Bot   │ ◄──────────────────────────────────► │  │ + Bot handler  │  │
└─────────────────┘                                       │  │ + OpenClaw     │  │
                                                          │  └───────┬────────┘  │
                                                          │          │           │
                                                          │  ┌───────▼────────┐  │
                                                          │  │ PostgreSQL     │  │
                                                          │  │ Redis          │  │
                                                          │  └────────────────┘  │
                                                          │                      │
                                                          │  Backup diário ──► B2│
                                                          └──────────────────────┘
```

---

## 3. Schema do Banco

Mesmo schema no SQLite local e no Postgres da VPS.

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'cash', 'checking', 'savings', 'credit_card'
  initial_balance INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'income', 'expense'
  parent_id TEXT REFERENCES categories(id),
  color TEXT,
  icon TEXT,
  is_essential INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  category_id TEXT REFERENCES categories(id),
  amount INTEGER NOT NULL,       -- centavos
  kind TEXT NOT NULL,            -- 'income', 'expense', 'transfer'
  date TEXT NOT NULL,
  description TEXT,
  payment_method TEXT,
  recurrence_id TEXT REFERENCES recurrences(id),
  debt_payment_id TEXT REFERENCES debt_payments(id),
  source TEXT DEFAULT 'manual',  -- 'manual', 'telegram', 'agent', 'import'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_category ON transactions(category_id);
CREATE INDEX idx_tx_account ON transactions(account_id);

CREATE TABLE recurrences (
  id TEXT PRIMARY KEY,
  template_json TEXT NOT NULL,
  rule TEXT NOT NULL,            -- 'monthly', 'weekly', 'yearly', 'custom'
  day_of_month INTEGER,
  next_date TEXT NOT NULL,
  end_date TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creditor TEXT,
  total_amount INTEGER NOT NULL,
  current_balance INTEGER NOT NULL,
  interest_rate_monthly REAL DEFAULT 0,
  min_payment INTEGER,
  due_day INTEGER,
  installments_total INTEGER,
  installments_paid INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id),
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  is_extra INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  saved_amount INTEGER DEFAULT 0,
  deadline TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  month TEXT NOT NULL,           -- 'YYYY-MM'
  limit_amount INTEGER NOT NULL,
  rollover INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  UNIQUE(category_id, month)
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  category_id TEXT REFERENCES categories(id),
  debt_id TEXT REFERENCES debts(id),
  paid_at TEXT,
  paid_transaction_id TEXT REFERENCES transactions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE provisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  annual_amount INTEGER NOT NULL,
  due_month INTEGER NOT NULL,
  saved_amount INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE emergency_fund (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  target_months REAL DEFAULT 1,
  current_amount INTEGER DEFAULT 0,
  account_id TEXT REFERENCES accounts(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE agent_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL,
  user_prompt TEXT,
  tool_called TEXT,
  tool_args TEXT,
  result TEXT,
  success INTEGER,
  error TEXT
);

CREATE TABLE sync_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at TEXT,
  device_id TEXT NOT NULL
);
```

**Regras:**
- Valor monetário em centavos (INTEGER).
- Datas em ISO 8601 UTC.
- IDs UUID v4 gerados no cliente.
- `updated_at` controla sync.

---

## 4. Funcionalidades Detalhadas

### 4.1. Lançamento rápido
Botão flutuante sempre visível. Campos mínimos: valor + tipo. Lançamentos sem categoria vão para "Não categorizado" e ficam em destaque.

### 4.2. Categorias
Padrão pré-criado: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas, Salário, Renda Extra. Flag `is_essential` separa fixos críticos. Suporta subcategorias.

### 4.3. Resumo mensal
Três métricas:
- **Saldo contábil**: recebido − gasto
- **Sobra projetada**: renda esperada − fixos − previstos
- **Sobra disponível**: sobra projetada − reserva alocada

### 4.4. Dashboard
- Pizza de gastos por categoria
- Barras de entradas vs saídas (6 meses)
- Linha de evolução do saldo
- Progresso de orçamento por categoria
- Cards de dívidas com previsão de quitação

### 4.5. Recorrências
Geração automática no `next_date`. Editável antes da efetivação. Desativável sem perder histórico.

### 4.6. Orçamento por categoria
Por mês. Suporte a rollover. Alerta em 75% e 100%.

### 4.7. Contas a pagar
Lista por vencimento. Status: em dia, vence em ≤3 dias, vencida. Marcar como pago gera transação. Vínculo opcional com dívida.

### 4.8. Controle de dívidas

**Cálculos:**
```
# Sem juros
meses = ceil(saldo / pagamento_mensal)

# Com juros, prazo dado pagamento
n = -log(1 - (saldo * i) / pmt) / log(1 + i)

# Com juros, pagamento dado prazo
pmt = saldo * (i * (1+i)^n) / ((1+i)^n - 1)

# Custo total
custo_total = pmt * n
juros_pagos = custo_total - saldo_atual
```

**Validação:**
- `pmt > sobra_disponivel` → inviável, calcula prazo mínimo viável
- `pmt > 80% da sobra` → alerta de risco

**Estratégias múltiplas:**
- **Avalanche**: ordena por juros decrescente
- **Bola de neve**: ordena por saldo crescente
- **Híbrido**: dívidas >5% a.m. primeiro (rotativo, cheque especial), demais por bola de neve

Em todos: paga o mínimo de todas, joga excedente na primeira da fila. Quando uma quita, parcela dela soma na próxima.

### 4.9. Metas
Compete com dívidas pelo mesmo dinheiro. Sistema de envelopes virtuais: X% da sobra para reserva, Y% para metas, Z% para dívidas extras. Soma = 100%.

### 4.10. Reserva de emergência
Pré-requisito. Default: 1 mês de gastos fixos. Sem reserva, plano de quitação aloca obrigatoriamente parte da sobra para reserva primeiro.

### 4.11. Provisões anuais
IPVA, IPTU, seguro, presentes. App divide por 12 e desconta da sobra mensal. Mostra acumulado vs falta.

### 4.12. Importação de extrato
Parser OFX e CSV com mapeamento. Detecção de duplicatas por hash (data + valor + descrição). Categorização automática por regras.

### 4.13. Filtros e histórico
Por dia, semana, mês, ano, custom. Busca por descrição, categoria, valor, conta. Exportação CSV.

---

## 5. Integração OpenClaw + Telegram

### 5.1. Setup
1. Criar bot via @BotFather
2. Webhook: `https://seu-dominio.com/telegram/webhook`
3. Filtrar handler por `chat_id` autorizado

### 5.2. Tools do agente

```python
criar_transacao(valor, tipo, categoria=None, descricao=None, conta=None)
consultar_saldo(conta=None)
resumo_mes(mes=None)
gastos_por_categoria(periodo)
listar_dividas(status='active')
simular_quitacao(divida_id, pagamento_mensal=None, prazo_meses=None)
sugerir_estrategia_quitacao(metodo='hibrido')
listar_contas_a_pagar(dias=7)
marcar_conta_paga(conta_id)
criar_meta(nome, valor, prazo)
progresso_metas()
verificar_orcamento(categoria=None)
```

### 5.3. Fluxo
1. Usuário: "lança 45 no uber"
2. Bot → OpenClaw
3. Agente identifica `criar_transacao`
4. Tool valida e grava no Postgres
5. App sincroniza no próximo polling
6. Bot responde: "Lançado: R$ 45,00 em Transporte. Saldo do mês: R$ 1.234,00. Restam R$ 250 no orçamento de Transporte."

### 5.4. Confirmações
Apagar transação, apagar dívida, alterar saldo: bot pede confirmação explícita.

### 5.5. Comandos diretos
- `/saldo` — saldo de todas as contas
- `/mes` — resumo do mês
- `/dividas` — dívidas ativas
- `/contas` — contas a pagar nos próximos 7 dias
- `/metas` — progresso

---

## 6. Sincronização

### 6.1. Algoritmo
```
sync():
  1. Enviar registros locais com sync_status='pending'
  2. Marcar como 'synced' após confirmação
  3. Solicitar registros do servidor com updated_at > last_sync_at
  4. Para cada um:
       - Não existe local → inserir
       - local.updated_at < remoto.updated_at → substituir
       - local.updated_at >= remoto.updated_at → ignorar
  5. Atualizar last_sync_at
```

### 6.2. Quando sincroniza
- Ao abrir o app
- Ao voltar do background
- A cada 5 min com app aberto
- Ao detectar reconexão
- Pull-to-refresh manual

---

## 7. Segurança

- Token Bearer em todas as rotas (exceto webhook do Telegram)
- HTTPS via Let's Encrypt + renovação automática
- Bot filtra por `chat_id`
- `.env` fora do repositório
- Backup diário do Postgres → Backblaze B2 (~US$ 1/mês) ou Google Drive via rclone (grátis)
- logrotate (30 dias)
- Fail2ban no SSH
- Cloudflare opcional

---

## 8. Backup

```bash
# Cron diário às 3h
0 3 * * * /opt/scripts/backup.sh

# backup.sh
pg_dump $DB_URL | gzip > /backups/db-$(date +%F).sql.gz
rclone copy /backups/ remote:backups/financeiro/
find /backups -mtime +7 -delete
```

App também permite exportar SQLite local para `.db` enviado a si mesmo no Telegram.

---

## 9. Roadmap

### Fase 1 — Fundação (semanas 1-2)
- Setup Expo + TypeScript
- op-sqlite + migrations
- Schema completo
- CRUD contas e categorias
- Categorias padrão na primeira execução
- Lançamento rápido
- Listagem e edição de transações

### Fase 2 — Visualização (semanas 3-4)
- Resumo mensal
- Dashboard com gráficos
- Filtros de período
- Busca

### Fase 3 — Recorrências e orçamentos (semana 5)
- Sistema de recorrências
- Orçamentos por categoria com alertas
- Provisões anuais

### Fase 4 — Dívidas (semanas 6-7)
- CRUD de dívidas
- Cálculos de quitação
- Simulações
- Estratégias múltiplas
- Validação de viabilidade

### Fase 5 — Metas e contas a pagar (semana 8)
- Metas com envelopes
- Reserva de emergência como pré-requisito
- Contas a pagar
- Notificações locais de vencimento

### Fase 6 — Backend VPS (semanas 9-10)
- Docker Compose
- HTTPS via Certbot
- Schema espelhado
- Endpoints REST + Bearer
- Alembic
- Backup automático

### Fase 7 — Sincronização (semana 11)
- Sync incremental
- Resolução de conflitos
- Indicadores visuais

### Fase 8 — Bot Telegram (semana 12)
- Webhook
- Comandos diretos
- Filtro chat_id

### Fase 9 — OpenClaw (semanas 13-14)
- Tools expostas
- Integração com handler
- Validação Pydantic
- Log estruturado
- Confirmações

### Fase 10 — Importação e refinamentos (semanas 15-16)
- Parser OFX
- Parser CSV
- Detecção de duplicatas
- Categorização automática
- Exportação CSV

---

## 10. Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Banco principal | Postgres na VPS | Bot acessa mesmo com celular offline |
| Banco no app | SQLite local | Funciona offline, sync incremental |
| Tipo de valor | Centavos (INTEGER) | Float em dinheiro arredonda errado |
| ID | UUID v4 no cliente | Criação offline sem conflito |
| Conflito de sync | Last-write-wins por updated_at | Suficiente para usuário único |
| Auth | Token Bearer fixo | Sem login, mas API protegida |
| Bot | python-telegram-bot v21 | Async, maduro |
| Backend | FastAPI | Async, Pydantic, ótimo para tools |

---

## 11. Riscos

| Risco | Mitigação |
|---|---|
| VPS comprometida | HTTPS + token + Cloudflare + backup offsite |
| Token Telegram vazado | Filtro por chat_id |
| Perda do banco | Backup diário automático |
| App perde dados locais | VPS é fonte de verdade |
| Agente faz ação errada | Log + confirmação em destrutivas |
| Cálculo de juros incorreto | Testes unitários por fórmula |
| Conflito de sync | Last-write-wins + log |

---

## 12. Estrutura de pastas

```
financeiro/
├── mobile/
│   ├── app/
│   ├── components/
│   ├── db/
│   │   ├── migrations/
│   │   ├── schema.ts
│   │   └── repositories/
│   ├── stores/
│   ├── services/
│   │   ├── sync.ts
│   │   └── api.ts
│   ├── lib/
│   │   ├── money.ts
│   │   ├── debt-calc.ts
│   │   └── date.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── telegram/
│   │   ├── agent/
│   │   │   ├── tools.py
│   │   │   └── runner.py
│   │   └── core/
│   ├── alembic/
│   ├── tests/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
├── scripts/
│   ├── backup.sh
│   └── deploy.sh
│
└── docs/
```

---

## 13. Variáveis de ambiente

```env
# Backend
DATABASE_URL=postgresql://user:pass@db:5432/financeiro
REDIS_URL=redis://redis:6379/0
API_TOKEN=<token-bearer-fixo-longo>
TELEGRAM_BOT_TOKEN=<do-botfather>
TELEGRAM_AUTHORIZED_CHAT_ID=<seu-chat-id>
TELEGRAM_WEBHOOK_URL=https://seu-dominio.com/telegram/webhook
OPENCLAW_API_URL=<endpoint-do-agente>
OPENCLAW_API_KEY=<chave>

# Backup
BACKBLAZE_KEY_ID=
BACKBLAZE_APPLICATION_KEY=
BACKBLAZE_BUCKET=

# App mobile
EXPO_PUBLIC_API_URL=https://seu-dominio.com
EXPO_PUBLIC_API_TOKEN=<mesmo-token-bearer>
```

---

## 14. Pontos críticos que destroem o projeto se ignorados

1. Não usar centavos → erros de arredondamento somem dinheiro fantasma
2. Não ter backup → falha de disco apaga histórico inteiro
3. Sync sem `updated_at` confiável → registro antigo sobrescreve novo
4. Bot sem filtro de chat_id → token vazado expõe finanças
5. Recorrência sem idempotência → mesma parcela lançada duas vezes
6. Categoria obrigatória no lançamento → fricção alta, usuário desiste
7. Plano sem reserva de emergência → primeiro imprevisto destrói tudo
8. Misturar metas e dívidas no mesmo dinheiro → dupla contagem
9. Float em juros → use Decimal no Python, dinero.js no JS
10. Agente sem log → impossível auditar erro