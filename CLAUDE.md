# Wurud Project

## Latest Progress

**Metrics Server Differentiation** (2026-04-06)
- Added `METRIC_TAG` environment variable to uniquely identify server instances in Grafana
- Both prom-client default metrics and custom Influx metrics now include `app_instance` label
- Allows stable and test servers to be filtered separately even when both run with `NODE_ENV=production`
