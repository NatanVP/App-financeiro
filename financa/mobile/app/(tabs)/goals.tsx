/**
 * Goals / Missões — High Seas pixel art theme.
 * Mar pixelado, barco de vela, diário de bordo.
 */
import React, { useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { formatBRL, money } from '@/lib/money';
import { useGoalStore, Goal } from '@/store/goalStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { GoalCard } from '@/components/ui/GoalCard';

// ── Paleta ────────────────────────────────────────────────────
const S = {
  // Céu
  sky0:     '#C8E8F0',
  sky1:     '#A8D8E8',
  sky2:     '#87CEDC',
  sky3:     '#6ABECC',
  horizon:  '#4AAEBC',
  // Mar distante
  sea0:     '#2A9AAA',
  sea1:     '#1A7A8A',
  // Mar médio / fundo
  deep0:    '#0E5A6A',
  deep1:    '#0A4A5A',
  deep2:    '#082E3A',
  deep3:    '#061E28',
  // Ondas
  wave0:    '#3ABACC',
  wave1:    '#5AD4E4',
  foam:     '#C8F0F8',
  white:    '#E8F8FC',
  // Fundo tela
  abyss:    '#0A2A3A',
  abyssDeep:'#061018',
  // Barco
  hullDark: '#3A1A08',
  hullMid:  '#5C3218',
  hullLight:'#7A4A1A',
  hullHi:   '#9A6020',
  sailBase: '#E8D4A0',
  sailShadow:'#C8B480',
  sailDark: '#A89060',
  mast:     '#2A1008',
  flag:     '#CC2222',
  // Card
  cardBg:   '#0D2030',
  cardBd:   '#1A4A5A',
  cardHi:   '#2A6A7A',
  cardHead: '#0A1A28',
  alcove:   '#061018',
  alcoveBd: '#1A3A4A',
  // Texto
  cream:    '#E8F8FC',
  silver:   '#7ABAC8',
  dim:      '#2A5A6A',
  gold:     '#F0C030',
  amber:    '#E8A020',
  green:    '#3ABA5A',
  red:      '#BA3A3A',
};

// ── SeaLayer ──────────────────────────────────────────────────
function SeaLayer({ color, height }: { color: string; height: number }) {
  return <View style={{ height, backgroundColor: color, width: '100%' }} />;
}

// ── PixelCloud ────────────────────────────────────────────────
function PixelCloud({ x, y }: { x: number; y: number }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { left: x, top: y }]} pointerEvents="none">
      {/* núcleo */}
      <View style={{ position: 'absolute', left: 8, top: 4, width: 16, height: 8, backgroundColor: S.white }} />
      <View style={{ position: 'absolute', left: 4, top: 8, width: 24, height: 8, backgroundColor: S.white }} />
      <View style={{ position: 'absolute', left: 0, top: 12, width: 32, height: 4, backgroundColor: S.white }} />
      {/* sombra */}
      <View style={{ position: 'absolute', left: 0, top: 16, width: 32, height: 2, backgroundColor: S.sky2, opacity: 0.5 }} />
      {/* pixels extras */}
      <View style={{ position: 'absolute', left: 4, top: 4, width: 4, height: 4, backgroundColor: S.white }} />
      <View style={{ position: 'absolute', left: 28, top: 8, width: 4, height: 4, backgroundColor: S.white }} />
    </View>
  );
}

// ── PixelWave ─────────────────────────────────────────────────
// Uma fileira de "dentes" de onda pixelados
const WAVE_TEETH = [8, 4, 6, 8, 4, 8, 6, 4, 8, 4, 6, 8, 4, 6, 8, 4, 8, 6, 4, 8];

