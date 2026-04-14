/**
 * New Transaction screen — bottom sheet modal.
 * Type toggle (Despesa/Receita/Transf.), category scroll, account + date fields, custom NumPad.
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { money, Money } from '@/lib/money';
import { NumPad } from '@/components/ui/NumPad';

type TxType = 'expense' | 'income' | 'transfer';
import { CATEGORIES } from '@/constants/categories';

export default function NewTransactionScreen() {
  const insets = useSafeAreaInsets();
  const [txType, setTxType] = useState<TxType>('expense');
  const [amountInput, setAmountInput] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleNumPad = (key: string) => {
    if (key === '⌫') {
      setAmountInput((prev) => {
        const next = prev.slice(0, -1);
        return next.length === 0 ? '0' : next;
      });
      return;
    }
    if (key === ',') {
      if (!amountInput.includes(',')) {
        setAmountInput((prev) => prev + ',');
      }
      return;
    }
    setAmountInput((prev) => {
      if (prev === '0') return key;
      // max 2 decimal places
      const commaIdx = prev.indexOf(',');
      if (commaIdx !== -1 && prev.length - commaIdx > 2) return prev;
      return prev + key;
    });
  };

  const getAmountCents = (): Money => {
    const normalized = amountInput.replace(',', '.');
    const val = parseFloat(normalized);
    if (isNaN(val)) return money(0);
    return money(Math.round(val * 100));
  };

  const handleSave = () => {
    const cents = getAmountCents();
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    // TODO: persist to SQLite and queue for sync
    router.back();
  };

  const typeColors: Record<TxType, string> = {
    expense: Colors.tertiary,
    income: Colors.secondary,
    transfer: Colors.primary,
  };

  const displayAmount = amountInput === '0' ? '0,00' : amountInput;

  return (
    <View style={[styles.backdrop]}>
      <Pressable style={styles.backdropTap} onPress={() => router.back()} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>NOVA TRANSAÇÃO</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Type toggle */}
        <View style={styles.typeToggle}>
          {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, txType === t && styles.typeBtnActive]}
              onPress={() => setTxType(t)}
            >
              <Text style={[styles.typeBtnText, txType === t && styles.typeBtnTextActive]}>
                {t === 'expense' ? 'Despesa' : t === 'income' ? 'Receita' : 'Transf.'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount display */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: typeColors[txType] }]}>VALOR TOTAL</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>R$</Text>
            <Text style={styles.amountText}>{displayAmount}</Text>
          </View>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={{ gap: Spacing.xl }}>
          {/* Categories */}
          <View>
            <Text style={styles.fieldLabel}>CATEGORIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <View style={styles.catRow}>
                {CATEGORIES
                  .filter((c) => txType === 'income' ? c.id === '7' : c.id !== '7')
                  .map((cat) => (
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
                      color={selectedCategory === cat.id ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text style={[
                      styles.catName,
                      selectedCategory === cat.id && { color: Colors.primary },
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Account + Date row */}
          <View style={styles.metaRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.fieldLabel}>CONTA</Text>
              <View style={styles.selectBtn}>
                <View style={styles.nuDot}><Text style={styles.nuLetter}>N</Text></View>
                <Text style={styles.selectText}>Nubank</Text>
                <Text style={{ color: Colors.onSurfaceVariant, opacity: 0.4 }}>▼</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.fieldLabel}>DATA</Text>
              <View style={styles.selectBtn}>
                <Text style={styles.selectText}>Hoje</Text>
                <Text style={{ color: Colors.onSurfaceVariant, opacity: 0.4 }}>✏</Text>
              </View>
            </View>
          </View>

          {/* NumPad */}
          <NumPad onPress={handleNumPad} />

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>SALVAR TRANSAÇÃO</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTap: { ...StyleSheet.absoluteFillObject, backgroundColor: `${Colors.surfaceLowest}99` },
  sheet: {
    backgroundColor: Colors.surfaceLow,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: `${Colors.outlineVariant}50`, alignSelf: 'center', marginVertical: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  closeBtn: {},
  sheetTitle: { ...Typography.labelSm, fontWeight: '500', letterSpacing: 1.5, color: Colors.onSurfaceVariant },
  typeToggle: { flexDirection: 'row', marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: 8, padding: 4, marginBottom: Spacing.xl },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  typeBtnActive: { backgroundColor: Colors.surfaceHigh },
  typeBtnText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '500', color: Colors.onSurfaceVariant },
  typeBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  amountSection: { alignItems: 'center', paddingBottom: Spacing.xl },
  amountLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amountPrefix: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceVariant, opacity: 0.5, fontVariant: ['tabular-nums'] },
  amountText: { fontSize: 44, fontWeight: '900', color: Colors.onSurface, fontVariant: ['tabular-nums'], letterSpacing: -1.5, lineHeight: 48 },
  formScroll: { paddingHorizontal: Spacing.xl },
  fieldLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 8 },
  catScroll: { marginHorizontal: -Spacing.sm },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.sm, paddingBottom: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surfaceHigh, borderRadius: 8 },
  catChipActive: { backgroundColor: `${Colors.primary}15`, borderWidth: 1, borderColor: `${Colors.primary}30` },
  catIcon: { fontSize: 14 },
  catName: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },
  metaRow: { flexDirection: 'row', gap: Spacing.lg },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surface, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: `${Colors.primary}40` },
  nuDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#820AD1', alignItems: 'center', justifyContent: 'center' },
  nuLetter: { color: 'white', fontSize: 8, fontWeight: '700' },
  selectText: { flex: 1, fontSize: 12, fontWeight: '500', color: Colors.onSurface },
  saveBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  saveBtnText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, color: Colors.onPrimary },
});
