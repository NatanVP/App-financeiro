/**
 * Taverna — Dashboard principal
 * Pixel art high fantasy tavern: tábuas de madeira, tochas, placa pendurada, barris.
 */
import React, { useState } from 'react';
import {
  RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { formatBRL, money } from '@/lib/money';
import { getReceivedPayments } from '@/lib/businessDays';
import { useTransactionStore } from '@/store/transactionStore';
import { useDebtStore } from '@/store/debtStore';
import { useSalaryStore } from '@/store/salaryStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BarChart } from '@/components/charts/BarChart';
import { BankIcon } from '@/components/ui/BankIcon';
import { CreditInvoiceWidget } from '@/components/ui/CreditInvoiceWidget';
import { useCreditStore } from '@/store/creditStore';
import { useAccountStore } from '@/store/accountStore';
import { RPGIcon, RPGIconName } from '@/components/ui/RPGIcon';

// ── Paleta da Taverna ───────────────────────────────────────
const W = {
  // Fundo / tábuas
  bg:         '#100804',   // chão de madeira carbonizada
  plank0:     '#1C0E06',   // tábua escura
  plank1:     '#221006',   // tábua média
  plank2:     '#261408',   // tábua clara
  plank3:     '#1E1006',   // tábua alternada
  plankVein:  '#3A1C0C',   // veio highlight
  plankShadow:'#0A0602',   // veio sombra
  knot:       '#0E0804',   // nó de madeira
  // Madeira estrutural
  border:     '#4A2410',   // borda de madeira
  borderHi:   '#6A3A18',   // borda iluminada
  innerBorder:'#5A3018',   // borda interna highlight
  cardBg:     '#180C04',   // fundo dos cards
  cardBgHero: '#1E0E06',   // fundo do hero card
  // Metais / ouro
  gold:       '#F0C030',   // ouro brilhante
  goldDim:    '#B08010',   // ouro escuro
  amber:      '#E8A020',   // âmbar tocha
  orange:     '#D06010',   // laranja quente
  chain:      '#5A4A18',   // elo de corrente
  chainDark:  '#3A3010',   // elo escuro
  // Texto
  parchment:  '#E8D4A0',   // creme pergaminho
  parchDim:   '#A08050',   // pergaminho escuro
  // Status
  green:      '#3A8A2A',   // receita verde
  red:        '#8A2020',   // despesa vermelha
  // Barril
  barrelBody: '#3A1C0C',
  barrelHoop: '#6A4A10',
  barrelHi:   '#4A2A10',
};

const MONTH_NAMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const ACCOUNT_ORDER = ['nubank', 'itau', 'inter'] as const;
const ACCOUNT_LABELS: Record<string, string> = { nubank: 'Nubank', itau: 'Itaú', inter: 'Inter' };

// ═══════════════════════════════════════════════════════════
//  PIXEL ART — TÁBUAS DE MADEIRA
// ═══════════════════════════════════════════════════════════

const PLANK_COLS = [W.plank0, W.plank1, W.plank2, W.plank3, W.plank1, W.plank0];
// Posições X dos nós por fileira
const KNOT_XS: number[][] = [
  [38, 130, 224, 318],
  [82, 172, 260, 350],
  [18, 108, 198, 290],
  [60, 148, 236, 326],
  [44, 136, 228, 312],
  [76, 164, 252, 340],
];

/** Uma tábua de madeira horizontal com veios e nós pixel art */
function WoodPlankRow({ row, screenWidth = 420 }: { row: number; screenWidth?: number }) {
  const color  = PLANK_COLS[row % PLANK_COLS.length];
  const knots  = KNOT_XS[row % KNOT_XS.length];
  return (
    <View style={{
      height: 18, backgroundColor: color,
      borderTopWidth: 1,    borderTopColor:    W.plankVein,
      borderBottomWidth: 1, borderBottomColor: W.plankShadow,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Veio central subtil */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 1, backgroundColor: W.plankShadow, opacity: 0.5 }} />
      {/* Nós */}
      {knots.filter(x => x < screenWidth).map((kx, i) => (
        <View key={i} style={{ position: 'absolute', left: kx, top: 7, width: 4, height: 4, backgroundColor: W.knot }} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
//  PIXEL ART — TOCHA (sem emoji, sem borderRadius)
// ═══════════════════════════════════════════════════════════

/** Halo âmbar de tocha — círculos concêntricos */
function TorchHalo({ cx, cy }: { cx: number; cy: number }) {
  const rings = [
    { r: 72, op: 0.05 },
    { r: 52, op: 0.10 },
    { r: 34, op: 0.17 },
    { r: 20, op: 0.26 },
    { r: 10, op: 0.40 },
  ];
  return (
    <>
      {rings.map((ring, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: cx - ring.r / 2,
          top:  cy - ring.r * 0.5,
          width: ring.r, height: ring.r,
          borderRadius: ring.r / 2,   // halo SÓ — não é element de madeira
          backgroundColor: W.amber,
          opacity: ring.op,
        }} />
      ))}
    </>
  );
}

/** Tocha pixel art pura */
function PixelTorch({ x, y }: { x: number; y: number }) {
  return (
    <>
      <View style={{ position: 'absolute', left: x-2,  top: y,    width: 4,  height: 4,  backgroundColor: '#FFEE00' }} />
      <View style={{ position: 'absolute', left: x-3,  top: y+4,  width: 6,  height: 6,  backgroundColor: '#FF8800' }} />
      <View style={{ position: 'absolute', left: x-4,  top: y+8,  width: 8,  height: 4,  backgroundColor: '#FF6600' }} />
      <View style={{ position: 'absolute', left: x-5,  top: y+12, width: 10, height: 6,  backgroundColor: '#FF4400' }} />
      <View style={{ position: 'absolute', left: x-5,  top: y+18, width: 10, height: 6,  backgroundColor: '#5A3A10' }} />
      <View style={{ position: 'absolute', left: x-3,  top: y+24, width: 6,  height: 4,  backgroundColor: '#4A2E0C' }} />
      <View style={{ position: 'absolute', left: x-3,  top: y+28, width: 6,  height: 20,
        backgroundColor: '#3C2208',
        borderLeftWidth: 1,  borderLeftColor:  '#5A3A18',
        borderRightWidth: 1, borderRightColor: '#221208',
      }} />
      <View style={{ position: 'absolute', left: x-5,  top: y+46, width: 10, height: 4,  backgroundColor: '#2A1A08' }} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  PIXEL ART — BARRIL
// ═══════════════════════════════════════════════════════════

function PixelBarrel({ x, y }: { x: number; y: number }) {
  return (
    <>
      {/* Corpo */}
      <View style={{ position: 'absolute', left: x, top: y, width: 20, height: 28, backgroundColor: W.barrelBody }}>
        {/* Topo */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: 20, height: 3, backgroundColor: W.barrelHi }} />
        {/* Aduelas (veios verticais) */}
        <View style={{ position: 'absolute', left: 6,  top: 3, width: 1, height: 22, backgroundColor: W.barrelHi }} />
        <View style={{ position: 'absolute', left: 13, top: 3, width: 1, height: 22, backgroundColor: W.barrelHi }} />
        {/* Arcos metálicos */}
        <View style={{ position: 'absolute', left: 0, top: 5,  width: 20, height: 2, backgroundColor: W.barrelHoop }} />
        <View style={{ position: 'absolute', left: 0, top: 13, width: 20, height: 2, backgroundColor: W.barrelHoop }} />
        <View style={{ position: 'absolute', left: 0, top: 21, width: 20, height: 2, backgroundColor: W.barrelHoop }} />
        {/* Base */}
        <View style={{ position: 'absolute', left: 0, top: 25, width: 20, height: 3, backgroundColor: '#2A1408' }} />
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  HEADER DA TAVERNA — placa pendurada + tábuas + tochas + barris
// ═══════════════════════════════════════════════════════════

function TavernHeader({
  month, year, screenWidth, onGrimoire,
}: {
  month: number; year: number; screenWidth: number; onGrimoire: () => void;
}) {
  const H         = 188;  // altura total do header
  const NUM_ROWS  = Math.ceil(H / 20);
  const torchLX   = 46;
  const torchRX   = screenWidth - 50;
  const torchY    = 36;

  // Placa: 240px de largura, centralizada
  const SIGN_W    = 240;
  const SIGN_H    = 62;
  const signLeft  = (screenWidth - SIGN_W) / 2;
  const signTop   = 60;

  // Correntes: partem da borda do header até o topo da placa
  const chainLX   = signLeft  + 14;
  const chainRX   = signLeft  + SIGN_W - 18;
  const chainTopY = 6;
  const chainBotY = signTop - 2;
  const chainLinks = Math.floor((chainBotY - chainTopY) / 6);

  return (
    <View style={{ height: H, backgroundColor: W.plankShadow, overflow: 'hidden', position: 'relative' }}>

      {/* ── Tábuas de madeira ────────────────────── */}
      {Array.from({ length: NUM_ROWS }, (_, i) => (
        <WoodPlankRow key={i} row={i} screenWidth={screenWidth} />
      ))}

      {/* ── Halos das tochas ────────────────────── */}
      <TorchHalo cx={torchLX} cy={torchY + 14} />
      <TorchHalo cx={torchRX} cy={torchY + 14} />

      {/* ── Correntes pixel art ──────────────────── */}
      {Array.from({ length: chainLinks }, (_, i) => (
        <React.Fragment key={i}>
          <View style={{
            position: 'absolute', left: chainLX, top: chainTopY + i * 6,
            width: 4, height: 4,
            backgroundColor: i % 2 === 0 ? W.chain : W.chainDark,
          }} />
          <View style={{
            position: 'absolute', left: chainRX, top: chainTopY + i * 6,
            width: 4, height: 4,
            backgroundColor: i % 2 === 0 ? W.chain : W.chainDark,
          }} />
        </React.Fragment>
      ))}

      {/* ── Placa de madeira pendurada ───────────── */}
      <View style={{
        position: 'absolute', left: signLeft, top: signTop,
        width: SIGN_W, height: SIGN_H,
        backgroundColor: '#2A1408',
        borderWidth: 3, borderColor: W.borderHi,
      }}>
        {/* Borda interna dourada (1px) */}
        <View style={{ position: 'absolute', left: 3, top: 3, right: 3, bottom: 3,
          borderWidth: 1, borderColor: '#7A5028',
        }} />
        {/* Pixel ornamentos nos 4 cantos */}
        <View style={{ position: 'absolute', left: 4,  top: 4,  width: 4, height: 4, backgroundColor: '#9A6030' }} />
        <View style={{ position: 'absolute', right: 4, top: 4,  width: 4, height: 4, backgroundColor: '#9A6030' }} />
        <View style={{ position: 'absolute', left: 4,  bottom: 4, width: 4, height: 4, backgroundColor: '#9A6030' }} />
        <View style={{ position: 'absolute', right: 4, bottom: 4, width: 4, height: 4, backgroundColor: '#9A6030' }} />
        {/* Textos */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{
            fontFamily: 'VT323', fontSize: 11, letterSpacing: 3,
            color: '#8A6030',
          }}>
            {MONTH_NAMES[month - 1]}  {year}
          </Text>
          <Text style={{
            fontFamily: 'VT323', fontSize: 36, letterSpacing: 5,
            color: W.gold,
            textShadowColor: W.amber,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }}>A TAVERNA</Text>
        </View>
      </View>

      {/* ── Tochas pixel art ─────────────────────── */}
      <PixelTorch x={torchLX} y={torchY} />
      <PixelTorch x={torchRX} y={torchY} />

      {/* ── Barris decorativos nos cantos ────────── */}
      <PixelBarrel x={6}               y={H - 34} />
      <PixelBarrel x={screenWidth - 28} y={H - 34} />

      {/* ── Botão Grimório ───────────────────────── */}
      <TouchableOpacity
        style={{
          position: 'absolute', right: 8, top: 8,
          paddingHorizontal: 8, paddingVertical: 4,
          backgroundColor: '#120804',
          borderWidth: 1, borderColor: W.border,
          borderTopWidth: 1, borderTopColor: W.innerBorder,
          borderLeftWidth: 1, borderLeftColor: W.innerBorder,
        }}
        onPress={onGrimoire}
      >
        <Text style={{ fontFamily: 'VT323', fontSize: 13, letterSpacing: 2, color: W.parchDim }}>
          [ GRIMÓRIO ]
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
//  TAVERN CARD — substitui ScrollCard com estética de madeira
// ═══════════════════════════════════════════════════════════

interface TavernCardProps {
  icon?: RPGIconName;
  title?: string;
  children: React.ReactNode;
  hero?: boolean;
}

function TavernCard({ icon, title, children, hero = false }: TavernCardProps) {
  return (
    <View style={[tcStyles.outer, hero && tcStyles.outerHero]}>
      {/* Highlight de topo (borda de madeira iluminada) */}
      <View style={{ height: 1, backgroundColor: hero ? W.borderHi : W.innerBorder }} />
      <View style={{ height: 1, backgroundColor: hero ? '#7A4020' : W.border }} />

      {/* Cabeçalho com ícone + título */}
      {(icon || title) && (
        <View style={[tcStyles.cardHeader, hero && tcStyles.cardHeaderHero]}>
          {/* Marcador lateral pixel */}
          <View style={{ width: 2, height: 18, backgroundColor: hero ? W.gold : W.borderHi }} />
          {icon && (
            <View style={tcStyles.iconBox}>
              <RPGIcon name={icon} size={hero ? 18 : 14} chip={false} />
            </View>
          )}
          {title && (
            <Text style={[tcStyles.cardTitle, hero && tcStyles.cardTitleHero]}>{title}</Text>
          )}
          {/* Marcador lateral pixel direito */}
          <View style={{ width: 2, height: 18, backgroundColor: hero ? W.gold : W.borderHi }} />
        </View>
      )}

      {/* Separador de veio de madeira */}
      <View style={{ height: 1, backgroundColor: W.plankShadow }} />
      <View style={{ height: 1, backgroundColor: W.border, opacity: 0.5 }} />

      {/* Corpo */}
      <View style={[tcStyles.body, hero && tcStyles.bodyHero]}>
        {children}
      </View>

      {/* Sombra de rodapé */}
      <View style={{ height: 1, backgroundColor: W.plankShadow }} />
      <View style={{ height: 2, backgroundColor: '#080400' }} />
    </View>
  );
}

const tcStyles = StyleSheet.create({
  outer: {
    backgroundColor: W.cardBg,
    borderWidth: 1, borderColor: W.border,
    overflow: 'hidden',
  },
  outerHero: {
    backgroundColor: W.cardBgHero,
    borderWidth: 2, borderColor: W.borderHi,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#120804',
  },
  cardHeaderHero: {
    paddingVertical: 9,
    backgroundColor: '#1A0A04',
  },
  iconBox: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: W.plankShadow,
    borderWidth: 1, borderColor: W.border,
  },
  cardTitle: {
    fontFamily: 'VT323', fontSize: 13, letterSpacing: 2,
    color: W.parchDim, flex: 1,
    textTransform: 'uppercase',
  },
  cardTitleHero: {
    fontSize: 14, color: '#C09040', letterSpacing: 2.5,
  },
  body: { padding: 12, gap: 10 },
  bodyHero: { padding: 14 },
});

// ═══════════════════════════════════════════════════════════
//  SEPARADOR DE MADEIRA
// ═══════════════════════════════════════════════════════════

function WoodDivider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: W.border }} />
      <View style={{ width: 4, height: 4, backgroundColor: W.borderHi }} />
      <View style={{ flex: 1, height: 1, backgroundColor: W.border }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth() + 1;

  const { transactions, getMonthlyTotals, getTopCategories } = useTransactionStore();
  const { closingDay, dueDay, enabled: creditEnabled } = useCreditStore();
  const { getActiveDebts, getTotalBalance } = useDebtStore();
  const { payment5thCents, payment20thCents, paymentLastCents, salaryAccountId, totalMonthlyCents } = useSalaryStore();
  const { getActiveAccounts } = useAccountStore();

  const { expenseCents } = getMonthlyTotals(year, month);
  const { received5th, received20th, receivedLast } = getReceivedPayments(year, month, today);
  const receivedSoFarCents =
    (received5th ? payment5thCents  : 0) +
    (received20th ? payment20thCents : 0) +
    (receivedLast ? paymentLastCents : 0);
  const pendingCents        = totalMonthlyCents() - receivedSoFarCents;
  const projectionCents     = totalMonthlyCents() - expenseCents;
  const currentBalanceCents = receivedSoFarCents - expenseCents;
  const activeDebts         = getActiveDebts();
  const totalDebtBalance    = getTotalBalance();

  const activeAccounts = getActiveAccounts();
  const realmAccounts  = ACCOUNT_ORDER
    .map(id => activeAccounts.find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map(account => {
      let bal = account.balance_cents;
      if (account.id === salaryAccountId) bal += receivedSoFarCents;
      for (const tx of transactions) {
        if (tx.deleted_at || tx.type === 'credit') continue;
        if (tx.type === 'transfer') {
          if (tx.account_id === account.id) bal -= tx.amount_cents;
          if (tx.transfer_to_account_id === account.id) bal += tx.amount_cents;
          continue;
        }
        if (tx.account_id !== account.id) continue;
        if (tx.type === 'income')  bal += tx.amount_cents;
        if (tx.type === 'expense') bal -= tx.amount_cents;
      }
      return { ...account, displayName: ACCOUNT_LABELS[account.id] ?? account.name, currentBalanceCents: money(bal) };
    });

  const cashflowBars = MONTH_NAMES.map((label, i) => {
    const { incomeCents: inc, expenseCents: exp } = getMonthlyTotals(year, i + 1);
    return { label, value: inc - exp, isHighlighted: i === month - 1 };
  });

  const topCategories = getTopCategories(year, month);
  const maxCatAmount  = Math.max(...topCategories.map(c => c.amountCents), 1);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await performSync(); } catch { /* tratado no syncStore */ }
    finally { setRefreshing(false); }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={W.amber} />
      }
    >
      {/* ── Header: Placa da Taverna ─────────────────────── */}
      <TavernHeader
        month={month} year={year}
        screenWidth={SW}
        onGrimoire={() => router.push('/more')}
      />

      {/* ── Hero: Bolsa de Ouro ──────────────────────────── */}
      <TavernCard icon="coin_bag" title="BOLSA DE OURO" hero>
        <Text style={[styles.heroAmount, { color: projectionCents >= 0 ? W.gold : W.red }]}>
          {formatBRL(money(projectionCents))}
        </Text>

        <View style={styles.currentRow}>
          <Text style={styles.currentLabel}>NA CONTA AGORA</Text>
          <Text style={[styles.currentValue, { color: currentBalanceCents >= 0 ? W.green : W.red }]}>
            {formatBRL(money(currentBalanceCents))}
          </Text>
        </View>

        <WoodDivider />

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>RECEBIDO</Text>
            <Text style={[styles.heroStatValue, { color: W.green }]}>
              +{formatBRL(money(receivedSoFarCents))}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>A RECEBER</Text>
            <Text style={[styles.heroStatValue, { color: W.amber }]}>
              +{formatBRL(money(pendingCents))}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>GASTOS</Text>
            <Text style={[styles.heroStatValue, { color: W.red }]}>
              {formatBRL(expenseCents)}
            </Text>
          </View>
        </View>
      </TavernCard>

      {/* ── Cofres do Reino ──────────────────────────────── */}
      <TavernCard icon="gem" title="COFRES DO REINO">
        {realmAccounts.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhum cofre ativo encontrado.</Text>
        ) : (
          <View style={{ gap: 0 }}>
            {realmAccounts.map((account, idx) => (
              <React.Fragment key={account.id}>
                <View style={styles.accountRow}>
                  <View style={styles.accountLeft}>
                    <BankIcon bank={account.id} size={28} />
                    <View>
                      <Text style={styles.accountName}>{account.displayName}</Text>
                      <Text style={styles.accountMeta}>saldo disponível</Text>
                    </View>
                  </View>
                  <Text style={[styles.accountBalance, { color: account.currentBalanceCents >= 0 ? W.green : W.red }]}>
                    {formatBRL(account.currentBalanceCents)}
                  </Text>
                </View>
                {idx < realmAccounts.length - 1 && <View style={styles.woodSep} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </TavernCard>

      {/* ── Fatura do cartão ─────────────────────────────── */}
      {creditEnabled && (
        <CreditInvoiceWidget
          closingDay={closingDay}
          dueDay={dueDay}
          onPress={() => router.push('/(tabs)/transactions')}
        />
      )}

      {/* ── Fluxo de Magia ───────────────────────────────── */}
      <TavernCard icon="potion_blue" title="FLUXO DE MAGIA">
        <BarChart data={cashflowBars} height={120} />
      </TavernCard>

      {/* ── Ordens de Compra ─────────────────────────────── */}
      <TavernCard icon="chest" title="ORDENS DE COMPRA">
        {topCategories.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma ordem registrada este mês.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {topCategories.map(cat => (
              <View key={cat.name} style={{ gap: 5 }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catAmt}>{formatBRL(cat.amountCents)}</Text>
                </View>
                <ProgressBar progress={cat.amountCents / maxCatAmount} height={4} color={W.amber} />
              </View>
            ))}
          </View>
        )}
      </TavernCard>

      {/* ── Dívidas ao Ferreiro ──────────────────────────── */}
      <TouchableOpacity onPress={() => router.push('/debts')} activeOpacity={0.8}>
        <TavernCard icon="trident" title="DÍVIDAS AO FERREIRO">
          <View style={styles.debtRow}>
            <Text style={styles.debtLabel}>Títulos de guerra</Text>
            <Text style={styles.debtValue}>{activeDebts.length} contratos</Text>
          </View>
          <View style={styles.woodSep} />
          <View style={styles.debtRow}>
            <Text style={styles.debtLabel}>Saldo total</Text>
            <Text style={[styles.debtValue, { color: W.red }]}>
              {formatBRL(totalDebtBalance)}
            </Text>
          </View>
          <Text style={styles.tapHint}>Toque para quitar débitos →</Text>
        </TavernCard>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
//  ESTILOS
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: W.bg },
  content:   { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },

  // ── Hero ──────────────────────────────────────────────
  heroAmount: {
    fontFamily: 'VT323', fontSize: 48,
    letterSpacing: 1, fontVariant: ['tabular-nums'],
  },
  currentRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'flex-end', gap: Spacing.sm,
    marginTop: -4,
  },
  currentLabel: {
    fontFamily: 'VT323', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 2,
    color: W.parchDim,
  },
  currentValue: {
    fontFamily: 'VT323', fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatDivider: {
    width: 1, height: 28,
    backgroundColor: W.border,
  },
  heroStatLabel: {
    fontFamily: 'VT323', fontSize: 10,
    letterSpacing: 1.5, textTransform: 'uppercase',
    color: W.parchDim,
  },
  heroStatValue: {
    fontFamily: 'VT323', fontSize: 16,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  // ── Separadores ───────────────────────────────────────
  woodSep: {
    height: 1, backgroundColor: W.border, marginVertical: 4,
  },

  // ── Contas ────────────────────────────────────────────
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  accountLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, flex: 1, paddingRight: Spacing.md,
  },
  accountName: { fontFamily: 'VT323', fontSize: 16, color: W.parchment },
  accountMeta: {
    fontFamily: 'VT323', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 1.5,
    color: W.parchDim,
  },
  accountBalance: {
    fontFamily: 'VT323', fontSize: 18,
    fontVariant: ['tabular-nums'], textAlign: 'right',
  },

  // ── Categorias ────────────────────────────────────────
  catRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontFamily: 'VT323', fontSize: 14, color: W.parchment },
  catAmt:  { fontFamily: 'VT323', fontSize: 14, fontVariant: ['tabular-nums'], color: W.parchment },

  // ── Dívidas ───────────────────────────────────────────
  debtRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: Spacing.sm,
  },
  debtLabel: { fontFamily: 'VT323', fontSize: 13, color: W.parchDim },
  debtValue: { fontFamily: 'VT323', fontSize: 16, fontVariant: ['tabular-nums'], color: W.parchment },
  tapHint:   { fontFamily: 'VT323', fontSize: 11, color: W.amber, textAlign: 'right', marginTop: 4 },

  // ── Empty ─────────────────────────────────────────────
  emptyHint: { fontFamily: 'VT323', fontSize: 13, color: W.parchDim, marginTop: 4 },
});
