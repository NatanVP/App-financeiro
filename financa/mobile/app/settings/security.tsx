import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';

const SECURITY_ITEMS = [
  {
    icon: 'eye-off-outline',
    title: 'Ocultar valores',
    text: 'Esconder saldos e valores sensiveis na interface do app.',
  },
  {
    icon: 'trash-can-outline',
    title: 'Confirmar exclusoes',
    text: 'Pedir confirmacao antes de apagar lancamentos e registros importantes.',
  },
  {
    icon: 'form-textbox-password',
    title: 'PIN do app',
    text: 'Criar uma camada simples de bloqueio para abrir o grimorio.',
  },
];

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>SEGURANCA</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <MaterialCommunityIcons name="shield-lock-outline" size={28} color={Colors.primary} />
        <Text style={styles.heroTitle}>PROTECAO DO GRIMORIO</Text>
        <Text style={styles.heroText}>
          Esta tela vai concentrar privacidade, bloqueio do app e protecoes contra acoes acidentais.
        </Text>
      </View>

      {SECURITY_ITEMS.map((item) => (
        <View key={item.title} style={styles.card}>
          <View style={styles.cardHead}>
            <MaterialCommunityIcons name={item.icon as never} size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <Text style={styles.cardText}>{item.text}</Text>
        </View>
      ))}

      <View style={styles.note}>
        <Text style={styles.noteTitle}>ANOTADO PARA DEPOIS</Text>
        <Text style={styles.noteText}>
          O desbloqueio com biometria ficou registrado no markdown do projeto como proximo passo de seguranca.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 2,
    color: Colors.primary,
  },
  hero: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.primary,
  },
  heroText: {
    fontFamily: 'VT323',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${Colors.outline}40`,
    padding: Spacing.lg,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 1.5,
    color: Colors.onSurface,
  },
  cardText: {
    fontFamily: 'VT323',
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
  note: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
    padding: Spacing.lg,
    gap: 8,
  },
  noteTitle: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  noteText: {
    fontFamily: 'VT323',
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
});
