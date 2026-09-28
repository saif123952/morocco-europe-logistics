import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Package, Search, Filter, Plus, RefreshCw, Eye, CheckCircle, Clock, Truck, XCircle, MapPin, Phone, User, Calendar, X, FileText } from 'lucide-react';
import PaymentBadge from '../components/PaymentBadge';
import InvoiceModal from '../components/InvoiceModal';

const MyShipmentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (location.state?.newTrackingNumber) {
      setNotification(`New order created! Tracking Number: ${location.state.newTrackingNumber}`);
    }
  }, [location]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/shipments', { params });
      setShipments(res.data.shipments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchShipments();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered': return <span className="badge badge-delivered"><CheckCircle size={12} /> Delivered</span>;
      case 'in_transit': return <span className="badge badge-in_transit"><Truck size={12} /> In Transit</span>;
      case 'assigned': return <span className="badge badge-role"><Truck size={12} /> Assigned</span>;
      case 'cancelled': return <span className="badge badge-cancelled"><XCircle size={12} /> Cancelled</span>;
      default: return <span className="badge badge-pending"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>My Shipments</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginTop: '4px' }}>
            View and manage all your parcel orders, status updates, and history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/create-order')} className="btn-primary">
            <Plus size={18} /> New Shipment
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontWeight: 600,
          marginBottom: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notification}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setNotification('')} />
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'assigned', 'in_transit', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={statusFilter === st ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '6px 14px', textTransform: 'capitalize' }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '320px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '0.85rem' }}
                placeholder="Search tracking, city, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ padding: '8px 12px' }}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div className="flex-center" style={{ padding: '50px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ marginRight: '10px' }}></div> Querying shipments database...
          </div>
        ) : shipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <h3>No shipments found</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              No orders matched your active filters. Try searching or create a new shipment.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Pickup Location</th>
                  <th>Recipient / Drop-off</th>
                  <th>Specs</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {s.tracking_number}
                      </span>
                    </td>
                    <td>
                      <p style={{ fontWeight: 600 }}>{s.sender_city}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sender_address}</p>
                    </td>
                    <td>
                      <p style={{ fontWeight: 600 }}>{s.recipient_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.recipient_city} - {s.recipient_phone}</p>
                    </td>
                    <td>
                      <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>{s.package_type}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.weight_kg} kg | {s.number_of_packages} pkg</p>
                    </td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>€{s.price}</td>
                    <td>
                      <PaymentBadge status={s.payment_status} method={s.payment_method} />
                    </td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setSelectedShipment(s)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          <Eye size={13} /> View
                        </button>
                        <button onClick={() => setSelectedInvoiceId(s.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          <FileText size={13} /> Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Modal View */}
      {selectedShipment && (
        <div className="flex-center" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-role" style={{ fontSize: '0.7rem' }}>SHIPMENT DETAILS</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', marginTop: '4px' }}>
                  {selectedShipment.tracking_number}
                </h2>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedShipment(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '6px' }}>SENDER / PICKUP</h4>
                <p style={{ fontWeight: 600 }}>{selectedShipment.sender_name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{selectedShipment.sender_phone}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedShipment.sender_address}, {selectedShipment.sender_city}
                </p>
                {selectedShipment.sender_latitude && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                    GPS: {selectedShipment.sender_latitude}, {selectedShipment.sender_longitude}
                  </p>
                )}
              </div>

              <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', marginBottom: '6px' }}>RECIPIENT / DROP-OFF</h4>
                <p style={{ fontWeight: 600 }}>{selectedShipment.recipient_name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{selectedShipment.recipient_phone}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedShipment.recipient_address}, {selectedShipment.recipient_city}
                </p>
                {selectedShipment.recipient_latitude && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                    GPS: {selectedShipment.recipient_latitude}, {selectedShipment.recipient_longitude}
                  </p>
                )}
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
              <h4 style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: '8px' }}>PACKAGE SPECIFICATIONS & PAYMENT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div><strong>Type:</strong> {selectedShipment.package_type}</div>
                <div><strong>Packages:</strong> {selectedShipment.number_of_packages}</div>
                <div><strong>Weight:</strong> {selectedShipment.weight_kg} kg</div>
                <div><strong>Fragile:</strong> {selectedShipment.is_fragile ? 'Yes' : 'No'}</div>
                <div><strong>Price:</strong> €{selectedShipment.price}</div>
                <div><strong>Status:</strong> {selectedShipment.status}</div>
                <div style={{ gridColumn: 'span 3', marginTop: '4px' }}>
                  <strong>Payment Status: </strong>
                  <PaymentBadge status={selectedShipment.payment_status} method={selectedShipment.payment_method} amount={selectedShipment.price} />
                </div>
              </div>
              {selectedShipment.notes && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: '8px', fontStyle: 'italic' }}>
                  Notes: "{selectedShipment.notes}"
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setSelectedInvoiceId(selectedShipment.id);
                  setSelectedShipment(null);
                }}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                <FileText size={14} style={{ marginRight: '6px' }} /> View Invoice
              </button>
              <button className="btn-primary" onClick={() => setSelectedShipment(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceModal
          shipmentId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
};

export default MyShipmentsPage;
