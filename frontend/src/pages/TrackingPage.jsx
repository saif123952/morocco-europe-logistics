import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import DriverMap from '../components/DriverMap';
import ShipmentTimeline from '../components/ShipmentTimeline';
import { Search, Package, MapPin, Truck, Clock, ShieldCheck } from 'lucide-react';

export default function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('num') || 'TRK-ES-VLC-MUR');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTracking = async (numToFetch) => {
    if (!numToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/track/${numToFetch.trim()}`);
      if (res.data.success) {
        setTrackingData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Tracking number not found.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const num = searchParams.get('num');
    if (num) {
      setTrackingNumber(num);
      fetchTracking(num);
    } else {
      fetchTracking(trackingNumber);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ num: trackingNumber });
    fetchTracking(trackingNumber);
  };

  const shipment = trackingData?.shipment;
  const liveLocation = trackingData?.driver_live_location;
  const pipelineSteps = trackingData?.pipeline_steps || [];
  const history = trackingData?.timeline_history || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Search Header */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        borderRadius: '16px',
        padding: '32px 24px',
        marginBottom: '28px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800' }}>
          📦 KINANA Live Package Tracker
        </h1>
        <p style={{ margin: '8px 0 20px 0', color: '#94a3b8', fontSize: '14px' }}>
          Real-time GPS dispatch progress, status timeline, and driver ETA
        </p>

        <form onSubmit={handleSearchSubmit} style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (e.g. TRK-ES-VLC-MUR)..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '14px',
                color: '#0f172a',
                fontWeight: '600',
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '14px', fontWeight: '600', marginBottom: '24px', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {trackingData && shipment && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
          {/* Main Info Column */}
          <div>
            {/* Overview Card */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TRACKING NUMBER</span>
                  <h2 style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: '800', color: '#2563eb', fontFamily: 'monospace' }}>
                    {shipment.tracking_number}
                  </h2>
                </div>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  backgroundColor: shipment.status === 'delivered' ? '#dcfce7' : shipment.status === 'in_transit' ? '#dbeafe' : '#fef3c7',
                  color: shipment.status === 'delivered' ? '#15803d' : shipment.status === 'in_transit' ? '#1d4ed8' : '#b45309',
                }}>
                  {shipment.status.replace('_', ' ')}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Route Progress</span>
                  <strong style={{ color: '#0f172a' }}>{trackingData.progress_percentage}%</strong>
                </div>
                <div style={{ height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${trackingData.progress_percentage}%`, backgroundColor: '#2563eb', transition: 'width 0.4s' }}></div>
                </div>
              </div>

              {/* Route Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '700' }}>ORIGIN / SENDER</span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{shipment.sender.city}</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#475569', fontSize: '12px' }}>{shipment.sender.address}</p>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '700' }}>DESTINATION / RECIPIENT</span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{shipment.recipient.city}</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#475569', fontSize: '12px' }}>{shipment.recipient.address}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <ShipmentTimeline
              pipelineSteps={pipelineSteps}
              timelineHistory={history}
            />
          </div>

          {/* Right Column: Driver & Map */}
          <div>
            {/* Live Driver & ETA Widget */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                🚛 Assigned Logistics Courier
              </h3>

              {shipment.driver ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {shipment.driver.name.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{shipment.driver.name}</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Vehicle: {shipment.driver.vehicle?.vehicle_type?.toUpperCase() || 'Van'} ({shipment.driver.vehicle?.registration_number || 'N/A'})
                      </p>
                    </div>
                  </div>

                  {trackingData.estimated_remaining_min !== null && (
                    <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px' }}>
                      <span style={{ color: '#1d4ed8', fontWeight: '700' }}>⏱️ Est. Arrival: ~{trackingData.estimated_remaining_min} mins</span>
                      <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                        Remaining distance: {trackingData.estimated_remaining_km} km
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                  Order pending driver assignment.
                </div>
              )}
            </div>

            {/* Privacy-aware Live Map */}
            {liveLocation ? (
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📡 Live GPS Courier Position</span>
                  {liveLocation.is_approximate && <span style={{ color: '#d97706' }}>🔒 Privacy Approximate Marker</span>}
                </div>
                <DriverMap
                  driverPos={[liveLocation.latitude, liveLocation.longitude]}
                  radiusKm={0}
                  height="340px"
                />
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                Live GPS map will appear when driver starts transportation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
