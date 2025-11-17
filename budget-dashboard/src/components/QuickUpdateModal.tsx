import { useState, useEffect } from 'react';
import './QuickUpdateModal.css';

interface QuickUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValues: {
    checking: number;
    bofaStatement: number;
    bofa2Statement: number;
    chaseStatement: number;
    currentBofA: number;
    currentBofA2: number;
    currentChase: number;
    pendingBofA: number;
    pendingBofA2: number;
    pendingChase: number;
    paycheckAmount: number;
    rent: number;
    weeklySpending: number;
    bofaPayment: number;
    bofa2Payment: number;
    chasePayment: number;
  };
  excelData?: {
    checking: number;
    bofaStatement: number;
    bofa2Statement: number;
    chaseStatement: number;
    currentBofA: number;
    currentBofA2: number;
    currentChase: number;
    pendingBofA: number;
    pendingBofA2: number;
    pendingChase: number;
    paycheckAmount?: number;
    rent?: number;
    weeklySpending?: number;
  };
  onSave: (values: {
    checking: number;
    bofaStatement: number;
    bofa2Statement: number;
    chaseStatement: number;
    currentBofA: number;
    currentBofA2: number;
    currentChase: number;
    pendingBofA: number;
    pendingBofA2: number;
    pendingChase: number;
    paycheckAmount: number;
    rent: number;
    weeklySpending: number;
    bofaPayment: number;
    bofa2Payment: number;
    chasePayment: number;
  }) => void;
  isFirstTime?: boolean;
}

