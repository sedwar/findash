import { useState } from 'react';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
}

function Field({
  label,
  value,
  field,
  onUpdate,
  prefix = '$',
  isDate = false,
}: {
  label: string;
  value: number | string;
  field: keyof AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  prefix?: string;
  isDate?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const displayVal = isDate
    ? String(value)
    : `${prefix}${Number(value).toLocaleString('en-US')}`;

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (isDate) {
      onUpdate({ [field]: draft } as Partial<AppConfig>);
    } else {
      const n = parseFloat(draft.replace(/[$,]/g, ''));
      if (!isNaN(n)) onUpdate({ [field]: n } as Partial<AppConfig>);
    }
  }

  return (
    <div className="config-field">
      <span className="config-label">{label}</span>
      {editing ? (
        <input
          className="config-input"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
        />
      ) : (
        <button className="config-value" onClick={startEdit}>
          {displayVal}
        </button>
      )}
    </div>
  );
}

export default function ConfigPanel({ config, onUpdate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="config-panel">
      <button className="config-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▲ Hide Settings' : '⚙ Settings'}
      </button>

      {open && (
        <div className="config-body">
          <div className="config-section">
            <div className="config-section-title">Income</div>
            <div className="config-row">
              <Field label="Regular paycheck" value={config.paycheckAmount} field="paycheckAmount" onUpdate={onUpdate} />
              <Field label="Override amount" value={config.paycheckOverride} field="paycheckOverride" onUpdate={onUpdate} />
              <Field label="Override until" value={config.paycheckOverrideUntil} field="paycheckOverrideUntil" onUpdate={onUpdate} isDate prefix="" />
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title">Monthly Payments</div>
            <div className="config-row">
              <Field label={`BofA (due ${config.bofaDueDay}th)`} value={config.bofaPayment} field="bofaPayment" onUpdate={onUpdate} />
              <Field label={`Chase (due ${config.chaseDueDay}th)`} value={config.chasePayment} field="chasePayment" onUpdate={onUpdate} />
              <Field label={`BofA2 (due ${config.bofa2DueDay}th)`} value={config.bofa2Payment} field="bofa2Payment" onUpdate={onUpdate} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title">Expenses</div>
            <div className="config-row">
              <Field label="Rent" value={config.rent} field="rent" onUpdate={onUpdate} />
              <Field label="Rent due day (0=last)" value={config.rentDay} field="rentDay" onUpdate={onUpdate} prefix="" />
              <Field label="Weekly spending" value={config.weeklySpending} field="weeklySpending" onUpdate={onUpdate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
