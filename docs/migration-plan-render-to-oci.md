# Migration Plan: Render Free Tier → Oracle Cloud (OCI) Free Tier

## Executive Summary

| Aspect | Render Free Tier | OCI Always Free |
|--------|------------------|-----------------|
| **RAM** | 512 MB | Up to 24 GB (ARM) |
| **CPU** | Shared | 4 OCPUs (ARM) |
| **Storage** | 0 (ephemeral) | 200 GB block storage |
| **Bandwidth** | Limited | 10 TB/month outbound |
| **Cost** | Free | Free (Always Free) |

Your OOM kills stem from the 512MB limit. OCI's ARM instance with 24GB RAM eliminates this bottleneck entirely.

---

## Phase 1: OCI Compute Instance Setup

### 1.1 Create the ARM Compute Instance

**Recommended Configuration:**
- **Shape:** VM.Standard.A1.Flex (ARM Ampere)
- **OCPUs:** 2 (start conservative, can scale to 4)
- **Memory:** 12 GB (start with half, scale if needed)
- **Image:** Oracle Linux 8 or Ubuntu 22.04 (aarch64)
- **Boot Volume:** 50 GB (within 200GB free limit)

> **Note:** ARM instances may face capacity constraints. If you get "Out of capacity" errors, try different availability domains or upgrade to Pay-As-You-Go (PAYG) — you won't be charged for Always Free resources. ([Source](https://medium.com/@me69oshan/get-always-free-vm-instance-in-oracle-cloud-and-solve-out-of-host-capacity-issue-the-easy-way-88babae4eae5))

### 1.2 Initial Instance Setup

```bash
# SSH into your instance
ssh -i ~/.ssh/your-key opc@<public-ip>

# Update system
sudo dnf update -y

# Install Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker opc
newgrp docker
```

### 1.3 Configure Firewall & Security Lists

```bash
# Open ports in OS firewall
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

**In OCI Console:**
1. Navigate: Networking → Virtual Cloud Networks → Your VCN → Security Lists
2. Add Ingress Rules:
   - TCP 80 from 0.0.0.0/0 (HTTP)
   - TCP 443 from 0.0.0.0/0 (HTTPS)
   - TCP 3000 from 0.0.0.0/0 (Node.js, temporary)

---

## Phase 2: Application Deployment

### 2.1 Modify Dockerfile for ARM

Your existing Dockerfile should work, but verify ARM compatibility:

```dockerfile
# Already correct - node:20-alpine supports ARM64
FROM node:20-alpine

# Rest of your Dockerfile remains the same
```

### 2.2 Create Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  duroos:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: duroos-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    # No memory limits needed - you have 12GB+!
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - duroos

volumes:
  caddy_data:
  caddy_config:
```

### 2.3 Create Caddyfile (Automatic HTTPS)

```
yourdomain.com {
    reverse_proxy duroos:3000

    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    log {
        output file /data/access.log {
            roll_size 50mb
            roll_keep 5
        }
    }
}
```

### 2.4 Update PM2 Configuration

Since you now have abundant memory, simplify `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'duroos',
    script: 'server.js',
    instances: 2,  // Can now run multiple instances!
    exec_mode: 'cluster',
    max_memory_restart: '2G',  // Generous limit
    node_args: '--max-old-space-size=2048',  // 2GB heap per instance
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,

    // Monitoring
    instance_var: 'INSTANCE_ID'
  }]
};
```

---

## Phase 3: Logging, Tracing & Monitoring

### Recommended Stack (Low Overhead)

Given your preference for practical tools over enterprise stacks, here's a lightweight approach:

| Component | Tool | Memory Usage | Why |
|-----------|------|--------------|-----|
| **Logs** | Docker JSON + Logrotate | ~0 | Built-in, zero overhead |
| **Metrics** | VictoriaMetrics | ~30-50 MB | Prometheus-compatible, lighter |
| **Dashboards** | Grafana | ~100 MB | Or skip entirely |
| **Alerts** | VictoriaMetrics vmalert | ~20 MB | Built-in alerting |
| **Uptime** | Better Stack (Free) | 0 (external) | External monitoring |

### 3.1 Option A: Minimal (Recommended for Simplicity)

**Just use Docker's built-in logging + external uptime monitoring:**

```yaml
# In docker-compose.prod.yml - already configured
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "5"
```

**Add Better Stack or UptimeRobot (Free tier):**
- Monitor `/health` endpoint
- Get alerts on downtime
- Basic response time tracking

**View logs:**
```bash
# Tail logs
docker logs -f duroos-app

# Search logs
docker logs duroos-app 2>&1 | grep "error"
```

### 3.2 Option B: VictoriaMetrics (If You Want Metrics)

Add to `docker-compose.prod.yml`:

```yaml
  victoriametrics:
    image: victoriametrics/victoria-metrics:latest
    container_name: victoriametrics
    restart: unless-stopped
    ports:
      - "8428:8428"
    volumes:
      - vm_data:/victoria-metrics-data
    command:
      - "-storageDataPath=/victoria-metrics-data"
      - "-retentionPeriod=30d"
    # Uses ~30-50MB RAM

volumes:
  vm_data:
```

