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
}

function EditableWidget({ label, value, onSave, color = '#ffffff', size = 'medium', pending, sublabel, showNoPending, onPendingEdit }: EditableWidgetProps) {
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
      minimumFractionDigits: 0
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
    <div className={`editable-widget editable-widget--${size}`} style={{ '--widget-color': color } as any}>
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
      
      {!isEditing && (
        <div className="widget-edit-hint">Click to edit</div>
      )}
    </div>
  );
}

export default EditableWidget;

