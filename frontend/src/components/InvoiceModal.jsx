import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Printer, Package, CheckCircle, Clock, X } from 'lucide-react';

export default function InvoiceModal({ shipmentId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [shipmentId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/shipments/${shipmentId}/invoice`);
      if (res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Loading printable invoice...
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const symbol = invoice.payment.currency === 'USD' ? '$' : '€';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px', padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', color: '#0f172a', position: 'relative'
      }}>
        {/* Modal Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#2563eb" />
            <span style={{ fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>KINANA Express Invoice</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} /> Print Invoice
            </button>
            <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-invoice">
          {/* Header & Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>OFFICIAL FREIGHT INVOICE</h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Invoice #: <strong>{invoice.invoice_number}</strong></span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Date: {invoice.created_at}</span>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tracking: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{invoice.shipment.tracking_number}</strong></span>
            </div>
          </div>

          {/* Payment Status Banner */}
          <div style={{
            backgroundColor: invoice.payment.is_paid ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${invoice.payment.is_paid ? '#86efac' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block' }}>PAYMENT METHOD</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{invoice.payment.method}</strong>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '800',
                backgroundColor: invoice.payment.is_paid ? '#16a34a' : '#d97706',
                color: 'white',
              }}>
                {invoice.payment.is_paid ? '✓ PAYMENT STATUS: PAID' : '⏳ PAYMENT STATUS: UNPAID'}
              </span>
              {invoice.payment.is_paid && invoice.payment.paid_at && (
                <span style={{ fontSize: '11px', color: '#15803d', display: 'block', marginTop: '4px' }}>
                  Paid on {invoice.payment.paid_at} (Collector: {invoice.payment.collector || 'Driver'})
                </span>
              )}
            </div>
          </div>

          {/* Address Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', display: 'block', marginBottom: '4px' }}>SENDER / PICKUP</span>
              <strong>{invoice.sender.name}</strong><br />
              Phone: {invoice.sender.phone}<br />
              Address: {invoice.sender.address}, {invoice.sender.city}, {invoice.sender.country}
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0891b2', display: 'block', marginBottom: '4px' }}>RECIPIENT / DELIVERY</span>
              <strong>{invoice.recipient.name}</strong><br />
              Phone: {invoice.recipient.phone}<br />
              Address: {invoice.recipient.address}, {invoice.recipient.city}, {invoice.recipient.country}
            </div>
          </div>

          {/* Charge Itemization Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Item Description</th>
                <th style={{ padding: '10px' }}>Quantity / Specs</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px' }}>Base Freight Transport Fee</td>
                <td style={{ padding: '10px' }}>1 Shipment ({invoice.shipment.package_type})</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{symbol}{invoice.breakdown.base_transport_fee}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px' }}>Weight Payload Charge</td>
                <td style={{ padding: '10px' }}>{invoice.shipment.weight_kg} kg</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{symbol}{invoice.breakdown.weight_payload_fee}</td>
              </tr>
              {invoice.breakdown.additional_packages_fee > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>Additional Packages Fee</td>
                  <td style={{ padding: '10px' }}>{invoice.shipment.number_of_packages} packages</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{symbol}{invoice.breakdown.additional_packages_fee}</td>
                </tr>
              )}
              {invoice.breakdown.fragile_handling_surcharge > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>Fragile Cargo Handling Surcharge</td>
                  <td style={{ padding: '10px' }}>Fragile Care</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{symbol}{invoice.breakdown.fragile_handling_surcharge}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', fontSize: '15px' }}>Total Amount ({invoice.payment.method}):</td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', fontSize: '18px', color: '#2563eb' }}>{symbol}{invoice.breakdown.total_amount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
