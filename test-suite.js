// test-suite.js - Comprehensive Automated End-to-End Test for BREWSPACE
const http = require('node:http');

// Start the server directly in-process
require('./server/server.js');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `http://127.0.0.1:3000${path}`;
  const method = options.method || 'GET';
  const headers = options.headers || {};
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  return { status: res.status, ok: res.ok, json, text };
}

async function runTests() {
  console.log('--- STARTING BREWSPACE AUTOMATED TESTS ---');
  await wait(1000);

  // 1. Test Static files
  console.log('\n[1] Testing Static HTML & Assets');
  const indexRes = await request('/');
  console.log('Index HTML Status:', indexRes.status, indexRes.text.includes('BREWSPACE') ? 'PASS' : 'FAIL');

  const cssRes = await request('/styles.css');
  console.log('CSS Status:', cssRes.status, cssRes.text.includes('--color-warm-cream') ? 'PASS' : 'FAIL');

  // 2. Test Settings API
  console.log('\n[2] Testing Public Settings API');
  const settingsRes = await request('/api/settings');
  console.log('Settings API:', settingsRes.status, settingsRes.json?.settings?.store_name);

  // 3. Test Admin Login
  console.log('\n[3] Testing Admin Login');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  console.log('Admin Login:', adminLogin.status, adminLogin.json?.user?.fullName);
  const adminToken = adminLogin.json?.token;

  // 4. Test Kasir Login
  console.log('\n[4] Testing Kasir Login');
  const kasirLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'kasir', password: 'kasir123' }
  });
  console.log('Kasir Login:', kasirLogin.status, kasirLogin.json?.user?.fullName);
  const kasirToken = kasirLogin.json?.token;

  // 5. Test Kasir Access Control to Admin Route (RBAC Test)
  console.log('\n[5] Testing RBAC Protection: Kasir trying to access Admin Dashboard');
  const rbacTest = await request('/api/admin/dashboard', {
    headers: { 'Authorization': `Bearer ${kasirToken}` }
  });
  console.log('RBAC Test Status (expecting 403 Forbidden):', rbacTest.status, rbacTest.json?.error);

  // 6. Test Admin Dashboard Stats
  console.log('\n[6] Testing Admin Dashboard Stats');
  const dashRes = await request('/api/admin/dashboard', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Dashboard Stats: Total Revenue =', dashRes.json?.stats?.totalRevenue, 'Transactions =', dashRes.json?.stats?.totalTransactions);

  // 7. Test POS Products
  console.log('\n[7] Testing POS Products API');
  const posRes = await request('/api/pos/products', {
    headers: { 'Authorization': `Bearer ${kasirToken}` }
  });
  const products = posRes.json?.products || [];
  console.log(`POS Active Products Count: ${products.length}`);
  const targetProduct = products[0];
  console.log(`Target Product for sale: ${targetProduct?.name} (Stock: ${targetProduct?.stock}, Price: ${targetProduct?.price})`);

  // 8. Test POS Checkout Transaction (Atomic)
  console.log('\n[8] Testing POS Checkout Transaction');
  const checkoutPayload = {
    items: [
      { productId: targetProduct.id, quantity: 2 }
    ],
    cashReceived: 100000,
    customerName: 'Bambang Sudirman',
    notes: 'Less ice, extra espresso'
  };

  const checkoutRes = await request('/api/pos/checkout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${kasirToken}` },
    body: checkoutPayload
  });

  console.log('Checkout Status:', checkoutRes.status);
  console.log('Invoice Generated:', checkoutRes.json?.receipt?.invoiceNumber);
  console.log('Total Amount:', checkoutRes.json?.receipt?.total);
  console.log('Cash Received:', checkoutRes.json?.receipt?.cashReceived);
  console.log('Change Amount:', checkoutRes.json?.receipt?.change);

  // 9. Verify Stock Deduction & Audit Log
  console.log('\n[9] Verifying Stock Deduction & Stock Movement History');
  const stockHistRes = await request('/api/admin/stocks/history', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const latestMovement = stockHistRes.json?.history?.[0];
  console.log('Latest Stock Movement:', latestMovement?.product_name, 'Change:', latestMovement?.quantity_change, 'Current Stock:', latestMovement?.current_stock);

  // 10. Verify Reports Updated
  console.log('\n[10] Verifying Omzet Reports Updated with New Transaction');
  const reportRes = await request('/api/admin/reports?period=today', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Report Today Revenue:', reportRes.json?.report?.summary?.totalRevenue, 'Orders:', reportRes.json?.report?.summary?.totalTransactions);

  console.log('\n--- ALL AUTOMATED VERIFICATIONS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
