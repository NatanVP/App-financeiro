/**
 * Goals / Missões — Forest Caravan pixel art theme.
 * Caravana de aventureiros na floresta densa.
 */
import React, { useEffect } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { formatBRL, money } from '@/lib/money';
import { useGoalStore, Goal } from '@/store/goalStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { GoalCard } from '@/components/ui/GoalCard';

// ── Paleta Floresta ──────────────────────────────────────────
const F = {
  sky0: '#8AB84A', sky1: '#7AAA3A', sky2: '#6A9A2A', sky3: '#5A8A1A',
  leaf0: '#0A2A08', leaf1: '#1A4A10', leaf2: '#2A6A18', leaf3: '#3A8A22', leaf4: '#4AAA2A',
  bark0: '#3A2010', bark1: '#5A3818', bark2: '#7A5028',
  dirt0: '#2A1A08', dirt1: '#3A2210', dirt2: '#4A3018',
  grass0: '#1A4A10', grass1: '#2A6A18', grass2: '#3A8A22',
  cart0: '#5A3210', cart1: '#7A4A18', cart2: '#9A6828', cartHi: '#C8882A',
  wheel0: '#2A1808', wheel1: '#6A4010', wheelHi: '#9A6020',
  iron: '#3A3A3A', ironHi: '#7A7A7A',
  horse0: '#1A0E08', horse1: '#3A2818', horse2: '#5A4028',
  horseMane: '#1A0E04', horseHoof: '#0E0804',
  skin: '#C8A878', skinDark: '#C08858',
  robeD: '#1A1248', robeMid: '#2A1A5A', robeLi: '#3A2A7A',
  staffWood: '#5A3818', orb: '#7A50CC',
  plateD: '#4A5A6A', plateMid: '#7A8A9A', plateLi: '#AABBCC', plateHi: '#CCDDEE',
  shield: '#3A4A6A',
  leatherD: '#3A2010', leatherMid: '#5A3A18',
  axeHead: '#8A9AA8', bandana: '#AA2222',
  capeD: '#1A3A10', capeMid: '#2A4A18', capeLi: '#3A6A22',
  bowWood: '#4A2A10', arrowMetal: '#8A8A9A',
  coatD: '#3A2010', coatMid: '#5A3A18',
  bgDark: '#0E1A0A',
  scrollBg: '#1A1008', scrollBd: '#3A2810', scrollHi: '#5A3A18',
  scrollHead: '#0E0A06', scrollText: '#C8A868', scrollDim: '#7A5A38',
  cream: '#E8D4A0', gold: '#F0C030', amber: '#E8A020', white: '#E8EAD0',
};

// ── Helper absoluto ─────────────────────────────────────────
const fp = (l: number, t: number, w: number, h: number, c: string) => (
  <View style={{ position: 'absolute', left: l, top: t, width: w, height: h, backgroundColor: c }} />
);

// ── TreeTrunk ───────────────────────────────────────────────
function TreeTrunk({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w + 4, height: h }}>
      {fp(0, 0, 2, h, F.bark0)}
      {fp(2, 0, w - 2, h, F.bark1)}
      {fp(w - 2, 0, 2, h, F.bark0)}
      {fp(w + 2, 0, 2, h, F.bark2)}
      {/* veios horizontais */}
      {fp(2, Math.floor(h * 0.3), w - 2, 1, F.bark0)}
      {fp(2, Math.floor(h * 0.6), w - 2, 1, F.bark2)}
      {/* raízes */}
      {fp(-2, h - 8, 2, 8, F.bark0)}
      {fp(w + 2, h - 6, 2, 6, F.bark0)}
    </View>
  );
}

// ── TreeCrown ───────────────────────────────────────────────
function TreeCrown({ x, y, w }: { x: number; y: number; w: number }) {
  const c = Math.floor(w / 2);
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w, height: 36 }}>
      {/* topo */}
      {fp(c - 4,  0,  8,  6, F.leaf1)}
      {fp(c - 8,  4, 16,  6, F.leaf2)}
      {/* camada 2 */}
      {fp(c - 12,  8, 24,  8, F.leaf2)}
      {fp(c - 6,   8, 12,  4, F.leaf3)}
      {/* base larga */}
      {fp(0,      14,  w, 10, F.leaf1)}
      {fp(4,      14, w - 8, 6, F.leaf2)}
      {fp(8,      18, w - 16, 4, F.leaf3)}
      {/* recortes pixel */}
      {fp(0,      22,  4,  4, F.leaf2)}
      {fp(w - 4,  22,  4,  4, F.leaf2)}
      {fp(c - 2,   2,  4,  4, F.leaf0)}
    </View>
  );
}

