# Guild Ledger — Documentação Consolidada

> Fonte de verdade do projeto. Consolida: `financa/README.md`, `implementacao-atual.md` e `projeto-app-financeiro.md`.
> Última atualização: **2026-04-18**

---

## ONDE PARAMOS — 2026-04-18

### O que foi feito nesta sessão

1. **Importação da planilha xlsx reconciliada** (`lancamento_por_lancamento_conferido.xlsx`)
   - Backend: `import_service.py` + endpoint `POST /import/xlsx-reconciled`
   - Lógica: importar só o lado fonte das transferências; destino é creditado automaticamente pelo router
   - Saldo inicial resetado antes da importação; saldo final do servidor corrigido via PATCH após importação
   - Resultado: Itaú R$260,21 | Inter R$100,00 ✅

2. **Sync mobile funcionando**
   - Criado `financa/mobile/.env` (estava faltando — causava URL/token vazio)
   - `accountStore`: removidas contas hardcoded (nubank/itau/inter com IDs fixos); agora começa vazio e é populado pelo servidor via UUID real

3. **Dashboard corrigido**
   - `BANK_ORDER` dinâmico para ordenar contas por nome de banco (case-insensitive, NFD normalizado)
   - `balance_cents` usado diretamente (valor autoritativo do servidor) — sem recalcular localmente
   - `BankIcon` normaliza `account.bank` para remover acentos antes de fazer lookup
   - Chave JSX de categorias: `${cat.name}-${idx}` (fix do warning "duplicate key Outros")
   - `getTopCategories` agora agrupa por nome display (fix do 'Outros' duplicado)

4. **Fix crítico: `AccountOut` incluindo `deleted_at`**
   - Contas deletadas no banco ("Conta Corrente", "Corrente 2") eram retornadas sem `deleted_at` pelo sync pull
   - O mobile as tratava como ativas → apareciam no dashboard
   - Fix: `AccountOut` agora inclui `deleted_at: datetime | None = None`

### Ação pendente URGENTE no VPS

```bash
ssh user@89.117.32.220
cd /opt/financa
git pull origin master
docker compose -f financa/infra/docker-compose.yml up -d --build api
```

Depois disso, pull-to-refresh no app → "Conta Corrente" e "Corrente 2" somem.

### Estado do banco de dados (pós-importação)

| Conta | ID | Saldo |
|---|---|---|
| Nubank | `1f787a0a-84ac-48a7-8f4e-5d12b769934e` | R$ 1.415,00 |
| Itaú | `14732aba-fc00-4cbc-b108-99c6b190a89a` | R$ 260,21 |
| Inter | `30f2f23b-7671-4b97-905a-506ef8d86a37` | R$ 100,00 |
| ~~Conta Corrente~~ | `2d7e7ab7-...` | deletada no BD |
| ~~Corrente 2~~ | `82179eef-...` | deletada no BD |

### Sobre o "Bolsa de Ouro" negativo

A "Bolsa de Ouro" calcula `receberSoFar - gastos` com base no **salário configurável**. Como o salário ainda está em R$0,00 (não configurado), o resultado é negativo (só gastos). Isso é comportamento correto — configure o salário em Configurações → Bolsa de Ouro para ver a projeção real.

---

## 1. Visão Geral

App de finanças pessoais com tema **RPG medieval pixel art**. Uso pessoal, sem publicação em loja, sem login, sem multiusuário.

**Nome do app:** Guild Ledger / Goblin Finance

**Funcionalidades:**
- Controle de transações com categorias temáticas (RPG)
- Metas/missões com parcelamento automático
- Dívidas com simulador de quitação (Avalanche, Bola de Neve)
- Orçamentos mensais por categoria
- Contas a pagar com alertas de vencimento
- Reserva de emergência e provisões anuais
- Operação por linguagem natural via Telegram (@FiireKeeperBot → OpenClaw)
- Sync offline-first com VPS (last-write-wins por `updated_at`)
- Importação de extrato xlsx reconciliado (Itaú/Inter)

---

## 2. Stack

### Mobile
- **Expo SDK 51** + **Expo Router ~3.5** (file-based navigation)
- **React Native** + **TypeScript strict**
- **Zustand ^4.5** — estado global (em memória; sem SQLite local por enquanto)
- **VT323** — fonte pixel art em todo o app
- **Kenney Tiny Dungeon (CC0)** — ícones pixel art (espada, baú, escudo, etc.)
- **MaterialCommunityIcons / Ionicons** — ícones de suporte
- Tipo `Money = number & { __brand: 'Money' }` — sem dinero.js, sem float

