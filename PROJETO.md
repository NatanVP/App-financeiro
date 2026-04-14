# Finança — App de Controle Financeiro Pessoal

Projeto de uso **estritamente pessoal**. Sem publicação em loja, sem login, sem multiusuário.
Controle financeiro real + planejamento de quitação de dívidas + operação por linguagem natural via Telegram.

---

## 1. Stack Real (o que está em produção)

### Mobile
- **React Native + Expo SDK 51**
- **expo-router ~3.5** (file-based navigation)
- **TypeScript** strict
- **Zustand ^4.5** — estado global
- **@op-engineering/op-sqlite ^9** — SQLite local performático (WAL mode)
  - **ATENÇÃO:** o pacote foi renomeado de `op-sqlite` para `@op-engineering/op-sqlite`. Todos os imports e referências no código devem usar o nome novo.
- **victory-native ^41** + **@shopify/react-native-skia ^1.2** — gráficos
- **date-fns ^3** — datas
- **expo-linear-gradient**, **expo-haptics**, **expo-font**
- **react-native-reanimated ~3.10**, **react-native-gesture-handler ~2.16**
- Tipo `Money` customizado (branded integer em centavos) — **não usa dinero.js**
- Build: EAS Build ou `npx expo start --web` para testes no browser

### Backend
- **FastAPI** async
- **SQLAlchemy 2.x** async (Mapped + mapped_column)
- **Alembic** — migrations automáticas no startup do container
- **PostgreSQL 16** — dinheiro como `BIGINT` (centavos)
- **pydantic-settings** — config via `.env`
- **pydantic v2.7.1** — requer `eval-type-backport==0.2.0` nas requirements
- **APScheduler** — worker de recorrências dentro do processo FastAPI (sem Redis, sem container separado)
- **ofxparse** — parser de extratos OFX

### Infra / VPS
- **VPS Hostinger Ubuntu 22.04** — IP: `89.117.32.220`
- **Docker Compose** — orquestra `postgres` + `backend`
- **Traefik** — já rodando na VPS (porta 80/443), **não usa Caddy nem Nginx**
- **Sem bot container separado** — o bot Telegram é gerenciado pelo **OpenClaw**
- **Redis não existe no stack** — substituído por APScheduler in-process
- Backend exposto na porta **8000** diretamente (sem proxy para uso atual)
- Alembic roda automaticamente no `CMD` do Dockerfile:
  ```dockerfile
  CMD ["sh", "-c", "alembic -c alembic/alembic.ini upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
  ```

### Telegram / OpenClaw
- **OpenClaw** — agente já rodando na VPS, porta `43688`, rede Docker `openclaw-clgu_default`
- Bot registrado como **@FiireKeeperBot**, já funcionando no Telegram
- O backend `financa` conecta-se à rede `openclaw-clgu_default` via Docker network externa
- OpenClaw acessa o backend internamente via `infra-backend-1:8000`
- Skill `financa` habilitada no OpenClaw com `"enabled": true` em `skills.entries`

### Autenticação
- **Bearer token estático** em todas as rotas
- Sem JWT, sem refresh token — app single-user pessoal

---

## 2. Arquitetura Real

```
┌─────────────────────┐        HTTP (VPS IP)        ┌──────────────────────────────┐
│  App Mobile         │ ◄──────────────────────────► │  VPS 89.117.32.220          │
│  React Native       │   EXPO_PUBLIC_API_BASE_URL   │                              │
│  + SQLite local     │   =http://89.117.32.220:8000 │  ┌─────────────────────┐    │
└─────────────────────┘                              │  │ FastAPI :8000        │    │
                                                     │  │ (infra-backend-1)   │    │
┌─────────────────────┐    rede Docker interna       │  └──────────┬──────────┘    │
│  Telegram           │ ◄──────────────────────────► │             │               │
│  @FiireKeeperBot    │    openclaw-clgu_default      │  ┌──────────▼──────────┐    │
└─────────────────────┘                              │  │ PostgreSQL 16        │    │
         ▲                                           │  └─────────────────────┘    │
         │ Webhook/Polling                           │                              │
┌────────┴────────────┐                             │  ┌─────────────────────┐    │
│  OpenClaw :43688    │ ─────────────────────────── ► │  Traefik (já existe) │    │
│  (agente IA)        │    Docker network financa    │  └─────────────────────┘    │
└─────────────────────┘                             └──────────────────────────────┘
```

