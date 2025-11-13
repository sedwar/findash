import { useState, useEffect } from 'react';
import type { FinancialData } from '../types';
import EditableWidget from './EditableWidget';
import './AccountSummary.css';

interface AccountSummaryProps {
  data: FinancialData;
  onRulesChange?: (rules: any) => void;
}

function AccountSummary({ data, onRulesChange }: AccountSummaryProps) {
  // ACTUAL CURRENT BALANCES (what you have RIGHT NOW)
  const [checking, setChecking] = useState(data.summary.currentChecking);
  const [bofa, setBofa] = useState(data.summary.currentBofA);
  const [bofa2, setBofa2] = useState(data.summary.currentBofA2);
  const [chase, setChase] = useState(data.summary.currentChase);
  
  // STATEMENT BALANCES (what the cards will be after pending charges hit)
  const [bofaStatement, setBofaStatement] = useState(data.summary.bofaStatement);
  const [bofa2Statement, setBofa2Statement] = useState(data.summary.bofa2Statement);
  const [chaseStatement, setChaseStatement] = useState(data.summary.chaseStatement);
  
  // PENDING CHARGES (editable)
  const [pendingBofA, setPendingBofA] = useState(data.summary.pendingBofACharges);
  const [pendingBofA2, setPendingBofA2] = useState(data.summary.pendingBofA2Charges);
  const [pendingChase, setPendingChase] = useState(data.summary.pendingChaseCharges);
  
  // YOUR RULES (how money flows)
  const [paycheckAmount, setPaycheckAmount] = useState(3500);
  const [rent, setRent] = useState(1760);
  const [weeklySpending, setWeeklySpending] = useState(200);
  
  // PAYMENT STRATEGY (how much to pay on cards each payday)
  const [bofaPayment, setBofaPayment] = useState(1000);
  const [bofa2Payment, setBofa2Payment] = useState(4000);
  const [chasePayment, setChasePayment] = useState(0);

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

  // Notify parent when rules change
  const handleRuleChange = () => {
    if (onRulesChange) {
      onRulesChange({
        checkingBalance: checking,
        // Current balance = Statement + Pending
        bofaBalance: bofaStatement + pendingBofA,
        bofa2Balance: bofa2Statement + pendingBofA2,
        chaseBalance: chaseStatement + pendingChase,
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
  }, [checking, bofa, bofa2, chase, bofaStatement, bofa2Statement, chaseStatement, paycheckAmount, rent, weeklySpending, bofaPayment, bofa2Payment, chasePayment, pendingBofA, pendingBofA2, pendingChase]);

  return (
    <div className="account-summary-new">
      <div className="summary-header">
        <div>
          <h2>TODAY</h2>
          <p className="date-display">{today}</p>
        </div>
        <div className="next-paycheck-badge">
          Next paycheck in <strong>{daysToPaycheck}</strong> days
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
          value={bofaStatement}
          onSave={setBofaStatement}
          color="#ff453a"
          pending={pendingBofA > 0 ? pendingBofA : undefined}
          onPendingEdit={setPendingBofA}
          sublabel="0% APR"
          showNoPending={pendingBofA === 0}
        />

        <EditableWidget
          label="BofA 2"
          value={bofa2Statement}
          onSave={setBofa2Statement}
          color="#ff6b9d"
          pending={pendingBofA2 > 0 ? pendingBofA2 : undefined}
          onPendingEdit={setPendingBofA2}
          sublabel="0% APR"
          showNoPending={pendingBofA2 === 0}
        />

        <EditableWidget
          label="Chase"
          value={chaseStatement}
          onSave={setChaseStatement}
          color="#ff3b30"
          pending={pendingChase > 0 ? pendingChase : undefined}
          onPendingEdit={setPendingChase}
          sublabel="⚠️ ACCRUING INTEREST"
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
          />
          <EditableWidget
            label="💳 Pay BofA 2"
            value={bofa2Payment}
            onSave={setBofa2Payment}
            color="#ff6b9d"
            size="small"
          />
          <EditableWidget
            label="💳 Pay Chase"
            value={chasePayment}
            onSave={setChasePayment}
            color="#ff9f0a"
            size="small"
          />
        </div>
        
        <h3 style={{ marginTop: '32px' }}>NEXT STATEMENT PROJECTIONS</h3>
        <div className="strategy-grid">
          <EditableWidget
            label="BofA Next Statement"
            value={data.summary.bofaNextStatement || 0}
            onSave={() => {}}
            color="#ff453a"
            size="small"
          />
          <EditableWidget
            label="BofA 2 Next Statement"
            value={data.summary.bofa2NextStatement || 0}
            onSave={() => {}}
            color="#ff6b9d"
            size="small"
          />
          <EditableWidget
            label="Chase Next Statement"
            value={data.summary.chaseNextStatement || 0}
            onSave={() => {}}
            color="#ff9f0a"
            size="small"
          />
        </div>
        
        <div className="debt-summary">
          <div className="debt-title">💳 Total CC Debt (Current)</div>
          <div className="debt-value">${((bofa + bofa2 + chase) / 1000).toFixed(1)}k</div>
        </div>
      </div>
    </div>
  );
}

export default AccountSummary;
