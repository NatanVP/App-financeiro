/**
 * Budgets screen — shows per-category spending vs. budget with progress bars.
 * Supports month navigation (year_month selector) and "copy from previous month" shortcut.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useBudgetStore } from '@/store/budgetStore';
import { useTransactionStore } from '@/store/transactionStore';
import { BudgetRow } from '@/components/ui/BudgetRow';

type Filter = 'all' | 'over' | 'ok';

/** Returns "YYYY-MM" string for a given Date. */
function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns a Date shifted by `delta` months. */
function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYearMonth(d);
}

/** "YYYY-MM" → "Mmm/AAAA" display label. */
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_PT[m - 1]}/${y}`;
}

export default function BudgetsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [copying, setCopying] = useState(false);
  const [yearMonth, setYearMonth] = useState<string>(toYearMonth(new Date()));

  const { getBudgetsForMonth, copyFromPreviousMonth } = useBudgetStore();
  const transactions = useTransactionStore((s) => s.transactions);

  const budgets = getBudgetsForMonth(yearMonth);
  const prevMonth = shiftMonth(yearMonth, -1);
  const isCurrentMonth = yearMonth === toYearMonth(new Date());

  // Spent per category for the selected month
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (!tx.category_id) continue;
      if (tx.type !== 'expense') continue;
      if (!tx.deleted_at && tx.date.startsWith(yearMonth)) {
        map[tx.category_id] = (map[tx.category_id] ?? 0) + tx.amount_cents;
      }
    }
    return map;
  }, [transactions, yearMonth]);

  const enriched = useMemo(() =>
    budgets.map((b) => ({
      ...b,
      spentCents: money(spentByCategory[b.category_id] ?? 0),
      isOver: (spentByCategory[b.category_id] ?? 0) > b.amount_cents,
    })),
  [budgets, spentByCategory]);

  const filtered = useMemo(() => {
    if (filter === 'over') return enriched.filter((b) => b.isOver);
    if (filter === 'ok') return enriched.filter((b) => !b.isOver);
    return enriched;
  }, [enriched, filter]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount_cents, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spentCents, 0);
  const overCount = enriched.filter((b) => b.isOver).length;
  const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const handleCopyPrevious = useCallback(async () => {
    if (budgets.length > 0) {
      Alert.alert(
        'Sobrescrever?',
        `Já existem ${budgets.length} orçamentos em ${formatYearMonth(yearMonth)}. Copiar do mês anterior irá adicionar categorias que ainda não existem.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: doCopy },
        ],
      );
    } else {
      await doCopy();
    }
  }, [budgets.length, yearMonth]);

  const doCopy = async () => {
    setCopying(true);
    try {
      await copyFromPreviousMonth(yearMonth, prevMonth);
      Alert.alert('Copiado', `Orçamentos de ${formatYearMonth(prevMonth)} copiados para ${formatYearMonth(yearMonth)}.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar os orçamentos.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Orçamentos</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <Pressable style={styles.monthArrow} onPress={() => setYearMonth((ym) => shiftMonth(ym, -1))}>
          <MaterialIcons name="chevron-left" size={20} color="#908fa0" />
        </Pressable>
        <Text style={styles.monthLabel}>{formatYearMonth(yearMonth)}</Text>
        <Pressable
          style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          onPress={() => !isCurrentMonth && setYearMonth((ym) => shiftMonth(ym, 1))}
        >
          <MaterialIcons name="chevron-right" size={20} color={isCurrentMonth ? '#464554' : '#908fa0'} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <LinearGradient
          colors={PrimaryGradient.colors}
          start={PrimaryGradient.start}
          end={PrimaryGradient.end}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>GASTO DO MÊS</Text>
          <Text style={styles.summaryAmount}>{formatBRL(money(totalSpent))}</Text>
          <Text style={styles.summaryOf}>de {formatBRL(money(totalBudget))}</Text>

          <View style={styles.summaryProgressBg}>
            <View style={[styles.summaryProgressFill, { width: `${overallPct}%` }]} />
          </View>

          <View style={styles.summaryFooter}>
            <Text style={styles.summaryFooterText}>{overallPct}% utilizado</Text>
            {overCount > 0 && (
              <Text style={styles.summaryOverText}>
                {overCount} categoria{overCount > 1 ? 's' : ''} acima
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* Copy from previous + filter row */}
        <View style={styles.actionsRow}>
          <View style={styles.filterRow}>
            {(['all', 'over', 'ok'] as Filter[]).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'Todos' : f === 'over' ? 'Acima' : 'OK'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.copyBtn} onPress={handleCopyPrevious} disabled={copying}>
            {copying ? (
              <ActivityIndicator size="small" color="#c0c1ff" />
            ) : (
              <>
                <MaterialIcons name="content-copy" size={12} color="#c0c1ff" />
                <Text style={styles.copyBtnText}>Copiar mês ant.</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Budget rows */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhum orçamento em {formatYearMonth(yearMonth)}</Text>
            <Text style={styles.emptySubtitle}>
              Toque em + para criar ou copie do mês anterior
            </Text>
          </View>
        ) : (
          <View style={styles.budgetList}>
            {filtered.map((b) => (
              <BudgetRow
                key={b.id}
                categoryName={b.category_id}
                spentCents={b.spentCents}
                budgetCents={b.amount_cents}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/budgets/new', params: { year_month: yearMonth } })}
      >
        <LinearGradient
          colors={PrimaryGradient.colors}
          start={PrimaryGradient.start}
          end={PrimaryGradient.end}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceLowest },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.primaryText, fontWeight: '300' },
  headerTitle: { flex: 1, ...Typography.headlineSm, color: Colors.primary, textAlign: 'center' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(70,69,84,0.12)',
  },
  monthArrow: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(70,69,84,0.1)',
  },
  monthArrowDisabled: { opacity: 0.4 },
  monthLabel: {
    color: Colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  summaryCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: `${Colors.onPrimaryContainer}CC`,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: Colors.onPrimaryContainer,
    fontVariant: ['tabular-nums'],
  },
  summaryOf: {
    fontSize: 12,
    color: `${Colors.onPrimaryContainer}99`,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  summaryProgressBg: {
    height: 4,
    backgroundColor: `${Colors.onPrimaryContainer}20`,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: Colors.onPrimaryContainer,
    borderRadius: 2,
  },
  summaryFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryFooterText: { fontSize: 10, color: `${Colors.onPrimaryContainer}CC` },
  summaryOverText: { fontSize: 10, fontWeight: '700', color: Colors.tertiaryFixed },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant },
  filterChipTextActive: { color: Colors.onPrimary },

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(192,193,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,193,255,0.15)',
  },
  copyBtnText: { color: '#c0c1ff', fontSize: 10, fontWeight: '600' },

  budgetList: { gap: Spacing.sm },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { ...Typography.titleSm, color: Colors.onSurfaceVariant },
  emptySubtitle: { ...Typography.bodySm, color: `${Colors.onSurfaceVariant}80`, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 8,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { fontSize: 28, fontWeight: '300', color: Colors.onPrimary, lineHeight: 32 },
});
