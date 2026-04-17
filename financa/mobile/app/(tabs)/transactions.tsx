/**
 * Masmorra — transações agrupadas por data, com filtros e busca.
 */
import React, { useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore, Transaction } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { useCreditStore } from '@/store/creditStore';
import {
  getCurrentInvoiceMonthKey,
  getInvoiceMonthKey,
  getInvoiceClosingDate,
  isInvoiceClosed,
  formatInvoiceLabel,
} from '@/lib/credit';

// ── Paleta da masmorra (baseada na imagem de referência) ────
const P = {
  // Pedra
  abyss:    '#0A0A12',
  stone0:   '#1C1C28',   // pedra escura
  stone1:   '#222232',   // pedra média
  stone2:   '#282838',   // pedra clara
  stone3:   '#2E2E42',   // pedra mais clara (perto da tocha)
  mortar:   '#0C0C16',   // argamassa (mais escura que pedra)
  // Iluminação
  torch:    '#E8A020',
  torchMid: '#FF6000',
  torchGlow:'#3D2A08',   // calor âmbar no tijolo
  torchPost:'#4A3010',
  // Hera
  ivy0:     '#1A3A10',   // sombra
  ivy1:     '#2A5A1A',   // escuro
  ivy2:     '#3A7A22',   // médio
  ivy3:     '#4A9A2A',   // vivo
  ivy4:     '#5AB030',   // brilhante
  // Texto / UI
  cream:    '#C8C8D8',
  silver:   '#8A8A9A',
  dim:      '#484860',
  // Filtros
  green:    '#4ABA5A',
  red:      '#BA4A4A',
  blue:     '#5A8ACA',
  // Pilar
  pillar0:  '#303040',
  pillar1:  '#404050',
  pillar2:  '#282838',
  // Arco
  archDark: '#000008',
};

// ═══════════════════════════════════════════════════════════
//  COMPONENTES PIXEL ART
// ═══════════════════════════════════════════════════════════

// Larguras de tijolo — mais largas e variadas para pixel art nítido
const BW = [72, 58, 80, 54, 68, 62, 76, 56, 84, 60, 70, 64];
// 3 tons bem contrastados + variante quente (tocha)
const STONE_DARK  = '#1E1E2C';
const STONE_MID   = '#2A2A3C';
const STONE_LIGHT = '#363648';
const STONE_WARM  = '#332818'; // tijolo aquecido pela tocha
// Chanfro: borda superior mais clara, borda inferior mais escura
const CHAMFER_TOP = '#424256';
const CHAMFER_BOT = '#141420';

// Paletas de cor por fileira (3 tons alternados)
const ROW_PALS: string[][] = [
  [STONE_DARK,  STONE_MID,   STONE_DARK,  STONE_LIGHT],
  [STONE_MID,   STONE_LIGHT, STONE_MID,   STONE_DARK ],
  [STONE_LIGHT, STONE_DARK,  STONE_MID,   STONE_MID  ],
  [STONE_DARK,  STONE_DARK,  STONE_LIGHT, STONE_MID  ],
];

/** Fileira de tijolos pixel art — h=20px com chanfro e argamassa grossa */
function BrickRow({ row, warmLeft = false, warmRight = false, screenWidth = 420 }: {
  row: number; warmLeft?: boolean; warmRight?: boolean; screenWidth?: number;
}) {
  const pal = ROW_PALS[row % ROW_PALS.length];
  const offset = (row % 2 === 0) ? 0 : 40;
  const bricks: { x: number; w: number; base: string }[] = [];
  let x = -offset;
  let idx = (row * 3) % BW.length;
  while (x < screenWidth + 100) {
    const w = BW[idx % BW.length];
    const base = pal[(idx + row) % pal.length];
    bricks.push({ x, w, base });
    x += w + 2; // 2px de argamassa
    idx++;
  }
  return (
    // Espaço de 2px de argamassa: marginBottom na linha inteira
    <View style={{ marginBottom: 2 }}>
      {bricks.map((b, i) => {
        let color = b.base;
        if (warmLeft  && b.x < 100) color = STONE_WARM;
        if (warmRight && b.x > screenWidth - 100) color = STONE_WARM;
        return (
          <View key={i} style={{
            position: 'absolute', left: b.x, top: 0,
            width: b.w, height: 20,
            backgroundColor: color,
            // Chanfro pixel art: linha 1px clara no topo, escura na base
            borderTopWidth: 1,    borderTopColor: CHAMFER_TOP,
            borderBottomWidth: 1, borderBottomColor: CHAMFER_BOT,
          }} />
        );
      })}
      {/* Altura do container = 20px do tijolo + 1px chanfro top + 1px chanfro bot */}
      <View style={{ height: 22 }} />
    </View>
  );
}

