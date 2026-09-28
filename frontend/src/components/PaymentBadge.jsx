import React from 'react';

export default function PaymentBadge({ status, method = 'pay_on_pickup', amount, currency = 'EUR' }) {
  const isPaid = status === 'paid';
  const currencySymbol = currency === 'USD' ? '$' : '€';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
        color: isPaid ? '#15803d' : '#b45309',
        border: `1px solid ${isPaid ? '#86efac' : '#fcd34d'}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        {isPaid ? '✓ Paid' : '⏳ Unpaid'} ({method === 'pay_on_pickup' ? 'Pay on Pickup' : method})
      </span>

      {amount !== undefined && (
        <span style={{ fontWeight: '700', fontSize: '12px', color: isPaid ? '#16a34a' : '#d97706' }}>
          {currencySymbol}{amount}
        </span>
      )}
    </div>
  );
}
