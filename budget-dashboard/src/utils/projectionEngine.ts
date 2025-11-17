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
  paymentDay?: number; // Day of month to make payments (default: 3)
  
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
    
    // Post pending charges on day 1-2
    if (!pendingPosted && dayOfMonth <= 2) {
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
    
    // Payday
    if (isPayday(current, rules.payDayReference)) {
      paycheckToday = rules.paycheckAmount;
      checking += paycheckToday;
      notes = notes ? notes + ', Payday' : 'Payday';
    }
    
    // Minimum payments on 4th of month (pay statement balance)
    const paymentDayOfMonth = rules.paymentDay || 4;
    if (dayOfMonth === paymentDayOfMonth) {
      // Pay statement balances (minimum payments)
      if (rules.bofaStatement && rules.bofaStatement > 0 && bofa > 0) {
        bofaPayment = Math.min(rules.bofaStatement, bofa);
        checking -= bofaPayment;
        bofa -= bofaPayment;
      }
      
      if (rules.bofa2Statement && rules.bofa2Statement > 0 && bofa2 > 0) {
        bofa2Payment = Math.min(rules.bofa2Statement, bofa2);
        checking -= bofa2Payment;
        bofa2 -= bofa2Payment;
      }
      
      if (rules.chaseStatement && rules.chaseStatement > 0 && chase > 0) {
        chasePayment = Math.min(rules.chaseStatement, chase);
        checking -= chasePayment;
        chase -= chasePayment;
      }
      
      if (bofaPayment > 0 || bofa2Payment > 0 || chasePayment > 0) {
        notes = notes ? notes + ', Min Payments' : 'Min Payments';
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
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + months);
  
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
    
    // Post pending charges on day 1-2 of the projection (they post within 1-2 days)
    if (!pendingPosted && dayOfMonth <= 2) {
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
    
    // Check if it's a payday (every other Thursday)
    if (isPayday(current, rules.payDayReference)) {
      paycheckToday = rules.paycheckAmount;
      checking += paycheckToday;
      notes = 'Payday';
    }
    
    // Make credit card payments monthly (default: 4th of month)
    // Pay the full requested amounts - allow checking to go negative to show cash flow reality
    const paymentDayOfMonth = rules.paymentDay || 4;
    if (dayOfMonth === paymentDayOfMonth) {
      // Calculate payments needed (up to balance and amount specified)
      if (rules.chasePaymentAmount && rules.chasePaymentAmount > 0 && chase > 0) {
        chasePayment = Math.min(rules.chasePaymentAmount, chase);
        checking -= chasePayment;
        chase -= chasePayment;
      }
      
      if (rules.bofaPaymentAmount && rules.bofaPaymentAmount > 0 && bofa > 0) {
        bofaPayment = Math.min(rules.bofaPaymentAmount, bofa);
        checking -= bofaPayment;
        bofa -= bofaPayment;
      }
      
      if (rules.bofa2PaymentAmount && rules.bofa2PaymentAmount > 0 && bofa2 > 0) {
        bofa2Payment = Math.min(rules.bofa2PaymentAmount, bofa2);
        checking -= bofa2Payment;
        bofa2 -= bofa2Payment;
      }
      
      if (chasePayment > 0 || bofaPayment > 0 || bofa2Payment > 0) {
        notes = notes ? notes + ', CC Payments' : 'CC Payments';
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

