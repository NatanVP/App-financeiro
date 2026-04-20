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

    const now = new Date();

    for (const bill of bills) {
      if (!bill.recurrence_day) continue;

      const day   = bill.recurrence_day;
      const valor = formatBRL(money(bill.amount_cents));
      const nome  = bill.name.toUpperCase();

      // Agenda para os próximos 3 meses (app reagenda a cada abertura)
      for (let offset = 0; offset < 3; offset++) {
        // ─── Dia do vencimento às 09:00 ───────────────────────
        const dueDate = new Date(now.getFullYear(), now.getMonth() + offset, day, 9, 0, 0);
        if (dueDate > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `bill-${bill.id}-due-${offset}`,
            content: {
              title: '⚠  CONTRATO VENCE HOJE',
              body: `[${nome}]  ·  Dia ${day}  ·  ${valor}\nPague antes que o reino perca honra!`,
              data: { billId: bill.id, type: 'due' },
            },
            trigger: dueDate,
          });
        }

        // ─── Dia anterior às 09:00 (pula se dia 1) ────────────
        if (day > 1) {
          const beforeDate = new Date(now.getFullYear(), now.getMonth() + offset, day - 1, 9, 0, 0);
          if (beforeDate > now) {
            await Notifications.scheduleNotificationAsync({
              identifier: `bill-${bill.id}-before-${offset}`,
              content: {
                title: '◆  AVISO DO ARAUTO',
                body: `[${nome}] vence amanhã  ·  Dia ${day}  ·  ${valor}`,
                data: { billId: bill.id, type: 'before' },
              },
              trigger: beforeDate,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('[notifications] scheduleBillNotifications error:', e);
  }
}
