import { useState } from 'react';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  paidThisCycle?: { chase: boolean; bofa: boolean; bofa2: boolean };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function EditableAmount({
  value,
  field,
  onUpdate,
  className = 'inline-edit-btn',
}: {
  value: number;
  field: keyof AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function start() {
    setDraft(String(Math.round(value * 100) / 100));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const n = parseFloat(draft.replace(/[$,]/g, ''));
    if (!isNaN(n)) onUpdate({ [field]: n } as Partial<AppConfig>);
  }

  if (editing) {
    return (
      <input
        className={`inline-edit ${className}-editing`}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
      />
    );
  }

  return (
    <button className={className} onClick={start}>
      {fmt(value)}
    </button>
  );
}

function CardBalance({
  label,
  balance,
  balanceField,
  statement,
  statementField,
  pending,
  pendingField,
  color,
  onUpdate,
  paidThisCycle,
}: {
  label: string;
  balance: number;
  balanceField: keyof AppConfig;
  statement: number;
  statementField: keyof AppConfig;
  pending: number;
  pendingField: keyof AppConfig;
  color: string;
  onUpdate: (updates: Partial<AppConfig>) => void;
  paidThisCycle?: boolean;
}) {
  const total = balance + pending;
  return (
    <div className="balance-card card-balance" style={{ borderColor: `${color}22` }}>
      <div className="balance-label">{label}</div>
      <div className="balance-amount" style={{ color }}>{fmt(total)}</div>
      {paidThisCycle && <div className="mc-passed">next cycle</div>}
      <div className="card-breakdown">
        <div className="breakdown-row">
          <span className="breakdown-label">Balance</span>
          <EditableAmount
            value={balance}
            field={balanceField}
            onUpdate={onUpdate}
            className="breakdown-edit"
          />
        </div>
        <div className="breakdown-row pending">
          <span className="breakdown-label">Pending</span>
          <EditableAmount
            value={pending}
            field={pendingField}
            onUpdate={onUpdate}
            className="breakdown-edit pending-edit"
          />
        </div>
        <div className="breakdown-row stmt">
          <span className="breakdown-label">Statement</span>
          <EditableAmount
            value={statement}
            field={statementField}
            onUpdate={onUpdate}
            className="breakdown-edit"
          />
        </div>
      </div>
    </div>
  );
}

export default function BalanceSummary({ config, onUpdate, paidThisCycle }: Props) {
  const totalBofa = config.bofaBalance + config.bofaPending;
  const totalChase = config.chaseBalance + config.chasePending;
  const totalBofa2 = config.bofa2Balance + config.bofa2Pending;
  const totalDebt = totalBofa + totalChase + totalBofa2;
  const net = config.savings + config.checking - totalDebt;

  return (
    <div className="balance-summary">
      <div className="balance-card savings">
        <div className="balance-label">Savings</div>
        <EditableAmount
          value={config.savings}
          field="savings"
          onUpdate={onUpdate}
          className="balance-amount-edit savings-amount"
        />
      </div>

      <div className="balance-card checking">
        <div className="balance-label">Checking</div>
        <EditableAmount
          value={config.checking}
          field="checking"
          onUpdate={onUpdate}
          className="balance-amount-edit"
        />
      </div>

      <div className="balance-card net">
        <div className="balance-label">Net Worth</div>
        <div className={`balance-amount ${net >= 0 ? 'pos' : 'neg'}`}>{fmt(net)}</div>
        <div className="balance-sub">{fmt(totalDebt)} total debt</div>
      </div>

      <CardBalance
        label="Chase"
        balance={config.chaseBalance}
        balanceField="chaseBalance"
        statement={config.chaseStatement}
        statementField="chaseStatement"
        pending={config.chasePending}
        pendingField="chasePending"
        color="#4dabf7"
        onUpdate={onUpdate}
        paidThisCycle={paidThisCycle?.chase}
      />
      <CardBalance
        label="BofA 1"
        balance={config.bofaBalance}
        balanceField="bofaBalance"
        statement={config.bofaStatement}
        statementField="bofaStatement"
        pending={config.bofaPending}
        pendingField="bofaPending"
        color="#ff6b6b"
        onUpdate={onUpdate}
        paidThisCycle={paidThisCycle?.bofa}
      />
      <CardBalance
        label="BofA 2"
        balance={config.bofa2Balance}
        balanceField="bofa2Balance"
        statement={config.bofa2Statement}
        statementField="bofa2Statement"
        pending={config.bofa2Pending}
        pendingField="bofa2Pending"
        color="#ffd43b"
        onUpdate={onUpdate}
        paidThisCycle={paidThisCycle?.bofa2}
      />
    </div>
  );
}
