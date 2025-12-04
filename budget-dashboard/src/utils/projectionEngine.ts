/**
 * Financial Projection Engine
 * Takes current situation and projects forward using rules
 */

export interface ProjectionRules {
  // Current balances
  checkingBalance: number;
  bofaBalance: number;
  bofa2Balance: number;
  chaseBalance: number;
  
  // Pending charges (will post in first few days)
  pendingBofA?: number;
  pendingBofA2?: number;
  pendingChase?: number;
  
  // Statement balances (what cards will be after pending hits)
  bofaStatement: number;
  bofa2Statement: number;
  chaseStatement: number;
  
  // Income & expenses
  paycheckAmount: number;
  rent: number;
  weeklySpending: number;
  
  // Payment strategy
  bofaPaymentAmount?: number; // How much to pay on BofA monthly
  bofa2PaymentAmount?: number; // How much to pay on BofA 2 monthly
  chasePaymentAmount?: number; // How much to pay on Chase monthly
  bofaPaymentDay?: number; // Day of month for BofA payment (default: 3)
  bofa2PaymentDay?: number; // Day of month for BofA 2 payment (default: 24)
  chasePaymentDay?: number; // Day of month for Chase payment (default: 8)
  
  // Rules
  rentDay: number; // Day of month rent is due (23)
  payDayReference: Date; // A known payday (Nov 20, 2025)
  startDate?: Date; // Optional: start date for projection (defaults to today)
  
  // Interest rates (APR)
  chaseAPR?: number; // Chase started accruing interest Nov 6
  chaseInterestStartDate?: Date;
}

export interface ProjectionRow {
  date: string;
  paycheck: number;
  spending: number;
  rent: number;
  bofaPayment: number;
  bofa2Payment: number;
  chasePayment: number;
  checking: number;
  bofa: number;
  bofa2: number;
  chase: number;
  notes: string;
}

