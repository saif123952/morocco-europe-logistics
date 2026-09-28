import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { Shield, Package, Truck, CheckCircle, Clock, RefreshCw, DollarSign, Eye, Search, X, MapPin, UserCheck, AlertTriangle, FileText } from 'lucide-react';
import PaymentBadge from '../components/PaymentBadge';
import InvoiceModal from '../components/InvoiceModal';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'shipments', 'fleet', 'exceptions', 'audit'
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [adminDrivers, setAdminDrivers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
      };
      const [shipmentsRes, driversRes, adminDriversRes, analyticsRes, exceptionsRes, auditRes] = await Promise.all([
        api.get('/shipments', { params }),
        api.get('/drivers'),
        api.get('/admin/drivers'),
        api.get('/admin/analytics'),
        api.get('/admin/exceptions'),
        api.get('/admin/audit-logs'),
      ]);
      setShipments(shipmentsRes.data.shipments || []);
      setDrivers(driversRes.data.drivers || []);
      setAdminDrivers(adminDriversRes.data.data || []);
      setMetrics(analyticsRes.data.data || null);
      setExceptions(exceptionsRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
    } catch (e) {
      console.error('Error loading admin operations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, paymentFilter]);

  const handleAssignDriver = async (shipmentId, driverId) => {
    if (!driverId) return;
    setAssigningId(shipmentId);
    try {
      await api.patch(`/shipments/${shipmentId}/assign-driver`, { driver_id: driverId });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error assigning driver');
    } finally {
      setAssigningId(null);
    }
  };

  const handleResolveException = async (exceptionId) => {
    if (!resolutionNote.trim()) return;
    setResolvingId(exceptionId);
    try {
      await api.patch(`/admin/exceptions/${exceptionId}/resolve`, { resolution_note: resolutionNote });
      setResolutionNote('');
      fetchData();
    } catch (err) {
      alert('Failed to resolve exception issue.');
    } finally {
      setResolvingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered': return <span className="badge badge-delivered">Delivered</span>;
      case 'in_transit': return <span className="badge badge-in_transit">In Transit</span>;
      case 'picked_up': return <span className="badge badge-in_transit">Picked Up</span>;
      case 'pickup_started': return <span className="badge badge-in_transit">En Route Pickup</span>;
      case 'assigned': return <span className="badge badge-role">Assigned</span>;
      case 'cancelled': return <span className="badge badge-cancelled">Cancelled</span>;
      default: return <span className="badge badge-pending">Pending</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Admin Operations Control Center</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginTop: '4px' }}>
            Enterprise logistics monitoring, driver dispatch, exceptions, analytics & audit trail
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw size={16} /> Sync Suite
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem' }}>
          📊 Overview & Analytics
        </button>
        <button onClick={() => setActiveTab('shipments')} className={activeTab === 'shipments' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem' }}>
          <Package size={14} /> Dispatches ({shipments.length})
        </button>
        <button onClick={() => setActiveTab('fleet')} className={activeTab === 'fleet' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem' }}>
          <Truck size={14} /> Fleet & Drivers ({adminDrivers.length})
        </button>
        <button onClick={() => setActiveTab('exceptions')} className={activeTab === 'exceptions' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem' }}>
          <AlertTriangle size={14} /> Exceptions ({exceptions.filter(e => e.status !== 'resolved').length})
        </button>
        <button onClick={() => setActiveTab('audit')} className={activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem' }}>
          <FileText size={14} /> Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div>
          {/* Metrics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>TOTAL SHIPMENTS</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{metrics?.overview?.total_shipments || 0}</h2>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>DELIVERY SUCCESS RATE</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
                {metrics?.overview?.success_rate_pct || 0}%
              </h2>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>IN TRANSIT</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
                {metrics?.overview?.in_transit_count || 0}
              </h2>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>FLEET UTILIZATION</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '6px' }}>
                {metrics?.fleet?.capacity_utilization_pct || 0}%
              </h2>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>TOTAL REVENUE</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                ${metrics?.overview?.total_revenue || 0}
              </h2>
            </div>
          </div>

          <AnalyticsCharts
            dailyTrends={metrics?.daily_trends || []}
            topCities={metrics?.top_cities || []}
          />
        </div>
      )}

      {/* Tab 2: Dispatches & Orders */}
      {activeTab === 'shipments' && (
        <>
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'pending', 'assigned', 'in_transit', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={statusFilter === st ? 'btn-primary' : 'btn-secondary'}
                      style={{ fontSize: '0.8rem', padding: '6px 12px', textTransform: 'capitalize' }}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Payment:</span>
                  {['all', 'paid', 'unpaid'].map((pst) => (
                    <button
                      key={pst}
                      onClick={() => setPaymentFilter(pst)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'capitalize',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: paymentFilter === pst ? (pst === 'paid' ? '#16a34a' : pst === 'unpaid' ? '#d97706' : '#2563eb') : '#334155',
                        color: 'white',
                      }}
                    >
                      {pst}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '0.85rem' }}
                  placeholder="Filter shipments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '18px' }}>Logistics Dispatches & Driver Assignments</h3>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Sender</th>
                    <th>Recipient / Route</th>
                    <th>Specs</th>
                    <th>Price</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Assign Driver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {s.tracking_number}
                      </td>
                      <td>
                        <p style={{ fontWeight: 600 }}>{s.sender_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sender_city}</p>
                      </td>
                      <td>
                        <p style={{ fontWeight: 600 }}>{s.recipient_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sender_city} &rarr; {s.recipient_city}</p>
                      </td>
                      <td>
                        <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>{s.package_type}</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.weight_kg} kg</p>
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>€{s.price}</td>
                      <td>
                        <PaymentBadge status={s.payment_status} method={s.payment_method} />
                        {s.collector && (
                          <p style={{ fontSize: '0.7rem', color: '#86efac', marginTop: '2px' }}>
                            Coll: {s.collector.name}
                          </p>
                        )}
                      </td>
                      <td>{getStatusBadge(s.status)}</td>
                      <td>
                        <select
                          className="input-field"
                          style={{ fontSize: '0.8rem', padding: '4px 8px', width: '140px' }}
                          value={s.driver_id || ''}
                          onChange={(e) => handleAssignDriver(s.id, e.target.value)}
                          disabled={assigningId === s.id}
                        >
                          <option value="">-- Select Driver --</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => setSelectedShipment(s)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setSelectedInvoiceId(s.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            <FileText size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 3: Fleet & Drivers */}
      {activeTab === 'fleet' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '18px' }}>Driver Fleet Status & Capacity Utilization</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Availability</th>
                  <th>Vehicle Specs</th>
                  <th>Capacity Utilization</th>
                  <th>Active Orders</th>
                  <th>Last GPS Reading</th>
                </tr>
              </thead>
              <tbody>
                {adminDrivers.map((d) => {
                  const vehicle = d.vehicle;
                  const loc = d.latest_location;
                  const loadedWeight = vehicle ? vehicle.current_loaded_weight_kg : 0;
                  const maxWeight = vehicle ? vehicle.max_weight_kg : 500;
                  const pct = Math.round((loadedWeight / maxWeight) * 100);

                  return (
                    <tr key={d.id}>
                      <td>
                        <p style={{ fontWeight: 700 }}>{d.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.email} | {d.phone}</p>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          backgroundColor: d.availability === 'available' ? '#dcfce7' : d.availability === 'busy' ? '#fef3c7' : '#f1f5f9',
                          color: d.availability === 'available' ? '#166534' : d.availability === 'busy' ? '#92400e' : '#64748b',
                        }}>
                          {d.availability || 'offline'}
                        </span>
                      </td>
                      <td>
                        {vehicle ? (
                          <div>
                            <strong style={{ textTransform: 'uppercase' }}>{vehicle.vehicle_type}</strong> ({vehicle.registration_number})
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max: {vehicle.max_weight_kg}kg / {vehicle.max_volume_m3}m³</p>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Vehicle Registered</span>
                        )}
                      </td>
                      <td>
                        {vehicle ? (
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{loadedWeight} / {maxWeight} kg ({pct}%)</div>
                            <div style={{ height: '6px', backgroundColor: '#334155', borderRadius: '3px', marginTop: '4px', overflow: 'hidden', width: '120px' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 90 ? '#ef4444' : '#3b82f6' }}></div>
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="badge badge-role">{d.assigned_shipments ? d.assigned_shipments.length : 0} Orders</span>
                      </td>
                      <td>
                        {loc ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <MapPin size={12} color="#38bdf8" style={{ display: 'inline', marginRight: '4px' }} />
                            {parseFloat(loc.latitude).toFixed(4)}, {parseFloat(loc.longitude).toFixed(4)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No GPS Data</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Exceptions Desk */}
      {activeTab === 'exceptions' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '18px' }}>⚠️ Driver Reported Issues & Exceptions</h3>
          {exceptions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>No exceptions reported.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {exceptions.map((ex) => (
                <div key={ex.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#ef4444', fontSize: '14px', textTransform: 'uppercase' }}>
                      {ex.issue_type.replace('_', ' ')}
                    </span>
                    <span className="badge" style={{ backgroundColor: ex.status === 'resolved' ? '#dcfce7' : '#fee2e2', color: ex.status === 'resolved' ? '#166534' : '#991b1b' }}>
                      {ex.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', margin: '8px 0', color: 'var(--text-sub)' }}>
                    <strong>Tracking #:</strong> {ex.shipment?.tracking_number} | <strong>Driver:</strong> {ex.driver?.name}
                  </div>
                  <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>{ex.description}</p>
                  {ex.status !== 'resolved' && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Resolution note..."
                        className="input-field"
                        style={{ fontSize: '0.8rem', flex: 1 }}
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                      />
                      <button
                        onClick={() => handleResolveException(ex.id)}
                        disabled={resolvingId === ex.id}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        {resolvingId === ex.id ? 'Resolving...' : 'Resolve Issue'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '18px' }}>📜 Administrative Action Audit Trail</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Type / ID</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <strong>{log.actor?.name || log.actor_role}</strong> ({log.actor_role})
                    </td>
                    <td style={{ color: '#38bdf8', fontWeight: 600 }}>{log.action}</td>
                    <td>{log.target_type} #{log.target_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {selectedShipment && (
        <div className="flex-center" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-role" style={{ fontSize: '0.7rem' }}>ADMIN INSPECTOR</span>
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
              </div>

              <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', marginBottom: '6px' }}>RECIPIENT / DROP-OFF</h4>
                <p style={{ fontWeight: 600 }}>{selectedShipment.recipient_name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{selectedShipment.recipient_phone}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedShipment.recipient_address}, {selectedShipment.recipient_city}
                </p>
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
              <h4 style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: '8px' }}>FINANCIAL & PAYMENT INFORMATION</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div><strong>Amount:</strong> €{selectedShipment.price}</div>
                <div><strong>Method:</strong> Pay on Pickup</div>
                <div>
                  <strong>Status: </strong>
                  <PaymentBadge status={selectedShipment.payment_status} method={selectedShipment.payment_method} />
                </div>
                {selectedShipment.collector && (
                  <div><strong>Collected By:</strong> {selectedShipment.collector.name}</div>
                )}
                {selectedShipment.paid_at && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Collected At:</strong> {new Date(selectedShipment.paid_at).toLocaleString()}
                  </div>
                )}
              </div>
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
                <FileText size={14} style={{ marginRight: '6px' }} /> View Printable Invoice
              </button>
              <button className="btn-primary" onClick={() => setSelectedShipment(null)}>
                Close Window
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

export default AdminDashboard;