function PixelWave({ offsetX = 0 }: { offsetX?: number }) {
  const { width } = useWindowDimensions();
  const teeth: number[] = [];
  let x = -offsetX;
  while (x < width + 16) {
    teeth.push(...WAVE_TEETH);
    x += WAVE_TEETH.length * 8;
  }
  return (
    <View style={{ flexDirection: 'row', height: 12, overflow: 'hidden' }}>
      {teeth.slice(0, Math.ceil((width + 32) / 8)).map((h, i) => (
        <View key={i} style={{ width: 7, marginRight: 1, height: h, alignSelf: 'flex-end', backgroundColor: i % 3 === 0 ? S.foam : S.wave0 }} />
      ))}
    </View>
  );
}

// ── WaveDivider ───────────────────────────────────────────────
function WaveDivider() {
  const { width } = useWindowDimensions();
  const count = Math.ceil(width / 8);
  const heights = [4, 6, 8, 6, 4, 8, 6, 4, 6, 8];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: S.deep0, height: 14, overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          width: 7,
          marginRight: 1,
          height: heights[i % heights.length],
          alignSelf: 'flex-end',
          backgroundColor: i % 2 === 0 ? S.foam : S.wave1,
        }} />
      ))}
    </View>
  );
}

// ── PixelShip ─────────────────────────────────────────────────
function PixelShip() {
  const SAIL_MAIN = [
    { w: 28, color: S.sailBase },
    { w: 24, color: S.sailShadow },
    { w: 20, color: S.sailBase },
    { w: 14, color: S.sailShadow },
    { w: 8,  color: S.sailDark },
  ];
  const SAIL_SMALL = [
    { w: 16, color: S.sailBase },
    { w: 12, color: S.sailShadow },
    { w: 8,  color: S.sailBase },
    { w: 4,  color: S.sailDark },
  ];

  return (
    <View style={{ alignItems: 'center' }}>
      {/* ── Mastro + velas ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 56 }}>
        {/* Vela principal (esquerda do mastro) */}
        <View style={{ alignItems: 'flex-end', paddingBottom: 2 }}>
          {SAIL_MAIN.map((row, i) => (
            <View key={i} style={{ width: row.w, height: 8, backgroundColor: row.color, marginBottom: 1 }} />
          ))}
        </View>
        {/* Mastro central */}
        <View style={{ width: 2, height: 54, backgroundColor: S.mast }}>
          {/* Verga */}
          <View style={{ position: 'absolute', top: 6, left: -14, width: 30, height: 2, backgroundColor: S.mast }} />
          {/* Bandeira */}
          <View style={{ position: 'absolute', top: 0, left: 2, width: 8, height: 6, backgroundColor: S.flag }} />
        </View>
        {/* Vela menor (direita do mastro) */}
        <View style={{ alignItems: 'flex-start', paddingBottom: 2 }}>
          {SAIL_SMALL.map((row, i) => (
            <View key={i} style={{ width: row.w, height: 8, backgroundColor: row.color, marginBottom: 1 }} />
          ))}
        </View>
      </View>

      {/* ── Casco ── */}
      {/* Deck */}
      <View style={{ width: 80, height: 8, backgroundColor: S.hullLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 }}>
        <View style={{ width: 4, height: 4, backgroundColor: S.deep1 }} />
        <View style={{ width: 4, height: 4, backgroundColor: S.deep1 }} />
        <View style={{ width: 4, height: 4, backgroundColor: S.deep1 }} />
        <View style={{ width: 4, height: 4, backgroundColor: S.deep1 }} />
      </View>
      {/* Topo casco */}
      <View style={{ width: 80, height: 6, backgroundColor: S.hullLight }} />
      {/* Meio casco */}
      <View style={{ width: 74, height: 10, backgroundColor: S.hullMid, alignSelf: 'center' }} />
      {/* Lateral destacada */}
      <View style={{ width: 74, height: 2, backgroundColor: S.hullHi, alignSelf: 'center' }} />
      {/* Base casco */}
      <View style={{ width: 64, height: 8, backgroundColor: S.hullDark, alignSelf: 'center' }} />
      {/* Quilha */}
      <View style={{ width: 54, height: 4, backgroundColor: S.hullDark, alignSelf: 'center' }} />

      {/* ── Reflexo na água ── */}
      <View style={{ opacity: 0.25, marginTop: 2 }}>
        <View style={{ width: 54, height: 3, backgroundColor: S.hullMid, alignSelf: 'center' }} />
        <View style={{ width: 44, height: 2, backgroundColor: S.hullMid, alignSelf: 'center' }} />
        <View style={{ width: 34, height: 2, backgroundColor: S.hullDark, alignSelf: 'center' }} />
      </View>
    </View>
  );
}

