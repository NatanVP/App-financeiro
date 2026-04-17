# Implementação Atual — Guild Ledger

> Documento de referência sobre o estado real do código. Leia junto com `projeto-app-financeiro.md` (arquitetura/schema) e `memory/project_status.md` (progresso e pendências).

---

## Identidade Visual — Tema RPG Medieval

O app se chama **Guild Ledger**. Todo o vocabulário e visual seguem uma estética de RPG medieval pixel art:

| Conceito financeiro | Nome no app |
|---|---|
| Dashboard | Bolsa de Ouro |
| Gráfico de fluxo de caixa | Fluxo de Magia |
| Categorias de gasto | Ordens de Compra |
| Dívidas | Dívidas ao Ferreiro |
| Metas | Missões |
| Transações | Crônicas |
| Configurações | Grimório |

- Fonte principal: **VT323** (pixel art monospace)
- Ícones: **Kenney Tiny Dungeon** (CC0, PNG pixel art) + `@expo/vector-icons` (MaterialCommunityIcons)
- Moeda exibida como **G$** nos formulários
- Datas no seletor customizado com estilo medieval (DatePickerModal)

---

## Estrutura de Telas

### Tabs principais (`app/(tabs)/`)
| Arquivo | Nome da tela | Função |
|---|---|---|
| `index.tsx` | Bolsa de Ouro (Dashboard) | Saldo, projeção, fluxo de magia, categorias, fatura do cartão, dívidas |
| `transactions.tsx` | Crônicas | Histórico de transações com busca por texto |
| `goals.tsx` | Missões | Metas com progresso, suporte a parcelamento |
| `more.tsx` | Grimório | Configurações, salário, acesso a todas as outras telas |

### Telas de formulário
| Arquivo | Função |
|---|---|
| `new-transaction.tsx` | Criar transação (valor, tipo, categoria, conta, data, descrição) |
| `new-goal.tsx` | Criar meta/missão |
| `budgets/new.tsx` | Criar orçamento por categoria |
| `bills/new.tsx` | Criar conta a pagar |
| `categories.tsx` | Listar e gerenciar categorias |

### Telas de detalhe/gestão
| Arquivo | Função |
|---|---|
| `transactions/[id].tsx` | Detalhe de transação com delete |
| `settings/backup.tsx` | Central de backup e exportação |
| `settings/sync.tsx` | Status de sincronização e sync manual |
| `settings/alerts.tsx` | Ideias e futuro painel de alertas |
| `settings/security.tsx` | Privacidade e proteções do app |
| `debts/index.tsx` | Lista de dívidas |
| `debts/[id]/index.tsx` | Detalhe de dívida |
| `debts/[id]/simulator.tsx` | Simulador de quitação |
| `debts/plan.tsx` | Plano de quitação (avalanche/bola de neve/híbrido) |
| `bills/index.tsx` | Contas a pagar |
| `budgets/index.tsx` | Orçamentos por categoria |
| `emergency-reserve.tsx` | Reserva de emergência |
| `provisions.tsx` | Provisões anuais (IPVA, IPTU, etc.) |
| `recurrences.tsx` | Transações recorrentes |

---

## Stores (Zustand) — `store/`

Toda a persistência é **em memória** (dados somem ao fechar o app). Migração para `expo-sqlite` é a próxima prioridade.

| Store | Responsabilidade |
|---|---|
| `transactionStore.ts` | Transações, totais mensais, top categorias |
| `categoryStore.ts` | Categorias (23 pré-cadastradas no seed) |
| `accountStore.ts` | Contas (Nubank, Itaú, Inter pré-cadastradas) |
| `goalStore.ts` | Metas/missões com progresso |
| `debtStore.ts` | Dívidas, saldo total, pagamentos |
| `budgetStore.ts` | Orçamentos mensais por categoria |
| `billStore.ts` | Contas a pagar com status |
| `salaryStore.ts` | Salário configurável (pagamentos no dia 5, 20 e último) |
| `creditStore.ts` | Cartão de crédito (dia fechamento, dia vencimento, habilitado) |
| `allocationStore.ts` | Envelopes: % da sobra para reserva/metas/dívidas extras |
| `annualProvisionStore.ts` | Provisões anuais |
| `emergencyReserveStore.ts` | Reserva de emergência |
| `recurrenceStore.ts` | Transações recorrentes |
| `syncStore.ts` | Estado de sync com a VPS |
| `index.ts` | Re-exporta todos os stores |

---

## Componentes — `components/`

