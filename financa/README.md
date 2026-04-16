# Guild Ledger — App Financeiro Pessoal

App de finanças pessoais com tema RPG medieval. Monorepo com backend, bot Telegram e app mobile React Native.

```
financa/
├── backend/          FastAPI + SQLAlchemy 2 + PostgreSQL 16
├── bot/              python-telegram-bot v21 + OpenClaw bridge
├── mobile/           Expo + React Native + Zustand
└── infra/            Docker Compose + Caddy + VPS provisioning
```

---

## Stack

### Mobile
- **Expo SDK 51** com Expo Router (navegação por arquivos)
- **Zustand** — gerenciamento de estado (em memória, sem SQLite por enquanto)
- **VT323** — fonte pixel art em todo o app
- **Kenney Tiny Dungeon (CC0)** — ícones pixel art (espada, baú, escudo, etc.)
- **MaterialCommunityIcons** — ícones de suporte
- TypeScript `strict: true`

### Backend
- **FastAPI** — API REST assíncrona
- **SQLAlchemy 2.x** (async) + **Alembic** — ORM e migrations
- **PostgreSQL 16** — banco principal (dinheiro em centavos `BIGINT`)
- **APScheduler** — worker de recorrências (sem Redis)

### Infra
- **Docker Compose** — postgres + backend + bot
- **Caddy** — proxy reverso + TLS automático
- **Backblaze B2 + rclone** — backup remoto 30 dias

---

## Como rodar localmente

```bash
# Backend
cd infra
cp .env.example .env   # preencher variáveis
docker compose up --build -d

# Mobile
cd mobile
npm install
npx expo start         # pressione 'a' para Android, 'i' para iOS
```

---

## Funcionalidades do App Mobile

### Tema Visual
- Fonte **VT323** (pixel art) em **todo o app** — títulos, valores, labels, botões
- Paleta medieval: fundo terra escura (`#170C00`), ouro (`#FFD700`), verde floresta, escarlate
- Bordas retas (sem `borderRadius`) — visual pixel art
- Ícones PNG pixel art (Kenney) com chip escuro para isolamento visual

---

### Aba: GUILDA (Dashboard)

**Bolsa de Ouro** — card hero com dois números:

| Número | O que mostra |
|--------|-------------|
| **Grande** (ex: `2.080,00 G`) | Projeção do mês: soma de todos os salários do mês − gastos até agora |
| **Pequeno "NA CONTA"** (ex: `1.006,00 G`) | Saldo atual: salários já recebidos − gastos |

- **Recebido** — soma dos pagamentos que já entraram (calculado automaticamente com base na data de hoje vs. dias úteis)
- **A Receber** — o que ainda vai entrar no mês
- **Gastos** — total de despesas lançadas no mês

**Como funciona a projeção:**
- Ao receber o 5º dia útil: número pequeno sobe, grande não muda (já estava contabilizado)
- Ao gastar: **ambos** os números diminuem
- Ao receber o 20º dia útil: número pequeno sobe novamente, grande não muda

**Configuração do Salário** (em Configurações → Bolsa de Ouro):
- 3 campos editáveis: **5º Dia Útil**, **20º Dia Útil**, **Último Dia do Mês**
- Salvo no `salaryStore` (persiste na sessão)

**Outros cards:**
- **Fluxo de Magia** — gráfico de barras do cashflow mensal (12 meses)
- **Reserva Real** — % de conclusão da meta de emergência
- **Ordens de Compra** — top categorias de gastos do mês com barras
- **Dívidas ao Ferreiro** — número de contratos ativos + saldo total

---

### Aba: CRÔNICAS (Transações)

**Lista de transações** agrupada por data com saldo do dia.

**Filtros:**
- `TODOS` / `RECEITA` / `DESPESA` — botões quadrados em VT323 (sem bordas arredondadas)
- Funcionam em conjunto com a busca

**Busca `[ BUSCA ]`:**
- Botão no header em VT323 — abre barra de texto inline
- Filtra em tempo real por **categoria** e **descrição**
- `✕` limpa o texto, botão no header fecha e limpa a busca