// ── SeaHeader ─────────────────────────────────────────────────
function SeaHeader({ insetTop, onNew }: { insetTop: number; onNew: () => void }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ width: '100%', overflow: 'hidden' }}>
      {/* Safe area sky */}
      <View style={{ height: insetTop, backgroundColor: S.sky0 }} />

      {/* Céu em camadas */}
      <SeaLayer color={S.sky0} height={18} />
      <SeaLayer color={S.sky1} height={18} />
      <SeaLayer color={S.sky2} height={16} />
      <SeaLayer color={S.sky3} height={14} />

      {/* Nuvens (absolutas sobre as camadas de céu) */}
      <PixelCloud x={width * 0.05} y={insetTop + 4} />
      <PixelCloud x={width * 0.45} y={insetTop + 2} />
      <PixelCloud x={width * 0.72} y={insetTop + 10} />

      {/* Horizonte */}
      <SeaLayer color={S.horizon} height={2} />

      {/* Mar distante */}
      <SeaLayer color={S.sea0} height={12} />
      <SeaLayer color={S.sea1} height={10} />

      {/* Onda distante pixelada */}
      <View style={{ backgroundColor: S.sea1 }}>
        <PixelWave offsetX={0} />
      </View>

      {/* Mar médio */}
      <SeaLayer color={S.deep0} height={14} />
      <SeaLayer color={S.deep1} height={12} />

      {/* Barco + título sobrepostos */}
      <View style={{ position: 'relative', height: 110, backgroundColor: S.deep1, overflow: 'visible' }}>
        {/* Barco centralizado */}
        <View style={{ position: 'absolute', bottom: 16, left: width / 2 - 44 }}>
          <PixelShip />
        </View>

        {/* Título à esquerda */}
        <View style={{ position: 'absolute', top: 10, left: 16 }}>
          <Text style={{ fontFamily: 'VT323', fontSize: 10, letterSpacing: 2, color: S.silver }}>⚓ ALTO MAR</Text>
          <Text style={{ fontFamily: 'VT323', fontSize: 30, letterSpacing: 1, color: S.cream, textShadowColor: S.abyssDeep, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }}>
            MISSÕES
          </Text>
          <Text style={{ fontFamily: 'VT323', fontSize: 11, letterSpacing: 2, color: S.silver }}>DO MAR</Text>
        </View>

        {/* Botão Nova Missão */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: S.wave0, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 2, borderColor: S.foam }}
          onPress={onNew}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'VT323', fontSize: 18, color: S.abyssDeep, letterSpacing: 1 }}>+ MISSÃO</Text>
        </TouchableOpacity>
      </View>

      {/* Onda de espuma separadora */}
      <WaveDivider />
    </View>
  );
}

// ── PixelProgressBar ──────────────────────────────────────────
function PixelProgressBar({ progress }: { progress: number }) {
  const SEG = 6; // largura de cada segmento px
  const GAP = 1;
  const { width } = useWindowDimensions();
  const trackW = width - 48 - 16; // padding do card
  const totalSegs = Math.floor(trackW / (SEG + GAP));
  const filledSegs = Math.round(totalSegs * Math.min(progress, 1));

  return (
    <View style={{ height: 8, flexDirection: 'row', backgroundColor: S.alcove, borderWidth: 1, borderColor: S.cardBd, gap: GAP, paddingHorizontal: 1, overflow: 'hidden' }}>
      {Array.from({ length: totalSegs }).map((_, i) => (
        <View key={i} style={{
          width: SEG,
          height: '100%',
          backgroundColor: i < filledSegs
            ? (i / totalSegs > 0.66 ? S.wave1 : i / totalSegs > 0.33 ? S.wave0 : S.sea0)
            : S.abyssDeep,
        }} />
      ))}
    </View>
  );
}