/** Pixel art de hera — cluster de folhas 4×4px */
const IVY_PATTERNS: number[][][] = [
  // 0 — canto superior esquerdo, densa
  [[0,0,3],[4,0,4],[8,0,2],[12,0,3],[16,0,1],
   [0,4,2],[4,4,3],[8,4,4],[12,4,2],[20,0,3],
   [0,8,3],[4,8,1],[8,8,3],[16,4,3],[20,4,2],
   [0,12,1],[4,12,2],[8,12,1],[12,8,1],[16,8,2],
   [0,16,2],[4,16,3],[8,20,2],[0,20,1],[4,20,0]],
  // 1 — pendendo para baixo
  [[0,0,3],[4,0,2],[8,0,4],[0,4,2],[4,4,4],[8,4,2],
   [0,8,4],[4,8,3],[0,12,2],[4,12,2],[8,8,3],
   [0,16,3],[4,16,1],[0,20,1],[8,12,2],[4,20,2]],
  // 2 — canto superior direito
  [[0,0,1],[4,0,3],[8,0,2],[12,0,4],[16,0,3],
   [0,4,3],[4,4,1],[8,4,3],[12,4,2],[16,4,2],
   [4,8,2],[8,8,4],[12,8,3],[16,8,1],
   [8,12,2],[12,12,3],[16,12,2],[12,16,1],[16,16,3]],
  // 3 — ramo lateral
  [[0,0,3],[0,4,2],[0,8,4],[0,12,3],[0,16,2],
   [4,4,3],[4,8,2],[4,12,3],[8,8,4],[8,12,2]],
];
const IVY_C = [P.ivy0, P.ivy1, P.ivy2, P.ivy3, P.ivy4];

function IvyCluster({ left, top, pattern = 0 }: { left: number; top: number; pattern?: number }) {
  const pts = IVY_PATTERNS[pattern % IVY_PATTERNS.length];
  return (
    <>
      {pts.map(([dx, dy, ci], i) => (
        <View key={i} style={{
          position: 'absolute',
          left: left + dx, top: top + dy,
          width: 4, height: 4,
          backgroundColor: IVY_C[ci],
        }} />
      ))}
    </>
  );
}

/** Halo âmbar de tocha — círculos concêntricos */
function TorchHalo({ cx, cy }: { cx: number; cy: number }) {
  const rings = [
    { r: 60, op: 0.05 },
    { r: 44, op: 0.09 },
    { r: 30, op: 0.15 },
    { r: 18, op: 0.24 },
    { r: 10, op: 0.35 },
  ];
  return (
    <>
      {rings.map((ring, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: cx - ring.r / 2,
          top: cy - ring.r * 0.45,
          width: ring.r,
          height: ring.r * 0.9,
          borderRadius: ring.r / 2,
          backgroundColor: P.torch,
          opacity: ring.op,
        }} />
      ))}
    </>
  );
}

/**
 * Tocha pixel art pura — sem emoji, sem borderRadius.
 * Chama construída com Views quadradas empilhadas (escadinha).
 *
 *        ██          ← topo amarelo   4×4
 *       ████         ← meio laranja   6×6
 *      ██████        ← base vermelha 10×6
 *      ██████        ← base vermelha 10×6 (2ª camada)
 *      ██████        ← cabeça tocha  10×6
 *       ████         ← pescoço        6×4
 *        ██          ← poste          6×…
 *        ██
 *        ██
 */
