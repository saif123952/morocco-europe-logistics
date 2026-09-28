import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import DriverMap from '../components/DriverMap';
import RouteStopCard from '../components/RouteStopCard';
import ProofOfDeliveryModal from '../components/ProofOfDeliveryModal';
import ReportIssueModal from '../components/ReportIssueModal';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';

export default function DriverTourPage() {
  const [route, setRoute] = useState(null);
  const [driverPos, setDriverPos] = useState({ latitude: 39.4699, longitude: -0.3763 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modals
  const [podStop, setPodStop] = useState(null);
  const [issueShipmentId, setIssueShipmentId] = useState(null);
  const [paymentShipment, setPaymentShipment] = useState(null);

  const fetchRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/driver/route');
      if (res.data.success) {
        setRoute(res.data.data);
      }
      const profRes = await api.get('/driver/profile');
      if (profRes.data.success && profRes.data.data.latest_location) {
        setDriverPos({
          latitude: parseFloat(profRes.data.data.latest_location.latitude),
          longitude: parseFloat(profRes.data.data.latest_location.longitude),
        });
      }
    } catch (err) {
      console.error('Error fetching driver tour route:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const handleUpdateStopStatus = async (stopId, action) => {
    const stopObj = route?.stops?.find(s => s.id === stopId);

    // If confirming delivery, pop up Proof of Delivery Modal
    if (action === 'confirm_delivery' && stopObj) {
      setPodStop(stopObj);
      return;
    }

    try {
      const res = await api.patch(`/driver/route/stops/${stopId}/status`, { action });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchRoute();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update stop status.' });
    }
  };

  const handleConfirmPOD = async (podData) => {
    if (!podStop) return;
    try {
      const res = await api.patch(`/driver/route/stops/${podStop.id}/status`, {
        action: 'confirm_delivery',
        ...podData,
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setPodStop(null);
        fetchRoute();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to confirm delivery.' });
    }
  };

  const handleReoptimizeRoute = async () => {
    try {
      const res = await api.post('/driver/route/generate', {
        latitude: driverPos.latitude,
        longitude: driverPos.longitude,
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Route successfully re-optimized!' });
        setRoute(res.data.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reoptimize route.' });
    }
  };

  const stops = route?.stops || [];
  const completedStops = stops.filter((s) => s.status === 'completed').length;
  const progressPct = stops.length > 0 ? Math.round((completedStops / stops.length) * 100) : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{
        backgroundColor: '#4f46e5',
        color: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>
            🗺️ Active Delivery Tour
          </h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
            Multi-stop optimized route sequence, cash collection & execution
          </p>
        </div>

        <button
          onClick={handleReoptimizeRoute}
          style={{
            padding: '10px 18px',
            backgroundColor: 'white',
            color: '#4f46e5',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ⚡ Re-Optimize Sequence
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: message.type === 'error' ? '#991b1b' : '#166534',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          {message.text}
        </div>
      )}

      {/* Tour Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Stops</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stops.length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Distance</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>{route?.total_distance_km || 0} km</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Est. Duration</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706' }}>~{route?.estimated_duration_min || 0} min</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Tour Progress</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>{progressPct}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '24px' }}>
        {/* Map Column */}
        <div>
          <DriverMap
            driverPos={driverPos}
            radiusKm={0}
            stops={stops}
            height="600px"
          />
        </div>

        {/* Stops Sequence Column */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
            Stops Sequence ({completedStops}/{stops.length} completed)
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading route stops...</div>
          ) : stops.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '40px', textAlign: 'center', borderRadius: '12px', color: '#94a3b8' }}>
              No stops scheduled in active tour. Accept shipments from the Driver Hub!
            </div>
          ) : (
            stops.map((stop) => (
              <div key={stop.id}>
                <RouteStopCard
                  stop={stop}
                  onUpdateStatus={handleUpdateStopStatus}
                  onConfirmPayment={(shp) => setPaymentShipment(shp)}
                />
                <button
                  onClick={() => setIssueShipmentId(stop.shipment_id)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', marginBottom: '12px', marginTop: '-4px', fontWeight: '600' }}
                >
                  ⚠️ Report Issue on this stop
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cash Payment Modal */}
      {paymentShipment && (
        <ConfirmPaymentModal
          shipment={paymentShipment}
          onClose={() => setPaymentShipment(null)}
          onSuccess={(msg) => {
            setMessage({ type: 'success', text: msg });
            fetchRoute();
          }}
        />
      )}

      {/* Proof of Delivery Modal */}
      {podStop && (
        <ProofOfDeliveryModal
          stop={podStop}
          onConfirm={handleConfirmPOD}
          onClose={() => setPodStop(null)}
        />
      )}

      {/* Report Exception Issue Modal */}
      {issueShipmentId && (
        <ReportIssueModal
          shipmentId={issueShipmentId}
          onClose={() => setIssueShipmentId(null)}
          onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
        />
      )}
    </div>
  );
}
