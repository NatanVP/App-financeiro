import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useEmergencyReserveStore } from "../store/emergencyReserveStore";
import { useAccountStore } from "../store/accountStore";
import { formatMoney } from "../utils/money";

const SHIELD_LEVELS = [
  { months: 1, label: "Básico", color: "#ffb3ae" },
  { months: 3, label: "Recomendado", color: "#c0c1ff" },
  { months: 6, label: "Confortável", color: "#69dc99" },
  { months: 12, label: "Sólido", color: "#86f9b3" },
];

export default function EmergencyReserveScreen() {
  const { reserve, fetchReserve, updateReserve } = useEmergencyReserveStore();
  const { accounts } = useAccountStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState(300000); // 3000 BRL default
  const [targetMonths, setTargetMonths] = useState(6);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchReserve().finally(() => setLoading(false));
  }, [fetchReserve]);

  useEffect(() => {
    if (reserve) {
      setTargetMonths(reserve.target_months);
      setAccountId(reserve.account_id ?? null);
    }
  }, [reserve]);

  const targetCents = targetMonths * monthlyExpenses;
  const currentCents = reserve?.current_cents ?? 0;
  const pct = targetCents > 0 ? Math.min(100, Math.round((currentCents / targetCents) * 100)) : 0;
  const remainingCents = Math.max(0, targetCents - currentCents);
  const level = SHIELD_LEVELS.reduce(
    (best, l) => (targetMonths >= l.months ? l : best),
    SHIELD_LEVELS[0],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReserve({
        target_months: targetMonths,
        target_cents: targetCents,
        account_id: accountId ?? undefined,
      });
      Alert.alert("Salvo", "Meta de reserva atualizada.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color="#c0c1ff" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reserva de Emergência</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>ACUMULADO</Text>
              <Text style={styles.heroValue}>{formatMoney(currentCents)}</Text>
            </View>
            <View style={[styles.levelBadge, { borderColor: level.color }]}>
              <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%`, backgroundColor: level.color },
              ]}
            />
          </View>

          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroStatLabel}>META</Text>
              <Text style={styles.heroStatValue}>{formatMoney(targetCents)}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.heroStatLabel}>PROGRESSO</Text>
              <Text style={[styles.heroStatValue, { color: level.color }]}>{pct}%</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.heroStatLabel}>FALTAM</Text>
              <Text style={[styles.heroStatValue, { color: remainingCents > 0 ? "#ffb3ae" : "#69dc99" }]}>
                {remainingCents > 0 ? formatMoney(remainingCents) : "Meta atingida!"}
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly expenses estimate */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESPESAS MENSAIS ESTIMADAS</Text>
          <View style={styles.expenseRow}>
            <TouchableOpacity
              style={styles.expenseBtn}
              onPress={() => setMonthlyExpenses((v) => Math.max(50000, v - 50000))}
            >
              <MaterialIcons name="remove" size={18} color="#c0c1ff" />
            </TouchableOpacity>
            <Text style={styles.expenseValue}>{formatMoney(monthlyExpenses)}/mês</Text>
            <TouchableOpacity
              style={styles.expenseBtn}
              onPress={() => setMonthlyExpenses((v) => v + 50000)}
            >
              <MaterialIcons name="add" size={18} color="#c0c1ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Target months slider */}
        <View style={styles.section}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.sectionLabel}>MESES DE COBERTURA</Text>
            <Text style={styles.sliderValue}>{targetMonths} meses</Text>
          </View>
          <Slider
            minimumValue={1}
            maximumValue={24}
            step={1}
            value={targetMonths}
            onValueChange={setTargetMonths}
            minimumTrackTintColor="#c0c1ff"
            maximumTrackTintColor="#201f21"
            thumbTintColor="#c0c1ff"
            style={styles.slider}
          />
          <View style={styles.levelRow}>
            {SHIELD_LEVELS.map((l) => (
              <TouchableOpacity
                key={l.months}
                onPress={() => setTargetMonths(l.months)}
                style={[
                  styles.levelBtn,
                  targetMonths === l.months && { borderColor: l.color },
                ]}
              >
                <Text style={[styles.levelBtnText, targetMonths >= l.months && { color: l.color }]}>
                  {l.months}m
                </Text>
                <Text style={styles.levelBtnLabel}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account link */}
        {accounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTA VINCULADA</Text>
            <View style={styles.accountList}>
              {accounts
                .filter((a) => !a.deleted_at)
                .map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChip,
                      accountId === acc.id && styles.accountChipSel,
                    ]}
                    onPress={() => setAccountId(accountId === acc.id ? null : acc.id)}
                  >
                    <Text
                      style={[
                        styles.accountChipText,
                        accountId === acc.id && styles.accountChipTextSel,
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={14} color="#908fa0" />
          <Text style={styles.infoText}>
            Especialistas recomendam 3–6 meses de despesas em conta de alta liquidez (Selic, CDB
            diário). Ajuste conforme estabilidade de renda.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#1000a9" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar Meta</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0e0e10" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(70,69,84,0.15)",
  },
  headerTitle: { color: "#c0c1ff", fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  scroll: { padding: 16, paddingBottom: 100 },
  heroCard: {
    backgroundColor: "#1b1b1d",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.1)",
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  heroLabel: {
    fontSize: 9,
    color: "#908fa0",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#e5e1e4",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  levelText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  progressTrack: {
    height: 6,
    backgroundColor: "#0e0e10",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  heroStats: { flexDirection: "row", justifyContent: "space-between" },
  heroStatLabel: {
    fontSize: 8,
    color: "#908fa0",
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 2,
  },
  heroStatValue: { fontSize: 13, fontWeight: "700", color: "#e5e1e4" },
  section: {
    backgroundColor: "#1b1b1d",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.1)",
  },
  sectionLabel: {
    fontSize: 9,
    color: "#908fa0",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 12,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#201f21",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseValue: {
    color: "#e5e1e4",
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sliderLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sliderValue: { fontSize: 13, fontWeight: "700", color: "#c0c1ff" },
  slider: { marginHorizontal: -4, marginBottom: 12 },
  levelRow: { flexDirection: "row", justifyContent: "space-between" },
  levelBtn: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#201f21",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  levelBtnText: { color: "#908fa0", fontSize: 12, fontWeight: "700" },
  levelBtnLabel: { color: "#464554", fontSize: 8, marginTop: 2 },
  accountList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#201f21",
    borderWidth: 1,
    borderColor: "transparent",
  },
  accountChipSel: { borderColor: "#c0c1ff", backgroundColor: "rgba(192,193,255,0.08)" },
  accountChipText: { color: "#908fa0", fontSize: 12, fontWeight: "600" },
  accountChipTextSel: { color: "#c0c1ff" },
  infoCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(70,69,84,0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: { color: "#908fa0", fontSize: 11, flex: 1, lineHeight: 16 },
  saveBtn: {
    backgroundColor: "#c0c1ff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#1000a9", fontWeight: "800", fontSize: 13, letterSpacing: 1 },
});