---

## 3. Estrutura de Pastas Real

```
App-financeiro/
├── PROJETO.md                    ← este arquivo (fonte de verdade)
└── financa/
    ├── backend/
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── api/              rotas FastAPI
    │   │   ├── models/           SQLAlchemy models
    │   │   ├── schemas/          Pydantic schemas
    │   │   └── services/         lógica de negócio
    │   ├── alembic/
    │   │   └── alembic.ini       script_location = alembic
    │   ├── Dockerfile
    │   └── requirements.txt
    ├── mobile/
    │   ├── app/                  expo-router screens
    │   │   ├── (tabs)/           tabs: index, transactions, goals, more
    │   │   ├── debts/            dívidas + simulador + plano global
    │   │   ├── bills.tsx
    │   │   ├── budgets.tsx
    │   │   ├── emergency-reserve.tsx
    │   │   ├── provisions.tsx
    │   │   └── new-transaction.tsx
    │   ├── components/
    │   ├── constants/
    │   │   ├── theme.ts              cores, espaçamentos, tipografia
    │   │   └── categories.ts         lista de categorias + CATEGORY_MAP (id → Category)
    │   ├── db/
    │   │   ├── migrations.ts
    │   │   └── queries/          transactions.ts, debts.ts
    │   ├── lib/
    │   │   └── money.ts          tipo Money + formatBRL + parseBRL
    │   ├── services/
    │   │   └── api.ts            fetch wrapper com Bearer token
    │   ├── store/
    │   │   ├── accountStore.ts
    │   │   ├── transactionStore.ts
    │   │   ├── debtStore.ts
    │   │   ├── goalStore.ts
    │   │   ├── budgetStore.ts
    │   │   ├── billStore.ts
    │   │   ├── allocationStore.ts
    │   │   ├── syncStore.ts
    │   │   ├── emergencyReserveStore.ts
    │   │   ├── annualProvisionStore.ts
    │   │   ├── recurrenceStore.ts
    │   │   └── index.ts
    │   ├── utils/
    │   │   └── money.ts          re-export de lib/money + alias formatMoney
    │   ├── .env                  EXPO_PUBLIC_* vars (não commitar)
    │   ├── .env.example
    │   ├── app.json
    │   └── package.json
    └── infra/
        ├── docker-compose.yml
        ├── .env                  secrets do servidor (não commitar)
        └── .env.example
```

---

## 4. Variáveis de Ambiente

### `financa/infra/.env` (VPS)
```env
POSTGRES_DB=financa
POSTGRES_USER=financa
POSTGRES_PASSWORD=<hash-64-chars>
API_TOKEN=<hash-64-chars>
ENVIRONMENT=production
```

### `financa/mobile/.env` (local, não commitar)
```env
EXPO_PUBLIC_API_BASE_URL=http://89.117.32.220:8000
EXPO_PUBLIC_API_TOKEN=<mesmo-API_TOKEN-do-backend>
EXPO_PUBLIC_DEVICE_ID=meu-celular-1
```

> ⚠️ **ATENÇÃO — TOKEN EXPOSTO NO GIT**
>
> O arquivo `financa/mobile/.env` continha o token real (`EXPO_PUBLIC_API_TOKEN`) e foi **acidentalmente incluído em um commit anterior** (commit `e773f58` — "Initial commit").
> Esse token ainda está visível no histórico do repositório mesmo após o `.gitignore` ter sido adicionado.
>
> **Ação necessária ao chegar em casa:**
> 1. Gere um novo token no backend (variável `API_TOKEN` em `financa/infra/.env` na VPS).
> 2. Atualize `financa/mobile/.env` localmente com o novo token.
> 3. Reinicie o container do backend: `docker compose up --build -d`
> 4. Se quiser limpar o histórico do git para remover o token antigo, use `git filter-repo` ou contate o GitHub Support para apagar o cache. Mas o mais urgente é **rotacionar o token**.
>
> O token exposto está no commit `e773f58` (Initial commit) — visível no histórico do GitHub. Rotacione-o antes de qualquer uso.