// ── PixelHorse ──────────────────────────────────────────────
// 56×46 container, virado para a direita
function PixelHorse({ dark = false }: { dark?: boolean }) {
  const bm = dark ? F.horse1 : F.horse2;
  const bd = dark ? F.horse0 : F.horse1;
  const mn = F.horseMane;
  const hf = F.horseHoof;
  return (
    <View style={{ width: 56, height: 46, position: 'relative' }}>
      {/* Cauda */}
      {fp(0, 10, 4,  6, mn)}
      {fp(0, 14, 2, 14, mn)}
      {fp(2, 24, 2,  6, bd)}
      {/* Corpo */}
      {fp(4,  8, 34, 20, bm)}
      {fp(2, 14, 36, 12, bd)}
      {fp(6,  6, 28,  6, bm)}
      {/* Garupa */}
      {fp(2, 10,  6, 18, bd)}
      {fp(2, 10,  8,  4, bm)}
      {/* Pescoço (degraus) */}
      {fp(32,  4, 8, 6, bm)}
      {fp(34,  2, 8, 5, bm)}
      {fp(36,  0, 6, 4, bm)}
      {/* Crina */}
      {fp(30,  2, 4, 16, mn)}
      {fp(32,  0, 4, 10, mn)}
      {fp(34,  4, 2,  8, bd)}
      {/* Cabeça */}
      {fp(40,  0, 14, 12, bm)}
      {fp(42,  2, 12,  8, bm)}
      {fp(50,  6,  6,  8, bd)}
      {fp(54,  8,  2,  4, bd)}
      {fp(42,  2,  2,  2, '#0A0808')}
      {fp(43,  3,  1,  1, '#FFFFFF')}
      {fp(44,  0,  4,  4, bm)}
      {fp(46,  0,  2,  3, bd)}
      {/* Pernas traseiras */}
      {fp(8,  28, 4, 12, bd)}
      {fp(6,  40, 6,  4, hf)}
      {fp(14, 26, 4, 14, bd)}
      {fp(12, 40, 6,  4, hf)}
      {/* Pernas dianteiras */}
      {fp(26, 28, 4, 12, bd)}
      {fp(24, 40, 6,  4, hf)}
      {fp(32, 22, 4,  8, bd)}
      {fp(34, 30, 4,  6, bd)}
      {fp(32, 36, 6,  4, hf)}
    </View>
  );
}

