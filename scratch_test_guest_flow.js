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

async function runGuestTest() {
  console.log('=== Guest Checkout & Account Linking Automated E2E Test ===');

  const randomPhone = '+346' + Math.floor(10000000 + Math.random() * 90000000);
  const randomEmail = `guest_${Date.now()}@example.com`;

  // 1. Guest Visitor Creates Shipment (Unauthenticated)
  console.log('\n[Step 1] Guest Visitor Submits Order (POST /api/guest/shipments)...');
  const guestOrderRes = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/guest/shipments', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    sender_name: 'Guest Tester',
    sender_phone: randomPhone,
    sender_email: randomEmail,
    sender_country: 'Spain',
    sender_city: 'Valencia',
    sender_address: 'Calle Colon 45',
    sender_latitude: 39.4699,
    sender_longitude: -0.3763,
    recipient_name: 'Guest Recipient',
    recipient_phone: '+34699887766',
    recipient_country: 'Spain',
    recipient_city: 'Madrid',
    recipient_address: 'Gran Via 12',
    recipient_latitude: 40.4168,
    recipient_longitude: -3.7038,
    package_type: 'box',
    description: 'Guest Parcel Sample',
    number_of_packages: 1,
    weight_kg: 5.0,
    volume_m3: 0.1,
    is_fragile: false,
    notes: 'Please call before pickup'
  });

  if (guestOrderRes.status !== 201) {
    throw new Error(`Guest order failed with status ${guestOrderRes.status}: ${JSON.stringify(guestOrderRes.body)}`);
  }

  const guestShipment = guestOrderRes.body.shipment;
  const trackingNumber = guestOrderRes.body.tracking_number;
  console.log(`✓ Guest Shipment Created Successfully!`);
  console.log(`  -> Tracking Number: ${trackingNumber}`);
  console.log(`  -> Price: €${guestShipment.price}`);
  console.log(`  -> Payment Method: ${guestOrderRes.body.payment_method}`);
  console.log(`  -> Payment Status: ${guestOrderRes.body.payment_status}`);
  console.log(`  -> Sender ID: ${guestShipment.sender_id} (Null as expected)`);

  if (guestShipment.sender_id !== null || guestOrderRes.body.payment_method !== 'pay_on_pickup') {
    throw new Error('Guest shipment parameters failed validation (sender_id must be null, payment_method pay_on_pickup)');
  }

  // 2. Public Tracking Query (Unauthenticated)
  console.log('\n[Step 2] Public Live Tracking Query (GET /api/track/{tracking_number})...');
  const trackRes = await request({
    hostname: '127.0.0.1', port: 8000, path: `/api/track/${trackingNumber}`, method: 'GET'
  });

  if (trackRes.status !== 200 || !trackRes.body.success) {
    throw new Error(`Public tracking failed for ${trackingNumber}`);
  }

  const trackData = trackRes.body.data;
  console.log('✓ Public Tracking Verified:');
  console.log('  -> Tracking Number:', trackData.shipment.tracking_number);
  console.log('  -> Status:', trackData.shipment.status);
  console.log('  -> Origin -> Destination:', `${trackData.shipment.sender.city} -> ${trackData.shipment.recipient.city}`);
  console.log('  -> Progress:', trackData.progress_percentage + '%');
  console.log('  -> Timeline History Entries:', trackData.timeline_history.length);

  // 3. Guest Account Registration & Automatic Shipment Linking
  console.log('\n[Step 3] Guest Registers an Account (POST /api/auth/register)...');
  const regRes = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Guest Registered User',
    email: randomEmail,
    password: 'password123',
    phone: randomPhone,
    role: 'client'
  });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  const newClientToken = regRes.body.access_token;
  console.log(`✓ Client Registered Successfully! Linked Guest Orders Count: ${regRes.body.linked_guest_shipments}`);

  if (regRes.body.linked_guest_shipments < 1) {
    throw new Error('Failed to automatically link guest shipment to new client account');
  }

  // 4. Authenticated Client Views History in Client Dashboard
  console.log('\n[Step 4] Query Client Dashboard History (GET /api/shipments)...');
  const historyRes = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/shipments', method: 'GET',
    headers: { 'Authorization': `Bearer ${newClientToken}` }
  });

  const matched = historyRes.body.shipments.find(s => s.tracking_number === trackingNumber);
  if (!matched) {
    throw new Error('Linked guest shipment did not appear in client dashboard history!');
  }

  console.log(`✓ Verified Linked Shipment in Client Dashboard History: ID #${matched.id} | Tracking: ${matched.tracking_number}`);

  console.log('\n======================================================');
  console.log('🎉 ALL GUEST CHECKOUT & ACCOUNT LINKING TESTS PASSED 100%');
  console.log('======================================================');
}

runGuestTest().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
