/**
 * DatePickerModal — custom calendar with RPG medieval theme.
 */
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

interface Props {
  visible: boolean;
  value: string; // ISO date YYYY-MM-DD
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

export function DatePickerModal({ visible, value, onConfirm, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [cursor, setCursor] = useState(() => {
    const d = new Date(value + 'T12:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(value);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  // Build grid
  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isoOf = (day: number) =>
    `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isFuture = (day: number) => isoOf(day) > today;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>

          {/* Header: month navigation */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[cursor.month]} {cursor.year}
            </Text>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              hitSlop={12}
              disabled={cursor.year === new Date().getFullYear() && cursor.month >= new Date().getMonth()}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  cursor.year === new Date().getFullYear() && cursor.month >= new Date().getMonth()
                    ? Colors.outlineVariant
                    : Colors.primary
                }
              />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={styles.cell} />;
              const iso = isoOf(day);
              const isSelected = iso === selected;
              const isToday = iso === today;
              const disabled = isFuture(day);
              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                    disabled && styles.cellDisabled,
                  ]}
                  onPress={() => !disabled && setSelected(iso)}
                  activeOpacity={disabled ? 1 : 0.7}
                >
                  <Text style={[
                    styles.cellText,
                    isSelected && styles.cellTextSelected,
                    isToday && !isSelected && styles.cellTextToday,
                    disabled && styles.cellTextDisabled,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={() => onConfirm(selected)}>
              <Text style={styles.btnConfirmText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 4,
    width: 320,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthLabel: {
    ...Typography.titleMd,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cellDisabled: {
    opacity: 0.2,
  },
  cellText: {
    fontFamily: 'VT323',
    fontSize: 16,
    color: Colors.onSurface,
  },
  cellTextSelected: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  cellTextToday: {
    color: Colors.primary,
  },
  cellTextDisabled: {
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  btnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnCancelText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  btnConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  btnConfirmText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
});
