import { useState, useMemo } from 'react';
import type { AppConfig } from '../types';
import type { DailyRow, DailyOverrides } from '../utils/projection';

export type PaidCycles = {
  bofa: Record<string, number>;
  chase: Record<string, number>;
  bofa2: Record<string, number>;
};

type CardKey = keyof PaidCycles;

interface Props {
  rows: DailyRow[];
  config: AppConfig;
  totalMonths: number;
  onSetMonths: (n: number) => void;
  overrides: DailyOverrides;
  onOverride: (dateKey: string, field: string, value: number) => void;
  onClearOverride: (dateKey: string, field?: string) => void;
  paidCycles: PaidCycles;
  onTogglePaid: (card: CardKey, monthKey: string, amount?: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ── Editable cell ───────────────────────────────────────────────────────

function EditableCell({
  value,
  dateKey,
  field,
  onOverride,
  className,
}: {
  value: number;
  dateKey: string;
  field: string;
  onOverride: (dateKey: string, field: string, value: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (editing) {
    return (
      <input
        className="cell-edit-input"
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = parseFloat(draft.replace(/[$,]/g, ''));
          if (!isNaN(n) && Math.round(n * 100) !== Math.round(value * 100)) {
            onOverride(dateKey, field, n);
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  if (value === 0) {
    return (
      <span
        className="zero editable-zero"
        onClick={() => { setDraft('0'); setEditing(true); }}
      >
        —
      </span>
    );
  }

  return (
    <span
      className={`editable-val ${className || ''}`}
      onClick={() => { setDraft(String(Math.round(value * 100) / 100)); setEditing(true); }}
    >
      {fmt(value)}
    </span>
  );
}

// ── Card with big payment input ─────────────────────────────────────────

function PaymentInput({
  payment,
  remainingAfter,
  color,
  field,
  onOverride,
}: {
  payment: { amount: number; dateKey: string; date: Date };
  remainingAfter: number;
  color: string;
  field: string;
  onOverride: (dateKey: string, field: string, value: number) => void;
}) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  function commit() {
    setFocused(false);
    const n = parseFloat(draft.replace(/[$,]/g, ''));
    if (!isNaN(n) && n !== payment.amount) {
      onOverride(payment.dateKey, field, n);
    }
  }

  const dateLabel = payment.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="mc-pay-row">
      <span className="mc-pay-date">{dateLabel}</span>
      <input
        className="mc-input"
        style={{ borderColor: focused ? color : undefined }}
        value={focused ? draft : fmt(payment.amount)}
        onFocus={() => { setDraft(String(Math.round(payment.amount * 100) / 100)); setFocused(true); }}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      <span className={`mc-pay-remaining ${remainingAfter <= 0 ? 'mc-pay-zero' : ''}`}>
        {remainingAfter <= 0 ? '$0' : fmt(remainingAfter)}
      </span>
    </div>
  );
}

interface CardData {
  balanceBefore: number;
  totalPaid: number;
  payments: { amount: number; dateKey: string; date: Date }[];
  balanceAfter: number;
  passed: boolean;
  dueeDateKey: string | null;
}

function CardWithInput({
  label, due, data, color, field, cardKey, statement, isPaid, paidAmount, monthKey, onOverride, onTogglePaid,
}: {
  label: string;
  due: number;
  data: CardData;
  color: string;
  field: string;
  cardKey: CardKey;
  statement: number;
  isPaid: boolean;
  paidAmount: number;
  monthKey: string;
  onOverride: (dateKey: string, field: string, value: number) => void;
  onTogglePaid: (card: CardKey, monthKey: string, amount?: number) => void;
}) {
  const [editingAmt, setEditingAmt] = useState(false);
  const [draft, setDraft] = useState('');

  function commitAmount() {
    setEditingAmt(false);
    const n = parseFloat(draft.replace(/[$,]/g, ''));
    if (!isNaN(n) && n >= 0) onTogglePaid(cardKey, monthKey, n);
  }

  // Explicitly marked paid — this cycle is closed.
  if (isPaid) {
    return (
      <div className="mc mc-done" style={{ borderColor: `${color}22` }}>
        <div className="mc-head">
          <span className="mc-name">{label}</span>
          <span className="mc-due">{due}th</span>
        </div>
        <div className="mc-history">
          <span className="mc-history-ok">
            ✓ Paid{' '}
            {editingAmt ? (
              <input
                className="mc-paid-amount-edit"
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitAmount}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <button
                className="mc-paid-amount-btn"
                onClick={() => { setDraft(String(Math.round(paidAmount * 100) / 100)); setEditingAmt(true); }}
              >
                {fmt(paidAmount)}
              </button>
            )}
          </span>
        </div>
        <div className="mc-next-hint">
          {paidAmount >= statement - 0.005
            ? 'Cycle cleared'
            : `${fmt(Math.max(0, statement - paidAmount))} rolls to next statement`}
        </div>
        <button className="mc-toggle-paid" onClick={() => onTogglePaid(cardKey, monthKey)}>
          Unmark
        </button>
      </div>
    );
  }

  // Past due date and not yet marked — surface that we don't know yet.
  if (data.passed) {
    return (
      <div className="mc mc-pending-confirm" style={{ borderColor: `${color}55` }}>
        <div className="mc-head">
          <span className="mc-name">{label}</span>
          <span className="mc-due">{due}th</span>
        </div>
        <div className="mc-confirm-prompt">Past due — did you pay?</div>
        <button
          className="mc-mark-paid"
          style={{ background: color }}
          onClick={() => onTogglePaid(cardKey, monthKey, statement)}
        >
          ✓ Mark paid {fmt(statement)}
        </button>
      </div>
    );
  }

  const remainder = data.balanceAfter;

  return (
    <div className={`mc ${remainder > 0 ? 'mc-partial' : ''}`} style={{ borderColor: `${color}33` }}>
      <div className="mc-head">
        <span className="mc-name">{label}</span>
        <span className="mc-due">{due}th</span>
      </div>
      <div className="mc-owed" style={{ color }}>
        {data.balanceBefore > 0 ? fmt(data.balanceBefore) : <span className="mc-paid-off">PAID OFF</span>}
      </div>

      <div className="mc-statement mc-stmt-line">
        <span className="mc-statement-label">Statement</span>
        <span className="mc-statement-value">{fmt(statement)}</span>
        {statement > 0 && data.balanceBefore > 0 && (
          <button
            className="mc-pay-stmt-btn"
            onClick={() => {
              const dk = data.dueeDateKey;
              if (dk) onOverride(dk, field, statement);
            }}
          >
            Pay Stmt
          </button>
        )}
      </div>

      {data.payments.length > 0 ? (
        <div className="mc-payments">
          {data.payments.map((p, i) => {
            const paidSoFar = data.payments.slice(0, i + 1).reduce((s, x) => s + x.amount, 0);
            const remainingAfter = Math.max(0, data.balanceBefore - paidSoFar);
            return (
              <PaymentInput key={i} payment={p} remainingAfter={remainingAfter} color={color} field={field} onOverride={onOverride} />
            );
          })}
          {data.payments.length > 1 && (
            <div className="mc-total-line">
              <span className="mc-total-label">Total</span>
              <span className="mc-total-value">{fmt(data.totalPaid)}</span>
            </div>
          )}
        </div>
      ) : data.dueeDateKey && !data.passed ? (
        <div className="mc-payments">
          <PaymentInput
            payment={{ amount: 0, dateKey: data.dueeDateKey, date: new Date(data.dueeDateKey + 'T00:00:00') }}
            remainingAfter={data.balanceBefore}
            color={color}
            field={field}
            onOverride={onOverride}
          />
        </div>
      ) : null}

      {remainder > 0 ? (
        <div className="mc-remainder">{fmt(remainder)} remaining</div>
      ) : remainder <= 0 && data.totalPaid > 0 ? (
        <div className="mc-clear">PAID IN FULL</div>
      ) : null}

      <button
        className="mc-mark-paid-link"
        onClick={() => onTogglePaid(cardKey, monthKey, statement)}
      >
        ✓ Mark cycle paid
      </button>
    </div>
  );
}

// ── Due-date card summary for a month ───────────────────────────────────

interface MonthStatements {
  bofa: number;
  chase: number;
  bofa2: number;
}

function MonthCards({
  monthRows,
  prevMonthRows,
  config,
  statements,
  monthKey,
  paidCycles,
  onOverride,
  onTogglePaid,
}: {
  monthRows: DailyRow[];
  prevMonthRows: DailyRow[] | null;
  config: AppConfig;
  statements: MonthStatements;
  monthKey: string;
  paidCycles: PaidCycles;
  onOverride: (dateKey: string, field: string, value: number) => void;
  onTogglePaid: (card: CardKey, monthKey: string) => void;
}) {
  function getCardData(
    dueDay: number,
    balanceField: 'bofa' | 'chase' | 'bofa2',
    paymentField: 'bofaPayment' | 'chasePayment' | 'bofa2Payment'
  ): CardData {
    // Find the due date row to get its dateKey
    let dueeDateKey: string | null = null;
    for (const r of monthRows) {
      if (r.date.getDate() === dueDay) {
        dueeDateKey = r.dateKey;
        break;
      }
    }

    // Collect all payments for this card during the month
    const payments: { amount: number; dateKey: string; date: Date }[] = [];
    for (const r of monthRows) {
      if (r[paymentField] > 0) {
        payments.push({ amount: r[paymentField], dateKey: r.dateKey, date: r.date });
      }
    }

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const firstRow = monthRows[0];
    const lastRow = monthRows[monthRows.length - 1];

    // "Owed" = balance at start of month (what you walked in with)
    const balanceBefore = firstRow?.[balanceField] ?? 0;
    const balanceAfter = lastRow?.[balanceField] ?? 0;

    // Check if due date already passed (first row is after due day)
    const duePassed = monthRows.length > 0 && monthRows[0].date.getDate() > dueDay;

    return { balanceBefore, totalPaid, payments, balanceAfter, passed: duePassed, dueeDateKey };
  }

  const bofa = getCardData(config.bofaDueDay, 'bofa', 'bofaPayment');
  const chase = getCardData(config.chaseDueDay, 'chase', 'chasePayment');
  const bofa2 = getCardData(config.bofa2DueDay, 'bofa2', 'bofa2Payment');

  const isFirstMonth = monthRows.length > 0 && monthRows[0].isToday;

  // For month 0, show pending from config. For future months, pending is baked into balance.
  const cards: {
    label: string;
    due: number;
    data: CardData;
    color: string;
    field: string;
    cardKey: CardKey;
    statement: number;
    isPaid: boolean;
    paidAmount: number;
  }[] = [
    { label: 'BofA', due: config.bofaDueDay, data: bofa, color: '#ff453a', field: 'bofaPayment',
      cardKey: 'bofa', statement: statements.bofa,
      isPaid: monthKey in paidCycles.bofa, paidAmount: paidCycles.bofa[monthKey] ?? 0 },
    { label: 'Chase', due: config.chaseDueDay, data: chase, color: '#ff9f0a', field: 'chasePayment',
      cardKey: 'chase', statement: statements.chase,
      isPaid: monthKey in paidCycles.chase, paidAmount: paidCycles.chase[monthKey] ?? 0 },
    { label: 'BofA 2', due: config.bofa2DueDay, data: bofa2, color: '#ff6b9d', field: 'bofa2Payment',
      cardKey: 'bofa2', statement: statements.bofa2,
      isPaid: monthKey in paidCycles.bofa2, paidAmount: paidCycles.bofa2[monthKey] ?? 0 },
  ];

  const firstRow = monthRows[0];
  const lastRow = monthRows[monthRows.length - 1];
  const endChecking = lastRow?.checking ?? 0;
  // For month 0 the "start" is what the user entered (config.checking), before today's events.
  // For future months, start is the prior month's ending balance.
  const startChecking = isFirstMonth
    ? config.checking
    : (prevMonthRows?.[prevMonthRows.length - 1]?.checking ?? firstRow?.checking ?? 0);
  const checkingDelta = endChecking - startChecking;

  // Net worth: checking - all debt
  const endNet = lastRow ? lastRow.checking - lastRow.bofa - lastRow.chase - lastRow.bofa2 : 0;
  const prevLastRow = prevMonthRows?.[prevMonthRows.length - 1];
  const prevNet = prevLastRow ? prevLastRow.checking - prevLastRow.bofa - prevLastRow.chase - prevLastRow.bofa2 : null;
  const netDelta = prevNet !== null ? endNet - prevNet : null;

  const totalDebtEnd = lastRow ? lastRow.bofa + lastRow.chase + lastRow.bofa2 : 0;
  const prevDebtEnd = prevLastRow ? prevLastRow.bofa + prevLastRow.chase + prevLastRow.bofa2 : null;
  const debtDelta = prevDebtEnd !== null ? totalDebtEnd - prevDebtEnd : null;

  let lowestChecking = Infinity;
  for (const r of monthRows) {
    if (r.checking < lowestChecking) lowestChecking = r.checking;
  }
  if (!isFinite(lowestChecking)) lowestChecking = 0;

  const goesNegative = lowestChecking < 0;

  return (
    <div className="month-cards-wrap">
      {/* Summary stats row */}
      <div className={`month-stats ${goesNegative ? 'month-cash-danger' : ''}`}>
        <div className="stat">
          <div className="stat-label">End Checking</div>
          <div className={`stat-value ${endChecking >= 0 ? 'pos-val' : 'neg-val'}`}>{fmt(endChecking)}</div>
          <div className="stat-sub">from {fmt(startChecking)}</div>
          {Math.abs(checkingDelta) > 0.005 && (
            <div className={`stat-delta ${checkingDelta >= 0 ? 'delta-good' : 'delta-bad'}`}>
              {checkingDelta >= 0 ? '▲' : '▼'} {fmt(Math.abs(checkingDelta))}
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat-label">Total Debt</div>
          <div className="stat-value val-debt">{fmt(totalDebtEnd)}</div>
          {debtDelta !== null && (
            <div className={`stat-delta ${debtDelta <= 0 ? 'delta-good' : 'delta-bad'}`}>
              {debtDelta <= 0 ? '▼' : '▲'} {fmt(Math.abs(debtDelta))}
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat-label">Net Worth</div>
          <div className={`stat-value ${endNet >= 0 ? 'pos-val' : 'neg-val'}`}>{fmt(endNet)}</div>
          {netDelta !== null && (
            <div className={`stat-delta ${netDelta >= 0 ? 'delta-good' : 'delta-bad'}`}>
              {netDelta >= 0 ? '▲' : '▼'} {fmt(Math.abs(netDelta))}
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat-label">Low Point</div>
          <div className={`stat-value ${lowestChecking >= 0 ? 'pos-val' : 'neg-val'}`}>{fmt(lowestChecking)}</div>
          {goesNegative && <div className="stat-delta delta-bad">OVERDRAFT</div>}
        </div>
      </div>

      {/* Card payment inputs */}
      <div className="month-cards">
        {cards.map(c => (
          <CardWithInput
            key={c.label}
            label={c.label}
            due={c.due}
            data={c.data}
            color={c.color}
            field={c.field}
            cardKey={c.cardKey}
            statement={c.statement}
            isPaid={c.isPaid}
            paidAmount={c.paidAmount}
            monthKey={monthKey}
            onOverride={onOverride}
            onTogglePaid={onTogglePaid}
          />
        ))}
      </div>
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────

export default function DailyTable({ rows, config, totalMonths, onSetMonths, overrides, onOverride, onClearOverride, paidCycles, onTogglePaid }: Props) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleExpand = (mk: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(mk)) next.delete(mk); else next.add(mk);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, DailyRow[]>();
    for (const r of rows) {
      const arr = map.get(r.monthKey) || [];
      arr.push(r);
      map.set(r.monthKey, arr);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="daily-table-wrap">
      <div className="daily-header">
        <h2 className="section-title">Daily Cash Flow</h2>
        <div className="month-range-btns">
          <button className="range-btn" onClick={() => onSetMonths(Math.max(1, totalMonths - 1))} disabled={totalMonths <= 1}>−</button>
          <span className="range-label">{totalMonths}mo</span>
          <button className="range-btn" onClick={() => onSetMonths(Math.min(24, totalMonths + 1))}>+</button>
        </div>
      </div>

      {(() => {
        // Track progressive statement balances across months
        // Month 0: from Excel. Each next month: prev statement - payments + new spending
        let stmtBofa = config.bofaStatement;
        let stmtChase = config.chaseStatement;
        let stmtBofa2 = config.bofa2Statement;

        return grouped.map(([monthKey, monthRows], idx) => {
        const expanded = expandedMonths.has(monthKey);
        const visibleRows = expanded ? monthRows : monthRows.filter(r => r.hasEvent || r.isToday);
        const prevMonthRows = idx > 0 ? grouped[idx - 1][1] : null;

        // Snapshot current statements for this month
        const monthStatements: MonthStatements = {
          bofa: Math.max(0, Math.round(stmtBofa * 100) / 100),
          chase: Math.max(0, Math.round(stmtChase * 100) / 100),
          bofa2: Math.max(0, Math.round(stmtBofa2 * 100) / 100),
        };

        // Sum projection payments (from cells / auto-schedule) and BofA2 spending.
        let bofaPaid = 0, chasePaid = 0, bofa2Paid = 0;
        let bofa2Spending = 0;
        for (const r of monthRows) {
          bofaPaid += r.bofaPayment;
          chasePaid += r.chasePayment;
          bofa2Paid += r.bofa2Payment;
          bofa2Spending += r.spending;
        }

        // Pick the authoritative payment for each card this month:
        //   - If user marked paid (with an amount), that's the truth (covers past-cycle payments
        //     not visible in the projection rows).
        //   - Otherwise, fall back to the projection's payment for the month — which auto-detects
        //     anything the user typed into the daily cells or scheduled by default.
        const bofaPaidAmt = paidCycles.bofa[monthKey];
        const chasePaidAmt = paidCycles.chase[monthKey];
        const bofa2PaidAmt = paidCycles.bofa2[monthKey];

        const bofaApplied = bofaPaidAmt !== undefined ? bofaPaidAmt : bofaPaid;
        const chaseApplied = chasePaidAmt !== undefined ? chasePaidAmt : chasePaid;
        const bofa2Applied = bofa2PaidAmt !== undefined ? bofa2PaidAmt : bofa2Paid;

        stmtBofa = Math.max(0, stmtBofa - bofaApplied);
        stmtChase = Math.max(0, stmtChase - chaseApplied);
        stmtBofa2 = Math.max(0, stmtBofa2 - bofa2Applied);

        // Add new charges accruing onto the next cycle's statement:
        //   - First month: balance/statement gap + pending (charges since statement close)
        //   - BofA2 every month: weekly spending posts to the card
        const isFirstMonth = idx === 0;
        const bofaGap = isFirstMonth ? (config.bofaBalance - config.bofaStatement) : 0;
        const chaseGap = isFirstMonth ? (config.chaseBalance - config.chaseStatement) : 0;
        const bofa2Gap = isFirstMonth ? (config.bofa2Balance - config.bofa2Statement) : 0;

        stmtBofa += bofaGap + (isFirstMonth ? config.bofaPending : 0);
        stmtChase += chaseGap + (isFirstMonth ? config.chasePending : 0);
        stmtBofa2 += bofa2Gap + bofa2Spending + (isFirstMonth ? config.bofa2Pending : 0);

        return (
          <div key={monthKey} className="month-block">
            <div className="month-block-header">
              <span className="month-block-label">{getMonthLabel(monthKey)}</span>
              <button
                className="expand-toggle"
                onClick={() => toggleExpand(monthKey)}
              >
                {expanded ? 'Events only' : 'All days'}
              </button>
            </div>

            <MonthCards monthRows={monthRows} prevMonthRows={prevMonthRows} config={config} statements={monthStatements} monthKey={monthKey} paidCycles={paidCycles} onOverride={onOverride} onTogglePaid={onTogglePaid} />

            <div className="table-scroll">
              <table className="daily-table">
                <thead>
                  <tr>
                    <th className="col-date-th">Date</th>
                    <th>Pay</th>
                    <th>Spend</th>
                    <th>Rent</th>
                    <th>BofA</th>
                    <th>Chase</th>
                    <th>BofA2</th>
                    <th>→Sav</th>
                    <th>Check</th>
                    <th>Sav</th>
                    <th>BofA Bal</th>
                    <th>Chase Bal</th>
                    <th>BofA2 Bal</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, i) => {
                    const net = row.checking + row.savings - row.bofa - row.chase - row.bofa2;
                    const dayName = DAY_NAMES[row.date.getDay()];
                    const isOverridden = !!overrides[row.dateKey];

                    return (
                      <tr
                        key={i}
                        className={[
                          row.isToday ? 'row-today' : '',
                          row.paycheck > 0 ? 'row-payday' : '',
                          isOverridden ? 'row-overridden' : '',
                          !row.hasEvent && !row.isToday ? 'row-quiet' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <td className="col-date">
                          <span className="date-main">{formatDate(row.date)}</span>
                          <span className="date-day">{dayName}</span>
                          {row.isToday && <span className="today-badge">TODAY</span>}
                          {isOverridden && (
                            <button className="clear-row-btn" onClick={() => onClearOverride(row.dateKey)} title="Remove override">x</button>
                          )}
                        </td>
                        <td>
                          <EditableCell value={row.paycheck} dateKey={row.dateKey} field="paycheck" onOverride={onOverride} className="val-income" />
                        </td>
                        <td>
                          <EditableCell value={row.spending} dateKey={row.dateKey} field="spending" onOverride={onOverride} className="val-spend" />
                        </td>
                        <td>
                          <EditableCell value={row.rent} dateKey={row.dateKey} field="rent" onOverride={onOverride} className="val-expense" />
                        </td>
                        <td>
                          <EditableCell value={row.bofaPayment} dateKey={row.dateKey} field="bofaPayment" onOverride={onOverride} className="val-payment" />
                        </td>
                        <td>
                          <EditableCell value={row.chasePayment} dateKey={row.dateKey} field="chasePayment" onOverride={onOverride} className="val-payment" />
                        </td>
                        <td>
                          <EditableCell value={row.bofa2Payment} dateKey={row.dateKey} field="bofa2Payment" onOverride={onOverride} className="val-payment" />
                        </td>
                        <td>
                          <EditableCell value={row.toSavings} dateKey={row.dateKey} field="toSavings" onOverride={onOverride} className="val-savings" />
                        </td>
                        <td className={row.checking < 0 ? 'neg-val' : 'pos-val'}>
                          <strong>{fmt(row.checking)}</strong>
                        </td>
                        <td className="val-savings-bal">
                          <strong>{fmt(row.savings)}</strong>
                        </td>
                        <td className="val-debt">{fmt(row.bofa)}</td>
                        <td className="val-debt">{fmt(row.chase)}</td>
                        <td className="val-debt">{fmt(row.bofa2)}</td>
                        <td className={net >= 0 ? 'pos-val' : 'neg-val'}>
                          <strong>{fmt(net)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      });
      })()}

      <div className="extend-range-row">
        <button
          className="extend-range-btn"
          onClick={() => onSetMonths(Math.min(24, totalMonths + 1))}
          disabled={totalMonths >= 24}
        >
          {totalMonths >= 24 ? 'Max range (24 months)' : `+ Add another month (currently ${totalMonths}mo)`}
        </button>
      </div>
    </div>
  );
}
