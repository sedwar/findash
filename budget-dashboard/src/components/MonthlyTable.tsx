import type { MonthlySnapshot } from '../types';

interface Props {
  rows: MonthlySnapshot[];
}

const $ = (n: number, showDash = true) => {
  if (showDash && n === 0) return <span className="zero">—</span>;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export default function MonthlyTable({ rows }: Props) {
  return (
    <div className="table-wrap">
      <div className="table-header-row">
        <h2 className="section-title">Month-Over-Month Projection</h2>
      </div>
      <div className="table-scroll">
        <table className="monthly-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="income-col">Paychecks</th>
              <th className="expense-col">Spending</th>
              <th className="expense-col">Rent</th>
              <th className="payment-col">BofA Pmt</th>
              <th className="payment-col">Chase Pmt</th>
              <th className="payment-col">BofA2 Pmt</th>
              <th className="checking-col">Checking</th>
              <th>BofA Bal</th>
              <th>Chase Bal</th>
              <th>BofA2 Bal</th>
              <th className="net-col">Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={row.isCurrentMonth ? 'current-month' : ''}>
                <td className="month-cell">
                  {row.label}
                  {row.isCurrentMonth && <span className="tag">now</span>}
                </td>
                <td className="income-col">
                  {row.paychecks > 0 ? (
                    <span className="income-val">
                      {$(row.paychecks, false)}
                      <span className="count"> ×{row.paycheckCount}</span>
                    </span>
                  ) : (
                    <span className="zero">—</span>
                  )}
                </td>
                <td className="expense-col">{$(row.spending)}</td>
                <td className="expense-col">{$(row.rent)}</td>
                <td className="payment-col">{$(row.bofaPayment)}</td>
                <td className="payment-col">{$(row.chasePayment)}</td>
                <td className="payment-col">{$(row.bofa2Payment)}</td>
                <td className={`checking-col ${row.checkingEnd < 0 ? 'neg-val' : 'pos-val'}`}>
                  <strong>{$(row.checkingEnd, false)}</strong>
                </td>
                <td className="debt-val">{$(row.bofaEnd, false)}</td>
                <td className="debt-val">{$(row.chaseEnd, false)}</td>
                <td className="debt-val">{$(row.bofa2End, false)}</td>
                <td className={`net-col ${row.netWorth >= 0 ? 'pos-val' : 'neg-val'}`}>
                  <strong>{$(row.netWorth, false)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
