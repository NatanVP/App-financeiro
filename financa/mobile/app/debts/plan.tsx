import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { formatMoney } from "../../utils/money";
import { api } from "../../services/api";

type DebtPayoffItem = {
  debt_id: string;
  name: string;
  original_balance_cents: number;
  rate_monthly: number;
  months_to_payoff: number;
  total_interest_cents: number;
  is_critical: boolean;
  payoff_order: number;
};

type PlanResult = {
  avalanche: DebtPayoffItem[];
  snowball: DebtPayoffItem[];
  comparison: {
    avalanche_total_interest_cents: number;
    snowball_total_interest_cents: number;
    avalanche_months: number;
    snowball_months: number;
    interest_saved_by_avalanche_cents: number;
    months_saved_by_avalanche: number;
  };
};

type Strategy = "avalanche" | "snowball";

function StrategyTag({ strategy }: { strategy: Strategy }) {
  return (
    <View style={[styles.strategyTag, strategy === "avalanche" ? styles.tagAvalanche : styles.tagSnowball]}>
      <MaterialIcons
        name={strategy === "avalanche" ? "trending_down" : "ac-unit"}
        size={10}
        color={strategy === "avalanche" ? "#c0c1ff" : "#69dc99"}
      />
      <Text style={[styles.strategyTagText, strategy === "avalanche" ? { color: "#c0c1ff" } : { color: "#69dc99" }]}>
        {strategy === "avalanche" ? "AVALANCHE" : "BOLA DE NEVE"}
      </Text>
    </View>
  );
}

function DebtRow({ item, rank }: { item: DebtPayoffItem; rank: number }) {
  return (
    <View style={[styles.debtRow, item.is_critical && styles.debtRowCritical]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.debtInfo}>
        <View style={styles.debtNameRow}>
          <Text style={styles.debtName}>{item.name}</Text>
          {item.is_critical && (
            <View style={styles.criticalChip}>
              <Text style={styles.criticalChipText}>CRÍTICA</Text>
            </View>
          )}
        </View>
        <Text style={styles.debtMeta}>
          {(item.rate_monthly * 100).toFixed(1)}% a.m. ·{" "}
          {formatMoney(item.original_balance_cents)}
        </Text>
      </View>
      <View style={styles.debtResult}>
        <Text style={styles.debtMonths}>{item.months_to_payoff}m</Text>
        <Text style={styles.debtInterest}>{formatMoney(item.total_interest_cents)}</Text>
      </View>
    </View>
  );
}