function QuickUpdateModal({ isOpen, onClose, currentValues, excelData, onSave, isFirstTime = false }: QuickUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses'>('balances');
  
  const [checking, setChecking] = useState(currentValues.checking);
  const [bofaStatement, setBofaStatement] = useState(currentValues.bofaStatement);
  const [bofa2Statement, setBofa2Statement] = useState(currentValues.bofa2Statement);
  const [chaseStatement, setChaseStatement] = useState(currentValues.chaseStatement);
  const [currentBofA, setCurrentBofA] = useState(currentValues.currentBofA);
  const [currentBofA2, setCurrentBofA2] = useState(currentValues.currentBofA2);
  const [currentChase, setCurrentChase] = useState(currentValues.currentChase);
  const [pendingBofA, setPendingBofA] = useState(currentValues.pendingBofA);
  const [pendingBofA2, setPendingBofA2] = useState(currentValues.pendingBofA2);
  const [pendingChase, setPendingChase] = useState(currentValues.pendingChase);
  
  const [paycheckAmount, setPaycheckAmount] = useState(currentValues.paycheckAmount);
  const [rent, setRent] = useState(currentValues.rent);
  const [weeklySpending, setWeeklySpending] = useState(currentValues.weeklySpending);
  
  const [bofaPayment, setBofaPayment] = useState(currentValues.bofaPayment);
  const [bofa2Payment, setBofa2Payment] = useState(currentValues.bofa2Payment);
  const [chasePayment, setChasePayment] = useState(currentValues.chasePayment);

  const handleLoadFromExcel = () => {
    if (excelData) {
      console.log('📥 Loading from Excel:', excelData);
      setChecking(excelData.checking);
      setBofaStatement(excelData.bofaStatement);
      setBofa2Statement(excelData.bofa2Statement);
      setChaseStatement(excelData.chaseStatement);
      setCurrentBofA(excelData.currentBofA);
      setCurrentBofA2(excelData.currentBofA2);
      setCurrentChase(excelData.currentChase);
      setPendingBofA(excelData.pendingBofA);
      setPendingBofA2(excelData.pendingBofA2);
      setPendingChase(excelData.pendingChase);
      if (excelData.paycheckAmount) setPaycheckAmount(excelData.paycheckAmount);
      if (excelData.rent) setRent(excelData.rent);
      if (excelData.weeklySpending) setWeeklySpending(excelData.weeklySpending);
      console.log('✅ Values loaded into modal');
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('🎯 Modal opened with currentValues:', currentValues);
      console.log('📂 excelData available:', excelData);
      setChecking(currentValues.checking);
      setBofaStatement(currentValues.bofaStatement);
      setBofa2Statement(currentValues.bofa2Statement);
      setChaseStatement(currentValues.chaseStatement);
      setCurrentBofA(currentValues.currentBofA);
      setCurrentBofA2(currentValues.currentBofA2);
      setCurrentChase(currentValues.currentChase);
      setPendingBofA(currentValues.pendingBofA);
      setPendingBofA2(currentValues.pendingBofA2);
      setPendingChase(currentValues.pendingChase);
      setPaycheckAmount(currentValues.paycheckAmount);
      setRent(currentValues.rent);
      setWeeklySpending(currentValues.weeklySpending);
      setBofaPayment(currentValues.bofaPayment);
      setBofa2Payment(currentValues.bofa2Payment);
      setChasePayment(currentValues.chasePayment);
    }
  }, [isOpen, currentValues, excelData]);

  const handleSave = () => {
    onSave({
      checking,
      bofaStatement,
      bofa2Statement,
      chaseStatement,
      currentBofA,
      currentBofA2,
      currentChase,
      pendingBofA,
      pendingBofA2,
      pendingChase,
      paycheckAmount,
      rent,
      weeklySpending,
      bofaPayment,
      bofa2Payment,
      chasePayment
    });
    onClose();
  };

  const handleCancel = () => {
    if (!isFirstTime) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{isFirstTime ? '🎉 Welcome! Setup Your Dashboard' : '💰 Financial Control Center'}</h2>
            {excelData && (
              <button 
                className="btn-load-excel-header"
                onClick={handleLoadFromExcel}
                type="button"
                title="Load from Excel file"
              >
                💾
              </button>
            )}
          </div>
          <p className="modal-subtitle">
            {isFirstTime 
              ? 'Enter your current balances and regular expenses to get started' 
              : 'Update your current balances and settings'}
          </p>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'balances' ? 'active' : ''}`}
            onClick={() => setActiveTab('balances')}
          >
            💳 Account Balances
          </button>
          <button
            className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            📊 Regular Expenses
          </button>
        </div>

        <div className="modal-body">
          {/* BALANCES TAB */}
          {activeTab === 'balances' && (
            <>
              <div className="input-group">
                <label>
                  <span className="label-icon">💵</span>
                  <span className="label-text">Checking Balance</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={checking}
                    onChange={(e) => setChecking(Number(e.target.value))}
                    step="0.01"
                    autoFocus
                    min="0"
                  />
                </div>
              </div>

              <div className="section-divider">
                <span>Credit Card Statement Balances</span>
              </div>
              <p className="helper-text">What's due THIS billing cycle</p>

              <div className="input-group">
                <label>
                  <span className="label-icon">📄</span>
                  <span className="label-text">BofA Statement Balance</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={bofaStatement}
                    onChange={(e) => setBofaStatement(Number(e.target.value))}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        setBofaStatement(Number(val.toFixed(2)));
                      }
                    }}
                    step="0.01"
                    placeholder="What you owe this month"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>
                  <span className="label-icon">📄</span>
                  <span className="label-text">BofA 2 Statement Balance</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={bofa2Statement}
                    onChange={(e) => setBofa2Statement(Number(e.target.value))}
                    step="0.01"
                    placeholder="What you owe this month"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>
                  <span className="label-icon">📄</span>
                  <span className="label-text">Chase Statement Balance</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={chaseStatement}
                    onChange={(e) => setChaseStatement(Number(e.target.value))}
                    step="0.01"
                    placeholder="What you owe this month"
                  />
                </div>
              </div>

              <div className="section-divider">
                <span>Current Card Balances (Total if you check today)</span>
              </div>
              <p className="helper-text">What the bank shows as your current total balance</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>
                    <span className="label-icon">💳</span>
                    <span className="label-text">BofA Current</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={currentBofA}
                      onChange={(e) => setCurrentBofA(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setCurrentBofA(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Total balance"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    <span className="label-icon">⏳</span>
                    <span className="label-text">BofA Pending</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={pendingBofA}
                      onChange={(e) => setPendingBofA(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setPendingBofA(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Pending"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>
                    <span className="label-icon">💳</span>
                    <span className="label-text">BofA 2 Current</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={currentBofA2}
                      onChange={(e) => setCurrentBofA2(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setCurrentBofA2(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Total balance"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    <span className="label-icon">⏳</span>
                    <span className="label-text">BofA 2 Pending</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={pendingBofA2}
                      onChange={(e) => setPendingBofA2(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setPendingBofA2(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Pending"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>
                    <span className="label-icon">💳</span>
                    <span className="label-text">Chase Current</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={currentChase}
                      onChange={(e) => setCurrentChase(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setCurrentChase(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Total balance"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    <span className="label-icon">⏳</span>
                    <span className="label-text">Chase Pending</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      type="number"
                      value={pendingChase}
                      onChange={(e) => setPendingChase(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setPendingChase(Number(val.toFixed(2)));
                        }
                      }}
                      step="0.01"
                      placeholder="Pending"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <>
              <div className="tab-description">
                These are your consistent income and expenses. Set them once and they'll be used for projections.
              </div>

              <div className="input-group">
                <label>
                  <span className="label-icon">💰</span>
                  <span className="label-text">Bi-Weekly Paycheck</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={paycheckAmount}
                    onChange={(e) => setPaycheckAmount(Number(e.target.value))}
                    step="1"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>
                  <span className="label-icon">🏠</span>
                  <span className="label-text">Monthly Rent (Due on 23rd)</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    step="1"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>
                  <span className="label-icon">🛒</span>
                  <span className="label-text">Weekly Spending</span>
                </label>
                <div className="input-wrapper">
                  <span className="dollar-sign">$</span>
                  <input
                    type="number"
                    value={weeklySpending}
                    onChange={(e) => setWeeklySpending(Number(e.target.value))}
                    step="1"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {!isFirstTime && (
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button className="btn-save" onClick={handleSave}>
            {isFirstTime ? '🚀 Start Dashboard' : '💾 Save & Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickUpdateModal;

