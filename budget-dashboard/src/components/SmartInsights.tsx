import type { FinancialData } from '../types';
import './SmartInsights.css';

interface SmartInsightsProps {
  data: FinancialData;
}

function SmartInsights({ data }: SmartInsightsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate total credit card debt
  const totalCreditCardDebt = data.summary.currentBofA + data.summary.currentBofA2 + data.summary.currentChase;
  
  // Find next paycheck
  const today = new Date();
  const nextPaycheck = data.upcomingPayments.find(p => 
    p.type.toLowerCase().includes('paycheck') && new Date(p.date) >= today
  );

  // Days until next paycheck
  const daysUntilPaycheck = nextPaycheck ? 
    Math.ceil((new Date(nextPaycheck.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // End of March balance (last row)
  const endBalance = data.summary.projectedBalance;
  const balanceStatus = endBalance >= 5000 ? 'excellent' : endBalance >= 2000 ? 'good' : endBalance >= 0 ? 'warning' : 'critical';

  // Monthly costs
  const monthlyRent = 1760;
  const weeklySpending = 200;
  const monthlySpending = weeklySpending * 4.33;
  const monthlyCosts = monthlyRent + monthlySpending;

  return (
    <div className="smart-insights">
      <div className="insight-header">
        <h2>QUICK STATS</h2>
        <div className="status-indicator">
          <span className={`status-dot ${balanceStatus}`}></span>
          <span className="status-text">{balanceStatus.toUpperCase()}</span>
        </div>
      </div>

      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-label">TOTAL CC DEBT</div>
          <div className="insight-value critical">{formatCurrency(totalCreditCardDebt)}</div>
          <div className="insight-sublabel">Across 3 cards</div>
        </div>

        <div className="insight-card">
          <div className="insight-label">NEXT PAYCHECK</div>
          <div className="insight-value">
            {daysUntilPaycheck !== null ? `${daysUntilPaycheck} days` : 'N/A'}
          </div>
          <div className="insight-sublabel">
            {nextPaycheck ? formatCurrency(nextPaycheck.amount) : 'No upcoming'}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-label">END BALANCE (MAR 26)</div>
          <div className={`insight-value ${balanceStatus}`}>
            {formatCurrency(endBalance)}
          </div>
          <div className="insight-sublabel">If you follow the plan</div>
        </div>

        <div className="insight-card">
          <div className="insight-label">MONTHLY COSTS</div>
          <div className="insight-value warning">{formatCurrency(monthlyCosts)}</div>
          <div className="insight-sublabel">
            ${monthlyRent} rent + ${Math.round(monthlySpending)}/mo spending
          </div>
        </div>
      </div>

      {endBalance < 0 && (
        <div className="alert alert-critical">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <div className="alert-title">HEADS UP</div>
            <div className="alert-message">
              Your plan shows you'll be negative by March 26. Consider paying less on credit cards or reducing spending.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartInsights;
