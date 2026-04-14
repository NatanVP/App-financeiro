/**
 * Recurrences screen — list and manage recurring transactions.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { useRecurrenceStore, Recurrence } from '@/store/recurrenceStore';

const FREQ_LABELS: Record<string, string> = {
  'FREQ=DAILY': 'Diário',
  'FREQ=WEEKLY': 'Semanal',
  'FREQ=MONTHLY': 'Mensal',
  'FREQ=YEARLY': 'Anual',
};

function rruleLabel(rrule: string): string {
  for (const [key, label] of Object.entries(FREQ_LABELS)) {
    if (rrule.includes(key)) return label;
  }
  return rrule;
}

function formatNextRun(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseAmount(templateJson: string): string {
  try {
    const t = JSON.parse(templateJson) as { amount_cents?: number; type?: string };
    if (!t.amount_cents) return '';
    const reais = t.amount_cents / 100;
    const sign = t.type === 'income' ? '+' : '-';
    return `${sign}R$ ${reais.toFixed(2).replace('.', ',')}`;
  } catch {
    return '';
  }
}

export default function RecurrencesScreen() {
  const { recurrences, updateRecurrence } = useRecurrenceStore();
  const active = recurrences.filter((r) => !r.deleted_at);

  const handleToggle = useCallback(
    (id: string, active: boolean) => updateRecurrence(id, { active }),
    [updateRecurrence],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Recorrências</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Transações recorrentes são criadas automaticamente pelo servidor todo dia às 06h.
            Pause uma recorrência sem perder o histórico.
          </Text>
        </View>

        {active.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhuma recorrência</Text>
            <Text style={styles.emptySubtitle}>Toque em + para criar uma transação recorrente</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {active.map((r) => (
              <View key={r.id} style={[styles.card, !r.active && styles.cardPaused]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{r.name}</Text>
                    <Text style={styles.cardAmount}>{parseAmount(r.template_json)}</Text>
                  </View>
                  <Switch
                    value={r.active}
                    onValueChange={(v) => handleToggle(r.id, v)}
                    trackColor={{ false: Colors.surfaceHighest, true: `${Colors.primary}60` }}
                    thumbColor={r.active ? Colors.primary : Colors.outline}
                  />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardMetaText}>{rruleLabel(r.rrule)}</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.cardMetaText}>
                    Próximo: {formatNextRun(r.next_run)}
                  </Text>
                  {!r.active && (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={[styles.cardMetaText, { color: Colors.outline }]}>Pausado</Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/recurrences/new')}>
        <LinearGradient colors={PrimaryGradient.colors} start={PrimaryGradient.start} end={PrimaryGradient.end} style={styles.fabGradient}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceLowest },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.primaryText, fontWeight: '300' },
  headerTitle: { flex: 1, ...Typography.headlineSm, color: Colors.primary, textAlign: 'center' },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  infoCard: {
    backgroundColor: `${Colors.primary}10`,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
    marginTop: Spacing.xs,
  },
  infoText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, lineHeight: 18 },

  list: { gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    gap: Spacing.sm,
  },
  cardPaused: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flex: 1, gap: 2 },
  cardName: { ...Typography.titleSm, color: Colors.onSurface },
  cardAmount: { fontSize: 16, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.outline },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { ...Typography.titleSm, color: Colors.onSurfaceVariant },
  emptySubtitle: { ...Typography.bodySm, color: `${Colors.onSurfaceVariant}80` },

  fab: {
    position: 'absolute', right: 24, bottom: 24,
    width: 56, height: 56, borderRadius: BorderRadius.lg, overflow: 'hidden', elevation: 8,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { fontSize: 28, fontWeight: '300', color: Colors.onPrimary, lineHeight: 32 },
});
