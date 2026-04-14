import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAnnualProvisionStore } from "../store/annualProvisionStore";
import { formatMoney } from "../utils/money";
import type { AnnualProvision } from "../store/annualProvisionStore";

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function ProvisionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: AnnualProvision;
  onEdit: (item: AnnualProvision) => void;
  onDelete: (id: string) => void;
}) {
  const monthly = Math.ceil(item.annual_amount_cents / 12);
  const remaining = item.annual_amount_cents - item.accumulated_cents;
  const pct = Math.min(
    100,
    Math.round((item.accumulated_cents / item.annual_amount_cents) * 100),
  );
  const dueMonth = MONTH_NAMES[(item.due_month ?? 12) - 1];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.dueChip}>{dueMonth}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <MaterialIcons name="edit" size={16} color="#908fa0" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Excluir", `Excluir "${item.name}"?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => onDelete(item.id) },
              ])
            }
            style={styles.iconBtn}
          >
            <MaterialIcons name="delete-outline" size={16} color="#ffb3ae" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>ANUAL</Text>
          <Text style={styles.metaValue}>{formatMoney(item.annual_amount_cents)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>MENSAL</Text>
          <Text style={[styles.metaValue, { color: "#c0c1ff" }]}>
            {formatMoney(monthly)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>FALTAM</Text>
          <Text style={[styles.metaValue, { color: remaining > 0 ? "#ffb3ae" : "#69dc99" }]}>
            {remaining > 0 ? formatMoney(remaining) : "Quitado"}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Acumulado</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: pct >= 100 ? "#69dc99" : "#c0c1ff" },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

type FormState = {
  name: string;
  annual_amount: string;
  due_month: string;
  accumulated: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  annual_amount: "",
  due_month: "12",
  accumulated: "0",
};

export default function ProvisionsScreen() {
  const { provisions, fetchProvisions, createProvision, updateProvision, deleteProvision } =
    useAnnualProvisionStore();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AnnualProvision | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setLoading(true);
    fetchProvisions().finally(() => setLoading(false));
  }, [fetchProvisions]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = useCallback((item: AnnualProvision) => {
    setEditing(item);
    setForm({
      name: item.name,
      annual_amount: String(item.annual_amount_cents / 100),
      due_month: String(item.due_month ?? 12),
      accumulated: String(item.accumulated_cents / 100),
    });
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProvision(id);
    },
    [deleteProvision],
  );

  const handleSave = async () => {
    const annualCents = Math.round(parseFloat(form.annual_amount.replace(",", ".")) * 100);
    const accCents = Math.round(parseFloat(form.accumulated.replace(",", ".") || "0") * 100);
    const dueMonth = parseInt(form.due_month, 10);

    if (!form.name.trim() || isNaN(annualCents) || annualCents <= 0) {
      Alert.alert("Erro", "Informe nome e valor anual válidos.");
      return;
    }

    if (editing) {
      await updateProvision(editing.id, {
        name: form.name.trim(),
        annual_amount_cents: annualCents,
        due_month: dueMonth,
        accumulated_cents: accCents,
      });
    } else {
      await createProvision({
        name: form.name.trim(),
        annual_amount_cents: annualCents,
        due_month: dueMonth,
        accumulated_cents: accCents,
      });
    }
    setShowModal(false);
  };

  const active = provisions.filter((p) => !p.deleted_at);
  const totalAnnual = active.reduce((s, p) => s + p.annual_amount_cents, 0);
  const totalMonthly = active.reduce((s, p) => s + Math.ceil(p.annual_amount_cents / 12), 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Provisões Anuais</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <MaterialIcons name="add" size={20} color="#1000a9" />
        </TouchableOpacity>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>TOTAL ANUAL</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalAnnual)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PROVISIONAMENTO MENSAL</Text>
          <Text style={[styles.summaryValue, { color: "#c0c1ff" }]}>
            {formatMoney(totalMonthly)}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#c0c1ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={active}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <ProvisionCard item={item} onEdit={openEdit} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="event-note" size={40} color="#464554" />
              <Text style={styles.emptyText}>Nenhuma provisão cadastrada</Text>
              <Text style={styles.emptyHint}>
                Provisões são gastos anuais divididos em 12 parcelas mensais (IPVA, seguro, etc.)
              </Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {editing ? "Editar Provisão" : "Nova Provisão"}
            </Text>

            <Text style={styles.fieldLabel}>NOME</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: IPVA, Seguro Auto…"
              placeholderTextColor="#464554"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />

            <Text style={styles.fieldLabel}>VALOR ANUAL (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#464554"
              keyboardType="decimal-pad"
              value={form.annual_amount}
              onChangeText={(v) => setForm((f) => ({ ...f, annual_amount: v }))}
            />

            <Text style={styles.fieldLabel}>MÊS DE VENCIMENTO</Text>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((m, idx) => {
                const val = String(idx + 1);
                const sel = form.due_month === val;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, sel && styles.monthChipSel]}
                    onPress={() => setForm((f) => ({ ...f, due_month: val }))}
                  >
                    <Text style={[styles.monthChipText, sel && styles.monthChipTextSel]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {editing && (
              <>
                <Text style={styles.fieldLabel}>JÁ ACUMULADO (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#464554"
                  keyboardType="decimal-pad"
                  value={form.accumulated}
                  onChangeText={(v) => setForm((f) => ({ ...f, accumulated: v }))}
                />
              </>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0e0e10" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(70,69,84,0.15)",
  },
  headerTitle: { color: "#c0c1ff", fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  addBtn: {
    backgroundColor: "#c0c1ff",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    margin: 16,
    backgroundColor: "#1b1b1d",
    borderRadius: 8,
    flexDirection: "row",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.1)",
  },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, backgroundColor: "rgba(70,69,84,0.2)", marginHorizontal: 16 },
  summaryLabel: {
    fontSize: 9,
    color: "#908fa0",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryValue: { fontSize: 18, fontWeight: "900", color: "#e5e1e4", letterSpacing: -0.5 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#201f21",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.15)",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { color: "#e5e1e4", fontSize: 13, fontWeight: "700" },
  dueChip: {
    backgroundColor: "rgba(192,193,255,0.1)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: "#c0c1ff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 4 },
  metaRow: { flexDirection: "row", marginBottom: 12 },
  metaItem: { flex: 1 },
  metaLabel: {
    fontSize: 8,
    color: "#908fa0",
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 2,
  },
  metaValue: { fontSize: 13, fontWeight: "700", color: "#e5e1e4" },
  progressContainer: {},
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: { fontSize: 9, color: "#908fa0", fontWeight: "700", letterSpacing: 1 },
  progressPct: { fontSize: 9, color: "#908fa0", fontWeight: "700" },
  progressTrack: {
    height: 4,
    backgroundColor: "#0e0e10",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#908fa0", fontSize: 14, fontWeight: "600" },
  emptyHint: { color: "#464554", fontSize: 12, textAlign: "center", paddingHorizontal: 32 },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(14,14,16,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1b1b1d",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(70,69,84,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#e5e1e4",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    fontSize: 9,
    color: "#908fa0",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#201f21",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e1e4",
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(192,193,255,0.3)",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#201f21",
    minWidth: 44,
    alignItems: "center",
  },
  monthChipSel: { backgroundColor: "#c0c1ff" },
  monthChipText: { color: "#908fa0", fontSize: 11, fontWeight: "600" },
  monthChipTextSel: { color: "#1000a9" },
  saveBtn: {
    marginTop: 24,
    backgroundColor: "#c0c1ff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#1000a9", fontWeight: "800", fontSize: 13, letterSpacing: 1 },
  cancelBtn: { marginTop: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: "#908fa0", fontSize: 13 },
});