export function generateMinimumPaymentProjection(rules: ProjectionRules, maxMonths: number = 12): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const today = rules.startDate ? new Date(rules.startDate) : new Date();
  today.setHours(0, 0, 0, 0);
  
  // Running balances
  let checking = rules.checkingBalance;
  let bofa = rules.bofaBalance;
  let bofa2 = rules.bofa2Balance;
  let chase = rules.chaseBalance;
  
  // Track if pending charges have posted
  let pendingPosted = false;
  
  // Calculate next payday
  const nextPayday = getNextPayday(today, rules.payDayReference);
  
  // Track last spending day
  let lastSpendingDay = new Date(today);
  lastSpendingDay.setDate(lastSpendingDay.getDate() - 7);
  
  // Project up to maxMonths or until checking goes negative
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + maxMonths);
  
  for (let current = new Date(today); current <= endDate; current.setDate(current.getDate() + 1)) {
    const dayOfWeek = current.getDay();
    const dayOfMonth = current.getDate();
    
    let paycheckToday = 0;
    let spendingToday = 0;
    let rentToday = 0;
    let bofaPayment = 0;
    let bofa2Payment = 0;
    let chasePayment = 0;
    let notes = '';
    
    // Post pending charges within 1-2 days from start of projection
    if (!pendingPosted) {
      const daysSinceStart = Math.floor((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart >= 1 && daysSinceStart <= 2) {
        if (rules.pendingBofA) {
          bofa += rules.pendingBofA;
          notes = notes ? notes + ', Pending BofA' : 'Pending BofA';
        }
        if (rules.pendingBofA2) {
          bofa2 += rules.pendingBofA2;
          notes = notes ? notes + ', Pending BofA2' : 'Pending BofA2';
        }
        if (rules.pendingChase) {
          chase += rules.pendingChase;
          notes = notes ? notes + ', Pending Chase' : 'Pending Chase';
        }
        if (rules.pendingBofA || rules.pendingBofA2 || rules.pendingChase) {
          pendingPosted = true;
        }
      }
    }
    
    // Payday
    if (isPayday(current, rules.payDayReference)) {
      paycheckToday = rules.paycheckAmount;
      checking += paycheckToday;
      notes = notes ? notes + ', Payday' : 'Payday';
    }
    
    // Minimum payments on their respective due dates
    // BofA - 3rd of month
    if (dayOfMonth === (rules.bofaPaymentDay || 3)) {
      if (rules.bofaStatement && rules.bofaStatement > 0 && bofa > 0) {
        bofaPayment = Math.min(rules.bofaStatement, bofa);
        checking -= bofaPayment;
        bofa -= bofaPayment;
        notes = notes ? notes + ', BofA Min' : 'BofA Min';
      }
    }
    
    // Chase - 8th of month
    if (dayOfMonth === (rules.chasePaymentDay || 8)) {
      if (rules.chaseStatement && rules.chaseStatement > 0 && chase > 0) {
        chasePayment = Math.min(rules.chaseStatement, chase);
        checking -= chasePayment;
        chase -= chasePayment;
        notes = notes ? notes + ', Chase Min' : 'Chase Min';
      }
    }
    
    // BofA 2 - 24th of month
    if (dayOfMonth === (rules.bofa2PaymentDay || 24)) {
      if (rules.bofa2Statement && rules.bofa2Statement > 0 && bofa2 > 0) {
        bofa2Payment = Math.min(rules.bofa2Statement, bofa2);
        checking -= bofa2Payment;
        bofa2 -= bofa2Payment;
        notes = notes ? notes + ', BofA2 Min' : 'BofA2 Min';
      }
    }
    
    // Spending on Thursdays
    if (dayOfWeek === 4) {
      const daysSinceLastSpending = Math.floor((current.getTime() - lastSpendingDay.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSpending >= 7) {
        spendingToday = rules.weeklySpending;
        bofa2 += spendingToday;
        lastSpendingDay = new Date(current);
      }
    }
    
    // Rent on rentDay
    if (dayOfMonth === rules.rentDay) {
      rentToday = rules.rent;
      checking -= rentToday;
      notes = notes ? notes + ', Rent' : 'Rent';
    }
    
    rows.push({
      date: formatDate(current),
      paycheck: paycheckToday,
      spending: spendingToday,
      rent: rentToday,
      bofaPayment,
      bofa2Payment,
      chasePayment,
      checking,
      bofa,
      bofa2,
      chase,
      notes
    });
    
    // Stop if checking goes negative
    if (checking < 0) {
      notes = notes ? notes + ' ⚠️ STOPPED - Negative Cash' : '⚠️ STOPPED - Negative Cash';
      break;
    }
  }
  
  return rows;
}

export function generateProjection(rules: ProjectionRules, months: number = 4): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const today = rules.startDate ? new Date(rules.startDate) : new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate projection end date
  let endDate: Date;
  if (months === 1) {
    if (rules.startDate) {
      // If startDate is provided, project to end of that month
      const startDate = new Date(rules.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // Always go to end of the start month (whether starting on 1st or mid-month)
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // No startDate: generate 31 days from today
      endDate = new Date(today);
      endDate.setDate(today.getDate() + 30); // 31 days total (including start day)
    }
  } else {
    endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + months);
  }

  
  // Running balances
  let checking = rules.checkingBalance;
  let bofa = rules.bofaBalance;
  let bofa2 = rules.bofa2Balance;
  let chase = rules.chaseBalance;
  
  // Track if pending charges have posted
  let pendingPosted = false;
  
  // Calculate next payday
  const nextPayday = getNextPayday(today, rules.payDayReference);
  
  // Track last spending day
  let lastSpendingDay = new Date(today);
  lastSpendingDay.setDate(lastSpendingDay.getDate() - 7); // Start from a week ago
  
  // Iterate through each day
  for (let current = new Date(today); current <= endDate; current.setDate(current.getDate() + 1)) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 4 = Thursday
    const dayOfMonth = current.getDate();
    
    let paycheckToday = 0;
    let spendingToday = 0;
    let rentToday = 0;
    let bofaPayment = 0;
    let bofa2Payment = 0;
    let chasePayment = 0;
    let notes = '';
    
    // Post pending charges within 1-2 days from start of projection
    if (!pendingPosted) {
      const daysSinceStart = Math.floor((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart >= 1 && daysSinceStart <= 2) {
        if (rules.pendingBofA) {
          bofa += rules.pendingBofA;
          notes = notes ? notes + ', Pending BofA' : 'Pending BofA';
        }
        if (rules.pendingBofA2) {
          bofa2 += rules.pendingBofA2;
          notes = notes ? notes + ', Pending BofA2' : 'Pending BofA2';
        }
        if (rules.pendingChase) {
          chase += rules.pendingChase;
          notes = notes ? notes + ', Pending Chase' : 'Pending Chase';
        }
        if (rules.pendingBofA || rules.pendingBofA2 || rules.pendingChase) {
          pendingPosted = true;
        }
      }
    }
    
    // Check if it's a payday (every other Thursday)
    if (isPayday(current, rules.payDayReference)) {
      paycheckToday = rules.paycheckAmount;
      checking += paycheckToday;
      notes = 'Payday';
    }
    
    // Make credit card payments on their respective due dates
    // BofA payment - 3rd of month
    if (dayOfMonth === (rules.bofaPaymentDay || 3)) {
      if (rules.bofaPaymentAmount && rules.bofaPaymentAmount > 0 && bofa > 0) {
        bofaPayment = Math.min(rules.bofaPaymentAmount, bofa);
        checking -= bofaPayment;
        bofa -= bofaPayment;
        notes = notes ? notes + ', BofA Payment' : 'BofA Payment';
        if (checking < 0) {
          notes = notes + ' ⚠️ NEGATIVE';
        }
      }
    }
    
    // Chase payment - 8th of month
    if (dayOfMonth === (rules.chasePaymentDay || 8)) {
      if (rules.chasePaymentAmount && rules.chasePaymentAmount > 0 && chase > 0) {
        chasePayment = Math.min(rules.chasePaymentAmount, chase);
        checking -= chasePayment;
        chase -= chasePayment;
        notes = notes ? notes + ', Chase Payment' : 'Chase Payment';
        if (checking < 0) {
          notes = notes + ' ⚠️ NEGATIVE';
        }
      }
    }
    
    // BofA 2 payment - 24th of month
    if (dayOfMonth === (rules.bofa2PaymentDay || 24)) {
      if (rules.bofa2PaymentAmount && rules.bofa2PaymentAmount > 0 && bofa2 > 0) {
        bofa2Payment = Math.min(rules.bofa2PaymentAmount, bofa2);
        checking -= bofa2Payment;
        bofa2 -= bofa2Payment;
        notes = notes ? notes + ', BofA2 Payment' : 'BofA2 Payment';
        if (checking < 0) {
          notes = notes + ' ⚠️ NEGATIVE';
        }
      }
    }
    
    // Check if it's a spending day (every Thursday)
    if (dayOfWeek === 4) {
      const daysSinceLastSpending = Math.floor((current.getTime() - lastSpendingDay.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSpending >= 7) {
        spendingToday = rules.weeklySpending;
        // Spending goes on BofA 2 (longest interest-free window)
        bofa2 += spendingToday; // Debt increases
        // Checking stays the same - you'll pay it later
        lastSpendingDay = new Date(current);
      }
    }
    
    // Check if it's rent day
    if (dayOfMonth === rules.rentDay) {
      rentToday = rules.rent;
      checking -= rentToday;
      notes = notes ? notes + ', Rent' : 'Rent';
    }
    
    // Add row
    rows.push({
      date: formatDate(current),
      paycheck: paycheckToday,
      spending: spendingToday,
      rent: rentToday,
      bofaPayment,
      bofa2Payment,
      chasePayment,
      checking,
      bofa,
      bofa2,
      chase,
      notes
    });
  }

  return rows;
}

function isPayday(date: Date, referencePayday: Date): boolean {
  // Calculate weeks since reference payday
  const daysDiff = Math.floor((date.getTime() - referencePayday.getTime()) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);
  
  // Check if it's Thursday (day 4) and every other week
  return date.getDay() === 4 && weeksDiff % 2 === 0;
}

function getNextPayday(from: Date, referencePayday: Date): Date {
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 14; i++) {
    if (isPayday(current, referencePayday)) {
      return current;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return current;
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

