export interface CashFlowRow {
  date: string;
  paycheck: number;
  spending: number;
  rent: number;
  bofaPayment: number;
  bofa2Payment: number;
  chasePayment: number;
  checking: number;
  bofa: number;
  chase: number;
  bofa2: number;
  notes: string;
  chaseStatement: number;
  total: number;
  bofaBalance: number;
  bofaBalance2: number;
  checkingBalance: number;
  totalBalance: number;
  cash: number;
}

export interface FinancialData {
  rows: CashFlowRow[];
  summary: {
    totalPaychecks: number;
    totalSpending: number;
    totalRent: number;
    currentChecking: number;
    currentBofA: number;
    currentBofA2: number;
    currentChase: number;
    projectedBalance: number;
    pendingChaseCharges: number;
    pendingBofACharges: number;
    pendingBofA2Charges: number;
    chaseStatement: number;
    bofaStatement: number;
    bofa2Statement: number;
    chaseNextStatement: number;
    bofaNextStatement: number;
    bofa2NextStatement: number;
  };
  upcomingPayments: {
    date: string;
    type: string;
    amount: number;
  }[];
}

export interface AccountBalance {
  date: string;
  checking: number;
  bofa: number;
  chase: number;
  total: number;
}
