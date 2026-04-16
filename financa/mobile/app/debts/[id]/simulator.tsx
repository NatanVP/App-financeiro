import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money, Money } from '@/lib/money';
import { computeMonthsToPayoff, computePMT } from '@/lib/finance';
import { useDebtStore } from '@/store/debtStore';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Strategy = 'minimum' | 'custom' | 'optimal';

export default function DebtSimulatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebtStore((state) => state.debts.find((entry) => entry.id === id));

  const { minPayment, optimalPayment, maxPayment } = useMemo(() => {
    if (!debt) return { minPayment: 0, optimalPayment: 0, maxPayment: 0 };

    const balance = debt.current_balance_cents;
    const rate = debt.interest_rate_monthly;
    const interestCents = Math.ceil(balance * rate);
    const minimum = Math.max(debt.monthly_payment_cents, interestCents + 100);
    const optimal = computePMT(balance, rate, 12);
    const max = Math.round(balance * 1.5);

    return {
      minPayment: minimum,
      optimalPayment: optimal,
      maxPayment: Math.max(max, optimal * 2),
    };
  }, [debt]);

  const [strategy, setStrategy] = useState<Strategy>('custom');
  const [customPayment, setCustomPayment] = useState<number>(debt?.monthly_payment_cents ?? 0);

  const activePayment = useMemo<Money>(() => {
    if (!debt) return money(0);
    if (strategy === 'minimum') return money(minPayment);
    if (strategy === 'optimal') return money(optimalPayment);
    return money(Math.round(customPayment));
  }, [customPayment, debt, minPayment, optimalPayment, strategy]);

  const result = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(
      debt.current_balance_cents,
      debt.interest_rate_monthly,
      activePayment,
    );
  }, [activePayment, debt]);

  const minimumResult = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(
      debt.current_balance_cents,
      debt.interest_rate_monthly,
      money(minPayment),
    );
  }, [debt, minPayment]);

  const optimalResult = useMemo(() => {
    if (!debt) return null;
    return computeMonthsToPayoff(
      debt.current_balance_cents,
      debt.interest_rate_monthly,
      money(optimalPayment),
    );
  }, [debt, optimalPayment]);

  if (!debt) {
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

  const interestSavings =
    minimumResult && result && !result.isInfeasible && !minimumResult.isInfeasible
      ? Math.max(0, minimumResult.totalInterestCents - result.totalInterestCents)
      : 0;
  const monthsSaved =
    minimumResult && result && !result.isInfeasible && !minimumResult.isInfeasible
      ? Math.max(0, minimumResult.months - result.months)
      : 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>SIMULADOR</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.sectionKicker}>ESTRATEGIA DE QUITACAO</Text>
          <Text style={styles.heroName}>{debt.name.toUpperCase()}</Text>
          <Text style={styles.heroBalance}>{formatBRL(debt.current_balance_cents)}</Text>
          <Text style={styles.heroMeta}>{(debt.interest_rate_monthly * 100).toFixed(2)}% a.m.</Text>
        </View>

        <View style={styles.segmentCard}>
          <Text style={styles.cardTitle}>ESCOLHER RITMO</Text>
          <View style={styles.segmentRow}>
            {(['minimum', 'custom', 'optimal'] as Strategy[]).map((option) => {
              const label =
                option === 'minimum' ? 'MINIMO' : option === 'custom' ? 'LIVRE' : '12 MESES';

              return (
                <Pressable
                  key={option}
                  style={[styles.segmentBtn, strategy === option && styles.segmentBtnActive]}
                  onPress={() => setStrategy(option)}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      strategy === option && styles.segmentBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {strategy === 'custom' ? (
          <View style={styles.sliderCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pagamento mensal</Text>
              <Text style={[styles.infoValue, { color: Colors.primary }]}>
                {formatBRL(activePayment)}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={minPayment}
              maximumValue={maxPayment}
              value={customPayment}
              onValueChange={(value) => setCustomPayment(Math.round(value))}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.surfaceHighest}
              thumbTintColor={Colors.primary}
              step={100}
            />
            <View style={styles.sliderLegend}>
              <Text style={styles.sliderLegendText}>{formatBRL(money(minPayment))}</Text>
              <Text style={styles.sliderLegendText}>{formatBRL(money(maxPayment))}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>PAGAMENTO ATIVO</Text>
            <Text style={[styles.fixedValue, { color: Colors.primary }]}>
              {formatBRL(activePayment)}
            </Text>
          </View>
        )}

        {result?.isInfeasible ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>PAGAMENTO INVIAVEL</Text>
            <Text style={styles.warningText}>
              Esse valor nao cobre os juros mensais. Aumente o pagamento para comecar a reduzir
              o saldo de verdade.
            </Text>
          </View>
        ) : result ? (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>PROJECAO</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prazo estimado</Text>
              <Text style={styles.infoValue}>{result.months} meses</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total pago</Text>
              <Text style={[styles.infoValue, { color: Colors.tertiary }]}>
                {formatBRL(result.totalPaidCents)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total em juros</Text>
              <Text style={[styles.infoValue, { color: Colors.tertiary }]}>
                {formatBRL(result.totalInterestCents)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quitacao prevista</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() + result.months);
                  return date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
                })()}
              </Text>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>RITMO DE AVANCO</Text>
                <Text style={styles.progressLabel}>{Math.max(1, result.months)}M</Text>
              </View>
              <ProgressBar
                progress={Math.min(1, 1 / Math.max(1, result.months))}
                color={Colors.primary}
                height={5}
              />
            </View>
          </View>
        ) : null}

        {strategy !== 'minimum' && interestSavings > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>GANHO CONTRA O MINIMO</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Juros economizados</Text>
              <Text style={[styles.infoValue, { color: Colors.secondary }]}>
                {formatBRL(money(interestSavings))}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Meses poupados</Text>
              <Text style={[styles.infoValue, { color: Colors.secondary }]}>{monthsSaved} meses</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>COMPARATIVO</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>PLANO</Text>
            <Text style={styles.tableHeaderCell}>PRAZO</Text>
            <Text style={styles.tableHeaderCell}>JUROS</Text>
          </View>
          {[
            { label: 'MINIMO', result: minimumResult },
            { label: '12 MESES', result: optimalResult },
            { label: 'ATUAL', result },
          ].map((item) =>
            item.result && !item.result.isInfeasible ? (
              <View key={item.label} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.label}</Text>
                <Text style={styles.tableCell}>{item.result.months}m</Text>
                <Text style={[styles.tableCell, { color: Colors.tertiary }]}>
                  {formatBRL(item.result.totalInterestCents)}
                </Text>
              </View>
            ) : null,
          )}
        </View>
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
  headerSpacer: {
    width: 36,
  },
  heroCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    gap: 4,
  },
  sectionKicker: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  heroName: {
    fontFamily: 'VT323',
    fontSize: 22,
    letterSpacing: 1.5,
    color: Colors.onSurface,
  },
  heroBalance: {
    fontFamily: 'VT323',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    color: Colors.tertiary,
  },
  heroMeta: {
    fontFamily: 'VT323',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  segmentCard: {
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}70`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentBtnActive: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: `${Colors.primary}50`,
  },
  segmentBtnText: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  segmentBtnTextActive: {
    color: Colors.primary,
  },
  sliderCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  sliderLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLegendText: {
    fontFamily: 'VT323',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  infoCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    gap: Spacing.sm,
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
  fixedValue: {
    fontFamily: 'VT323',
    fontSize: 30,
    fontVariant: ['tabular-nums'],
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
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}40`,
    paddingBottom: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 6,
  },
  tableCell: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 14,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
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
