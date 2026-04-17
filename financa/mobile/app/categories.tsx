/**
 * Categories management screen.
 * Tap a category to edit it. Press + to create. Trash to delete.
 */
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { useCategoryStore, Category } from '@/store/categoryStore';
import { RPGIcon, ALL_ICONS, ICON_LABELS, RPGIconName } from '@/components/ui/RPGIcon';

type TxType = 'expense' | 'income' | 'both';

const TYPE_LABELS: Record<TxType, string> = {
  expense: 'Despesa',
  income:  'Receita',
  both:    'Ambos',
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { categories, addCategory, deleteCategory, updateCategory } = useCategoryStore();

  // null = creating new, Category = editing existing
  const [editing, setEditing] = useState<Category | null | 'new'>(null);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);

  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState<RPGIconName>('coin_bag');
  const [formType, setFormType] = useState<TxType>('expense');

  const openCreate = () => {
    setFormName('');
    setFormIcon('coin_bag');
    setFormType('expense');
    setEditing('new');
  };

  const openEdit = (cat: Category) => {
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormType(cat.type as TxType);
    setEditing(cat);
  };

  const closeModal = () => {
    setEditing(null);
    setIconPickerVisible(false);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome para a categoria.');
      return;
    }
    if (editing === 'new') {
      addCategory({ name: formName.trim(), icon: formIcon, type: formType });
    } else if (editing) {
      updateCategory(editing.id, { name: formName.trim(), icon: formIcon, type: formType });
    }
    closeModal();
  };

  const handleDelete = (cat: Category) => {
    if (cat.system) return;
    Alert.alert(
      'Excluir categoria?',
      `"${cat.name}" será removida.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteCategory(cat.id) },
      ],
    );
  };

  const isNew = editing === 'new';
  const editingCat = editing !== 'new' ? editing : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>CATEGORIAS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <MaterialCommunityIcons name="plus" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Toque numa categoria para editar o ícone ou nome.</Text>

      {/* List */}
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <RPGIcon name={item.icon} size={22} chip />

            <View style={styles.rowContent}>
              <Text style={styles.catName}>{item.name}</Text>
              <Text style={styles.catMeta}>
                {TYPE_LABELS[item.type as TxType]}{item.system ? ' · Sistema' : ''}
              </Text>
            </View>

            <MaterialCommunityIcons name="pencil-outline" size={14} color={`${Colors.onSurfaceVariant}60`} style={{ marginRight: 8 }} />

            {!item.system && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.tertiary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Create / Edit modal */}
      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>
            {isNew ? 'NOVA CATEGORIA' : `EDITAR — ${editingCat?.name.toUpperCase()}`}
          </Text>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {/* Ícone — sempre primeiro e grande */}
            <TouchableOpacity
              style={styles.iconBigBtn}
              onPress={() => setIconPickerVisible(true)}
              activeOpacity={0.7}
            >
              <RPGIcon name={formIcon} size={36} chip />
              <View style={styles.iconBigInfo}>
                <Text style={styles.iconBigName}>{ICON_LABELS[formIcon]}</Text>
                <Text style={styles.iconBigHint}>Toque para trocar o ícone</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Nome */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NOME</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Academia, Pets..."
                placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                value={formName}
                onChangeText={setFormName}
                maxLength={30}
              />
            </View>

            {/* Tipo — só edita se não for sistema */}
            {!editingCat?.system && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TIPO</Text>
                <View style={styles.typeRow}>
                  {(['expense', 'income', 'both'] as TxType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, formType === t && styles.typeChipActive]}
                      onPress={() => setFormType(t)}
                    >
                      <Text style={[styles.typeChipText, formType === t && styles.typeChipTextActive]}>
                        {TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{isNew ? 'CRIAR' : 'SALVAR'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Icon picker */}
        <Modal
          visible={iconPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIconPickerVisible(false)}
        >
          <Pressable style={styles.iconPickerBackdrop} onPress={() => setIconPickerVisible(false)}>
            <View style={styles.iconPickerCard}>
              <Text style={styles.iconPickerTitle}>ESCOLHER ÍCONE</Text>
              <ScrollView contentContainerStyle={styles.iconGrid}>
                {ALL_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconCell, formIcon === iconName && styles.iconCellActive]}
                    onPress={() => { setFormIcon(iconName); setIconPickerVisible(false); }}
                  >
                    <RPGIcon name={iconName} size={24} chip={false} />
                    <Text style={styles.iconCellLabel} numberOfLines={1}>
                      {ICON_LABELS[iconName]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceLowest },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.primaryText, fontWeight: '300' },
  title: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 22,
    letterSpacing: 2,
    color: Colors.primary,
    textAlign: 'center',
  },
  addBtn: { backgroundColor: Colors.primary, padding: 6 },

  hint: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: `${Colors.onSurfaceVariant}70`,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: `${Colors.outlineVariant}20`, marginLeft: 52 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
  },
  rowContent: { flex: 1, gap: 2 },
  catName: { fontFamily: 'VT323', fontSize: 17, color: Colors.onSurface, letterSpacing: 0.5 },
  catMeta: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 1, color: Colors.onSurfaceVariant },
  deleteBtn: { padding: 4 },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: `${Colors.surfaceLowest}AA` },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceLow,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: `${Colors.outlineVariant}50`,
    alignSelf: 'center', marginVertical: 12,
  },
  sheetTitle: {
    fontFamily: 'VT323', fontSize: 15, letterSpacing: 2,
    color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.md,
  },
  sheetBody: { paddingHorizontal: Spacing.xl, paddingBottom: 16, gap: Spacing.xl },

  iconBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    padding: Spacing.md,
  },
  iconBigInfo: { flex: 1 },
  iconBigName: { fontFamily: 'VT323', fontSize: 18, color: Colors.onSurface, letterSpacing: 1 },
  iconBigHint: { fontFamily: 'VT323', fontSize: 11, color: Colors.onSurfaceVariant, letterSpacing: 1 },

  field: { gap: 8 },
  fieldLabel: {
    fontFamily: 'VT323', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 2, color: Colors.onSurfaceVariant,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'VT323', fontSize: 18, color: Colors.onSurface,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  typeChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}60` },
  typeChipText: { fontFamily: 'VT323', fontSize: 13, letterSpacing: 1, color: Colors.onSurfaceVariant },
  typeChipTextActive: { color: Colors.primary },

  saveBtn: {
    backgroundColor: Colors.primary, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm,
  },
  saveBtnText: {
    fontFamily: 'VT323', fontSize: 17, textTransform: 'uppercase',
    letterSpacing: 2, color: Colors.onPrimary,
  },

  iconPickerBackdrop: {
    flex: 1, backgroundColor: '#000000CC',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  iconPickerCard: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    width: '100%', maxHeight: '85%',
  },
  iconPickerTitle: {
    fontFamily: 'VT323', fontSize: 14, textTransform: 'uppercase',
    letterSpacing: 2, color: Colors.onSurfaceVariant,
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 4 },
  iconCell: {
    width: 72, alignItems: 'center', padding: 8, gap: 6,
    backgroundColor: Colors.surface,
  },
  iconCellActive: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1, borderColor: `${Colors.primary}60`,
  },
  iconCellLabel: {
    fontFamily: 'VT323', fontSize: 10, letterSpacing: 0.5,
    color: Colors.onSurfaceVariant, textAlign: 'center',
  },
});
