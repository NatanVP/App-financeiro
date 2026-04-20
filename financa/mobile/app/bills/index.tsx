/**
 * Contratos do Reino — Cobranças recorrentes mensais.
 * Assinaturas, mensalidades e qualquer débito fixo mensal.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money, parseBRL } from '@/lib/money';
import { scheduleBillNotifications } from '@/lib/notifications';
import { useBillStore } from '@/store/billStore';
import { useBillPaymentStore } from '@/store/billPaymentStore';

// ─── helpers ──────────────────────────────────────────────────────────────────

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const names = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  return `${names[parseInt(month) - 1]}/${year}`;
}

// ─── header ───────────────────────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[hStyles.wrap, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={hStyles.backBtn}>
        <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.primary} />
        <Text style={hStyles.backText}>GRIMÓRIO</Text>
      </TouchableOpacity>
      <View style={hStyles.titleRow}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color={Colors.primary} />
        <Text style={hStyles.title}>CONTRATOS DO REINO</Text>
      </View>
      <Text style={hStyles.sub}>cobranças recorrentes mensais</Text>
      <View style={hStyles.ruler} />
    </View>
  );
}

const hStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surfaceHigh,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outline}40`,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    gap: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  backText: { fontFamily: 'VT323', fontSize: 12, color: Colors.primary, letterSpacing: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'VT323', fontSize: 22, letterSpacing: 3, color: Colors.onSurface },
  sub: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 2, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  ruler: { height: 1, backgroundColor: `${Colors.outline}30`, marginTop: 6 },
});

// ─── formulário inline ────────────────────────────────────────────────────────

interface NewBillFormProps {
  onSave: (name: string, amountInput: string, day: number, paymentVia: string) => void;
  onCancel: () => void;
}

function NewBillForm({ onSave, onCancel }: NewBillFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [paymentVia, setPaymentVia] = useState('');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Campo obrigatório', 'Digite o nome da cobrança.'); return; }
    const d = parseInt(day, 10);
    if (isNaN(d) || d < 1 || d > 28) { Alert.alert('Dia inválido', 'Informe um dia entre 1 e 28.'); return; }
    try { parseBRL(amount || '0'); } catch { Alert.alert('Valor inválido', 'Use o formato 55,90'); return; }
    onSave(name.trim(), amount, d, paymentVia.trim());
  };

  return (
    <View style={fStyles.card}>
      <View style={fStyles.header}>
        <Text style={fStyles.headerText}>◆ NOVO CONTRATO</Text>
      </View>

      <View style={fStyles.field}>
        <Text style={fStyles.label}>NOME</Text>
        <TextInput
          style={fStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Netflix, Academia, Spotify..."
          placeholderTextColor={`${Colors.outline}80`}
          autoCapitalize="words"
        />
      </View>

      <View style={fStyles.row}>
        <View style={[fStyles.field, { flex: 2 }]}>
          <Text style={fStyles.label}>VALOR</Text>
          <View style={fStyles.amountRow}>
            <TextInput
              style={[fStyles.input, { flex: 1 }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={`${Colors.outline}80`}
              keyboardType="numeric"
            />
            <Text style={fStyles.currency}>G$</Text>
          </View>
        </View>

        <View style={[fStyles.field, { flex: 1 }]}>
          <Text style={fStyles.label}>DIA DO MÊS</Text>
          <TextInput
            style={[fStyles.input, { textAlign: 'center' }]}
            value={day}
            onChangeText={setDay}
            placeholder="15"
            placeholderTextColor={`${Colors.outline}80`}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      </View>

      <View style={fStyles.field}>
        <Text style={fStyles.label}>PAGO VIA (opcional)</Text>
        <TextInput
          style={fStyles.input}
          value={paymentVia}
          onChangeText={setPaymentVia}
          placeholder="Mercado Pago, Inter, Itaú..."
          placeholderTextColor={`${Colors.outline}80`}
          autoCapitalize="words"
        />
      </View>

      <View style={fStyles.btnRow}>
        <TouchableOpacity style={fStyles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
          <Text style={fStyles.cancelText}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fStyles.saveBtn} onPress={handleSave} activeOpacity={0.75}>
          <MaterialCommunityIcons name="feather" size={14} color={Colors.surfaceLowest} />
          <Text style={fStyles.saveText}>REGISTRAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceHighest,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    gap: 12,
    padding: Spacing.lg,
  },
  header: { borderBottomWidth: 1, borderBottomColor: `${Colors.outline}30`, paddingBottom: 8 },
  headerText: { fontFamily: 'VT323', fontSize: 14, letterSpacing: 3, color: Colors.primary },
  field: { gap: 4 },
  label: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 2, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  input: {
    fontFamily: 'VT323', fontSize: 18, color: Colors.onSurface,
    borderBottomWidth: 1, borderBottomColor: `${Colors.outline}50`, paddingVertical: 4,
  },
  row: { flexDirection: 'row', gap: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currency: { fontFamily: 'VT323', fontSize: 13, color: `${Colors.primary}80`, letterSpacing: 1 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: `${Colors.outline}50`, backgroundColor: Colors.surface,
  },
  cancelText: { fontFamily: 'VT323', fontSize: 15, letterSpacing: 2, color: Colors.onSurfaceVariant },
  saveBtn: {
    flex: 2, flexDirection: 'row', gap: 6, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary,
  },
  saveText: { fontFamily: 'VT323', fontSize: 15, letterSpacing: 3, color: Colors.surfaceLowest },
});

// ─── card de cobrança ──────────────────────────────────────────────────────────

interface BillCardProps {
  name: string;
  amountCents: number;
  recurrenceDay: number;
  paid: boolean;
  onToggle: () => void;
  onDelete: () => void;
  monthKey: string;
  paymentVia?: string | null;
}

function BillCard({ name, amountCents, recurrenceDay, paid, onToggle, onDelete, monthKey, paymentVia }: BillCardProps) {
  const todayDay = new Date().getDate();
  const isToday = todayDay === recurrenceDay;
  const isOverdue = todayDay > recurrenceDay && !paid;

  return (
    <View style={bStyles.card}>
      <View style={bStyles.top}>
        <View style={bStyles.left}>
          <Text style={bStyles.name} numberOfLines={1}>{name.toUpperCase()}</Text>
          <Text style={[bStyles.day, isToday && bStyles.dayToday, isOverdue && bStyles.dayOverdue]}>
            {isToday ? '◆ VENCE HOJE' : isOverdue ? `⚠ VENCEU DIA ${recurrenceDay}` : `◆ DIA ${recurrenceDay} DE CADA MÊS`}
          </Text>
          {!!paymentVia && (
            <Text style={bStyles.paymentVia}>via {paymentVia}</Text>
          )}
        </View>
        <View style={bStyles.right}>
          <Text style={bStyles.amount}>{formatBRL(money(amountCents))}</Text>
          <Text style={bStyles.monthLabel}>{monthLabel(monthKey)}</Text>
        </View>
      </View>

      <View style={bStyles.bottom}>
        <TouchableOpacity
          style={[bStyles.statusBtn, paid ? bStyles.statusPaid : isOverdue ? bStyles.statusOverdue : bStyles.statusPending]}
          onPress={onToggle}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons
            name={paid ? 'check-circle-outline' : 'circle-outline'}
            size={14}
            color={paid ? Colors.secondary : isOverdue ? Colors.tertiary : Colors.onSurfaceVariant}
          />
          <Text style={[bStyles.statusText, paid ? bStyles.statusTextPaid : isOverdue ? bStyles.statusTextOverdue : bStyles.statusTextPending]}>
            {paid ? 'PAGO' : isOverdue ? 'ATRASADO' : 'PENDENTE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} hitSlop={10} style={bStyles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={`${Colors.tertiary}80`} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const bStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceHighest, borderWidth: 1,
    borderColor: `${Colors.outline}30`, padding: 12, gap: 10,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1, gap: 2, paddingRight: 8 },
  right: { alignItems: 'flex-end', gap: 2 },
  name: { fontFamily: 'VT323', fontSize: 18, color: Colors.onSurface, letterSpacing: 0.5 },
  day: { fontFamily: 'VT323', fontSize: 11, color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  dayToday: { color: Colors.primary },
  dayOverdue: { color: Colors.tertiary },
  paymentVia: { fontFamily: 'VT323', fontSize: 10, color: Colors.outline, letterSpacing: 1 },
  amount: { fontFamily: 'VT323', fontSize: 20, color: Colors.primary, fontVariant: ['tabular-nums'] },
  monthLabel: { fontFamily: 'VT323', fontSize: 10, color: Colors.outline, letterSpacing: 1.5 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1,
  },
  statusPaid: { backgroundColor: `${Colors.secondary}15`, borderColor: `${Colors.secondary}50` },
  statusPending: { backgroundColor: Colors.surface, borderColor: `${Colors.outline}40` },
  statusOverdue: { backgroundColor: `${Colors.tertiary}10`, borderColor: `${Colors.tertiary}50` },
  statusText: { fontFamily: 'VT323', fontSize: 14, letterSpacing: 2 },
  statusTextPaid: { color: Colors.secondary },
  statusTextPending: { color: Colors.onSurfaceVariant },
  statusTextOverdue: { color: Colors.tertiary },
  deleteBtn: { padding: 4 },
});

// ─── tela ──────────────────────────────────────────────────────────────────────

export default function BillsScreen() {
  const { getRecurringBills, addBill, deleteBill } = useBillStore();
  const { isPaid, setPaid } = useBillPaymentStore();
  const [showForm, setShowForm] = useState(false);

  const monthKey = currentMonthKey();
  const bills = getRecurringBills();

  // autoMarkDue removido — pagamento só marcado manualmente pelo usuário

  const totalMonthly = bills.reduce((s, b) => s + b.amount_cents, 0);
  const totalPaid = bills.filter((b) => isPaid(b.id, monthKey)).reduce((s, b) => s + b.amount_cents, 0);
  const totalPending = totalMonthly - totalPaid;

  const handleSaveBill = (name: string, amountInput: string, day: number, paymentVia: string) => {
    let cents = money(0);
    try { cents = parseBRL(amountInput || '0'); } catch { /* zero */ }
    const now = new Date().toISOString();
    addBill({
      id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      amount_cents: cents,
      category_id: null,
      due_date: now.slice(0, 10),
      is_recurring: true,
      recurrence_day: day,
      status: 'pending',
      paid_at: null,
      notes: paymentVia || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    setShowForm(false);
    // Reagenda notificações com o novo contrato
    const updated = useBillStore.getState().getRecurringBills();
    scheduleBillNotifications(updated).catch(console.warn);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remover contrato?',
      `"${name}" será removido dos registros do reino.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            deleteBill(id);
            // Reagenda sem o contrato removido
            const updated = useBillStore.getState().getRecurringBills();
            scheduleBillNotifications(updated).catch(console.warn);
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Header onBack={() => router.back()} />

      <View style={styles.body}>
        {bills.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL MENSAL</Text>
              <Text style={styles.summaryValue}>{formatBRL(money(totalMonthly))}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>PAGO</Text>
              <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{formatBRL(money(totalPaid))}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>PENDENTE</Text>
              <Text style={[styles.summaryValue, { color: totalPending > 0 ? Colors.tertiary : Colors.onSurfaceVariant }]}>
                {formatBRL(money(totalPending))}
              </Text>
            </View>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.75}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addBtnText}>NOVO CONTRATO</Text>
          </TouchableOpacity>
        )}

        {showForm && (
          <NewBillForm onSave={handleSaveBill} onCancel={() => setShowForm(false)} />
        )}

        {bills.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={32} color={Colors.outline} />
            <Text style={styles.emptyTitle}>NENHUM CONTRATO</Text>
            <Text style={styles.emptyHint}>
              Adicione assinaturas, mensalidades{'\n'}e cobranças fixas mensais.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {bills
              .sort((a, b) => (a.recurrence_day ?? 0) - (b.recurrence_day ?? 0))
              .map((bill) => (
                <BillCard
                  key={bill.id}
                  name={bill.name}
                  amountCents={bill.amount_cents}
                  recurrenceDay={bill.recurrence_day ?? 1}
                  paid={isPaid(bill.id, monthKey)}
                  onToggle={() => setPaid(bill.id, monthKey, !isPaid(bill.id, monthKey))}
                  onDelete={() => handleDelete(bill.id, bill.name)}
                  monthKey={monthKey}
                  paymentVia={bill.notes}
                />
              ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingBottom: 80 },
  body: { padding: Spacing.lg, gap: Spacing.md },
  summary: {
    flexDirection: 'row', backgroundColor: Colors.surfaceHighest,
    borderWidth: 1, borderColor: `${Colors.outline}30`, padding: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, backgroundColor: `${Colors.outline}30`, marginVertical: 4 },
  summaryLabel: { fontFamily: 'VT323', fontSize: 10, letterSpacing: 1.5, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  summaryValue: { fontFamily: 'VT323', fontSize: 18, fontVariant: ['tabular-nums'], color: Colors.onSurface },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: `${Colors.primary}50`, borderStyle: 'dashed',
    paddingVertical: 12, backgroundColor: `${Colors.primary}08`,
  },
  addBtnText: { fontFamily: 'VT323', fontSize: 16, letterSpacing: 3, color: Colors.primary },
  list: { gap: 8 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyTitle: { fontFamily: 'VT323', fontSize: 18, letterSpacing: 2, color: Colors.onSurfaceVariant },
  emptyHint: { fontFamily: 'VT323', fontSize: 13, color: Colors.outline, letterSpacing: 0.5, textAlign: 'center', lineHeight: 18 },
});