### Backend
- **FastAPI** async
- **SQLAlchemy 2.x** async (Mapped + mapped_column)
- **Alembic** — migrations automáticas no startup do container
- **PostgreSQL 16** — dinheiro como `BIGINT` (centavos)
- **pydantic v2.7.1** + `eval-type-backport==0.2.0`
- **APScheduler** — worker de recorrências in-process (sem Redis, sem container separado)
- **openpyxl==3.1.2** — parser de planilhas xlsx

### Infra / VPS
- **VPS Hostinger Ubuntu 22.04** — IP: `89.117.32.220`
- **Docker Compose** — orquestra `postgres` + `backend`
- **Traefik** — já rodando na VPS (porta 80/443)
- Backend exposto diretamente na porta **8000**
- Alembic roda no `CMD` do Dockerfile antes do uvicorn

### Bot / IA
- **@FiireKeeperBot** — bot Telegram gerenciado pelo **OpenClaw** (agente IA na VPS, porta 43688)
- OpenClaw acessa o backend via rede Docker interna `openclaw-clgu_default`

### Autenticação
- Bearer token estático em todas as rotas
- Token: definido em `financa/infra/.env` → `API_TOKEN`

---

## 3. Arquitetura

```
┌─────────────────────┐    HTTP direto (porta 8000)    ┌──────────────────────────────┐
│  App Mobile         │ ◄─────────────────────────────► │  VPS 89.117.32.220          │
│  React Native       │   EXPO_PUBLIC_API_BASE_URL       │                              │
│  Zustand (memória)  │   =http://89.117.32.220:8000    │  ┌─────────────────────┐    │
└─────────────────────┘                                  │  │ FastAPI :8000        │    │
                                                         │  │ (infra-backend-1)   │    │
┌─────────────────────┐    rede Docker interna          │  └──────────┬──────────┘    │
│  Telegram           │ ◄─────────────────────────────► │             │               │
│  @FiireKeeperBot    │    openclaw-clgu_default         │  ┌──────────▼──────────┐    │
└─────────────────────┘                                  │  │ PostgreSQL 16        │    │
         ▲                                               │  └─────────────────────┘    │
         │ Webhook/Polling                               │                              │
┌────────┴────────────┐                                 │  ┌─────────────────────┐    │
│  OpenClaw :43688    │ ──────────────────────────────► │  │  Traefik (já existe)│    │
│  (agente IA)        │    Docker network financa        │  └─────────────────────┘    │
└─────────────────────┘                                 └──────────────────────────────┘
```

---

## 4. Estrutura do Repositório