// ── PixelCarriage ───────────────────────────────────────────
// 164×88 container
function PixelCarriage() {
  const WL = 6;   // roda esquerda x
  const WR = 124; // roda direita x
  const WT = 50;  // roda top
  const WS = 32;  // roda size
  const WH = WS / 2;

  const Wheel = ({ x }: { x: number }) => (
    <>
      {/* aro */}
      {fp(x,          WT,       WS,  4, F.wheel0)}
      {fp(x,          WT+WS-4,  WS,  4, F.wheel0)}
      {fp(x,          WT,        4, WS, F.wheel0)}
      {fp(x+WS-4,     WT,        4, WS, F.wheel0)}
      {/* interior madeira */}
      {fp(x+4,        WT+4,  WS-8, WS-8, F.wheel1)}
      {/* raios cruz */}
      {fp(x+WH-2,     WT+4,     4, WS-8, F.cart0)}
      {fp(x+4,        WT+WH-2, WS-8,  4, F.cart0)}
      {/* cubo */}
      {fp(x+WH-4,     WT+WH-4,  8,  8, F.wheel0)}
      {fp(x+WH-2,     WT+WH-2,  4,  4, F.wheelHi)}
      {/* ferragem */}
      {fp(x+6,        WT+1,   WS-12, 2, F.iron)}
      {fp(x+6,        WT+WS-3, WS-12, 2, F.iron)}
    </>
  );

  return (
    <View style={{ width: 164, height: 88, position: 'relative' }}>
      {/* Eixo */}
      {fp(10, 64, 144, 4, F.cart0)}
      {fp(10, 65, 144, 2, F.iron)}

      {/* Rodas */}
      <Wheel x={WL} />
      <Wheel x={WR} />

      {/* === CORPO === */}
      {/* sombra externa */}
      {fp(24, 12, 120, 54, F.cart0)}
      {/* parede principal */}
      {fp(26, 14, 116, 50, F.cart1)}
      {/* moldura topo */}
      {fp(26, 14, 116, 8, F.cart2)}
      {fp(26, 14, 116, 2, F.cartHi)}
      {/* moldura base */}
      {fp(26, 58, 116, 6, F.cart0)}
      {fp(26, 58, 116, 2, F.cartHi)}
      {/* painéis decorativos esq/dir */}
      {fp(28, 24, 28, 28, F.cart0)}
      {fp(30, 26, 24, 24, F.cart1)}
      {fp(108, 24, 28, 28, F.cart0)}
      {fp(110, 26, 24, 24, F.cart1)}
      {/* dobradiças */}
      {fp(24, 28, 4, 6, F.iron)}
      {fp(24, 42, 4, 6, F.iron)}
      {fp(136, 28, 4, 6, F.iron)}
      {fp(136, 42, 4, 6, F.iron)}
      {/* janela central */}
      {fp(60, 18, 54, 36, F.cart0)}
      {fp(62, 20, 50, 32, '#080806')}
      {/* frame janela */}
      {fp(60, 18, 2, 36, F.cartHi)}
      {fp(112, 18, 2, 36, F.cartHi)}

      {/* === BANCO CONDUTOR === */}
      {fp(26,  4, 50,  2, F.cart0)}
      {fp(26,  6, 50, 10, F.cart2)}
      {fp(26,  6, 50,  2, F.cartHi)}
      {fp(26, 14, 50,  2, F.cart0)}
      {/* suportes banco */}
      {fp(32, 12,  6,  4, F.cart0)}
      {fp(54, 12,  6,  4, F.cart0)}

      {/* === VARAIS === */}
      {fp(0, 58, 28, 4, F.cart0)}
      {fp(0, 63, 28, 3, F.cart0)}
      {fp(0, 56,  6, 10, F.iron)}
    </View>
  );
}

// ── PixelDriver ─────────────────────────────────────────────
function PixelDriver() {
  return (
    <View style={{ width: 16, height: 30, position: 'relative' }}>
      {fp(0,  0, 16,  2, F.coatD)}
      {fp(2,  2, 12,  5, F.coatD)}
      {fp(3,  7,  8,  8, F.skin)}
      {fp(4,  8,  2,  2, '#1A1A1A')}
      {fp(8,  8,  2,  2, '#1A1A1A')}
      {fp(4, 12,  6,  2, '#4A3010')}
      {fp(2, 15, 10, 10, F.coatMid)}
      {fp(0, 16,  2,  8, F.coatMid)}
      {fp(12,16,  2,  8, F.coatMid)}
      {fp(0, 24,  2,  4, F.skin)}
      {fp(12,24,  2,  4, F.skin)}
      {fp(14,18,  1,  8, F.bark1)}
      {fp(14,26,  5,  1, F.bark1)}
    </View>
  );
}

