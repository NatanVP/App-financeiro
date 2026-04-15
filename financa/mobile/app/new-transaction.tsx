/**
 * New Transaction screen — bottom sheet modal.
 * Type toggle (Despesa/Receita/Transf.), category scroll, account + date fields, custom NumPad.
 */
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { money, Money } from '@/lib/money';
import { NumPad } from '@/components/ui/NumPad';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { BankIcon } from '@/components/ui/BankIcon';
import { CATEGORIES } from '@/constants/categories';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';

type TxType = 'expense' | 'income' | 'transfer';

export default function NewTransactionScreen() {
  const insets = useSafeAreaInsets();
  const [txType, setTxType] = useState<TxType>('expense');
  const [amountInput, setAmountInput] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatDateLabel = (iso: string): string => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (iso === today) return 'Hoje';
    if (iso === yesterday) return 'Ontem';
    const [, m, d] = iso.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
  };

  const { addTransaction } = useTransactionStore();
  const { getActiveAccounts } = useAccountStore();
  const accounts = getActiveAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState(() => accounts[0]?.id ?? 'nubank');

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

  const handleSave = async () => {
    const cents = getAmountCents();
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descrição obrigatória', 'Informe uma descrição para a transação.');
      return;
    }

    const accountId = selectedAccountId;
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const tx = {
      id,
      account_id: accountId,
      category_id: selectedCategory,
      amount_cents: cents,
      type: txType,
      description: description.trim(),
      date: selectedDate,
      notes: null,
      transfer_to_account_id: null,
      is_reconciled: false,
      device_id: process.env.EXPO_PUBLIC_DEVICE_ID ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    setSaving(true);
    try {
      // TODO: persistência local com expo-sqlite (substituto do op-sqlite)
      // Por enquanto salva só na store em memória + sync via backend
      addTransaction(tx);
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Erro ao salvar', msg);
      console.error(e);
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.amountPrefix}>G$</Text>
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
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccountPicker(true)}>
                <BankIcon bank={selectedAccountId} size={20} />
                <Text style={styles.selectText}>
                  {accounts.find(a => a.id === selectedAccountId)?.name ?? 'Conta'}
                </Text>
                <Text style={{ color: Colors.onSurfaceVariant, opacity: 0.4 }}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.fieldLabel}>DATA</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                <Text style={styles.selectText}>{formatDateLabel(selectedDate)}</Text>
                <Text style={{ color: Colors.onSurfaceVariant, opacity: 0.4 }}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Descrição */}
          <View>
            <Text style={styles.fieldLabel}>DESCRIÇÃO</Text>
            <TextInput
              style={styles.descInput}
              placeholder="Ex: Mercado, Aluguel..."
              placeholderTextColor={`${Colors.onSurfaceVariant}60`}
              value={description}
              onChangeText={setDescription}
              maxLength={60}
            />
          </View>

          {/* NumPad */}
          <NumPad onPress={handleNumPad} />

          {/* Save button */}
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'SALVANDO...' : 'SALVAR TRANSAÇÃO'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        value={selectedDate}
        onConfirm={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Account picker modal */}
      <Modal visible={showAccountPicker} transparent animationType="fade" onRequestClose={() => setShowAccountPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAccountPicker(false)}>
          <Pressable style={styles.accountPickerCard} onPress={() => {}}>
            <Text style={styles.accountPickerTitle}>SELECIONAR CONTA</Text>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accountOption, selectedAccountId === acc.id && styles.accountOptionActive]}
                onPress={() => { setSelectedAccountId(acc.id); setShowAccountPicker(false); }}
              >
                <BankIcon bank={acc.id} size={28} />
                <Text style={[styles.accountOptionText, selectedAccountId === acc.id && { color: Colors.primary }]}>
                  {acc.name}
                </Text>
                {selectedAccountId === acc.id && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  accountPickerCard: { backgroundColor: Colors.surfaceLow, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: 4, width: 280, overflow: 'hidden' },
  accountPickerTitle: { fontFamily: 'VT323', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: Colors.onSurfaceVariant, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  accountOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: `${Colors.outlineVariant}60` },
  accountOptionActive: { backgroundColor: `${Colors.primary}10` },
  accountOptionText: { flex: 1, fontFamily: 'VT323', fontSize: 16, color: Colors.onSurface },
  selectText: { flex: 1, fontSize: 12, fontWeight: '500', color: Colors.onSurface },
  descInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurface,
    borderRadius: 0,
  },
  saveBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: 0, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  saveBtnText: { fontFamily: 'VT323', fontSize: 18, textTransform: 'uppercase', letterSpacing: 2, color: Colors.onPrimary },
});
