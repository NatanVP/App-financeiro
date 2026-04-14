/**
 * Transactions screen — grouped by date, with filters.
 */
import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore, Transaction } from '@/store/transactionStore';
import { TransactionRow } from '@/components/ui/TransactionRow';

type FilterType = 'all' | 'income' | 'expense';

interface Section {
  title: string;
  totalCents: number;
  isPositive: boolean;
  data: Transaction[];
}

function groupByDate(transactions: Transaction[]): Section[] {
  const groups: Record<string, Transaction[]> = {};
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  for (const t of transactions) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => {
      const label =
        date === today ? 'Hoje' : date === yesterday ? 'Ontem' : formatDatePtBR(date);
      const totalCents = items.reduce((s, t) => {
        if (t.type === 'income') return s + t.amount_cents;
        return s - t.amount_cents;
      }, 0);

      return { title: `${label}, ${formatDayMonth(date)}`, totalCents, isPositive: totalCents >= 0, data: items };
    });
}

function formatDatePtBR(iso: string): string {
  const [, , day] = iso.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthIdx = parseInt(iso.split('-')[1]) - 1;
  return `${parseInt(day)} ${months[monthIdx]}`;
}

function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Receita' },
  { key: 'expense', label: 'Despesa' },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');
  const { transactions } = useTransactionStore();

  const visible = useMemo(() => {
    const active = transactions.filter((t) => !t.deleted_at);
    if (filter === 'all') return active;
    return active.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const sections = useMemo(() => groupByDate(visible), [visible]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction list grouped by date */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={[
              styles.sectionTotal,
              { color: section.isPositive ? Colors.secondary : Colors.onSurfaceVariant },
            ]}>
              {section.isPositive ? '+' : ''}{formatBRL(money(section.totalCents))}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            description={item.description}
            amountCents={item.amount_cents}
            type={item.type}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56, paddingHorizontal: Spacing.lg },
  title: { ...Typography.headlineSm, color: Colors.primary },
  searchBtn: { padding: 8 },
  searchIcon: { fontSize: 18 },
  filters: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontWeight: '500' },
  chipTextActive: { color: Colors.onPrimary, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: `${Colors.surfaceLow}F0`,
  },
  sectionTitle: { ...Typography.labelSm, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700', color: Colors.onSurfaceVariant },
  sectionTotal: { ...Typography.labelSm, fontVariant: ['tabular-nums'] },
});