---

## 5. Docker Compose (infra)

O `docker-compose.yml` em `financa/infra/` tem dois serviços: `postgres` e `backend`.
**Não existe serviço de bot** — o Telegram é gerenciado pelo OpenClaw.

Redes:
```yaml
networks:
  financa:
    driver: bridge
  openclaw:
    external: true
    name: openclaw-clgu_default
```

O backend conecta-se em **ambas** as redes para ser acessível pelo OpenClaw internamente.

---

## 6. Problemas Encontrados e Soluções

### 6.1 `alembic.ini` não encontrado no container

**Problema:** Container rodava `alembic upgrade head` do diretório `/app`, mas o `alembic.ini` fica em `/app/alembic/alembic.ini`.

**Solução:** Dockerfile CMD explicitamente passa o caminho:
```dockerfile
CMD ["sh", "-c", "alembic -c alembic/alembic.ini upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```
E `alembic.ini` mantém `script_location = alembic` (relativo ao CWD `/app`).

---

### 6.2 `TypeError: NoneType | NoneType` no Pydantic

**Problema:** Em `TransactionUpdate`, o campo `date: date | None = None` causava falha ao avaliar a annotation em string. O Pydantic v2 inclui o dict da classe no namespace de avaliação, onde `date = None` (o default) sombrava o `datetime.date` importado.

**Solução:** Importar com alias em `backend/app/schemas/transaction.py`:
```python
from datetime import date as _date, datetime
# e usar _date em todos os campos:
date: _date | None = None
```

---

### 6.3 Pydantic `eval_type_backport` falhando com `|` syntax

**Problema:** `from __future__ import annotations` faz todas as annotations virarem strings. Pydantic 2.7.1 usa `eval_type_backport` para avaliá-las, que não suportava `X | Y` em Python < 3.10.

**Solução:** Adicionar `eval-type-backport==0.2.0` como **primeira linha** de `requirements.txt`.

---

### 6.4 Rotas com 404 — prefixo `/api`

**Problema:** O README original listava endpoints como `/api/accounts`. Na implementação real, as rotas são registradas **sem** o prefixo `/api`.

**Solução:** Usar `/accounts/` (com trailing slash para evitar redirect 307).

---

### 6.5 OpenClaw skill não disparava

**Problema:** O backend subia, OpenClaw rodava, mas os comandos do Telegram não chegavam ao Finança.

**Solução:** Adicionar `"financa": { "enabled": true }` em `skills.entries` no arquivo de configuração do OpenClaw (`openclaw.json`). O Claude Code na VPS fez esse ajuste.

---

### 6.6 Pacote `op-sqlite` — 404 no npm

**Problema:** O `package.json` referenciava `"op-sqlite": "^9.0.0"` que não existe mais no registry npm.

**Solução:** O pacote foi renomeado. Correções aplicadas:
- `package.json`: `"op-sqlite"` → `"@op-engineering/op-sqlite"`
- `app.json` plugins: `"op-sqlite"` → `"@op-engineering/op-sqlite"`
- Todos os imports nos arquivos `.ts/.tsx`:
  - `from 'op-sqlite'` → `from '@op-engineering/op-sqlite'`
  - Arquivos afetados: `app/_layout.tsx`, `db/migrations.ts`, `db/queries/debts.ts`, `db/queries/transactions.ts`

---

### 6.7 `expo-linking` não instalado — bundle web falhava logo de início

**Problema:** `expo-router ~3.5` depende de `expo-linking` internamente, mas o pacote não estava em `package.json`. O Metro retornava `Unable to resolve "expo-linking"` ao tentar montar o bundle web.

**Solução:**
```bash
npm install expo-linking --legacy-peer-deps
```

---

### 6.8 (antigo 6.7) Plugin `@op-engineering/op-sqlite` incompatível com web