```
App-financeiro/
├── PROJETO.md                        ← este arquivo (fonte de verdade)
└── financa/
    ├── backend/
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── routers/              accounts, transactions, sync, import_parser, debts, goals, ...
    │   │   ├── models/               SQLAlchemy models
    │   │   ├── schemas/              Pydantic schemas (AccountOut agora inclui deleted_at)
    │   │   └── services/             import_service.py (xlsx), sync_service.py
    │   ├── alembic/
    │   ├── Dockerfile
    │   └── requirements.txt          inclui openpyxl==3.1.2
    ├── mobile/
    │   ├── app/
    │   │   ├── (tabs)/
    │   │   │   ├── _layout.tsx       Tab bar + FAB espada
    │   │   │   ├── index.tsx         Dashboard (Taverna) — Bolsa de Ouro, Cofres do Reino, etc.
    │   │   │   ├── transactions.tsx  Crônicas com busca + filtros
    │   │   │   ├── goals.tsx         Missões com parcelamento
    │   │   │   └── more.tsx          Grimório (Configurações)
    │   │   ├── new-transaction.tsx
    │   │   ├── new-goal.tsx
    │   │   ├── categories.tsx
    │   │   ├── transactions/[id].tsx
    │   │   ├── budgets/new.tsx
    │   │   ├── debts/                lista + detalhe + simulador + plano
    │   │   ├── bills/
    │   │   ├── settings/             backup, sync, alerts, security
    │   │   ├── emergency-reserve.tsx
    │   │   ├── provisions.tsx
    │   │   └── recurrences.tsx
    │   ├── components/
    │   │   ├── ui/                   RPGIcon, BankIcon, CreditInvoiceWidget, TransactionRow, ...
    │   │   └── charts/               BarChart
    │   ├── store/
    │   │   ├── accountStore.ts       contas (vazia; populada pelo sync)
    │   │   ├── transactionStore.ts   + getTopCategories (agrupa por nome display)
    │   │   ├── salaryStore.ts        3 pagamentos mensais (5º, 20º, último dia útil)
    │   │   ├── creditStore.ts        cartão de crédito
    │   │   ├── categoryStore.ts
    │   │   ├── goalStore.ts          + processInstallments()
    │   │   ├── debtStore.ts
    │   │   ├── budgetStore.ts
    │   │   ├── billStore.ts
    │   │   ├── allocationStore.ts
    │   │   ├── syncStore.ts
    │   │   └── ...
    │   ├── lib/
    │   │   ├── money.ts              tipo Money, formatBRL ("1.234,56 G"), parseBRL
    │   │   ├── businessDays.ts       getNthBusinessDay, getReceivedPayments
    │   │   ├── credit.ts
    │   │   └── syncActions.ts        performSync() — pull + mergeById LWW
    │   ├── constants/
    │   │   ├── theme.ts              paleta medieval (VT323, ouro, madeira)
    │   │   └── categories.ts         categorias RPG seed
    │   ├── assets/
    │   │   ├── icons/                Kenney Tiny Dungeon (armor, axe, char_0000..., tile_0000...)
    │   │   └── app-icon/             Goblin_Finance.png
    │   └── .env                      EXPO_PUBLIC_API_BASE_URL / TOKEN / DEVICE_ID
    └── infra/
        ├── docker-compose.yml
        ├── .env                      secrets do servidor
        └── .env.example
```

---

## 5. Variáveis de Ambiente

### `financa/infra/.env` (VPS — não commitar)
```env
POSTGRES_DB=financa
POSTGRES_USER=financa
POSTGRES_PASSWORD=<hash-64-chars>
API_TOKEN=<hash-64-chars>
ENVIRONMENT=production
```

### `financa/mobile/.env` (local — não commitar)
```env
EXPO_PUBLIC_API_BASE_URL=http://89.117.32.220:8000
EXPO_PUBLIC_API_TOKEN=71e6841090150621062e99f8dd37c5876b81569d4cc7aa1d30a323b13b4ee2b6
EXPO_PUBLIC_DEVICE_ID=my-phone-1
```

> ⚠️ **TOKEN EXPOSTO**: o token acima está visível no histórico do git (commit `e773f58`). Rotacionar assim que possível: gere novo token na VPS, atualize `infra/.env` + `mobile/.env`, reinicie o container.

---

## 6. Regras Financeiras

- **Dinheiro sempre em centavos (integer)** — PostgreSQL: `BIGINT`, TypeScript: tipo `Money`
- **Dias úteis** = segunda–sexta (sem feriados). Calculado em `lib/businessDays.ts`
- **Soft deletes**: campo `deleted_at` em todas as entidades. Nunca `DELETE` real
- **IDs gerados no cliente**: UUID v4. Permite criação offline
- **Sync LWW**: last-write-wins por `updated_at`. Servidor ganha em empate
- **balance_cents no servidor é autoritativo**: o router atualiza após cada `POST /transactions/`
- **Parcelamento de missões**: `parcela = ceil(total / meses)`. 1ª parcela debitada ao criar

---

## 7. Funcionalidades do App Mobile

### Tema Visual RPG

| Conceito financeiro | Nome no app |
|---|---|
| Dashboard | Taverna / Bolsa de Ouro |
| Gráfico de fluxo | Fluxo de Magia |
| Categorias de gasto | Ordens de Compra |
| Dívidas | Dívidas ao Ferreiro |
| Metas | Missões |
| Transações | Crônicas |
| Configurações | Grimório |
| Contas bancárias | Cofres do Reino |

### Bolsa de Ouro (Hero do Dashboard)

| Campo | O que calcula |
|---|---|
| Número grande | `totalMensalSalario - gastos` (projeção) |
| "NA CONTA AGORA" | `receberSoFar - gastos` (saldo real hoje) |
| RECEBIDO | parcelas de salário cujo dia já passou |
| A RECEBER | parcelas futuras do mês |
| GASTOS | total de despesas lançadas no mês |

> **Obs:** Depende de salário configurado. Sem salário → resultado negativo (só gastos).