function Torch({ x, y }: { x: number; y: number }) {
  return (
    <>
      {/* ── Chama topo — amarelo (4×4) ── */}
      <View style={{ position: 'absolute', left: x - 2, top: y,     width: 4,  height: 4,  backgroundColor: '#FFEE00' }} />
      {/* ── Chama meio — laranja (6×6) ── */}
      <View style={{ position: 'absolute', left: x - 3, top: y + 4, width: 6,  height: 6,  backgroundColor: '#FF8800' }} />
      {/* ── Chama meio-2 (8×4) ─────────── */}
      <View style={{ position: 'absolute', left: x - 4, top: y + 8, width: 8,  height: 4,  backgroundColor: '#FF6600' }} />
      {/* ── Chama base — vermelho (10×6) ── */}
      <View style={{ position: 'absolute', left: x - 5, top: y +12, width: 10, height: 6,  backgroundColor: '#FF4400' }} />
      {/* ── Cabeça da tocha (10×6) ──────── */}
      <View style={{ position: 'absolute', left: x - 5, top: y +18, width: 10, height: 6,  backgroundColor: '#5A3A10' }} />
      {/* ── Pescoço (6×4) ───────────────── */}
      <View style={{ position: 'absolute', left: x - 3, top: y +24, width: 6,  height: 4,  backgroundColor: '#4A2E0C' }} />
      {/* ── Poste / fuste (6×20) ────────── */}
      <View style={{ position: 'absolute', left: x - 3, top: y +28, width: 6,  height: 20, backgroundColor: '#3C2208',
        borderLeftWidth: 1, borderLeftColor: '#5A3A18',
        borderRightWidth: 1, borderRightColor: '#221208',
      }} />
      {/* ── Suporte de parede (10×4) ────── */}
      <View style={{ position: 'absolute', left: x - 5, top: y +46, width: 10, height: 4,  backgroundColor: '#2A1A08' }} />
    </>
  );
}

/**
 * Pilar pixel art — segmentos alternados de pedra + capitel + base.
 * Usa chanfro lateral para dar volume sem gradiente.
 */
function Pillar({ x, totalH, screenH }: { x: number; totalH: number; screenH: number }) {
  const W = 16;
  const SEGS = 8; // número de segmentos de pedra no fuste
  const segH = Math.floor((totalH - 20) / SEGS); // altura de cada segmento
  const fusteTop = screenH - totalH + 10; // +10 para capitel
  const segColors = [STONE_MID, STONE_DARK];

  return (
    <>
      {/* ── Capitel (degrau triplo de cima para baixo) ── */}
      <View style={{ position: 'absolute', left: x - 6, top: fusteTop - 10, width: W + 12, height: 4,  backgroundColor: STONE_LIGHT, borderTopWidth: 1, borderTopColor: CHAMFER_TOP }} />
      <View style={{ position: 'absolute', left: x - 3, top: fusteTop - 6,  width: W + 6,  height: 3,  backgroundColor: STONE_MID }} />
      <View style={{ position: 'absolute', left: x - 1, top: fusteTop - 3,  width: W + 2,  height: 3,  backgroundColor: STONE_DARK }} />

      {/* ── Fuste segmentado ── */}
      {Array.from({ length: SEGS }, (_, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: x, top: fusteTop + i * segH,
          width: W, height: segH - 1, // -1 = junta entre pedras
          backgroundColor: segColors[i % 2],
          // Chanfro lateral: highlight esquerda, sombra direita
          borderLeftWidth: 2,  borderLeftColor:  '#3A3A50',
          borderRightWidth: 1, borderRightColor: '#141420',
        }} />
      ))}

      {/* ── Base (degrau triplo de cima para baixo) ── */}
      <View style={{ position: 'absolute', left: x - 1, top: screenH - 9,  width: W + 2,  height: 3,  backgroundColor: STONE_DARK }} />
      <View style={{ position: 'absolute', left: x - 3, top: screenH - 6,  width: W + 6,  height: 3,  backgroundColor: STONE_MID }} />
      <View style={{ position: 'absolute', left: x - 6, top: screenH - 3,  width: W + 12, height: 3,  backgroundColor: STONE_LIGHT, borderBottomWidth: 1, borderBottomColor: CHAMFER_BOT }} />
    </>
  );
}

