import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { computeMonthsToPayoff, computePMT } from '@/lib/finance';
import { useDebtStore } from '@/store/debtStore';
import { ProgressBar } from '@/components/ui/ProgressBar';

const HIGH_INTEREST_THRESHOLD = 0.03;

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebtStore((s) => s.debts.find((d) => d.id === id));

  const analysis = useMemo(() => {
    if (!debt) return null;
    const bal = debt.current_balance_cents;
    const rate = debt.interest_rate_monthly;
    const monthlyPmt = debt.monthly_payment_cents;

    // Minimum payment = interest only + 1 cent
    const monthlyInterest = Math.ceil(bal * rate);
    const minPayment = money(monthlyInterest + 1);

    // Current trajectory
    const current = computeMonthsToPayoff(bal, rate, monthlyPmt);

    // Optimal (PMT for 12 months)
    const optimalPmt = computePMT(bal, rate, 12);
    const optimal = computeMonthsToPayoff(bal, rate, optimalPmt);

    const paidOff = debt.principal_cents - bal;
    const progress = debt.principal_cents > 0 ? paidOff / debt.principal_cents : 0;

    return { current, optimal, optimalPmt, monthlyInterest, minPayment, paidOff, progress };
  }, [debt]);

  if (!debt) {
    return (
      <View style={styles.root}>
        <Text style={styles.notFound}>Dívida não encontrada.</Text>
      </View>
    );
  }

  const isHighInterest = debt.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD;
  const progressPct = analysis ? Math.round(analysis.progress * 100) : 0;
  const ratePct = (debt.interest_rate_monthly * 100).toFixed(2);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {debt.name}
        </Text>
        <Pressable
          onPress={() => router.push(`/debts/${id}/simulator`)}
          style={styles.simBtn}
        >
          <Text style={styles.simBtnText}>Simular</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero balance card */}
        <View style={[styles.heroCard, isHighInterest && styles.heroCardCritical]}>
          {isHighInterest && <View style={styles.criticalDot} />}
          <Text style={styles.heroLabel}>SALDO ATUAL</Text>
          <Text style={styles.heroBalance}>{formatBRL(debt.current_balance_cents)}</Text>

          <View style={styles.heroMeta}>
            <Text style={[styles.heroRate, isHighInterest && { color: Colors.tertiary }]}>
              {ratePct}% a.m.
            </Text>
            {debt.due_date ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.heroDueDate}>
                  Quitação:{' '}
                  {new Date(debt.due_date).toLocaleDateString('pt-BR', {
                    month: 'short',
                    year: '2-digit',
                  })}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progresso de Quitação</Text>
              <Text style={styles.progressLabel}>{progressPct}%</Text>
            </View>
            <ProgressBar
              progress={analysis?.progress ?? 0}
              color={isHighInterest ? Colors.tertiary : Colors.primary}
              height={6}
            />
          </View>
        </View>

        {/* Key metrics grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PRINCIPAL</Text>
            <Text style={styles.metricValue}>{formatBRL(debt.principal_cents)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>QUITADO</Text>
            <Text style={[styles.metricValue, { color: Colors.secondary }]}>
              {formatBRL(analysis ? (analysis.paidOff as Parameters<typeof formatBRL>[0]) : money(0))}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PGTO. MENSAL</Text>
            <Text style={styles.metricValue}>{formatBRL(debt.monthly_payment_cents)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>JUROS/MÊS</Text>
            <Text style={[styles.metricValue, { color: isHighInterest ? Colors.tertiary : Colors.onSurface }]}>
              {formatBRL(
                analysis
                  ? (analysis.monthlyInterest as Parameters<typeof formatBRL>[0])
                  : money(0),
              )}
            </Text>
          </View>
        </View>

        {/* Current trajectory */}
        {analysis && !analysis.current.isInfeasible && (
          <View style={styles.trajectoryCard}>
            <Text style={styles.sectionTitle}>TRAJETÓRIA ATUAL</Text>

            <View style={styles.trajectoryRow}>
              <View style={styles.trajectoryItem}>
                <Text style={styles.trajectoryLabel}>Prazo restante</Text>
                <Text style={styles.trajectoryValue}>{analysis.current.months} meses</Text>
              </View>
              <View style={styles.trajectoryItem}>
                <Text style={styles.trajectoryLabel}>Total a pagar</Text>
                <Text style={[styles.trajectoryValue, { color: Colors.tertiary }]}>
                  {formatBRL(analysis.current.totalPaidCents)}
                </Text>
              </View>
              <View style={styles.trajectoryItem}>
                <Text style={styles.trajectoryLabel}>Total em juros</Text>
                <Text style={[styles.trajectoryValue, { color: Colors.tertiary }]}>
                  {formatBRL(analysis.current.totalInterestCents)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Infeasible warning */}
        {analysis?.current.isInfeasible && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠ PAGAMENTO INVIÁVEL</Text>
            <Text style={styles.warningText}>
              O pagamento mensal de {formatBRL(debt.monthly_payment_cents)} não cobre os
              juros mensais de {formatBRL(analysis.monthlyInterest as Parameters<typeof formatBRL>[0])}.
              A dívida cresce a cada mês. Aumente o pagamento mínimo ou renegocie.
            </Text>
          </View>
        )}

        {/* Optimal 12-month scenario */}
        {analysis && (
          <View style={styles.optimalCard}>
            <Text style={styles.sectionTitle}>CENÁRIO OTIMIZADO (12 MESES)</Text>
            <View style={styles.trajectoryRow}>
              <View style={styles.trajectoryItem}>
                <Text style={styles.trajectoryLabel}>Pgto. necessário</Text>
                <Text style={[styles.trajectoryValue, { color: Colors.primary }]}>
                  {formatBRL(analysis.optimalPmt)}
                </Text>
              </View>
              <View style={styles.trajectoryItem}>
                <Text style={styles.trajectoryLabel}>Economia em juros</Text>
                <Text style={[styles.trajectoryValue, { color: Colors.secondary }]}>
                  {formatBRL(
                    money(
                      Math.max(
                        0,
                        analysis.current.totalInterestCents - analysis.optimal.totalInterestCents,
                      ),
                    ),
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={styles.simulatorBtn}
          onPress={() => router.push(`/debts/${id}/simulator`)}
        >
          <LinearGradient
            colors={PrimaryGradient.colors}
            start={PrimaryGradient.start}
            end={PrimaryGradient.end}
            style={styles.simulatorBtnGradient}
          >
            <Text style={styles.simulatorBtnText}>ABRIR SIMULADOR</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceLowest },
  notFound: { ...Typography.bodySm, color: Colors.onSurfaceVariant, margin: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.primaryText, fontWeight: '300' },
  headerTitle: {
    flex: 1,
    ...Typography.headlineSm,
    color: Colors.primary,
    textAlign: 'center',
  },
  simBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  simBtnText: { ...Typography.labelXs, color: Colors.primary, fontWeight: '700' },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
  },

  heroCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}25`,
    position: 'relative',
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  heroCardCritical: {
    borderColor: `${Colors.tertiary}30`,
  },
  criticalDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
  },
  heroLabel: { ...Typography.labelXs, color: Colors.onSurfaceVariant, marginBottom: 4 },
  heroBalance: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    color: Colors.primaryText,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  heroRate: { ...Typography.labelSm, fontWeight: '700', color: Colors.onSurfaceVariant },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: `${Colors.outlineVariant}50` },
  heroDueDate: { ...Typography.labelSm, color: `${Colors.onSurfaceVariant}CC` },
  progressBlock: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.onSurfaceVariant },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: 4,
  },
  metricLabel: { ...Typography.labelXs, color: Colors.onSurfaceVariant },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },

  trajectoryCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: Spacing.md,
  },
  optimalCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    gap: Spacing.md,
  },
  sectionTitle: { ...Typography.labelXs, color: Colors.onSurfaceVariant, fontWeight: '700' },
  trajectoryRow: { flexDirection: 'row', gap: Spacing.sm },
  trajectoryItem: { flex: 1, gap: 4 },
  trajectoryLabel: { fontSize: 10, color: Colors.onSurfaceVariant },
  trajectoryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },

  warningCard: {
    backgroundColor: `${Colors.tertiaryContainer}15`,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}40`,
    gap: 8,
  },
  warningTitle: { fontSize: 11, fontWeight: '900', color: Colors.tertiary, letterSpacing: 0.5 },
  warningText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, lineHeight: 18 },

  simulatorBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 52,
    marginTop: Spacing.xs,
  },
  simulatorBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  simulatorBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.onPrimaryContainer,
  },
});