**Item da lista:**
- Linha principal: **nome da categoria** (ex: Armazém, Estábulo)
- Linha secundária: descrição (se houver)
- Valor com sinal `+` receita / `−` despesa

**Nova Transação (botão espada ⚔ no centro da tab bar):**
- Tipo: Despesa / Receita / Transf.
- Valor com numpad pixel art — exibe `0,00 G` (G após o número)
- Categorias em chips horizontais com ícone
- Conta (seletor) + Data (calendário temático)
- Descrição opcional
- Formato monetário sempre `1.234,56 G`

---

### Aba: MISSÕES (Goals/Metas)

**Resumo no topo:**
- **OURO GUARDADO** — soma do `current_cents` de todas as missões ativas
- **FALTAM** — quanto ainda falta para cumprir todas as metas
- **PROGRESSO** — % geral
- Barra de progresso visual

**Lista de missões — GoalCard:**

```
NOME DA MISSÃO                          72%
━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░
GUARDADO        FALTAM          META
1.440,00 G      560,00 G        2.000,00 G
────────────────────────────────────────
200,00 G/MÊS                  2/6 PAGAS
  ⚔ PAGAR PARCELA — 200,00 G
PRAZO: 09/2025
```

Campos:
- **GUARDADO** — quanto já foi separado
- **FALTAM** — diferença para a meta
- **META** — valor total alvo
- **PRAZO** — data limite (se definida)
- **ATRASADA** — badge vermelho se passou do prazo e não concluiu
- Lixeira para excluir (com confirmação)

**Criar Missão (botão `+ NOVA`):**
1. Nome da missão
2. Valor total (numpad)
3. Seletor de meses `[ − ] 6 [ + ]` (1–60)
4. Preview em tempo real:
   - `PARCELA MENSAL: 200,00 G`
   - `TOTAL: 6× 200,00 G`
   - `1ª PARCELA: HOJE — 200,00 G` em vermelho
5. Escolha de cor (6 opções)

**Sistema de Parcelamento:**

| Evento | O que acontece |
|--------|---------------|
| Criar missão | 1ª parcela debitada imediatamente (transação "Parcela 1/6: [nome]") |
| Abrir aba de Missões | App verifica meses passados → cria silenciosamente parcelas em atraso |
| Mês atual em aberto | Botão `⚔ PAGAR PARCELA — X G` aparece no card |
| Tocar no botão | Alert de confirmação "Parcela N/M" → débito criado, `current_cents` atualizado |
| Parcela paga | Exibe `✓ PARCELA DO MÊS RECOLHIDA` em verde |
| Meta concluída | `6/6 PAGAS`, barra 100%, progresso completo |

Cada parcela paga gera uma transação do tipo **Despesa** na categoria **Tesouro** — o valor sai da bolsa de ouro e fica "guardado" na missão.

---

### Aba: BOLSA (Configurações)

**Salário (Bolsa de Ouro):**
- 3 campos de valor editáveis para os 3 pagamentos mensais
- Botão "Salvar Salário"

**Política de Alocação:**
- Sliders: Reserva % / Dívidas % / Metas % (devem somar 100%)
- Define como o saldo disponível é distribuído

**Bot Telegram:** status de conexão com @FiireKeeperBot

**Sincronização:** status + última data de sync com o Cloud Ledger

**Módulos (atalhos):**
- Orçamentos, Contas a Pagar, Dívidas

**Ferramentas Avançadas:**
- Recorrências — transações automáticas diárias
- Provisões Anuais — IPVA, seguro, assinaturas anuais (reserva mensal)
- Reserva de Emergência — meta de cobertura de despesas
- Plano de Quitação — Avalanche vs. Bola de Neve

---

### Outras Telas

**Dívidas** (`/debts`):
- Lista com badge de criticidade (taxa ≥ 8% a.m. = crítica)
- Detalhe com métricas: saldo, taxa, prazo, total de juros
- Simulador interativo: estratégia (Mínimo / Livre / 12 Meses) + slider de valor

**Orçamentos** (`/budgets`):
- Barras de progresso por categoria vs. limite
- Filtros: Todos / OK / Estourados
- Seletor de mês, botão "Copiar mês anterior"

