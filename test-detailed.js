const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';
const client = axios.create({ baseURL: BASE_URL });

const results = [];
let authToken = '';
let userId = '';

const log = (message) => console.log(`\n>>> ${message}`);
const success = (message) => console.log(`✓ ${message}`);
const failed = (message) => console.log(`✗ ${message}`);

const addResult = (endpoint, method, status, statusCode, error) => {
  results.push({ endpoint, method, status, statusCode, error });
};

// ========== AUTH ENDPOINTS WITH BETTER ERROR HANDLING ==========
const testAuthEndpoints = async () => {
  log('TESTING AUTH ENDPOINTS');

  // Register
  try {
    const email = `testuser-${Date.now()}@test.com`;
    console.log(`  Attempting to register: ${email}`);
    const registerRes = await client.post('/auth/register', {
      name: 'Test User',
      email: email,
      password: 'Test@123456',
    });
    success(`POST /auth/register - ${registerRes.status}`);
    if (registerRes.data.data?.tokens?.token) {
      authToken = registerRes.data.data.tokens.token;
      userId = registerRes.data.data.user._id;
    }
    addResult('/auth/register', 'POST', 'PASS', registerRes.status);
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    failed(`POST /auth/register - ${status}: ${message}`);
    console.log('  Full error:', err.response?.data);
    addResult('/auth/register', 'POST', 'FAIL', status, message);
  }

  if (!authToken) {
    console.log('\n  Trying to login with default test user...');
    try {
      const loginRes = await client.post('/auth/login', {
        email: 'admin@test.com',
        password: 'admin@test.com',
      });
      if (loginRes.status === 200 && loginRes.data.data?.token) {
        authToken = loginRes.data.data.token;
        userId = loginRes.data.data.user._id;
        success(`POST /auth/login - ${loginRes.status}`);
        addResult('/auth/login', 'POST', 'PASS', loginRes.status);
      }
    } catch (err) {
      console.log('  Default credentials also failed');
      addResult('/auth/login', 'POST', 'SKIP', err.response?.status, 'No test user');
    }
  }

  if (!authToken) {
    failed('No auth token obtained. Cannot test authenticated endpoints.');
    return;
  }

  client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

  // Get Me
  try {
    const getMeRes = await client.get('/auth/me');
    success(`GET /auth/me - ${getMeRes.status}`);
    addResult('/auth/me', 'GET', 'PASS', getMeRes.status);
  } catch (err) {
    failed(`GET /auth/me - ${err.response?.status}`);
    addResult('/auth/me', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== USER ENDPOINTS ==========
const testUserEndpoints = async () => {
  log('TESTING USER ENDPOINTS');

  try {
    const profileRes = await client.get('/users/profile');
    success(`GET /users/profile - ${profileRes.status}`);
    addResult('/users/profile', 'GET', 'PASS', profileRes.status);
  } catch (err) {
    failed(`GET /users/profile - ${err.response?.status}`);
    addResult('/users/profile', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const updateRes = await client.put('/users/profile', {
      name: 'Updated Test User',
      phone: '1234567890',
      bio: 'Test bio',
    });
    success(`PUT /users/profile - ${updateRes.status}`);
    addResult('/users/profile', 'PUT', 'PASS', updateRes.status);
  } catch (err) {
    failed(`PUT /users/profile - ${err.response?.status}`);
    addResult('/users/profile', 'PUT', 'FAIL', err.response?.status, err.message);
  }

  try {
    const listRes = await client.get('/users?page=1&limit=10');
    success(`GET /users - ${listRes.status}`);
    addResult('/users', 'GET', 'PASS', listRes.status);
  } catch (err) {
    failed(`GET /users - ${err.response?.status}`);
    addResult('/users', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    if (userId) {
      const userRes = await client.get(`/users/${userId}`);
      success(`GET /users/{id} - ${userRes.status}`);
      addResult('/users/{id}', 'GET', 'PASS', userRes.status);
    }
  } catch (err) {
    failed(`GET /users/{id} - ${err.response?.status}`);
    addResult('/users/{id}', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== PAYMENT ENDPOINTS ==========
const testPaymentEndpoints = async () => {
  log('TESTING PAYMENT ENDPOINTS');

  try {
    const intentRes = await client.post('/payments/create-intent', {
      amount: 1999,
      currency: 'usd',
    });
    success(`POST /payments/create-intent - ${intentRes.status}`);
    addResult('/payments/create-intent', 'POST', 'PASS', intentRes.status);
  } catch (err) {
    failed(`POST /payments/create-intent - ${err.response?.status}`);
    addResult('/payments/create-intent', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    const paymentsRes = await client.get('/payments?page=1&limit=10');
    success(`GET /payments - ${paymentsRes.status}`);
    addResult('/payments', 'GET', 'PASS', paymentsRes.status);
  } catch (err) {
    failed(`GET /payments - ${err.response?.status}`);
    addResult('/payments', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== EMAIL ENDPOINTS ==========
const testEmailEndpoints = async () => {
  log('TESTING EMAIL ENDPOINTS');

  try {
    const templatesRes = await client.get('/email/templates');
    success(`GET /email/templates - ${templatesRes.status}`);
    addResult('/email/templates', 'GET', 'PASS', templatesRes.status);
  } catch (err) {
    failed(`GET /email/templates - ${err.response?.status}`);
    addResult('/email/templates', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const sendRes = await client.post('/email/send', {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test</h1>',
    });
    success(`POST /email/send - ${sendRes.status}`);
    addResult('/email/send', 'POST', 'PASS', sendRes.status);
  } catch (err) {
    failed(`POST /email/send - ${err.response?.status}`);
    addResult('/email/send', 'POST', 'FAIL', err.response?.status, err.message);
  }
};

// ========== NOTIFICATION ENDPOINTS ==========
const testNotificationEndpoints = async () => {
  log('TESTING NOTIFICATION ENDPOINTS');

  try {
    const notifRes = await client.get('/notifications');
    success(`GET /notifications - ${notifRes.status}`);
    addResult('/notifications', 'GET', 'PASS', notifRes.status);
  } catch (err) {
    failed(`GET /notifications - ${err.response?.status}`);
    addResult('/notifications', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const unreadRes = await client.get('/notifications/unread');
    success(`GET /notifications/unread - ${unreadRes.status}`);
    addResult('/notifications/unread', 'GET', 'PASS', unreadRes.status);
  } catch (err) {
    failed(`GET /notifications/unread - ${err.response?.status}`);
    addResult('/notifications/unread', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const readAllRes = await client.put('/notifications/read-all');
    success(`PUT /notifications/read-all - ${readAllRes.status}`);
    addResult('/notifications/read-all', 'PUT', 'PASS', readAllRes.status);
  } catch (err) {
    failed(`PUT /notifications/read-all - ${err.response?.status}`);
    addResult('/notifications/read-all', 'PUT', 'FAIL', err.response?.status, err.message);
  }

  try {
    const prefRes = await client.put('/notifications/preferences', {
      email: true,
      push: false,
      sms: true,
    });
    success(`PUT /notifications/preferences - ${prefRes.status}`);
    addResult('/notifications/preferences', 'PUT', 'PASS', prefRes.status);
  } catch (err) {
    failed(`PUT /notifications/preferences - ${err.response?.status}`);
    addResult('/notifications/preferences', 'PUT', 'FAIL', err.response?.status, err.message);
  }
};

// ========== SEARCH ENDPOINTS ==========
const testSearchEndpoints = async () => {
  log('TESTING SEARCH ENDPOINTS');

  try {
    const searchRes = await client.get('/search/users?q=test&page=1');
    success(`GET /search/users - ${searchRes.status}`);
    addResult('/search/users', 'GET', 'PASS', searchRes.status);
  } catch (err) {
    failed(`GET /search/users - ${err.response?.status}`);
    addResult('/search/users', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const globalRes = await client.get('/search/all?q=test&type=user');
    success(`GET /search/all - ${globalRes.status}`);
    addResult('/search/all', 'GET', 'PASS', globalRes.status);
  } catch (err) {
    failed(`GET /search/all - ${err.response?.status}`);
    addResult('/search/all', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const suggestRes = await client.get('/search/suggest?q=test');
    success(`GET /search/suggest - ${suggestRes.status}`);
    addResult('/search/suggest', 'GET', 'PASS', suggestRes.status);
  } catch (err) {
    failed(`GET /search/suggest - ${err.response?.status}`);
    addResult('/search/suggest', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const historyRes = await client.get('/search/history');
    success(`GET /search/history - ${historyRes.status}`);
    addResult('/search/history', 'GET', 'PASS', historyRes.status);
  } catch (err) {
    failed(`GET /search/history - ${err.response?.status}`);
    addResult('/search/history', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== AUDIT ENDPOINTS ==========
const testAuditEndpoints = async () => {
  log('TESTING AUDIT ENDPOINTS');

  try {
    const auditRes = await client.get('/audit?page=1&limit=10');
    success(`GET /audit - ${auditRes.status}`);
    addResult('/audit', 'GET', 'PASS', auditRes.status);
  } catch (err) {
    failed(`GET /audit - ${err.response?.status}`);
    addResult('/audit', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== DASHBOARD ENDPOINTS ==========
const testDashboardEndpoints = async () => {
  log('TESTING DASHBOARD ENDPOINTS');

  try {
    const statsRes = await client.get('/dashboard/stats');
    success(`GET /dashboard/stats - ${statsRes.status}`);
    addResult('/dashboard/stats', 'GET', 'PASS', statsRes.status);
  } catch (err) {
    failed(`GET /dashboard/stats - ${err.response?.status}`);
    addResult('/dashboard/stats', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const realtimeRes = await client.get('/dashboard/realtime');
    success(`GET /dashboard/realtime - ${realtimeRes.status}`);
    addResult('/dashboard/realtime', 'GET', 'PASS', realtimeRes.status);
  } catch (err) {
    failed(`GET /dashboard/realtime - ${err.response?.status}`);
    addResult('/dashboard/realtime', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const activityRes = await client.get('/dashboard/activity');
    success(`GET /dashboard/activity - ${activityRes.status}`);
    addResult('/dashboard/activity', 'GET', 'PASS', activityRes.status);
  } catch (err) {
    failed(`GET /dashboard/activity - ${err.response?.status}`);
    addResult('/dashboard/activity', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== MONITORING ENDPOINTS ==========
const testMonitoringEndpoints = async () => {
  log('TESTING MONITORING ENDPOINTS');

  const tempClient = axios.create({ baseURL: BASE_URL });

  try {
    const healthRes = await tempClient.get('/monitoring/health');
    success(`GET /monitoring/health - ${healthRes.status}`);
    addResult('/monitoring/health', 'GET', 'PASS', healthRes.status);
  } catch (err) {
    failed(`GET /monitoring/health - ${err.response?.status}`);
    addResult('/monitoring/health', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const detailedRes = await tempClient.get('/monitoring/health/detailed');
    success(`GET /monitoring/health/detailed - ${detailedRes.status}`);
    addResult('/monitoring/health/detailed', 'GET', 'PASS', detailedRes.status);
  } catch (err) {
    failed(`GET /monitoring/health/detailed - ${err.response?.status}`);
    addResult('/monitoring/health/detailed', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    const metricsRes = await tempClient.get('/monitoring/metrics');
    success(`GET /monitoring/metrics - ${metricsRes.status}`);
    addResult('/monitoring/metrics', 'GET', 'PASS', metricsRes.status);
  } catch (err) {
    failed(`GET /monitoring/metrics - ${err.response?.status}`);
    addResult('/monitoring/metrics', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== UPLOAD ENDPOINTS ==========
const testUploadEndpoints = async () => {
  log('TESTING UPLOAD ENDPOINTS');

  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');

  // Create a test file
  const testFilePath = path.join(__dirname, 'test-file.txt');
  fs.writeFileSync(testFilePath, 'test content');

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));

    const uploadRes = await client.post('/uploads/single', form, {
      headers: form.getHeaders(),
    });
    success(`POST /uploads/single - ${uploadRes.status}`);
    addResult('/uploads/single', 'POST', 'PASS', uploadRes.status);
  } catch (err) {
    failed(`POST /uploads/single - ${err.response?.status || err.code}`);
    addResult('/uploads/single', 'POST', 'FAIL', err.response?.status, err.message);
  }

  // Cleanup
  try {
    fs.unlinkSync(testFilePath);
  } catch (e) {
    // ignore
  }
};

// ========== MAIN TEST RUNNER ==========
async function runAllTests() {
  console.log('========================================');
  console.log('RUNNING COMPREHENSIVE ENDPOINT TESTS');
  console.log('========================================');

  await testMonitoringEndpoints();
  await testAuthEndpoints();

  if (!authToken) {
    console.log('\n⚠️  No auth token. Skipping authenticated endpoints...');
  } else {
    await testUserEndpoints();
    await testPaymentEndpoints();
    await testEmailEndpoints();
    await testNotificationEndpoints();
    await testSearchEndpoints();
    await testAuditEndpoints();
    await testDashboardEndpoints();
    await testUploadEndpoints();
  }

  // Summary
  console.log('\n\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log(`✓ PASSED:  ${passed}`);
  console.log(`✗ FAILED:  ${failed}`);
  console.log(`⊘ SKIPPED: ${skipped}`);
  console.log(`\nTOTAL:     ${results.length}\n`);

  console.log('DETAILED RESULTS:');
  console.log('----------------------------------------');
  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⊘';
    const details = r.statusCode ? `(${r.statusCode})` : r.error ? `(${r.error})` : '';
    console.log(`${icon} ${r.method.padEnd(6)} ${r.endpoint.padEnd(50)} ${details}`);
  });

  console.log('\n========================================');
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${failed} tests failed.`);
  }
  console.log('========================================\n');
}

runAllTests().catch(console.error);