**Problema:** Ao rodar `npx expo start --web`, o Expo tenta carregar o config plugin do `op-sqlite` e falha com `SyntaxError: Unexpected token 'typeof'`.

**Solução:** Remover o plugin do `app.json` para rodar no web. O plugin só é necessário para builds nativos (Android/iOS). Para testar no browser, `app.json` fica:
```json
"plugins": ["expo-router"]
```
Lembrar de readicionar o plugin antes de fazer EAS Build.

---

### 6.9 Imports estáticos de `@op-engineering/op-sqlite` quebravam o bundler web

**Problema:** `app/_layout.tsx`, `db/migrations.ts`, `db/queries/transactions.ts` e `db/queries/debts.ts` tinham `import { ... } from '@op-engineering/op-sqlite'` no topo do arquivo. O Metro tenta compilar todos os imports estáticos, mesmo que o código que os usa nunca execute na web — o módulo nativo não tem suporte web e falhava no bundle.

**Solução:** Converter todos os imports estáticos desses arquivos em imports dinâmicos guardados por `Platform.OS !== 'web'`:

- `app/_layout.tsx`: removido import estático de `open` e `runMigrations`; o `useEffect` agora faz `await import('@op-engineering/op-sqlite')` e `await import('@/db/migrations')` dentro de um `if (Platform.OS === 'web') return` + try/catch.
- `db/migrations.ts`: `import('./schema')` dinâmico; retorna cedo se `Platform.OS === 'web'`.
- `db/queries/transactions.ts` e `db/queries/debts.ts`: removido import do módulo nativo; tipo `OPSQLiteConnection` substituído por tipo local `AnyDB`; todas as funções retornam valor vazio imediatamente na web.

---

### 6.10 `as const[]` — sintaxe TypeScript inválida em `constants/theme.ts`

**Problema:** A linha:
```typescript
monoSm: { fontSize: 12, fontVariant: ['tabular-nums'] as const[] },
```
causava `SyntaxError: Unexpected token` no compilador Babel/Hermes do Metro. `as const[]` não é sintaxe TypeScript válida.

**Solução:**
```typescript
monoSm: { fontSize: 12, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
```

---

### 6.11 `react-native-svg` não instalado — usado em `components/ui/CircularProgress.tsx`

**Problema:** O componente `CircularProgress` importava `react-native-svg` que não estava em `package.json`. O bundle web falhava com `Unable to resolve module react-native-svg`.

**Solução:**
```bash
npm install react-native-svg --legacy-peer-deps
```

---

### 6.12 Conflito de peer deps no `npm install`

**Problema:** `@testing-library/react-native@12.4.3` pede `react-test-renderer@^19` mas o projeto usa React 18.

**Solução:** `npm install --legacy-peer-deps` em todos os installs do mobile.

---

### 6.13 `utils/money.ts` não existia

**Problema:** Telas (`plan.tsx`, `emergency-reserve.tsx`, `provisions.tsx`) importavam `{ formatMoney }` de `../utils/money`, mas o arquivo não existia — só existia `lib/money.ts` com `formatBRL`.

**Solução:** Criar `utils/money.ts` que re-exporta tudo de `lib/money` com alias:
```typescript
export { formatBRL as formatMoney } from '../lib/money';
export * from '../lib/money';
```

---

### 6.14 `services/api.ts` não existia

**Problema:** `app/debts/plan.tsx` importava `{ api }` de `../../services/api` mas o arquivo não existia.

**Solução:** Criar `services/api.ts` com wrapper fetch usando as env vars:
```typescript
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? '';
// api.get / api.post / api.put / api.patch / api.delete
```

---

### 6.15 `store/accountStore.ts` não existia

**Problema:** `app/emergency-reserve.tsx` importava `{ useAccountStore }` mas o arquivo não existia na pasta `store/`.

**Solução:** Criar `store/accountStore.ts` seguindo o padrão dos outros stores (Zustand + interface `Account` + métodos CRUD).

---

### 6.16 Emojis nos ícones do app substituídos por `@expo/vector-icons`

