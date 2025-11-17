import './UpcomingPayments.css';

interface Payment {
  date: string;
  type: string;
  amount: number;
}

interface UpcomingPaymentsProps {
  payments: Payment[];
}

function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const getPaymentIcon = (type: string) => {
    if (type.toLowerCase().includes('paycheck')) return '💵';
    if (type.toLowerCase().includes('rent')) return '🏠';
    if (type.toLowerCase().includes('chase') || type.toLowerCase().includes('bofa')) return '💳';
    if (type.toLowerCase().includes('spending')) return '🛒';
    return '💰';
  };

  const isIncome = (type: string) => {
    return type.toLowerCase().includes('paycheck');
  };

  return (
    <div className="upcoming-payments">
      {payments.length === 0 ? (
        <p className="no-payments">No upcoming payments</p>
      ) : (
        <ul className="payments-list">
          {payments.map((payment, index) => (
            <li key={index} className={`payment-item ${isIncome(payment.type) ? 'income' : 'expense'}`}>
              <div className="payment-icon">{getPaymentIcon(payment.type)}</div>
              <div className="payment-details">
                <div className="payment-type">{payment.type}</div>
                <div className="payment-date">{formatDate(payment.date)}</div>
              </div>
              <div className={`payment-amount ${isIncome(payment.type) ? 'positive' : 'negative'}`}>
                {isIncome(payment.type) ? '+' : '-'}{formatCurrency(payment.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UpcomingPayments;




