import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { useSyncStore } from '@/store/syncStore';

const STATUS_LABEL: Record<string, string> = {
  idle: 'PRONTO',
  syncing: 'SINCRONIZANDO',
  success: 'SINCRONIZADO',
  error: 'ERRO',
};

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const { status, lastSyncAt, errorMessage } = useSyncStore();
  const [running, setRunning] = useState(false);

  const handleSync = async () => {
    setRunning(true);
    try {
      await performSync();
      Alert.alert('Sincronizacao concluida', 'Os dados do reino foram atualizados.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Falha na sincronizacao', message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>SINCRONIZACAO</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <MaterialCommunityIcons name="cloud-sync-outline" size={30} color="#64B5F6" />
        <Text style={styles.heroTitle}>ESTADO DO REINO</Text>
        <Text style={styles.heroValue}>{STATUS_LABEL[status] ?? status.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ULTIMA SINCRONIZACAO</Text>
        <Text style={styles.cardText}>
          {lastSyncAt
            ? new Date(lastSyncAt).toLocaleString('pt-BR')
            : 'Nenhuma sincronizacao registrada ainda.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>COMO FUNCIONA</Text>
        <Text style={styles.cardText}>
          O app busca dados do servidor e mescla com o que existe no aparelho usando updated_at.
        </Text>
      </View>

      {errorMessage ? (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.cardTitle}>ULTIMO ERRO</Text>
          <Text style={styles.cardText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.cta, running && styles.ctaDisabled]}
        activeOpacity={0.8}
        onPress={handleSync}
        disabled={running}
      >
        <Text style={styles.ctaText}>{running ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}</Text>
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
    borderColor: '#64B5F655',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  heroValue: {
    fontFamily: 'VT323',
    fontSize: 22,
    letterSpacing: 2,
    color: '#64B5F6',
  },
  card: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${Colors.outline}40`,
    padding: Spacing.lg,
    gap: 8,
  },
  errorCard: {
    borderColor: `${Colors.tertiary}55`,
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
    backgroundColor: '#64B5F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: 'VT323',
    fontSize: 17,
    letterSpacing: 2,
    color: Colors.surfaceLowest,
  },
});