**Problema:** Todas as tab bar icons, ícones de categoria, botão de fechar e ícones de status eram emojis renderizados como `<Text>`. Resultado: tamanho inconsistente, cor não respondia ao tema, visual amador.

**Solução:** Usar `@expo/vector-icons` (já incluso no Expo SDK, sem install extra). Família escolhida: `MaterialCommunityIcons` para ícones funcionais e `Ionicons` para ações (fechar, adicionar, configurações).

Mapeamento aplicado:

| Local | Antes | Depois |
|---|---|---|
| Tab — Início | ⬛ | `MaterialCommunityIcons` `view-dashboard-outline` |
| Tab — Transações | 📋 | `MaterialCommunityIcons` `swap-horizontal` |
| Tab — Metas | 🎯 | `MaterialCommunityIcons` `flag-checkered` |
| Tab — Mais | ⋯ | `MaterialCommunityIcons` `dots-horizontal-circle-outline` |
| FAB (+) | `Text +` | `Ionicons` `add` |
| Dashboard settings | ⚙ | `Ionicons` `settings-outline` |
| Goals — frequência | 🎯 | `MaterialCommunityIcons` `flag-checkered` |
| More — Telegram | 📤 | `MaterialCommunityIcons` `send-circle-outline` |
| More — Sync | 🔄 | `MaterialCommunityIcons` `cloud-sync-outline` |
| Nova transação — fechar | ✕ | `Ionicons` `close` |
| Categorias | 🛒⛽🏠🎬💊🚗💼 | ícones MCI correspondentes |

Categorias extraídas para `constants/categories.ts` (fonte única) — `new-transaction.tsx` importa dali, elimina duplicação futura.

---

### 6.17 "Maiores Categorias" no dashboard era hardcoded

**Problema:** O bloco de maiores categorias da tela inicial exibia valores fixos (Moradia R$2.400, Alimentação R$1.250…) independentemente dos lançamentos reais do usuário.

**Solução:**
1. Criado `constants/categories.ts` com lista de categorias e `CATEGORY_MAP` (id → Category).
2. Adicionado seletor `getTopCategories(year, month, limit?)` em `store/transactionStore.ts`: filtra despesas do mês corrente, agrupa por `category_id`, ordena por valor decrescente, resolve o nome via `CATEGORY_MAP`.
3. Dashboard agora chama `getTopCategories(year, month)` — lista vazia exibe mensagem `"Nenhuma despesa lançada este mês"` em vez de crash ou dados falsos.

---

## 7. Regras Financeiras

- **Dinheiro sempre em centavos (integer)**. Nunca float.
  - PostgreSQL: `BIGINT`
  - TypeScript: tipo `Money = number & { __brand: 'Money' }` definido em `lib/money.ts`
- **Soft delete** em todas as entidades financeiras — campo `deleted_at`, nunca `DELETE` real.
- **IDs gerados no cliente** (UUID v4) para suporte offline-first.
- **Sync LWW** (last-write-wins) por `updated_at`. Servidor vence em empate.
- **Alocação**: `reserva% + dívidas% + metas% = 100`. Balde de metas recebe o resto para evitar drift de arredondamento.
- **PMT formula** para simulação de dívidas (amortização Price).
- **Dívidas críticas** = taxa ≥ 8% a.m. → sempre prioritárias em qualquer estratégia.

---

## 8. Como Rodar Localmente (mobile)

```powershell
cd "F:\Users\NATAN\Documents\Codigos\outras_coisas\f_1\App-financeiro\financa\mobile"
npm install --legacy-peer-deps
npx expo start --web --clear   # testa no browser (SQLite local não funciona no web)
```

Para Android físico ou emulador:
```powershell
npx expo start --android   # requer Android Studio ou dispositivo conectado
```

Para build de produção (APK):
```powershell
npm install -g eas-cli
eas login
eas build --profile development --platform android
```
Lembrar de readicionar o plugin `@op-engineering/op-sqlite` no `app.json` antes do EAS Build.

---

## 9. Como Atualizar o Backend na VPS

