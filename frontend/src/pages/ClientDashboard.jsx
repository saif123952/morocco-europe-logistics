import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Package, Plus, RefreshCw, Clock, CheckCircle, Truck, XCircle, Search, ArrowRight, MapPin, FileText } from 'lucide-react';
import PaymentBadge from '../components/PaymentBadge';
import InvoiceModal from '../components/InvoiceModal';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shipments');
      setShipments(res.data.shipments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const total = shipments.length;
  const pending = shipments.filter(s => s.status === 'pending').length;
  const assigned = shipments.filter(s => s.status === 'assigned').length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const cancelled = shipments.filter(s => s.status === 'cancelled').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered': return <span className="badge badge-delivered">Delivered</span>;
      case 'in_transit': return <span className="badge badge-in_transit">In Transit</span>;
      case 'assigned': return <span className="badge badge-role">Assigned</span>;
      case 'cancelled': return <span className="badge badge-cancelled">Cancelled</span>;
      default: return <span className="badge badge-pending">Pending</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Client Dashboard</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time status overview of your parcel dispatches and deliveries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/track')} className="btn-secondary">
            <Search size={16} /> Track Package
          </button>
          <button onClick={() => navigate('/create-order')} className="btn-primary">
            <Plus size={18} /> Create Order
          </button>
        </div>
      </div>

      {/* 6 Required Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>TOTAL SHIPMENTS</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{total}</h2>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>PENDING</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '6px' }}>{pending}</h2>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>ASSIGNED</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>{assigned}</h2>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>IN TRANSIT</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>{inTransit}</h2>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>DELIVERED</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>{delivered}</h2>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>CANCELLED</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '6px' }}>{cancelled}</h2>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recent Activity</h3>
          <button onClick={() => navigate('/my-shipments')} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            View All <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ marginRight: '10px' }}></div> Loading recent orders...
          </div>
        ) : shipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Package size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
            <p>No parcel orders created yet. Click "Create Order" to send a package.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Pickup City</th>
                  <th>Recipient / City</th>
                  <th>Specs</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {s.tracking_number}
                      </span>
                    </td>
                    <td>{s.sender_city}</td>
                    <td>
                      <p style={{ fontWeight: 600 }}>{s.recipient_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.recipient_city}</p>
                    </td>
                    <td>{s.weight_kg} kg ({s.package_type})</td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>€{s.price}</td>
                    <td>
                      <PaymentBadge status={s.payment_status} method={s.payment_method} />
                    </td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoiceId(s.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={13} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoiceId && (
        <InvoiceModal
          shipmentId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
