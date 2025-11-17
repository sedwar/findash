import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import type { CashFlowRow } from '../types';

interface BalanceChartProps {
  rows: CashFlowRow[];
  defaultZoom?: number;
}

function BalanceChart({ rows, defaultZoom = 1 }: BalanceChartProps) {
  const [zoomLevel, setZoomLevel] = useState(defaultZoom);
  const [startIndex, setStartIndex] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Prepare data for the chart - only show rows with dates and balances
  const allChartData = rows
    .filter(row => row.date && (row.checkingBalance !== 0 || row.bofaBalance !== 0 || row.chase !== 0))
    .map(row => {
      // Determine event type for this date (priority order)
      let eventType = '';
      if (row.bofaPayment > 0 || row.bofa2Payment > 0 || row.chasePayment > 0) eventType = '💳';
      if (row.rent > 0) eventType = '🏠';
      if (row.spending > 0 && !eventType) eventType = '🛒';
      if (row.paycheck > 0) eventType = '💵';
      
      return {
        date: formatDate(row.date),
        Checking: row.checkingBalance,
        BofA: row.bofaBalance,
        'BofA 2': row.bofaBalance2,
        Chase: row.chase,
        event: eventType,
        fullRow: row
      };
    });

  // Apply zoom filtering
  const visibleDataPoints = Math.ceil(allChartData.length / zoomLevel);
  const chartData = allChartData.slice(startIndex, startIndex + visibleDataPoints);
  const maxStartIndex = Math.max(0, allChartData.length - visibleDataPoints);

  // Zoom and pan functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(6, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(1, prev - 0.5));
  };

  const handlePanLeft = () => {
    setStartIndex(prev => Math.max(0, prev - Math.floor(visibleDataPoints * 0.2)));
  };

  const handlePanRight = () => {
    setStartIndex(prev => Math.min(maxStartIndex, prev + Math.floor(visibleDataPoints * 0.2)));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setStartIndex(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePanLeft();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePanRight();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleDataPoints, maxStartIndex]);

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Custom dot renderer to show event markers
  const renderEventDot = (props: any, emoji: string, strokeColor: string = '#00ff88') => {
    const { cx, cy } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={12} fill="rgba(0, 0, 0, 0.8)" stroke={strokeColor} strokeWidth={2} />
        <text 
          x={cx} 
          y={cy + 5} 
          textAnchor="middle" 
          fontSize="16"
          style={{ pointerEvents: 'none' }}
        >
          {emoji}
        </text>
      </g>
    );
  };

  return (
    <div 
      style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Controls Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px', 
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '12px',
        background: 'rgba(138, 43, 226, 0.08)',
        borderRadius: '12px',
        border: '1px solid rgba(138, 43, 226, 0.2)'
      }}>
        <button
          onClick={handlePanLeft}
          style={{
            padding: '8px 16px',
            background: 'rgba(100, 200, 255, 0.2)',
            border: '1px solid rgba(100, 200, 255, 0.5)',
            color: '#64d2ff',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 200, 255, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(100, 200, 255, 0.2)'}
        >
          ← Pan Left
        </button>

        <button
          onClick={handleZoomOut}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 159, 10, 0.2)',
            border: '1px solid rgba(255, 159, 10, 0.5)',
            color: '#ffb84d',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 159, 10, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 159, 10, 0.2)'}
        >
          🔍 Zoom Out
        </button>

        <div style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          padding: '8px 16px', 
          fontSize: '13px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontWeight: '600',
          minWidth: '110px',
          textAlign: 'center'
        }}>
          📊 {zoomLevel.toFixed(1)}x
        </div>

        <button
          onClick={handleZoomIn}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 159, 10, 0.2)',
            border: '1px solid rgba(255, 159, 10, 0.5)',
            color: '#ffb84d',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 159, 10, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 159, 10, 0.2)'}
        >
          🔍 Zoom In
        </button>

        <button
          onClick={handlePanRight}
          style={{
            padding: '8px 16px',
            background: 'rgba(100, 200, 255, 0.2)',
            border: '1px solid rgba(100, 200, 255, 0.5)',
            color: '#64d2ff',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 200, 255, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(100, 200, 255, 0.2)'}
        >
          Pan Right →
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 255, 136, 0.15)',
            border: '1px solid rgba(0, 255, 136, 0.4)',
            color: '#00ff88',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 255, 136, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)'}
        >
          🔄 Reset
        </button>
      </div>

      <div style={{ 
        fontSize: '11px', 
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        marginBottom: '8px'
      }}>
        ⌨️ Keyboard: Arrow Keys (← →) pan • +/- zoom • R reset | Use buttons or keyboard!
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} style={{ flex: 1, width: '100%', minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="rgba(255, 255, 255, 0.3)"
            style={{ fontSize: '0.7rem', fontFamily: 'Inter', fill: 'rgba(255, 255, 255, 0.5)' }}
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            stroke="rgba(255, 255, 255, 0.3)"
            style={{ fontSize: '0.7rem', fontFamily: 'Inter', fill: 'rgba(255, 255, 255, 0.5)' }}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: 'rgba(0, 0, 0, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.8rem'
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0] && payload[0].payload) {
                const event = payload[0].payload.event;
                const row = payload[0].payload.fullRow;
                let eventText = '';
                
                if (row.paycheck > 0) eventText = `💵 Paycheck: ${formatCurrency(row.paycheck)}`;
                if (row.spending > 0) eventText += (eventText ? ' | ' : '') + `🛒 Spending: ${formatCurrency(row.spending)}`;
                if (row.rent > 0) eventText += (eventText ? ' | ' : '') + `🏠 Rent: ${formatCurrency(row.rent)}`;
                if (row.bofaPayment > 0 || row.bofa2Payment > 0 || row.chasePayment > 0) {
                  const payments = [];
                  if (row.bofaPayment > 0) payments.push(`BofA: ${formatCurrency(row.bofaPayment)}`);
                  if (row.bofa2Payment > 0) payments.push(`BofA2: ${formatCurrency(row.bofa2Payment)}`);
                  if (row.chasePayment > 0) payments.push(`Chase: ${formatCurrency(row.chasePayment)}`);
                  eventText += (eventText ? ' | ' : '') + `💳 ${payments.join(', ')}`;
                }
                
                return `${label}${eventText ? ' - ' + eventText : ''}`;
              }
              return label;
            }}
          />
          <Legend 
            wrapperStyle={{ 
              fontFamily: 'Inter', 
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="Checking" 
            stroke="#00ff88" 
            strokeWidth={3} 
            dot={(props) => {
              const { payload } = props;
              const row = payload.fullRow;
              
              // Determine which emoji to show on Checking line (priority order)
              let emoji = '';
              if (row?.paycheck > 0) emoji = '💵';
              else if (row?.rent > 0) emoji = '🏠';
              else if (row?.bofaPayment > 0 || row?.bofa2Payment > 0 || row?.chasePayment > 0) emoji = '💳';
              
              if (emoji) {
                return renderEventDot(props, emoji, '#00ff88');
              }
              return null;
            }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="BofA" 
            stroke="#ff453a" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="BofA 2" 
            stroke="#ff6b9d" 
            strokeWidth={2} 
            dot={(props) => {
              const { payload } = props;
              // Show spending ONLY on BofA 2 line
              if (payload.fullRow?.spending > 0) {
                return renderEventDot(props, '🛒', '#ff6b9d');
              }
              return null;
            }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="Chase" 
            stroke="#ff9f0a" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BalanceChart;

