import type { FinancialData } from '../types';
import './PendingCharges.css';

interface PendingChargesProps {
  data: FinancialData;
}

function PendingCharges({ data }: PendingChargesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const { summary } = data;
  const totalPending = summary.pendingChaseCharges + summary.pendingBofACharges + summary.pendingBofA2Charges;

  return (
    <div className="pending-charges">
      <div className="pending-header">
        <h2>⏳ PENDING CHARGES</h2>
        <div className="pending-total">
          <span className="pending-label">Total Pending:</span>
          <span className="pending-amount">{formatCurrency(totalPending)}</span>
        </div>
      </div>

      <div className="pending-grid">
        {summary.pendingChaseCharges > 0 && (
          <div className="pending-card chase">
            <div className="pending-card-header">
              <span className="pending-card-icon">💳</span>
              <span className="pending-card-title">Chase</span>
            </div>
            <div className="pending-card-body">
              <div className="pending-row">
                <span className="pending-row-label">Statement:</span>
                <span className="pending-row-value">{formatCurrency(summary.chaseStatement)}</span>
              </div>
              <div className="pending-row">
                <span className="pending-row-label">Current:</span>
                <span className="pending-row-value">{formatCurrency(summary.currentChase)}</span>
              </div>
              <div className="pending-row pending-highlight">
                <span className="pending-row-label">Pending:</span>
                <span className="pending-row-value warning">{formatCurrency(summary.pendingChaseCharges)}</span>
              </div>
            </div>
          </div>
        )}

        {summary.pendingBofACharges > 0 && (
          <div className="pending-card bofa">
            <div className="pending-card-header">
              <span className="pending-card-icon">💳</span>
              <span className="pending-card-title">Bank of America</span>
            </div>
            <div className="pending-card-body">
              <div className="pending-row">
                <span className="pending-row-label">Statement:</span>
                <span className="pending-row-value">{formatCurrency(summary.bofaStatement)}</span>
              </div>
              <div className="pending-row">
                <span className="pending-row-label">Current:</span>
                <span className="pending-row-value">{formatCurrency(summary.currentBofA)}</span>
              </div>
              <div className="pending-row pending-highlight">
                <span className="pending-row-label">Pending:</span>
                <span className="pending-row-value warning">{formatCurrency(summary.pendingBofACharges)}</span>
              </div>
            </div>
          </div>
        )}

        {summary.pendingBofA2Charges > 0 && (
          <div className="pending-card bofa2">
            <div className="pending-card-header">
              <span className="pending-card-icon">💳</span>
              <span className="pending-card-title">Bank of America 2</span>
            </div>
            <div className="pending-card-body">
              <div className="pending-row">
                <span className="pending-row-label">Statement:</span>
                <span className="pending-row-value">{formatCurrency(summary.bofa2Statement)}</span>
              </div>
              <div className="pending-row">
                <span className="pending-row-label">Current:</span>
                <span className="pending-row-value">{formatCurrency(summary.currentBofA2)}</span>
              </div>
              <div className="pending-row pending-highlight">
                <span className="pending-row-label">Pending:</span>
                <span className="pending-row-value warning">{formatCurrency(summary.pendingBofA2Charges)}</span>
              </div>
            </div>
          </div>
        )}

        {totalPending === 0 && (
          <div className="no-pending">
            <span className="no-pending-icon">✅</span>
            <span className="no-pending-text">No pending charges - all transactions have cleared!</span>
          </div>
        )}
      </div>

      <div className="pending-info">
        <div className="info-icon">💡</div>
        <div className="info-text">
          <strong>Pending charges</strong> are transactions that haven't hit your statement yet. 
          Your actual available balance is lower than what's showing on your cards.
        </div>
      </div>
    </div>
  );
}

export default PendingCharges;


