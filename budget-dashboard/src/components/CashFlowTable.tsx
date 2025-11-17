import { useState } from 'react';
import type { CashFlowRow } from '../types';
import './CashFlowTable.css';

interface CashFlowTableProps {
  rows: CashFlowRow[];
}

function CashFlowTable({ rows }: CashFlowTableProps) {
  const [showAll, setShowAll] = useState(false);
  
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(date);
    }
  };

  const displayRows = showAll ? rows : rows.slice(0, 15);
  const today = new Date();

  const isUpcoming = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date >= today;
    } catch {
      return false;
    }
  };

  const isToday = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const todayStr = today.toDateString();
      return date.toDateString() === todayStr;
    } catch {
      return false;
    }
  };

  return (
    <div className="cashflow-table-container">
      <div className="table-wrapper">
        <table className="cashflow-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Paycheck</th>
              <th>Spending</th>
              <th>Rent</th>
              <th>BofA Pay</th>
              <th>BofA 2 Pay</th>
              <th>Chase Pay</th>
              <th>Checking</th>
              <th>BofA</th>
              <th>BofA 2</th>
              <th>Chase</th>
              <th>Notes</th>
              <th className="balance-col">Total Balance</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => {
              const rowClass = isToday(row.date) ? 'today-row' : (isUpcoming(row.date) ? 'upcoming-row' : '');
              return (
              <tr key={index} className={rowClass}>
                <td className="date-cell">{formatDate(row.date)}</td>
                <td className="income">{formatCurrency(row.paycheck)}</td>
                <td className="expense">{formatCurrency(row.spending)}</td>
                <td className="expense">{formatCurrency(row.rent)}</td>
                <td className="expense highlighted">{formatCurrency(row.bofaPayment)}</td>
                <td className="expense highlighted">{formatCurrency(row.bofa2Payment)}</td>
                <td className="expense highlighted">{formatCurrency(row.chasePayment)}</td>
                <td className={row.checking < 0 ? 'negative' : ''}>{formatCurrency(row.checking)}</td>
                <td>{formatCurrency(row.bofa)}</td>
                <td>{formatCurrency(row.bofa2)}</td>
                <td>{formatCurrency(row.chase)}</td>
                <td className="notes-cell">{row.notes}</td>
                <td className={`balance-col ${row.totalBalance >= 0 ? 'positive' : 'negative'}`}>
                  <strong>{formatCurrency(row.totalBalance)}</strong>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      
      {rows.length > 15 && (
        <button className="toggle-button" onClick={() => setShowAll(!showAll)}>
          {showAll ? '▲ Show Less' : `▼ Show All (${rows.length} rows)`}
        </button>
      )}
    </div>
  );
}

export default CashFlowTable;

