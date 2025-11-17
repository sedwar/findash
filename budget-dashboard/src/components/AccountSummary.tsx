import { useState, useEffect } from 'react';
import type { FinancialData } from '../types';
import { generateProjection, type ProjectionRules } from '../utils/projectionEngine';
import EditableWidget from './EditableWidget';
import QuickUpdateModal from './QuickUpdateModal';
import './AccountSummary.css';

interface AccountSummaryProps {
  data: FinancialData;
  onRulesChange?: (rules: any) => void;
  onProjectionCyclesChange?: (cycles: any[]) => void;
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

function AccountSummary({ data, onRulesChange, onProjectionCyclesChange }: AccountSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
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
  // Only use Excel data if there are stored balances AND we're not in first-time mode
  const [checking, setChecking] = useState(storedBalances?.checking ?? (storedBalances ? data?.summary?.currentChecking : 0) ?? 0);
  const [bofa, setBofa] = useState(storedBalances?.bofa ?? (storedBalances ? data?.summary?.currentBofA : 0) ?? 0);
  const [bofa2, setBofa2] = useState(storedBalances?.bofa2 ?? (storedBalances ? data?.summary?.currentBofA2 : 0) ?? 0);
  const [chase, setChase] = useState(storedBalances?.chase ?? (storedBalances ? data?.summary?.currentChase : 0) ?? 0);
  
  // STATEMENT BALANCES (what the cards will be after pending charges hit) - Default to 0
  // Only use Excel data if there are stored balances AND we're not in first-time mode
  const [bofaStatement, setBofaStatement] = useState(storedBalances?.bofaStatement ?? (storedBalances ? data?.summary?.bofaStatement : 0) ?? 0);
  const [bofa2Statement, setBofa2Statement] = useState(storedBalances?.bofa2Statement ?? (storedBalances ? data?.summary?.bofa2Statement : 0) ?? 0);
  const [chaseStatement, setChaseStatement] = useState(storedBalances?.chaseStatement ?? (storedBalances ? data?.summary?.chaseStatement : 0) ?? 0);
  
  // PENDING CHARGES (editable) - Default to 0
  // Only use Excel data if there are stored balances AND we're not in first-time mode
  const [pendingBofA, setPendingBofA] = useState(storedBalances?.pendingBofA ?? (storedBalances ? data?.summary?.pendingBofACharges : 0) ?? 0);
  const [pendingBofA2, setPendingBofA2] = useState(storedBalances?.pendingBofA2 ?? (storedBalances ? data?.summary?.pendingBofA2Charges : 0) ?? 0);
  const [pendingChase, setPendingChase] = useState(storedBalances?.pendingChase ?? (storedBalances ? data?.summary?.pendingChaseCharges : 0) ?? 0);
  
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

  // Sync from data prop if it changes and we don't have stored values
  useEffect(() => {
    if (!storedBalances && data?.summary) {
      setChecking(data.summary.currentChecking ?? 0);
      setBofa(data.summary.currentBofA ?? 0);
      setBofa2(data.summary.currentBofA2 ?? 0);
      setChase(data.summary.currentChase ?? 0);
      setBofaStatement(data.summary.bofaStatement ?? 0);
      setBofa2Statement(data.summary.bofa2Statement ?? 0);
      setChaseStatement(data.summary.chaseStatement ?? 0);
      setPendingBofA(data.summary.pendingBofACharges ?? 0);
      setPendingBofA2(data.summary.pendingBofA2Charges ?? 0);
      setPendingChase(data.summary.pendingChaseCharges ?? 0);
    }
  }, [data, storedBalances]);

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

  // Recalculate projections whenever dependencies change
  useEffect(() => {
    // Use the same projection engine as Dashboard for consistency
    const rules: ProjectionRules = {
      checkingBalance: checking,
      // Use CURRENT balances (what's actually on the card now)
      // These include charges that have posted but aren't in statement yet
      // ADD pending charges that will post soon (within next few days)
      bofaBalance: bofa + pendingBofA,
      bofa2Balance: bofa2 + pendingBofA2,
      chaseBalance: chase + pendingChase,
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
    
    // Extract key data for the first payment cycle
    // Get the LAST row of projections (end of month) to include all spending
    const firstMonth = projectedRows.length > 0 ? projectedRows[projectedRows.length - 1] : null;
    
    const newProjections = [];
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
      
      const cycleRules: ProjectionRules = {
        checkingBalance: startingChecking,
        bofaBalance: startingBofaBalance,
        bofa2Balance: startingBofa2Balance,
        chaseBalance: startingChaseBalance,
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
        payDayReference: new Date('2025-11-20')
      };
      const cycleProjection = generateProjection(cycleRules, 1);
      const cycleEndOfMonth = cycleProjection.length > 0 ? cycleProjection[cycleProjection.length - 1] : null;
      
      if (cycleEndOfMonth) {
        newProjections.push({
          bofa: cycleEndOfMonth.bofa,
          bofa2: cycleEndOfMonth.bofa2,
          chase: cycleEndOfMonth.chase,
          checkingBalance: cycleEndOfMonth.checking,
          payments: cycle
        });
      }
    });

    setProjectionsState(newProjections);
  }, [checking, bofa, bofa2, chase, bofaStatement, bofa2Statement, chaseStatement, bofaPayment, bofa2Payment, chasePayment, paycheckAmount, rent, weeklySpending, projectionCycles]);

