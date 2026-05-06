import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import Dashboard from './components/Dashboard';
import type { AppConfig } from './types';

const STORAGE_KEY = 'finDash_v2_settings';
const BALANCE_KEY = 'finDash_v2_balances';
const OVERRIDES_KEY = 'finDash_v2_overrides';
const PAID_CYCLES_KEY = 'finDash_v2_paidCycles';

// All localStorage keys the app uses — kept in one place so seeding/export stays in sync.
const STATE_KEYS = {
  settings: STORAGE_KEY,
  balances: BALANCE_KEY,
  overrides: OVERRIDES_KEY,
  paidCycles: PAID_CYCLES_KEY,
} as const;

type StateFile = {
  settings: unknown;
  balances: unknown;
  overrides: unknown;
  paidCycles: unknown;
};

// Seed localStorage from the bundled state.json. Only writes keys that aren't
// already present locally — the file acts as the baseline for fresh devices,
// not a forced override of in-session edits.
async function seedFromStateFile(): Promise<void> {
  try {
    const resp = await fetch('/state.json', { cache: 'no-store' });
    if (!resp.ok) return;
    const file = (await resp.json()) as StateFile;
    for (const [section, key] of Object.entries(STATE_KEYS) as [keyof StateFile, string][]) {
      const val = file[section];
      if (val !== null && val !== undefined && localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    }
  } catch {
    /* state.json is optional — first-time setups won't have one */
  }
}

// Pull current localStorage state out. In local dev (Vite middleware available),
// POST it straight to public/state.json on disk. Otherwise fall back to a
// browser download — the only thing a deployed page in Safari/Chrome can do.
async function exportStateFile(): Promise<void> {
  const out: StateFile = { settings: null, balances: null, overrides: null, paidCycles: null };
  for (const [section, key] of Object.entries(STATE_KEYS) as [keyof StateFile, string][]) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { out[section] = JSON.parse(raw); } catch { /* skip malformed */ }
    }
  }
  const body = JSON.stringify(out, null, 2);

  // Try the dev-only Vite middleware first. If we're not in dev, this will
  // 404 or fail and we drop into the download path.
  try {
    const resp = await fetch('/__save_state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (resp.ok) {
      const data = await resp.json();
      alert(`✓ Wrote state.json directly to disk:\n${data.path}`);
      return;
    }
  } catch {
    /* fall through to download */
  }

  // Production / phone fallback — download the file so you can drop it into
  // public/state.json yourself and commit/deploy.
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'state.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Wipe localStorage and re-seed from the bundled state.json. Used by the
// "Sync from deployed state" button so a stale device can pick up new pushes.
async function forceSyncFromStateFile(): Promise<void> {
  for (const key of Object.values(STATE_KEYS)) localStorage.removeItem(key);
  await seedFromStateFile();
  window.location.reload();
}

const BALANCE_FIELDS = ['checking', 'bofaBalance', 'chaseBalance', 'bofa2Balance', 'bofaPending', 'chasePending', 'bofa2Pending', 'bofaStatement', 'chaseStatement', 'bofa2Statement'] as const;

const DEFAULT_SETTINGS: Omit<AppConfig, 'checking' | 'bofaBalance' | 'chaseBalance' | 'bofa2Balance' | 'bofaPending' | 'chasePending' | 'bofa2Pending' | 'bofaStatement' | 'chaseStatement' | 'bofa2Statement'> = {
  savings: 17000,
  bofaPayment: 3728,
  chasePayment: 808,
  bofa2Payment: 9972,
  bofaDueDay: 3,
  chaseDueDay: 8,
  bofa2DueDay: 24,
  paycheckAmount: 3850,
  paycheckOverride: 3000,
  paycheckOverrideUntil: '2026-05-08',
  payDayReference: '2025-11-20',
  rent: 1938,
  rentDay: 0, // 0 = last day of month
  weeklySpending: 200,
};

function loadSettings(): typeof DEFAULT_SETTINGS {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: typeof DEFAULT_SETTINGS) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadBalances(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveBalances(config: AppConfig) {
  const balances: Record<string, number> = {};
  for (const f of BALANCE_FIELDS) balances[f] = config[f];
  localStorage.setItem(BALANCE_KEY, JSON.stringify(balances));
}

function num(val: any): number {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function readBalances(wb: XLSX.WorkBook): Pick<AppConfig, 'checking' | 'bofaBalance' | 'chaseBalance' | 'bofa2Balance' | 'bofaPending' | 'chasePending' | 'bofa2Pending'> & { bofaStatement: number; chaseStatement: number; bofa2Statement: number } {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  // Row 3 (index 2) = current balances + statement totals
  const row3 = data[2] || [];
  // Row 4 (index 3) = pending charges (not yet on statement)
  const row4 = data[3] || [];
  // Row 7 (index 6) = statement balances
  const row7 = data[6] || [];

  return {
    checking: num(row3[8]),
    chaseBalance: num(row3[14]),
    bofaBalance: num(row3[16]),
    bofa2Balance: num(row3[17]),
    chasePending: num(row4[14]),
    bofaPending: num(row4[16]),
    bofa2Pending: num(row4[17]),
    chaseStatement: num(row7[13]),
    bofaStatement: num(row7[16]),
    bofa2Statement: num(row7[17]),
  };
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Seed localStorage from public/state.json on fresh devices before reading any keys.
        await seedFromStateFile();

        const resp = await fetch('/budget.xlsx');
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const balances = readBalances(wb);
        const settings = loadSettings();

        // Use statement balances as default payment amounts if user hasn't customized
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          settings.bofaPayment = balances.bofaStatement || DEFAULT_SETTINGS.bofaPayment;
          settings.chasePayment = balances.chaseStatement || DEFAULT_SETTINGS.chasePayment;
          settings.bofa2Payment = balances.bofa2Statement || DEFAULT_SETTINGS.bofa2Payment;
        }

        // Use saved balances from localStorage if user has edited them, otherwise use Excel
        const savedBalances = loadBalances();
        setConfig({
          checking: savedBalances?.checking ?? balances.checking,
          bofaBalance: savedBalances?.bofaBalance ?? balances.bofaBalance,
          chaseBalance: savedBalances?.chaseBalance ?? balances.chaseBalance,
          bofa2Balance: savedBalances?.bofa2Balance ?? balances.bofa2Balance,
          bofaPending: savedBalances?.bofaPending ?? balances.bofaPending,
          chasePending: savedBalances?.chasePending ?? balances.chasePending,
          bofa2Pending: savedBalances?.bofa2Pending ?? balances.bofa2Pending,
          bofaStatement: savedBalances?.bofaStatement ?? balances.bofaStatement,
          chaseStatement: savedBalances?.chaseStatement ?? balances.chaseStatement,
          bofa2Statement: savedBalances?.bofa2Statement ?? balances.bofa2Statement,
          ...settings,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to load budget.xlsx:', err);
        setError('Failed to load financial data');
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdate = useCallback((updates: Partial<AppConfig>) => {
    setConfig(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      const { checking, bofaBalance, chaseBalance, bofa2Balance, bofaPending, chasePending, bofa2Pending, bofaStatement, chaseStatement, bofa2Statement, ...settings } = next;
      saveSettings(settings);
      saveBalances(next);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Dashboard
        config={config}
        onUpdate={handleUpdate}
        onExportState={exportStateFile}
        onSyncState={forceSyncFromStateFile}
      />
    </div>
  );
}

export default App;
