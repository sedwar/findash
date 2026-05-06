import type { AppConfig, MonthlySnapshot } from '../types';

// Parse ISO date string as LOCAL time (avoids UTC midnight → day-before bug)
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isPayday(date: Date, ref: Date): boolean {
  const days = Math.round((date.getTime() - ref.getTime()) / 86400000);
  return date.getDay() === 4 && ((days % 14) + 14) % 14 === 0;
}

function countThursdays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  while (d <= end) {
    count++;
    d.setDate(d.getDate() + 7);
  }
  return count;
}

function getPaychecksInRange(
  start: Date,
  end: Date,
  config: AppConfig
): { count: number; total: number } {
  const ref = parseLocalDate(config.payDayReference); // FIX: local time
  const overrideUntil = config.paycheckOverrideUntil
    ? parseLocalDate(config.paycheckOverrideUntil)
    : null;

  let count = 0;
  let total = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isPayday(d, ref)) {
      const amount =
        overrideUntil && d <= overrideUntil
          ? config.paycheckOverride
          : config.paycheckAmount;
      count++;
      total += amount;
    }
  }
  return { count, total };
}

// ── Monthly summary projection ────────────────────────────────────────────

export function generateMonthlyProjection(
  config: AppConfig,
  months = 7
): MonthlySnapshot[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checking = config.checking;
  // Include pending charges in balances — they will post
  let bofa = config.bofaBalance + config.bofaPending;
  let chase = config.chaseBalance + config.chasePending;
  let bofa2 = config.bofa2Balance + config.bofa2Pending;

  const snapshots: MonthlySnapshot[] = [];

  for (let i = 0; i < months; i++) {
    const isCurrentMonth = i === 0;
    const periodStart = isCurrentMonth
      ? new Date(today)
      : new Date(today.getFullYear(), today.getMonth() + i, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    periodEnd.setHours(23, 59, 59);

    const label = new Date(today.getFullYear(), today.getMonth() + i, 1).toLocaleString(
      'en-US',
      { month: 'short', year: 'numeric' }
    );

    const { count: paycheckCount, total: paycheckTotal } = getPaychecksInRange(
      periodStart,
      periodEnd,
      config
    );
    checking += paycheckTotal;

    const thursdayCount = countThursdays(periodStart, periodEnd);
    const spending = thursdayCount * config.weeklySpending;
    bofa2 += spending;

    let rentAmount = 0;
    const rentDayActual = config.rentDay === 0
      ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate()
      : config.rentDay;
    const rentDate = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      rentDayActual
    );
    if (rentDate >= periodStart && rentDate <= periodEnd) {
      rentAmount = config.rent;
      checking -= rentAmount;
    }

    let bofaPayment = 0;
    const bofaDue = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      config.bofaDueDay
    );
    if (bofaDue >= periodStart && bofaDue <= periodEnd && bofa > 0) {
      bofaPayment = Math.min(config.bofaPayment, bofa);
      checking -= bofaPayment;
      bofa -= bofaPayment;
    }

    let chasePayment = 0;
    const chaseDue = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      config.chaseDueDay
    );
    if (chaseDue >= periodStart && chaseDue <= periodEnd && chase > 0) {
      chasePayment = Math.min(config.chasePayment, chase);
      checking -= chasePayment;
      chase -= chasePayment;
    }

    let bofa2Payment = 0;
    const bofa2Due = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      config.bofa2DueDay
    );
    if (bofa2Due >= periodStart && bofa2Due <= periodEnd && bofa2 > 0) {
      bofa2Payment = Math.min(config.bofa2Payment, bofa2);
      checking -= bofa2Payment;
      bofa2 -= bofa2Payment;
    }

    snapshots.push({
      label,
      isCurrentMonth,
      paychecks: paycheckTotal,
      paycheckCount,
      spending,
      rent: rentAmount,
      bofaPayment,
      chasePayment,
      bofa2Payment,
      checkingEnd: checking,
      bofaEnd: bofa,
      chaseEnd: chase,
      bofa2End: bofa2,
      netWorth: checking - bofa - chase - bofa2,
    });
  }

  return snapshots;
}

// ── Daily event rows ──────────────────────────────────────────────────────

export interface DailyRow {
  date: Date;
  dateKey: string; // "2026-04-10" for override keying
  paycheck: number;
  spending: number;
  rent: number;
  bofaPayment: number;
  chasePayment: number;
  bofa2Payment: number;
  toSavings: number;
  checking: number;
  savings: number;
  bofa: number;
  chase: number;
  bofa2: number;
  isToday: boolean;
  hasEvent: boolean;
  monthKey: string; // "2026-04"
}

