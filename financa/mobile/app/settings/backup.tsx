import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';

export default function BackupScreen() {
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
        <Text style={styles.title}>BACKUP</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <MaterialCommunityIcons name="database-export-outline" size={28} color={Colors.secondary} />
        <Text style={styles.heroTitle}>COPIAS DO REINO</Text>
        <Text style={styles.heroText}>
          Esta area vai concentrar exportacao local, restauracao e historico de copias de seguranca.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>EXPORTACAO LOCAL</Text>
        <Text style={styles.cardText}>
          Exportar o banco do aparelho para guardar uma copia manual do seu grimorio financeiro.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>BACKUP REMOTO</Text>
        <Text style={styles.cardText}>
          Depois podemos ligar uma rotina de backup do servidor para manter o historico salvo fora do app.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.8}
        onPress={() =>
          Alert.alert(
            'Em breve',
            'A exportacao completa sera ligada quando a persistencia local estiver fechada.',
          )
        }
      >
        <Text style={styles.ctaText}>PLANEJAR EXPORTACAO</Text>
      </TouchableOpacity>
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
    borderColor: `${Colors.secondary}40`,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.secondary,
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
  cta: {
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'VT323',
    fontSize: 17,
    letterSpacing: 2,
    color: Colors.surfaceLowest,
  },
});
