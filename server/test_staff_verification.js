require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5002';

const app = require('./server');
const { Order, User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

let server;

async function runTests() {
  console.log('══════════════════════════════════════════════════════');
  console.log('🧪 Starting Staff & Order Verification Test Suite');
  console.log('══════════════════════════════════════════════════════');

  // Start test server on port 5002
  await new Promise((resolve) => {
    server = app.listen(5002, () => {
      console.log('🚀 Test server running on http://localhost:5002');
      resolve();
    });
  });

  const createdOrderIds = [];

  try {
    // ── 1. Create or Find Users ───────────────────────────────────
    const passwordHash = await bcrypt.hash('TestPass@123', 10);

    // Admin user
    let [admin] = await User.findOrCreate({
      where: { email: 'admin_test_staff@doodcafe.com' },
      defaults: {
        name: 'Test Admin',
        password: passwordHash,
        role: 'admin',
        phone: '9876543210',
      },
    });

    // Staff user
    let [staff] = await User.findOrCreate({
      where: { email: 'counter_staff_test@doodcafe.com' },
      defaults: {
        name: 'Counter Staff',
        password: passwordHash,
        role: 'staff',
        phone: '9876543211',
      },
    });
    // Ensure role is staff in case record existed
    if (staff.role !== 'staff') {
      staff.role = 'staff';
      await staff.save();
    }

    // Customer user
    let [customer] = await User.findOrCreate({
      where: { email: 'customer_test_staff@example.com' },
      defaults: {
        name: 'Regular Customer',
        password: passwordHash,
        role: 'customer',
        phone: '9876543212',
      },
    });

    // ── Helper: Login and obtain token ────────────────────────────
    const login = async (email, password = 'TestPass@123') => {
      const res = await fetch('http://localhost:5002/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return data.data?.accessToken;
    };

    const adminToken = await login('admin_test_staff@doodcafe.com');
    const staffToken = await login('counter_staff_test@doodcafe.com');
    const customerToken = await login('customer_test_staff@example.com');

    console.log('✅ Tokens acquired for Admin, Staff, and Customer');

    // ── 2. Test: No Token -> Expect 401 ───────────────────────────
    const noTokenRes = await fetch('http://localhost:5002/api/v1/staff/orders', {
      method: 'GET',
    });
    if (noTokenRes.status === 401) {
      console.log('✅ [Pass] No token rejected with 401');
    } else {
      throw new Error(`Expected 401 for no token, got ${noTokenRes.status}`);
    }

    // ── 3. Test: Customer Token -> Expect 403 ─────────────────────
    const custRes = await fetch('http://localhost:5002/api/v1/staff/orders', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (custRes.status === 403) {
      console.log('✅ [Pass] Customer role rejected with 403');
    } else {
      throw new Error(`Expected 403 for customer role, got ${custRes.status}`);
    }

    // ── 4. Test: Lookup of Unknown Bill -> Expect 404 ─────────────
    const notFoundRes = await fetch('http://localhost:5002/api/v1/staff/orders/lookup/ORD-NONEXISTENT-999', {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (notFoundRes.status === 404) {
      console.log('✅ [Pass] Lookup of unknown bill returned 404');
    } else {
      throw new Error(`Expected 404 for unknown bill, got ${notFoundRes.status}`);
    }

    // ── 5. Test: Place REAL Takeaway Order via /api/v1/orders ───────
    const placeOrderRes = await fetch('http://localhost:5002/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ name: 'French Fries', price: 99, quantity: 2 }],
        orderType: 'takeaway',
        customerName: 'Suresh Kumar',
        customerPhone: '9876543210',
        paymentMode: 'cash',
        paymentStatus: 'cod',
        customer_location: 'Coimbatore Racecourse counter pickup',
      }),
    });

    const placeData = await placeOrderRes.json();
    if (placeOrderRes.status !== 201 || !placeData.data) {
      throw new Error(`Order placement failed: ${JSON.stringify(placeData)}`);
    }

    const testTakeawayOrder = placeData.data;
    createdOrderIds.push(testTakeawayOrder.id);
    const billNumber = testTakeawayOrder.billNumber;
    console.log(`✅ [Pass] Real Takeaway Order placed! Bill Number: ${billNumber}, ID: ${testTakeawayOrder.id}`);

    if (!billNumber || !billNumber.startsWith('ORD-')) {
      throw new Error(`Expected billNumber to start with ORD-, got ${billNumber}`);
    }
    if (testTakeawayOrder.customerName !== 'Suresh Kumar') {
      throw new Error(`Expected customerName 'Suresh Kumar', got ${testTakeawayOrder.customerName}`);
    }
    if (testTakeawayOrder.customerPhone !== '9876543210') {
      throw new Error(`Expected customerPhone '9876543210', got ${testTakeawayOrder.customerPhone}`);
    }
    if (testTakeawayOrder.paymentStatus !== 'cod') {
      throw new Error(`Expected paymentStatus 'cod', got ${testTakeawayOrder.paymentStatus}`);
    }

    // ── 6. Test: Lookup Verified Bill by Staff ─────────────────────
    const lookupRes = await fetch(`http://localhost:5002/api/v1/staff/orders/lookup/${billNumber}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const lookupData = await lookupRes.json();
    if (lookupRes.status !== 200 || !lookupData.data) {
      throw new Error(`Lookup failed for ${billNumber}: ${JSON.stringify(lookupData)}`);
    }
    console.log(`✅ [Pass] Bill lookup succeeded for Staff! Customer: ${lookupData.data.customerName}, Phone: ${lookupData.data.customerPhone}`);

    // ── 7. Test: Mark as Handed Over ──────────────────────────────
    const handoverRes = await fetch(`http://localhost:5002/api/v1/staff/orders/${testTakeawayOrder.id}/handover`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const handoverData = await handoverRes.json();
    if (handoverRes.status !== 200 || handoverData.data?.status !== 'handed_over') {
      throw new Error(`Handover failed: ${JSON.stringify(handoverData)}`);
    }
    console.log(`✅ [Pass] Handover succeeded! Status: ${handoverData.data.status}, HandedOverAt: ${handoverData.data.handedOverAt}`);

    // ── 8. Test: Double Handover -> Expect 409 Conflict ───────────
    const doubleHandoverRes = await fetch(`http://localhost:5002/api/v1/staff/orders/${testTakeawayOrder.id}/handover`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (doubleHandoverRes.status === 409) {
      console.log('✅ [Pass] Double handover prevented with 409 Conflict');
    } else {
      throw new Error(`Expected 409 for double handover, got ${doubleHandoverRes.status}`);
    }

    // ── 9. Test: Place REAL Dine-in Order ─────────────────────────
    const dineInRes = await fetch('http://localhost:5002/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ name: 'Classic Cappuccino', price: 149, quantity: 1 }],
        orderType: 'dine-in',
        customerName: 'Meena Ramesh',
        customerPhone: '9845612345',
        paymentMode: 'upi',
        paymentStatus: 'paid',
      }),
    });
    const dineInData = await dineInRes.json();
    if (dineInRes.status !== 201 || !dineInData.data) {
      throw new Error(`Dine-in order placement failed: ${JSON.stringify(dineInData)}`);
    }
    createdOrderIds.push(dineInData.data.id);
    console.log(`✅ [Pass] Real Dine-in Order placed! Bill: ${dineInData.data.billNumber}, Status: ${dineInData.data.paymentStatus}`);

    // ── 10. Test: Fetch Today's Dine-in Orders for Staff ──────────
    const staffDineInRes = await fetch('http://localhost:5002/api/v1/staff/orders?type=dine-in', {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const staffDineInData = await staffDineInRes.json();
    if (staffDineInRes.status !== 200 || !Array.isArray(staffDineInData.data)) {
      throw new Error(`Staff dine-in listing failed: ${JSON.stringify(staffDineInData)}`);
    }
    const foundDineIn = staffDineInData.data.find((o) => o.id === dineInData.data.id);
    if (!foundDineIn) {
      throw new Error(`Created dine-in order not found in staff listing`);
    }
    console.log(`✅ [Pass] Dine-in order listed on Staff page with paymentStatus: ${foundDineIn.paymentStatus}`);

    console.log('\n══════════════════════════════════════════════════════');
    console.log('🎉 ALL 10 TESTS PASSED SUCESSFULLY!');
    console.log('══════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    // ── Clean up test orders from DB ──────────────────────────────
    if (createdOrderIds.length > 0) {
      await Order.destroy({ where: { id: createdOrderIds } });
      console.log(`🧹 Cleaned up ${createdOrderIds.length} test order(s) from database.`);
    }

    if (server) {
      server.close();
      console.log('🛑 Test server stopped.');
    }
    process.exit(process.exitCode || 0);
  }
}

runTests();