/**
 * Arco gótico pixel art — NENHUM borderRadius.
 * Construído como linhas [pedra esquerda | void negro | pedra direita].
 * A largura do void diminui de baixo para cima criando a "escadinha" pixel art.
 *
 * Leitura de baixo para cima (renderizado de cima para baixo):
 *   void=64 (parede reta)  ←── paredes laterais
 *   void=64
 *   void=62  ┐
 *   void=56  │  escadinha
 *   void=48  │  do arco
 *   void=38  │
 *   void=26  │
 *   void=14  │
 *   void= 4  ┘ ← topo (quase fechado)
 */
function PixelArch({ cx, bottomY }: { cx: number; bottomY: number }) {
  const OUTER_W = 96; // largura total do arco incluindo as pedras
  // Cada linha: { voidW, h } — de cima (topo do arco) para baixo (base)
  const STEPS = [
    { voidW:  4, h: 6  }, // topo — quase fechado
    { voidW: 14, h: 6  }, // degrau 1
    { voidW: 26, h: 6  }, // degrau 2
    { voidW: 38, h: 6  }, // degrau 3
    { voidW: 48, h: 6  }, // degrau 4
    { voidW: 56, h: 6  }, // degrau 5
    { voidW: 62, h: 6  }, // degrau 6 (quase parede reta)
    { voidW: 66, h: 14 }, // parede reta superior
    { voidW: 66, h: 14 }, // parede reta inferior
    { voidW: 66, h: 999 }, // estende até o fundo do header (calculado abaixo)
  ];

  // Calcula a altura total dos degraus (exceto o último que preenche o restante)
  const fixedH = STEPS.slice(0, -1).reduce((s, r) => s + r.h, 0);
  // Y de onde começa o arco (topo do degrau mais estreito)
  const archTop = bottomY - fixedH - 60; // 60 = espaço para a parede reta abaixo

  let currentY = archTop;

  return (
    <>
      {STEPS.map((step, i) => {
        const stoneW = (OUTER_W - step.voidW) / 2;
        const isLast = i === STEPS.length - 1;
        const rowH = isLast ? (bottomY - currentY) : step.h;
        const y = currentY;
        currentY += rowH;

        const stoneColor = i % 2 === 0 ? STONE_MID : STONE_DARK;

        return (
          <React.Fragment key={i}>
            {/* Pedra esquerda */}
            <View style={{
              position: 'absolute',
              left: cx - OUTER_W / 2, top: y,
              width: stoneW, height: rowH,
              backgroundColor: stoneColor,
              borderRightWidth: 1, borderRightColor: CHAMFER_BOT,
            }} />
            {/* Void negro */}
            <View style={{
              position: 'absolute',
              left: cx - step.voidW / 2, top: y,
              width: step.voidW, height: rowH,
              backgroundColor: P.archDark,
            }} />
            {/* Pedra direita */}
            <View style={{
              position: 'absolute',
              left: cx + step.voidW / 2, top: y,
              width: stoneW, height: rowH,
              backgroundColor: stoneColor,
              borderLeftWidth: 1, borderLeftColor: CHAMFER_TOP,
            }} />
          </React.Fragment>
        );
      })}

      {/* Destaque no degrau mais estreito (keystone pixel) */}
      <View style={{
        position: 'absolute',
        left: cx - 2, top: archTop,
        width: 4, height: 2,
        backgroundColor: STONE_LIGHT,
      }} />
    </>
  );
}