```bash
ssh user@89.117.32.220
cd /opt/financa
git pull
cd infra && docker compose up --build -d
docker compose logs -f backend
```

---

## 10. Screens do App Mobile

| Rota | Tela |
|------|------|
| `/(tabs)/` | Dashboard — hero card, cashflow chart, categorias, reserva |
| `/(tabs)/transactions` | Lista de transações com grupos por data + filtros |
| `/(tabs)/goals` | Metas com progresso circular + gráfico trimestral |
| `/(tabs)/more` | Config: sliders de alocação, sync, navegação |
| `/new-transaction` | Bottom sheet: toggle tipo, numpad, categoria, conta |
| `/debts` | Lista de dívidas com card resumo + badge de criticidade |
| `/debts/[id]` | Detalhe: métricas, trajetória, cenário ótimo |
| `/debts/[id]/simulator` | Simulador interativo: seletor de estratégia + slider |
| `/debts/plan` | Plano global: Avalanche vs Bola de Neve, comparação lado a lado |
| `/budgets` | Orçamentos com barras de progresso + filtro over/ok |
| `/bills` | Contas a pagar: seções vencida/pendente/paga |
| `/emergency-reserve` | Reserva de emergência |
| `/provisions` | Provisões anuais |

---

## 11. API Reference (rotas sem prefixo `/api`)

Todas requerem: `Authorization: Bearer <API_TOKEN>`

> **Nota sobre parâmetros testados em 2026-04-14** — ver seção 14 para resultados completos.

| Método | Rota | Parâmetros obrigatórios | Descrição |
|--------|------|------------------------|-----------|
| GET | `/health` | — | Health check (sem auth) |
| GET | `/accounts/` | — | Lista contas |
| POST | `/accounts/` | `name`, `bank`, `type`, `initial_balance_cents`, `color` | Cria conta |
| GET | `/transactions/` | — | Lista transações |
| POST | `/transactions/` | `account_id`, `amount_cents`, `type`, `description`, `date`, `source` | Cria transação |
| GET | `/categories/` | — | Lista categorias do sistema |
| GET | `/debts/` | — | Lista dívidas |
| POST | `/debts/` | `name`, `type`, `principal_cents`, `current_balance_cents`, `interest_rate_monthly`, `start_date`, `monthly_payment_cents`, `status` | Cria dívida |
| POST | `/debts/{id}/payments` | body com valor | Registra pagamento |
| POST | `/debts/plan` | query: `monthly_budget_cents`, `strategy` | Plano global (Avalanche/Snowball) |
| GET | `/debts/{id}/simulate` | query: `monthly_payment_cents`, `extra_payment_cents` | Simula amortização |
| GET | `/goals/` | — | Lista metas |
| POST | `/goals/` | `name`, `target_cents`, `current_cents`, `target_date`, `frequency` | Cria meta |
| GET | `/budgets/` | — | Lista orçamentos |
| POST | `/budgets/` | — | Cria orçamento |
| GET | `/bills/` | — | Lista contas a pagar |
| POST | `/bills/` | — | Cria conta a pagar |
| GET | `/dashboard/summary` | query: `year`, `month` | Resumo mensal |
| GET | `/dashboard/cashflow` | — | Cashflow 12 meses |
| POST | `/sync/push` | body: `{transactions,accounts,debts,goals,bills,budgets}` | Push mudanças locais |
| GET | `/sync/pull` | query: `since` (ISO datetime) | Pull mudanças desde timestamp |

---

## 12. Pontos Críticos

