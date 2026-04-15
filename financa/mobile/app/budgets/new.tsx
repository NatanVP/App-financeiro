/**
 * New Budget screen — creates a budget limit for a category in a given month.
 * Receives `year_month` param (YYYY-MM) from the budgets list FAB.
 */
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { money } from '@/lib/money';
import { NumPad } from '@/components/ui/NumPad';
import { useBudgetStore } from '@/store/budgetStore';
import { CATEGORIES } from '@/constants/categories';

export default function NewBudgetScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ year_month?: string }>();
  const yearMonth = params.year_month ?? new Date().toISOString().slice(0, 7);

  const { upsertBudget } = useBudgetStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('0');

  const handleNumPad = (key: string) => {
    if (key === '⌫') {
      setAmountInput((prev) => {
        const next = prev.slice(0, -1);
        return next.length === 0 ? '0' : next;
      });
      return;
    }
    if (key === ',') {
      if (!amountInput.includes(',')) setAmountInput((prev) => prev + ',');
      return;
    }
    setAmountInput((prev) => {
      if (prev === '0') return key;
      const commaIdx = prev.indexOf(',');
      if (commaIdx !== -1 && prev.length - commaIdx > 2) return prev;
      return prev + key;
    });
  };

  const handleSave = () => {
    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria.');
      return;
    }
    const normalized = amountInput.replace(',', '.');
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Erro', 'Digite um valor maior que zero.');
      return;
    }
    const now = new Date().toISOString();
    upsertBudget({
      id: `budget-${selectedCategory}-${yearMonth}-${Date.now()}`,
      category_id: selectedCategory,
      year_month: yearMonth,
      amount_cents: money(Math.round(val * 100)),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    router.back();
  };

  // Display label: "Abr/2026"
  const [y, m] = yearMonth.split('-');
  const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthLabel = `${MONTHS_PT[parseInt(m, 10) - 1]}/${y}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Novo Orçamento</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Month badge */}
        <View style={styles.monthBadgeRow}>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{monthLabel}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>LIMITE MENSAL</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>R$</Text>
            <Text style={styles.amountText}>
              {amountInput === '0' ? '0,00' : amountInput}
            </Text>
          </View>
        </View>

        {/* Category picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CATEGORIA</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.filter((c) => c.id !== '7').map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  selectedCategory === cat.id && styles.catChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={20}
                  color={
                    selectedCategory === cat.id
                      ? Colors.primary
                      : Colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.catName,
                    selectedCategory === cat.id && { color: Colors.primary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* NumPad */}
        <NumPad onPress={handleNumPad} />

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>SALVAR ORÇAMENTO</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceLowest },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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

  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.xl,
  },

  monthBadgeRow: { alignItems: 'center' },
  monthBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },

  amountSection: { alignItems: 'center', paddingVertical: Spacing.md },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: Colors.primary,
    marginBottom: 4,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amountPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    opacity: 0.5,
    fontVariant: ['tabular-nums'],
  },
  amountText: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    lineHeight: 48,
  },

  field: { gap: 8 },
  fieldLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceLow,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipActive: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}30`,
  },
  catName: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },

  saveBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onPrimary,
  },
});
