import { useState, useEffect } from 'react';
import type { FinancialData, CashFlowRow } from '../types';
import type { ProjectionRules } from '../utils/projectionEngine';
import AccountSummary from './AccountSummary';
import BalanceChart from './BalanceChart';
import UpcomingPayments from './UpcomingPayments';
import CashFlowTable from './CashFlowTable';
import { generateProjection, generateMinimumPaymentProjection } from '../utils/projectionEngine';
import './Dashboard.css';

interface DashboardProps {
  data: FinancialData;
}

function Dashboard({ data }: DashboardProps) {
  const [showFullChart, setShowFullChart] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [projectionMonths, setProjectionMonths] = useState(6);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [projectionCycles, setProjectionCycles] = useState<any[]>([]);

  const [projectionRules, setProjectionRules] = useState<ProjectionRules>({
    checkingBalance: data.summary.currentChecking,
    // Use CURRENT balances (just posted charges, no pending yet)
    bofaBalance: data.summary.currentBofA,
    bofa2Balance: data.summary.currentBofA2,
    chaseBalance: data.summary.currentChase,
    // Pending charges that will post in 1-2 days
    pendingBofA: data.summary.pendingBofACharges || 0,
    pendingBofA2: data.summary.pendingBofA2Charges || 0,
    pendingChase: data.summary.pendingChaseCharges || 0,
    // Statement balances for the projection
    // These represent starting point for next statement cycle
    bofaStatement: data.summary.bofaStatement,
    bofa2Statement: data.summary.bofa2Statement,
    chaseStatement: data.summary.chaseStatement,
    paycheckAmount: 3500,
    rent: 1760,
    weeklySpending: 200,
    bofaPaymentAmount: 0,
    bofa2PaymentAmount: 0,
    chasePaymentAmount: 0,
    rentDay: 23,
    payDayReference: new Date('2025-11-20')
  });

  const [projectedRows, setProjectedRows] = useState<CashFlowRow[]>(data.rows);

  // Recalculate projections whenever rules or cycles change
  useEffect(() => {
    let allRows: any[] = [];
    
    // Calculate first projection date range: TODAY -> end of current month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstProjectionEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    firstProjectionEnd.setHours(23, 59, 59, 999);
    
    // Calculate next month's payment dates (for cycle 0)
    const bofaDay = projectionRules.bofaPaymentDay || 3;
    const chaseDay = projectionRules.chasePaymentDay || 8;
    const bofa2Day = projectionRules.bofa2PaymentDay || 24;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthBofa = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), bofaDay);
    const nextMonthChase = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), chaseDay);
    const nextMonthBofa2 = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), bofa2Day);
    
    // Generate first month: TODAY -> end of current month (Dec 3 -> Dec 31)
    const firstMonthRules = { ...projectionRules, startDate: today };
    
    // Check if cycle 0 payments fall within first projection and apply them there
    if (projectionCycles.length > 0 && projectionCycles[0]) {
      const cycle0 = projectionCycles[0];
      
      // If payment date is in first projection (current month), apply it there
      if (cycle0.bofaPayment > 0 && nextMonthBofa <= firstProjectionEnd) {
        firstMonthRules.bofaPaymentAmount = cycle0.bofaPayment;
      }
      if (cycle0.chasePayment > 0 && nextMonthChase <= firstProjectionEnd) {
        firstMonthRules.chasePaymentAmount = cycle0.chasePayment;
      }
      if (cycle0.bofa2Payment > 0 && nextMonthBofa2 <= firstProjectionEnd) {
        firstMonthRules.bofa2PaymentAmount = cycle0.bofa2Payment;
      }
    }
    
    console.log('📅 First month rules:', {
      bofa2Balance: firstMonthRules.bofa2Balance,
      bofa2Statement: firstMonthRules.bofa2Statement,
      pendingBofA2: firstMonthRules.pendingBofA2,
      bofa2PaymentAmount: firstMonthRules.bofa2PaymentAmount,
      startDate: firstMonthRules.startDate,
      endDate: firstProjectionEnd
    });
    
    // Generate projection from today to end of current month
    const firstMonthRows = generateProjection(firstMonthRules, 1);
    
    // Find December 24th payment row
    const dec24Row = firstMonthRows.find(row => row.date.includes('24-Dec'));
    if (dec24Row && dec24Row.bofa2Payment > 0) {
      console.log('💳 Dec 24 payment:', {
        before: dec24Row.bofa2 + dec24Row.bofa2Payment,
        payment: dec24Row.bofa2Payment,
        after: dec24Row.bofa2
      });
    }
    
    const firstMonthEnd = firstMonthRows[firstMonthRows.length - 1];
    if (firstMonthEnd) {
      console.log('📊 First month ending:', {
        bofa2: firstMonthEnd.bofa2,
        totalSpending: firstMonthRows.reduce((sum, r) => sum + (r.spending || 0), 0)
      });
    }
    
    allRows = allRows.concat(firstMonthRows);
    
    // Get ending balances from first month
    let currentEndingBalances = firstMonthRows.length > 0 ? firstMonthRows[firstMonthRows.length - 1] : null;
    
    // Generate each additional month from cycles
    projectionCycles.forEach((cycle, cycleIndex) => {
      if (!currentEndingBalances) return;
      
      // Find last row to determine next month start date
      const lastRow = allRows[allRows.length - 1];
      const dateParts = lastRow.date.split('-');
      if (dateParts.length !== 3) return;
      
      const day = parseInt(dateParts[0]);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames.indexOf(dateParts[1]);
      const year = parseInt(dateParts[2]);
      if (month === -1 || isNaN(day) || isNaN(year)) return;
      
      // Start cycle from the FIRST day of the target month (full calendar month)
      // Cycle 0 = January (month + 1), Cycle 1 = February (month + 2), etc.
      const targetMonth = (today.getMonth() + cycleIndex + 1) % 12;
      const targetYear = today.getFullYear() + Math.floor((today.getMonth() + cycleIndex + 1) / 12);
      const cycleStartDate = new Date(targetYear, targetMonth, 1); // First day of target month
      cycleStartDate.setHours(0, 0, 0, 0);
      
      // End cycle on the LAST day of the target month (full calendar month)
      const cycleEndDate = new Date(targetYear, targetMonth + 1, 0); // Last day of target month
      cycleEndDate.setHours(23, 59, 59, 999);
      
      // Only apply payments that fall in this cycle's month
      const cycleMonth = cycleStartDate.getMonth();
      const cycleYear = cycleStartDate.getFullYear();
      
      const cycleBofaDate = new Date(cycleYear, cycleMonth, bofaDay);
      const cycleChaseDate = new Date(cycleYear, cycleMonth, chaseDay);
      const cycleBofa2Date = new Date(cycleYear, cycleMonth, bofa2Day);
      
      // Check if payment was already applied in first projection
      const wasBofaInFirst = cycleIndex === 0 && cycle.bofaPayment > 0 && nextMonthBofa <= firstProjectionEnd;
      const wasChaseInFirst = cycleIndex === 0 && cycle.chasePayment > 0 && nextMonthChase <= firstProjectionEnd;
      const wasBofa2InFirst = cycleIndex === 0 && cycle.bofa2Payment > 0 && nextMonthBofa2 <= firstProjectionEnd;
      
      console.log(`🔍 Cycle ${cycleIndex + 1} payment checks:`, {
        cycleBofa2Date: cycleBofa2Date.toDateString(),
        cycleStartDate: cycleStartDate.toDateString(),
        cycleEndDate: cycleEndDate.toDateString(),
        paymentAmount: cycle.bofa2Payment,
        inRange: cycleBofa2Date >= cycleStartDate && cycleBofa2Date <= cycleEndDate,
        wasInFirst: wasBofa2InFirst
      });
      
      // Apply payment only if it falls in this cycle AND wasn't already applied in first projection
      let bofaPaymentAmount = 0;
      let chasePaymentAmount = 0;
      let bofa2PaymentAmount = 0;
      
      if (cycle.bofaPayment > 0 && cycleBofaDate >= cycleStartDate && cycleBofaDate <= cycleEndDate && !wasBofaInFirst) {
        bofaPaymentAmount = cycle.bofaPayment;
      }
      if (cycle.chasePayment > 0 && cycleChaseDate >= cycleStartDate && cycleChaseDate <= cycleEndDate && !wasChaseInFirst) {
        chasePaymentAmount = cycle.chasePayment;
      }
      if (cycle.bofa2Payment > 0 && cycleBofa2Date >= cycleStartDate && cycleBofa2Date <= cycleEndDate && !wasBofa2InFirst) {
        bofa2PaymentAmount = cycle.bofa2Payment;
        console.log(`✅ Applying BofA2 payment: ${bofa2PaymentAmount} on ${cycleBofa2Date.toDateString()}`);
      } else if (cycle.bofa2Payment > 0) {
        console.log(`❌ NOT applying BofA2 payment:`, {
          inRange: cycleBofa2Date >= cycleStartDate && cycleBofa2Date <= cycleEndDate,
          wasInFirst: wasBofa2InFirst,
          payment: cycle.bofa2Payment
        });
      }
      
      const cycleRules: ProjectionRules = {
        checkingBalance: currentEndingBalances.checking,
        bofaBalance: currentEndingBalances.bofa,
        bofa2Balance: currentEndingBalances.bofa2,
        chaseBalance: currentEndingBalances.chase,
        // No pending charges for future cycles - they've already been posted
        pendingBofA: 0,
        pendingBofA2: 0,
        pendingChase: 0,
        bofaStatement: projectionRules.bofaStatement,
        bofa2Statement: projectionRules.bofa2Statement,
        chaseStatement: projectionRules.chaseStatement,
        paycheckAmount: projectionRules.paycheckAmount,
        rent: projectionRules.rent,
        weeklySpending: projectionRules.weeklySpending,
        bofaPaymentAmount: bofaPaymentAmount,
        bofa2PaymentAmount: bofa2PaymentAmount,
        chasePaymentAmount: chasePaymentAmount,
        rentDay: projectionRules.rentDay,
        bofaPaymentDay: projectionRules.bofaPaymentDay,
        bofa2PaymentDay: projectionRules.bofa2PaymentDay,
        chasePaymentDay: projectionRules.chasePaymentDay,
        payDayReference: projectionRules.payDayReference,
        startDate: cycleStartDate
      };
      
      console.log(`🔢 Cycle ${cycleIndex + 1} starting balances:`, {
        bofa2: currentEndingBalances.bofa2,
        payment: bofa2PaymentAmount,
        weeklySpending: projectionRules.weeklySpending
      });
      
      const cycleRows = generateProjection(cycleRules, 1);
      
      // Find the row with the payment to verify math
      const paymentRow = cycleRows.find(row => row.bofa2Payment > 0);
      if (paymentRow) {
        console.log(`💳 Payment row (${paymentRow.date}):`, {
          beforePayment: paymentRow.bofa2 + paymentRow.bofa2Payment,
          payment: paymentRow.bofa2Payment,
          afterPayment: paymentRow.bofa2
        });
      }
      
      // Find last row to see ending balance
      const lastCycleRow = cycleRows[cycleRows.length - 1];
      if (lastCycleRow) {
        const totalSpending = cycleRows.reduce((sum, row) => sum + (row.spending || 0), 0);
        console.log(`📊 Cycle ${cycleIndex + 1} ending:`, {
          starting: currentEndingBalances.bofa2,
          totalSpending,
          payment: bofa2PaymentAmount,
          expected: currentEndingBalances.bofa2 + totalSpending - bofa2PaymentAmount,
          actual: lastCycleRow.bofa2
        });
      }
      
      allRows = allRows.concat(cycleRows);
      currentEndingBalances = cycleRows.length > 0 ? cycleRows[cycleRows.length - 1] : currentEndingBalances;
    });
    
    // Convert projection format to CashFlowRow format
    const convertedRows: CashFlowRow[] = allRows.map(row => ({
      date: row.date,
      paycheck: row.paycheck,
      spending: row.spending,
      rent: row.rent,
      bofaPayment: row.bofaPayment,
      bofa2Payment: row.bofa2Payment,
      chasePayment: row.chasePayment,
      checking: row.checking,
      bofa: row.bofa,
      chase: row.chase,
      bofa2: row.bofa2,
      notes: row.notes,
      chaseStatement: 0,
      total: 0,
      bofaBalance: row.bofa,
      bofaBalance2: row.bofa2,
      checkingBalance: row.checking,
      totalBalance: row.checking - row.bofa - row.bofa2 - row.chase,
      cash: 0
    }));
    
    setProjectedRows(convertedRows);
    console.log('✅ Generated', convertedRows.length, 'projected rows');
  }, [projectionRules, projectionCycles]);

  const handleRulesChange = (rules: any) => {
    console.log('📝 Rules changed:', rules);
    setProjectionRules(prev => ({
      ...prev,
      ...rules
    }));
  };

  const handleProjectionCyclesChange = (cycles: any[]) => {
    console.log('📊 Projection cycles changed:', cycles);
    setProjectionCycles(cycles);
  };

  // Extract upcoming payments from projected rows - just show what's in the table for next month
  const upcomingPayments = projectedRows
    .filter(row => {
      if (!row.date) return false;
      const rowDate = new Date(row.date);
      const today = new Date();
      const oneMonthLater = new Date(today);
      oneMonthLater.setMonth(today.getMonth() + 1);
      return rowDate >= today && rowDate <= oneMonthLater;
    })
    .flatMap(row => {
      const payments = [];
      if (row.paycheck > 0) payments.push({ date: row.date, type: 'Paycheck', amount: row.paycheck });
      if (row.spending > 0) payments.push({ date: row.date, type: 'Spending', amount: row.spending });
      if (row.rent > 0) payments.push({ date: row.date, type: 'Rent', amount: row.rent });
      if (row.bofaPayment > 0) payments.push({ date: row.date, type: 'BofA Payment', amount: row.bofaPayment });
      if (row.bofa2Payment > 0) payments.push({ date: row.date, type: 'BofA 2 Payment', amount: row.bofa2Payment });
      if (row.chasePayment > 0) payments.push({ date: row.date, type: 'Chase Payment', amount: row.chasePayment });
      return payments;
    });

  return (
    <div className="dashboard">
      <AccountSummary data={data} tableProjectedRows={projectedRows} onRulesChange={handleRulesChange} onProjectionCyclesChange={handleProjectionCyclesChange} />
      
      {/* Charts */}
      <div className="charts-section-compact">
        <div 
          className="chart-container-small"
          onClick={() => isMobile && setShowFullChart(true)}
          style={{ cursor: isMobile ? 'pointer' : 'default' }}
        >
          <h2>Account Balances Over Time (PROJECTED)</h2>
          <div className="chart-wrapper">
            <BalanceChart rows={projectedRows} defaultZoom={isMobile ? 3 : 1} />
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h2>Upcoming Payments & Income</h2>
          <UpcomingPayments payments={upcomingPayments} />
        </div>
      </div>
      
      {/* Table */}
      <div className="transactions-section">
        <h2>Cash Flow Projection (LIVE)</h2>
        <CashFlowTable rows={projectedRows} />
        
        {/* Project Further Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '24px',
          marginTop: '16px'
        }}>
          <button
            onClick={() => {
              // Get the last ending balance from current projections
              if (projectedRows.length > 0) {
                const lastRow = projectedRows[projectedRows.length - 1];
                const startDate = new Date(lastRow.date || new Date());
                startDate.setDate(startDate.getDate() + 1);
                
                const minPaymentRules: ProjectionRules = {
                  ...projectionRules,
                  checkingBalance: lastRow.checkingBalance,
                  bofaBalance: lastRow.bofaBalance,
                  bofa2Balance: lastRow.bofaBalance2,
                  chaseBalance: lastRow.cash || 0,
                  startDate
                };
                
                const minPaymentRows = generateMinimumPaymentProjection(minPaymentRules, 12);
                const convertedMinPaymentRows = minPaymentRows.map(row => ({
                  date: row.date,
                  paycheck: row.paycheck,
                  spending: row.spending,
                  rent: row.rent,
                  bofaPayment: row.bofaPayment,
                  bofa2Payment: row.bofa2Payment,
                  chasePayment: row.chasePayment,
                  checking: row.checking,
                  bofa: row.bofa,
                  chase: row.chase,
                  bofa2: row.bofa2,
                  notes: row.notes,
                  chaseStatement: 0,
                  total: 0,
                  bofaBalance: row.bofa,
                  bofaBalance2: row.bofa2,
                  checkingBalance: row.checking,
                  totalBalance: row.checking - row.bofa - row.bofa2 - row.chase,
                  cash: 0
                }));
                
                setProjectedRows([...projectedRows, ...convertedMinPaymentRows]);
              }
            }}
            style={{
              padding: '12px 32px',
              background: 'rgba(138, 43, 226, 0.2)',
              border: '2px solid rgba(138, 43, 226, 0.5)',
              color: '#00ff88',
              cursor: 'pointer',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(138, 43, 226, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            💰 Minimum Payments (Till Negative)
          </button>
        </div>
      </div>

      {/* Fullscreen Chart Modal - Mobile Only */}
      {showFullChart && (
        <div 
          className="chart-fullscreen-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px',
            overflow: 'hidden'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1
          }}>
            <h2 style={{ 
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              margin: 0
            }}>
              Account Balances
            </h2>
            <button
              onClick={() => setShowFullChart(false)}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 69, 58, 0.2)',
                border: '1px solid rgba(255, 69, 58, 0.5)',
                color: '#ff453a',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600'
              }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ 
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1
          }}>
            <div style={{ height: '100%', width: '100%' }}>
              <BalanceChart rows={projectedRows} defaultZoom={1} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
