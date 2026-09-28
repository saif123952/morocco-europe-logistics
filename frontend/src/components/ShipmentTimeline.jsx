import React from 'react';

export default function ShipmentTimeline({ pipelineSteps = [], timelineHistory = [] }) {
  const getActorColor = (role) => {
    switch (role) {
      case 'admin': return '#818cf8';
      case 'driver': return '#38bdf8';
      case 'client': return '#34d399';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
        📍 Order Status Pipeline
      </h3>

      {/* Horizontal Pipeline Steps */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        marginBottom: '28px',
        padding: '0 10px',
      }}>
        {/* Progress Background Line */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '30px',
          right: '30px',
          height: '4px',
          backgroundColor: '#e2e8f0',
          zIndex: 1,
        }}></div>

        {pipelineSteps.map((step, idx) => (
          <div key={idx} style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step.completed ? '#16a34a' : '#f1f5f9',
              color: step.completed ? 'white' : '#94a3b8',
              border: `2px solid ${step.completed ? '#16a34a' : '#cbd5e1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '13px',
              margin: '0 auto',
              boxShadow: step.completed ? '0 0 8px rgba(22, 163, 74, 0.4)' : 'none',
            }}>
              {step.completed ? '✓' : idx + 1}
            </div>
            <span style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: step.completed ? '700' : '500',
              color: step.completed ? '#0f172a' : '#64748b',
              marginTop: '6px',
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#334155' }}>
        📜 Detailed Timeline History
      </h4>

      {timelineHistory.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: '13px' }}>No timeline history recorded yet.</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #cbd5e1' }}>
          {timelineHistory.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-26px',
                top: '4px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', textTransform: 'capitalize' }}>
                  {item.new_status ? item.new_status.replace('_', ' ') : 'Updated'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {item.comment}
              </div>
              {item.actor && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Actor: <span style={{ fontWeight: '600', color: getActorColor(item.actor.role || item.actor_role) }}>
                    {item.actor.name || item.actor_role} ({item.actor.role || item.actor_role})
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