1. Não usar centavos → erros de arredondamento
2. Sem backup → falha de disco apaga histórico
3. Sync sem `updated_at` confiável → registro antigo sobrescreve novo
4. `op-sqlite` sem `@op-engineering/` → 404 no npm
5. Plugin `op-sqlite` no `app.json` → quebra build web
6. `date` como nome de campo e tipo → sombra o import em Pydantic (usar alias `_date`)
7. `alembic upgrade head` sem `-c alembic/alembic.ini` → FileNotFoundError no container
8. `npm install` sem `--legacy-peer-deps` → conflito de peer deps
9. Categoria obrigatória no lançamento → fricção alta
10. Agente sem log → impossível auditar erro
11. Import estático de módulo nativo no topo do arquivo → Metro tenta compilar para web e quebra, mesmo que o código nunca execute. Sempre usar dynamic import + `Platform.OS` guard para módulos nativos
12. `as const[]` não é TypeScript válido → usar `as ('literal')[]` ou `as readonly ('literal')[]`
13. Dados hardcoded em telas de dashboard → nunca refletem realidade; conectar à store desde o início
14. `curl` com aspas duplas aninhadas em `$()` no bash do Windows → body chega mal-formado ao servidor (400). Usar `--data-raw` com aspas simples externas
15. `/sync/pull` é GET (não POST), parâmetro é `since` (não `last_sync_at`)
16. `/debts/plan` e `/debts/{id}/simulate` recebem parâmetros via query string, não body
17. `/dashboard/summary` exige `?year=YYYY&month=M` — sem eles retorna 422
18. `expense_cents` e `surplus_cents` retornam como string no JSON do dashboard (serializer bug) — tratar com `Number()` no mobile

---

## 13. Status Atual (2026-04-14)

- [x] Backend deployado e rodando na VPS (`89.117.32.220:8000`)
- [x] PostgreSQL rodando com migrations aplicadas
- [x] OpenClaw integrado com skill `financa` — comandos via Telegram funcionando
- [x] `.env` mobile configurado com IP da VPS
- [x] Pacote `op-sqlite` renomeado para `@op-engineering/op-sqlite` em todo o projeto
- [x] `utils/money.ts` criado
- [x] `services/api.ts` criado
- [x] `store/accountStore.ts` criado
- [x] App mobile rodando no web sem erros de bundle (`npx expo start --web --clear` compila e serve em `localhost:8081`)
- [x] Dependências web instaladas: `expo-linking`, `react-native-svg`, `react-dom`, `react-native-web`
- [x] Imports de `@op-engineering/op-sqlite` protegidos com `Platform.OS !== 'web'` + dynamic import
- [x] Emojis substituídos por `@expo/vector-icons` (MaterialCommunityIcons + Ionicons)
- [x] `constants/categories.ts` — fonte única de categorias compartilhada entre telas
- [x] Dashboard "Maiores Categorias" conectado a dados reais via `getTopCategories` na store
- [x] Integração backend testada end-to-end (ver seção 14)
- [x] Categorias do sistema confirmadas no backend (23 categorias seed)
- [x] Conta criada via API, transação criada via API, sync pull/push funcionando
- [x] Fluxo Telegram → OpenClaw → Backend testado e confirmado (ver seção 14.9)
- [ ] EAS Build do APK
- [ ] Sync mobile ↔ VPS testado end-to-end no app
- [ ] Dados reais de uso diário cadastrados (salário, despesas fixas, dívidas reais)

---

## 14. Teste de Integração End-to-End (2026-04-14)

Testado localmente contra `http://89.117.32.220:8000` usando `curl`. Todos os comandos usam `--data-raw` para evitar problema de escape de aspas duplas no bash do Windows — `$()` com aspas aninhadas retorna 400 mesmo com body correto.

### 14.1 Health check

```bash
GET /health → 200 {"status":"ok"}
```

### 14.2 Categorias seed

```bash
GET /categories/ → 200 — 23 categorias do sistema criadas automaticamente no startup
```
Categorias confirmadas: Moradia, Alimentação, Transporte, Saúde, Lazer, Supermercado, Gasolina, Educação, Serviços, Assinaturas, Vestuário, Seguros, Impostos, Pets, Outros (despesa) + Salário, Freelance, Investimentos, Aluguel Rec., Transferência, Presente, Outros Rec. (receita/transferência).

### 14.3 Contas

```bash
POST /accounts/  body: {name, bank, type, initial_balance_cents, color} → 201
# "balance_cents" no output é calculado (saldo inicial − despesas lançadas), não é campo de entrada
# Campo "id" é gerado pelo servidor (UUID)
```

### 14.4 Transações

