import React, { useState } from 'react';

export default function RouteStopCard({ stop, onUpdateStatus, onConfirmPayment }) {
  const [loading, setLoading] = useState(false);
  const shipment = stop.shipment || {};
  const isPickup = stop.stop_type === 'pickup';
  const currencySymbol = shipment.currency === 'USD' ? '$' : '€';
  const isPaid = shipment.payment_status === 'paid';

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await onUpdateStatus(stop.id, action);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (stop.status) {
      case 'completed':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>✓ Completed</span>;
      case 'arrived':
        return <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>● En Route / Arrived</span>;
      case 'skipped':
        return <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Skipped</span>;
      default:
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Pending</span>;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      border: `2px solid ${isPickup ? '#ffedd5' : '#dcfce7'}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isPickup ? '#f97316' : '#10b981',
            color: 'white',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
          }}>
            {stop.stop_order}
          </div>
          <div>
            <span style={{
              fontWeight: '700',
              fontSize: '13px',
              color: isPickup ? '#c2410c' : '#047857',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isPickup ? '🛫 PICKUP STOP' : '🛬 DELIVERY STOP'}
            </span>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
              {shipment.tracking_number}
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Payment Banner for Pickup Stops */}
      {isPickup && (
        <div style={{
          backgroundColor: isPaid ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${isPaid ? '#86efac' : '#fcd34d'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          margin: '10px 0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}>
          <div>
            <span style={{ color: '#64748b' }}>Payment on Pickup: </span>
            <strong style={{ color: isPaid ? '#15803d' : '#b45309', fontSize: '13px' }}>
              {currencySymbol}{shipment.price}
            </strong>
          </div>
          <span style={{
            fontWeight: '700',
            color: isPaid ? '#15803d' : '#d97706',
            backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
          }}>
            {isPaid ? '✓ PAID CASH' : '⏳ UNPAID (COLLECT CASH)'}
          </span>
        </div>
      )}

      <div style={{ fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
        <div><strong>Contact:</strong> {isPickup ? shipment.sender_name : shipment.recipient_name} ({isPickup ? shipment.sender_phone : shipment.recipient_phone})</div>
        <div style={{ marginTop: '4px' }}><strong>City/Address:</strong> {stop.city} — {stop.address}</div>
        <div style={{ marginTop: '4px' }}><strong>Package:</strong> {shipment.description || 'Standard Cargo'} ({shipment.weight_kg}kg / {shipment.volume_m3}m³)</div>
        {stop.estimated_arrival && (
          <div style={{ marginTop: '4px', color: '#6366f1' }}>
            <strong>Est. Arrival:</strong> {new Date(stop.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {stop.status !== 'completed' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {isPickup && !isPaid && onConfirmPayment && (
            <button
              onClick={() => onConfirmPayment(shipment)}
              style={{ flex: '1 1 100%', padding: '8px 14px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              💶 Confirm Payment Received ({currencySymbol}{shipment.price})
            </button>
          )}

          {isPickup && stop.status === 'pending' && (
            <button
              onClick={() => handleAction('start_pickup')}
              disabled={loading}
              style={{ flex: 1, padding: '8px 14px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              {loading ? 'Updating...' : 'Start Pickup'}
            </button>
          )}

          {isPickup && (stop.status === 'arrived' || shipment.status === 'pickup_started') && (
            <button
              onClick={() => handleAction('confirm_pickup')}
              disabled={loading}
              style={{ flex: 1, padding: '8px 14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              {loading ? 'Updating...' : '✓ Confirm Pickup'}
            </button>
          )}

          {!isPickup && stop.status === 'pending' && (
            <button
              onClick={() => handleAction('start_delivery')}
              disabled={loading}
              style={{ flex: 1, padding: '8px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              {loading ? 'Updating...' : 'Start Delivery'}
            </button>
          )}

          {!isPickup && (stop.status === 'arrived' || shipment.status === 'in_transit') && (
            <button
              onClick={() => handleAction('confirm_delivery')}
              disabled={loading}
              style={{ flex: 1, padding: '8px 14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              {loading ? 'Updating...' : '✓ Confirm Delivery'}
            </button>
          )}

          <button
            onClick={() => handleAction('cancel_shipment')}
            disabled={loading}
            style={{ padding: '8px 12px', backgroundColor: '#f87171', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '12px' }}
          >
            Release
          </button>
        </div>
      )}
    </div>
  );
}
