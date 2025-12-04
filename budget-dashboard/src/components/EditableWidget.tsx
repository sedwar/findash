import React, { useState } from 'react';
import './EditableWidget.css';

interface EditableWidgetProps {
  label: string;
  value: number;
  onSave: (value: number) => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  pending?: number;
  sublabel?: string;
  showNoPending?: boolean;
  onPendingEdit?: (value: number) => void;
  onPayFull?: () => void;
  onPaidThisMonth?: () => void;
  isPaidThisMonth?: boolean;
  isWarning?: boolean;
}

function EditableWidget({ label, value, onSave, color = '#ffffff', size = 'medium', pending, sublabel, showNoPending, onPendingEdit, onPayFull, onPaidThisMonth, isPaidThisMonth, isWarning }: EditableWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [editPendingValue, setEditPendingValue] = useState(pending?.toString() || '0');
  
  // Update editPendingValue when pending prop changes
  React.useEffect(() => {
    if (!isEditingPending) {
      setEditPendingValue(pending?.toString() || '0');
    }
  }, [pending, isEditingPending]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleSave = () => {
    const numValue = parseFloat(editValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numValue)) {
      onSave(numValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  const handlePendingSave = () => {
    if (onPendingEdit) {
      const numValue = parseFloat(editPendingValue.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numValue)) {
        onPendingEdit(numValue);
      }
    }
    setIsEditingPending(false);
  };

  const handlePendingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePendingSave();
    } else if (e.key === 'Escape') {
      setEditPendingValue(pending?.toString() || '0');
      setIsEditingPending(false);
    }
  };

  return (
    <div className={`editable-widget editable-widget--${size}`} style={{ '--widget-color': isWarning ? '#ff3b30' : color } as any}>
      <div className="widget-label">
        {label}
        {sublabel && (
          <span className={`widget-sublabel ${sublabel.includes('⚠️') ? 'widget-sublabel-warning' : ''}`}>
            {' • '}{sublabel}
          </span>
        )}
      </div>
      
      {isEditing ? (
        <div className="widget-edit">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="widget-input"
          />
        </div>
      ) : (
        <div 
          className="widget-value" 
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          {formatCurrency(value)}
        </div>
      )}

      {!isEditing && !showNoPending && pending !== undefined && pending > 0 && !isEditingPending && (
        <div 
          className="widget-pending"
          onClick={(e) => {
            if (onPendingEdit) {
              e.stopPropagation();
              setEditPendingValue(pending.toString());
              setIsEditingPending(true);
            }
          }}
          style={{ cursor: onPendingEdit ? 'pointer' : 'default' }}
          title={onPendingEdit ? 'Click to edit pending' : ''}
        >
          <span className="pending-dot">●</span>
          {formatCurrency(pending)} pending
        </div>
      )}
      
      {!isEditing && isEditingPending && onPendingEdit && (
        <div className="widget-pending-edit">
          <input
            type="text"
            value={editPendingValue}
            onChange={(e) => setEditPendingValue(e.target.value)}
            onKeyDown={handlePendingKeyDown}
            onBlur={handlePendingSave}
            autoFocus
            className="widget-pending-input"
            placeholder="Pending amount"
          />
        </div>
      )}
      
      {!isEditing && showNoPending && (
        <div className="widget-no-pending">
          ✓ No Pending
        </div>
      )}
      
      {!isEditing && onPayFull && (
        <button
          onClick={() => onPayFull()}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 136, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
            e.currentTarget.style.color = '#00ff88';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
          title={`Pay full balance: ${formatCurrency(value + (pending || 0))}`}
        >
          💰 Pay Full
        </button>
      )}

      {!isEditing && onPaidThisMonth && (
        <button
          onClick={onPaidThisMonth}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            background: isPaidThisMonth ? 'rgba(138, 43, 226, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: isPaidThisMonth ? '1px solid rgba(138, 43, 226, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: isPaidThisMonth ? '#8a2be2' : 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.7rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.5)';
            e.currentTarget.style.color = '#8a2be2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isPaidThisMonth ? 'rgba(138, 43, 226, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = isPaidThisMonth ? 'rgba(138, 43, 226, 0.5)' : 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = isPaidThisMonth ? '#8a2be2' : 'rgba(255, 255, 255, 0.7)';
          }}
          title={isPaidThisMonth ? "Clear paid status" : "Mark as paid this month - waiting for next statement"}
        >
          {isPaidThisMonth ? '❌ Clear Paid' : '✅ Paid This Month'}
        </button>
      )}
      
      {!isEditing && isWarning && (
        <div className="widget-warning-message">
          ⚠️ Will go negative
        </div>
      )}
      
      {!isEditing && (
        <div className="widget-edit-hint">Click to edit</div>
      )}
    </div>
  );
}

export default EditableWidget;

