import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { BankIcon } from '@/components/ui/BankIcon';
import { NumPad } from '@/components/ui/NumPad';
import { formatBRL, money, Money } from '@/lib/money';
import { useAccountStore } from '@/store/accountStore';
import { useDebtStore } from '@/store/debtStore';
import { useSalaryStore } from '@/store/salaryStore';
import { useTransactionStore } from '@/store/transactionStore';

function formatInputFromMoney(cents: Money | number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parseInputToMoney(input: string): Money {
  const normalized = input.replace(/\./g, '').replace(',', '.').trim();
  const value = parseFloat(normalized);
  if (Number.isNaN(value) || value <= 0) return money(0);
  return money(Math.round(value * 100));
}

export default function DebtPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { debts, applyPayment } = useDebtStore();
  const { addTransaction } = useTransactionStore();
  const { getActiveAccounts } = useAccountStore();
  const { salaryAccountId } = useSalaryStore();

  const debt = debts.find((entry) => entry.id === id);
  const accounts = getActiveAccounts();
  const defaultAccountId = accounts.some((account) => account.id === salaryAccountId)
    ? salaryAccountId
    : (accounts[0]?.id ?? '');
  const suggestedAmount = debt
    ? Math.min(
        debt.current_balance_cents,
        debt.monthly_payment_cents > 0 ? debt.monthly_payment_cents : debt.current_balance_cents,
      )
    : 0;

  const [amountInput, setAmountInput] = useState(formatInputFromMoney(suggestedAmount));
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const amountCents = useMemo(() => parseInputToMoney(amountInput), [amountInput]);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  const handleNumPad = (key: string) => {
    setAmountInput((prev) => {
      if (key !== ',' && !/^\d$/.test(key)) {
        const next = prev.slice(0, -1);
        return next.length === 0 ? '0' : next;
      }
      if (key === ',') {
        return prev.includes(',') ? prev : `${prev},`;
      }
      if (prev === '0') return key;
      const commaIdx = prev.indexOf(',');
      if (commaIdx !== -1 && prev.length - commaIdx > 2) return prev;
      return `${prev}${key}`;
    });
  };

  const fillAmount = (value: number) => {
    setAmountInput(formatInputFromMoney(value));
  };

  const handleSave = () => {
    if (!debt) {
      Alert.alert('Dívida ausente', 'Não encontrei essa dívida para registrar o pagamento.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Conta ausente', 'Escolha de qual banco saiu esse pagamento.');
      return;
    }

    if (amountCents <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }

    if (amountCents > debt.current_balance_cents) {
      Alert.alert('Valor maior que o saldo', 'O pagamento não pode ser maior que o saldo em aberto.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      addTransaction({
        id: `tx-debt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        account_id: selectedAccountId,
        category_id: 'debt_payment',
        amount_cents: amountCents,
        type: 'expense',
        description: `Pagamento: ${debt.name}`,
        date: today,
        notes: debt.id,
        transfer_to_account_id: null,
        is_reconciled: false,
        device_id: process.env.EXPO_PUBLIC_DEVICE_ID ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      applyPayment(debt.id, amountCents);
      router.back();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  if (!debt) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.missingBox}>
          <Text style={styles.missingTitle}>DIVIDA NAO ENCONTRADA</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>VOLTAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayAmount = amountInput === '0' ? '0,00' : amountInput;

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={() => router.back()} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>ABATER DIVIDA</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: Spacing.xl }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>SALDO EM ABERTO</Text>
            <Text style={styles.heroName}>{debt.name.toUpperCase()}</Text>
            <Text style={styles.heroBalance}>{formatBRL(debt.current_balance_cents)}</Text>
            <Text style={styles.heroMeta}>
              {debt.monthly_payment_cents > 0
                ? `Parcela sugerida: ${formatBRL(debt.monthly_payment_cents)}`
                : 'Sem parcela mensal definida'}
            </Text>
          </View>

          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>QUANTO VOCE PAGOU</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountText}>{displayAmount}</Text>
              <Text style={styles.amountSuffix}>G</Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            {debt.monthly_payment_cents > 0 && (
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() =>
                  fillAmount(Math.min(debt.monthly_payment_cents, debt.current_balance_cents))
                }
              >
                <Text style={styles.quickBtnText}>PARCELA DO MES</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => fillAmount(debt.current_balance_cents)}
            >
              <Text style={styles.quickBtnText}>QUITAR TUDO</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={styles.fieldLabel}>SAIU DE QUAL BANCO</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowAccountPicker(true)}
            >
              {selectedAccount ? (
                <BankIcon bank={selectedAccount.id} size={20} />
              ) : (
                <MaterialCommunityIcons name="bank-outline" size={18} color={Colors.primary} />
              )}
              <Text style={styles.selectText}>
                {selectedAccount?.name ?? 'Escolher banco'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>PAGAMENTO</Text>
              <Text style={[styles.previewValue, { color: Colors.primary }]}>
                {formatBRL(amountCents)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>SALDO DEPOIS</Text>
              <Text style={[styles.previewValue, { color: Colors.tertiary }]}>
                {formatBRL(money(Math.max(0, debt.current_balance_cents - amountCents)))}
              </Text>
            </View>
          </View>

          <NumPad onPress={handleNumPad} />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'REGISTRANDO...' : 'REGISTRAR PAGAMENTO'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal
        visible={showAccountPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAccountPicker(false)}>
          <Pressable style={styles.accountPickerCard} onPress={() => {}}>
            <Text style={styles.accountPickerTitle}>SELECIONAR BANCO</Text>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountOption,
                  selectedAccountId === account.id && styles.accountOptionActive,
                ]}
                onPress={() => {
                  setSelectedAccountId(account.id);
                  setShowAccountPicker(false);
                }}
              >
                <BankIcon bank={account.id} size={28} />
                <Text
                  style={[
                    styles.accountOptionText,
                    selectedAccountId === account.id && { color: Colors.primary },
                  ]}
                >
                  {account.name}
                </Text>
                {selectedAccountId === account.id && (
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
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${Colors.outlineVariant}50`,
    alignSelf: 'center',
    marginVertical: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  body: { paddingHorizontal: Spacing.xl },
  heroCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}35`,
    padding: Spacing.xl,
    gap: 4,
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  heroName: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 1.5,
    color: Colors.onSurface,
  },
  heroBalance: {
    fontFamily: 'VT323',
    fontSize: 40,
    color: Colors.tertiary,
    fontVariant: ['tabular-nums'],
  },
  heroMeta: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  amountDisplay: { alignItems: 'center', gap: 2 },
  amountLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amountText: {
    fontFamily: 'VT323',
    fontSize: 52,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  amountSuffix: {
    fontFamily: 'VT323',
    fontSize: 28,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    paddingBottom: 6,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickBtnText: {
    fontFamily: 'VT323',
    fontSize: 14,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  fieldLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectText: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurface,
  },
  selectArrow: {
    color: Colors.onSurfaceVariant,
    opacity: 0.5,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  previewValue: {
    fontFamily: 'VT323',
    fontSize: 17,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  saveBtnText: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.onPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPickerCard: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    width: 280,
    overflow: 'hidden',
  },
  accountPickerTitle: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}60`,
  },
  accountOptionActive: {
    backgroundColor: `${Colors.primary}10`,
  },
  accountOptionText: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurface,
  },
  missingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceLowest,
  },
  missingTitle: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
});
