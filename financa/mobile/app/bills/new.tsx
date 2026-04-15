/**
 * New Bill screen — adds a new "Conta a Pagar" to the bill store.
 */
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { money } from '@/lib/money';
import { NumPad } from '@/components/ui/NumPad';
import { useBillStore } from '@/store/billStore';

export default function NewBillScreen() {
  const insets = useSafeAreaInsets();
  const { addBill } = useBillStore();

  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('0');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');

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
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da conta.');
      return;
    }
    const normalized = amountInput.replace(',', '.');
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Erro', 'Digite um valor maior que zero.');
      return;
    }
    const day = isRecurring ? parseInt(recurrenceDay, 10) : null;
    if (isRecurring && (isNaN(day!) || day! < 1 || day! > 31)) {
      Alert.alert('Erro', 'Informe um dia de vencimento entre 1 e 31.');
      return;
    }
    const now = new Date().toISOString();
    addBill({
      id: `bill-${Date.now()}`,
      name: name.trim(),
      amount_cents: money(Math.round(val * 100)),
      category_id: null,
      due_date: dueDate,
      is_recurring: isRecurring,
      recurrence_day: isRecurring ? day : null,
      status: 'pending',
      paid_at: null,
      notes: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nova Conta</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Amount display */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>VALOR</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>R$</Text>
            <Text style={styles.amountText}>
              {amountInput === '0' ? '0,00' : amountInput}
            </Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NOME</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Conta de luz"
            placeholderTextColor={`${Colors.onSurfaceVariant}60`}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Due date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DATA DE VENCIMENTO</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={`${Colors.onSurfaceVariant}60`}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numeric"
          />
        </View>

        {/* Recurring toggle */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Conta recorrente</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: Colors.surface, true: `${Colors.primary}80` }}
            thumbColor={isRecurring ? Colors.primary : Colors.onSurfaceVariant}
          />
        </View>

        {isRecurring && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DIA DE VENCIMENTO MENSAL (1–31)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10"
              placeholderTextColor={`${Colors.onSurfaceVariant}60`}
              value={recurrenceDay}
              onChangeText={setRecurrenceDay}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        )}

        {/* NumPad */}
        <NumPad onPress={handleNumPad} />

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>SALVAR CONTA</Text>
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

  amountSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: Colors.tertiary,
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
  input: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.primary}40`,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  switchLabel: { ...Typography.bodySm, color: Colors.onSurface },

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
