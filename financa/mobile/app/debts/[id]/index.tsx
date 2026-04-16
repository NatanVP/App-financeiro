import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { computeMonthsToPayoff, computePMT } from '@/lib/finance';
import { useDebtStore } from '@/store/debtStore';
import { useAccountStore } from '@/store/accountStore';
import { useTransactionStore } from '@/store/transactionStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BankIcon } from '@/components/ui/BankIcon';

const HIGH_INTEREST_THRESHOLD = 0.03;

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebtStore((state) => state.debts.find((entry) => entry.id === id));
  const { getActiveAccounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  const analysis = useMemo(() => {
    if (!debt) return null;

    const balance = debt.current_balance_cents;
    const rate = debt.interest_rate_monthly;
    const monthlyPayment = debt.monthly_payment_cents;
    const monthlyInterest = Math.ceil(balance * rate);
    const minPayment = money(monthlyInterest + 1);
    const current = computeMonthsToPayoff(balance, rate, monthlyPayment);
    const optimalPayment = computePMT(balance, rate, 12);
    const optimal = computeMonthsToPayoff(balance, rate, optimalPayment);
    const paidOff = Math.max(0, debt.principal_cents - balance);
    const progress = debt.principal_cents > 0 ? paidOff / debt.principal_cents : 0;

    return {
      current,
      optimal,
      optimalPayment,
      monthlyInterest,
      minPayment,
      paidOff,
      progress,
    };
  }, [debt]);

  if (!debt || !analysis) {
    return (
      <View style={styles.root}>
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundTitle}>DIVIDA NAO ENCONTRADA</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>VOLTAR</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const accounts = getActiveAccounts();
  const bank = debt.bank_id ? accounts.find((account) => account.id === debt.bank_id) : null;
  const isHighInterest = debt.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD;
  const ratePct = (debt.interest_rate_monthly * 100).toFixed(2);
  const progressPct = Math.round(Math.max(0, Math.min(analysis.progress, 1)) * 100);
  const estimatedSavings = analysis.current.isInfeasible
    ? money(0)
    : money(
        Math.max(0, analysis.current.totalInterestCents - analysis.optimal.totalInterestCents),
      );
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthPayment = transactions
    .filter(
      (transaction) =>
        !transaction.deleted_at &&
        transaction.category_id === 'debt_payment' &&
        transaction.notes === debt.id &&
        transaction.date.startsWith(currentMonthKey),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const monthlyPaid = !!currentMonthPayment;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>CONTRATO</Text>
        <Pressable style={styles.headerBtn} onPress={() => router.push(`/debts/${id}/simulator`)}>
          <Text style={styles.headerBtnText}>SIMULAR</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.sectionKicker}>REGISTRO DE DIVIDA</Text>
            {isHighInterest && (
              <View style={styles.alertChip}>
                <Text style={styles.alertChipText}>JURO ALTO</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{debt.name.toUpperCase()}</Text>
          <Text style={styles.heroBalance}>{formatBRL(debt.current_balance_cents)}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.bankChip, !bank && styles.bankChipEmpty]}>
              {bank ? (
                <BankIcon bank={bank.id} size={18} />
              ) : (
                <MaterialCommunityIcons
                  name="bank-outline"
                  size={15}
                  color={Colors.onSurfaceVariant}
                />
              )}
              <Text style={[styles.bankChipText, !bank && styles.bankChipTextEmpty]}>
                {bank?.name ?? 'Sem banco'}
              </Text>
            </View>

            <Text style={[styles.rateChip, isHighInterest && styles.rateChipDanger]}>
              {ratePct}% a.m.
            </Text>

            <Text style={styles.metaInfo}>
              {debt.due_date
                ? `META ${new Date(debt.due_date).toLocaleDateString('pt-BR', {
                    month: '2-digit',
                    year: '2-digit',
                  })}`
                : 'SEM PRAZO'}
            </Text>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>QUITACAO</Text>
              <Text style={styles.progressLabel}>{progressPct}%</Text>
            </View>
            <ProgressBar
              progress={analysis.progress}
              color={isHighInterest ? Colors.tertiary : Colors.primary}
              height={6}
            />
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ORIGINAL</Text>
            <Text style={styles.metricValue}>{formatBRL(debt.principal_cents)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>QUITADO</Text>
            <Text style={[styles.metricValue, { color: Colors.secondary }]}>
              {formatBRL(money(analysis.paidOff))}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PAGAMENTO/MES</Text>
            <Text style={styles.metricValue}>
              {debt.monthly_payment_cents > 0 ? formatBRL(debt.monthly_payment_cents) : '--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>JUROS/MES</Text>
            <Text style={[styles.metricValue, isHighInterest && { color: Colors.tertiary }]}>
              {formatBRL(money(analysis.monthlyInterest))}
            </Text>
          </View>
        </View>

        {analysis.current.isInfeasible ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>PAGAMENTO INVIAVEL</Text>
            <Text style={styles.warningText}>
              O valor mensal atual nao cobre os juros da divida. Ajuste o pagamento ou renegocie
              o contrato para voltar a reduzir o saldo.
            </Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>TRAJETORIA ATUAL</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prazo restante</Text>
              <Text style={styles.infoValue}>{analysis.current.months} meses</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total a pagar</Text>
              <Text style={[styles.infoValue, { color: Colors.tertiary }]}>
                {formatBRL(analysis.current.totalPaidCents)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total em juros</Text>
              <Text style={[styles.infoValue, { color: Colors.tertiary }]}>
                {formatBRL(analysis.current.totalInterestCents)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>CENARIO OTIMIZADO</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pagamento para 12 meses</Text>
            <Text style={[styles.infoValue, { color: Colors.primary }]}>
              {formatBRL(analysis.optimalPayment)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Minimo para nao crescer</Text>
            <Text style={styles.infoValue}>{formatBRL(analysis.minPayment)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Economia estimada</Text>
            <Text style={[styles.infoValue, { color: Colors.secondary }]}>
              {formatBRL(estimatedSavings)}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>PAGAMENTO DO MES</Text>
          <Text style={[styles.monthStatus, monthlyPaid && styles.monthStatusDone]}>
            {monthlyPaid ? 'JA REGISTRADO' : 'AINDA EM ABERTO'}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Parcela sugerida</Text>
            <Text style={styles.infoValue}>
              {debt.monthly_payment_cents > 0 ? formatBRL(debt.monthly_payment_cents) : '--'}
            </Text>
          </View>
          {currentMonthPayment && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor abatido neste mes</Text>
              <Text style={[styles.infoValue, { color: Colors.secondary }]}>
                {formatBRL(currentMonthPayment.amount_cents)}
              </Text>
            </View>
          )}
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => router.push(`/debts/${id}/payment`)}>
          <Text style={styles.primaryBtnText}>
            {monthlyPaid ? 'REGISTRAR OUTRO PAGAMENTO' : 'REGISTRAR PAGAMENTO'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryActionBtn}
          onPress={() => router.push(`/debts/${id}/simulator`)}
        >
          <Text style={styles.secondaryActionBtnText}>ABRIR SIMULADOR</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceLowest,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}14`,
  },
  headerTitle: {
    fontFamily: 'VT323',
    fontSize: 22,
    letterSpacing: 2,
    color: Colors.primary,
  },
  headerBtn: {
    minWidth: 72,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    paddingHorizontal: 10,
  },
  headerBtnText: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  heroCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionKicker: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  alertChip: {
    backgroundColor: `${Colors.tertiary}18`,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}45`,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertChipText: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.tertiary,
  },
  heroName: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 1.5,
    color: Colors.onSurface,
  },
  heroBalance: {
    fontFamily: 'VT323',
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    color: Colors.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.primary}12`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bankChipEmpty: {
    backgroundColor: Colors.surface,
    borderColor: `${Colors.outlineVariant}70`,
  },
  bankChipText: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.primary,
  },
  bankChipTextEmpty: {
    color: Colors.onSurfaceVariant,
  },
  rateChip: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}50`,
  },
  rateChipDanger: {
    color: Colors.tertiary,
    borderColor: `${Colors.tertiary}50`,
  },
  metaInfo: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  progressBlock: {
    gap: 6,
    marginTop: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.md,
    gap: 4,
  },
  metricLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  metricValue: {
    fontFamily: 'VT323',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    color: Colors.onSurface,
  },
  infoCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoLabel: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontFamily: 'VT323',
    fontSize: 17,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  warningCard: {
    backgroundColor: `${Colors.tertiary}10`,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}40`,
    padding: Spacing.lg,
    gap: 8,
  },
  warningTitle: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.tertiary,
  },
  warningText: {
    fontFamily: 'VT323',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  monthStatus: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.tertiary,
  },
  monthStatusDone: {
    color: Colors.secondary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.onPrimary,
  },
  secondaryActionBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
  },
  secondaryActionBtnText: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.primary,
  },
  secondaryBtn: {
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  notFoundTitle: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
