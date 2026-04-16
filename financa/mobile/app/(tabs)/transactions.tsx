/**
 * Transactions screen — grouped by date, with filters + search.
 */
import React, { useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore, Transaction } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
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
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthIdx = parseInt(iso.split('-')[1]) - 1;
  return `${parseInt(iso.split('-')[2])} ${months[monthIdx]}`;
}

function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'TODOS'   },
  { key: 'income',  label: 'RECEITA' },
  { key: 'expense', label: 'DESPESA' },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { transactions } = useTransactionStore();
  const { getCategoryName } = useCategoryStore();

  const visible = useMemo(() => {
    let list = transactions.filter((t) => !t.deleted_at);

    if (filter !== 'all') list = list.filter((t) => t.type === filter);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => {
        const catName = t.category_id ? getCategoryName(t.category_id).toLowerCase() : '';
        return (
          t.description.toLowerCase().includes(q) ||
          catName.includes(q)
        );
      });
    }

    return list;
  }, [transactions, filter, query, getCategoryName]);

  const sections = useMemo(() => groupByDate(visible), [visible]);

  const toggleSearch = () => {
    setSearchOpen((v) => !v);
    if (searchOpen) setQuery('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CRÔNICAS</Text>
        <TouchableOpacity
          style={[styles.searchBtn, searchOpen && styles.searchBtnActive]}
          onPress={toggleSearch}
        >
          <Text style={[styles.searchBtnText, searchOpen && styles.searchBtnTextActive]}>
            {searchOpen ? '✕ FECHAR' : '[ BUSCA ]'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <Text style={styles.searchBarPrefix}>{'>'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="categoria ou descrição..."
            placeholderTextColor={`${Colors.onSurfaceVariant}60`}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filtros */}
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

      {/* Lista agrupada por data */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
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
            categoryName={item.category_id ? getCategoryName(item.category_id) : undefined}
            amountCents={item.amount_cents}
            type={item.type}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{ query ? '[ ? ]' : '[ — ]' }</Text>
            <Text style={styles.emptyText}>
              {query ? 'NENHUM RESULTADO' : 'NENHUM LANÇAMENTO'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 2,
    color: Colors.primary,
  },
  searchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.surface,
  },
  searchBtnActive: {
    backgroundColor: `${Colors.tertiary}20`,
  },
  searchBtnText: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  searchBtnTextActive: {
    color: Colors.tertiary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  searchBarPrefix: {
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.primary,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurface,
    padding: 0,
  },
  searchClear: {
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },

  filters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: {
    fontFamily: 'VT323',
    fontSize: 14,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: { color: Colors.onPrimary },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: `${Colors.surfaceLow}F0`,
  },
  sectionTitle: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  sectionTotal: {
    fontFamily: 'VT323',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },

  emptyBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 60,
  },
  emptyIcon: {
    fontFamily: 'VT323',
    fontSize: 28,
    color: `${Colors.onSurfaceVariant}40`,
  },
  emptyText: {
    fontFamily: 'VT323',
    fontSize: 14,
    letterSpacing: 2,
    color: `${Colors.onSurfaceVariant}60`,
  },
});