// ── OceanSummaryCard ──────────────────────────────────────────
function OceanSummaryCard({
  currentCents, targetCents, pct, remainingCents, activeCount,
}: {
  currentCents: number; targetCents: number; pct: number; remainingCents: number; activeCount: number;
}) {
  return (
    <View style={styles.summaryCard}>
      {/* Tira topo */}
      <View style={{ height: 4, backgroundColor: S.wave0, marginHorizontal: -2, marginTop: -2 }} />
      <View style={{ height: 2, backgroundColor: S.sea0, marginHorizontal: -2 }} />

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.labelSmall}>TESOURO TOTAL</Text>
            <Text style={styles.bigGold}>{formatBRL(currentCents)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.labelSmall}>⚓ MISSÕES ATIVAS</Text>
            <Text style={[styles.bigGold, { fontSize: 28, color: S.wave0 }]}>{activeCount}</Text>
          </View>
        </View>

        <PixelProgressBar progress={pct / 100} />

        {/* Stats */}
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>GUARDADO</Text>
            <Text style={[styles.statVal, { color: S.green }]}>{formatBRL(currentCents)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>FALTAM</Text>
            <Text style={[styles.statVal, { color: S.cream }]}>{formatBRL(money(remainingCents))}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>PROGRESSO</Text>
            <Text style={[styles.statVal, { color: S.gold }]}>{pct.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* Tira fundo */}
      <View style={{ height: 2, backgroundColor: S.sea0, marginHorizontal: -2 }} />
      <View style={{ height: 4, backgroundColor: S.deep0, marginHorizontal: -2, marginBottom: -2 }} />
    </View>
  );
}