### Cofres do Reino

- Lista contas ativas ordenadas por `BANK_ORDER = ['nubank','itaú','itau','inter']`
- Saldo vem de `account.balance_cents` (servidor autoritativo — não recalcular localmente)
- `BankIcon` normaliza NFD para remover acentos antes de lookup ('Itaú' → 'itau')

### Missões (Goals)

- Sistema de parcelamento automático: seletor de meses, parcela = `ceil(total/meses)`
- 1ª parcela debitada ao criar; meses passados processados ao abrir a tela
- Botão `⚔ PAGAR PARCELA` para mês atual em aberto
- Cada parcela = transação de despesa na categoria Tesouro

### Crônicas (Transações)

- Lista agrupada por data com filtros TODOS/RECEITA/DESPESA
- Busca em tempo real por categoria e descrição
- Tipo `credit` excluído dos totais mensais (rastreado via fatura)

---

## 8. API Reference

Todos os endpoints requerem `Authorization: Bearer <API_TOKEN>`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (sem auth) |
| GET | `/accounts/` | Lista contas (não deletadas) |
| POST | `/accounts/` | Cria conta (`name`, `bank`, `type`, `initial_balance_cents`, `color`) |
| PATCH | `/accounts/{id}` | Atualiza conta (inclui `balance_cents`) |
| DELETE | `/accounts/{id}` | Soft delete de conta |
| GET | `/transactions/` | Lista transações |
| POST | `/transactions/` | Cria transação (atualiza `balance_cents` da conta) |
| GET | `/categories/` | Lista categorias seed |
| GET/POST | `/debts/` | Dívidas |
| POST | `/debts/plan` | Plano Avalanche/Bola de Neve (query params) |
| GET | `/debts/{id}/simulate` | Simula amortização (query params) |
| GET/POST | `/goals/` | Metas |
| POST | `/goals/{id}/contribution` | Contribuição à meta |
| GET/POST | `/budgets/` | Orçamentos |
| GET/POST | `/bills/` | Contas a pagar |
| GET/PUT | `/allocation` | Política de alocação |
| GET | `/sync/pull?since=<ISO>` | Pull all rows updated after timestamp |
| POST | `/sync/push` | Push local rows (upsert LWW) |
| POST | `/import/xlsx-reconciled` | Importa xlsx com sheets Itaú/Inter |
| GET | `/dashboard/summary?year=&month=` | Resumo mensal |

---

## 9. Sync Mobile ↔ VPS

### Pull (`performSync`)
```
GET /sync/pull?since=<last_sync_ts>
  → retorna todos os rows com updated_at > since_ts (incluindo deleted_at)
  → mergeById LWW: server wins se server.updated_at >= local.updated_at
```

### Push
```
POST /sync/push { transactions, accounts, debts, goals, bills, budgets }
  → upsert por id; server wins se server.updated_at > client.updated_at
  → returns { accepted: N, conflicts: N }
```

### Trigger
- Pull-to-refresh no Dashboard
- *(planejado: ao abrir o app, ao voltar do background, a cada 5 min)*

---

## 10. Deploy

### Atualizar backend na VPS
```bash
ssh user@89.117.32.220
cd /opt/financa
git pull origin master
docker compose -f financa/infra/docker-compose.yml up -d --build api
docker compose -f financa/infra/docker-compose.yml logs -f api
```

### Rodar mobile localmente
```bash
cd financa/mobile
npm install --legacy-peer-deps
npx expo start --clear    # QR code para Expo Go / emulador
```

---

## 11. Problemas Resolvidos (referência rápida)