**Contas a Pagar** (`/bills`):
- Seções: Vencidas hoje / Próximos 7 dias / Mais tarde / Pagas
- Botão "Marcar como paga"

**Reserva de Emergência** (`/emergency-reserve`):
- Meta em meses de cobertura
- Cálculo automático baseado na média de gastos

---

## Categorias (tema RPG)

| ID | Nome | Equivalente |
|----|------|-------------|
| 1 | Armazém | Mercado/Alimentação |
| 2 | Estábulo | Gasolina/Veículo |
| 3 | Taverna | Aluguel/Moradia |
| 4 | Arena | Lazer/Entretenimento |
| 5 | Alquimia | Saúde/Farmácia |
| 6 | Caravana | Transporte/Viagem |
| 7 | Recompensa | Salário/Receita |
| goal_deposit | Tesouro | Parcela de missão |

---

## Regras Financeiras

- **Dinheiro sempre em centavos** (integer). Nunca float.
  - PostgreSQL: `BIGINT`
  - TypeScript: tipo brandado `Money = number & { __brand: 'Money' }`
- **Dias úteis** = segunda–sexta (sem feriados por ora). Calculado em `lib/businessDays.ts`.
- **Parcelamento de missões**: `parcela = ceil(total / meses)`. Pode haver 1 centavo extra na última.
- **Soft deletes**: `deleted_at` em todas as entidades. Nunca apagado permanentemente.
- **Sincronização**: offline-first, last-write-wins por `updated_at`. Servidor ganha no empate.

---

## Estrutura de Arquivos — Mobile

```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx        Tab bar + FAB espada
│   │   ├── index.tsx          Dashboard (Guilda)
│   │   ├── transactions.tsx   Crônicas com busca + filtros
│   │   ├── goals.tsx          Missões com parcelamento
│   │   └── more.tsx           Configurações
│   ├── new-transaction.tsx    Modal: nova transação
│   ├── new-goal.tsx           Modal: nova missão
│   ├── debts/                 Dívidas + simulador
│   ├── budgets/               Orçamentos
│   ├── bills/                 Contas a pagar
│   ├── emergency-reserve.tsx
│   ├── recurrences.tsx
│   └── provisions.tsx
├── components/ui/
│   ├── GoalCard.tsx           Card de missão com parcelas
│   ├── TransactionRow.tsx     Linha da lista de transações
│   ├── ScrollCard.tsx         Card base com ícone pixel art
│   ├── RPGIcon.tsx            Ícones PNG pixel art (Kenney)
│   ├── ProgressBar.tsx
│   ├── BarChart.tsx
│   ├── NumPad.tsx             Teclado numérico custom
│   └── CircularProgress.tsx
├── store/
│   ├── transactionStore.ts
│   ├── goalStore.ts           + processInstallments()
│   ├── salaryStore.ts         Configuração de salário (3 pagamentos)
│   ├── debtStore.ts
│   ├── accountStore.ts
│   ├── budgetStore.ts
│   ├── categoryStore.ts
│   ├── allocationStore.ts
│   └── syncStore.ts
├── lib/
│   ├── money.ts               Tipo Money, formatBRL, parseBRL
│   ├── businessDays.ts        getNthBusinessDay, getReceivedPayments
│   ├── finance.ts
│   └── syncActions.ts
└── constants/
    ├── theme.ts               Colors, Spacing, Typography (VT323)
    └── categories.ts          8 categorias RPG
```

---

## API Reference