// ── Personagens mini (na janela da carruagem) ───────────────
function MiniMage() {
  return (
    <View style={{ width: 12, height: 22, position: 'relative' }}>
      {fp(4,  0, 2, 2, F.robeMid)}
      {fp(3,  2, 4, 2, F.robeMid)}
      {fp(2,  4, 6, 2, F.robeMid)}
      {fp(1,  6, 8, 3, F.robeMid)}
      {fp(5,  2, 2, 2, F.gold)}
      {fp(2,  9, 8, 6, F.skin)}
      {fp(2, 10, 2, 2, '#1A1A1A')}
      {fp(6, 10, 2, 2, '#1A1A1A')}
      {fp(2, 15, 8, 2, F.white)}
      {fp(1, 17, 10, 5, F.robeMid)}
    </View>
  );
}
function MiniPaladin() {
  return (
    <View style={{ width: 12, height: 22, position: 'relative' }}>
      {fp(1,  0, 10, 8, F.plateMid)}
      {fp(1,  4,  10, 4, F.plateD)}
      {fp(3,  5,  6, 2, '#111')}
      {fp(9,  0,  2, 4, F.plateHi)}
      {fp(0,  8,  4, 4, F.plateMid)}
      {fp(8,  8,  4, 4, F.plateMid)}
      {fp(1,  8, 10, 8, F.plateMid)}
      {fp(0, 12,  4, 8, F.shield)}
      {fp(2, 13,  2, 6, F.white)}
      {fp(0, 15,  4, 2, F.white)}
      {fp(2, 16, 8, 6, F.plateD)}
    </View>
  );
}
function MiniWarrior() {
  return (
    <View style={{ width: 12, height: 22, position: 'relative' }}>
      {fp(1,  0, 10, 3, F.bandana)}
      {fp(2,  3,  8, 7, F.skinDark)}
      {fp(3,  4,  2, 2, '#1A1A1A')}
      {fp(7,  4,  2, 2, '#1A1A1A')}
      {fp(0, 10, 12, 8, F.leatherMid)}
      {fp(0, 10,  2, 8, F.leatherMid)}
      {fp(10,10,  2, 8, F.leatherMid)}
      {fp(2, 18,  4, 4, F.leatherD)}
      {fp(6, 18,  4, 4, F.leatherD)}
    </View>
  );
}
function MiniArcher() {
  return (
    <View style={{ width: 12, height: 22, position: 'relative' }}>
      {fp(0,  0, 12, 6, F.capeMid)}
      {fp(2,  6,  8, 6, F.skin)}
      {fp(3,  7,  2, 2, '#1A1A1A')}
      {fp(7,  7,  2, 2, '#1A1A1A')}
      {fp(1, 12, 10, 6, F.capeMid)}
      {fp(0, 13,  2, 6, F.capeLi)}
      {fp(10,13,  2, 6, F.capeLi)}
      {fp(2, 18,  4, 4, F.capeD)}
      {fp(6, 18,  4, 4, F.capeD)}
    </View>
  );
}

// ── MonsterEyes ─────────────────────────────────────────────
type MonsterType = 'orc' | 'ogre' | 'goblin' | 'wolf' | 'troll' | 'cyclops';

function MonsterEyes({ type }: { type: MonsterType }) {
  switch (type) {
    case 'orc':
      // olhos amarelo-verde oblíquos/raivosos
      return (
        <View style={{ width: 22, height: 8, position: 'relative' }}>
          {fp(0, 2, 5, 3, '#9AC810')}
          {fp(1, 0, 3, 2, '#9AC810')}
          {fp(2, 3, 2, 1, '#080808')}
          {fp(15, 0, 5, 3, '#9AC810')}
          {fp(14, 2, 3, 2, '#9AC810')}
          {fp(16, 1, 2, 1, '#080808')}
        </View>
      );
    case 'ogre':
      // olhos amarelos grandes, muito separados
      return (
        <View style={{ width: 36, height: 10, position: 'relative' }}>
          {fp(0,  0, 7, 7, '#D0A808')}
          {fp(2,  2, 3, 3, '#080808')}
          {fp(1,  0, 2, 1, '#F0C820')}
          {fp(29, 0, 7, 7, '#D0A808')}
          {fp(31, 2, 3, 3, '#080808')}
          {fp(30, 0, 2, 1, '#F0C820')}
        </View>
      );
    case 'goblin':
      // olhos verde brilhante, pequenos e próximos
      return (
        <View style={{ width: 14, height: 7, position: 'relative' }}>
          {fp(0, 0, 4, 5, '#10E020')}
          {fp(1, 1, 2, 3, '#080808')}
          {fp(9, 0, 4, 5, '#10E020')}
          {fp(10, 1, 2, 3, '#080808')}
        </View>
      );
    case 'wolf':
      // olhos branco-prateado com pupila vertical fina
      return (
        <View style={{ width: 24, height: 8, position: 'relative' }}>
          {fp(0,  0, 6, 6, '#B8D4B8')}
          {fp(2,  0, 2, 6, '#080808')}
          {fp(1,  1, 1, 1, '#E0F0E0')}
          {fp(18, 0, 6, 6, '#B8D4B8')}
          {fp(20, 0, 2, 6, '#080808')}
          {fp(19, 1, 1, 1, '#E0F0E0')}
        </View>
      );
    case 'troll':
      // olhos vermelho-sangue esbugalhados com veias
      return (
        <View style={{ width: 30, height: 9, position: 'relative' }}>
          {fp(0,  0, 7, 7, '#B02818')}
          {fp(2,  2, 3, 3, '#080808')}
          {fp(0,  3, 2, 1, '#D04020')}
          {fp(6,  1, 1, 3, '#802010')}
          {fp(22, 0, 7, 7, '#B02818')}
          {fp(24, 2, 3, 3, '#080808')}
          {fp(22, 3, 2, 1, '#D04020')}
          {fp(28, 1, 1, 3, '#802010')}
        </View>
      );
    case 'cyclops':
      // um único olho enorme amarelo-alaranjado
      return (
        <View style={{ width: 14, height: 12, position: 'relative' }}>
          {fp(0, 0, 14, 12, '#C89800')}
          {fp(3, 2,  8,  8, '#080808')}
          {fp(2, 1,  3,  2, '#E0B000')}
          {fp(9, 8,  2,  2, '#604800')}
        </View>
      );
    default: return null;
  }
}