// ── EmptyOcean ────────────────────────────────────────────────
function EmptyOcean() {
  const { width } = useWindowDimensions();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
      {/* Horizonte decorativo */}
      <View style={{ width: width - 32, height: 2, backgroundColor: S.cardBd }} />
      <View style={{ width: width - 48, height: 1, backgroundColor: S.dim }} />
      <Text style={{ fontFamily: 'VT323', fontSize: 40, color: S.silver, letterSpacing: 2 }}>～ ～ ～</Text>
      <Text style={{ fontFamily: 'VT323', fontSize: 20, letterSpacing: 2, color: S.silver }}>NENHUMA MISSÃO</Text>
      <Text style={{ fontFamily: 'VT323', fontSize: 14, letterSpacing: 1, color: S.dim, textAlign: 'center' }}>
        O mar está calmo.{'\n'}Adicione uma missão para zarpar.
      </Text>
      <View style={{ width: width - 48, height: 1, backgroundColor: S.dim }} />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { getActiveGoals, getTotalProgress, deleteGoal, updateGoal, processInstallments } = useGoalStore();
  const { addTransaction, transactions, deleteTransaction } = useTransactionStore();
  const { getActiveAccounts } = useAccountStore();
  const defaultAccountId = getActiveAccounts()[0]?.id ?? 'nubank';

  useEffect(() => {
    processInstallments(addTransaction, () => transactions, defaultAccountId);
  }, []);

  const payInstallment = (goal: Goal) => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const paidCount = transactions.filter(
      (t) => !t.deleted_at && t.notes === goal.id && t.category_id === 'goal_deposit',
    ).length;

    Alert.alert(
      'Recolher parcela?',
      `Descontar ${formatBRL(money(goal.monthly_cents))} da sua bolsa para "${goal.name}"?\n\nParcela ${paidCount + 1}/${goal.months_total}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recolher',
          onPress: () => {
            addTransaction({
              id: `tx-inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              account_id: defaultAccountId,
              category_id: 'goal_deposit',
              amount_cents: money(goal.monthly_cents),
              type: 'expense',
              description: `Parcela ${paidCount + 1}/${goal.months_total}: ${goal.name}`,
              date: today,
              notes: goal.id,
              transfer_to_account_id: null,
              is_reconciled: false,
              device_id: null,
              created_at: now,
              updated_at: now,
              deleted_at: null,
            });
            updateGoal(goal.id, {
              current_cents: money(Math.min(goal.current_cents + goal.monthly_cents, goal.target_cents)),
            });
          },
        },
      ],
    );
  };

  const activeGoals = getActiveGoals();
  const { currentCents, targetCents, pct } = getTotalProgress();
  const remainingCents = Math.max(targetCents - currentCents, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
    >
      {/* Header */}
      <SeaHeader insetTop={insets.top} onNew={() => router.push('/new-goal')} />

      {/* Fundo oceano profundo */}
      <View style={styles.oceanBg}>

        {/* Summary */}
        <OceanSummaryCard
          currentCents={currentCents}
          targetCents={targetCents}
          pct={pct}
          remainingCents={remainingCents}
          activeCount={activeGoals.length}
        />

        {/* Separador ondulado */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: S.cardBd }} />
          <Text style={{ fontFamily: 'VT323', fontSize: 16, color: S.silver, letterSpacing: 2 }}>DIÁRIO DE BORDO</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: S.cardBd }} />
        </View>

        {/* Goals list */}
        <View style={styles.goalsList}>
          {activeGoals.map((goal) => {
            const isOverdue =
              goal.target_date
                ? new Date(goal.target_date) < new Date() && goal.current_cents < goal.target_cents
                : false;

            const goalTxs = transactions.filter(
              (t) => !t.deleted_at && t.notes === goal.id && t.category_id === 'goal_deposit',
            );
            const paidCount = goalTxs.length;

            const today = new Date();
            const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentMonthPaid = goalTxs.some((t) => t.date.startsWith(currentMonthKey));
            const installmentDue =
              goal.monthly_cents > 0 &&
              goal.months_total > 1 &&
              paidCount < goal.months_total &&
              !currentMonthPaid;

            return (
              <GoalCard
                key={goal.id}
                name={goal.name}
                currentCents={goal.current_cents}
                targetCents={goal.target_cents}
                targetDate={goal.target_date?.slice(0, 7).replace('-', '/') ?? undefined}
                color={goal.color}
                isOverdue={isOverdue}
                monthlyCents={goal.monthly_cents}
                monthsTotal={goal.months_total}
                monthsPaid={paidCount}
                installmentDue={installmentDue}
                onPayInstallment={installmentDue ? () => payInstallment(goal) : undefined}
                onDelete={() =>
                  Alert.alert(
                    'Abandonar missão?',
                    `"${goal.name}" será removida. O dinheiro guardado não volta automaticamente.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Abandonar',
                        style: 'destructive',
                        onPress: () => {
                          transactions
                            .filter((t) => !t.deleted_at && t.notes === goal.id)
                            .forEach((t) => deleteTransaction(t.id));
                          deleteGoal(goal.id);
                        },
                      },
                    ],
                  )
                }
              />
            );
          })}

          {activeGoals.length === 0 && <EmptyOcean />}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: S.abyss,
  },
  content: {
    paddingBottom: 100,
  },

  oceanBg: {
    backgroundColor: S.abyss,
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 14,
  },

  // ── Summary card ──────────────────────────────────────────
  summaryCard: {
    backgroundColor: S.cardBg,
    borderWidth: 2,
    borderColor: S.cardBd,
    // highlight topo + esquerda
    borderTopColor: S.cardHi,
    borderLeftColor: S.cardHi,
  },

  labelSmall: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 2,
    color: S.silver,
    textTransform: 'uppercase',
  },
  bigGold: {
    fontFamily: 'VT323',
    fontSize: 38,
    fontVariant: ['tabular-nums'],
    color: S.gold,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: S.dim,
    marginVertical: 2,
  },
  statVal: {
    fontFamily: 'VT323',
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },

  // ── Goals list ────────────────────────────────────────────
  goalsList: {
    gap: 10,
    paddingBottom: 20,
  },
});
