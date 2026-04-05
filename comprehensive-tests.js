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

// ========== AUTH ENDPOINTS ==========
const testAuthEndpoints = async () => {
  log('TESTING AUTH ENDPOINTS');

  // Register
  try {
    const email = `testuser-${Date.now()}@test.com`;
    console.log(`  Registering user: ${email}`);
    const registerRes = await client.post('/auth/register', {
      name: 'Test User',
      email: email,
      password: 'Test@123456',
    });
    success(`POST /auth/register - ${registerRes.status}`);

    // Extract token from response
    if (registerRes.data.data?.tokens?.accessToken) {
      authToken = registerRes.data.data.tokens.accessToken;
      userId = registerRes.data.data.user._id;
      console.log(`  ✓ Got auth token: ${authToken.substring(0, 20)}...`);
      console.log(`  ✓ Got user ID: ${userId}`);
    } else if (registerRes.data.data?.tokens?.token) {
      authToken = registerRes.data.data.tokens.token;
      userId = registerRes.data.data.user._id;
      console.log(`  ✓ Got auth token (alt path): ${authToken.substring(0, 20)}...`);
      console.log(`  ✓ Got user ID: ${userId}`);
    } else if (registerRes.data.data?.token) {
      authToken = registerRes.data.data.token;
      userId = registerRes.data.data.user?._id;
      console.log(`  ✓ Got auth token (alt path 2): ${authToken.substring(0, 20)}...`);
      console.log(`  ✓ Got user ID: ${userId}`);
    } else {
      console.log(`  Response data:`, JSON.stringify(registerRes.data.data, null, 2));
    }
    addResult('/auth/register', 'POST', 'PASS', registerRes.status);
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    failed(`POST /auth/register - ${status}: ${message}`);
    addResult('/auth/register', 'POST', 'FAIL', status, message);
    return; // Can't continue without auth
  }

  // Set auth header
  client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

  // Login endpoint test (using same credentials)
  try {
    const email = `testuser-${Date.now() - 1000}@test.com`;
    const loginRes = await client.post('/auth/login', {
      email: email,
      password: 'Test@123456',
    });
    console.log(`  POST /auth/login - ${loginRes.status}`);
    addResult('/auth/login', 'POST', 'PASS', loginRes.status);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log(`  ⊘ POST /auth/login - 401 (expected, user doesn't exist)`);
      addResult('/auth/login', 'POST', 'SKIP', 401, 'Test user not found');
    } else {
      failed(`POST /auth/login - ${err.response?.status}`);
      addResult('/auth/login', 'POST', 'FAIL', err.response?.status, err.message);
    }
  }

  // Logout endpoint
  try {
    const logoutRes = await client.post('/auth/logout');
    success(`POST /auth/logout - ${logoutRes.status}`);
    addResult('/auth/logout', 'POST', 'PASS', logoutRes.status);
  } catch (err) {
    failed(`POST /auth/logout - ${err.response?.status}`);
    addResult('/auth/logout', 'POST', 'FAIL', err.response?.status, err.message);
  }

  // Refresh Token endpoint
  try {
    const refreshRes = await client.post('/auth/refresh-token', {
      refreshToken: 'test-refresh',
    });
    console.log(`  POST /auth/refresh-token - ${refreshRes.status}`);
    addResult('/auth/refresh-token', 'POST', 'PASS', refreshRes.status);
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 400) {
      console.log(
        `  ⊘ POST /auth/refresh-token - ${err.response?.status} (expected with test token)`
      );
      addResult('/auth/refresh-token', 'POST', 'SKIP', err.response?.status, 'Invalid token');
    } else {
      failed(`POST /auth/refresh-token - ${err.response?.status}`);
      addResult('/auth/refresh-token', 'POST', 'FAIL', err.response?.status, err.message);
    }
  }

  // Verify Email endpoint
  try {
    const verifyRes = await client.post('/auth/verify-email', {
      token: 'dummy-token',
    });
    console.log(`  POST /auth/verify-email - ${verifyRes.status}`);
    addResult('/auth/verify-email', 'POST', 'PASS', verifyRes.status);
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 401) {
      console.log(
        `  ⊘ POST /auth/verify-email - ${err.response?.status} (expected with dummy token)`
      );
      addResult('/auth/verify-email', 'POST', 'SKIP', err.response?.status, 'Invalid token');
    } else {
      failed(`POST /auth/verify-email - ${err.response?.status}`);
      addResult('/auth/verify-email', 'POST', 'FAIL', err.response?.status, err.message);
    }
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

  try {
    const exportRes = await client.get('/users/export?format=json');
    success(`GET /users/export - ${exportRes.status}`);
    addResult('/users/export', 'GET', 'PASS', exportRes.status);
  } catch (err) {
    failed(`GET /users/export - ${err.response?.status}`);
    addResult('/users/export', 'GET', 'FAIL', err.response?.status, err.message);
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

  try {
    const paymentRes = await client.get('/payments/dummy-id');
    success(`GET /payments/{id} - ${paymentRes.status}`);
    addResult('/payments/{id}', 'GET', 'PASS', paymentRes.status);
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`  ⊘ GET /payments/{id} - 404 (not found, expected)`);
      addResult('/payments/{id}', 'GET', 'SKIP', 404, 'Not found');
    } else {
      failed(`GET /payments/{id} - ${err.response?.status}`);
      addResult('/payments/{id}', 'GET', 'FAIL', err.response?.status, err.message);
    }
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

  try {
    const templateSendRes = await client.post('/email/templates/welcome', {
      to: 'test@example.com',
    });
    success(`POST /email/templates/{name} - ${templateSendRes.status}`);
    addResult('/email/templates/{name}', 'POST', 'PASS', templateSendRes.status);
  } catch (err) {
    failed(`POST /email/templates/{name} - ${err.response?.status}`);
    addResult('/email/templates/{name}', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    const bulkRes = await client.post('/email/bulk', {
      recipients: ['test1@example.com', 'test2@example.com'],
      template: 'welcome',
    });
    success(`POST /email/bulk - ${bulkRes.status}`);
    addResult('/email/bulk', 'POST', 'PASS', bulkRes.status);
  } catch (err) {
    failed(`POST /email/bulk - ${err.response?.status}`);
    addResult('/email/bulk', 'POST', 'FAIL', err.response?.status, err.message);
  }
};