/** Header completo da Masmorra */
function DungeonHeader({
  screenWidth,
  searchOpen,
  onToggleSearch,
}: {
  screenWidth: number;
  searchOpen: boolean;
  onToggleSearch: () => void;
}) {
  // Cada fileira de tijolo ocupa 22px (20 tijolo + 2 argamassa)
  const NUM_ROWS = 9;
  const H = NUM_ROWS * 22 + 2; // ≈ 200px

  const torchLX = 48;
  const torchRX = screenWidth - 52;
  const torchY  = 38; // topo da chama

  const archCX   = screenWidth / 2;
  // Pilares: justo nas bordas do arco (arco tem OUTER_W=96px)
  const pillarLX = archCX - 48 - 18; // esquerda do arco - largura pilar
  const pillarRX = archCX + 48 + 2;  // direita do arco
  const pillarH  = 80;

  return (
    <View style={{ height: H, backgroundColor: P.mortar, overflow: 'hidden', position: 'relative' }}>

      {/* ── Fileiras de tijolo pixel art ──────────── */}
      {Array.from({ length: NUM_ROWS }, (_, i) => (
        <BrickRow
          key={i}
          row={i}
          warmLeft={i >= 1 && i <= 6}
          warmRight={i >= 1 && i <= 6}
          screenWidth={screenWidth}
        />
      ))}

      {/* ── Halos âmbar das tochas ────────────────── */}
      <TorchHalo cx={torchLX} cy={torchY + 14} />
      <TorchHalo cx={torchRX} cy={torchY + 14} />

      {/* ── Hera — canto superior esquerdo ─────────── */}
      <IvyCluster left={0}   top={0}  pattern={0} />
      <IvyCluster left={24}  top={8}  pattern={3} />
      <IvyCluster left={0}   top={36} pattern={1} />
      <IvyCluster left={16}  top={52} pattern={3} />

      {/* ── Hera — canto superior direito ─────────── */}
      <IvyCluster left={screenWidth - 100} top={0}  pattern={2} />
      <IvyCluster left={screenWidth - 72}  top={6}  pattern={3} />
      <IvyCluster left={screenWidth - 40}  top={12} pattern={1} />
      <IvyCluster left={screenWidth - 28}  top={50} pattern={3} />

      {/* ── Arco gótico pixel art ─────────────────── */}
      <PixelArch cx={archCX} bottomY={H} />

      {/* ── Pilares pixel art ─────────────────────── */}
      <Pillar x={pillarLX} totalH={pillarH} screenH={H} />
      <Pillar x={pillarRX} totalH={pillarH} screenH={H} />

      {/* ── Tochas pixel art ──────────────────────── */}
      <Torch x={torchLX} y={torchY} />
      <Torch x={torchRX} y={torchY} />

      {/* ── Título entalhado na pedra ─────────────── */}
      <View style={{
        position: 'absolute', left: 0, right: 0, top: 14,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'VT323', fontSize: 11, letterSpacing: 4,
          color: P.dim,
        }}>✦ REGISTRO DOS AVENTUREIROS ✦</Text>
        <Text style={{
          fontFamily: 'VT323', fontSize: 36, letterSpacing: 6,
          color: P.cream,
          textShadowColor: P.torch,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        }}>A MASMORRA</Text>
      </View>

      {/* ── Botão busca ───────────────────────────── */}
      <TouchableOpacity
        style={[hsStyles.searchBtn, searchOpen && hsStyles.searchBtnActive]}
        onPress={onToggleSearch}
      >
        <Text style={[hsStyles.searchBtnText, searchOpen && hsStyles.searchBtnTextActive]}>
          {searchOpen ? '[ ✕ ]' : '[ ᚱ ]'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const hsStyles = StyleSheet.create({
  searchBtn: {
    position: 'absolute',
    right: 10, bottom: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: P.stone0,
    borderWidth: 1, borderColor: P.stone2,
  },
  searchBtnActive: {
    borderColor: P.red,
    backgroundColor: `${P.red}18`,
  },
  searchBtnText: {
    fontFamily: 'VT323', fontSize: 14, letterSpacing: 2,
    color: P.silver,
  },
  searchBtnTextActive: { color: P.red },
});

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

type FilterType = 'all' | 'income' | 'expense' | 'credit';

interface Section {
  title: string;
  totalCents: number;
  isPositive: boolean;
  data: Transaction[];
}

function groupByDate(transactions: Transaction[]): Section[] {
  const groups: Record<string, Transaction[]> = {};
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  for (const t of transactions) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => {
      const label = date === today ? 'Hoje' : date === yesterday ? 'Ontem' : fmtDateBR(date);
      const totalCents = items.reduce((s, t) => {
        if (t.type === 'income') return s + t.amount_cents;
        if (t.type === 'transfer') return s;
        return s - t.amount_cents;
      }, 0);
      return { title: `${label}, ${fmtDayMonth(date)}`, totalCents, isPositive: totalCents >= 0, data: items };
    });
}
function fmtDateBR(iso: string) {
  const M = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(iso.split('-')[2])} ${M[parseInt(iso.split('-')[1]) - 1]}`;
}
function fmtDayMonth(iso: string) {
  const [, m, d] = iso.split('-');
  const M = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(d)} ${M[parseInt(m) - 1]}`;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'TUDO'     },
  { key: 'income',  label: 'TESOURO'  },
  { key: 'expense', label: 'MALDIÇÃO' },
  { key: 'credit',  label: 'DÍVIDA'   },
];