### UI (`components/ui/`)
| Componente | Função |
|---|---|
| `RPGIcon.tsx` | Exibe ícones pixel art Kenney por nome de string (ex: `"coin_bag"`, `"potion_blue"`, `"chest"`) |
| `ScrollCard.tsx` | Card com borda pixel art, título RPG e ícone — container padrão do dashboard |
| `TransactionRow.tsx` | Linha de transação na lista (ícone de categoria + valor + data) |
| `CreditInvoiceWidget.tsx` | Widget de fatura do cartão de crédito no dashboard |
| `DatePickerModal.tsx` | Seletor de data customizado com estilo medieval |
| `BankIcon.tsx` | Exibe logo PNG real do banco (Nubank/Itaú/Inter) |
| `DebtCard.tsx` | Card de dívida com saldo e previsão de quitação |
| `GoalCard.tsx` | Card de meta com barra de progresso |
| `BillRow.tsx` | Linha de conta a pagar com status de vencimento |
| `BudgetRow.tsx` | Linha de orçamento com % usado |
| `ProgressBar.tsx` | Barra de progresso genérica |
| `CircularProgress.tsx` | Progresso circular |
| `MoneyDisplay.tsx` | Exibe valores monetários formatados |
| `FinancialChip.tsx` | Chip de categoria/filtro |
| `NumPad.tsx` | Teclado numérico customizado para entrada de valores |
| `PixelBorder.tsx` | Borda decorativa pixel art |

### Charts (`components/charts/`)
| Componente | Função |
|---|---|
| `BarChart.tsx` | Gráfico de barras — usado no Fluxo de Magia com dados reais por mês |

---

## Dashboard — Ordem dos Cards

1. **Header** — Logo "Guild Ledger" + mês/ano + botão configurações
2. **Bolsa de Ouro** (hero) — projeção do mês, saldo atual na conta, recebido/a receber/gastos
3. **Fatura do Cartão** (CreditInvoiceWidget) — visível apenas quando `creditEnabled = true`
4. **Fluxo de Magia** (BarChart) — saldo mensal dos 12 meses do ano
5. **Ordens de Compra** — top categorias de gasto com barra de progresso
6. **Dívidas ao Ferreiro** — resumo de contratos e saldo total

---

## Lógica de Salário

Store `salaryStore`: o salário é dividido em 3 parcelas configuráveis:
- Dia 5 do mês
- Dia 20 do mês
- Último dia útil do mês

A tela do dashboard calcula em tempo real:
- **Recebido até hoje** (soma das parcelas cujo dia já passou)
- **A receber** (parcelas futuras do mês)
- **Projeção** = total do mês − gastos
- **Saldo atual** = recebido − gastos

---

## Convenções de Código

- Valores monetários sempre em **centavos (INTEGER)** nas stores — formatados com `formatBRL(money(cents))` de `lib/money.ts`
- IDs: UUID v4 gerados no cliente
- Datas: ISO 8601
- TypeScript em tudo
- Navegação: Expo Router file-based — rotas dinâmicas com `[id]`
- Tema de cores em `constants/theme.ts` (Colors, Spacing)
- Fonte VT323 carregada globalmente em `_layout.tsx`

---

## Assets de Ícones

Ícones pixel art em `assets/icons/`:
`armor`, `axe`, `book`, `bow`, `coin_bag`, `crown`, `dagger`, `dice`, `feather`, `gem`, `hammer`, `heart`, `helm`, `mage`, `map`, `orb`, `priestess`, `shield`, `staff`, `sword`... (Kenney Tiny Dungeon CC0)

Personagens pixel art em `assets/icons/char_0000.png` a `char_0015.png`.

App icon customizado em `assets/app-icon/`.

---

## Como iniciar o app

```bash
cd financa/mobile
npx expo start          # QR code para Expo Go
npx expo run:android    # build e instala no Android (emulador ou cabo)
npx expo start --tunnel # se o celular não está na mesma rede
```

---

## Infraestrutura VPS

- IP: `89.117.32.220`, porta `8000`
- FastAPI + PostgreSQL 16 + Redis + Nginx + Docker Compose
- Bot Telegram: `@FiireKeeperBot`
- Sync: pendente de teste dentro do app (testado só via curl)
- **Atenção:** rotacionar o API token exposto no git history (commit e773f58)

---

## Próximos passos do Grimório

- Atalhos atuais: `Backup`, `Sincronização`, `Alertas` e `Segurança`
- Alertas planejados: fatura fechando, fatura vencendo, contas a pagar, saldo baixo por banco e salário esperado
- Segurança planejada: ocultar valores, confirmação de exclusões, PIN do app
- TODO: adicionar desbloqueio com biometria ao abrir o app
