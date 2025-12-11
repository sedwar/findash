import { useState, useEffect } from 'react';
import type { FinancialData, CashFlowRow } from '../types';
import { generateProjection, type ProjectionRules } from '../utils/projectionEngine';
import EditableWidget from './EditableWidget';
import QuickUpdateModal from './QuickUpdateModal';
import './AccountSummary.css';

// Props for AccountSummary component
interface AccountSummaryProps {
  data: FinancialData;
  projectedRows?: CashFlowRow[];
  onRulesChange?: (rules: any) => void;
  onProjectionCyclesChange?: (cycles: any[]) => void;
  tableProjectedRows?: CashFlowRow[];
}

// LocalStorage helper functions
const STORAGE_KEY = 'budgetDashboard_balances';
const RULES_STORAGE_KEY = 'budgetDashboard_rules';

function getStoredBalances() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveBalances(balances: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  } catch (e) {
    console.error('Failed to save balances to localStorage:', e);
  }
}

function getStoredRules() {
  try {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveRules(rules: any) {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save rules to localStorage:', e);
  }
}

function AccountSummary({ data, projectedRows = [], tableProjectedRows = [], onRulesChange, onProjectionCyclesChange }: AccountSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  // Helper function for day suffixes (1st, 2nd, 3rd, etc.)
  const getDaySuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Helper function to get cash balance from table on specific date
  const getCashOnDate = (monthOffset: number, targetDay: number, excludeThisPayment: number = 0) => {
    // Find the row for the target month and day
    const todayDate = new Date();
    const targetMonth = (todayDate.getMonth() + monthOffset) % 12;
    const targetYear = todayDate.getFullYear() + Math.floor((todayDate.getMonth() + monthOffset) / 12);

    const targetRow = tableProjectedRows.find(row => {
      const rowDate = parseDate(row.date);
      if (!rowDate) return false;
      return rowDate.getMonth() === targetMonth &&
             rowDate.getDate() === targetDay &&
             rowDate.getFullYear() === targetYear;
    });

    if (targetRow) {
      return targetRow.checking;
    }

    return checking; // Fallback to current checking
  };
  
  // Check for first-time user on mount
  useEffect(() => {
    // Check for ?reset URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      console.log('🔄 Reset parameter detected - clearing all data');
      localStorage.clear();
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    const storedBalances = getStoredBalances();
    const storedRules = getStoredRules();
    const isFirst = !storedBalances && !storedRules;
    
    console.log('🔍 Checking first-time status:', {
      storedBalances,
      storedRules,
      isFirst
    });
    
    setIsFirstTime(isFirst);
    
    if (isFirst) {
      console.log('🎉 First time user detected - opening welcome modal');
      setIsModalOpen(true);
    }
  }, []);

  // Try to load from localStorage first, fall back to defaults
  const storedBalances = getStoredBalances();
  const storedRules = getStoredRules();

  // Keyboard shortcut: Ctrl+Shift+R to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        console.log('✅ Reset triggered!');
        e.preventDefault();
        localStorage.clear();
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // ACTUAL CURRENT BALANCES (what you have RIGHT NOW) - Default to 0
  // ONLY load from localStorage, never auto-load from Excel on first time
  const [checking, setChecking] = useState(storedBalances?.checking ?? 0);
  const [bofa, setBofa] = useState(storedBalances?.bofa ?? 0);
  const [bofa2, setBofa2] = useState(storedBalances?.bofa2 ?? 0);
  const [chase, setChase] = useState(storedBalances?.chase ?? 0);
  
  // STATEMENT BALANCES (what the cards will be after pending charges hit) - Default to 0
  // ONLY load from localStorage, never auto-load from Excel on first time
  const [bofaStatement, setBofaStatement] = useState(storedBalances?.bofaStatement ?? 0);
  const [bofa2Statement, setBofa2Statement] = useState(storedBalances?.bofa2Statement ?? 0);
  const [chaseStatement, setChaseStatement] = useState(storedBalances?.chaseStatement ?? 0);
  
  // PENDING CHARGES (editable) - Default to 0
  // ONLY load from localStorage, never auto-load from Excel on first time
  const [pendingBofA, setPendingBofA] = useState(storedBalances?.pendingBofA ?? 0);
  const [pendingBofA2, setPendingBofA2] = useState(storedBalances?.pendingBofA2 ?? 0);
  const [pendingChase, setPendingChase] = useState(storedBalances?.pendingChase ?? 0);
  
  // YOUR RULES (how money flows) - Default values
  const [paycheckAmount, setPaycheckAmount] = useState(storedRules?.paycheckAmount ?? 3500);
  const [rent, setRent] = useState(storedRules?.rent ?? 1760);
  const [weeklySpending, setWeeklySpending] = useState(storedRules?.weeklySpending ?? 200);
  
  // PAYMENT STRATEGY (how much to pay on cards each payday)
  const [bofaPayment, setBofaPayment] = useState(storedRules?.bofaPayment ?? 0);
  const [bofa2Payment, setBofa2Payment] = useState(storedRules?.bofa2Payment ?? 0);
  const [chasePayment, setChasePayment] = useState(storedRules?.chasePayment ?? 0);
  
  // Multi-month projections
  const [projectionCycles, setProjectionCycles] = useState<Array<{
    bofaPayment: number;
    bofa2Payment: number;
    chasePayment: number;
  }>>([]);

  // Track if cards have been paid for current month
  const [bofaPaidThisMonth, setBofaPaidThisMonth] = useState(false);
  const [bofa2PaidThisMonth, setBofa2PaidThisMonth] = useState(false);
  const [chasePaidThisMonth, setChasePaidThisMonth] = useState(false);


  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate next paycheck (every other Thursday)
  const getNextPaycheck = () => {
    const now = new Date();
    let current = new Date(now);
    current.setDate(current.getDate() + ((4 - current.getDay() + 7) % 7 || 7)); // Next Thursday
    
    // Check if this is a pay week (assuming Nov 20, 2025 is a pay day)
    const referencePayDay = new Date('2025-11-20');
    const daysDiff = Math.floor((current.getTime() - referencePayDay.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = Math.floor(daysDiff / 7);
    
    if (weeksDiff % 2 !== 0) {
      current.setDate(current.getDate() + 7);
    }
    
    return current;
  };

  const nextPaycheck = getNextPaycheck();
  const daysToPaycheck = Math.ceil((nextPaycheck.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Calculate balances at each projection stage
  const [projections, setProjectionsState] = useState<any[]>([]);

  // Store actual monthly spending for display
  const [actualMonthlySpending, setActualMonthlySpending] = useState(0);

  // Recalculate projections whenever dependencies change
  useEffect(() => {
    // Use the same projection engine as Dashboard for consistency
    const rules: ProjectionRules = {
      checkingBalance: checking,
      // Use CURRENT balances (what's actually on the card now)
      // These include charges that have posted but aren't in statement yet
      bofaBalance: bofa,
      bofa2Balance: bofa2,
      chaseBalance: chase,
      // Pending charges that will post in 1-2 days
      pendingBofA: pendingBofA,
      pendingBofA2: pendingBofA2,
      pendingChase: pendingChase,
      // Statement balances for the projection
      // These represent starting point for next statement cycle
      bofaStatement: bofaStatement,
      bofa2Statement: bofa2Statement,
      chaseStatement: chaseStatement,
      paycheckAmount,
      rent,
      weeklySpending,
      bofaPaymentAmount: bofaPayment,
      bofa2PaymentAmount: bofa2Payment,
      chasePaymentAmount: chasePayment,
      rentDay: 23,
      payDayReference: new Date('2025-11-20')
    };
    
    // Generate projections for 1 month
    const projectedRows = generateProjection(rules, 1);

    // Calculate actual spending for the month (not assuming 4 weeks)
    const calculatedMonthlySpending = projectedRows.reduce((total, row) => total + row.spending, 0);
    setActualMonthlySpending(calculatedMonthlySpending);

    // Extract key data for the first payment cycle
    // Get the LAST row of projections (end of month) to include all spending
    const firstMonth = projectedRows.length > 0 ? projectedRows[projectedRows.length - 1] : null;
    
    const newProjections: any[] = [];
    if (firstMonth) {
      newProjections.push({
        bofa: firstMonth.bofa,
        bofa2: firstMonth.bofa2,
        chase: firstMonth.chase,
        checkingBalance: firstMonth.checking,
        payments: { bofaPayment, bofa2Payment, chasePayment }
      });
    } else {
      // Fallback if no projection found
      newProjections.push({
        bofa: bofaStatement,
        bofa2: bofa2Statement,
        chase: chaseStatement,
        checkingBalance: checking,
        payments: { bofaPayment, bofa2Payment, chasePayment }
      });
    }
      
    // For additional cycles, use the previous month's ending balances as the starting point
    projectionCycles.forEach((cycle, index) => {
      // Get the previous projection's ending balances
      const previousProjection = newProjections[newProjections.length - 1];
      const startingBofaBalance = previousProjection ? previousProjection.bofa : bofaStatement;
      const startingBofa2Balance = previousProjection ? previousProjection.bofa2 : bofa2Statement;
      const startingChaseBalance = previousProjection ? previousProjection.chase : chaseStatement;
      const startingChecking = previousProjection ? previousProjection.checkingBalance : checking;

      // Calculate start date for this cycle (one month after the first projection started)
      const cycleStartDate = new Date();
      cycleStartDate.setMonth(cycleStartDate.getMonth() + index + 1);
      cycleStartDate.setDate(1); // Start of the month

      const cycleRules: ProjectionRules = {
        checkingBalance: startingChecking,
        bofaBalance: startingBofaBalance,
        bofa2Balance: startingBofa2Balance,
        chaseBalance: startingChaseBalance,
        // No pending charges for future cycles (already posted)
        pendingBofA: 0,
        pendingBofA2: 0,
        pendingChase: 0,
        bofaStatement: bofaStatement,
        bofa2Statement: bofa2Statement,
        chaseStatement: chaseStatement,
        paycheckAmount,
        rent,
        weeklySpending,
        bofaPaymentAmount: cycle.bofaPayment,
        bofa2PaymentAmount: cycle.bofa2Payment,
        chasePaymentAmount: cycle.chasePayment,
        rentDay: 23,
        bofaPaymentDay: 3,
        bofa2PaymentDay: 24,
        chasePaymentDay: 8,
        payDayReference: new Date('2025-11-20'),
        startDate: cycleStartDate
      };
      const cycleProjection = generateProjection(cycleRules, 1);
      const cycleActualSpending = cycleProjection.reduce((total, row) => total + row.spending, 0);
      const cycleEndOfMonth = cycleProjection.length > 0 ? cycleProjection[cycleProjection.length - 1] : null;
      
      if (cycleEndOfMonth) {
        newProjections.push({
          bofa: cycleEndOfMonth.bofa,
          bofa2: cycleEndOfMonth.bofa2,
          chase: cycleEndOfMonth.chase,
          checkingBalance: cycleEndOfMonth.checking,
          payments: cycle,
          actualSpending: cycleActualSpending
        });
      }
      });

    setProjectionsState(newProjections);
  }, [checking, bofa, bofa2, chase, bofaStatement, bofa2Statement, chaseStatement, bofaPayment, bofa2Payment, chasePayment, paycheckAmount, rent, weeklySpending, projectionCycles, tableProjectedRows]);

  const addProjectionCycle = () => {
    setProjectionCycles([...projectionCycles, {
      bofaPayment: 0,
      bofa2Payment: 0,
      chasePayment: 0
    }]);
  };

  const updateProjectionCycle = (index: number, field: 'bofaPayment' | 'bofa2Payment' | 'chasePayment', value: number) => {
    console.log(`💾 Updating cycle ${index} ${field} to ${value}`);
    const updated = [...projectionCycles];
    if (!updated[index]) {
      console.error(`❌ Cycle ${index} doesn't exist!`);
      return;
    }
    updated[index][field] = value;
    console.log(`✅ Updated cycle ${index}:`, updated[index]);
    setProjectionCycles(updated);
  };

  const removeLastProjection = () => {
    setProjectionCycles(projectionCycles.slice(0, -1));
  };

  // Notify parent when projection cycles change
  useEffect(() => {
    if (onProjectionCyclesChange) {
      onProjectionCyclesChange(projectionCycles);
    }
  }, [projectionCycles, onProjectionCyclesChange]);

  // Save balances to localStorage whenever they change
  useEffect(() => {
    saveBalances({
      checking,
      bofa,
      bofa2,
      chase,
      bofaStatement,
      bofa2Statement,
      chaseStatement,
      pendingBofA,
      pendingBofA2,
      pendingChase
    });
  }, [checking, bofa, bofa2, chase, bofaStatement, bofa2Statement, chaseStatement, pendingBofA, pendingBofA2, pendingChase]);

  // Save rules to localStorage whenever they change
  useEffect(() => {
    saveRules({
      paycheckAmount,
      rent,
      weeklySpending,
      bofaPayment,
      bofa2Payment,
      chasePayment
    });
  }, [paycheckAmount, rent, weeklySpending, bofaPayment, bofa2Payment, chasePayment]);

  // Notify parent when rules change
  const handleRuleChange = () => {
    console.log('📢 handleRuleChange called with payments:', { bofaPaymentAmount: bofaPayment, bofa2PaymentAmount: bofa2Payment, chasePaymentAmount: chasePayment });
    if (onRulesChange) {
      onRulesChange({
        checkingBalance: checking,
        // Use the CURRENT balances that the user has edited
        bofaBalance: bofa,
        bofa2Balance: bofa2,
        chaseBalance: chase,
        // Pending charges that will post
        pendingBofA,
        pendingBofA2,
        pendingChase,
        // Statement balances for reference
        bofaStatement,
        bofa2Statement,
        chaseStatement,
        paycheckAmount,
        rent,
        weeklySpending,
        bofaPaymentAmount: bofaPayment,
        bofa2PaymentAmount: bofa2Payment,
        chasePaymentAmount: chasePayment
      });
    }
  };

  // Call whenever any value changes
  useEffect(() => {
    handleRuleChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, bofa, bofa2, chase, bofaStatement, bofa2Statement, chaseStatement, paycheckAmount, rent, weeklySpending, bofaPayment, bofa2Payment, chasePayment, pendingBofA, pendingBofA2, pendingChase, projectionCycles]);

  // Helper to get month name from offset
  const getMonthName = (monthOffset: number = 0) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return months[targetMonth.getMonth()];
  };

  // Helper to detect negative cash flow
  const hasNegativeCashFlow = (monthIndex: number) => {
    const projection = projections[monthIndex];
    return projection && projection.checkingBalance < 0;
  };

  // Quick Update Modal handlers
  const handleQuickUpdate = (values: {
    checking: number;
    bofaStatement: number;
    bofa2Statement: number;
    chaseStatement: number;
    currentBofA: number;
    currentBofA2: number;
    currentChase: number;
    pendingBofA: number;
    pendingBofA2: number;
    pendingChase: number;
    paycheckAmount: number;
    rent: number;
    weeklySpending: number;
    bofaPayment: number;
    bofa2Payment: number;
    chasePayment: number;
  }) => {
    setChecking(values.checking);
    setBofaStatement(values.bofaStatement);
    setBofa2Statement(values.bofa2Statement);
    setChaseStatement(values.chaseStatement);
    setBofa(values.currentBofA);
    setBofa2(values.currentBofA2);
    setChase(values.currentChase);
    setPendingBofA(values.pendingBofA);
    setPendingBofA2(values.pendingBofA2);
    setPendingChase(values.pendingChase);
    setPaycheckAmount(values.paycheckAmount);
    setRent(values.rent);
    setWeeklySpending(values.weeklySpending);
    setBofaPayment(values.bofaPayment);
    setBofa2Payment(values.bofa2Payment);
    setChasePayment(values.chasePayment);
  };

  // Helper function to parse date string (format: "24-Dec-2025")
  const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0]);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    
    if (month === -1 || isNaN(day) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Helper function to get the last row for a specific month from table rows
  // CRITICAL: Only returns rows from that EXACT month, never from other months
  const getMonthEndRow = (monthOffset: number) => {
    const today = new Date();
    const targetMonth = (today.getMonth() + monthOffset) % 12;
    const targetYear = today.getFullYear() + Math.floor((today.getMonth() + monthOffset) / 12);
    
    // Filter rows for this SPECIFIC month and year ONLY
    const monthRows = tableProjectedRows.filter(row => {
      const rowDate = parseDate(row.date);
      if (!rowDate) return false;
      // Must be EXACTLY in target month and year
      return rowDate.getMonth() === targetMonth && 
             rowDate.getFullYear() === targetYear;
    });
    
    // Return the last row of the month (highest day number)
    if (monthRows.length === 0) return null;
    
    // Sort by date and return the last one (last day of that month)
    monthRows.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    
    const lastRow = monthRows[monthRows.length - 1];
    
    // Final verification: ensure it's from the correct month
    const finalCheck = parseDate(lastRow.date);
    if (finalCheck && (finalCheck.getMonth() !== targetMonth || finalCheck.getFullYear() !== targetYear)) {
      console.error(`❌ ERROR: getMonthEndRow returned wrong month!`, {
        requestedMonth: targetMonth,
        requestedYear: targetYear,
        actualMonth: finalCheck.getMonth(),
        actualYear: finalCheck.getFullYear(),
        rowDate: lastRow.date
      });
      return null;
    }
    
    return lastRow;
  };

  // Helper function to calculate spending for a specific month from table rows
  const getMonthlySpending = (monthOffset: number) => {
    const today = new Date();
    const targetMonth = (today.getMonth() + monthOffset) % 12;
    const targetYear = today.getFullYear() + Math.floor((today.getMonth() + monthOffset) / 12);
    
    const monthRows = tableProjectedRows.filter(row => {
      const rowDate = parseDate(row.date);
      if (!rowDate) return false;
      return rowDate.getMonth() === targetMonth && rowDate.getFullYear() === targetYear;
    });
    
    return monthRows.reduce((total, row) => total + (row.spending || 0), 0);
  };

  return (
    <div className="account-summary-new">
      <div className="summary-header">
        <div>
          <h2>TODAY</h2>
          <p className="date-display">{today}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(138, 43, 226, 0.2))',
              border: '2px solid rgba(0, 255, 136, 0.5)',
              borderRadius: '12px',
              color: '#00ff88',
              fontWeight: '700',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(0, 255, 136, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(138, 43, 226, 0.3))';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(138, 43, 226, 0.2))';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.1)';
            }}
          >
            🚀 Quick Update
          </button>
          <div className="next-paycheck-badge">
            Next paycheck in <strong>{daysToPaycheck}</strong> days
          </div>
        </div>
      </div>

      <div className="widgets-grid">
        <div className="widget-primary">
          <EditableWidget
            label="Checking Balance"
            value={checking}
            onSave={setChecking}
            color="#00ff88"
            size="large"
          />
        </div>

        <EditableWidget
          label="BofA"
          value={bofa}
          onSave={setBofa}
          color={bofa === 0 ? "#00ff88" : "#ff453a"}
          pending={pendingBofA > 0 ? pendingBofA : undefined}
          onPendingEdit={setPendingBofA}
          sublabel={bofa === 0 ? "✅ PAID OFF!" : "0% APR"}
          showNoPending={pendingBofA === 0}
        />

        <EditableWidget
          label="BofA 2"
          value={bofa2}
          onSave={setBofa2}
          color={bofa2 === 0 ? "#00ff88" : "#ff6b9d"}
          pending={pendingBofA2 > 0 ? pendingBofA2 : undefined}
          onPendingEdit={setPendingBofA2}
          sublabel={bofa2 === 0 ? "✅ PAID OFF!" : "0% APR"}
          showNoPending={pendingBofA2 === 0}
        />

        <EditableWidget
          label="Chase"
          value={chase}
          onSave={setChase}
          color={chase === 0 ? "#00ff88" : "#ff9f0a"}
          pending={pendingChase > 0 ? pendingChase : undefined}
          onPendingEdit={setPendingChase}
          sublabel={chase === 0 ? "✅ PAID OFF!" : "⚠️ ACCRUING INTEREST"}
          showNoPending={pendingChase === 0}
        />
      </div>

      <div className="strategy-panel">
        <h3>YOUR SITUATION</h3>
        <div className="strategy-grid">
          <EditableWidget
            label="💵 Paycheck (Bi-weekly)"
            value={paycheckAmount}
            onSave={setPaycheckAmount}
            color="#00ff88"
            size="small"
          />
          <EditableWidget
            label="📅 Rent (23rd)"
            value={rent}
            onSave={setRent}
            color="#64d2ff"
            size="small"
          />
          <EditableWidget
            label="💰 Weekly Spending"
            value={weeklySpending}
            onSave={setWeeklySpending}
            color="#ffd60a"
            size="small"
          />
        </div>
        
        <h3 style={{ marginTop: '32px' }}>PAYMENT STRATEGY</h3>
        {(() => {
          // Calculate cash available on each due date
          const today = new Date();
          const referencePayday = new Date('2025-11-20');
          
          const isPayday = (testDate: Date) => {
            const daysDiff = Math.floor((testDate.getTime() - referencePayday.getTime()) / (1000 * 60 * 60 * 24));
            const weeksDiff = Math.floor(daysDiff / 7);
            return testDate.getDay() === 4 && weeksDiff % 2 === 0;
          };
          
          // Current month payments (monthOffset = 0 for December)
          const cashAfterBofA = getCashOnDate(0, 3);
          const cashAfterChase = getCashOnDate(0, 8);
          const cashAfterBofA2 = getCashOnDate(0, 24);
          
          return (
            <div className="strategy-grid">
              <EditableWidget
                label="💳 Pay BofA (Due 3rd)"
                value={bofaPayment}
                onSave={(value) => {
                  setBofaPayment(value);
                  if (value > 0) setBofaPaidThisMonth(false); // Reset paid flag if setting a payment
                }}
                color={bofaStatement === 0 ? "#00ff88" : "#ff453a"}
                size="small"
                onPayFull={() => {
                  setBofaPayment(bofaStatement);
                  setBofaPaidThisMonth(false); // Reset paid flag when using Pay Full
                }}
                onPaidThisMonth={() => {
                  if (bofaPaidThisMonth) {
                    // Clear paid status
                    setBofaPaidThisMonth(false);
                  } else {
                    // Mark as paid
                    setBofaPaidThisMonth(true);
                    setBofaPayment(0);
                  }
                }}
                isPaidThisMonth={bofaPaidThisMonth}
                isWarning={cashAfterBofA < 0 && bofaPayment > 0}
                sublabel={bofaStatement === 0 ? "✅ Card is paid off - no payment needed" :
                         bofaPayment > 0 ? `💰 Cash in checking after payment: $${cashAfterBofA.toFixed(2)}` :
                         bofaPaidThisMonth ? `✅ Paid this month, waiting for next statement` :
                         `💰 Cash in checking before payment: $${cashAfterBofA.toFixed(2)}`}
              />
              <EditableWidget
                label="💳 Pay BofA 2 (Due 24th)"
                value={bofa2Payment}
                onSave={(value) => {
                  setBofa2Payment(value);
                  if (value > 0) setBofa2PaidThisMonth(false);
                }}
                color={bofa2Statement === 0 ? "#00ff88" : "#ff6b9d"}
                size="small"
                onPayFull={() => {
                  setBofa2Payment(bofa2Statement);
                  setBofa2PaidThisMonth(false);
                }}
                onPaidThisMonth={() => {
                  if (bofa2PaidThisMonth) {
                    setBofa2PaidThisMonth(false);
                  } else {
                    setBofa2PaidThisMonth(true);
                    setBofa2Payment(0);
                  }
                }}
                isPaidThisMonth={bofa2PaidThisMonth}
                isWarning={cashAfterBofA2 < 0 && bofa2Payment > 0}
                sublabel={bofa2Statement === 0 ? "✅ Card is paid off - no payment needed" :
                         bofa2Payment > 0 ? `💰 Cash in checking after payment: $${cashAfterBofA2.toFixed(2)}` :
                         bofa2PaidThisMonth ? `✅ Paid this month, waiting for next statement` :
                         `💰 Cash in checking before payment: $${cashAfterBofA2.toFixed(2)}`}
              />
              <EditableWidget
                label="💳 Pay Chase (Due 8th)"
                value={chasePayment}
                onSave={(value) => {
                  setChasePayment(value);
                  if (value > 0) setChasePaidThisMonth(false);
                }}
                color={chaseStatement === 0 ? "#00ff88" : "#ff9f0a"}
                size="small"
                onPayFull={() => {
                  setChasePayment(chaseStatement);
                  setChasePaidThisMonth(false);
                }}
                onPaidThisMonth={() => {
                  if (chasePaidThisMonth) {
                    setChasePaidThisMonth(false);
                  } else {
                    setChasePaidThisMonth(true);
                    setChasePayment(0);
                  }
                }}
                isPaidThisMonth={chasePaidThisMonth}
                isWarning={cashAfterChase < 0 && chasePayment > 0}
                sublabel={chaseStatement === 0 ? "✅ Card is paid off - no payment needed" :
                         chasePayment > 0 ? `💰 Cash in checking after payment: $${cashAfterChase.toFixed(2)}` :
                         chasePaidThisMonth ? `✅ Paid this month, waiting for next statement` :
                         `💰 Cash in checking before payment: $${cashAfterChase.toFixed(2)}`}
              />
            </div>
          );
        })()}
        
        <h3 style={{ marginTop: '32px' }}>📋 STATEMENT BALANCES (WHAT YOU OWE THIS MONTH)</h3>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'rgba(255, 255, 255, 0.6)', 
          marginBottom: '20px',
          fontStyle: 'italic'
        }}>
          What you owe on your current billing statements
        </p>
        <div className="strategy-grid">
          <EditableWidget
            label="BofA Statement"
            value={bofaStatement}
            onSave={setBofaStatement}
            color={bofaStatement === 0 ? "#00ff88" : "#ff453a"}
            size="small"
          />
          <EditableWidget
            label="BofA 2 Statement"
            value={bofa2Statement}
            onSave={setBofa2Statement}
            color={bofa2Statement === 0 ? "#00ff88" : "#ff6b9d"}
            size="small"
          />
          <EditableWidget
            label="Chase Statement"
            value={chaseStatement}
            onSave={setChaseStatement}
            color={chaseStatement === 0 ? "#00ff88" : "#ff9f0a"}
            size="small"
          />
        </div>
        
        {tableProjectedRows.length > 0 && (() => {
          // "AFTER PAYMENTS - JANUARY STATEMENT" should ALWAYS show December's ending balance
          // This is a HISTORICAL snapshot - it should NEVER change when new cycles are added
          const today = new Date();
          const currentMonth = today.getMonth(); // December
          const currentYear = today.getFullYear();
          
          // ALWAYS use December rows ONLY - this is the historical balance
          const decemberRowsOnly = tableProjectedRows.filter(row => {
            const rowDate = parseDate(row.date);
            if (!rowDate) return false;
            // Must be EXACTLY in December (current month)
            return rowDate.getMonth() === currentMonth && 
                   rowDate.getFullYear() === currentYear;
          });
          
          if (decemberRowsOnly.length === 0) return null;
          
          // Sort December rows by date and get the last one (Dec 31)
          decemberRowsOnly.sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
          });
          
          const nextMonthRow = decemberRowsOnly[decemberRowsOnly.length - 1];
          
          if (!nextMonthRow) return null;
          
          // Final verification: ensure row is from December
          const finalCheck = parseDate(nextMonthRow.date);
          if (!finalCheck || finalCheck.getMonth() !== currentMonth || finalCheck.getFullYear() !== currentYear) {
            console.error('❌ CRITICAL ERROR: Selected row is NOT from December!', {
              selectedDate: nextMonthRow.date,
              selectedMonth: finalCheck?.getMonth(),
              selectedYear: finalCheck?.getFullYear(),
              expectedMonth: currentMonth,
              expectedYear: currentYear
            });
            return null; // Don't show wrong data
          }

          // Calculate spending for December ONLY (rest of current month)
          const firstMonthSpending = decemberRowsOnly
            .reduce((total, row) => total + (row.spending || 0), 0);

          return (
            <>
              <h3 style={{ marginTop: '32px' }}>AFTER PAYMENTS - {getMonthName(1).toUpperCase()} STATEMENT</h3>
              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '20px',
                fontStyle: 'italic'
              }}>
                After first payment cycle {firstMonthSpending > 0 && `+ $${firstMonthSpending.toFixed(0)}/month spending on BofA 2`}
              </p>
              <div className="strategy-grid">
              <EditableWidget
                label="💳 BofA Card Balance"
                value={nextMonthRow.bofa}
                onSave={() => {}}
                color={nextMonthRow.bofa === 0 ? "#00ff88" : "#ff453a"}
                size="small"
                sublabel={nextMonthRow.bofa === 0 ? "✅ PAID OFF!" :
                         bofaPaidThisMonth ? "Already paid this month" :
                         (bofaPayment > 0 ? `After $${bofaPayment} payment` : 'No payment set')}
              />
              <EditableWidget
                label="BofA 2 Balance"
                value={nextMonthRow.bofa2}
                onSave={() => {}}
                color={nextMonthRow.bofa2 === 0 ? "#00ff88" : "#ff6b9d"}
                size="small"
                sublabel={nextMonthRow.bofa2 === 0 ? "✅ PAID OFF!" :
                         bofa2PaidThisMonth ? "Already paid this month" :
                         `After $${bofa2Payment} payment + $${firstMonthSpending.toFixed(0)} spending`}
              />
              <EditableWidget
                label="Chase Balance"
                value={nextMonthRow.chase}
                onSave={() => {}}
                color={nextMonthRow.chase === 0 ? "#00ff88" : "#ff9f0a"}
                size="small"
                sublabel={nextMonthRow.chase === 0 ? "✅ PAID OFF!" :
                         chasePaidThisMonth ? "Already paid this month" :
                         (chasePayment > 0 ? `After $${chasePayment} payment` : 'No payment set')}
                />
              </div>
            </>
          );
        })()}

        {/* Additional Projection Cycles */}
        {projectionCycles.map((cycle, index) => {
          // Find the ending balance for the statement month (index + 1) from the table
          // Payments are made in month (index + 1), statement is for the same month (index + 1)
          const monthEndRow = getMonthEndRow(index + 1);
          const projection = projections[index + 1];
          
          // Use table data if available, otherwise fall back to local projection
          const displayProjection = monthEndRow || projection;
          if (!displayProjection) return null;
          
          // Calculate spending for the FULL calendar month of the payment month
          // This accounts for 4 or 5 weeks depending on how many Thursdays fall in that month
          const today = new Date();
          const paymentMonth = (today.getMonth() + index + 1) % 12;
          const paymentYear = today.getFullYear() + Math.floor((today.getMonth() + index + 1) / 12);
          const paymentMonthStart = new Date(paymentYear, paymentMonth, 1);
          paymentMonthStart.setHours(0, 0, 0, 0);
          const paymentMonthEnd = new Date(paymentYear, paymentMonth + 1, 0); // Last day of payment month
          paymentMonthEnd.setHours(23, 59, 59, 999);
          
          // Calculate spending for the full calendar month (e.g., Jan 1 - Jan 31)
          // CRITICAL: Only use rows from the EXACT payment month, never from other months
          const cycleSpending = tableProjectedRows
            .filter(row => {
              const rowDate = parseDate(row.date);
              if (!rowDate) return false;
              rowDate.setHours(0, 0, 0, 0);
              // Must be EXACTLY in payment month and year
              return rowDate.getMonth() === paymentMonth &&
                     rowDate.getFullYear() === paymentYear &&
                     rowDate >= paymentMonthStart && 
                     rowDate <= paymentMonthEnd;
            })
            .reduce((total, row) => total + (row.spending || 0), 0);
          
          // Calculate cash available for this future month
          const prevProjection = projections[index]; // Previous month's ending balances
          const startingChecking = prevProjection?.checkingBalance || checking;
          
          // Use the same getCashOnDate function for consistency
          // index 0 = January (monthOffset = 1), index 1 = February (monthOffset = 2), etc.
          const cashAfterBofA = getCashOnDate(index + 1, 3);
          const cashAfterChase = getCashOnDate(index + 1, 8);
          const cashAfterBofA2 = getCashOnDate(index + 1, 24);

          
          return (
            <div key={index}>
              <h3 style={{ marginTop: '32px' }}>{getMonthName(index + 1).toUpperCase()} PAYMENTS</h3>
              <div className="strategy-grid">
                <EditableWidget
                  label={`💳 Pay BofA (Due 3rd)`}
                  value={cycle.bofaPayment}
                  onSave={(val) => updateProjectionCycle(index, 'bofaPayment', val)}
                  color={bofaStatement === 0 ? "#00ff88" : "#ff453a"}
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'bofaPayment', displayProjection.bofa)}
                  isWarning={cashAfterBofA < 0 && cycle.bofaPayment > 0}
                  sublabel={bofaStatement === 0 ? "✅ Card is paid off - no payment needed" :
                           cycle.bofaPayment > 0 ? `After payment: $${cashAfterBofA.toFixed(2)}` : `Before payment: $${cashAfterBofA.toFixed(2)}`}
                />
                <EditableWidget
                  label={`💳 Pay BofA 2 (Due 24th)`}
                  value={cycle.bofa2Payment}
                  onSave={(val) => updateProjectionCycle(index, 'bofa2Payment', val)}
                  color={bofa2Statement === 0 ? "#00ff88" : "#ff6b9d"}
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'bofa2Payment', displayProjection.bofa2)}
                  isWarning={cashAfterBofA2 < 0 && cycle.bofa2Payment > 0}
                  sublabel={bofa2Statement === 0 ? "✅ Card is paid off - no payment needed" :
                           cycle.bofa2Payment > 0 ? `After payment: $${cashAfterBofA2.toFixed(2)}` : `Before payment: $${cashAfterBofA2.toFixed(2)}`}
                />
                <EditableWidget
                  label={`💳 Pay Chase (Due 8th)`}
                  value={cycle.chasePayment}
                  onSave={(val) => updateProjectionCycle(index, 'chasePayment', val)}
                  color={chaseStatement === 0 ? "#00ff88" : "#ff9f0a"}
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'chasePayment', displayProjection.chase)}
                  isWarning={cashAfterChase < 0 && cycle.chasePayment > 0}
                  sublabel={chaseStatement === 0 ? "✅ Card is paid off - no payment needed" :
                           cycle.chasePayment > 0 ? `After payment: $${cashAfterChase.toFixed(2)}` : `Before payment: $${cashAfterChase.toFixed(2)}`}
                />
              </div>

              <h3 style={{ marginTop: '24px' }}>AFTER PAYMENTS - {getMonthName(index + 1).toUpperCase()} STATEMENT</h3>
              <div className="strategy-grid">
                <EditableWidget
                  label="BofA Balance"
                  value={displayProjection.bofa}
                  onSave={() => {}}
                  color={displayProjection.bofa === 0 ? "#00ff88" : "#ff453a"}
                  size="small"
                  sublabel={displayProjection.bofa === 0 ? "✅ PAID OFF!" : `After $${cycle.bofaPayment} payment`}
                />
              <EditableWidget
                label="💳 BofA 2 Card Balance"
                value={displayProjection.bofa2}
                onSave={() => {}}
                color={displayProjection.bofa2 === 0 ? "#00ff88" : "#ff6b9d"}
                size="small"
                sublabel={displayProjection.bofa2 === 0 ? "✅ PAID OFF!" : `After $${cycle.bofa2Payment} payment + $${cycleSpending.toFixed(0)} spending`}
              />
              <EditableWidget
                label="💳 Chase Card Balance"
                value={displayProjection.chase}
                onSave={() => {}}
                color={displayProjection.chase === 0 ? "#00ff88" : "#ff9f0a"}
                size="small"
                sublabel={displayProjection.chase === 0 ? "✅ PAID OFF!" : `After $${cycle.chasePayment} payment`}
              />
              </div>
            </div>
          );
        })}

        {/* Project Further Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(138, 43, 226, 0.2)'
        }}>
          <button
            onClick={addProjectionCycle}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(138, 43, 226, 0.2))',
              border: '2px solid rgba(0, 255, 136, 0.5)',
              borderRadius: '12px',
              color: '#00ff88',
              fontWeight: '700',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(138, 43, 226, 0.3))';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(138, 43, 226, 0.2))';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            📊 Project +1 Month Further
          </button>
          
          {projectionCycles.length > 0 && (
            <button
              onClick={removeLastProjection}
              style={{
                padding: '14px 28px',
                background: 'rgba(255, 69, 58, 0.15)',
                border: '2px solid rgba(255, 69, 58, 0.4)',
                borderRadius: '12px',
                color: '#ff453a',
                fontWeight: '700',
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 69, 58, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 69, 58, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🗑️ Remove Last Month
            </button>
          )}
        </div>
        
        <div className="debt-summary">
          <div className="debt-title">💳 Total CC Debt ({getMonthName(0).toUpperCase()})</div>
          <div className="debt-value">${((bofaStatement + bofa2Statement + chaseStatement) / 1000).toFixed(1)}k</div>
          
          {projections.map((projection, index) => {
            const totalDebt = projection.bofa + projection.bofa2 + projection.chase;
            const currentDebt = bofaStatement + bofa2Statement + chaseStatement;
            const isImproved = totalDebt < currentDebt;
            
            return (
              <div key={index} className="debt-projection">
              <div className="projection-arrow-line">↓</div>
              <div className="debt-title" style={{ marginTop: '16px', opacity: 0.8 }}>
                  💳 Total CC Debt ({getMonthName(index + 1).toUpperCase()})
              </div>
              <div className="debt-value" style={{ 
                  color: isImproved ? '#00ff88' : '#ff9f0a',
                fontSize: '2.5rem'
              }}>
                  ${(totalDebt / 1000).toFixed(1)}k
              </div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                marginTop: '8px',
                  color: isImproved ? '#00ff88' : '#ff9f0a'
              }}>
                  {isImproved
                    ? `↓ Down $${((currentDebt - totalDebt) / 1000).toFixed(1)}k`
                    : `↑ Up $${((totalDebt - currentDebt) / 1000).toFixed(1)}k`
                }
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Quick Update Modal */}
      {isModalOpen && (
      <QuickUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentValues={{
          checking: isFirstTime ? 0 : checking,
          bofaStatement: isFirstTime ? 0 : bofaStatement,
          bofa2Statement: isFirstTime ? 0 : bofa2Statement,
          chaseStatement: isFirstTime ? 0 : chaseStatement,
          currentBofA: isFirstTime ? 0 : bofa,
          currentBofA2: isFirstTime ? 0 : bofa2,
          currentChase: isFirstTime ? 0 : chase,
          pendingBofA: isFirstTime ? 0 : pendingBofA,
          pendingBofA2: isFirstTime ? 0 : pendingBofA2,
          pendingChase: isFirstTime ? 0 : pendingChase,
          paycheckAmount: isFirstTime ? 0 : paycheckAmount,
          rent: isFirstTime ? 0 : rent,
          weeklySpending: isFirstTime ? 0 : weeklySpending,
          bofaPayment: isFirstTime ? 0 : bofaPayment,
          bofa2Payment: isFirstTime ? 0 : bofa2Payment,
          chasePayment: isFirstTime ? 0 : chasePayment
        }}
        excelData={data ? {
          checking: data.summary.currentChecking,
          bofaStatement: data.summary.bofaStatement,
          bofa2Statement: data.summary.bofa2Statement,
          chaseStatement: data.summary.chaseStatement,
          currentBofA: data.summary.currentBofA,
          currentBofA2: data.summary.currentBofA2,
          currentChase: data.summary.currentChase,
          pendingBofA: data.summary.pendingBofACharges,
          pendingBofA2: data.summary.pendingBofA2Charges,
          pendingChase: data.summary.pendingChaseCharges,
          paycheckAmount: 3500,
          rent: 1760,
          weeklySpending: 200
        } : undefined}
        onSave={handleQuickUpdate}
        isFirstTime={isFirstTime}
      />
      )}
    </div>
  );
}

export default AccountSummary;