**Add metrics to your Node.js app:**

```bash
npm install prom-client
```

Create `utils/metrics.js`:

```javascript
const client = require('prom-client');

// Collect default metrics (memory, CPU, etc.)
client.collectDefaultMetrics({ prefix: 'duroos_' });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'duroos_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10]
});

const activeStreams = new client.Gauge({
  name: 'duroos_active_streams',
  help: 'Number of active audio streams'
});

module.exports = { client, httpRequestDuration, activeStreams };
```

Add metrics endpoint to `server.js`:

```javascript
const { client } = require('./utils/metrics');

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### 3.3 Structured Logging (Optional Enhancement)

If you want better log searching, update `utils/logger.js`:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: './logs/app.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5
    })
  ]
});

module.exports = logger;
```

---

## Phase 4: Deployment Script

Create `deploy.sh` on your OCI instance:

```bash
#!/bin/bash
set -e

APP_DIR="/home/opc/duroos"
REPO_URL="https://github.com/yourusername/wurud.git"

echo "=== Deploying Duroos ==="

# Pull latest code
cd $APP_DIR
git pull origin main

# Build and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Cleanup old images
docker image prune -f

# Show status
docker compose -f docker-compose.prod.yml ps

echo "=== Deployment complete ==="
```

---

## Phase 5: DNS & SSL

### 5.1 Point Domain to OCI

1. Get your OCI instance's public IP
2. Update DNS A record: `yourdomain.com → <OCI-IP>`
3. Wait for propagation (5-30 minutes)

### 5.2 Update Environment Variables

```bash
# .env.production
SITE_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

### 5.3 Update Google OAuth

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth client
3. Add authorized redirect URI: `https://yourdomain.com/auth/google/callback`

---

## Complexity Assessment

| Task | Complexity | Time Estimate | Notes |
|------|------------|---------------|-------|
| OCI Instance Setup | Low | 30 min | Straightforward UI |
| Docker Installation | Low | 15 min | Standard commands |
| Security/Firewall | Medium | 20 min | Two layers (OS + OCI) |
| App Deployment | Low | 30 min | Your Docker setup is ready |
| SSL/Domain | Low | 15 min | Caddy handles automatically |
| Monitoring (Basic) | Low | 10 min | External uptime only |
| Monitoring (Full) | Medium | 1-2 hours | VictoriaMetrics + Grafana |
| **Total (Basic)** | **Low** | **~2 hours** | Minimal monitoring |
| **Total (Full)** | **Medium** | **~4 hours** | With metrics stack |

### Operational Complexity Comparison

| Aspect | Render | OCI |
|--------|--------|-----|
| Deployment | Git push (automatic) | SSH + docker compose |
| SSL | Automatic | Automatic (Caddy) |
| Scaling | Limited | Manual (but room to grow) |
| Maintenance | Zero | Security updates (~monthly) |
| Logs | Dashboard | SSH + docker logs |
| Cost Risk | None | None (Always Free) |

---

## Migration Checklist

```
□ Phase 1: OCI Setup
  □ Create ARM compute instance
  □ Install Docker
  □ Configure firewall (OS + OCI Security Lists)
  □ Clone repository

□ Phase 2: Application
  □ Create .env.production with all variables
  □ Create Caddyfile
  □ Create docker-compose.prod.yml
  □ Build and test locally on OCI

□ Phase 3: Monitoring
  □ Set up external uptime monitor (Better Stack/UptimeRobot)
  □ (Optional) Add VictoriaMetrics
  □ Configure log rotation

□ Phase 4: Go Live
  □ Update DNS to point to OCI IP
  □ Update Google OAuth redirect URIs
  □ Test all functionality:
    □ Homepage loads
    □ Admin login works
    □ Audio streaming works
    □ File upload works
  □ Monitor for 24-48 hours

□ Phase 5: Cleanup
  □ Keep Render as backup for 1 week
  □ Delete Render service after stable
```

---

## Key Benefits After Migration

1. **No more OOM kills** - 24x more RAM available
2. **Faster performance** - Can run multiple Node.js instances
3. **Room to grow** - Cache more, enable more features
4. **Better streaming** - More memory for concurrent streams
5. **Lower latency** - OCI has a Jeddah region (me-jeddah-1) close to your users
6. **Already using OCI** - Unified infrastructure with your Object Storage

---

## Sources

- [OCI Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [OCI Free Tier Overview](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm)
- [Docker on OCI Free Tier Setup](https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-docker-on-an-oracle-cloud-free-tier-instance/view)
- [OCI Free Tier with Docker and Traefik](https://angelosantarella.gitlab.io/work/oracle-cloud-free-instances/)
- [Prometheus Alternatives](https://simpleobservability.com/blog/prometheus-alternatives)
- [Node.js Monitoring Tools 2026](https://betterstack.com/community/comparisons/nodejs-application-monitoring-tools/)
- [Grafana Alternatives](https://openobserve.ai/blog/top-10-grafana-alternatives/)
