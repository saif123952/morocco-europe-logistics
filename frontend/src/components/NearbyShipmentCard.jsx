import React, { useState } from 'react';

export default function NearbyShipmentCard({ item, onAccept, onReject }) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const shipment = item.shipment || item;
  const distance = item.distance_km ?? item.distance_to_pickup_km ?? 0;
  const score = item.match_score ?? null;
  const isOverCapacity = item.is_over_capacity || false;
  const etaPickup = item.eta_pickup_min ?? item.estimated_pickup_eta_min ?? Math.round((distance / 45) * 60);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(shipment.id);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (sc) => {
    if (sc >= 75) return '#10b981'; // green
    if (sc >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '12px',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>
              📦 {shipment.tracking_number}
            </span>
            {shipment.is_fragile && (
              <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                FRAGILE
              </span>
            )}
            {isOverCapacity ? (
              <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid #fca5a5' }}>
                ⚠️ OVER CAPACITY
              </span>
            ) : (
              <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                ✓ FITS VEHICLE
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            <strong>{shipment.sender_city}</strong> ({shipment.sender_address})
            <span style={{ margin: '0 6px', color: '#94a3b8' }}>➔</span>
            <strong>{shipment.recipient_city}</strong> ({shipment.recipient_address})
          </div>
        </div>

        {score !== null && (
          <div style={{
            backgroundColor: `${getScoreColor(score)}15`,
            color: getScoreColor(score),
            fontWeight: '800',
            fontSize: '14px',
            padding: '4px 10px',
            borderRadius: '20px',
            border: `1px solid ${getScoreColor(score)}40`,
            textAlign: 'center',
          }}>
            {score}% Match
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginTop: '12px',
        padding: '10px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '12px',
      }}>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Pickup Distance</span>
          <strong style={{ color: '#0f172a' }}>{distance} km</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Pickup ETA</span>
          <strong style={{ color: '#0f172a' }}>~{etaPickup} min</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Weight / Vol</span>
          <strong style={{ color: '#0f172a' }}>{shipment.weight_kg}kg / {shipment.volume_m3}m³</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Payout</span>
          <strong style={{ color: '#16a34a' }}>${shipment.price}</strong>
        </div>
      </div>

      {item.explanations && item.explanations.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '500' }}
          >
            {showDetails ? 'Hide Matching Analysis ▲' : 'View Matching Analysis ▼'}
          </button>
          {showDetails && (
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#475569' }}>
              {item.explanations.map((exp, idx) => (
                <li key={idx} style={{ marginBottom: '2px' }}>{exp}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button
          onClick={handleAccept}
          disabled={loading || isOverCapacity}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: isOverCapacity ? '#cbd5e1' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: isOverCapacity ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {loading ? 'Processing...' : isOverCapacity ? 'Over Capacity' : '✓ Accept Order'}
        </button>

        {onReject && (
          <button
            onClick={() => onReject(shipment.id)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Ignore
          </button>
        )}
      </div>
    </div>
  );
}