Todos os endpoints requerem `Authorization: Bearer <SECRET_TOKEN>`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/summary` | Resumo mensal (receitas, despesas, saldo) |
| GET | `/api/dashboard/cashflow` | Cashflow 12 meses |
| GET/POST | `/api/accounts` | Contas |
| GET/POST | `/api/transactions` | Transações |
| GET/POST | `/api/debts` | Dívidas |
| POST | `/api/debts/{id}/payment` | Registrar pagamento de dívida |
| GET/POST | `/api/goals` | Metas |
| POST | `/api/goals/{id}/contribution` | Adicionar contribuição à meta |
| GET/POST | `/api/budgets` | Orçamentos |
| GET | `/api/budgets/variance` | Orçado vs. realizado |
| GET/POST | `/api/bills` | Contas a pagar |
| POST | `/api/bills/{id}/mark-paid` | Marcar conta como paga |
| GET/PUT | `/api/allocation` | Política de alocação |
| GET/POST | `/api/categories` | Categorias |
| POST | `/api/sync/push` | Enviar mudanças locais |
| POST | `/api/sync/pull` | Receber mudanças do servidor |
| POST | `/api/import` | Importar OFX ou CSV |
| POST | `/api/debts/plan` | Plano global Avalanche vs. Bola de Neve |

---

## Comandos do Bot Telegram

| Comando | Descrição |
|---------|-----------|
| `/start` | Boas-vindas + lista de comandos |
| `/saldo` | Saldo das contas + resumo mensal |
| `/lancamento <valor> <descrição>` | Lançar transação rápida |
| `/relatorio` | Receita / despesa / saldo do mês |
| `/dividas` | Visão das dívidas ativas |
| `/metas` | Progresso das metas |
| `/contas` | Contas a pagar pendentes |
| `/ai <pergunta>` | Encaminhar para agente OpenClaw |
| `/ajuda` | Texto de ajuda |

---

## Deploy (VPS Hostinger Ubuntu 22.04)

```bash
# Provisionamento (apenas uma vez)
bash infra/setup.sh

# Deploy
scp -r financa/ user@ip:/opt/financa
ssh user@ip "cd /opt/financa/infra && cp .env.example .env && nano .env && docker compose up --build -d"

# Atualização
ssh user@ip "cd /opt/financa && git pull && cd infra && docker compose up --build -d"
```

---

## Backup

- **Local**: 7 dias de rotação em `/opt/financa-backups/`
- **Remoto**: Backblaze B2, 30 dias via rclone
- Cron: diário às 3h
- Restore: `gunzip -c backup.sql.gz | docker exec -i financa_postgres psql -U postgres financa`

---

## Changelog

### 2026-04-15

#### Bolsa de Ouro — Salário configurável
- Novo `salaryStore` com 3 pagamentos: 5º dia útil, 20º dia útil, último dia do mês
- Novo `lib/businessDays.ts` — cálculo de dias úteis (seg–sex)
- Dashboard reformulado: **dois números** na Bolsa de Ouro
  - Grande = total do mês − gastos (projeção)
  - Pequeno "NA CONTA" = recebido até hoje − gastos
- Stats: Recebido / A Receber / Gastos
- Seção "Salário" em Configurações com 3 campos editáveis

#### Crônicas (Transações) — melhorias visuais e busca
- Filtros `TODOS / RECEITA / DESPESA` em VT323 sem bordas arredondadas
- Botão `[ BUSCA ]` em VT323 (substituiu emoji 🔍)
- Busca funcional por categoria e descrição em tempo real
- Lista: categoria como título principal, descrição como subtítulo
- Descrição não é mais obrigatória ao criar transação
- Formato monetário corrigido: `0,00 G` (G após o número, sem `G$`)
- Fonte VT323 no campo de valor da nova transação

#### Missões (Goals) — redesign completo + parcelamento
- Tela completamente refeita em VT323
- Card de resumo: OURO GUARDADO / FALTAM / PROGRESSO
- GoalCard redesenhado: GUARDADO / FALTAM / META + barra de progresso
- Botão `+ NOVA` no header para criar missões
- Botão de excluir com confirmação "Abandonar missão?"
- **Sistema de parcelamento:**
  - Seletor de meses `[ − ] N [ + ]` no formulário
  - Preview: parcela mensal, total, data da 1ª parcela
  - 1ª parcela debitada imediatamente ao criar
  - Meses já passados processados silenciosamente ao abrir a tela
  - Botão `⚔ PAGAR PARCELA — X G` para o mês atual em aberto
  - Confirmação com número da parcela (ex: "Parcela 2/6")
  - `✓ PARCELA DO MÊS RECOLHIDA` após pagamento
  - Contador `N/M PAGAS` no card
  - Cada parcela = transação de despesa na categoria **Tesouro**
- Categoria `goal_deposit` (Tesouro) adicionada ao catálogo
- `goalStore` extendido: campos `monthly_cents`, `months_total` + função `processInstallments()`
