export interface AppConfig {
  // Savings (untouched)
  savings: number;

  // Current balances (from Excel)
  checking: number;
  bofaBalance: number;
  chaseBalance: number;
  bofa2Balance: number;

  // Pending charges (from Excel — not yet on statement)
  bofaPending: number;
  chasePending: number;
  bofa2Pending: number;

  // Statement balances (from Excel — amount due this cycle)
  bofaStatement: number;
  chaseStatement: number;
  bofa2Statement: number;

  // Card payment amounts (user-configurable)
  bofaPayment: number;
  chasePayment: number;
  bofa2Payment: number;

  // Card due days
  bofaDueDay: number;
  chaseDueDay: number;
  bofa2DueDay: number;

  // Income
  paycheckAmount: number;
  paycheckOverride: number;
  paycheckOverrideUntil: string; // ISO date, e.g. "2026-05-08"
  payDayReference: string; // ISO date for biweekly calc anchor

  // Expenses
  rent: number;
  rentDay: number;
  weeklySpending: number;
}

export interface MonthlySnapshot {
  label: string;
  isCurrentMonth: boolean;
  paychecks: number;
  paycheckCount: number;
  spending: number;
  rent: number;
  bofaPayment: number;
  chasePayment: number;
  bofa2Payment: number;
  checkingEnd: number;
  bofaEnd: number;
  chaseEnd: number;
  bofa2End: number;
  netWorth: number;
}
