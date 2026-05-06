import { useState, useMemo, useCallback } from 'react';
import type { AppConfig } from '../types';
import { generateMonthlyProjection, generateDailyEvents } from '../utils/projection';
import type { DailyOverrides } from '../utils/projection';
import BalanceSummary from './BalanceSummary';
import ConfigPanel from './ConfigPanel';
import BalanceChart from './BalanceChart';
import MonthlyTable from './MonthlyTable';
import DailyTable from './DailyTable';
import './Dashboard.css';

const OVERRIDES_KEY = 'finDash_v2_overrides';
const PAID_CYCLES_KEY = 'finDash_v2_paidCycles';

function loadOverrides(): DailyOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(ov: DailyOverrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(ov));
}

// For each card, maps "YYYY-MM" → amount the user paid for that cycle.
// Key present = cycle marked paid. Value = the amount they reported paying.
export type PaidCycles = {
  bofa: Record<string, number>;
  chase: Record<string, number>;
  bofa2: Record<string, number>;
};

function loadPaidCycles(): PaidCycles {
  try {
    const raw = localStorage.getItem(PAID_CYCLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old array format → object with 0-amount entries (treat as legacy "full paid" with unknown amount)
      const toMap = (v: unknown): Record<string, number> => {
        if (Array.isArray(v)) return Object.fromEntries(v.map(k => [k, 0]));
        if (v && typeof v === 'object') return v as Record<string, number>;
        return {};
      };
      return {
        bofa: toMap(parsed.bofa),
        chase: toMap(parsed.chase),
        bofa2: toMap(parsed.bofa2),
      };
    }
  } catch { /* ignore */ }
  return { bofa: {}, chase: {}, bofa2: {} };
}

function savePaidCycles(p: PaidCycles) {
  localStorage.setItem(PAID_CYCLES_KEY, JSON.stringify(p));
}

interface Props {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onExportState: () => void | Promise<void>;
  onSyncState: () => void | Promise<void>;
}

export default function Dashboard({ config, onUpdate, onExportState, onSyncState }: Props) {
  const [totalMonths, setTotalMonths] = useState(6);
  const [overrides, setOverrides] = useState<DailyOverrides>(loadOverrides);
  const [paidCycles, setPaidCycles] = useState<PaidCycles>(loadPaidCycles);

  const handleTogglePaid = useCallback((card: keyof PaidCycles, monthKey: string, amount?: number) => {
    setPaidCycles(prev => {
      const cardMap = { ...prev[card] };
      if (amount === undefined) {
        delete cardMap[monthKey];
      } else {
        cardMap[monthKey] = amount;
      }
      const next: PaidCycles = { ...prev, [card]: cardMap };
      savePaidCycles(next);
      return next;
    });
  }, []);

  const handleOverride = useCallback((dateKey: string, field: string, value: number) => {
    setOverrides(prev => {
      const next = {
        ...prev,
        [dateKey]: { ...prev[dateKey], [field]: value },
      };
      saveOverrides(next);
      return next;
    });
  }, []);

  const handleClearOverride = useCallback((dateKey: string, field?: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      if (field && next[dateKey]) {
        const entry = { ...next[dateKey] };
        delete (entry as any)[field];
        if (Object.keys(entry).length === 0) {
          delete next[dateKey];
        } else {
          next[dateKey] = entry;
        }
      } else {
        delete next[dateKey];
      }
      saveOverrides(next);
      return next;
    });
  }, []);

  const monthlyRows = useMemo(
    () => generateMonthlyProjection(config, totalMonths),
    [config, totalMonths]
  );

  const dailyRows = useMemo(
    () => generateDailyEvents(config, totalMonths, overrides),
    [config, totalMonths, overrides]
  );

  // Use the explicit paid-cycle flags for the top summary — only "paid" if user said so.
  const paidThisCycle = useMemo(() => {
    const now = new Date();
    const cycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return {
      chase: cycleKey in paidCycles.chase,
      bofa: cycleKey in paidCycles.bofa,
      bofa2: cycleKey in paidCycles.bofa2,
    };
  }, [paidCycles]);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Financial Dashboard</h1>
        <div className="header-actions">
          {Object.keys(overrides).length > 0 && (
            <button
              className="clear-overrides-btn"
              onClick={() => { setOverrides({}); saveOverrides({}); }}
            >
              Clear {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''}
            </button>
          )}
          <button
            className="state-action-btn"
            onClick={onExportState}
            title="Download current state as state.json — drop into public/ and deploy"
          >
            ⬇ Export state
          </button>
          <button
            className="state-action-btn state-sync-btn"
            onClick={() => {
              if (confirm('This will wipe local edits and reload state.json from the deployed site. Continue?')) {
                onSyncState();
              }
            }}
            title="Reset local state and re-pull from public/state.json"
          >
            ⟳ Sync from server
          </button>
        </div>
      </header>

      <BalanceSummary config={config} onUpdate={onUpdate} paidThisCycle={paidThisCycle} />
      <ConfigPanel config={config} onUpdate={onUpdate} />
      <BalanceChart rows={dailyRows} />
      <MonthlyTable rows={monthlyRows} />
      <DailyTable
        rows={dailyRows}
        config={config}
        totalMonths={totalMonths}
        onSetMonths={setTotalMonths}
        overrides={overrides}
        onOverride={handleOverride}
        onClearOverride={handleClearOverride}
        paidCycles={paidCycles}
        onTogglePaid={handleTogglePaid}
      />
    </div>
  );
}
