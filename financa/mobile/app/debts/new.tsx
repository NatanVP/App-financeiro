import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { computeMonthsToPayoff } from '@/lib/finance';
import { formatBRL, money, Money, parseBRL } from '@/lib/money';
import { BankIcon } from '@/components/ui/BankIcon';
import { useAccountStore } from '@/store/accountStore';
import { useDebtStore } from '@/store/debtStore';

function parseMoneyInput(input: string): Money {
  if (!input.trim()) return money(0);
  return parseBRL(input);
}

function parseRateInput(input: string): number {
  const normalized = input.replace(',', '.').trim();
  const value = parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) return 0;
  return value / 100;
}

export default function NewDebtScreen() {
  const insets = useSafeAreaInsets();
  const { getActiveAccounts } = useAccountStore();
  const { addDebt } = useDebtStore();

  const accounts = getActiveAccounts();

  const [name, setName] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [currentBalanceInput, setCurrentBalanceInput] = useState('');
  const [principalInput, setPrincipalInput] = useState('');
  const [monthlyPaymentInput, setMonthlyPaymentInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [saving, setSaving] = useState(false);

  const currentBalanceCents = useMemo(
    () => parseMoneyInput(currentBalanceInput),
    [currentBalanceInput],
  );
  const originalPrincipalInput = useMemo(
    () => parseMoneyInput(principalInput),
    [principalInput],
  );
  const principalCents = useMemo(
    () => money(Math.max(originalPrincipalInput, currentBalanceCents)),
    [currentBalanceCents, originalPrincipalInput],
  );
  const monthlyPaymentCents = useMemo(
    () => parseMoneyInput(monthlyPaymentInput),
    [monthlyPaymentInput],
  );
  const interestRateMonthly = useMemo(
    () => parseRateInput(rateInput),
    [rateInput],
  );

  const selectedBank = accounts.find((account) => account.id === selectedBankId);
  const simulation =
    currentBalanceCents > 0 && monthlyPaymentCents > 0
      ? computeMonthsToPayoff(currentBalanceCents, interestRateMonthly, monthlyPaymentCents)
      : null;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome para a dívida.');
      return;
    }

    if (currentBalanceCents <= 0) {
      Alert.alert('Saldo inválido', 'Informe um saldo atual maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      addDebt({
        id: `debt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        type: selectedBankId ? 'bank' : 'other',
        bank_id: selectedBankId,
        principal_cents: principalCents,
        current_balance_cents: currentBalanceCents,
        interest_rate_monthly: interestRateMonthly,
        start_date: today,
        due_date: null,
        monthly_payment_cents: monthlyPaymentCents,
        status: 'active',
        notes: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      router.back();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={() => router.back()} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>NOVA DÍVIDA</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: Spacing.xl }}>
          <View>
            <Text style={styles.fieldLabel}>NOME DO CONTRATO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Cartão Nubank, Empréstimo..."
              placeholderTextColor={`${Colors.onSurfaceVariant}60`}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus
            />
          </View>

          <View>
            <Text style={styles.fieldLabel}>BANCO DA DÍVIDA</Text>
            <View style={styles.bankList}>
              <TouchableOpacity
                style={[
                  styles.bankOption,
                  selectedBankId === null && styles.bankOptionActive,
                ]}
                onPress={() => setSelectedBankId(null)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="bank-outline" size={18} color={Colors.primary} />
                <Text
                  style={[
                    styles.bankOptionText,
                    selectedBankId === null && styles.bankOptionTextActive,
                  ]}
                >
                  Sem banco
                </Text>
              </TouchableOpacity>

              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.bankOption,
                    selectedBankId === account.id && styles.bankOptionActive,
                  ]}
                  onPress={() => setSelectedBankId(account.id)}
                  activeOpacity={0.8}
                >
                  <BankIcon bank={account.id} size={20} />
                  <Text
                    style={[
                      styles.bankOptionText,
                      selectedBankId === account.id && styles.bankOptionTextActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>SALDO ATUAL</Text>
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmount}>
                {currentBalanceInput.trim() ? currentBalanceInput : '0,00'}
              </Text>
              <Text style={styles.heroSuffix}>G</Text>
            </View>
            <Text style={styles.heroMeta}>
              {selectedBank ? `Banco: ${selectedBank.name}` : 'Sem banco vinculado'}
            </Text>
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.fieldGridItem}>
              <Text style={styles.fieldLabel}>SALDO ATUAL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0,00"
                placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                value={currentBalanceInput}
                onChangeText={setCurrentBalanceInput}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGridItem}>
              <Text style={styles.fieldLabel}>VALOR ORIGINAL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="igual ao saldo"
                placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                value={principalInput}
                onChangeText={setPrincipalInput}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGridItem}>
              <Text style={styles.fieldLabel}>PAGAMENTO MENSAL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0,00"
                placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                value={monthlyPaymentInput}
                onChangeText={setMonthlyPaymentInput}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGridItem}>
              <Text style={styles.fieldLabel}>JUROS AO MÊS (%)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                value={rateInput}
                onChangeText={setRateInput}
                keyboardType="numeric"
              />
            </View>
          </View>

          {currentBalanceCents > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>VALOR ORIGINAL</Text>
                <Text style={styles.previewValue}>{formatBRL(principalCents)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>EM ABERTO</Text>
                <Text style={[styles.previewValue, { color: Colors.tertiary }]}>
                  {formatBRL(currentBalanceCents)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>PAGAMENTO/MÊS</Text>
                <Text style={styles.previewValue}>
                  {monthlyPaymentCents > 0 ? formatBRL(monthlyPaymentCents) : 'Não definido'}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>JUROS</Text>
                <Text style={styles.previewValue}>{(interestRateMonthly * 100).toFixed(2)}% a.m.</Text>
              </View>
            </View>
          )}

          {simulation?.isInfeasible ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>PAGAMENTO INVIÁVEL</Text>
              <Text style={styles.warningText}>
                O pagamento mensal não cobre os juros da dívida. Ajuste o valor antes de salvar.
              </Text>
            </View>
          ) : simulation ? (
            <View style={styles.forecastCard}>
              <Text style={styles.forecastTitle}>ESTIMATIVA DE QUITAÇÃO</Text>
              <Text style={styles.forecastValue}>{simulation.months} meses</Text>
              <Text style={styles.forecastText}>
                Total estimado pago: {formatBRL(simulation.totalPaidCents)}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'REGISTRANDO...' : 'REGISTRAR DÍVIDA'}
            </Text>
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

  fieldLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'VT323',
    fontSize: 18,
    color: Colors.onSurface,
  },

  bankList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bankOptionActive: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: `${Colors.primary}55`,
  },
  bankOptionText: {
    fontFamily: 'VT323',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
  },
  bankOptionTextActive: {
    color: Colors.primary,
  },

  heroCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}35`,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroAmount: {
    fontFamily: 'VT323',
    fontSize: 44,
    color: Colors.tertiary,
    fontVariant: ['tabular-nums'],
  },
  heroSuffix: {
    fontFamily: 'VT323',
    fontSize: 26,
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
  heroMeta: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  fieldGrid: {
    gap: Spacing.md,
  },
  fieldGridItem: {
    gap: 0,
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
    fontSize: 16,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },

  warningCard: {
    backgroundColor: `${Colors.tertiary}10`,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}45`,
    padding: Spacing.lg,
    gap: 8,
  },
  warningTitle: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 2,
    color: Colors.tertiary,
  },
  warningText: {
    fontFamily: 'VT323',
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },

  forecastCard: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  forecastTitle: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  forecastValue: {
    fontFamily: 'VT323',
    fontSize: 30,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  forecastText: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
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
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onPrimary,
  },
});