// ═══════════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { transactions } = useTransactionStore();
  const { getCategoryName, getCategoryIcon } = useCategoryStore();
  const { closingDay, enabled: creditEnabled } = useCreditStore();

  const currentInvoiceKey = getCurrentInvoiceMonthKey(closingDay);
  const invoiceClosed = isInvoiceClosed(currentInvoiceKey, closingDay);
  const invoiceClosingDate = getInvoiceClosingDate(currentInvoiceKey, closingDay);
  const invoiceClosingLabel = invoiceClosingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const invoiceTotalCents = transactions
    .filter((t) => !t.deleted_at && t.type === 'credit' && getInvoiceMonthKey(t.date, closingDay) === currentInvoiceKey)
    .reduce((s, t) => s + t.amount_cents, 0);

  const visible = useMemo(() => {
    let list = transactions.filter((t) => !t.deleted_at && t.type !== 'credit');
    if (filter === 'credit') {
      list = transactions.filter((t) => !t.deleted_at && t.type === 'credit');
    } else if (filter !== 'all') {
      list = list.filter((t) => t.type === filter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => {
        const catName = t.category_id ? getCategoryName(t.category_id).toLowerCase() : '';
        return t.description.toLowerCase().includes(q) || catName.includes(q);
      });
    }
    return list;
  }, [transactions, filter, query, getCategoryName]);

  const sections = useMemo(() => groupByDate(visible), [visible]);

  const toggleSearch = () => {
    setSearchOpen((v) => !v);
    if (searchOpen) setQuery('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header Masmorra ──────────────────────────────── */}
      <DungeonHeader
        screenWidth={SW}
        searchOpen={searchOpen}
        onToggleSearch={toggleSearch}
      />

      {/* ── Busca — nicho escavado ───────────────────────── */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <Text style={styles.searchRune}>ᚱ</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="categoria ou descrição..."
            placeholderTextColor={P.dim}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Filtros — pedras talhadas ────────────────────── */}
      <View style={styles.filterRow}>
        {/* Bloco de piso decorativo */}
        <View style={styles.floorSlab} />
        {FILTERS.filter((f) => f.key !== 'credit' || creditEnabled).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            {filter === f.key && <View style={styles.chipMossLeft} />}
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Fatura — placa arcana ────────────────────────── */}
      {creditEnabled && (
        <TouchableOpacity
          style={[styles.invoiceRow, invoiceClosed && styles.invoiceRowDanger]}
          onPress={() => setFilter('credit')}
          activeOpacity={0.75}
        >
          {/* Barra de musgo */}
          <View style={[styles.invoiceMoss, invoiceClosed && { backgroundColor: P.red }]} />
          <View style={styles.invoiceLeft}>
            <Text style={[styles.invoiceTitle, invoiceClosed && { color: P.red }]}>
              FATURA {formatInvoiceLabel(currentInvoiceKey)}
            </Text>
            <Text style={styles.invoiceHint}>
              {invoiceClosed ? '⚠ FECHADA — PAGAR' : `Fecha ${invoiceClosingLabel}`}
            </Text>
          </View>
          <Text style={[
            styles.invoiceAmt,
            { color: invoiceClosed ? P.red : P.blue },
            !invoiceClosed && invoiceTotalCents === 0 && { opacity: 0.4 },
          ]}>
            {formatBRL(money(invoiceTotalCents))}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Lista por data ───────────────────────────────── */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionSlab}>
            {/* Pixel de musgo */}
            <View style={styles.slabMoss} />
            <View style={styles.slabMoss2} />
            <Text style={styles.sectionDate}>{section.title.toUpperCase()}</Text>
            <View style={styles.slabLine} />
            <Text style={[styles.sectionTotal, { color: section.isPositive ? P.green : P.silver }]}>
              {section.isPositive ? '+' : ''}{formatBRL(money(section.totalCents))}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            description={item.description}
            categoryName={item.category_id ? getCategoryName(item.category_id) : undefined}
            categoryIcon={item.category_id ? getCategoryIcon(item.category_id) : undefined}
            amountCents={item.amount_cents}
            type={item.type}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {/* Mini arco pixel art — escadinha sem borderRadius */}
            {[4,12,22,32,40,46,48].map((voidW, i) => {
              const outerW = 56;
              const stoneW = (outerW - voidW) / 2;
              const h = i === 6 ? 20 : 6;
              return (
                <View key={i} style={{ flexDirection: 'row', height: h, marginBottom: 0 }}>
                  <View style={{ width: stoneW, height: h, backgroundColor: STONE_MID }} />
                  <View style={{ width: voidW,  height: h, backgroundColor: P.archDark }} />
                  <View style={{ width: stoneW, height: h, backgroundColor: STONE_MID }} />
                </View>
              );
            })}
            <Text style={styles.emptyTitle}>
              {query ? 'SEM REGISTROS' : 'MASMORRA VAZIA'}
            </Text>
            <Text style={styles.emptySub}>
              {query ? 'tente outra busca' : 'nenhum lançamento registrado'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
//  ESTILOS
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.abyss },

  // ── Busca ─────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: 10, marginTop: 6,
    backgroundColor: '#0A0A14',
    borderWidth: 1, borderColor: P.ivy2,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchRune: { fontFamily: 'VT323', fontSize: 18, color: P.ivy3 },
  searchInput: { flex: 1, fontFamily: 'VT323', fontSize: 16, color: P.cream, padding: 0 },
  searchClear: { fontFamily: 'VT323', fontSize: 16, color: P.silver },

  // ── Filtros ───────────────────────────────────────────
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#0E0E1A',
    borderBottomWidth: 1, borderBottomColor: P.mortar,
  },
  floorSlab: {
    width: 4, height: 26,
    backgroundColor: P.ivy1,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: P.stone0,
    borderWidth: 1, borderColor: '#282838',
    overflow: 'hidden',
    position: 'relative',
  },
  chipActive: {
    backgroundColor: '#1A3810',
    borderColor: P.ivy2,
  },
  chipMossLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: P.ivy3,
  },
  chipText: {
    fontFamily: 'VT323', fontSize: 13, letterSpacing: 1.5,
    color: P.silver,
  },
  chipTextActive: { color: P.ivy4 },

  // ── Fatura ────────────────────────────────────────────
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 10, marginBottom: 6,
    backgroundColor: `${P.blue}0D`,
    borderWidth: 1, borderColor: `${P.blue}28`,
    overflow: 'hidden',
  },
  invoiceRowDanger: {
    backgroundColor: `${P.red}0D`,
    borderColor: `${P.red}40`,
  },
  invoiceMoss: {
    width: 4, alignSelf: 'stretch',
    backgroundColor: P.ivy2,
  },
  invoiceLeft: { flex: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 10 },
  invoiceTitle: { fontFamily: 'VT323', fontSize: 14, letterSpacing: 2, color: P.blue },
  invoiceHint:  { fontFamily: 'VT323', fontSize: 10, letterSpacing: 1, color: P.silver },
  invoiceAmt:   { fontFamily: 'VT323', fontSize: 20, fontVariant: ['tabular-nums'], paddingRight: 12 },

  // ── Section slab (laje do piso) ───────────────────────
  sectionSlab: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#0E0E1C',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#1C1C2A',
    position: 'relative',
  },
  slabMoss: {
    width: 4, height: 4,
    backgroundColor: P.ivy2,
  },
  slabMoss2: {
    width: 4, height: 4,
    backgroundColor: P.ivy1,
    marginLeft: -2,
  },
  sectionDate: {
    fontFamily: 'VT323', fontSize: 11, letterSpacing: 2,
    color: P.dim,
  },
  slabLine: { flex: 1, height: 1, backgroundColor: '#1E1E2C' },
  sectionTotal: {
    fontFamily: 'VT323', fontSize: 14, fontVariant: ['tabular-nums'],
  },

  // ── Empty state ───────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 50, gap: 8 },
  emptyTitle: {
    fontFamily: 'VT323', fontSize: 18, letterSpacing: 3,
    color: P.dim,
  },
  emptySub: {
    fontFamily: 'VT323', fontSize: 12, letterSpacing: 1,
    color: '#2A2A3C',
  },
});