```bash
POST /transactions/  body: {account_id, amount_cents, type, description, date, source} → 201
# "source" aceita: "app", "telegram", "import"
# "category_id" é opcional — aceita null
# Saldo da conta é atualizado automaticamente após o lançamento
```

**Observação importante:** O `/sync/pull` revelou que já existia uma transação criada via Telegram (`source: "telegram"`) em 2026-04-14 às 12:27 — confirma que o OpenClaw → backend já estava funcionando antes deste teste.

### 14.5 Dashboard

```bash
GET /dashboard/summary?year=2026&month=4 → 200
# Requer query params year e month — sem eles retorna 422
# Retorna: income_cents, expense_cents, surplus_cents, top_categories, debts, goals
# Nota: expense_cents e surplus_cents retornam como string no JSON (não int) — possível bug menor no serializer
```

### 14.6 Sync

```bash
GET  /sync/pull?since=2000-01-01T00:00:00Z → 200  # parâmetro é "since", não "last_sync_at"
POST /sync/push  body: {transactions:[], accounts:[], debts:[], goals:[], bills:[], budgets:[]} → 200 {"accepted":0,"conflicts":0}
```

### 14.7 Metas e Dívidas

```bash
POST /goals/  body: {name, target_cents, current_cents, target_date, frequency} → 201
POST /debts/  body: {name, type, principal_cents, current_balance_cents, interest_rate_monthly, start_date, monthly_payment_cents, status} → 201
POST /debts/plan?monthly_budget_cents=50000&strategy=avalanche → 200  # parâmetros via query string
GET  /debts/{id}/simulate?monthly_payment_cents=60000&extra_payment_cents=10000 → 200
```

### 14.8 Problemas encontrados durante o teste

| Problema | Causa | Solução |
|---|---|---|
| `POST /accounts/` → 422 | Campo `bank` obrigatório, não estava na documentação anterior | Adicionar `bank` ao body |
| `POST /transactions/` → 400 "error parsing body" | Escape de aspas duplas no bash via `$()` | Usar `--data-raw` no curl |
| `GET /dashboard/summary` sem params → 422 | `year` e `month` são query params obrigatórios | Sempre passar `?year=YYYY&month=M` |
| `POST /sync/pull` → 405 | Rota é GET, não POST | Usar `GET /sync/pull?since=...` |
| `POST /debts/plan` → 422 | `monthly_budget_cents` é query param, não body | Passar via query string |
| `GET /debts/{id}/simulate` → 422 | `monthly_payment_cents` obrigatório | Sempre passar junto com `extra_payment_cents` |
| `expense_cents` como string no dashboard | Possível bug no serializer do FastAPI (campo `BIGINT` retornando str) | Tratar no mobile com `Number(expense_cents)` |

### 14.9 Teste Telegram → OpenClaw → Backend (confirmado ✅)

**Mensagem enviada ao @FiireKeeperBot:**
```
gastei 50 reais no mercado hoje
```

**Comportamento do bot (persona "Fire Keeper"):**
1. Identificou a intenção: despesa de R$50,00 no mercado
2. Consultou `GET /accounts/` — encontrou conta "Nubank" ativa
3. Mapeou categoria para "Supermercado" (`id: 047fb521-02ac-48b8-87bb-893aa8c1ca51`)
4. Disparou `POST /transactions/` com os dados corretos
5. Confirmou o novo saldo

**Resultado no banco:**
```json
{
  "account_id": "1f787a0a-84ac-48a7-8f4e-5d12b769934e",
  "category_id": "047fb521-02ac-48b8-87bb-893aa8c1ca51",
  "amount_cents": 5000,
  "type": "expense",
  "description": "Mercado",
  "date": "2026-04-14",
  "source": "telegram"
}
```

Saldo da conta Nubank atualizado automaticamente: R$1.500,00 → R$1.415,00.

**Conclusão:** O fluxo completo `Você → Telegram → OpenClaw → POST /transactions/ → PostgreSQL` está 100% funcional. O bot interpreta linguagem natural em português, resolve conta e categoria automaticamente, e persiste no banco sem intervenção manual.
