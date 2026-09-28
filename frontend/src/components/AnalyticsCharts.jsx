import React from 'react';

export default function AnalyticsCharts({ dailyTrends = [], countryBreakdown = [], topCities = [] }) {
  const maxRevenue = Math.max(...dailyTrends.map(d => parseFloat(d.daily_revenue || 0)), 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
      {/* 1. Daily Revenue SVG Bar Chart */}
      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass, #334155)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
          📊 Daily Revenue & Order Volume Trends
        </h4>

        {dailyTrends.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>No daily data available yet.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
            {dailyTrends.map((item, idx) => {
              const rev = parseFloat(item.daily_revenue || 0);
              const heightPct = Math.max(10, Math.round((rev / maxRevenue) * 100));

              return (
                <div key={idx} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>${rev}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: '28px',
                    height: `${heightPct}%`,
                    backgroundColor: '#6366f1',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s',
                  }}></div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                    {item.date ? item.date.substring(5) : `D${idx+1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Top Cities Breakdown */}
      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass, #334155)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
          🌐 Top Sender Hub Cities
        </h4>

        {topCities.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>No city data available.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCities.map((c, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f8fafc', marginBottom: '4px' }}>
                  <span>{c.sender_city}</span>
                  <strong style={{ color: '#38bdf8' }}>{c.count} shipments</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, c.count * 20)}%`, backgroundColor: '#38bdf8' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
