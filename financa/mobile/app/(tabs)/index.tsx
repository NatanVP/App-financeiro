/**
 * Dashboard — A Guilda (Taverna)
 * Shows: hero card (bolsa de ouro), cashflow chart, cofres, fatura, fluxo de magia, ordens de compra, dívidas.
 */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { formatBRL, money } from '@/lib/money';
import { getReceivedPayments } from '@/lib/businessDays';
import { useTransactionStore } from '@/store/transactionStore';
import { useDebtStore } from '@/store/debtStore';
import { useSalaryStore } from '@/store/salaryStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BarChart } from '@/components/charts/BarChart';
import { ScrollCard } from '@/components/ui/ScrollCard';
import { BankIcon } from '@/components/ui/BankIcon';
import { CreditInvoiceWidget } from '@/components/ui/CreditInvoiceWidget';
import { useCreditStore } from '@/store/creditStore';
import { useAccountStore } from '@/store/accountStore';

// ── Tavern palette ──────────────────────────────────────────
const T = {
  bg:        '#130804',   // dark charred wood
  plank:     '#1E0E07',   // wood plank
  plankMid:  '#2C1810',   // mid plank
  border:    '#5C3218',   // carved wood edge
  borderGold:'#6B4A1A',   // gold-stained wood
  amber:     '#D4860A',   // torch amber
  gold:      '#E8B84B',   // coin gold
  orange:    '#C45E0A',   // burnt orange
  cream:     '#F0DEB0',   // aged parchment
  creamDim:  '#9A7850',   // dimmed parchment
  green:     '#5AAA3A',   // receipt green
  red:       '#CC3322',   // blood red
  separator: '#3A1E0C',   // wood grain line
};

const MONTH_NAMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const ACCOUNT_ORDER = ['nubank', 'itau', 'inter'] as const;
const ACCOUNT_LABELS: Record<string, string> = {
  nubank: 'Nubank',
  itau: 'Itaú',
  inter: 'Inter',
};


