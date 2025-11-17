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
    paymentDay: 4, // Default to 4th of month (user said around 3rd)
    payDayReference: new Date('2025-11-20')
  });

  const [projectedRows, setProjectedRows] = useState<CashFlowRow[]>(data.rows);

  // Recalculate projections whenever rules or cycles change
  useEffect(() => {
    console.log('🔄 RECALCULATING PROJECTIONS with rules:', projectionRules, 'cycles:', projectionCycles);
    let allRows: any[] = [];
    
    // Generate first month with base rules
    const firstMonthRules = { ...projectionRules };
    const firstMonthRows = generateProjection(firstMonthRules, 1);
    allRows = allRows.concat(firstMonthRows);
    
    // Get the last row of previous month to use as starting point for next month
    let currentEndingBalances = firstMonthRows.length > 0 ? firstMonthRows[firstMonthRows.length - 1] : null;
    
    // Generate subsequent months based on projection cycles
    projectionCycles.forEach((cycle, cycleIndex) => {
      if (currentEndingBalances) {
        // Calculate the start date for this cycle (one day after the previous cycle ended)
        const cycleStartDate = new Date(currentEndingBalances.date || new Date());
        cycleStartDate.setHours(0, 0, 0, 0);
        // Move to the next day after previous projection ended
        cycleStartDate.setDate(cycleStartDate.getDate() + 1);
        
        const cycleRules: ProjectionRules = {
          checkingBalance: currentEndingBalances.checking,
          bofaBalance: currentEndingBalances.bofa,
          bofa2Balance: currentEndingBalances.bofa2,
          chaseBalance: currentEndingBalances.chase,
          bofaStatement: projectionRules.bofaStatement,
          bofa2Statement: projectionRules.bofa2Statement,
          chaseStatement: projectionRules.chaseStatement,
          paycheckAmount: projectionRules.paycheckAmount,
          rent: projectionRules.rent,
          weeklySpending: projectionRules.weeklySpending,
          bofaPaymentAmount: cycle.bofaPayment,
          bofa2PaymentAmount: cycle.bofa2Payment,
          chasePaymentAmount: cycle.chasePayment,
          rentDay: projectionRules.rentDay,
          paymentDay: projectionRules.paymentDay,
          payDayReference: projectionRules.payDayReference,
          startDate: cycleStartDate
        };
        const cycleRows = generateProjection(cycleRules, 1);
        allRows = allRows.concat(cycleRows);
        
        currentEndingBalances = cycleRows.length > 0 ? cycleRows[cycleRows.length - 1] : currentEndingBalances;
      }
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
      <AccountSummary data={data} onRulesChange={handleRulesChange} onProjectionCyclesChange={handleProjectionCyclesChange} />
      
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
