import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import DriverMap from '../components/DriverMap';
import NearbyShipmentCard from '../components/NearbyShipmentCard';
import RouteStopCard from '../components/RouteStopCard';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';

export default function DriverDashboard() {
  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [availability, setAvailability] = useState('offline');
  const [driverPos, setDriverPos] = useState({ latitude: 39.4699, longitude: -0.3763 }); // Default Valencia
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [paymentShipment, setPaymentShipment] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended', 'nearby', 'tour'
  const [radiusKm, setRadiusKm] = useState(25);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [compatibleOnly, setCompatibleOnly] = useState(false);

  // Lists
  const [recommended, setRecommended] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Fetch driver profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/driver/profile');
      if (res.data.success) {
        const data = res.data.data;
        setProfile(data.user);
        setVehicle(data.vehicle);
        setAvailability(data.user.availability || 'offline');
        if (data.latest_location) {
          setDriverPos({
            latitude: parseFloat(data.latest_location.latitude),
            longitude: parseFloat(data.latest_location.longitude),
          });
          setLastLocationUpdate(data.latest_location.recorded_at);
        }
        if (data.active_route) {
          setActiveRoute(data.active_route);
        }
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    }
  }, []);

  // Fetch recommended & nearby shipments
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Recommended
      const recRes = await api.get('/driver/shipments/recommended', {
        params: {
          latitude: driverPos.latitude,
          longitude: driverPos.longitude,
          radius: radiusKm,
        },
      });
      if (recRes.data.success) {
        setRecommended(recRes.data.data);
      }

      // 2. Nearby
      const nearRes = await api.get('/driver/shipments/nearby', {
        params: {
          latitude: driverPos.latitude,
          longitude: driverPos.longitude,
          radius: radiusKm,
          search: search || undefined,
          city: cityFilter || undefined,
          max_weight: maxWeight || undefined,
          compatible_only: compatibleOnly ? 'true' : 'false',
        },
      });
      if (nearRes.data.success) {
        setNearby(nearRes.data.data);
      }

      // 3. Active Route
      const routeRes = await api.get('/driver/route');
      if (routeRes.data.success) {
        setActiveRoute(routeRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching driver shipments:', err);
    } finally {
      setLoading(false);
    }
  }, [driverPos, radiusKm, search, cityFilter, maxWeight, compatibleOnly]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Geolocation handling
  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsSharingLocation(false);
      setMessage({ type: 'info', text: 'GPS Location sharing paused.' });
    } else {
      if (!navigator.geolocation) {
        setMessage({ type: 'error', text: 'Browser Geolocation is not supported.' });
        return;
      }

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          setDriverPos({ latitude: lat, longitude: lng });
          setLastLocationUpdate(new Date().toLocaleTimeString());

          try {
            await api.post('/driver/location', {
              latitude: lat,
              longitude: lng,
              accuracy: accuracy,
            });
          } catch (err) {
            console.error('Failed to post location update', err);
          }
        },
        (error) => {
          setMessage({ type: 'error', text: `GPS Permission error: ${error.message}` });
          setIsSharingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      setWatchId(id);
      setIsSharingLocation(true);
      setMessage({ type: 'success', text: 'Live GPS location sharing active!' });
    }
  };

  // Availability status toggle
  const handleAvailabilityChange = async (newStatus) => {
    try {
      const res = await api.patch('/driver/availability', { availability: newStatus });
      if (res.data.success) {
        setAvailability(newStatus);
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update availability status.' });
    }
  };

  // Accept shipment handler
  const handleAcceptShipment = async (shipmentId) => {
    try {
      const res = await api.post(`/driver/shipments/${shipmentId}/accept`, {
        latitude: driverPos.latitude,
        longitude: driverPos.longitude,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchProfile();
        fetchShipments();
        setActiveTab('tour'); // Switch to active tour tab
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to accept shipment.';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  // Update stop status handler
  const handleUpdateStopStatus = async (stopId, action) => {
    try {
      const res = await api.patch(`/driver/route/stops/${stopId}/status`, { action });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchProfile();
        fetchShipments();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update stop status.' });
    }
  };

  const currentStops = activeRoute?.stops || [];
  const currentWeightUsed = vehicle?.current_loaded_weight_kg || 0;
  const maxWeightCap = vehicle?.max_weight_kg || 500;
  const weightPct = Math.min(100, Math.round((currentWeightUsed / maxWeightCap) * 100));

  const currentVolumeUsed = vehicle?.current_loaded_volume_m3 || 0;
  const maxVolumeCap = vehicle?.max_volume_m3 || 4.0;
  const volumePct = Math.min(100, Math.round((currentVolumeUsed / maxVolumeCap) * 100));

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Banner Header */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>
            🚛 Driver Logistics Hub
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            GPS Proximity Dispatch & Route Optimization Workspace
          </p>
        </div>

        {/* Status Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Geolocation Button */}
          <button
            onClick={toggleLocationSharing}
            style={{
              padding: '10px 16px',
              backgroundColor: isSharingLocation ? '#22c55e' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isSharingLocation ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
            }}
          >
            <span>{isSharingLocation ? '📡 Live GPS Active' : '📍 Enable GPS Tracking'}</span>
          </button>

          {/* Availability Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
            {['available', 'busy', 'offline'].map((st) => (
              <button
                key={st}
                onClick={() => handleAvailabilityChange(st)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: availability === st ? (st === 'available' ? '#16a34a' : st === 'busy' ? '#d97706' : '#64748b') : 'transparent',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '14px',
          backgroundColor: message.type === 'error' ? '#fee2e2' : message.type === 'success' ? '#dcfce7' : '#e0f2fe',
          color: message.type === 'error' ? '#991b1b' : message.type === 'success' ? '#166534' : '#075985',
          border: `1px solid ${message.type === 'error' ? '#fca5a5' : message.type === 'success' ? '#86efac' : '#7dd3fc'}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Main Grid: Left Map + Right Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
        {/* Left Column: Leaflet Map & Vehicle Load Status */}
        <div>
          {/* Interactive Map */}
          <DriverMap
            driverPos={driverPos}
            radiusKm={radiusKm}
            nearbyShipments={activeTab === 'recommended' ? recommended : nearby}
            stops={currentStops}
            onAcceptShipment={handleAcceptShipment}
            height="540px"
          />

          {/* Vehicle Capacity Bar Widget */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                🚛 Vehicle Load Capacity ({vehicle ? vehicle.vehicle_type.toUpperCase() : 'No Vehicle'})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Reg: <strong>{vehicle ? vehicle.registration_number : 'Unregistered'}</strong>
              </span>
            </div>

            {/* Weight Progress */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Weight Load ({currentWeightUsed} kg / {maxWeightCap} kg)</span>
                <strong style={{ color: weightPct > 90 ? '#ef4444' : '#16a34a' }}>{weightPct}%</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${weightPct}%`, backgroundColor: weightPct > 90 ? '#ef4444' : '#2563eb', transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {/* Volume Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Volume Load ({currentVolumeUsed} m³ / {maxVolumeCap} m³)</span>
                <strong style={{ color: volumePct > 90 ? '#ef4444' : '#16a34a' }}>{volumePct}%</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${volumePct}%`, backgroundColor: volumePct > 90 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Search Controls & Order List */}
        <div>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('recommended')}
              style={{
                flex: 1,
                padding: '10px 8px',
                backgroundColor: activeTab === 'recommended' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'recommended' ? 'white' : '#475569',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ★ Smart Match
            </button>
            <button
              onClick={() => setActiveTab('nearby')}
              style={{
                flex: 1,
                padding: '10px 8px',
                backgroundColor: activeTab === 'nearby' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'nearby' ? 'white' : '#475569',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              📍 Radius Search ({nearby.length})
            </button>
            <button
              onClick={() => setActiveTab('tour')}
              style={{
                flex: 1,
                padding: '10px 8px',
                backgroundColor: activeTab === 'tour' ? '#6366f1' : '#f1f5f9',
                color: activeTab === 'tour' ? 'white' : '#475569',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🗺️ My Tour ({currentStops.length})
            </button>
          </div>

          {/* Search & Radius Filter Panel */}
          {activeTab !== 'tour' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Search Radius ({radiusKm} km)
                  </label>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value={10}>10 km (Local)</option>
                    <option value={25}>25 km (Urban)</option>
                    <option value={50}>50 km (Regional)</option>
                    <option value={200}>200 km (Wide)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    City Filter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Valencia, Rabat"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={compatibleOnly}
                    onChange={(e) => setCompatibleOnly(e.target.checked)}
                  />
                  <span>Compatible with Vehicle Only</span>
                </label>

                <button
                  onClick={fetchShipments}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '700', cursor: 'pointer' }}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          )}

          {/* Tab Contents */}
          <div style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading shipments...</div>
            ) : activeTab === 'recommended' ? (
              recommended.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px' }}>
                  No recommended orders in radius. Try increasing search radius.
                </div>
              ) : (
                recommended.map((item, idx) => (
                  <NearbyShipmentCard
                    key={`rec-${item.shipment.id}-${idx}`}
                    item={item}
                    onAccept={handleAcceptShipment}
                  />
                ))
              )
            ) : activeTab === 'nearby' ? (
              nearby.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px' }}>
                  No nearby orders found.
                </div>
              ) : (
                nearby.map((item, idx) => (
                  <NearbyShipmentCard
                    key={`near-${item.shipment?.id || idx}`}
                    item={item}
                    onAccept={handleAcceptShipment}
                  />
                ))
              )
            ) : (
              /* Tour Stops */
              currentStops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px' }}>
                  No active tour stops. Accept an order to generate a tour route!
                </div>
              ) : (
                currentStops.map((stop) => (
                  <RouteStopCard
                    key={`stop-${stop.id}`}
                    stop={stop}
                    onUpdateStatus={handleUpdateStopStatus}
                    onConfirmPayment={(shp) => setPaymentShipment(shp)}
                  />
                ))
              )
            )}
          </div>
        </div>
      </div>

      {paymentShipment && (
        <ConfirmPaymentModal
          shipment={paymentShipment}
          onClose={() => setPaymentShipment(null)}
          onSuccess={(msg) => {
            setMessage({ type: 'success', text: msg });
            fetchProfile();
            fetchShipments();
          }}
        />
      )}
    </div>
  );
}
