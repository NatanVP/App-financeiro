/**
 * Debt Simulator Screen
 * Three strategies: Minimum / Custom / Optimal (12-month payoff).
 * Live recalculation on payment slider change.
 */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { formatBRL, money, Money } from '@/lib/money';
import { computeMonthsToPayoff, computePMT } from '@/lib/finance';
import { useDebtStore } from '@/store/debtStore';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Strategy = 'minimum' | 'custom' | 'optimal';

export default function DebtSimulatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebtStore((s) => s.debts.find((d) => d.id === id));

  // Compute bounds
  const { minPayment, optimalPmt, maxPayment } = useMemo(() => {
    if (!debt) return { minPayment: 0, optimalPmt: 0, maxPayment: 0 };
    const bal = debt.current_balance_cents;
    const rate = debt.interest_rate_monthly;
    const interestCents = Math.ceil(bal * rate);
    const min = Math.max(debt.monthly_payment_cents, interestCents + 100); // at least interest + R$1
    const optimal = computePMT(bal, rate, 12);
    const max = Math.round(bal * 1.5); // 150% of balance as ceiling
    return { minPayment: min, optimalPmt: optimal, maxPayment: Math.max(max, optimal * 2) };
  }, [debt]);

  const [strategy, setStrategy] = useState<Strategy>('custom');
  const [customPayment, setCustomPayment] = useState<number>(
    debt?.monthly_payment_cents ?? 0,
  );

  const activePayment = useMemo<Money>(() => {
    if (!debt) return money(0);
    if (strategy === 'minimum') return money(minPayment);
    if (strategy === 'optimal') return money(optimalPmt);
    return money(Math.round(customPayment));
  }, [strategy, customPayment, minPayment, optimalPmt, debt]);

  const result = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(debt.current_balance_cents, debt.interest_rate_monthly, activePayment);
  }, [debt, activePayment]);

  const minimumResult = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(debt.current_balance_cents, debt.interest_rate_monthly, money(minPayment));
  }, [debt, minPayment]);

  const optimalResult = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(debt.current_balance_cents, debt.interest_rate_monthly, money(optimalPmt));
  }, [debt, optimalPmt]);

  if (!debt) {
    return (
      <View style={styles.root}>
        <Text style={styles.notFound}>Dívida não encontrada.</Text>
      </View>
    );
  }

  const interestSavings = minimumResult && result && !result.isInfeasible && !minimumResult.isInfeasible
    ? Math.max(0, minimumResult.totalInterestCents - result.totalInterestCents)
    : 0;

  const monthsSaved = minimumResult && result && !result.isInfeasible && !minimumResult.isInfeasible
    ? Math.max(0, minimumResult.months - result.months)
    : 0;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Simulador</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Debt info */}
        <View style={styles.debtInfo}>
          <Text style={styles.debtName}>{debt.name.toUpperCase()}</Text>
          <Text style={styles.debtBalance}>{formatBRL(debt.current_balance_cents)}</Text>
          <Text style={styles.debtRate}>
            {(debt.interest_rate_monthly * 100).toFixed(2)}% a.m.
          </Text>
        </View>

        {/* Strategy selector */}
        <View style={styles.strategyContainer}>
          <Text style={styles.sectionLabel}>ESTRATÉGIA</Text>
          <View style={styles.strategyRow}>
            {(['minimum', 'custom', 'optimal'] as Strategy[]).map((s) => (
              <Pressable
                key={s}
                style={[styles.strategyBtn, strategy === s && styles.strategyBtnActive]}
                onPress={() => setStrategy(s)}
              >
                <Text
                  style={[
                    styles.strategyBtnText,
                    strategy === s && styles.strategyBtnTextActive,
                  ]}
                >
                  {s === 'minimum' ? 'Mínimo' : s === 'custom' ? 'Livre' : '12 Meses'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Payment slider (custom only) */}
        {strategy === 'custom' && (
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sectionLabel}>PAGAMENTO MENSAL</Text>
              <Text style={styles.sliderValue}>{formatBRL(activePayment)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={minPayment}
              maximumValue={maxPayment}
              value={customPayment}
              onValueChange={(v) => setCustomPayment(Math.round(v))}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.surfaceHighest}
              thumbTintColor={Colors.primary}
              step={100} // R$1 increments
            />
            <View style={styles.sliderLegend}>
              <Text style={styles.sliderLegendText}>{formatBRL(money(minPayment))}</Text>
              <Text style={styles.sliderLegendText}>{formatBRL(money(maxPayment))}</Text>
            </View>
          </View>
        )}

        {/* Fixed strategy display */}
        {strategy !== 'custom' && (
          <View style={styles.fixedPaymentCard}>
            <Text style={styles.sectionLabel}>PAGAMENTO MENSAL</Text>
            <Text style={styles.fixedPaymentValue}>{formatBRL(activePayment)}</Text>
          </View>
        )}

        {/* Results */}
        {result && !result.isInfeasible && (
          <View style={styles.resultsCard}>
            <Text style={styles.sectionLabel}>PROJEÇÃO</Text>
            <View style={styles.resultsGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Prazo</Text>
                <Text style={styles.resultValue}>{result.months} meses</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total pago</Text>
                <Text style={[styles.resultValue, { color: Colors.tertiary }]}>
                  {formatBRL(result.totalPaidCents)}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total em juros</Text>
                <Text style={[styles.resultValue, { color: Colors.tertiary }]}>
                  {formatBRL(result.totalInterestCents)}
                </Text>
              </View>
              {result.months > 0 && (
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Quitação prevista</Text>
                  <Text style={styles.resultValue}>
                    {(() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + result.months);
                      return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                    })()}
                  </Text>
                </View>
              )}
            </View>

            {/* Progress timeline bar */}
            <View style={styles.timelineBar}>
              <ProgressBar
                progress={Math.min(1, 1 / Math.max(1, result.months))}
                color={Colors.primary}
                height={4}
              />
            </View>
          </View>
        )}

        {/* Infeasible warning */}
        {result?.isInfeasible && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠ PAGAMENTO INVIÁVEL</Text>
            <Text style={styles.warningText}>
              Este valor não cobre os juros mensais. Aumente o pagamento.
            </Text>
          </View>
        )}

        {/* Savings vs minimum */}
        {strategy !== 'minimum' && interestSavings > 0 && (
          <View style={styles.savingsCard}>
            <Text style={styles.sectionLabel}>ECONOMIA VS. MÍNIMO</Text>
            <View style={styles.savingsRow}>
              <View style={styles.savingsItem}>
                <Text style={styles.savingsLabel}>Juros economizados</Text>
                <Text style={[styles.savingsValue, { color: Colors.secondary }]}>
                  {formatBRL(money(interestSavings))}
                </Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={styles.savingsLabel}>Meses a menos</Text>
                <Text style={[styles.savingsValue, { color: Colors.secondary }]}>
                  {monthsSaved} meses
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Comparison table */}
        <View style={styles.comparisonCard}>
          <Text style={styles.sectionLabel}>COMPARATIVO</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonHeader} />
            <Text style={styles.comparisonHeader}>Prazo</Text>
            <Text style={styles.comparisonHeader}>Juros</Text>
          </View>
          {[
            { label: 'Mínimo', res: minimumResult },
            { label: '12 Meses', res: optimalResult },
          ].map(({ label, res }) => (
            res && !res.isInfeasible ? (
              <View key={label} style={styles.comparisonRow}>
                <Text style={styles.comparisonCell}>{label}</Text>
                <Text style={styles.comparisonCell}>{res.months}m</Text>
                <Text style={[styles.comparisonCell, { color: Colors.tertiary }]}>
                  {formatBRL(res.totalInterestCents)}
                </Text>
              </View>
            ) : null
          ))}
        </View>
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
  headerTitle: { flex: 1, ...Typography.headlineSm, color: Colors.primary, textAlign: 'center' },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
  },

  debtInfo: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    marginTop: Spacing.xs,
    gap: 4,
  },
  debtName: { ...Typography.labelXs, color: Colors.onSurfaceVariant, fontWeight: '700' },
  debtBalance: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: Colors.primaryText,
    fontVariant: ['tabular-nums'],
  },
  debtRate: { ...Typography.labelSm, color: Colors.onSurfaceVariant },

  strategyContainer: { gap: 10 },
  sectionLabel: { ...Typography.labelXs, color: Colors.onSurfaceVariant, fontWeight: '700' },
  strategyRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    gap: 4,
  },
  strategyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  strategyBtnActive: { backgroundColor: Colors.surfaceHigh },
  strategyBtnText: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  strategyBtnTextActive: { color: Colors.primary },

  sliderCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    gap: Spacing.sm,
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  slider: { width: '100%', height: 32 },
  sliderLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLegendText: { fontSize: 10, color: `${Colors.onSurfaceVariant}80` },

  fixedPaymentCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: 6,
  },
  fixedPaymentValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },

  resultsCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: Spacing.md,
  },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  resultItem: { width: '47%', gap: 4 },
  resultLabel: { fontSize: 10, color: Colors.onSurfaceVariant },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  timelineBar: { marginTop: 4 },

  warningCard: {
    backgroundColor: `${Colors.tertiaryContainer}15`,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}40`,
    gap: 8,
  },
  warningTitle: { fontSize: 11, fontWeight: '900', color: Colors.tertiary, letterSpacing: 0.5 },
  warningText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },

  savingsCard: {
    backgroundColor: `${Colors.secondary}0F`,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.secondary}25`,
    gap: Spacing.md,
  },
  savingsRow: { flexDirection: 'row', gap: Spacing.md },
  savingsItem: { flex: 1, gap: 4 },
  savingsLabel: { fontSize: 10, color: Colors.onSurfaceVariant },
  savingsValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },

  comparisonCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: Spacing.sm,
  },
  comparisonRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: `${Colors.outlineVariant}15`, paddingBottom: 6 },
  comparisonHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
});
