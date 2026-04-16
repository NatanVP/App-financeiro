import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DebtCard } from '@/components/ui/DebtCard';
import { useAccountStore } from '@/store/accountStore';
import { useDebtStore } from '@/store/debtStore';
import { useTransactionStore } from '@/store/transactionStore';

const HIGH_INTEREST_THRESHOLD = 0.03;

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const { getActiveDebts, getTotalBalance, deleteDebt } = useDebtStore();
  const { getActiveAccounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  const debts = getActiveDebts();
  const totalBalance = getTotalBalance();
  const accounts = getActiveAccounts();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const totalPaid = debts.reduce(
    (sum, debt) => sum + Math.max(0, debt.principal_cents - debt.current_balance_cents),
    0,
  );
  const totalPrincipal = debts.reduce((sum, debt) => sum + debt.principal_cents, 0);
  const totalProgress = totalPrincipal > 0 ? totalPaid / totalPrincipal : 0;
  const highInterestCount = debts.filter(
    (debt) => debt.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD,
  ).length;
  const debtsWithBank = debts.filter((debt) => debt.bank_id).length;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="anvil" size={20} color={Colors.tertiary} />
          <Text style={styles.title}>DIVIDAS</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/debts/new')}>
          <MaterialCommunityIcons name="plus" size={20} color={Colors.onPrimary} />
          <Text style={styles.addBtnText}>NOVA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeading}>PASSIVO TOTAL</Text>
        <Text style={styles.summaryBigAmount}>{formatBRL(totalBalance)}</Text>

        <ProgressBar progress={totalProgress} color={Colors.tertiary} height={5} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>QUITADO</Text>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>
              {formatBRL(money(totalPaid))}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>EM ABERTO</Text>
            <Text style={[styles.statValue, { color: Colors.tertiary }]}>
              {formatBRL(totalBalance)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>JUROS ALTOS</Text>
            <Text
              style={[
                styles.statValue,
                { color: highInterestCount > 0 ? Colors.tertiary : Colors.primary },
              ]}
            >
              {highInterestCount}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="file-document-outline" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>
            {debts.length} CONTRATO{debts.length !== 1 ? 'S' : ''} ATIVO{debts.length !== 1 ? 'S' : ''}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeAlt]}>
          <MaterialCommunityIcons name="bank-outline" size={14} color={Colors.tertiary} />
          <Text style={[styles.badgeText, styles.badgeAltText]}>{debtsWithBank} COM BANCO</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>CONTRATOS DO FERREIRO</Text>
        <Text style={styles.listCount}>{debts.length} itens ativos</Text>
      </View>

      <View style={styles.debtsList}>
        {debts.map((debt) => {
          const bank = debt.bank_id
            ? accounts.find((account) => account.id === debt.bank_id)
            : null;
          const monthlyPaid = transactions.some(
            (transaction) =>
              !transaction.deleted_at &&
              transaction.category_id === 'debt_payment' &&
              transaction.notes === debt.id &&
              transaction.date.startsWith(currentMonthKey),
          );

          return (
            <DebtCard
              key={debt.id}
              id={debt.id}
              name={debt.name}
              bankId={debt.bank_id ?? null}
              bankName={bank?.name ?? null}
              currentBalanceCents={debt.current_balance_cents}
              principalCents={debt.principal_cents}
              monthlyPaymentCents={debt.monthly_payment_cents}
              interestRateMonthly={debt.interest_rate_monthly}
              monthlyPaid={monthlyPaid}
              dueDate={
                debt.due_date
                  ? new Date(debt.due_date).toLocaleDateString('pt-BR', {
                      month: '2-digit',
                      year: '2-digit',
                    })
                  : undefined
              }
              isHighInterest={debt.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD}
              onPress={() => router.push(`/debts/${debt.id}`)}
              onRegisterPayment={() => router.push(`/debts/${debt.id}/payment`)}
              onDelete={() =>
                Alert.alert(
                  'Apagar divida?',
                  `"${debt.name}" sera removida da sua lista de contratos.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Apagar',
                      style: 'destructive',
                      onPress: () => deleteDebt(debt.id),
                    },
                  ],
                )
              }
            />
          );
        })}

        {debts.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="anvil-off" size={32} color={Colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>NENHUMA DIVIDA ATIVA</Text>
            <Text style={styles.emptyHint}>
              Toque em NOVA para registrar um contrato ou emprestimo
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 2,
    color: Colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  addBtnText: {
    fontFamily: 'VT323',
    fontSize: 14,
    letterSpacing: 1.5,
    color: Colors.onPrimary,
  },

  summaryCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  summaryHeading: {
    fontFamily: 'VT323',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  summaryBigAmount: {
    fontFamily: 'VT323',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    color: Colors.tertiary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  summaryCol: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, backgroundColor: `${Colors.outlineVariant}40` },
  statLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  statValue: {
    fontFamily: 'VT323',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: Colors.onSurface,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAlt: {
    backgroundColor: `${Colors.tertiary}15`,
  },
  badgeText: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 1,
    color: Colors.primary,
  },
  badgeAltText: {
    color: Colors.tertiary,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  listCount: {
    fontFamily: 'VT323',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  debtsList: { gap: Spacing.sm },
  emptyBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  emptyHint: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: `${Colors.onSurfaceVariant}80`,
    textAlign: 'center',
  },
});
