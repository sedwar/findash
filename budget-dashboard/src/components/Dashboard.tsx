import { useState, useEffect } from 'react';
import type { FinancialData, CashFlowRow } from '../types';
import type { ProjectionRules } from '../utils/projectionEngine';
import AccountSummary from './AccountSummary';
import BalanceChart from './BalanceChart';
import UpcomingPayments from './UpcomingPayments';
import CashFlowTable from './CashFlowTable';
import { generateProjection } from '../utils/projectionEngine';
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

  const [projectionRules, setProjectionRules] = useState<ProjectionRules>({
    checkingBalance: data.summary.currentChecking,
    bofaBalance: data.summary.bofaStatement,
    bofa2Balance: data.summary.bofa2Statement,
    chaseBalance: data.summary.chaseStatement,
    bofaStatement: data.summary.bofaStatement,
    bofa2Statement: data.summary.bofa2Statement,
    chaseStatement: data.summary.chaseStatement,
    paycheckAmount: 3500,
    rent: 1760,
    weeklySpending: 200,
    rentDay: 23,
    paymentDay: 4, // Default to 4th of month (user said around 3rd)
    payDayReference: new Date('2025-11-20')
  });

  const [projectedRows, setProjectedRows] = useState<CashFlowRow[]>(data.rows);

  // Recalculate projections whenever rules change
  useEffect(() => {
    console.log('🔄 RECALCULATING PROJECTIONS with rules:', projectionRules);
    const newProjections = generateProjection(projectionRules, projectionMonths);
    
    // Convert projection format to CashFlowRow format
    const convertedRows: CashFlowRow[] = newProjections.map(row => ({
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
  }, [projectionRules, projectionMonths]);

  const handleRulesChange = (rules: any) => {
    console.log('📝 Rules changed:', rules);
    setProjectionRules(prev => ({
      ...prev,
      ...rules
    }));
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
      <AccountSummary data={data} onRulesChange={handleRulesChange} />
      
      {/* Charts */}
      <div className="charts-section-compact">
        <div 
          className="chart-container-small"
          onClick={() => setShowFullChart(true)}
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
            onClick={() => setProjectionMonths(prev => prev + 6)}
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
            📊 Project +6 Months Further
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