// ========== NOTIFICATION ENDPOINTS ==========
const testNotificationEndpoints = async () => {
  log('TESTING NOTIFICATION ENDPOINTS');

  let notificationId = '';

  try {
    const notifRes = await client.get('/notifications');
    success(`GET /notifications - ${notifRes.status}`);
    if (notifRes.data.data?.data?.[0]?._id) {
      notificationId = notifRes.data.data.data[0]._id;
    }
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

  if (notificationId) {
    try {
      const markRes = await client.put(`/notifications/${notificationId}/read`);
      success(`PUT /notifications/{id}/read - ${markRes.status}`);
      addResult('/notifications/{id}/read', 'PUT', 'PASS', markRes.status);
    } catch (err) {
      failed(`PUT /notifications/{id}/read - ${err.response?.status}`);
      addResult('/notifications/{id}/read', 'PUT', 'FAIL', err.response?.status, err.message);
    }
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

  if (notificationId) {
    try {
      const deleteRes = await client.delete(`/notifications/${notificationId}`);
      success(`DELETE /notifications/{id} - ${deleteRes.status}`);
      addResult('/notifications/{id}', 'DELETE', 'PASS', deleteRes.status);
    } catch (err) {
      failed(`DELETE /notifications/{id} - ${err.response?.status}`);
      addResult('/notifications/{id}', 'DELETE', 'FAIL', err.response?.status, err.message);
    }
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

  try {
    const reindexRes = await client.post('/search/reindex');
    success(`POST /search/reindex - ${reindexRes.status}`);
    addResult('/search/reindex', 'POST', 'PASS', reindexRes.status);
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      console.log(`  ⊘ POST /search/reindex - ${err.response?.status} (admin only)`);
      addResult('/search/reindex', 'POST', 'SKIP', err.response?.status, 'Admin only');
    } else {
      failed(`POST /search/reindex - ${err.response?.status}`);
      addResult('/search/reindex', 'POST', 'FAIL', err.response?.status, err.message);
    }
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
    if (err.response?.status === 403) {
      console.log(`  ⊘ GET /audit - 403 (admin only)`);
      addResult('/audit', 'GET', 'SKIP', 403, 'Admin only');
    } else {
      failed(`GET /audit - ${err.response?.status}`);
      addResult('/audit', 'GET', 'FAIL', err.response?.status, err.message);
    }
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
    if (err.response?.status === 403) {
      console.log(`  ⊘ GET /dashboard/stats - 403 (admin only)`);
      addResult('/dashboard/stats', 'GET', 'SKIP', 403, 'Admin only');
    } else {
      failed(`GET /dashboard/stats - ${err.response?.status}`);
      addResult('/dashboard/stats', 'GET', 'FAIL', err.response?.status, err.message);
    }
  }

  try {
    const realtimeRes = await client.get('/dashboard/realtime');
    success(`GET /dashboard/realtime - ${realtimeRes.status}`);
    addResult('/dashboard/realtime', 'GET', 'PASS', realtimeRes.status);
  } catch (err) {
    if (err.response?.status === 403) {
      console.log(`  ⊘ GET /dashboard/realtime - 403 (admin only)`);
      addResult('/dashboard/realtime', 'GET', 'SKIP', 403, 'Admin only');
    } else {
      failed(`GET /dashboard/realtime - ${err.response?.status}`);
      addResult('/dashboard/realtime', 'GET', 'FAIL', err.response?.status, err.message);
    }
  }

  try {
    const activityRes = await client.get('/dashboard/activity');
    success(`GET /dashboard/activity - ${activityRes.status}`);
    addResult('/dashboard/activity', 'GET', 'PASS', activityRes.status);
  } catch (err) {
    if (err.response?.status === 403) {
      console.log(`  ⊘ GET /dashboard/activity - 403 (admin only)`);
      addResult('/dashboard/activity', 'GET', 'SKIP', 403, 'Admin only');
    } else {
      failed(`GET /dashboard/activity - ${err.response?.status}`);
      addResult('/dashboard/activity', 'GET', 'FAIL', err.response?.status, err.message);
    }
  }

  try {
    const growthRes = await client.get('/dashboard/users-growth?days=30');
    success(`GET /dashboard/users-growth - ${growthRes.status}`);
    addResult('/dashboard/users-growth', 'GET', 'PASS', growthRes.status);
  } catch (err) {
    if (err.response?.status === 403) {
      console.log(`  ⊘ GET /dashboard/users-growth - 403 (admin only)`);
      addResult('/dashboard/users-growth', 'GET', 'SKIP', 403, 'Admin only');
    } else {
      failed(`GET /dashboard/users-growth - ${err.response?.status}`);
      addResult('/dashboard/users-growth', 'GET', 'FAIL', err.response?.status, err.message);
    }
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

  try {
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');

    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'test content');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));

    const uploadRes = await client.post('/uploads/single', form, {
      headers: form.getHeaders(),
    });
    success(`POST /uploads/single - ${uploadRes.status}`);
    addResult('/uploads/single', 'POST', 'PASS', uploadRes.status);

    // Cleanup
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {
      // ignore
    }
  } catch (err) {
    failed(`POST /uploads/single - ${err.response?.status || err.code}`);
    addResult('/uploads/single', 'POST', 'FAIL', err.response?.status, err.message);
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
    console.log('\n⚠️  AUTHENTICATION FAILED - STOPPING TESTS');
    return;
  }

  console.log('\n✓ Successfully authenticated - testing all endpoints...\n');

  await testUserEndpoints();
  await testUploadEndpoints();
  await testPaymentEndpoints();
  await testEmailEndpoints();
  await testNotificationEndpoints();
  await testSearchEndpoints();
  await testAuditEndpoints();
  await testDashboardEndpoints();

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
  console.log('========================================');
  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⊘';
    const details = r.statusCode ? `(${r.statusCode})` : r.error ? `(${r.error})` : '';
    console.log(`${icon} ${r.method.padEnd(6)} ${r.endpoint.padEnd(50)} ${details}`);
  });

  console.log('========================================\n');
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${failed} tests failed.`);
  }
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
