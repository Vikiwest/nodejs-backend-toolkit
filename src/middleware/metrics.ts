import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import config from '../config/env';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500],
});

register.registerMetric(httpRequestDurationMicroseconds);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationMicroseconds.startTimer();

  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    end({ method: req.method, route, status_code: res.statusCode.toString() });
  });

  next();
};

export const metricsEndpoint = async (req: Request, res: Response) => {
  // Check if raw Prometheus format is explicitly requested
  if (req.query.format === 'prometheus') {
    // Return raw Prometheus metrics
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
  // Check if dashboard is requested
  else if (req.query.dashboard === 'true' || req.headers.accept?.includes('text/html')) {
    try {
      const metricsText = await register.metrics();
      const parsedMetrics = parsePrometheusMetrics(metricsText);

      res.send(generateMetricsDashboard(parsedMetrics));
    } catch (error) {
      console.error('Metrics dashboard error:', error);
      // Log the raw metrics for debugging
      try {
        const metricsText = await register.metrics();
        console.error('Raw metrics sample:', metricsText.substring(0, 500));
      } catch (metricsError) {
        console.error('Could not get raw metrics for debugging:', metricsError);
      }
      res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>❌ Metrics Error</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
    .error { color: #ef4444; font-size: 2rem; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>❌ Metrics Dashboard Error</h1>
  <div class="error">Failed to load metrics data</div>
  <a href="/metrics?format=prometheus">View Raw Metrics</a> | <a href="/">Back to Home</a>
</body>
</html>
      `);
    }
  } else {
    // Return raw Prometheus metrics
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
};

if (config.isProduction()) {
  // Expose /metrics endpoint
  // To be mounted in app.ts
}

// Helper function to parse Prometheus metrics text format
function parsePrometheusMetrics(metricsText: string) {
  const lines = metricsText.split('\n');
  const metrics: any = {
    histograms: {},
    gauges: {},
    counters: {},
    summaries: {},
  };

  let currentMetric: any = null;
  for (const line of lines) {
    if (line.startsWith('# HELP ')) {
      const parts = line.split(' ');
      if (parts.length >= 3) {
        const name = parts[2];
        const help = parts.slice(3).join(' ');
        currentMetric = { name, help, values: [] };
      }
    } else if (line.startsWith('# TYPE ')) {
      const parts = line.split(' ');
      if (parts.length >= 4 && currentMetric) {
        const type = parts[3]; // Type is at index 3
        currentMetric.type = type;
        // Initialize the type category if it doesn't exist
        if (!metrics[type + 's']) {
          metrics[type + 's'] = {};
        }
        metrics[type + 's'][currentMetric.name] = currentMetric;
      }
    } else if (line.trim() && !line.startsWith('#') && currentMetric) {
      // Parse metric value line
      const [metricLine, value] = line.split(' ');
      if (metricLine && value) {
        const [, labels] = metricLine.split('{');
        const parsedValue = parseFloat(value);

        if (!isNaN(parsedValue)) {
          const metricValue: any = { value: parsedValue };

          // Parse labels if they exist
          if (labels) {
            const labelPairs = labels.replace('}', '').split(',');
            metricValue.labels = {};
            labelPairs.forEach((pair) => {
              const [key, val] = pair.split('=');
              if (key && val) {
                metricValue.labels[key] = val.replace(/"/g, '');
              }
            });
          }

          currentMetric.values.push(metricValue);
        }
      }
    }
  }

  return metrics;
}

// Helper function to generate metrics dashboard HTML
function generateMetricsDashboard(metrics: any) {
  // Extract key metrics for display
  const httpRequests = metrics.histograms.http_request_duration_ms || { values: [] };
  const systemMetrics = extractSystemMetrics(metrics);

  // Calculate some derived metrics
  const totalRequests = httpRequests.values.reduce((sum: number, v: any) => sum + v.value, 0);
  const avgResponseTime = calculateAverageResponseTime(httpRequests.values);
  const errorRate = calculateErrorRate(httpRequests.values);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>📊 Application Metrics Dashboard | Node.js Backend Toolkit</title>
  <meta name="description" content="Real-time application performance metrics and monitoring dashboard.">


<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
<link rel="icon" href="/favicon.ico">
<link rel="manifest" href="/site.webmanifest">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      line-height: 1.5;
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .metrics-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .metrics-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #0f172a, #2563eb);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      letter-spacing: -0.02em;
    }

    .metrics-sub {
      color: #475569;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .timestamp-badge {
      display: inline-block;
      background: rgba(37, 99, 235, 0.1);
      backdrop-filter: blur(8px);
      padding: 0.4rem 1.2rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #2563eb;
      margin-top: 1rem;
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      border-radius: 28px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02);
      transition: all 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 30px -12px rgba(0, 0, 0, 0.12);
      background: white;
    }

    .metric-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .metric-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(145deg, #eff6ff, #e0e7ff);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
    }

    .metric-title {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }

    .metric-value {
      font-size: 2.2rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-top: 0.25rem;
    }

    .metric-unit {
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 500;
    }

    .metric-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.7rem;
      border-radius: 30px;
      display: inline-block;
      margin-top: 0.5rem;
    }

    .badge-success { background: #10b98120; color: #047857; border: 1px solid #10b98140; }
    .badge-warning { background: #f59e0b20; color: #b45309; border: 1px solid #f59e0b40; }
    .badge-info { background: #3b82f620; color: #1e40af; border: 1px solid #3b82f640; }

    .chart-section {
      background: white;
      border-radius: 28px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
    }

    .chart-header {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #0f172a;
    }

    .response-time-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .time-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .bar-label {
      min-width: 80px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #475569;
    }

    .bar-container {
      flex: 1;
      height: 24px;
      background: #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      border-radius: 12px;
      transition: width 0.3s ease;
    }

    .bar-fill.fast { background: linear-gradient(90deg, #10b981, #059669); }
    .bar-fill.medium { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .bar-fill.slow { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .bar-value {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0f172a;
      min-width: 60px;
      text-align: right;
    }

    .system-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .sys-metric {
      background: #f8fafc;
      border-radius: 16px;
      padding: 1rem;
      text-align: center;
      border: 1px solid #eef2ff;
    }

    .sys-metric h4 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 0.5rem;
    }

    .sys-metric p {
      font-weight: 700;
      font-size: 1.1rem;
      color: #0f172a;
    }

    .action-bar {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin: 2rem 0 1rem;
    }

    .action-btn {
      background: white;
      border: 1px solid #cbd5e1;
      padding: 0.7rem 1.5rem;
      border-radius: 40px;
      font-weight: 500;
      font-size: 0.85rem;
      color: #1e293b;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-btn:hover {
      background: #f1f5f9;
      border-color: #3b82f6;
      transform: translateY(-1px);
    }

    .action-btn-primary {
      background: #0f172a;
      color: white;
      border: none;
    }

    .action-btn-primary:hover {
      background: #1e293b;
    }

    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #cbd5e180;
    }

    @media (max-width: 640px) {
      body { padding: 1rem; }
      .metric-value { font-size: 1.6rem; }
      .metric-card { padding: 1rem; }
    }
  </style>
</head>
<body>
<div class="dashboard-container">
  <div class="metrics-header">
    <h1><span>📊</span> Application Metrics</h1>
    <div class="metrics-sub">Performance monitoring & system observability</div>
    <div class="timestamp-badge" id="liveTimestamp">Loading timestamp...</div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon">🚀</div>
        <div>
          <div class="metric-title">Total Requests</div>
        </div>
      </div>
      <div class="metric-value">${Math.round(totalRequests || 0)}</div>
      <span class="metric-badge badge-info">Since startup</span>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon">⚡</div>
        <div>
          <div class="metric-title">Avg Response Time</div>
        </div>
      </div>
      <div class="metric-value">${avgResponseTime.toFixed(1)}<span class="metric-unit">ms</span></div>
      <span class="metric-badge badge-success">P50 latency</span>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon">❌</div>
        <div>
          <div class="metric-title">Error Rate</div>
        </div>
      </div>
      <div class="metric-value">${(errorRate * 100).toFixed(1)}<span class="metric-unit">%</span></div>
      <span class="metric-badge ${errorRate > 0.05 ? 'badge-warning' : 'badge-success'}">5xx responses</span>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon">💾</div>
        <div>
          <div class="metric-title">Memory Usage</div>
        </div>
      </div>
      <div class="metric-value">${systemMetrics.heapUsed || 'N/A'}<span class="metric-unit">MB</span></div>
      <span class="metric-badge badge-info">Heap allocated</span>
    </div>
  </div>

  <div class="chart-section">
    <div class="chart-header">📈 Response Time Distribution</div>
    <div class="response-time-bars">
      <div class="time-bar">
        <div class="bar-label">&lt; 15ms</div>
        <div class="bar-container">
          <div class="bar-fill fast" style="width: ${getBucketPercentage(httpRequests.values, '15')}%;"></div>
        </div>
        <div class="bar-value">${getBucketValue(httpRequests.values, '15')}</div>
      </div>
      <div class="time-bar">
        <div class="bar-label">15-50ms</div>
        <div class="bar-container">
          <div class="bar-fill fast" style="width: ${getBucketPercentage(httpRequests.values, '50') - getBucketPercentage(httpRequests.values, '15')}%;"></div>
        </div>
        <div class="bar-value">${getBucketValue(httpRequests.values, '50') - getBucketValue(httpRequests.values, '15')}</div>
      </div>
      <div class="time-bar">
        <div class="bar-label">50-100ms</div>
        <div class="bar-container">
          <div class="bar-fill medium" style="width: ${getBucketPercentage(httpRequests.values, '100') - getBucketPercentage(httpRequests.values, '50')}%;"></div>
        </div>
        <div class="bar-value">${getBucketValue(httpRequests.values, '100') - getBucketValue(httpRequests.values, '50')}</div>
      </div>
      <div class="time-bar">
        <div class="bar-label">100-200ms</div>
        <div class="bar-container">
          <div class="bar-fill medium" style="width: ${getBucketPercentage(httpRequests.values, '200') - getBucketPercentage(httpRequests.values, '100')}%;"></div>
        </div>
        <div class="bar-value">${getBucketValue(httpRequests.values, '200') - getBucketValue(httpRequests.values, '100')}</div>
      </div>
      <div class="time-bar">
        <div class="bar-label">&gt; 200ms</div>
        <div class="bar-container">
          <div class="bar-fill slow" style="width: ${100 - getBucketPercentage(httpRequests.values, '200')}%;"></div>
        </div>
        <div class="bar-value">${Math.max(0, (httpRequests.values.find((v: any) => v.labels?.le === '+Inf')?.value || 0) - getBucketValue(httpRequests.values, '200'))}</div>
      </div>
    </div>
  </div>

  <div class="chart-section">
    <div class="chart-header">🖥️ System Resources</div>
    <div class="system-metrics">
      <div class="sys-metric">
        <h4>CPU Usage</h4>
        <p>${systemMetrics.cpuUsage || 'N/A'}%</p>
      </div>
      <div class="sys-metric">
        <h4>Memory (RSS)</h4>
        <p>${systemMetrics.rss || 'N/A'} MB</p>
      </div>
      <div class="sys-metric">
        <h4>Heap Used</h4>
        <p>${systemMetrics.heapUsed || 'N/A'} MB</p>
      </div>
      <div class="sys-metric">
        <h4>Event Loop</h4>
        <p>${systemMetrics.eventLoopLag || 'N/A'} ms</p>
      </div>
    </div>
  </div>

  <div class="action-bar">
    <a href="/metrics?format=prometheus" class="action-btn">📄 Raw Prometheus</a>
    <a href="/health?dashboard=true" class="action-btn">🩺 Health Dashboard</a>
    <a href="/api-docs" class="action-btn">📘 API Docs</a>
    <a href="/" class="action-btn">🏠 Back to Home</a>
  </div>

  <div class="footer-note">
    📊 Prometheus Metrics Dashboard — Auto-refreshes every 30 seconds • Powered by prom-client
  </div>
</div>

<script>
  // Update timestamp
  document.getElementById('liveTimestamp').innerText = '📅 Last updated: ' + new Date().toLocaleString();

  // Auto-refresh every 30 seconds
  setInterval(() => {
    window.location.reload();
  }, 30000);
</script>
</body>
</html>`;
}

// Helper functions for metrics calculations
function extractSystemMetrics(metrics: any) {
  const gauges = metrics.gauges || {};
  const counters = metrics.counters || {};
  const result: any = {};

  // Extract gauge metrics
  Object.keys(gauges).forEach((key) => {
    if (key.includes('nodejs_heap_size_used_bytes')) {
      result.heapUsed = Math.round((gauges[key].values[0]?.value || 0) / 1024 / 1024);
    }
    if (key.includes('nodejs_external_memory_bytes')) {
      result.externalMem = Math.round((gauges[key].values[0]?.value || 0) / 1024 / 1024);
    }
    if (key.includes('process_resident_memory_bytes')) {
      result.rss = Math.round((gauges[key].values[0]?.value || 0) / 1024 / 1024);
    }
    if (key.includes('nodejs_eventloop_lag_seconds')) {
      result.eventLoopLag = Math.round((gauges[key].values[0]?.value || 0) * 1000);
    }
  });

  // Calculate CPU usage (approximate percentage)
  const cpuTotal = counters.process_cpu_seconds_total?.values[0]?.value || 0;
  const startTime = gauges.process_start_time_seconds?.values[0]?.value || Date.now() / 1000;
  const uptime = Date.now() / 1000 - startTime;

  if (uptime > 0) {
    result.cpuUsage = Math.round((cpuTotal / uptime) * 100);
  }

  return result;
}

function calculateAverageResponseTime(values: any[]) {
  if (!values || values.length === 0) return 0;

  // This is a simplified calculation - in reality you'd need more complex histogram math
  const totalRequests = values.find((v) => v.labels?.le === '+Inf')?.value || 0;
  if (totalRequests === 0) return 0;

  // Rough approximation using bucket midpoints
  let weightedSum = 0;
  const buckets = [
    { le: 0.1, midpoint: 0.05 },
    { le: 5, midpoint: 2.5 },
    { le: 15, midpoint: 10 },
    { le: 50, midpoint: 32.5 },
    { le: 100, midpoint: 75 },
    { le: 200, midpoint: 150 },
    { le: 300, midpoint: 250 },
    { le: 400, midpoint: 350 },
    { le: 500, midpoint: 450 },
  ];

  let prevCount = 0;
  buckets.forEach((bucket) => {
    const currentCount =
      values.find((v) => parseFloat(v.labels?.le || '0') === bucket.le)?.value || 0;
    const bucketCount = currentCount - prevCount;
    weightedSum += bucketCount * bucket.midpoint;
    prevCount = currentCount;
  });

  return totalRequests > 0 ? weightedSum / totalRequests : 0;
}

function calculateErrorRate(values: any[]) {
  if (!values || values.length === 0) return 0;

  const totalRequests = values.find((v) => v.labels?.le === '+Inf')?.value || 0;
  if (totalRequests === 0) return 0;

  // Count 5xx responses (simplified - would need proper status code filtering)
  const errorRequests = values
    .filter((v) => v.labels?.status_code && v.labels.status_code.startsWith('5'))
    .reduce((sum, v) => sum + v.value, 0);

  return errorRequests / totalRequests;
}

function getBucketValue(values: any[], le: string): number {
  if (!values || values.length === 0) return 0;
  return values.find((v) => v.labels?.le === le)?.value || 0;
}

function getBucketPercentage(values: any[], le: string): number {
  if (!values || values.length === 0) return 0;
  const total = values.find((v) => v.labels?.le === '+Inf')?.value || 1;
  const bucketValue = getBucketValue(values, le);
  return total > 0 ? (bucketValue / total) * 100 : 0;
}