export type DailyOverrides = Record<string, {
  paycheck?: number;
  spending?: number;
  rent?: number;
  bofaPayment?: number;
  chasePayment?: number;
  bofa2Payment?: number;
  toSavings?: number;
}>;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateDailyEvents(
  config: AppConfig,
  months = 3,
  overrides: DailyOverrides = {}
): DailyRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);

  const ref = parseLocalDate(config.payDayReference);
  const overrideUntil = config.paycheckOverrideUntil
    ? parseLocalDate(config.paycheckOverrideUntil)
    : null;

  let checking = config.checking;
  let savings = config.savings || 0;
  // Include pending charges in balances — they will post
  let bofa = config.bofaBalance + config.bofaPending;
  let chase = config.chaseBalance + config.chasePending;
  let bofa2 = config.bofa2Balance + config.bofa2Pending;

  const rows: DailyRow[] = [];

  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dom = d.getDate();
    const dow = d.getDay();
    const isToday = d.getTime() === today.getTime();
    const dateKey = toDateKey(d);
    const ov = overrides[dateKey];

    let paycheck = 0;
    let spending = 0;
    let rent = 0;
    let bofaPayment = 0;
    let chasePayment = 0;
    let bofa2Payment = 0;
    let toSavings = 0;

    // Biweekly paycheck (Thursday)
    if (isPayday(d, ref)) {
      paycheck = ov?.paycheck ?? (
        overrideUntil && d <= overrideUntil
          ? config.paycheckOverride
          : config.paycheckAmount
      );
      checking += paycheck;
    } else if (ov?.paycheck != null && ov.paycheck > 0) {
      // Manual paycheck override on non-payday
      paycheck = ov.paycheck;
      checking += paycheck;
    }

    // Weekly spending every Thursday → goes on BofA2
    if (dow === 4) {
      spending = ov?.spending ?? config.weeklySpending;
      bofa2 += spending;
    } else if (ov?.spending != null && ov.spending > 0) {
      spending = ov.spending;
      bofa2 += spending;
    }

    // Rent (rentDay 0 = last day of month)
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const rentDayActual = config.rentDay === 0 ? lastDayOfMonth : config.rentDay;
    if (dom === rentDayActual) {
      rent = ov?.rent ?? config.rent;
      checking -= rent;
    } else if (ov?.rent != null && ov.rent > 0) {
      rent = ov.rent;
      checking -= rent;
    }

    // BofA payment (due date or ad-hoc override)
    if (dom === config.bofaDueDay) {
      bofaPayment = ov?.bofaPayment ?? (bofa > 0 ? Math.min(config.bofaPayment, bofa) : 0);
    } else if (ov?.bofaPayment != null && ov.bofaPayment > 0) {
      bofaPayment = ov.bofaPayment;
    }
    if (bofaPayment > 0) {
      checking -= bofaPayment;
      bofa = Math.max(0, bofa - bofaPayment);
    }

    // Chase payment (due date or ad-hoc override)
    if (dom === config.chaseDueDay) {
      chasePayment = ov?.chasePayment ?? (chase > 0 ? Math.min(config.chasePayment, chase) : 0);
    } else if (ov?.chasePayment != null && ov.chasePayment > 0) {
      chasePayment = ov.chasePayment;
    }
    if (chasePayment > 0) {
      checking -= chasePayment;
      chase = Math.max(0, chase - chasePayment);
    }

    // BofA2 payment (due date or ad-hoc override)
    if (dom === config.bofa2DueDay) {
      bofa2Payment = ov?.bofa2Payment ?? (bofa2 > 0 ? Math.min(config.bofa2Payment, bofa2) : 0);
    } else if (ov?.bofa2Payment != null && ov.bofa2Payment > 0) {
      bofa2Payment = ov.bofa2Payment;
    }
    if (bofa2Payment > 0) {
      checking -= bofa2Payment;
      bofa2 = Math.max(0, bofa2 - bofa2Payment);
    }

    // To-savings transfer (override only — no auto-schedule).
    if (ov?.toSavings != null && ov.toSavings > 0) {
      toSavings = ov.toSavings;
      checking -= toSavings;
      savings += toSavings;
    }

    // Clean up floating point dust
    bofa = Math.round(bofa * 100) / 100;
    chase = Math.round(chase * 100) / 100;
    bofa2 = Math.round(bofa2 * 100) / 100;
    checking = Math.round(checking * 100) / 100;
    savings = Math.round(savings * 100) / 100;

    const isDueDate = dom === config.bofaDueDay || dom === config.chaseDueDay || dom === config.bofa2DueDay;
    const hasEvent = !!(paycheck || spending || rent || bofaPayment || chasePayment || bofa2Payment || toSavings || isDueDate);

    rows.push({
      date: new Date(d),
      dateKey,
      paycheck,
      spending,
      rent,
      bofaPayment,
      chasePayment,
      bofa2Payment,
      toSavings,
      checking,
      savings,
      bofa,
      chase,
      bofa2,
      isToday,
      hasEvent,
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  return rows;
}
