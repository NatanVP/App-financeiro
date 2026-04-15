/**
 * Transaction detail screen — shows full info, allows delete.
 */
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore } from '@/store/transactionStore';
import { CATEGORY_MAP } from '@/constants/categories';

const TYPE_LABEL: Record<string, string> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
};

const TYPE_COLOR: Record<string, string> = {
  expense: Colors.tertiary,
  income: Colors.secondary,
  transfer: Colors.primary,
};

function formatDatePtBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction } = useTransactionStore();

  const tx = transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhe</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Transação não encontrada.</Text>
        </View>
      </View>
    );
  }

  const category = tx.category_id ? CATEGORY_MAP[tx.category_id] : null;
  const typeColor = TYPE_COLOR[tx.type] ?? Colors.primary;

  const handleDelete = () => {
    Alert.alert(
      'Excluir transação',
      `Deseja excluir "${tx.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(tx.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhe</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={Colors.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Amount hero */}
        <View style={styles.amountCard}>
          <Text style={[styles.typeLabel, { color: typeColor }]}>
            {TYPE_LABEL[tx.type] ?? tx.type}
          </Text>
          <Text style={[styles.amount, { color: typeColor }]}>
            {tx.type === 'expense' ? '−' : '+'} G$ {formatBRL(money(tx.amount_cents))}
          </Text>
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <Row label="Descrição" value={tx.description} />
          <Divider />
          <Row label="Data" value={formatDatePtBR(tx.date)} />
          <Divider />
          {category && (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Categoria</Text>
                <View style={styles.catValue}>
                  <MaterialCommunityIcons name={category.icon} size={16} color={Colors.primary} />
                  <Text style={styles.rowValue}>{category.name}</Text>
                </View>
              </View>
              <Divider />
            </>
          )}
          <Row label="Conta" value="Nubank" />
          <Divider />
          <Row label="Reconciliado" value={tx.is_reconciled ? 'Sim' : 'Não'} />
          {tx.notes ? (
            <>
              <Divider />
              <Row label="Notas" value={tx.notes} />
            </>
          ) : null}
        </View>

        {/* Timestamps */}
        <Text style={styles.meta}>
          Criado: {new Date(tx.created_at).toLocaleString('pt-BR')}
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  title: { ...Typography.headlineSm, color: Colors.primary },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  amountCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 4,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  typeLabel: {
    ...Typography.labelSm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  amount: {
    fontFamily: 'VT323',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  infoCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  rowLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  rowValue: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  catValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: Spacing.lg },
  meta: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    opacity: 0.5,
    textAlign: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...Typography.titleMd, color: Colors.onSurfaceVariant },
});