// ── GrassDivider ────────────────────────────────────────────
function GrassDivider() {
  const { width } = useWindowDimensions();
  const H = [6, 10, 8, 12, 6, 10, 8, 6, 10, 12, 8, 6];
  const count = Math.ceil(width / 8);
  return (
    <View style={{ height: 16, backgroundColor: F.dirt1, flexDirection: 'row', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          width: 7, marginRight: 1,
          height: H[i % H.length],
          alignSelf: 'flex-start',
          backgroundColor: i % 3 === 0 ? F.grass2 : i % 3 === 1 ? F.grass1 : F.grass0,
        }} />
      ))}
    </View>
  );
}

// ── ForestHeader ────────────────────────────────────────────
function ForestHeader({ insetTop, onNew }: { insetTop: number; onNew: () => void }) {
  const { width } = useWindowDimensions();
  // Posições da caravana centradas
  const cx = width / 2;
  const h1x = cx - 126; // cavalo 1
  const h2x = cx - 72;  // cavalo 2
  const carx = cx - 22; // carruagem (164px wide)

  return (
    <View style={{ width: '100%', backgroundColor: F.leaf0, overflow: 'hidden' }}>
      {/* Safe area */}
      <View style={{ height: insetTop, backgroundColor: F.sky1 }} />

      {/* Céu filtrado */}
      <View style={{ height: 22, backgroundColor: F.sky0 }} />
      <View style={{ height: 14, backgroundColor: F.sky1 }} />
      <View style={{ height: 10, backgroundColor: F.sky2 }} />
      <View style={{ height:  8, backgroundColor: F.sky3 }} />

      {/* Cena floresta */}
      <View style={{ height: 178, position: 'relative', backgroundColor: F.leaf0, overflow: 'hidden' }}>

        {/* ═══════════════════════════════════════════════
            CAMADA 1 — ÁRVORES DE FUNDO (mais escuras)
            Distribuídas uniformemente por toda a largura
        ═══════════════════════════════════════════════ */}
        {[0.00, 0.09, 0.18, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.82, 0.91, 1.00].map((frac, i) => {
          const bx = frac * width;
          const cw = 42 + (i % 4) * 10;
          const yo = (i % 5) * 4;
          const tw = 9 + (i % 3) * 3;
          return (
            <React.Fragment key={`t1-${i}`}>
              <TreeCrown x={bx - cw / 2} y={yo - 6} w={cw} />
              <TreeTrunk x={bx - tw / 2} y={yo + 26} w={tw} h={152 - yo} />
            </React.Fragment>
          );
        })}

        {/* ═══════════════════════════════════════════════
            CAMADA 2 — ÁRVORES MÉDIAS (intercaladas)
        ═══════════════════════════════════════════════ */}
        {[0.045, 0.135, 0.225, 0.315, 0.41, 0.50, 0.595, 0.685, 0.775, 0.865, 0.955].map((frac, i) => {
          const bx = frac * width;
          const cw = 36 + (i % 3) * 12;
          const yo = 6 + (i % 6) * 4;
          const tw = 7 + (i % 2) * 4;
          return (
            <React.Fragment key={`t2-${i}`}>
              <TreeCrown x={bx - cw / 2} y={yo} w={cw} />
              <TreeTrunk x={bx - tw / 2} y={yo + 30} w={tw} h={148 - yo} />
            </React.Fragment>
          );
        })}

        {/* ═══════════════════════════════════════════════
            COBERTURA LATERAL DENSA (escuridão da mata)
        ═══════════════════════════════════════════════ */}
        {/* Esquerda */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: 86, height: 178, backgroundColor: F.leaf0 }} />
        <View style={{ position: 'absolute', left: 0, top: 30, width: 70, height: 148, backgroundColor: '#081806' }} />
        <View style={{ position: 'absolute', left: 0, top: 60, width: 56, height: 118, backgroundColor: '#040E02' }} />
        {/* Direita */}
        <View style={{ position: 'absolute', right: 0, top: 0, width: 86, height: 178, backgroundColor: F.leaf0 }} />
        <View style={{ position: 'absolute', right: 0, top: 30, width: 70, height: 148, backgroundColor: '#081806' }} />
        <View style={{ position: 'absolute', right: 0, top: 60, width: 56, height: 118, backgroundColor: '#040E02' }} />

        {/* ═══════════════════════════════════════════════
            OLHOS DE MONSTROS NA ESCURIDÃO
        ═══════════════════════════════════════════════ */}
        {/* ESQUERDA */}
        {/* Orc atrás das árvores, alto */}
        <View style={{ position: 'absolute', left: 6, top: 72 }} pointerEvents="none">
          <MonsterEyes type="orc" />
        </View>
        {/* Goblin, mais embaixo */}
        <View style={{ position: 'absolute', left: 30, top: 106 }} pointerEvents="none">
          <MonsterEyes type="goblin" />
        </View>
        {/* Lobo, rente ao chão */}
        <View style={{ position: 'absolute', left: 10, top: 142 }} pointerEvents="none">
          <MonsterEyes type="wolf" />
        </View>
        {/* Troll mais ao fundo (escondido) */}
        <View style={{ position: 'absolute', left: 44, top: 78 }} pointerEvents="none">
          <MonsterEyes type="troll" />
        </View>

        {/* DIREITA */}
        {/* Ogre grande, destaque */}
        <View style={{ position: 'absolute', right: 14, top: 84 }} pointerEvents="none">
          <MonsterEyes type="ogre" />
        </View>
        {/* Ciclope, sozinho no meio */}
        <View style={{ position: 'absolute', right: 52, top: 66 }} pointerEvents="none">
          <MonsterEyes type="cyclops" />
        </View>
        {/* Goblin atrás, baixo */}
        <View style={{ position: 'absolute', right: 8, top: 148 }} pointerEvents="none">
          <MonsterEyes type="goblin" />
        </View>
        {/* Orc diferente posição */}
        <View style={{ position: 'absolute', right: 38, top: 118 }} pointerEvents="none">
          <MonsterEyes type="orc" />
        </View>

        {/* Arbustos baixos (cobrem a parte das pernas dos monstros) */}
        <View style={{ position: 'absolute', left: 0,  top: 152, width: 80, height: 26, backgroundColor: F.leaf1 }} />
        <View style={{ position: 'absolute', right: 0, top: 150, width: 80, height: 28, backgroundColor: F.leaf1 }} />
        <View style={{ position: 'absolute', left: 0,  top: 162, width: 65, height: 16, backgroundColor: F.leaf0 }} />
        <View style={{ position: 'absolute', right: 0, top: 160, width: 65, height: 18, backgroundColor: F.leaf0 }} />

        {/* ═══════════════════════════════════════════════
            CHÃO / TRILHA
        ═══════════════════════════════════════════════ */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, backgroundColor: F.grass0 }} />
        <View style={{ position: 'absolute', bottom: 5, left: 0, right: 0, height: 7, backgroundColor: F.grass1 }} />
        <View style={{ position: 'absolute', bottom: 0, left: cx - 90, width: 180, height: 18, backgroundColor: F.dirt1 }} />
        <View style={{ position: 'absolute', bottom: 0, left: cx - 70, width: 140, height: 12, backgroundColor: F.dirt2 }} />
        <View style={{ position: 'absolute', bottom: 4, left: cx - 55, width: 4, height: 8, backgroundColor: F.dirt0 }} />
        <View style={{ position: 'absolute', bottom: 4, left: cx + 50, width: 4, height: 8, backgroundColor: F.dirt0 }} />

        {/* ═══════════════════════════════════════════════
            CARAVANA
        ═══════════════════════════════════════════════ */}
        <View style={{ position: 'absolute', bottom: 12, left: h1x }}>
          <PixelHorse dark />
        </View>
        <View style={{ position: 'absolute', bottom: 14, left: h2x }}>
          <PixelHorse />
        </View>
        <View style={{ position: 'absolute', bottom: 10, left: carx }}>
          <PixelCarriage />
        </View>
        <View style={{ position: 'absolute', bottom: 58, left: carx + 32 }}>
          <PixelDriver />
        </View>
        <View style={{ position: 'absolute', bottom: 26, left: carx + 64, flexDirection: 'row', gap: 2 }}>
          <MiniMage />
          <MiniPaladin />
          <MiniWarrior />
          <MiniArcher />
        </View>

        {/* Raios de luz filtrada */}
        {[0.38, 0.50, 0.62].map((f, i) => (
          <View key={i} style={{ position: 'absolute', left: width * f, top: 0, width: 3, height: 178, backgroundColor: F.leaf3, opacity: 0.08 }} />
        ))}

        {/* ═══════════════════════════════════════════════
            TÍTULO + BOTÃO
        ═══════════════════════════════════════════════ */}
        <View style={{ position: 'absolute', top: 8, left: 14 }}>
          <Text style={{ fontFamily: 'VT323', fontSize: 10, letterSpacing: 2, color: F.leaf4 }}>⚔ CARAVANA</Text>
          <Text style={{ fontFamily: 'VT323', fontSize: 32, letterSpacing: 1, color: F.cream, textShadowColor: '#000000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }}>
            MISSÕES
          </Text>
          <Text style={{ fontFamily: 'VT323', fontSize: 11, letterSpacing: 2, color: F.leaf3 }}>DA GUILDA</Text>
        </View>
        <TouchableOpacity
          style={{ position: 'absolute', top: 8, right: 12, backgroundColor: F.cart2, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 2, borderColor: F.cartHi }}
          onPress={onNew}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'VT323', fontSize: 18, color: F.dirt0, letterSpacing: 1 }}>+ MISSÃO</Text>
        </TouchableOpacity>
      </View>

      {/* Separador grama */}
      <GrassDivider />
    </View>
  );
}

