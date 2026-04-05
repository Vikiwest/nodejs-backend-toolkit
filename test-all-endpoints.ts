import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const client: AxiosInstance = axios.create({ baseURL: BASE_URL });

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
}

const results: TestResult[] = [];
let authToken = '';
let userId = '';
let notificationId = '';

// Helper function
const log = (message: string) => console.log(`\n>>> ${message}`);
const success = (message: string) => console.log(`✓ ${message}`);
const failed = (message: string) => console.log(`✗ ${message}`);

const addResult = (
  endpoint: string,
  method: string,
  status: 'PASS' | 'FAIL' | 'SKIP',
  statusCode?: number,
  error?: string
) => {
  results.push({ endpoint, method, status, statusCode, error });
};

// ========== AUTH ENDPOINTS ==========
const testAuthEndpoints = async () => {
  log('TESTING AUTH ENDPOINTS');

  try {
    // Register
    const registerRes = await client.post('/auth/register', {
      name: 'Test User',
      email: `testuser-${Date.now()}@test.com`,
      password: 'Test@123456',
    });
    success(`POST /auth/register - ${registerRes.status}`);
    addResult('/auth/register', 'POST', 'PASS', registerRes.status);
  } catch (err: any) {
    failed(`POST /auth/register - ${err.response?.status} ${err.message}`);
    addResult('/auth/register', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Login
    const loginRes = await client.post('/auth/login', {
      email: `testuser-${Date.now() - 1000}@test.com`,
      password: 'Test@123456',
    });
    if (loginRes.status === 200 && loginRes.data.data.token) {
      authToken = loginRes.data.data.token;
      userId = loginRes.data.data.user._id;
      success(`POST /auth/login - ${loginRes.status}`);
      addResult('/auth/login', 'POST', 'PASS', loginRes.status);
    }
  } catch (err: any) {
    failed(`POST /auth/login - ${err.response?.status || 'No response'}`);
    addResult('/auth/login', 'POST', 'FAIL', err.response?.status, err.message);
  }

  // If no token, skip the rest
  if (!authToken) {
    failed('No auth token obtained. Skipping authenticated endpoints.');
    return;
  }

  // Add auth header for remaining tests
  client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

  try {
    // Forgot Password
    const forgotRes = await client.post('/auth/forgot-password', {
      email: `testuser-${Date.now() - 1000}@test.com`,
    });
    success(`POST /auth/forgot-password - ${forgotRes.status}`);
    addResult('/auth/forgot-password', 'POST', 'PASS', forgotRes.status);
  } catch (err: any) {
    failed(`POST /auth/forgot-password - ${err.response?.status}`);
    addResult('/auth/forgot-password', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Me
    const getMeRes = await client.get('/auth/me');
    success(`GET /auth/me - ${getMeRes.status}`);
    addResult('/auth/me', 'GET', 'PASS', getMeRes.status);
  } catch (err: any) {
    failed(`GET /auth/me - ${err.response?.status}`);
    addResult('/auth/me', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Refresh Token
    const refreshRes = await client.post('/auth/refresh', {
      refreshToken: 'dummy-token',
    });
    // This might fail by design, still log it
    success(`POST /auth/refresh - ${refreshRes.status}`);
    addResult('/auth/refresh', 'POST', 'PASS', refreshRes.status);
  } catch (err: any) {
    // Expected to fail with dummy token
    failed(`POST /auth/refresh - ${err.response?.status}`);
    addResult('/auth/refresh', 'POST', 'FAIL', err.response?.status, 'Expected with dummy token');
  }
};

// ========== USER ENDPOINTS ==========
const testUserEndpoints = async () => {
  log('TESTING USER ENDPOINTS');

  try {
    // Get Profile
    const profileRes = await client.get('/users/profile');
    success(`GET /users/profile - ${profileRes.status}`);
    addResult('/users/profile', 'GET', 'PASS', profileRes.status);
  } catch (err: any) {
    failed(`GET /users/profile - ${err.response?.status}`);
    addResult('/users/profile', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Update Profile
    const updateRes = await client.put('/users/profile', {
      name: 'Updated Test User',
      phone: '1234567890',
      bio: 'Test bio',
    });
    success(`PUT /users/profile - ${updateRes.status}`);
    addResult('/users/profile', 'PUT', 'PASS', updateRes.status);
  } catch (err: any) {
    failed(`PUT /users/profile - ${err.response?.status}`);
    addResult('/users/profile', 'PUT', 'FAIL', err.response?.status, err.message);
  }

  try {
    // List Users
    const listRes = await client.get('/users?page=1&limit=10');
    success(`GET /users - ${listRes.status}`);
    addResult('/users', 'GET', 'PASS', listRes.status);
  } catch (err: any) {
    failed(`GET /users - ${err.response?.status}`);
    addResult('/users', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get User by ID
    if (userId) {
      const userRes = await client.get(`/users/${userId}`);
      success(`GET /users/{id} - ${userRes.status}`);
      addResult('/users/{id}', 'GET', 'PASS', userRes.status);
    } else {
      addResult('/users/{id}', 'GET', 'SKIP', undefined, 'No user ID');
    }
  } catch (err: any) {
    failed(`GET /users/{id} - ${err.response?.status}`);
    addResult('/users/{id}', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Export Users
    const exportRes = await client.get('/users/export?format=json');
    success(`GET /users/export - ${exportRes.status}`);
    addResult('/users/export', 'GET', 'PASS', exportRes.status);
  } catch (err: any) {
    failed(`GET /users/export - ${err.response?.status}`);
    addResult('/users/export', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Enable 2FA
    const enable2faRes = await client.post('/users/two-factor/enable');
    success(`POST /users/two-factor/enable - ${enable2faRes.status}`);
    addResult('/users/two-factor/enable', 'POST', 'PASS', enable2faRes.status);
  } catch (err: any) {
    failed(`POST /users/two-factor/enable - ${err.response?.status}`);
    addResult('/users/two-factor/enable', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Change Password
    const changePassRes = await client.post('/users/change-password', {
      currentPassword: 'Test@123456',
      newPassword: 'NewPass@123456',
    });
    success(`POST /users/change-password - ${changePassRes.status}`);
    addResult('/users/change-password', 'POST', 'PASS', changePassRes.status);
  } catch (err: any) {
    failed(`POST /users/change-password - ${err.response?.status}`);
    addResult('/users/change-password', 'POST', 'FAIL', err.response?.status, err.message);
  }
};

// ========== UPLOAD ENDPOINTS ==========
const testUploadEndpoints = async () => {
  log('TESTING UPLOAD ENDPOINTS');

  try {
    // Single File Upload (simulated with string data)
    const uploadRes = await client.post(
      '/uploads/single',
      { file: Buffer.from('test image data') },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    success(`POST /uploads/single - ${uploadRes.status}`);
    uploadedFileUrl = uploadRes.data.data?.url || '';
    addResult('/uploads/single', 'POST', 'PASS', uploadRes.status);
  } catch (err: any) {
    failed(`POST /uploads/single - ${err.response?.status}`);
    addResult('/uploads/single', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Multiple File Upload
    const multipleRes = await client.post(
      '/uploads/multiple',
      { files: [Buffer.from('file1'), Buffer.from('file2')] },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    success(`POST /uploads/multiple - ${multipleRes.status}`);
    addResult('/uploads/multiple', 'POST', 'PASS', multipleRes.status);
  } catch {
    failed(`POST /uploads/multiple - ${multipleRes.response?.status}`);
    addResult(
      '/uploads/multiple',
      'POST',
      'FAIL',
      multipleRes.response?.status,
      multipleRes.message
    );
  }
};

// ========== PAYMENT ENDPOINTS ==========
const testPaymentEndpoints = async () => {
  log('TESTING PAYMENT ENDPOINTS');

  try {
    // Create Payment Intent
    const intentRes = await client.post('/payments/create-intent', {
      amount: 1999,
      currency: 'usd',
    });
    success(`POST /payments/create-intent - ${intentRes.status}`);
    addResult('/payments/create-intent', 'POST', 'PASS', intentRes.status);
  } catch (err: any) {
    failed(`POST /payments/create-intent - ${err.response?.status}`);
    addResult('/payments/create-intent', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Payments
    const paymentsRes = await client.get('/payments?page=1&limit=10');
    success(`GET /payments - ${paymentsRes.status}`);
    addResult('/payments', 'GET', 'PASS', paymentsRes.status);
  } catch (err: any) {
    failed(`GET /payments - ${err.response?.status}`);
    addResult('/payments', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Payment by ID (dummy)
    const paymentRes = await client.get('/payments/dummy-id');
    success(`GET /payments/{id} - ${paymentRes.status}`);
    addResult('/payments/{id}', 'GET', 'PASS', paymentRes.status);
  } catch (err: any) {
    failed(`GET /payments/{id} - ${err.response?.status}`);
    addResult('/payments/{id}', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Payment History
    const historyRes = await client.get('/payments/history?page=1');
    success(`GET /payments/history - ${historyRes.status}`);
    addResult('/payments/history', 'GET', 'PASS', historyRes.status);
  } catch (err: any) {
    failed(`GET /payments/history - ${err.response?.status}`);
    addResult('/payments/history', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== EMAIL ENDPOINTS ==========
const testEmailEndpoints = async () => {
  log('TESTING EMAIL ENDPOINTS');

  try {
    // Get Templates
    const templatesRes = await client.get('/email/templates');
    success(`GET /email/templates - ${templatesRes.status}`);
    addResult('/email/templates', 'GET', 'PASS', templatesRes.status);
  } catch (err: any) {
    failed(`GET /email/templates - ${err.response?.status}`);
    addResult('/email/templates', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Send Email
    const sendRes = await client.post('/email/send', {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test</h1>',
    });
    success(`POST /email/send - ${sendRes.status}`);
    addResult('/email/send', 'POST', 'PASS', sendRes.status);
  } catch (err: any) {
    failed(`POST /email/send - ${err.response?.status}`);
    addResult('/email/send', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Send Template Email
    const templateRes = await client.post('/email/templates/welcome', {
      to: 'test@example.com',
    });
    success(`POST /email/templates/{name} - ${templateRes.status}`);
    addResult('/email/templates/{name}', 'POST', 'PASS', templateRes.status);
  } catch (err: any) {
    failed(`POST /email/templates/{name} - ${err.response?.status}`);
    addResult('/email/templates/{name}', 'POST', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Send Bulk Email
    const bulkRes = await client.post('/email/bulk', {
      recipients: ['test1@example.com', 'test2@example.com'],
      template: 'welcome',
    });
    success(`POST /email/bulk - ${bulkRes.status}`);
    addResult('/email/bulk', 'POST', 'PASS', bulkRes.status);
  } catch (err: any) {
    failed(`POST /email/bulk - ${err.response?.status}`);
    addResult('/email/bulk', 'POST', 'FAIL', err.response?.status, err.message);
  }
};

// ========== NOTIFICATION ENDPOINTS ==========
const testNotificationEndpoints = async () => {
  log('TESTING NOTIFICATION ENDPOINTS');

  try {
    // Get Notifications
    const notifRes = await client.get('/notifications');
    success(`GET /notifications - ${notifRes.status}`);
    if (notifRes.data.data?.data?.[0]?._id) {
      notificationId = notifRes.data.data.data[0]._id;
    }
    addResult('/notifications', 'GET', 'PASS', notifRes.status);
  } catch (err: any) {
    failed(`GET /notifications - ${err.response?.status}`);
    addResult('/notifications', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Unread Count
    const unreadRes = await client.get('/notifications/unread');
    success(`GET /notifications/unread - ${unreadRes.status}`);
    addResult('/notifications/unread', 'GET', 'PASS', unreadRes.status);
  } catch (err: any) {
    failed(`GET /notifications/unread - ${err.response?.status}`);
    addResult('/notifications/unread', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Mark as Read
    if (notificationId) {
      const readRes = await client.put(`/notifications/${notificationId}/read`);
      success(`PUT /notifications/{id}/read - ${readRes.status}`);
      addResult('/notifications/{id}/read', 'PUT', 'PASS', readRes.status);
    } else {
      addResult('/notifications/{id}/read', 'PUT', 'SKIP', undefined, 'No notification ID');
    }
  } catch (err: any) {
    failed(`PUT /notifications/{id}/read - ${err.response?.status}`);
    addResult('/notifications/{id}/read', 'PUT', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Mark All as Read
    const readAllRes = await client.put('/notifications/read-all');
    success(`PUT /notifications/read-all - ${readAllRes.status}`);
    addResult('/notifications/read-all', 'PUT', 'PASS', readAllRes.status);
  } catch (err: any) {
    failed(`PUT /notifications/read-all - ${err.response?.status}`);
    addResult('/notifications/read-all', 'PUT', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Update Preferences
    const prefRes = await client.put('/notifications/preferences', {
      email: true,
      push: false,
      sms: true,
    });
    success(`PUT /notifications/preferences - ${prefRes.status}`);
    addResult('/notifications/preferences', 'PUT', 'PASS', prefRes.status);
  } catch (err: any) {
    failed(`PUT /notifications/preferences - ${err.response?.status}`);
    addResult('/notifications/preferences', 'PUT', 'FAIL', err.response?.status, err.message);
  }
};

// ========== SEARCH ENDPOINTS ==========
const testSearchEndpoints = async () => {
  log('TESTING SEARCH ENDPOINTS');

  try {
    // Search Users
    const searchRes = await client.get('/search/users?q=test&page=1');
    success(`GET /search/users - ${searchRes.status}`);
    addResult('/search/users', 'GET', 'PASS', searchRes.status);
  } catch (err: any) {
    failed(`GET /search/users - ${err.response?.status}`);
    addResult('/search/users', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Global Search
    const globalRes = await client.get('/search/all?q=test&type=user');
    success(`GET /search/all - ${globalRes.status}`);
    addResult('/search/all', 'GET', 'PASS', globalRes.status);
  } catch (err: any) {
    failed(`GET /search/all - ${err.response?.status}`);
    addResult('/search/all', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Search Suggestions
    const suggestRes = await client.get('/search/suggest?q=test');
    success(`GET /search/suggest - ${suggestRes.status}`);
    addResult('/search/suggest', 'GET', 'PASS', suggestRes.status);
  } catch (err: any) {
    failed(`GET /search/suggest - ${err.response?.status}`);
    addResult('/search/suggest', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Search History
    const historyRes = await client.get('/search/history');
    success(`GET /search/history - ${historyRes.status}`);
    addResult('/search/history', 'GET', 'PASS', historyRes.status);
  } catch (err: any) {
    failed(`GET /search/history - ${err.response?.status}`);
    addResult('/search/history', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== AUDIT ENDPOINTS (Admin only) ==========
const testAuditEndpoints = async () => {
  log('TESTING AUDIT ENDPOINTS');

  try {
    // Get Audit Logs
    const auditRes = await client.get('/audit?page=1&limit=10');
    success(`GET /audit - ${auditRes.status}`);
    addResult('/audit', 'GET', 'PASS', auditRes.status);
  } catch (err: any) {
    failed(`GET /audit - ${err.response?.status}`);
    addResult('/audit', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Audit by ID
    const auditIdRes = await client.get('/audit/dummy-id');
    success(`GET /audit/{id} - ${auditIdRes.status}`);
    addResult('/audit/{id}', 'GET', 'PASS', auditIdRes.status);
  } catch (err: any) {
    failed(`GET /audit/{id} - ${err.response?.status}`);
    addResult('/audit/{id}', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Export Audit Logs
    const exportRes = await client.get('/audit/export?format=json');
    success(`GET /audit/export - ${exportRes.status}`);
    addResult('/audit/export', 'GET', 'PASS', exportRes.status);
  } catch (err: any) {
    failed(`GET /audit/export - ${err.response?.status}`);
    addResult('/audit/export', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== DASHBOARD ENDPOINTS (Admin only) ==========
const testDashboardEndpoints = async () => {
  log('TESTING DASHBOARD ENDPOINTS');

  try {
    // Get Stats
    const statsRes = await client.get('/dashboard/stats');
    success(`GET /dashboard/stats - ${statsRes.status}`);
    addResult('/dashboard/stats', 'GET', 'PASS', statsRes.status);
  } catch (err: any) {
    failed(`GET /dashboard/stats - ${err.response?.status}`);
    addResult('/dashboard/stats', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Realtime
    const realtimeRes = await client.get('/dashboard/realtime');
    success(`GET /dashboard/realtime - ${realtimeRes.status}`);
    addResult('/dashboard/realtime', 'GET', 'PASS', realtimeRes.status);
  } catch (err: any) {
    failed(`GET /dashboard/realtime - ${err.response?.status}`);
    addResult('/dashboard/realtime', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Activity
    const activityRes = await client.get('/dashboard/activity');
    success(`GET /dashboard/activity - ${activityRes.status}`);
    addResult('/dashboard/activity', 'GET', 'PASS', activityRes.status);
  } catch (err: any) {
    failed(`GET /dashboard/activity - ${err.response?.status}`);
    addResult('/dashboard/activity', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Get Users Growth
    const growthRes = await client.get('/dashboard/users-growth?days=30');
    success(`GET /dashboard/users-growth - ${growthRes.status}`);
    addResult('/dashboard/users-growth', 'GET', 'PASS', growthRes.status);
  } catch (err: any) {
    failed(`GET /dashboard/users-growth - ${err.response?.status}`);
    addResult('/dashboard/users-growth', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== MONITORING ENDPOINTS (No auth) ==========
const testMonitoringEndpoints = async () => {
  log('TESTING MONITORING ENDPOINTS');

  // Temporarily remove auth header
  const tempClient = axios.create({ baseURL: BASE_URL });

  try {
    // Health Check
    const healthRes = await tempClient.get('/monitoring/health');
    success(`GET /monitoring/health - ${healthRes.status}`);
    addResult('/monitoring/health', 'GET', 'PASS', healthRes.status);
  } catch (err: any) {
    failed(`GET /monitoring/health - ${err.response?.status}`);
    addResult('/monitoring/health', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Detailed Health
    const detailedRes = await tempClient.get('/monitoring/health/detailed');
    success(`GET /monitoring/health/detailed - ${detailedRes.status}`);
    addResult('/monitoring/health/detailed', 'GET', 'PASS', detailedRes.status);
  } catch (err: any) {
    failed(`GET /monitoring/health/detailed - ${err.response?.status}`);
    addResult('/monitoring/health/detailed', 'GET', 'FAIL', err.response?.status, err.message);
  }

  try {
    // Metrics
    const metricsRes = await tempClient.get('/monitoring/metrics');
    success(`GET /monitoring/metrics - ${metricsRes.status}`);
    addResult('/monitoring/metrics', 'GET', 'PASS', metricsRes.status);
  } catch (err: any) {
    failed(`GET /monitoring/metrics - ${err.response?.status}`);
    addResult('/monitoring/metrics', 'GET', 'FAIL', err.response?.status, err.message);
  }
};

// ========== MAIN TEST RUNNER ==========
async function runAllTests() {
  console.log('========================================');
  console.log('RUNNING COMPREHENSIVE ENDPOINT TESTS');
  console.log('========================================');

  await testMonitoringEndpoints(); // No auth needed
  await testAuthEndpoints();

  if (!authToken) {
    console.log('\n❌ Failed to get authentication token. Skipping authenticated endpoints.');
    return;
  }

  await testUserEndpoints();
  await testUploadEndpoints();
  await testPaymentEndpoints();
  await testEmailEndpoints();
  await testNotificationEndpoints();
  await testSearchEndpoints();

  // Try admin endpoints (might fail if user is not admin)
  await testAuditEndpoints();
  await testDashboardEndpoints();

  // ========== SUMMARY ==========
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
    console.log(`⚠️  ${failed} tests failed. Please review logs above.`);
  }
  console.log('========================================\n');
}

runAllTests().catch(console.error);
