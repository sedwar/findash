import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import Dashboard from './components/Dashboard';
import type { AppConfig } from './types';

const STORAGE_KEY = 'finDash_v2_settings';
const BALANCE_KEY = 'finDash_v2_balances';

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
      <Dashboard config={config} onUpdate={handleUpdate} />
    </div>
  );
}

export default App;
