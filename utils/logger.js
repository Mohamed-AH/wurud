/**
 * Production Logging Utility
 *
 * Suppresses non-essential console output (log, debug, info) in production.
 * Only error and warn messages are preserved in production for critical diagnostics.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

/**
 * Logger object with environment-aware output
 * - In production: suppresses log, debug, info
 * - In development: all output enabled
 */
const logger = {
  /**
   * General logging - suppressed in production
   */
  log: isProduction
    ? () => {}
    : (...args) => originalConsole.log(...args),

  /**
   * Debug messages - suppressed in production
   */
  debug: isProduction
    ? () => {}
    : (...args) => originalConsole.debug('[DEBUG]', ...args),

  /**
   * Informational messages - suppressed in production
   */
  info: isProduction
    ? () => {}
    : (...args) => originalConsole.info('[INFO]', ...args),

  /**
   * Warning messages - always enabled (important for diagnostics)
   */
  warn: (...args) => originalConsole.warn('[WARN]', ...args),

  /**
   * Error messages - always enabled (critical for debugging)
   */
  error: (...args) => originalConsole.error('[ERROR]', ...args)
};

/**
 * Override global console methods to suppress non-essential output in production
 * Call this once at application startup to globally suppress console output
 */
function suppressConsoleInProduction() {
  if (!isProduction) {
    return; // No-op in development
  }

  // Suppress log, debug, info in production
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};

  // Keep warn and error for critical diagnostics
  // console.warn and console.error remain unchanged
}

/**
 * Restore original console methods (useful for testing)
 */
function restoreConsole() {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

module.exports = {
  logger,
  suppressConsoleInProduction,
  restoreConsole,
  isProduction
};
