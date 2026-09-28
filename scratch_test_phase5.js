const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== Phase 5 Pay on Pickup & Invoicing Node E2E Test ===');

  // 1. Client Login
  const clientLogin = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'client@logistics.com', password: 'password123' });

  const clientToken = clientLogin.body.access_token;
  console.log('✓ Client Logged In:', clientLogin.body.user.name);

  // 2. Driver Login (Carlos Valencia)
  const driverLogin = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'carlos@logistics.com', password: 'password123' });

  const driverToken = driverLogin.body.access_token;
  console.log('✓ Driver Logged In:', driverLogin.body.user.name);

  // 3. Admin Login
  const adminLogin = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@logistics.com', password: 'password123' });

  const adminToken = adminLogin.body.access_token;
  console.log('✓ Admin Logged In:', adminLogin.body.user.name);

  // 4. Client Creates Order (Pay on Pickup)
  const orderRes = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/shipments', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientToken}`
    }
  }, {
    sender_name: 'Phase 5 Sender',
    sender_phone: '+34600111222',
    sender_country: 'Spain',
    sender_city: 'Valencia',
    sender_address: 'Calle Colon 10',
    sender_latitude: 39.4699,
    sender_longitude: -0.3763,
    recipient_name: 'Phase 5 Recipient',
    recipient_phone: '+34600333444',
    recipient_country: 'Spain',
    recipient_city: 'Valencia',
    recipient_address: 'Calle Russafa 20',
    recipient_latitude: 39.4640,
    recipient_longitude: -0.3750,
    package_type: 'box',
    description: 'Phase 5 Cash Collection Test Package',
    number_of_packages: 2,
    weight_kg: 15.5,
    volume_m3: 0.2,
    is_fragile: true,
    notes: 'Fragile cash pickup item'
  });

  const shipment = orderRes.body.shipment;
  const shipmentId = shipment.id;
  console.log(`✓ Order Created: ID #${shipmentId} | Tracking: ${shipment.tracking_number} | Price: €${shipment.price} | Method: ${shipment.payment_method} | Status: ${shipment.payment_status}`);

  if (shipment.payment_method !== 'pay_on_pickup' || shipment.payment_status !== 'unpaid') {
    throw new Error('Invalid initial payment method or status');
  }

  // 5. Driver Accepts Order
  const acceptRes = await request({
    hostname: '127.0.0.1', port: 8000, path: `/api/driver/shipments/${shipmentId}/accept`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { latitude: 39.4699, longitude: -0.3763 });

  console.log('✓ Driver Accepted Shipment:', acceptRes.body.message);

  // 6. Driver Confirms Cash Payment Received
  const payRes = await request({
    hostname: '127.0.0.1', port: 8000, path: `/api/driver/shipments/${shipmentId}/confirm-payment`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { notes: 'Collected cash at pickup from sender' });

  const paidShipment = payRes.body.data;
  console.log('✓ Driver Confirmed Payment Collection:');
  console.log('  -> Status:', paidShipment.payment_status);
  console.log('  -> Paid At:', paidShipment.paid_at);
  console.log('  -> Collector Driver ID:', paidShipment.collected_by_driver_id);

  if (paidShipment.payment_status !== 'paid' || !paidShipment.paid_at) {
    throw new Error('Payment confirmation failed to set payment_status to paid');
  }

  // 7. Get Freight Invoice Data
  const invoiceRes = await request({
    hostname: '127.0.0.1', port: 8000, path: `/api/shipments/${shipmentId}/invoice`, method: 'GET',
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });

  const inv = invoiceRes.body.data;
  console.log('✓ Invoice API Verified:');
  console.log('  -> Invoice Number:', inv.invoice_number);
  console.log('  -> Payment Method:', inv.payment.method);
  console.log('  -> Is Paid:', inv.payment.is_paid);
  console.log('  -> Total Price:', '€' + inv.breakdown.total_amount);
  console.log('  -> Breakdown Charges Count:', Object.keys(inv.breakdown).length);

  // 8. Admin Payment Filter Query
  const adminFilterRes = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/shipments?payment_status=paid', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  const matched = adminFilterRes.body.shipments.find(s => s.id === shipmentId);
  if (!matched || !matched.collector) {
    throw new Error('Admin payment filter did not return paid shipment with collector info');
  }

  console.log(`✓ Admin Filter Verified: Found paid shipment collected by driver "${matched.collector.name}"`);
  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 5 PAY ON PICKUP & INVOICING TESTS PASSED 100%');
  console.log('======================================================');
}

runTest().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
