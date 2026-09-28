import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function DriverProfilePage() {
  const [profile, setProfile] = useState(null);
  const [vehicleType, setVehicleType] = useState('van');
  const [regNumber, setRegNumber] = useState('');
  const [maxWeight, setMaxWeight] = useState(500);
  const [maxVolume, setMaxVolume] = useState(4.0);
  const [availability, setAvailability] = useState('offline');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/driver/profile');
      if (res.data.success) {
        const data = res.data.data;
        setProfile(data.user);
        setAvailability(data.user.availability || 'offline');
        if (data.vehicle) {
          setVehicleType(data.vehicle.vehicle_type);
          setRegNumber(data.vehicle.registration_number);
          setMaxWeight(data.vehicle.max_weight_kg);
          setMaxVolume(data.vehicle.max_volume_m3);
        }
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.post('/driver/vehicle', {
        vehicle_type: vehicleType,
        registration_number: regNumber,
        max_weight_kg: parseFloat(maxWeight),
        max_volume_m3: parseFloat(maxVolume),
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Vehicle information updated successfully!' });
        fetchProfile();
      }
    } catch (err) {
      const errText = err.response?.data?.message || 'Failed to update vehicle details.';
      setMessage({ type: 'error', text: errText });
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityToggle = async (status) => {
    try {
      const res = await api.patch('/driver/availability', { availability: status });
      if (res.data.success) {
        setAvailability(status);
        setMessage({ type: 'success', text: `Availability status set to ${status}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update availability status.' });
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading driver profile...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>
          🚚 Driver Profile & Vehicle Specs
        </h1>
        <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Configure vehicle dimensions, weight limits, and availability state
        </p>
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

      {/* Driver Identity Card */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
          Driver Account Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Full Name</span>
            <strong>{profile?.name}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Email Address</span>
            <strong>{profile?.email}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Phone Number</span>
            <strong>{profile?.phone || 'Not set'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Availability Status</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {['available', 'busy', 'offline'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleAvailabilityToggle(st)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    backgroundColor: availability === st ? (st === 'available' ? '#16a34a' : st === 'busy' ? '#d97706' : '#64748b') : 'white',
                    color: availability === st ? 'white' : '#475569',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Specs Form */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
          Vehicle Information & Capacity
        </h3>

        <form onSubmit={handleSaveVehicle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              >
                <option value="van">Van / Delivery Minivan</option>
                <option value="truck">Truck / Freight Lorry</option>
                <option value="motorcycle">Motorcycle / Scooter</option>
                <option value="car">Passenger Car</option>
                <option value="bicycle">Cargo Bicycle</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Registration Number / Plate
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. 7849-VLC or CAS-88492"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Maximum Payload Weight (kg)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Maximum Payload Volume (m³)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={maxVolume}
                onChange={(e) => setMaxVolume(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Vehicle Specification'}
          </button>
        </form>
      </div>
    </div>
  );
}