  const addProjectionCycle = () => {
    setProjectionCycles([...projectionCycles, {
      bofaPayment: 0,
      bofa2Payment: 0,
      chasePayment: 0
    }]);
  };

  const updateProjectionCycle = (index: number, field: 'bofaPayment' | 'bofa2Payment' | 'chasePayment', value: number) => {
    const updated = [...projectionCycles];
    updated[index][field] = value;
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
          color={chase === 0 ? "#00ff88" : "#ff3b30"}
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
        
        <h3 style={{ marginTop: '32px' }}>PAYMENT STRATEGY (Monthly - 4th)</h3>
        <div className="strategy-grid">
          <EditableWidget
            label="💳 Pay BofA"
            value={bofaPayment}
            onSave={setBofaPayment}
            color="#ff453a"
            size="small"
            onPayFull={() => setBofaPayment(bofaStatement)}
            isWarning={hasNegativeCashFlow(0)}
          />
          <EditableWidget
            label="💳 Pay BofA 2"
            value={bofa2Payment}
            onSave={setBofa2Payment}
            color="#ff6b9d"
            size="small"
            onPayFull={() => setBofa2Payment(bofa2Statement)}
            isWarning={hasNegativeCashFlow(0)}
          />
          <EditableWidget
            label="💳 Pay Chase"
            value={chasePayment}
            onSave={setChasePayment}
            color="#ff9f0a"
            size="small"
            onPayFull={() => setChasePayment(chaseStatement)}
            isWarning={hasNegativeCashFlow(0)}
          />
        </div>
        
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
            color="#ff453a"
            size="small"
          />
          <EditableWidget
            label="BofA 2 Statement"
            value={bofa2Statement}
            onSave={setBofa2Statement}
            color="#ff6b9d"
            size="small"
          />
          <EditableWidget
            label="Chase Statement"
            value={chaseStatement}
            onSave={setChaseStatement}
            color="#ff9f0a"
            size="small"
          />
        </div>
        
        {projections.length > 0 && (
          <>
            <h3 style={{ marginTop: '32px' }}>AFTER PAYMENTS - {getMonthName(1).toUpperCase()} STATEMENT</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'rgba(255, 255, 255, 0.6)', 
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>
              After first payment cycle {weeklySpending > 0 && `+ $${weeklySpending * 4}/month spending on BofA 2`}
            </p>
            <div className="strategy-grid">
              <EditableWidget
                label="BofA Balance"
                value={projections[0].bofa}
                onSave={() => {}}
                color="#ff453a"
                size="small"
                sublabel={bofaPayment > 0 ? `After $${bofaPayment} payment` : 'No payment set'}
              />
              <EditableWidget
                label="BofA 2 Balance"
                value={projections[0].bofa2}
                onSave={() => {}}
                color="#ff6b9d"
                size="small"
                sublabel={`After $${bofa2Payment} payment + $${weeklySpending * 4} spending`}
              />
              <EditableWidget
                label="Chase Balance"
                value={projections[0].chase}
                onSave={() => {}}
                color="#ff9f0a"
                size="small"
                sublabel={chasePayment > 0 ? `After $${chasePayment} payment` : 'No payment set'}
              />
            </div>
          </>
        )}

        {/* Additional Projection Cycles */}
        {projectionCycles.map((cycle, index) => {
          const projection = projections[index + 1];
          return projection ? (
            <div key={index}>
              <h3 style={{ marginTop: '32px' }}>{getMonthName(index + 2).toUpperCase()} PAYMENTS</h3>
              <div className="strategy-grid">
                <EditableWidget
                  label={`💳 Pay BofA (${getMonthName(index + 2)})`}
                  value={cycle.bofaPayment}
                  onSave={(val) => updateProjectionCycle(index, 'bofaPayment', val)}
                  color="#ff453a"
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'bofaPayment', projections[index]?.bofa || 0)}
                  isWarning={hasNegativeCashFlow(index + 1)}
                />
                <EditableWidget
                  label={`💳 Pay BofA 2 (${getMonthName(index + 2)})`}
                  value={cycle.bofa2Payment}
                  onSave={(val) => updateProjectionCycle(index, 'bofa2Payment', val)}
                  color="#ff6b9d"
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'bofa2Payment', projections[index]?.bofa2 || 0)}
                  isWarning={hasNegativeCashFlow(index + 1)}
                />
                <EditableWidget
                  label={`💳 Pay Chase (${getMonthName(index + 2)})`}
                  value={cycle.chasePayment}
                  onSave={(val) => updateProjectionCycle(index, 'chasePayment', val)}
                  color="#ff9f0a"
                  size="small"
                  onPayFull={() => updateProjectionCycle(index, 'chasePayment', projections[index]?.chase || 0)}
                  isWarning={hasNegativeCashFlow(index + 1)}
                />
              </div>

              <h3 style={{ marginTop: '24px' }}>AFTER PAYMENTS - {getMonthName(index + 2).toUpperCase()} STATEMENT</h3>
              <div className="strategy-grid">
                <EditableWidget
                  label="BofA Balance"
                  value={projection.bofa}
                  onSave={() => {}}
                  color="#ff453a"
                  size="small"
                  sublabel={`After $${cycle.bofaPayment} payment`}
                />
                <EditableWidget
                  label="BofA 2 Balance"
                  value={projection.bofa2}
                  onSave={() => {}}
                  color="#ff6b9d"
                  size="small"
                  sublabel={`After $${cycle.bofa2Payment} payment + $${weeklySpending * 4} spending`}
                />
                <EditableWidget
                  label="Chase Balance"
                  value={projection.chase}
                  onSave={() => {}}
                  color="#ff9f0a"
                  size="small"
                  sublabel={`After $${cycle.chasePayment} payment`}
                />
              </div>
            </div>
          ) : null;
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
      {isModalOpen && data && console.log('📋 Passing Excel Data to Modal:', {
        checking: data.summary.currentChecking,
        bofaStatement: data.summary.bofaStatement,
        bofa2Statement: data.summary.bofa2Statement,
        chaseStatement: data.summary.chaseStatement,
        currentBofA: data.summary.currentBofA,
        currentBofA2: data.summary.currentBofA2,
        currentChase: data.summary.currentChase,
        pendingBofA: data.summary.pendingBofACharges,
        pendingBofA2: data.summary.pendingBofA2Charges,
        pendingChase: data.summary.pendingChaseCharges
      })}
      <QuickUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentValues={{
          checking,
          bofaStatement,
          bofa2Statement,
          chaseStatement,
          currentBofA: bofa,
          currentBofA2: bofa2,
          currentChase: chase,
          pendingBofA,
          pendingBofA2,
          pendingChase,
          paycheckAmount,
          rent,
          weeklySpending,
          bofaPayment,
          bofa2Payment,
          chasePayment
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
          pendingChase: data.summary.pendingChaseCharges
        } : undefined}
        onSave={handleQuickUpdate}
        isFirstTime={isFirstTime}
      />
    </div>
  );
}

export default AccountSummary;
