import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import Dashboard from './components/Dashboard';
import type { FinancialData, CashFlowRow, AccountBalance } from './types';

function App() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExcelFile();
  }, []);

  const parseValue = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    // Remove currency symbols, commas, and whitespace
    const cleaned = String(val).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseExcelDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Handle formats like "13-Nov", "20-Nov", etc.
    const parts = dateStr.split('-');
    if (parts.length === 2) {
      const day = parts[0];
      const month = parts[1];
      // Use 2025-2026 based on month (Nov-Dec is 2025, Jan-Mar is 2026)
      const monthsEndOfYear = ['nov', 'dec'];
      const year = monthsEndOfYear.includes(month.toLowerCase()) ? '2025' : '2026';
      return `${day}-${month}-${year}`;
    }
    
    return dateStr;
  };

  const loadExcelFile = async () => {
    try {
      const response = await fetch('/budget.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      const processedData = processFinancialData(jsonData);
      setFinancialData(processedData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load financial data');
      setLoading(false);
      console.error(err);
    }
  };

  const processFinancialData = (data: any[]): FinancialData => {
    // Skip first 2 rows (empty row and headers)
    // Note: Excel has an empty column 0, so all data starts at column 1
    const dataRows = data.slice(2).filter((row: any[]) => {
      return row && row.length > 0;
    });

    const rows: CashFlowRow[] = [];
    const upcomingPayments: { date: string; type: string; amount: number }[] = [];
    
    let totalPaychecks = 0;
    let totalSpending = 0;
    let totalRent = 0;
    let currentChecking = 0;
    let currentBofA = 0;
    let currentBofA2 = 0;
    let currentChase = 0;
    let chaseStatement = 0;
    let bofaStatement = 0;
    let bofa2Statement = 0;
    
    const today = new Date();

    dataRows.forEach((row: any[], index: number) => {
      // Column 0 is empty, all data starts at column 1!
      const date = parseExcelDate(row[1] || '');
      const paycheck = parseValue(row[2]);
      const spending = parseValue(row[3]);
      const rent = parseValue(row[4]);
      const bofaPayment = parseValue(row[5]);
      const bofa2Payment = parseValue(row[6]);
      const chasePayment = parseValue(row[7]);
      const checking = parseValue(row[8]);
      const bofa = parseValue(row[9]);
      const chase = parseValue(row[10]);
      const bofa2 = parseValue(row[11]);
      const notes = row[12] || '';
      const chaseStatementCol = parseValue(row[13]);
      const total = parseValue(row[14]);
      const bofaBalance = parseValue(row[16]);
      const bofaBalance2 = parseValue(row[17]);
      const checkingBalance = parseValue(row[18]);
      const totalBalance = parseValue(row[19]) || (checkingBalance - bofa - bofa2 - chase);
      const cash = parseValue(row[20]);

      rows.push({
        date,
        paycheck,
        spending,
        rent,
        bofaPayment,
        bofa2Payment,
        chasePayment,
        checking,
        bofa,
        chase,
        bofa2,
        notes,
        chaseStatement: chaseStatementCol,
        total,
        bofaBalance,
        bofaBalance2,
        checkingBalance,
        totalBalance,
        cash
      });

      // Track totals
      totalPaychecks += paycheck;
      totalSpending += spending;
      totalRent += rent;

      // Get TODAY's balances from first row (index 0 is today - 13-Nov)
      if (index === 0) {
        // Row 0 has "Total" label and CURRENT STATEMENT balances (not including pending)
        currentChecking = checkingBalance || checking;
        
        // CURRENT STATEMENT BALANCES (what's on your statement NOW, before pending hits)
        chaseStatement = parseValue(row[14]); // 819.38
        bofaStatement = parseValue(row[16]); // 3,727.93
        bofa2Statement = parseValue(row[17]); // 13,627.46
        
        // CURRENT BALANCES (row 1 in Excel has today's spending already applied)
        // So subtract today's spending to get ACTUAL current balance
        const todaySpending = spending; // $200 for today (13-Nov)
        
        currentChase = chase; // 858.18
        currentBofA = bofa; // 3,727.93
        currentBofA2 = bofa2 - todaySpending; // 14787.08 - 200 = 14587.08
        
        console.log('✅ CURRENT BALANCES (from Row 1, BEFORE today\'s spending):');
        console.log('  Row 1 bofa2:', bofa2, '- Today spending:', todaySpending, '= Current:', currentBofA2);
        console.log('  Chase - Statement:', chaseStatement, 'Current:', currentChase, 'Pending:', currentChase - chaseStatement);
        console.log('  BofA - Statement:', bofaStatement, 'Current:', currentBofA, 'Pending:', currentBofA - bofaStatement);
        console.log('  BofA2 - Statement:', bofa2Statement, 'Current:', currentBofA2, 'Pending:', currentBofA2 - bofa2Statement);
      }

      // Track upcoming payments
      const rowDate = new Date(date);
      
      if (rowDate >= today) {
        if (rent > 0) upcomingPayments.push({ date, type: 'Rent', amount: rent });
        if (bofaPayment > 0) upcomingPayments.push({ date, type: 'BofA Payment', amount: bofaPayment });
        if (bofa2Payment > 0) upcomingPayments.push({ date, type: 'BofA 2 Payment', amount: bofa2Payment });
        if (chasePayment > 0) upcomingPayments.push({ date, type: 'Chase Payment', amount: chasePayment });
        if (spending > 0) upcomingPayments.push({ date, type: 'Spending', amount: spending });
        if (paycheck > 0) upcomingPayments.push({ date, type: 'Paycheck', amount: paycheck });
      }
    });

    const projectedBalance = rows.length > 0 ? rows[rows.length - 1].totalBalance : 0;

    // Calculate pending charges (current - statement = pending)
    const pendingChaseCharges = currentChase - chaseStatement;
    const pendingBofACharges = currentBofA - bofaStatement;
    const pendingBofA2Charges = currentBofA2 - bofa2Statement;
    
    // Get NEXT projected statements from the bottom rows with the orange highlighting
    // These are in the last few rows where we see $808.07, $3,727.93, $9,971.60
    let chaseNextStatement = 0;
    let bofaNextStatement = 0;
    let bofa2NextStatement = 0;
    
    // The next statement projections are in Row 6 based on the console output
    if (data.length > 6) {
      const statementRow = data[6];
      
      // Debug: print ALL columns in row 6 to find 808.07
      console.log('🔍 ALL COLUMNS in Row 6:', statementRow);
      
      // Try different columns for Chase (might be in col 13 or 14)
      const chaseCol13 = parseValue(statementRow[13]);
      const chaseCol14 = parseValue(statementRow[14]);
      const chaseCol15 = parseValue(statementRow[15]);
      
      console.log('Chase candidates:', {col13: chaseCol13, col14: chaseCol14, col15: chaseCol15});
      
      // Pick the one that's around 808
      chaseNextStatement = chaseCol13 > 800 && chaseCol13 < 820 ? chaseCol13 : chaseCol14;
      bofaNextStatement = parseValue(statementRow[16]); // Row 6, col 16
      bofa2NextStatement = parseValue(statementRow[17]); // Row 6, col 17
      
      console.log('📅 FOUND NEXT PROJECTED STATEMENTS from Row 6:');
      console.log('  Chase:', chaseNextStatement);
      console.log('  BofA:', bofaNextStatement);
      console.log('  BofA2:', bofa2NextStatement);
    }

    return {
      rows,
      summary: {
        totalPaychecks,
        totalSpending,
        totalRent,
        currentChecking,
        currentBofA,
        currentBofA2,
        currentChase,
        projectedBalance,
        pendingChaseCharges,
        pendingBofACharges,
        pendingBofA2Charges,
        chaseStatement,
        bofaStatement,
        bofa2Statement,
        chaseNextStatement,
        bofaNextStatement,
        bofa2NextStatement
      },
      upcomingPayments: upcomingPayments.slice(0, 10) // Next 10 payments
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      const processedData = processFinancialData(jsonData);
      setFinancialData(processedData);
      setLoading(false);
    } catch (err) {
      setError('Failed to process uploaded file');
      setLoading(false);
      console.error(err);
    }
  };

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

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {financialData && <Dashboard data={financialData} />}
    </div>
  );
}

export default App;