// ── ForestProgressBar ────────────────────────────────────────
function ForestProgressBar({ progress }: { progress: number }) {
  const { width } = useWindowDimensions();
  const SEG = 6, GAP = 1;
  const total = Math.floor((width - 64) / (SEG + GAP));
  const filled = Math.round(total * Math.min(progress, 1));
  return (
    <View style={{ height: 8, flexDirection: 'row', backgroundColor: F.dirt0, borderWidth: 1, borderColor: F.scrollBd, gap: GAP, paddingHorizontal: 1, overflow: 'hidden' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          width: SEG, height: '100%',
          backgroundColor: i < filled
            ? (i / total > 0.66 ? F.leaf4 : i / total > 0.33 ? F.grass2 : F.grass1)
            : F.bgDark,
        }} />
      ))}
    </View>
  );
}

// ── CaravanSummaryCard ───────────────────────────────────────
function CaravanSummaryCard({ currentCents, targetCents, pct, remainingCents, activeCount }: {
  currentCents: number; targetCents: number; pct: number; remainingCents: number; activeCount: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={{ height: 4, backgroundColor: F.cart2, marginHorizontal: -2, marginTop: -2 }} />
      <View style={{ height: 2, backgroundColor: F.cart1, marginHorizontal: -2 }} />
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.labelSmall}>TESOURO DA GUILDA</Text>
            <Text style={styles.bigGold}>{formatBRL(currentCents)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.labelSmall}>MISSÕES ATIVAS</Text>
            <Text style={[styles.bigGold, { fontSize: 28, color: F.grass2 }]}>{activeCount}</Text>
          </View>
        </View>
        <ForestProgressBar progress={pct / 100} />
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>GUARDADO</Text>
            <Text style={[styles.statVal, { color: F.grass2 }]}>{formatBRL(currentCents)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>FALTAM</Text>
            <Text style={[styles.statVal, { color: F.cream }]}>{formatBRL(money(remainingCents))}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.labelSmall}>PROGRESSO</Text>
            <Text style={[styles.statVal, { color: F.gold }]}>{pct.toFixed(0)}%</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 2, backgroundColor: F.cart1, marginHorizontal: -2 }} />
      <View style={{ height: 4, backgroundColor: F.bark0, marginHorizontal: -2, marginBottom: -2 }} />
    </View>
  );
}

