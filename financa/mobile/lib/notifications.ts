/**
 * Notificações de contratos do reino (RPG pixel art style).
 * Agenda alertas 1 dia antes e no dia do vencimento de cada cobrança recorrente.
 */
import * as Notifications from 'expo-notifications';
import { formatBRL, money } from './money';
import type { Bill } from '@/store/billStore';

// Exibe notificações mesmo com o app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Re-agenda todas as notificações de contratos.
 * Cancela as antigas (prefixo "bill-") e cria novas para cada cobrança.
 */
export async function scheduleBillNotifications(bills: Bill[]): Promise<void> {
  try {
    // Cancela notificações existentes de contratos
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith('bill-'))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    for (const bill of bills) {
      if (!bill.recurrence_day) continue;

      const day = bill.recurrence_day;
      const valor = formatBRL(money(bill.amount_cents));
      const nome = bill.name.toUpperCase();

      // ─── Notificação: DIA DO VENCIMENTO ───────────────────────
      // Repete mensalmente no dia do vencimento às 09:00
      await Notifications.scheduleNotificationAsync({
        identifier: `bill-${bill.id}-due`,
        content: {
          title: '⚠  CONTRATO VENCE HOJE',
          body: `[${nome}]  ·  Dia ${day}  ·  ${valor}\nPague antes que o reino perca honra!`,
          data: { billId: bill.id, type: 'due' },
        },
        trigger: {
          day,
          hour: 9,
          minute: 0,
          repeats: true,
        } as any,
      });

      // ─── Notificação: DIA ANTERIOR ────────────────────────────
      // Pula se o vencimento é dia 1 (dia anterior = último do mês anterior — complexo)
      if (day > 1) {
        await Notifications.scheduleNotificationAsync({
          identifier: `bill-${bill.id}-before`,
          content: {
            title: '◆  AVISO DO ARAUTO',
            body: `[${nome}] vence amanhã  ·  Dia ${day}  ·  ${valor}`,
            data: { billId: bill.id, type: 'before' },
          },
          trigger: {
            day: day - 1,
            hour: 9,
            minute: 0,
            repeats: true,
          } as any,
        });
      }
    }
  } catch (e) {
    console.warn('[notifications] scheduleBillNotifications error:', e);
  }
}