| Problema | Solução |
|---|---|
| `alembic.ini` não encontrado no container | CMD do Dockerfile: `alembic -c alembic/alembic.ini upgrade head` |
| `date` sombra o tipo em Pydantic | Import com alias: `from datetime import date as _date` |
| `eval_type_backport` falha com `X \| Y` | Adicionar `eval-type-backport==0.2.0` no `requirements.txt` |
| Rotas com 404 — prefixo `/api` | Rotas registradas sem `/api`, sempre com trailing slash |
| `op-sqlite` → 404 no npm | Renomeado para `@op-engineering/op-sqlite` |
| Plugin `op-sqlite` quebra build web | Remover do `app.json` para web; recolocar antes de EAS Build |
| Token backend não chegava ao mobile | Faltava `financa/mobile/.env` com `EXPO_PUBLIC_API_TOKEN` |
| Contas mostrando saldo 0,00 | `accountStore` tinha IDs hardcoded; agora começa vazio e usa UUIDs do servidor |
| Dashboard somava transações sobre `balance_cents` (2×) | Usar `balance_cents` direto (valor autoritativo do servidor) |
| `BankIcon` não exibia para Itaú/Inter | Normalizar NFD + lowercase antes do lookup |
| Duplicate key warning "Outros" | `getTopCategories` agrupa por nome display; key JSX com índice |
| Contas deletadas aparecendo como ativas no sync | `AccountOut` não tinha `deleted_at`; adicionado |
| Transferências importadas em duplicata | Importar apenas lado fonte; router credita o destino automaticamente |
| Saldo final incorreto após importação xlsx | PATCH autoritativo com saldo final da planilha após importar todos os lançamentos |
| curl com UTF-8 no Windows retorna 400 | Usar `urllib.request` com encode UTF-8, não curl com `$()` aninhado |
| `expense_cents` retorna string no JSON | Tratar com `Number()` no mobile |

---

## 12. Nomenclatura RPG (referência rápida)

| Original | RPG |
|---|---|
| R$ / Reais | `G` (gold) — ex: `1.234,56 G` |
| Saldo disponível | Bolsa de Ouro |
| Dívidas ativas | Dívidas ao Ferreiro |
| Maiores categorias | Ordens de Compra |
| Reserva de emergência | Reserva Real |
| Fluxo de caixa | Fluxo de Magia |
| Metas | Missões |
| Dashboard | Taverna / Guilda |
| Transações | Crônicas |
| Configurações | Grimório |
| Contas bancárias | Cofres do Reino |

### Categorias RPG

| ID | Nome | Equivalente real |
|----|------|-----------------|
| — | Armazém | Supermercado/Alimentação |
| — | Estábulo | Gasolina/Veículo |
| — | Taverna | Aluguel/Moradia |
| — | Arena | Lazer/Entretenimento |
| — | Alquimia | Saúde/Farmácia |
| — | Caravana | Transporte/Viagem |
| — | Recompensa | Salário/Receita |
| — | Tesouro | Parcela de missão (goal_deposit) |

---

## 13. Próximas Prioridades

- [ ] **Deploy do fix `AccountOut.deleted_at`** na VPS (remove "Conta Corrente" e "Corrente 2")
- [ ] **Configurar salário** no app (para Bolsa de Ouro mostrar valor positivo real)
- [ ] **Persistência offline** — migrar stores Zustand de memória para `expo-sqlite` (dados somem ao fechar o app)
- [ ] **Rotacionar API token** exposto no git history (commit `e773f58`)
- [ ] **EAS Build** de preview com novo tema RPG e ícone
- [ ] **Sync bidirecional testado** end-to-end (push de transações criadas no app)
- [ ] **Cadastrar dados reais** — salário, despesas fixas, dívidas

---

## 14. Changelog

### 2026-04-18
- Fix: `AccountOut` inclui `deleted_at` (contas deletadas não aparecem mais no mobile)
- Fix: accounts não hardcoded; `mergeById` usa UUIDs do servidor
- Fix: `balance_cents` direto do servidor no dashboard (sem double-counting)
- Fix: `BankIcon` normaliza NFD para 'Itaú'/'Inter'
- Fix: `getTopCategories` agrupa por nome display; key JSX com índice
- Importação xlsx reconciliada Itaú/Inter com validação de saldo final
- Endpoint `POST /import/xlsx-reconciled`

### 2026-04-15
- Salário configurável: `salaryStore` com pagamentos no 5º, 20º e último dia útil
- `lib/businessDays.ts` — cálculo de dias úteis
- Dashboard "Bolsa de Ouro": projeção + saldo atual + recebido/a receber/gastos
- Crônicas: filtros TODOS/RECEITA/DESPESA + busca em tempo real
- Missões: sistema de parcelamento automático
- Redesign RPG/Medieval completo (fonte VT323, paleta medieval, ícones Kenney)
- Ícone do app: Goblin_Finance.png

### 2026-04-14
- Backend deployado na VPS (FastAPI + PostgreSQL 16)
- Integração OpenClaw → Telegram → Backend confirmada end-to-end
- EAS Build do APK instalado no celular
- Sync `/pull` e `/push` testados via curl