// ── EmptyForest ──────────────────────────────────────────────
function EmptyForest() {
  const { width } = useWindowDimensions();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
      <View style={{ width: width - 32, height: 2, backgroundColor: F.scrollBd }} />
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {[16, 22, 14, 20, 18].map((h, i) => (
          <View key={i} style={{ width: 4, height: h, backgroundColor: i % 2 === 0 ? F.bark0 : F.bark1 }} />
        ))}
      </View>
      <Text style={{ fontFamily: 'VT323', fontSize: 20, letterSpacing: 2, color: F.scrollDim }}>NENHUMA MISSÃO</Text>
      <Text style={{ fontFamily: 'VT323', fontSize: 14, letterSpacing: 1, color: F.bark1, textAlign: 'center' }}>
        A caravana aguarda.{'\n'}Adicione uma missão para partir.
      </Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[18, 14, 22, 16, 20].map((h, i) => (
          <View key={i} style={{ width: 4, height: h, backgroundColor: i % 2 === 0 ? F.bark1 : F.bark0 }} />
        ))}
      </View>
      <View style={{ width: width - 32, height: 2, backgroundColor: F.scrollBd }} />
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────
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
      <ForestHeader insetTop={insets.top} onNew={() => router.push('/new-goal')} />

      <View style={styles.forestBg}>
        <CaravanSummaryCard
          currentCents={currentCents}
          targetCents={targetCents}
          pct={pct}
          remainingCents={remainingCents}
          activeCount={activeGoals.length}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: F.scrollBd }} />
          <Text style={{ fontFamily: 'VT323', fontSize: 16, color: F.scrollDim, letterSpacing: 2 }}>DIÁRIO DA CARAVANA</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: F.scrollBd }} />
        </View>

        <View style={styles.goalsList}>
          {activeGoals.map((goal) => {
            const isOverdue = goal.target_date
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
                        text: 'Abandonar', style: 'destructive',
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
          {activeGoals.length === 0 && <EmptyForest />}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: F.bgDark },
  content:   { paddingBottom: 100 },
  forestBg:  { backgroundColor: F.bgDark, paddingHorizontal: 12, paddingTop: 14, gap: 14 },

  summaryCard: {
    backgroundColor: F.scrollBg,
    borderWidth: 2,
    borderColor: F.scrollBd,
    borderTopColor: F.scrollHi,
    borderLeftColor: F.scrollHi,
  },
  labelSmall: {
    fontFamily: 'VT323', fontSize: 11, letterSpacing: 2,
    color: F.scrollDim, textTransform: 'uppercase',
  },
  bigGold: {
    fontFamily: 'VT323', fontSize: 38,
    fontVariant: ['tabular-nums'], color: F.gold,
  },
  statCol:     { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: F.bark0, marginVertical: 2 },
  statVal:     { fontFamily: 'VT323', fontSize: 17, fontVariant: ['tabular-nums'] },
  goalsList:   { gap: 10, paddingBottom: 20 },
});
