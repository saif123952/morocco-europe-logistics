import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import MapPicker from '../components/MapPicker';
import { Package, User, Phone, MapPin, Calendar, Check, ArrowRight, ArrowLeft, Shield, DollarSign, Layers, Info, Mail, Search, PlusCircle, UserPlus, FileText } from 'lucide-react';

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestSuccessData, setGuestSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    // Step 1: Sender (prefill if authenticated user)
    sender_name: user?.name || '',
    sender_phone: user?.phone || '',
    sender_email: user?.email || '',
    sender_country: 'Spain',
    sender_city: 'Valencia',
    sender_address: '',
    sender_latitude: '39.4699',
    sender_longitude: '-0.3763',

    // Step 2: Recipient
    recipient_name: '',
    recipient_phone: '',
    recipient_country: 'Spain',
    recipient_city: 'Valencia',
    recipient_address: '',
    recipient_latitude: '39.4640',
    recipient_longitude: '-0.3750',

    // Step 3: Package Specs
    package_type: 'box',
    description: '',
    number_of_packages: 1,
    weight_kg: 2.5,
    volume_m3: 0.05,
    is_fragile: false,
    pickup_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    notes: '',
  });

  // Calculate estimated price
  const calculatePrice = () => {
    const weight = parseFloat(formData.weight_kg) || 1;
    const qty = parseInt(formData.number_of_packages) || 1;
    const base = 15.0;
    const weightFee = weight * 3.5;
    const qtyFee = (qty - 1) * 5.0;
    const fragileFee = formData.is_fragile ? 12.0 : 0.0;
    return (base + weightFee + qtyFee + fragileFee).toFixed(2);
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    // Validation per step
    if (step === 1) {
      if (!formData.sender_name || !formData.sender_phone || !formData.sender_address) {
        setError('Please complete all required sender fields.');
        return;
      }
    } else if (step === 2) {
      if (!formData.recipient_name || !formData.recipient_phone || !formData.recipient_address) {
        setError('Please complete all required recipient fields.');
        return;
      }
    } else if (step === 3) {
      if (!formData.weight_kg || formData.weight_kg <= 0) {
        setError('Please enter a valid package weight.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (user) {
        // Authenticated client submit
        const res = await api.post('/shipments', formData);
        navigate('/my-shipments', { state: { newTrackingNumber: res.data.shipment.tracking_number } });
      } else {
        // Unauthenticated guest submit
        const res = await api.post('/guest/shipments', formData);
        setGuestSuccessData({
          tracking_number: res.data.tracking_number,
          price: calculatePrice(),
          payment_method: 'Pay on Pickup',
          payment_status: 'unpaid',
          status: res.data.status || 'pending',
          sender_name: formData.sender_name,
          sender_phone: formData.sender_phone,
          sender_email: formData.sender_email,
          sender_city: formData.sender_city,
          recipient_city: formData.recipient_city,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting order. Please verify all inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Render Guest Order Success Confirmation Screen
  if (guestSuccessData) {
    return (
      <div style={{ maxWidth: '720px', margin: '30px auto', padding: '0 16px' }}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: '#dcfce7', color: '#166534',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto', boxShadow: '0 0 25px rgba(34, 197, 94, 0.4)'
          }}>
            <Check size={40} />
          </div>

          <span className="badge badge-delivered" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            ✓ GUEST SHIPMENT CREATED
          </span>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '12px', marginBottom: '8px' }}>
            Shipment Created Successfully!
          </h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', marginBottom: '28px' }}>
            Your parcel dispatch order has been registered in the logistics dispatch system.
          </p>

          {/* Tracking Callout Box */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '2px dashed var(--primary)',
            borderRadius: '14px',
            padding: '24px',
            marginBottom: '28px',
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
              YOUR UNIQUE TRACKING NUMBER
            </p>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', margin: '8px 0' }}>
              {guestSuccessData.tracking_number}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
              Save this tracking number or use your phone number (<strong>{guestSuccessData.sender_phone}</strong>) to check live progress anytime.
            </p>
          </div>

          {/* Shipment Summary Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px',
            padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)',
            borderRadius: '12px', border: '1px solid var(--border-glass)',
            textAlign: 'left', fontSize: '0.85rem', marginBottom: '32px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>PAYMENT METHOD</span>
              <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>Pay on Pickup</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: ⏳ Unpaid (€{guestSuccessData.price})</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>CURRENT STATUS</span>
              <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>Pending Dispatch</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting Driver Assignment</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>ROUTE SEQUENCE</span>
              <strong style={{ color: '#34d399', fontSize: '1rem' }}>{guestSuccessData.sender_city} &rarr; {guestSuccessData.recipient_city}</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact: {guestSuccessData.sender_name}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/track?tracking=${guestSuccessData.tracking_number}`)}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Search size={16} /> Track Shipment Live
            </button>

            <button
              onClick={() => {
                setGuestSuccessData(null);
                setStep(1);
              }}
              className="btn-secondary"
              style={{ padding: '12px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <PlusCircle size={16} /> Create Another Shipment
            </button>

            <button
              onClick={() => navigate('/register', { state: { email: guestSuccessData.sender_email, phone: guestSuccessData.sender_phone } })}
              style={{
                padding: '12px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid #6366f1',
                borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              <UserPlus size={16} /> Create an Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
          {user ? 'Create New Shipment' : 'Create a Shipment (Guest Checkout)'}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', marginTop: '6px' }}>
          {user
            ? 'Complete the 4-step wizard to book a parcel pickup and delivery'
            : 'No login required! Book a shipment immediately and pay cash on pickup.'}
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '36px',
        position: 'relative'
      }}>
        {[
          { num: 1, label: 'Sender Info' },
          { num: 2, label: 'Recipient Info' },
          { num: 3, label: 'Package Specs' },
          { num: 4, label: 'Review & Book' },
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: step >= s.num ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.06)',
              border: step >= s.num ? 'none' : '1px solid var(--border-glass)',
              color: '#fff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              boxShadow: step === s.num ? '0 0 20px var(--primary-glow)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step > s.num ? <Check size={20} /> : s.num}
            </div>
            <span style={{ fontSize: '0.8rem', marginTop: '8px', color: step >= s.num ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: step === s.num ? 700 : 400 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#f87171',
          fontSize: '0.88rem',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Step Forms */}
      <div className="glass-card" style={{ padding: '32px' }}>
        {step === 1 && (
          <form onSubmit={handleNext}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User color="var(--primary)" /> Step 1: Sender Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Sender Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>

              <div className="form-group">
                <label>Sender Phone Number *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.sender_phone}
                  onChange={(e) => setFormData({ ...formData, sender_phone: e.target.value })}
                  placeholder="+34 600-000000"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Sender Email Address (Optional - for order updates & account linking)</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="sender@example.com"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Country *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.sender_country}
                  onChange={(e) => setFormData({ ...formData, sender_country: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>City *</label>
                <select
                  className="input-field"
                  value={formData.sender_city}
                  onChange={(e) => setFormData({ ...formData, sender_city: e.target.value })}
                >
                  <option value="Valencia">Valencia (Spain)</option>
                  <option value="Madrid">Madrid (Spain)</option>
                  <option value="Barcelona">Barcelona (Spain)</option>
                  <option value="Alicante">Alicante (Spain)</option>
                  <option value="Murcia">Murcia (Spain)</option>
                  <option value="Casablanca">Casablanca (Morocco)</option>
                  <option value="Rabat">Rabat (Morocco)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Pickup Street Address *</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.sender_address}
                onChange={(e) => setFormData({ ...formData, sender_address: e.target.value })}
                placeholder="Street address, building number..."
              />
            </div>

            {/* Interactive Map Picker */}
            <MapPicker
              city={formData.sender_city}
              lat={formData.sender_latitude}
              lng={formData.sender_longitude}
              label="Select Pickup Location on Map (GPS)"
              onSelectLocation={(lat, lng) => setFormData(prev => ({ ...prev, sender_latitude: lat, sender_longitude: lng }))}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
              <button type="submit" className="btn-primary">
                Next: Recipient Info <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNext}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User color="var(--accent-cyan)" /> Step 2: Recipient Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="Recipient Name"
                />
              </div>

              <div className="form-group">
                <label>Recipient Phone Number *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.recipient_phone}
                  onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                  placeholder="+34 600-000000"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Destination Country *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.recipient_country}
                  onChange={(e) => setFormData({ ...formData, recipient_country: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Destination City *</label>
                <select
                  className="input-field"
                  value={formData.recipient_city}
                  onChange={(e) => setFormData({ ...formData, recipient_city: e.target.value })}
                >
                  <option value="Valencia">Valencia (Spain)</option>
                  <option value="Madrid">Madrid (Spain)</option>
                  <option value="Barcelona">Barcelona (Spain)</option>
                  <option value="Alicante">Alicante (Spain)</option>
                  <option value="Murcia">Murcia (Spain)</option>
                  <option value="Casablanca">Casablanca (Morocco)</option>
                  <option value="Rabat">Rabat (Morocco)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Delivery Street Address *</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.recipient_address}
                onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                placeholder="Destination address, floor, apartment..."
              />
            </div>

            {/* Map Picker for Destination */}
            <MapPicker
              city={formData.recipient_city}
              lat={formData.recipient_latitude}
              lng={formData.recipient_longitude}
              label="Select Destination Location on Map (GPS)"
              onSelectLocation={(lat, lng) => setFormData(prev => ({ ...prev, recipient_latitude: lat, recipient_longitude: lng }))}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={18} /> Back
              </button>
              <button type="submit" className="btn-primary">
                Next: Package Specs <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleNext}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package color="#f59e0b" /> Step 3: Package Specifications
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Package Type *</label>
                <select
                  className="input-field"
                  value={formData.package_type}
                  onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                >
                  <option value="box">Standard Box / Carton</option>
                  <option value="parcel">Small Parcel</option>
                  <option value="document">Legal Documents / Envelope</option>
                  <option value="fragile">Fragile Goods</option>
                  <option value="heavy">Heavy Machinery / Industrial</option>
                  <option value="pallet">Palletized Freight</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of Packages *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  value={formData.number_of_packages}
                  onChange={(e) => setFormData({ ...formData, number_of_packages: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Total Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  className="input-field"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0.1 })}
                />
              </div>

              <div className="form-group">
                <label>Total Volume (m³) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  value={formData.volume_m3}
                  onChange={(e) => setFormData({ ...formData, volume_m3: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_fragile}
                  onChange={(e) => setFormData({ ...formData, is_fragile: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>This shipment contains fragile items (+€12 handling surcharge)</span>
              </label>
            </div>

            <div className="form-group">
              <label>Package Description & Special Instructions</label>
              <textarea
                className="input-field"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Glassware, handle with care. Gate code #1234."
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={18} /> Back
              </button>
              <button type="submit" className="btn-primary">
                Next: Review Quote <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield color="#34d399" /> Step 4: Order Summary & Price Quote
            </h3>

            {/* Price Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid var(--border-active)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '28px'
            }}>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL ESTIMATED COST</p>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                €{calculatePrice()}
              </h1>
              <span className="badge badge-role" style={{ marginTop: '8px' }}>Pay Cash on Pickup</span>
            </div>

            {/* Detailed Review Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '8px', fontSize: '0.9rem' }}>PICKUP / SENDER</h4>
                <p style={{ fontWeight: 600 }}>{formData.sender_name}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>{formData.sender_phone}</p>
                {formData.sender_email && (
                  <p style={{ fontSize: '0.82rem', color: '#818cf8' }}>{formData.sender_email}</p>
                )}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formData.sender_address}, {formData.sender_city}, {formData.sender_country}
                </p>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '8px', fontSize: '0.9rem' }}>DROP-OFF / RECIPIENT</h4>
                <p style={{ fontWeight: 600 }}>{formData.recipient_name}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>{formData.recipient_phone}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formData.recipient_address}, {formData.recipient_city}, {formData.recipient_country}
                </p>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '28px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '0.9rem' }}>CARGO SPECIFICATIONS</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong>Type:</strong> {formData.package_type}</div>
                <div><strong>Quantity:</strong> {formData.number_of_packages} pkg</div>
                <div><strong>Total Weight:</strong> {formData.weight_kg} kg</div>
                <div><strong>Fragile:</strong> {formData.is_fragile ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={18} /> Back
              </button>
              <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <div className="spinner"></div> : <>Confirm & Book Order <Check size={18} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateOrderPage;
