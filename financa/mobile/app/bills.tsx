/**
 * Bills screen (Contas a Pagar)
 * Groups bills by: Overdue → Pending → Scheduled → Paid.
 * Shows total pending and next 30-day forecast.
 */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useBillStore, Bill } from '@/store/billStore';
import { BillRow } from '@/components/ui/BillRow';

type TabFilter = 'pending' | 'all';

interface Section {
  title: string;
  titleColor: string;
  data: Bill[];
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7) return `Em ${diff} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function BillsScreen() {
  const [tab, setTab] = useState<TabFilter>('pending');
  const { bills, updateBill } = useBillStore();

  const activeBills = useMemo(
    () => bills.filter((b) => !b.deleted_at),
    [bills],
  );

  const { overdue, pending, scheduled, paid } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      overdue: activeBills.filter(
        (b) => b.status === 'overdue' || (b.status === 'pending' && b.due_date < today),
      ),
      pending: activeBills.filter(
        (b) => b.status === 'pending' && b.due_date >= today,
      ),
      scheduled: activeBills.filter((b) => b.status === 'scheduled'),
      paid: activeBills.filter((b) => b.status === 'paid'),
    };
  }, [activeBills]);

  const sections: Section[] = useMemo(() => {
    const raw: Section[] = [
      { title: 'Atrasadas', titleColor: Colors.tertiary, data: overdue },
      { title: 'Pendentes', titleColor: Colors.onSurfaceVariant, data: pending },
      { title: 'Agendadas', titleColor: Colors.onSurfaceVariant, data: scheduled },
    ];
    if (tab === 'all') raw.push({ title: 'Pagas', titleColor: Colors.secondary, data: paid });
    return raw.filter((s) => s.data.length > 0);
  }, [tab, overdue, pending, scheduled, paid]);

  const totalPending = useMemo(
    () => money([...overdue, ...pending].reduce((s, b) => s + b.amount_cents, 0)),
    [overdue, pending],
  );

  const handleMarkPaid = (id: string) => {
    updateBill(id, { status: 'paid', paid_at: new Date().toISOString() });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Contas a Pagar</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Summary strip */}
      <LinearGradient
        colors={[Colors.surfaceLow, Colors.surface]}
        style={styles.summaryStrip}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PENDENTE</Text>
          <Text style={[styles.summaryValue, { color: Colors.tertiary }]}>
            {formatBRL(totalPending)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>ATRASADAS</Text>
          <Text style={[styles.summaryValue, { color: overdue.length > 0 ? Colors.tertiary : Colors.secondary }]}>
            {overdue.length}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PAGAS NO MÊS</Text>
          <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
            {paid.length}
          </Text>
        </View>
      </LinearGradient>

      {/* Tab filter */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Em aberto
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            Todas
          </Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: section.titleColor }]}>
              {section.title.toUpperCase()}
            </Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.billContainer}>
            <BillRow
              name={item.name}
              amountCents={item.amount_cents}
              dueDateLabel={formatDueDate(item.due_date)}
              status={
                item.status === 'pending' && item.due_date < new Date().toISOString().split('T')[0]
                  ? 'overdue'
                  : (item.status as 'pending' | 'paid' | 'overdue' | 'scheduled')
              }
              onPress={
                item.status !== 'paid'
                  ? () => handleMarkPaid(item.id)
                  : undefined
              }
            />
            {item.is_recurring && (
              <View style={styles.recurringBadge}>
                <Text style={styles.recurringText}>Recorrente · dia {item.recurrence_day}</Text>
              </View>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhuma conta encontrada</Text>
            <Text style={styles.emptySubtitle}>Toque em + para adicionar uma conta</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => router.push('/bills/new')}>
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
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.primaryText, fontWeight: '300' },
  headerTitle: { flex: 1, ...Typography.headlineSm, color: Colors.primary, textAlign: 'center' },

  summaryStrip: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderColor: `${Colors.outlineVariant}20`,
  },
  summaryItem: { flex: 1, gap: 4, alignItems: 'center' },
  summaryLabel: { ...Typography.labelXs, color: Colors.onSurfaceVariant },
  summaryValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryDivider: { width: 1, backgroundColor: `${Colors.outlineVariant}30` },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.onPrimary },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: { ...Typography.labelXs, fontWeight: '700' },
  sectionCount: {
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}80`,
    fontVariant: ['tabular-nums'],
  },

  billContainer: {
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}15`,
  },
  recurringBadge: {
    paddingBottom: 8,
  },
  recurringText: { fontSize: 9, color: `${Colors.primary}80`, letterSpacing: 0.5 },

  separator: { height: Spacing.xs },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { ...Typography.titleSm, color: Colors.onSurfaceVariant },
  emptySubtitle: { ...Typography.bodySm, color: `${Colors.onSurfaceVariant}80` },

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
