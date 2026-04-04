/**
 * Push-based Prometheus metrics for Grafana Cloud
 *
 * Collects Node.js metrics (RSS, Heap, CPU, Event Loop Lag) and pushes
 * to Grafana Cloud every 15 seconds. Designed for Render Free Tier where
 * inbound connections are blocked.
 *
 * Environment variables:
 * - GRAFANA_URL: Grafana Cloud push endpoint
 * - GRAFANA_USER_ID: Grafana Cloud user ID
 * - GRAFANA_API_TOKEN: Grafana Cloud API token
 */

const https = require('https');
const { URL } = require('url');

const isProduction = process.env.NODE_ENV === 'production';
const PUSH_INTERVAL_MS = 15000; // 15 seconds

// Environment configuration
const GRAFANA_URL = process.env.GRAFANA_URL;
const GRAFANA_USER_ID = process.env.GRAFANA_USER_ID;
const GRAFANA_API_TOKEN = process.env.GRAFANA_API_TOKEN;

let client = null;
let metricsInitialized = false;

/**
 * Initialize prom-client with default Node.js metrics
 * Called only once to avoid duplicate metric registration
 */
function setupMetricsCollection() {
  if (metricsInitialized) return;

  client = require('prom-client');

  // Collect default Node.js metrics with wurud_ prefix
  client.collectDefaultMetrics({
    prefix: 'wurud_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
  });

  metricsInitialized = true;
}

/**
 * Push metrics to Grafana Cloud using native https module
 * Uses Prometheus text format which Grafana Cloud accepts
 */
async function pushMetrics() {
  if (!client) return;

  try {
    const metricsData = await client.register.metrics();

    const parsedUrl = new URL(GRAFANA_URL);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Basic ${Buffer.from(`${GRAFANA_USER_ID}:${GRAFANA_API_TOKEN}`).toString('base64')}`,
        'Content-Length': Buffer.byteLength(metricsData)
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        // Consume response to free memory
        res.on('data', () => {});
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);

      // Write in chunks to minimize memory usage
      req.write(metricsData);
      req.end();
    });
  } catch (err) {
    // Silent failure in production - metrics are non-critical
    if (!isProduction) {
      console.error('Metrics push failed:', err.message);
    }
  }
}

/**
 * Initialize metrics collection and push worker
 * Only runs in production with valid Grafana configuration
 */
function initMetrics() {
  // Skip in non-production environments
  if (!isProduction) {
    console.log('Metrics: Skipping in development mode');
    return;
  }

  // Validate configuration
  if (!GRAFANA_URL || !GRAFANA_USER_ID || !GRAFANA_API_TOKEN) {
    console.warn('Metrics: Missing Grafana configuration (GRAFANA_URL, GRAFANA_USER_ID, GRAFANA_API_TOKEN)');
    return;
  }

  // Initialize prom-client
  setupMetricsCollection();

  // Start background push worker
  const pushInterval = setInterval(pushMetrics, PUSH_INTERVAL_MS);

  // Don't let the timer prevent process exit
  pushInterval.unref();

  console.warn(`Metrics: Push worker started (${PUSH_INTERVAL_MS / 1000}s interval)`);
}

module.exports = {
  initMetrics
};
