/**
 * Utilitários de dias úteis (seg–sex, sem feriados).
 */

/** Retorna a data do N-ésimo dia útil de um mês. */
export function getNthBusinessDay(year: number, month: number, n: number): Date {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
      if (count === n) return new Date(year, month - 1, day);
    }
  }
  // Se n for maior que os dias úteis do mês, retorna o último dia útil
  return new Date(year, month - 1, daysInMonth);
}

/** Retorna o último dia do mês. */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Retorna quais pagamentos salariais já foram recebidos até hoje.
 * Regra: recebido se hoje >= data do pagamento.
 */
export function getReceivedPayments(year: number, month: number, today: Date) {
  // Normaliza para comparar só datas (sem hora)
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const bd5 = getNthBusinessDay(year, month, 5);
  const bd20 = getNthBusinessDay(year, month, 20);
  const lastDay = getLastDayOfMonth(year, month);

  return {
    received5th: todayNorm >= bd5,
    received20th: todayNorm >= bd20,
    receivedLast: todayNorm >= lastDay,
  };
}