export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { transactions, getMonthlyTotals, getTopCategories } = useTransactionStore();
  const { closingDay, dueDay, enabled: creditEnabled } = useCreditStore();
  const { getActiveDebts, getTotalBalance } = useDebtStore();
  const { payment5thCents, payment20thCents, paymentLastCents, salaryAccountId, totalMonthlyCents } = useSalaryStore();
  const { getActiveAccounts } = useAccountStore();

  const { expenseCents } = getMonthlyTotals(year, month);

  const { received5th, received20th, receivedLast } = getReceivedPayments(year, month, today);
  const receivedSoFarCents =
    (received5th ? payment5thCents : 0) +
    (received20th ? payment20thCents : 0) +
    (receivedLast ? paymentLastCents : 0);
  const pendingCents = totalMonthlyCents() - receivedSoFarCents;

  const projectionCents = totalMonthlyCents() - expenseCents;
  const currentBalanceCents = receivedSoFarCents - expenseCents;
  const activeDebts = getActiveDebts();
  const totalDebtBalance = getTotalBalance();
  const activeAccounts = getActiveAccounts();
  const realmAccounts = ACCOUNT_ORDER
    .map((accountId) => activeAccounts.find((account) => account.id === accountId))
    .filter((account): account is NonNullable<typeof account> => Boolean(account))
    .map((account) => {
      let runningBalance = account.balance_cents;

      if (account.id === salaryAccountId) {
        runningBalance += receivedSoFarCents;
      }

      for (const tx of transactions) {
        if (tx.deleted_at || tx.type === 'credit') continue;

        if (tx.type === 'transfer') {
          if (tx.account_id === account.id) runningBalance -= tx.amount_cents;
          if (tx.transfer_to_account_id === account.id) runningBalance += tx.amount_cents;
          continue;
        }

        if (tx.account_id !== account.id) continue;
        if (tx.type === 'income') runningBalance += tx.amount_cents;
        if (tx.type === 'expense') runningBalance -= tx.amount_cents;
      }

      return {
        ...account,
        displayName: ACCOUNT_LABELS[account.id] ?? account.name,
        currentBalanceCents: money(runningBalance),
      };
    });

  const cashflowBars = MONTH_NAMES.map((label, i) => {
    const { incomeCents: inc, expenseCents: exp } = getMonthlyTotals(year, i + 1);
    return {
      label,
      value: inc - exp,
      isHighlighted: i === month - 1,
    };
  });

  const topCategories = getTopCategories(year, month);
  const maxCatAmount = Math.max(...topCategories.map((c) => c.amountCents), 1);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await performSync();
    } catch {
      // erro tratado no syncStore
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={T.amber}
        />
      }
    >
      {/* ── Placa da Taverna ─────────────────────────────── */}
      <View style={styles.tavernSign}>
        {/* Correntes da placa */}
        <View style={styles.signChain}>
          <View style={styles.chainLink} />
          <View style={styles.chainLink} />
          <View style={styles.chainLink} />
        </View>

        <View style={styles.signPlank}>
          {/* Entalhe superior */}
          <View style={styles.plankEdgeTop} />

          <View style={styles.signInner}>
            <Text style={styles.torchLeft}>🔥</Text>
            <View style={styles.signTextBlock}>
              <Text style={styles.signKicker}>
                {MONTH_NAMES[month - 1]}  {year}
              </Text>
              <Text style={styles.signTitle}>A  GUILDA</Text>
            </View>
            <Text style={styles.torchRight}>🔥</Text>
          </View>

          {/* Entalhe inferior */}
          <View style={styles.plankEdgeBottom} />
        </View>

        <View style={styles.signChain}>
          <View style={styles.chainLink} />
          <View style={styles.chainLink} />
          <View style={styles.chainLink} />
        </View>

        {/* Botão grimório */}
        <TouchableOpacity style={styles.grimoireBtn} onPress={() => router.push('/more')}>
          <Text style={styles.grimoireBtnText}>📖</Text>
        </TouchableOpacity>
      </View>

      {/* ── Separador madeira ────────────────────────────── */}
      <View style={styles.woodSep}>
        <View style={styles.woodSepLine} />
        <Text style={styles.woodSepGlyph}>✦</Text>
        <View style={styles.woodSepLine} />
      </View>

      {/* ── Hero Card — Bolsa de Ouro ─────────────────────── */}
      <ScrollCard icon="coin_bag" title="BOLSA DE OURO" hero>
        <Text style={[styles.heroAmount, { color: projectionCents >= 0 ? T.gold : T.red }]}>
          {formatBRL(money(projectionCents))}
        </Text>
        <View style={styles.currentBalanceRow}>
          <Text style={styles.currentBalanceLabel}>NA CONTA</Text>
          <Text style={[styles.currentBalanceValue, { color: currentBalanceCents >= 0 ? T.green : T.red }]}>
            {formatBRL(money(currentBalanceCents))}
          </Text>
        </View>
        <View style={styles.heroStats}>
          <View>
            <Text style={styles.heroStatLabel}>Recebido</Text>
            <Text style={[styles.heroStatValue, { color: T.green }]}>
              +{formatBRL(money(receivedSoFarCents))}
            </Text>
          </View>
          <View>
            <Text style={styles.heroStatLabel}>A Receber</Text>
            <Text style={[styles.heroStatValue, { color: T.amber }]}>
              +{formatBRL(money(pendingCents))}
            </Text>
          </View>
          <View>
            <Text style={styles.heroStatLabel}>Gastos</Text>
            <Text style={[styles.heroStatValue, { color: T.red }]}>
              {formatBRL(expenseCents)}
            </Text>
          </View>
        </View>
      </ScrollCard>

      {/* ── Cofres do Reino ──────────────────────────────── */}
      <ScrollCard icon="gem" title="COFRES DO REINO">
        {realmAccounts.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhum cofre ativo encontrado.</Text>
        ) : (
          <View style={styles.accountsList}>
            {realmAccounts.map((account, index) => (
              <React.Fragment key={account.id}>
                <View style={styles.accountRow}>
                  <View style={styles.accountRowLeft}>
                    <BankIcon bank={account.id} size={28} />
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.displayName}</Text>
                      <Text style={styles.accountMeta}>Saldo disponível</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.accountBalance,
                      {
                        color:
                          account.currentBalanceCents >= 0 ? T.green : T.red,
                      },
                    ]}
                  >
                    {formatBRL(account.currentBalanceCents)}
                  </Text>
                </View>
                {index < realmAccounts.length - 1 && <View style={styles.tavernSep} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollCard>

      {creditEnabled && (
        <CreditInvoiceWidget
          closingDay={closingDay}
          dueDay={dueDay}
          onPress={() => router.push('/(tabs)/transactions')}
        />
      )}

      {/* ── Fluxo de Magia ───────────────────────────────── */}
      <ScrollCard icon="potion_blue" title="FLUXO DE MAGIA">
        <BarChart data={cashflowBars} height={120} />
      </ScrollCard>

      {/* ── Ordens de Compra ─────────────────────────────── */}
      <ScrollCard icon="chest" title="ORDENS DE COMPRA">
        {topCategories.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma ordem registrada este mês.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {topCategories.map((cat) => (
              <View key={cat.name} style={{ gap: 4 }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catAmount}>{formatBRL(cat.amountCents)}</Text>
                </View>
                <ProgressBar progress={cat.amountCents / maxCatAmount} height={4} color={T.amber} />
              </View>
            ))}
          </View>
        )}
      </ScrollCard>

      {/* ── Dívidas ao Ferreiro ──────────────────────────── */}
      <TouchableOpacity onPress={() => router.push('/debts')}>
        <ScrollCard icon="trident" title="DÍVIDAS AO FERREIRO">
          <View style={styles.debtRow}>
            <Text style={styles.debtLabel}>Títulos de guerra</Text>
            <Text style={styles.debtValue}>{activeDebts.length} contratos</Text>
          </View>
          <View style={styles.tavernSep} />
          <View style={styles.debtRow}>
            <Text style={styles.debtLabel}>Saldo total</Text>
            <Text style={[styles.debtValue, { color: T.red }]}>
              {formatBRL(totalDebtBalance)}
            </Text>
          </View>
          <Text style={styles.tapHint}>Toque para quitar débitos →</Text>
        </ScrollCard>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content:   { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  // ── Placa da Taverna ───────────────────────────────────
  tavernSign: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    position: 'relative',
  },
  signChain: {
    flexDirection: 'row',
    gap: 3,
    alignSelf: 'center',
  },
  chainLink: {
    width: 6,
    height: 4,
    borderWidth: 1,
    borderColor: T.borderGold,
    backgroundColor: T.plankMid,
  },
  signPlank: {
    backgroundColor: T.plankMid,
    borderWidth: 2,
    borderColor: T.border,
    width: '100%',
    overflow: 'hidden',
  },
  plankEdgeTop: {
    height: 4,
    backgroundColor: T.border,
    borderBottomWidth: 1,
    borderBottomColor: T.borderGold,
  },
  plankEdgeBottom: {
    height: 4,
    backgroundColor: T.border,
    borderTopWidth: 1,
    borderTopColor: T.borderGold,
  },
  signInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  torchLeft:  { fontSize: 22 },
  torchRight: { fontSize: 22 },
  signTextBlock: { alignItems: 'center', flex: 1 },
  signKicker: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 3,
    color: T.creamDim,
    textTransform: 'uppercase',
  },
  signTitle: {
    fontFamily: 'VT323',
    fontSize: 34,
    letterSpacing: 6,
    color: T.gold,
    textTransform: 'uppercase',
  },
  grimoireBtn: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: T.plankMid,
    borderWidth: 1,
    borderColor: T.border,
  },
  grimoireBtnText: { fontSize: 16 },

  // ── Separador madeira ──────────────────────────────────
  woodSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: -2,
  },
  woodSepLine: { flex: 1, height: 1, backgroundColor: T.separator },
  woodSepGlyph: {
    fontFamily: 'VT323',
    fontSize: 12,
    color: T.amber,
  },

  // ── Hero ───────────────────────────────────────────────
  heroAmount: {
    fontFamily: 'VT323',
    fontSize: 44,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  currentBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
  },
  currentBalanceLabel: {
    fontFamily: 'VT323',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: T.creamDim,
  },
  currentBalanceValue: {
    fontFamily: 'VT323',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: T.separator,
  },
  heroStatLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: T.creamDim,
  },
  heroStatValue: {
    fontFamily: 'VT323',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: T.cream,
    marginTop: 2,
  },

  // ── Separador de taverna ───────────────────────────────
  tavernSep: {
    height: 1,
    backgroundColor: T.separator,
    marginVertical: 2,
  },

  // ── Empty hint ─────────────────────────────────────────
  emptyHint: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: T.creamDim,
    marginTop: 4,
  },

  // ── Contas ─────────────────────────────────────────────
  accountsList: { gap: 0 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    paddingRight: Spacing.md,
  },
  accountInfo: { gap: 2 },
  accountName: {
    fontFamily: 'VT323',
    fontSize: 16,
    color: T.cream,
  },
  accountMeta: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: T.creamDim,
  },
  accountBalance: {
    fontFamily: 'VT323',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },

  // ── Categorias ─────────────────────────────────────────
  catRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  catName:  { fontFamily: 'VT323', fontSize: 14, color: T.cream },
  catAmount: { fontFamily: 'VT323', fontSize: 14, fontVariant: ['tabular-nums'], color: T.cream },

  // ── Dívidas ────────────────────────────────────────────
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  debtLabel: { fontFamily: 'VT323', fontSize: 13, color: T.creamDim },
  debtValue: { fontFamily: 'VT323', fontSize: 16, fontVariant: ['tabular-nums'], color: T.cream },
  tapHint:  { fontFamily: 'VT323', fontSize: 11, color: T.amber, textAlign: 'right', marginTop: 4 },
});
