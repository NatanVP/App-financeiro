/**
 * Grimório — tela de configurações unificada como um único códice medieval.
 * Seções: Bolsa de Ouro (salário), Escudo Mágico (cartão), Missões (módulos),
 *         Atalhos do Reino, status e exportação.
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
import { useSyncStore } from '@/store/syncStore';
import { useSalaryStore } from '@/store/salaryStore';
import { useCreditStore } from '@/store/creditStore';
import { parseBRL, money } from '@/lib/money';
import { useAccountStore } from '@/store/accountStore';
import { BankIcon } from '@/components/ui/BankIcon';

// ─── helpers ──────────────────────────────────────────────────────────────────

function centsToInput(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** Divisória estilo pergaminho: ══╡ TÍTULO ╞══ */
function ChapterDivider({ numeral, title }: { numeral: string; title: string }) {
  return (
    <View style={divStyles.row}>
      <View style={divStyles.line} />
      <Text style={divStyles.numeral}>{numeral}</Text>
      <Text style={divStyles.title}>{title}</Text>
      <View style={divStyles.line} />
    </View>
  );
}

const divStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: `${Colors.outline}60` },
  numeral: {
    fontFamily: 'VT323',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 2,
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

/** Fileira do livro-razão de salário */
function LedgerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={ledgerStyles.row}>
      {/* marcador de parágrafo */}
      <Text style={ledgerStyles.bullet}>◆</Text>
      <Text style={ledgerStyles.label}>{label}</Text>
      {/* pontilhado entre label e input */}
      <View style={ledgerStyles.dots} />
      <TextInput
        style={ledgerStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder="0,00"
        placeholderTextColor={`${Colors.outline}80`}
        keyboardType="numeric"
      />
      <Text style={ledgerStyles.currency}>G$</Text>
    </View>
  );
}

const ledgerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}60`,
    paddingVertical: 10,
    gap: 6,
  },
  bullet: { fontFamily: 'VT323', fontSize: 10, color: Colors.outline, width: 12 },
  label: {
    fontFamily: 'VT323',
    fontSize: 17,
    color: Colors.onSurface,
    letterSpacing: 0.5,
  },
  dots: { flex: 1, borderBottomWidth: 1, borderBottomColor: `${Colors.outline}40`, borderStyle: 'dashed', marginBottom: 2 },
  input: {
    fontFamily: 'VT323',
    fontSize: 20,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 90,
    paddingVertical: 0,
  },
  currency: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: `${Colors.primary}80`,
    letterSpacing: 1,
  },
});

/** Carta de missão — célula do grid 2×2 */
function MissionCard({
  icon,
  label,
  desc,
  onPress,
  accent,
}: {
  icon: string;
  label: string;
  desc?: string;
  onPress: () => void;
  accent?: string;
}) {
  const color = accent ?? Colors.primary;
  return (
    <TouchableOpacity style={[cardStyles.cell, { borderColor: `${color}30` }]} onPress={onPress} activeOpacity={0.7}>
      {/* corner ornaments */}
      <View style={[cardStyles.corner, cardStyles.tl, { borderColor: `${color}50` }]} />
      <View style={[cardStyles.corner, cardStyles.tr, { borderColor: `${color}50` }]} />
      <View style={[cardStyles.corner, cardStyles.bl, { borderColor: `${color}50` }]} />
      <View style={[cardStyles.corner, cardStyles.br, { borderColor: `${color}50` }]} />

      {/* icon badge */}
      <View style={[cardStyles.iconBadge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>

      <Text style={[cardStyles.label, { color: Colors.onSurface }]}>{label}</Text>
      {desc ? <Text style={cardStyles.desc}>{desc}</Text> : null}

      {/* chevron */}
      <Text style={[cardStyles.chevron, { color: `${color}70` }]}>›</Text>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  cell: {
    flex: 1,
    backgroundColor: Colors.surfaceHighest,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    minHeight: 90,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderWidth: 1,
  },
  tl: { top: 3, left: 3, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 3, right: 3, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 3, left: 3, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 3, right: 3, borderLeftWidth: 0, borderTopWidth: 0 },
  iconBadge: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  desc: {
    fontFamily: 'VT323',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 14,
  },
  chevron: {
    fontFamily: 'VT323',
    fontSize: 20,
    position: 'absolute',
    right: 10,
    bottom: 8,
  },
});

// ─── screen ───────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { lastSyncAt } = useSyncStore();
  const { payment5thCents, payment20thCents, paymentLastCents, salaryAccountId, setSalaryConfig } = useSalaryStore();
  const { getActiveAccounts } = useAccountStore();
  const {
    closingDay,
    dueDay,
    enabled: creditEnabled,
    setClosingDay,
    setDueDay,
    setEnabled: setCreditEnabled,
  } = useCreditStore();

  const [sal5, setSal5] = useState(centsToInput(payment5thCents));
  const [sal20, setSal20] = useState(centsToInput(payment20thCents));
  const [salLast, setSalLast] = useState(centsToInput(paymentLastCents));
  const [selectedSalaryAccountId, setSelectedSalaryAccountId] = useState(salaryAccountId);
  const [creditClosingInput, setCreditClosingInput] = useState(String(closingDay));
  const [creditDueInput, setCreditDueInput] = useState(String(dueDay));
  const accounts = getActiveAccounts();
  const fallbackSalaryAccountId = accounts[0]?.id ?? 'nubank';

  useEffect(() => {
    const hasSelectedAccount = accounts.some((account) => account.id === selectedSalaryAccountId);
    if (!hasSelectedAccount) {
      setSelectedSalaryAccountId(
        accounts.some((account) => account.id === salaryAccountId)
          ? salaryAccountId
          : fallbackSalaryAccountId,
      );
    }
  }, [accounts, fallbackSalaryAccountId, salaryAccountId, selectedSalaryAccountId]);

  const onSaveSalary = () => {
    try {
      const p5 = sal5.trim() ? parseBRL(sal5) : money(0);
      const p20 = sal20.trim() ? parseBRL(sal20) : money(0);
      const pLast = salLast.trim() ? parseBRL(salLast) : money(0);
      setSalaryConfig({
        payment5thCents: p5,
        payment20thCents: p20,
        paymentLastCents: pLast,
        salaryAccountId: selectedSalaryAccountId,
      });
      Alert.alert('Grimório Atualizado', 'Configuração de salário registrada nos anais.');
    } catch {
      Alert.alert('Encantamento Falhou', 'Valor inválido. Use o formato 1.234,56');
    }
  };

  const modules = [
    { icon: 'tag-outline', label: 'Categorias', route: '/categories', accent: Colors.primary },
    { icon: 'scale-balance', label: 'Orçamentos', route: '/budgets', accent: Colors.primary },
    { icon: 'calendar-clock', label: 'Contas a Pagar', route: '/bills', accent: Colors.primary },
    { icon: 'bank-outline', label: 'Dívidas', route: '/debts', accent: Colors.tertiary },
  ];

  const shortcuts = [
    {
      icon: 'database-export-outline',
      label: 'Backup',
      desc: 'Exportação e recuperação dos dados',
      route: '/settings/backup',
      accent: Colors.secondary,
    },
    {
      icon: 'cloud-sync-outline',
      label: 'Sincronização',
      desc: 'Status do reino e sync manual',
      route: '/settings/sync',
      accent: '#64B5F6',
    },
    {
      icon: 'bell-ring-outline',
      label: 'Alertas',
      desc: 'Avisos de fatura, saldo e vencimentos',
      route: '/settings/alerts',
      accent: Colors.tertiary,
    },
    {
      icon: 'shield-lock-outline',
      label: 'Segurança',
      desc: 'Privacidade e proteção do grimório',
      route: '/settings/security',
      accent: Colors.primary,
    },
  ];

  // agrupa em pares para o grid 2×2
  const toPairs = <T,>(arr: T[]): [T, T | null][] =>
    arr.reduce<[T, T | null][]>((acc, item, i) => {
      if (i % 2 === 0) acc.push([item, arr[i + 1] ?? null]);
      return acc;
    }, []);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* ── CAPA ── */}
      <View style={styles.cover}>
        {/* ornamento de canto superior */}
        <View style={styles.coverCornerTL} /><View style={styles.coverCornerTR} />
        <Text style={styles.coverEyebrow}>✦ CONFIGURAÇÕES ✦</Text>
        <Text style={styles.coverTitle}>GRIMÓRIO</Text>
        <Text style={styles.coverSubtitle}>DO AVENTUREIRO</Text>
        <View style={styles.coverRuler} />
        {/* rodapé de status */}
        <View style={styles.coverStatusRow}>
          <View style={styles.statusPill}>
            <View style={styles.greenDot} />
            <Text style={styles.statusPillText}>@FiireKeeperBot ATIVO</Text>
          </View>
          <Text style={styles.statusPillText}>
            {lastSyncAt
              ? `⇅ ${new Date(lastSyncAt).toLocaleDateString('pt-BR')}`
              : '⇅ SEM SYNC'}
          </Text>
        </View>
        <View style={styles.coverCornerBL} /><View style={styles.coverCornerBR} />
      </View>

      {/* ══╡ I. BOLSA DE OURO ╞══ */}
      <ChapterDivider numeral="I." title="Bolsa de Ouro — Salário" />

      <View style={styles.parchmentBlock}>
        <LedgerRow label="5º Dia Útil" value={sal5} onChange={setSal5} />
        <LedgerRow label="20º Dia Útil" value={sal20} onChange={setSal20} />
        <LedgerRow label="Último Dia do Mês" value={salLast} onChange={setSalLast} />

        <View style={styles.salaryAccountBlock}>
          <Text style={styles.salaryAccountTitle}>SALÁRIO CAI EM</Text>
          <View style={styles.salaryAccountList}>
            {accounts.length === 0 ? (
              <Text style={styles.salaryAccountEmpty}>Nenhum banco ativo para receber salário.</Text>
            ) : (
              accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.salaryAccountOption,
                    selectedSalaryAccountId === account.id && styles.salaryAccountOptionActive,
                  ]}
                  onPress={() => setSelectedSalaryAccountId(account.id)}
                  activeOpacity={0.75}
                >
                  <BankIcon bank={account.id} size={24} />
                  <Text
                    style={[
                      styles.salaryAccountLabel,
                      selectedSalaryAccountId === account.id && styles.salaryAccountLabelActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSaveSalary} activeOpacity={0.75}>
          <MaterialCommunityIcons name="feather" size={14} color={Colors.surfaceLowest} />
          <Text style={styles.saveBtnText}>REGISTRAR NOS ANAIS</Text>
        </TouchableOpacity>
      </View>

      {/* ══╡ II. ESCUDO MÁGICO ╞══ */}
      <ChapterDivider numeral="II." title="Escudo Mágico — Cartão" />

      <View style={styles.parchmentBlock}>
        {/* toggle row */}
        <View style={styles.creditToggleRow}>
          <MaterialCommunityIcons name="credit-card-outline" size={18} color="#64B5F6" />
          <Text style={styles.creditToggleLabel}>ATIVAR CARTÃO DE CRÉDITO</Text>
          <TouchableOpacity
            style={[styles.pixelToggle, creditEnabled && styles.pixelToggleOn]}
            onPress={() => setCreditEnabled(!creditEnabled)}
            activeOpacity={0.8}
          >
            <View style={[styles.pixelToggleThumb, creditEnabled && styles.pixelToggleThumbOn]} />
            <Text style={[styles.pixelToggleText, creditEnabled && styles.pixelToggleTextOn]}>
              {creditEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {creditEnabled && (
          <>
            <View style={styles.creditDaysRow}>
              <View style={styles.creditDayCell}>
                <Text style={styles.creditDayLabel}>FECHA</Text>
                <View style={styles.creditDayBox}>
                  <TextInput
                    style={styles.creditDayInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={creditClosingInput}
                    onChangeText={setCreditClosingInput}
                    onBlur={() => {
                      const d = parseInt(creditClosingInput, 10);
                      if (!isNaN(d) && d >= 1 && d <= 28) setClosingDay(d);
                      else setCreditClosingInput(String(closingDay));
                    }}
                    selectTextOnFocus
                  />
                </View>
                <Text style={styles.creditDayHint}>dia do mês</Text>
              </View>

              <View style={styles.creditArrow}>
                <Text style={styles.creditArrowText}>══►</Text>
              </View>

              <View style={styles.creditDayCell}>
                <Text style={styles.creditDayLabel}>VENCE</Text>
                <View style={styles.creditDayBox}>
                  <TextInput
                    style={styles.creditDayInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={creditDueInput}
                    onChangeText={setCreditDueInput}
                    onBlur={() => {
                      const d = parseInt(creditDueInput, 10);
                      if (!isNaN(d) && d >= 1 && d <= 28) setDueDay(d);
                      else setCreditDueInput(String(dueDay));
                    }}
                    selectTextOnFocus
                  />
                </View>
                <Text style={styles.creditDayHint}>dia do mês</Text>
              </View>
            </View>

            <Text style={styles.creditHint}>
              ◆ Compras até o dia {closingDay} entram na fatura atual. Após o dia {closingDay} vão para o mês seguinte.
            </Text>
          </>
        )}
      </View>

      {/* ══╡ III. MISSÕES ╞══ */}
      <ChapterDivider numeral="III." title="Módulos do Reino" />

      <View style={styles.grid}>
        {toPairs(modules).map(([a, b], i) => (
          <View key={i} style={styles.gridRow}>
            <MissionCard {...a} onPress={() => router.push(a.route as never)} />
            {b ? (
              <MissionCard {...b} onPress={() => router.push(b.route as never)} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        ))}
      </View>

      {/* ══╡ IV. ATALHOS DO REINO ╞══ */}
      <ChapterDivider numeral="IV." title="Atalhos do Reino" />

      <View style={styles.grid}>
        {toPairs(shortcuts).map(([a, b], i) => (
          <View key={i} style={styles.gridRow}>
            <MissionCard {...a} onPress={() => router.push(a.route as never)} />
            {b ? (
              <MissionCard {...b} onPress={() => router.push(b.route as never)} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        ))}
      </View>

      {/* ══╡ V. DADOS DO REINO ╞══ */}
      <ChapterDivider numeral="V." title="Dados do Reino" />

      <TouchableOpacity style={styles.exportBtn} activeOpacity={0.75}>
        <MaterialCommunityIcons name="database-export-outline" size={18} color={Colors.onSurface} />
        <Text style={styles.exportText}>EXPORTAR BANCO DE DADOS</Text>
        <Text style={styles.exportBadge}>SQLite3</Text>
      </TouchableOpacity>
      <Text style={styles.exportMeta}>FORMATO V1.0.0 · CRIPTOGRAFIA AES-256</Text>


      {/* rodapé de fechamento do grimório */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>✦ ─── FIM DO GRIMÓRIO ─── ✦</Text>
      </View>
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CORNER_SIZE = 10;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },

  // ── capa ──
  cover: {
    borderWidth: 1,
    borderColor: `${Colors.outline}50`,
    backgroundColor: Colors.surfaceHigh,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  coverCornerTL: { position: 'absolute', top: 4, left: 4, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: 2, borderLeftWidth: 2, borderColor: `${Colors.primary}60` },
  coverCornerTR: { position: 'absolute', top: 4, right: 4, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: 2, borderRightWidth: 2, borderColor: `${Colors.primary}60` },
  coverCornerBL: { position: 'absolute', bottom: 4, left: 4, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: `${Colors.primary}60` },
  coverCornerBR: { position: 'absolute', bottom: 4, right: 4, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: 2, borderRightWidth: 2, borderColor: `${Colors.primary}60` },
  coverEyebrow: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 4, color: Colors.outline, marginBottom: 2 },
  coverTitle: { fontFamily: 'VT323', fontSize: 44, letterSpacing: 6, color: Colors.primary },
  coverSubtitle: { fontFamily: 'VT323', fontSize: 16, letterSpacing: 8, color: Colors.onSurfaceVariant, marginTop: -6 },
  coverRuler: { width: '60%', height: 1, backgroundColor: `${Colors.outline}60`, marginVertical: 8 },
  coverStatusRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusPillText: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 1.5, color: Colors.outline, textTransform: 'uppercase' },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.secondary },

  // ── bloco pergaminho ──
  parchmentBlock: {
    backgroundColor: Colors.surfaceHighest,
    borderWidth: 1,
    borderColor: `${Colors.outline}40`,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 0,
  },

  // ── salário ──
  salaryAccountBlock: {
    gap: 8,
    paddingTop: 12,
  },
  salaryAccountTitle: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  salaryAccountList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  salaryAccountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  salaryAccountOptionActive: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}60`,
  },
  salaryAccountLabel: {
    fontFamily: 'VT323',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
  },
  salaryAccountEmpty: {
    fontFamily: 'VT323',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  salaryAccountLabelActive: {
    color: Colors.primary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    marginTop: 12,
  },
  saveBtnText: {
    fontFamily: 'VT323',
    fontSize: 17,
    letterSpacing: 3,
    color: Colors.surfaceLowest,
  },

  // ── cartão ──
  creditToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}60`,
  },
  creditToggleLabel: { fontFamily: 'VT323', fontSize: 16, color: Colors.onSurface, flex: 1, letterSpacing: 0.5 },
  pixelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 64,
  },
  pixelToggleOn: { backgroundColor: `#64B5F618`, borderColor: `#64B5F660` },
  pixelToggleThumb: { width: 10, height: 10, backgroundColor: Colors.onSurfaceVariant },
  pixelToggleThumbOn: { backgroundColor: '#64B5F6' },
  pixelToggleText: { fontFamily: 'VT323', fontSize: 14, letterSpacing: 2, color: Colors.onSurfaceVariant },
  pixelToggleTextOn: { color: '#64B5F6' },

  creditDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}60`,
  },
  creditDayCell: { alignItems: 'center', gap: 4 },
  creditDayLabel: { fontFamily: 'VT323', fontSize: 11, letterSpacing: 3, color: Colors.onSurfaceVariant },
  creditDayBox: {
    backgroundColor: Colors.surfaceLowest,
    borderWidth: 1,
    borderColor: `#64B5F640`,
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditDayInput: {
    fontFamily: 'VT323',
    fontSize: 36,
    color: '#64B5F6',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  creditDayHint: { fontFamily: 'VT323', fontSize: 10, color: Colors.outline, letterSpacing: 1 },
  creditArrow: { alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  creditArrowText: { fontFamily: 'VT323', fontSize: 14, color: `${Colors.outline}80`, letterSpacing: 1 },
  creditHint: {
    fontFamily: 'VT323',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: Colors.onSurfaceVariant,
    paddingTop: 8,
  },

  // ── grids ──
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },

  // ── export ──
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${Colors.outline}40`,
    padding: Spacing.lg,
  },
  exportText: { fontFamily: 'VT323', fontSize: 16, letterSpacing: 2, color: Colors.onSurface, textTransform: 'uppercase' },
  exportBadge: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.outline,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.outline}50`,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  exportMeta: {
    fontFamily: 'VT323',
    fontSize: 10,
    textAlign: 'center',
    color: Colors.outline,
    letterSpacing: 1.5,
    opacity: 0.6,
    marginTop: -8,
  },

  // ── rodapé ──
  footer: { alignItems: 'center', paddingVertical: Spacing.md },
  footerText: { fontFamily: 'VT323', fontSize: 13, letterSpacing: 3, color: `${Colors.outline}70` },
});