export default function DebtPlanScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("");
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("avalanche");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = useCallback(async () => {
    const budgetCents = Math.round(parseFloat(budget.replace(",", ".")) * 100);
    if (isNaN(budgetCents) || budgetCents <= 0) {
      Alert.alert("Erro", "Informe um orçamento mensal válido.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<PlanResult>(
        `/debts/plan?monthly_budget_cents=${budgetCents}&strategy=both`,
      );
      setResult(data);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível calcular o plano.");
    } finally {
      setLoading(false);
    }
  }, [budget]);

  const comparison = result?.comparison;
  const currentData = result ? result[activeStrategy] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color="#e5e1e4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plano de Quitação</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Budget input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>ORÇAMENTO MENSAL PARA DÍVIDAS</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>R$</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#464554"
              keyboardType="decimal-pad"
              value={budget}
              onChangeText={setBudget}
            />
          </View>
          <TouchableOpacity
            style={[styles.calcBtn, loading && { opacity: 0.6 }]}
            onPress={handleCalculate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1000a9" />
            ) : (
              <Text style={styles.calcBtnText}>Calcular Plano</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && comparison && (
          <>
            {/* Comparison summary */}
            <View style={styles.comparisonCard}>
              <Text style={styles.sectionLabel}>COMPARAÇÃO DE ESTRATÉGIAS</Text>
              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonCol}>
                  <StrategyTag strategy="avalanche" />
                  <Text style={styles.compValue}>{comparison.avalanche_months}m</Text>
                  <Text style={styles.compLabel}>para quitar</Text>
                  <Text style={[styles.compValue, { color: "#ffb3ae", marginTop: 8 }]}>
                    {formatMoney(comparison.avalanche_total_interest_cents)}
                  </Text>
                  <Text style={styles.compLabel}>total em juros</Text>
                </View>
                <View style={styles.comparisonDivider} />
                <View style={styles.comparisonCol}>
                  <StrategyTag strategy="snowball" />
                  <Text style={styles.compValue}>{comparison.snowball_months}m</Text>
                  <Text style={styles.compLabel}>para quitar</Text>
                  <Text style={[styles.compValue, { color: "#ffb3ae", marginTop: 8 }]}>
                    {formatMoney(comparison.snowball_total_interest_cents)}
                  </Text>
                  <Text style={styles.compLabel}>total em juros</Text>
                </View>
              </View>

              {comparison.interest_saved_by_avalanche_cents > 0 && (
                <View style={styles.savingsBanner}>
                  <MaterialIcons name="savings" size={14} color="#69dc99" />
                  <Text style={styles.savingsText}>
                    Avalanche economiza{" "}
                    <Text style={{ color: "#69dc99", fontWeight: "800" }}>
                      {formatMoney(comparison.interest_saved_by_avalanche_cents)}
                    </Text>
                    {comparison.months_saved_by_avalanche > 0 &&
                      ` e ${comparison.months_saved_by_avalanche} meses`}{" "}
                    em relação à Bola de Neve.
                  </Text>
                </View>
              )}
            </View>

            {/* Strategy selector */}
            <View style={styles.strategySelector}>
              <TouchableOpacity
                style={[styles.strategyBtn, activeStrategy === "avalanche" && styles.strategyBtnActive]}
                onPress={() => setActiveStrategy("avalanche")}
              >
                <Text style={[styles.strategyBtnText, activeStrategy === "avalanche" && { color: "#c0c1ff" }]}>
                  Avalanche
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.strategyBtn, activeStrategy === "snowball" && styles.strategyBtnActive]}
                onPress={() => setActiveStrategy("snowball")}
              >
                <Text style={[styles.strategyBtnText, activeStrategy === "snowball" && { color: "#69dc99" }]}>
                  Bola de Neve
                </Text>
              </TouchableOpacity>
            </View>

            {/* Strategy explanation */}
            <View style={styles.explanationCard}>
              {activeStrategy === "avalanche" ? (
                <Text style={styles.explanationText}>
                  <Text style={{ color: "#c0c1ff", fontWeight: "700" }}>Avalanche:</Text> Paga
                  mínimo em todas as dívidas e direciona o extra para a de maior taxa. Minimiza
                  juros totais.{" "}
                  <Text style={{ color: "#ffb3ae" }}>Dívidas críticas (≥8% a.m.) sempre primeiro.</Text>
                </Text>
              ) : (
                <Text style={styles.explanationText}>
                  <Text style={{ color: "#69dc99", fontWeight: "700" }}>Bola de Neve:</Text> Paga
                  mínimo em todas e direciona o extra para a de menor saldo. Gera vitórias rápidas,
                  porém paga mais juros.{" "}
                  <Text style={{ color: "#ffb3ae" }}>Dívidas críticas (≥8% a.m.) sempre primeiro.</Text>
                </Text>
              )}
            </View>

            {/* Debt list */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>ORDEM</Text>
                <Text style={styles.listHeaderText}>DÍVIDA</Text>
                <Text style={[styles.listHeaderText, { textAlign: "right" }]}>
                  PRAZO · JUROS
                </Text>
              </View>
              {currentData?.map((item, idx) => (
                <DebtRow key={item.debt_id} item={item} rank={idx + 1} />
              ))}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <MaterialIcons name="info-outline" size={12} color="#464554" />
              <Text style={styles.disclaimerText}>
                Simulação assumindo taxas fixas e que o orçamento mensal é constante. Valores
                são aproximações para planejamento.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0e0e10" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(70,69,84,0.15)",
  },
  backBtn: { width: 32 },
  headerTitle: { color: "#c0c1ff", fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  scroll: { padding: 16, paddingBottom: 100 },
  inputCard: {
    backgroundColor: "#1b1b1d",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.1)",
  },
  inputLabel: {
    fontSize: 9,
    color: "#908fa0",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(192,193,255,0.3)",
    marginBottom: 20,
    paddingBottom: 8,
  },
  currency: { color: "#908fa0", fontSize: 20, fontWeight: "700", marginRight: 6 },
  input: {
    flex: 1,
    color: "#e5e1e4",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  calcBtn: {
    backgroundColor: "#c0c1ff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  calcBtnText: { color: "#1000a9", fontWeight: "800", fontSize: 13, letterSpacing: 1 },
  // Comparison
  comparisonCard: {
    backgroundColor: "#1b1b1d",
    borderRadius: 12,
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
    marginBottom: 16,
  },
  comparisonGrid: { flexDirection: "row" },
  comparisonCol: { flex: 1, alignItems: "center" },
  comparisonDivider: {
    width: 1,
    backgroundColor: "rgba(70,69,84,0.2)",
    marginHorizontal: 12,
  },
  compValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#e5e1e4",
    marginTop: 8,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  compLabel: { fontSize: 10, color: "#908fa0", marginTop: 2 },
  savingsBanner: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    backgroundColor: "rgba(105,220,153,0.06)",
    borderRadius: 8,
    padding: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(105,220,153,0.12)",
  },
  savingsText: { flex: 1, color: "#908fa0", fontSize: 12, lineHeight: 16 },
  // Strategy selector
  strategySelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  strategyBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#1b1b1d",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.2)",
  },
  strategyBtnActive: {
    backgroundColor: "#201f21",
    borderColor: "rgba(192,193,255,0.2)",
  },
  strategyBtnText: { color: "#908fa0", fontSize: 12, fontWeight: "700" },
  // Explanation
  explanationCard: {
    backgroundColor: "rgba(70,69,84,0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  explanationText: { color: "#908fa0", fontSize: 12, lineHeight: 18 },
  // Debt list
  listCard: {
    backgroundColor: "#1b1b1d",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.1)",
  },
  listHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(70,69,84,0.15)",
    gap: 8,
  },
  listHeaderText: {
    fontSize: 8,
    color: "#464554",
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(70,69,84,0.08)",
  },
  debtRowCritical: {
    backgroundColor: "rgba(255,179,174,0.03)",
    borderLeftWidth: 2,
    borderLeftColor: "#ffb3ae",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#201f21",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#908fa0", fontSize: 11, fontWeight: "700" },
  debtInfo: { flex: 1 },
  debtNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  debtName: { color: "#e5e1e4", fontSize: 12, fontWeight: "600", flex: 1 },
  criticalChip: {
    backgroundColor: "rgba(255,179,174,0.1)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  criticalChipText: { color: "#ffb3ae", fontSize: 8, fontWeight: "700" },
  debtMeta: { color: "#908fa0", fontSize: 10 },
  debtResult: { alignItems: "flex-end" },
  debtMonths: {
    color: "#e5e1e4",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  debtInterest: {
    color: "#ffb3ae",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  // Strategy tag
  strategyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagAvalanche: { backgroundColor: "rgba(192,193,255,0.08)" },
  tagSnowball: { backgroundColor: "rgba(105,220,153,0.08)" },
  strategyTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  // Disclaimer
  disclaimer: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    alignItems: "flex-start",
  },
  disclaimerText: { color: "#464554", fontSize: 10, flex: 1, lineHeight: 14 },
});
