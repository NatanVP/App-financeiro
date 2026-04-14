/**
 * More/Settings screen — allocation sliders, Telegram status, sync, DB export.
 */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAllocationStore } from '@/store/allocationStore';
import { useSyncStore } from '@/store/syncStore';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { reservePct, debtsPct, goalsPct, setAllocation } = useAllocationStore();
  const { status, lastSyncAt } = useSyncStore();

  const [reserve, setReserve] = useState(reservePct);
  const [debts, setDebts] = useState(debtsPct);
  const [goals, setGoals] = useState(goalsPct);

  const total = reserve + debts + goals;
  const isValid = total === 100;

  const onSaveAllocation = () => {
    if (!isValid) {
      Alert.alert('Erro', `Os percentuais devem somar 100%. Total atual: ${total}%`);
      return;
    }
    setAllocation(reserve, debts, goals);
    Alert.alert('Salvo', 'Política de alocação atualizada.');
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      {/* Allocation section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>POLÍTICA DE ALOCAÇÃO</Text>
          <Text style={[styles.totalBadge, !isValid && { color: Colors.tertiary }]}>
            TOTAL {total}%
          </Text>
        </View>

        <View style={styles.card}>
          <AllocationSlider
            label="Reserva"
            value={reserve}
            onValueChange={setReserve}
            color={Colors.secondary}
          />
          <AllocationSlider
            label="Dívidas"
            value={debts}
            onValueChange={setDebts}
            color={Colors.tertiary}
          />
          <AllocationSlider
            label="Metas"
            value={goals}
            onValueChange={setGoals}
            color={Colors.primary}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
          onPress={onSaveAllocation}
        >
          <Text style={styles.saveBtnText}>Salvar Alocação</Text>
        </TouchableOpacity>
      </View>

      {/* Telegram & Sync */}
      <View style={styles.twoColRow}>
        {/* Telegram */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionLabel}>BOT TELEGRAM</Text>
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="send-circle-outline" size={28} color="#29B6F6" style={styles.statusIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Status do Bot</Text>
              <Text style={styles.statusSub}>@financa_ledger_bot</Text>
            </View>
            <View style={styles.statusIndicator}>
              <View style={styles.greenDot} />
              <Text style={styles.statusLabel}>Ativo</Text>
            </View>
          </View>
        </View>

        {/* Sync */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionLabel}>SINCRONIZAÇÃO</Text>
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="cloud-sync-outline" size={28} color={Colors.primary} style={styles.statusIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Cloud Ledger</Text>
              <Text style={styles.statusSub}>Uptime: 99.9%</Text>
            </View>
            <View>
              <Text style={styles.statusLabelRight}>Sincronizado</Text>
              <Text style={styles.statusDate}>
                {lastSyncAt ? new Date(lastSyncAt).toLocaleDateString('pt-BR') : '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation shortcuts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MÓDULOS</Text>
        <View style={styles.card}>
          {[
            { label: 'Orçamentos', route: '/budgets' },
            { label: 'Contas a Pagar', route: '/bills' },
            { label: 'Dívidas', route: '/debts' },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => router.push(item.route as never)}
            >
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Advanced modules */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FERRAMENTAS AVANÇADAS</Text>
        <View style={styles.card}>
          {[
            { label: 'Recorrências', route: '/recurrences', desc: 'Transações automáticas diárias' },
            { label: 'Provisões Anuais', route: '/provisions', desc: 'IPVA, seguro, assinaturas anuais' },
            { label: 'Reserva de Emergência', route: '/emergency-reserve', desc: 'Meta de cobertura de despesas' },
            { label: 'Plano de Quitação', route: '/debts/plan', desc: 'Avalanche vs. Bola de Neve' },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItemAdvanced}
              onPress={() => router.push(item.route as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>{item.label}</Text>
                <Text style={styles.menuItemDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* DB Export */}
      <TouchableOpacity style={styles.exportBtn}>
        <Text style={styles.exportIcon}>🗃</Text>
        <Text style={styles.exportText}>EXPORTAR BANCO DE DADOS</Text>
      </TouchableOpacity>
      <Text style={styles.exportMeta}>FORMATO SQLITE3 V1.0.0 • CRIPTOGRAFIA AES-256</Text>
    </ScrollView>
  );
}

function AllocationSlider({
  label,
  value,
  onValueChange,
  color,
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  color: string;
}) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.row}>
        <Text style={sliderStyles.label}>{label}</Text>
        <Text style={[sliderStyles.value, { color }]}>{value}%</Text>
      </View>
      <Slider
        style={{ height: 24 }}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={value}
        onValueChange={(v) => onValueChange(Math.round(v))}
        minimumTrackTintColor={color}
        maximumTrackTintColor={Colors.surface}
        thumbTintColor={color}
      />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...Typography.bodySm, color: Colors.onSurface, opacity: 0.8 },
  value: { ...Typography.bodySm, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  header: { height: 56, justifyContent: 'center' },
  title: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: Colors.onSurface, opacity: 0.6, fontWeight: '600' },
  section: { gap: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '500', color: Colors.onSurfaceVariant },
  totalBadge: { fontSize: 12, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: Colors.surfaceLow, padding: Spacing.xl, gap: Spacing.xl },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Typography.labelSm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: Colors.onPrimary },
  twoColRow: { flexDirection: 'row', gap: Spacing.md },
  statusCard: { backgroundColor: Colors.surfaceLow, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusIcon: {},
  statusTitle: { ...Typography.bodySm, fontWeight: '500' },
  statusSub: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontVariant: ['tabular-nums'] },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.secondary },
  statusLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: Colors.secondary },
  statusLabelRight: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: Colors.onSurface, opacity: 0.9, textAlign: 'right' },
  statusDate: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontVariant: ['tabular-nums'], textAlign: 'right' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  menuItemAdvanced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  menuItemText: { ...Typography.bodySm, color: Colors.onSurface },
  menuItemDesc: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  chevron: { color: Colors.onSurfaceVariant, fontSize: 18 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  exportIcon: { fontSize: 18 },
  exportText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: Colors.primaryText },
  exportMeta: { textAlign: 'center', fontSize: 10, color: Colors.onSurfaceVariant, opacity: 0.5, fontVariant: ['tabular-nums'], marginTop: -8 },
});
