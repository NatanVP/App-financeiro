/**
 * Nova Missão — bottom sheet modal.
 * Permite parcelamento: define meses → divide o valor → desconta automaticamente todo mês.
 */
import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { money, Money, formatBRL } from '@/lib/money';
import { NumPad } from '@/components/ui/NumPad';
import { useGoalStore } from '@/store/goalStore';

const GOAL_COLORS = [
  Colors.primary,
  Colors.secondary,
  '#64B5F6',
  '#CE93D8',
  '#FFB74D',
  Colors.tertiary,
];

export default function NewGoalScreen() {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [targetInput, setTargetInput] = useState('0');
  const [months, setMonths] = useState(1);
  const [color, setColor] = useState(Colors.primary);
  const [saving, setSaving] = useState(false);

  const { addGoal } = useGoalStore();

  const parseCents = (input: string): Money => {
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val) || val <= 0) return money(0);
    return money(Math.round(val * 100));
  };

  const targetCents = parseCents(targetInput);
  const monthlyCents = months > 0 && targetCents > 0
    ? money(Math.ceil(targetCents / months))
    : money(0);

  const handleNumPad = (key: string) => {
    setTargetInput((prev) => {
      if (key === '⌫') {
        const next = prev.slice(0, -1);
        return next.length === 0 ? '0' : next;
      }
      if (key === ',') return prev.includes(',') ? prev : prev + ',';
      if (prev === '0') return key;
      const commaIdx = prev.indexOf(',');
      if (commaIdx !== -1 && prev.length - commaIdx > 2) return prev;
      return prev + key;
    });
  };

  const changeMonths = (delta: number) => {
    setMonths((m) => Math.max(1, Math.min(60, m + delta)));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome para a missão.');
      return;
    }
    if (targetCents <= 0) {
      Alert.alert('Meta inválida', 'Informe um valor alvo maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const goalId = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Prazo = today + months
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + months - 1);
      const isoDate = targetDate.toISOString().slice(0, 7) + '-01';

      addGoal({
        id: goalId,
        name: name.trim(),
        target_cents: targetCents,
        current_cents: money(0),
        target_date: isoDate,
        icon: 'flag',
        color,
        status: 'active',
        monthly_cents: monthlyCents,
        months_total: months,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      router.back();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const displayAmount = targetInput === '0' ? '0,00' : targetInput;
  const isInstallment = months > 1;

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={() => router.back()} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>NOVA MISSÃO</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: Spacing.xl }}>
          {/* Nome */}
          <View>
            <Text style={styles.fieldLabel}>NOME DA MISSÃO</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Ex: Viagem, Reserva, PS5..."
              placeholderTextColor={`${Colors.onSurfaceVariant}60`}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus
            />
          </View>

          {/* Valor alvo */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>META TOTAL</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountValue, { color: Colors.primary }]}>{displayAmount}</Text>
              <Text style={styles.amountSuffix}>G</Text>
            </View>
          </View>

          {/* Seletor de meses */}
          <View>
            <Text style={styles.fieldLabel}>PARCELAR EM</Text>
            <View style={styles.monthsRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => changeMonths(-1)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>

              <View style={styles.monthsDisplay}>
                <Text style={styles.monthsValue}>{months}</Text>
                <Text style={styles.monthsUnit}>{months === 1 ? 'MÊS' : 'MESES'}</Text>
              </View>

              <TouchableOpacity style={styles.stepBtn} onPress={() => changeMonths(1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview do parcelamento */}
          {targetCents > 0 && (
            <View style={[styles.previewCard, isInstallment && styles.previewCardActive]}>
              {isInstallment ? (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>PARCELA MENSAL</Text>
                    <Text style={[styles.previewValue, { color: Colors.primary }]}>
                      {formatBRL(monthlyCents)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>TOTAL DE PARCELAS</Text>
                    <Text style={styles.previewValue}>{months}× {formatBRL(monthlyCents)}</Text>
                  </View>
                  <Text style={styles.previewHint}>
                    ⚔ Pague {formatBRL(monthlyCents)}/mês pela tela de missões
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>PAGAMENTO ÚNICO</Text>
                    <Text style={[styles.previewValue, { color: Colors.primary }]}>
                      {formatBRL(targetCents)}
                    </Text>
                  </View>
                  <Text style={styles.previewHint}>
                    ⚔ Pague pela tela de missões quando quiser recolher
                  </Text>
                </>
              )}
            </View>
          )}

          {/* NumPad */}
          <NumPad onPress={handleNumPad} />

          {/* Cor */}
          <View>
            <Text style={styles.fieldLabel}>COR DA MISSÃO</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {/* Salvar */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'CRIANDO...' : 'INICIAR MISSÃO'}
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
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: `${Colors.outlineVariant}50`,
    alignSelf: 'center', marginVertical: 12,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: 'VT323', fontSize: 16, letterSpacing: 2, color: Colors.onSurfaceVariant,
  },
  body: { paddingHorizontal: Spacing.xl },

  fieldLabel: {
    fontFamily: 'VT323', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 2, color: Colors.onSurfaceVariant, marginBottom: 6,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'VT323', fontSize: 18, color: Colors.onSurface,
  },

  amountDisplay: { alignItems: 'center', gap: 2 },
  amountLabel: {
    fontFamily: 'VT323', fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', color: Colors.onSurfaceVariant,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amountValue: { fontFamily: 'VT323', fontSize: 52, fontVariant: ['tabular-nums'] },
  amountSuffix: {
    fontFamily: 'VT323', fontSize: 28, color: Colors.onSurfaceVariant,
    opacity: 0.6, paddingBottom: 6,
  },

  monthsRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  stepBtn: {
    width: 44, height: 44,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  stepBtnText: {
    fontFamily: 'VT323', fontSize: 28, color: Colors.primary, lineHeight: 32,
  },
  monthsDisplay: {
    flex: 1, flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  monthsValue: {
    fontFamily: 'VT323', fontSize: 32, color: Colors.primary, fontVariant: ['tabular-nums'],
  },
  monthsUnit: {
    fontFamily: 'VT323', fontSize: 14, letterSpacing: 1.5, color: Colors.onSurfaceVariant,
  },

  previewCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  previewCardActive: {
    borderColor: `${Colors.primary}40`,
    backgroundColor: `${Colors.primary}08`,
  },
  previewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  previewLabel: {
    fontFamily: 'VT323', fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', color: Colors.onSurfaceVariant,
  },
  previewValue: {
    fontFamily: 'VT323', fontSize: 16, fontVariant: ['tabular-nums'], color: Colors.onSurface,
  },
  previewHint: {
    fontFamily: 'VT323', fontSize: 12, letterSpacing: 1,
    color: Colors.tertiary, textAlign: 'center', marginTop: 4,
  },

  colorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorDotActive: { borderWidth: 3, borderColor: Colors.onSurface },

  saveBtn: {
    backgroundColor: Colors.primary, height: 56,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  saveBtnText: {
    fontFamily: 'VT323', fontSize: 18, textTransform: 'uppercase',
    letterSpacing: 2, color: Colors.onPrimary,
  },
});
