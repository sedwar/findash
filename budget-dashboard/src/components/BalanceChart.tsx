import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DailyRow } from '../utils/projection';

interface Props {
  rows: DailyRow[];
}

type ViewMode = 'all' | 'month';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BalanceChart({ rows }: Props) {
  // Collect unique months from the data
  const months = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.monthKey)) {
        seen.add(r.monthKey);
        out.push(r.monthKey);
      }
    }
    return out;
  }, [rows]);

  const [view, setView] = useState<ViewMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(months[0] ?? '');

  // Make sure selectedMonth is valid
  const currentMonth = months.includes(selectedMonth) ? selectedMonth : (months[0] ?? '');

  const allData = useMemo(() => rows.map(r => ({
    date: formatDate(r.date),
    Checking: r.checking,
    BofA: r.bofa,
    Chase: r.chase,
    BofA2: r.bofa2,
    row: r,
  })), [rows]);

  const data = view === 'all'
    ? allData
    : allData.filter(d => d.row.monthKey === currentMonth);

  function monthLabel(mk: string): string {
    const [y, m] = mk.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
  }

  const renderEventDot = (props: any, emoji: string, stroke: string) => {
    const { cx, cy } = props;
    if (cx == null || cy == null) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={11} fill="rgba(0,0,0,0.85)" stroke={stroke} strokeWidth={2} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" style={{ pointerEvents: 'none' }}>
          {emoji}
        </text>
      </g>
    );
  };

  return (
    <div className="chart-section">
      <h2 className="section-title">Balance Projection</h2>

      <div className="chart-controls">
        <button
          className={`chart-view-btn ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          All
        </button>
        {months.map(mk => (
          <button
            key={mk}
            className={`chart-view-btn ${view === 'month' && currentMonth === mk ? 'active' : ''}`}
            onClick={() => { setView('month'); setSelectedMonth(mk); }}
          >
            {monthLabel(mk)}
          </button>
        ))}
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={55}
              stroke="rgba(255,255,255,0.2)"
              style={{ fontSize: '0.65rem', fill: 'rgba(255,255,255,0.45)' }}
            />
            <YAxis
              tickFormatter={v => fmtCurrency(v)}
              stroke="rgba(255,255,255,0.2)"
              style={{ fontSize: '0.6rem', fill: 'rgba(255,255,255,0.45)' }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(0,0,0,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val: number) => fmtCurrency(val)}
              labelFormatter={(_label, payload) => {
                if (!payload?.[0]?.payload?.row) return _label;
                const r = payload[0].payload.row as DailyRow;
                const parts: string[] = [];
                if (r.paycheck > 0) parts.push(`Paycheck: ${fmtCurrency(r.paycheck)}`);
                if (r.spending > 0) parts.push(`Spending: ${fmtCurrency(r.spending)}`);
                if (r.rent > 0) parts.push(`Rent: ${fmtCurrency(r.rent)}`);
                if (r.bofaPayment > 0) parts.push(`BofA Pmt: ${fmtCurrency(r.bofaPayment)}`);
                if (r.chasePayment > 0) parts.push(`Chase Pmt: ${fmtCurrency(r.chasePayment)}`);
                if (r.bofa2Payment > 0) parts.push(`BofA2 Pmt: ${fmtCurrency(r.bofa2Payment)}`);
                return `${_label}${parts.length ? ' — ' + parts.join(' | ') : ''}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line
              type="monotone" dataKey="Checking" stroke="#00ff88" strokeWidth={3} activeDot={{ r: 6 }}
              dot={(props: any) => {
                const r = props.payload?.row;
                if (r?.paycheck > 0) return renderEventDot(props, '💵', '#00ff88');
                if (r?.rent > 0) return renderEventDot(props, '🏠', '#ff453a');
                if (r?.bofaPayment > 0 || r?.chasePayment > 0 || r?.bofa2Payment > 0) return renderEventDot(props, '💳', '#00d9ff');
                return null;
              }}
            />
            <Line type="monotone" dataKey="BofA" stroke="#ff453a" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Chase" stroke="#ff9f0a" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line
              type="monotone" dataKey="BofA2" stroke="#ff6b9d" strokeWidth={2} activeDot={{ r: 5 }}
              dot={(props: any) => {
                if (props.payload?.row?.spending > 0) return renderEventDot(props, '🛒', '#ff6b9d');
                return null;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
