/**
 * Unit Tests for Database Configuration
 * Tests MongoDB connection and event handling
 */

// Create mock functions that persist across module resets
const mockConnect = jest.fn();
const mockOn = jest.fn();
const mockClose = jest.fn();

jest.mock('mongoose', () => ({
  connect: mockConnect,
  connection: {
    host: 'localhost',
    name: 'test-db',
    on: mockOn,
    close: mockClose
  }
}));

describe('Database Configuration', () => {
  const originalEnv = process.env;
  const originalExit = process.exit;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

    process.exit = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset mocks
    mockConnect.mockReset();
    mockOn.mockReset();
    mockClose.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
    jest.restoreAllMocks();
  });

  describe('connectDB()', () => {
    it('should connect to MongoDB successfully', async () => {
      const mockConnection = {
        connection: {
          host: 'localhost',
          name: 'test-db'
        }
      };
      mockConnect.mockResolvedValue(mockConnection);

      const connectDB = require('../../../config/database');
      const result = await connectDB();

      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.any(Object)
      );
      expect(result).toBe(mockConnection);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB Connected')
      );
    });

    it('should log database name on successful connection', async () => {
      const mockConnection = {
        connection: {
          host: 'cluster.mongodb.net',
          name: 'wurud-production'
        }
      };
      mockConnect.mockResolvedValue(mockConnection);

      const connectDB = require('../../../config/database');
      await connectDB();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('cluster.mongodb.net')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('wurud-production')
      );
    });

    it('should set up error event handler', async () => {
      const mockConnection = {
        connection: { host: 'localhost', name: 'test' }
      };
      mockConnect.mockResolvedValue(mockConnection);

      const connectDB = require('../../../config/database');
      await connectDB();

      expect(mockOn).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('should set up disconnected event handler', async () => {
      const mockConnection = {
        connection: { host: 'localhost', name: 'test' }
      };
      mockConnect.mockResolvedValue(mockConnection);

      const connectDB = require('../../../config/database');
      await connectDB();

      expect(mockOn).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
    });

    it('should handle connection error handler being called', async () => {
      const mockConnection = {
        connection: { host: 'localhost', name: 'test' }
      };
      mockConnect.mockResolvedValue(mockConnection);

      // Capture the error handler
      let errorHandler;
      mockOn.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      const connectDB = require('../../../config/database');
      await connectDB();

      // Simulate an error event
      const testError = new Error('Connection lost');
      errorHandler(testError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection error'),
        testError
      );
    });

    it('should handle disconnected event handler being called', async () => {
      const mockConnection = {
        connection: { host: 'localhost', name: 'test' }
      };
      mockConnect.mockResolvedValue(mockConnection);

      // Capture the disconnected handler
      let disconnectedHandler;
      mockOn.mockImplementation((event, handler) => {
        if (event === 'disconnected') {
          disconnectedHandler = handler;
        }
      });

      const connectDB = require('../../../config/database');
      await connectDB();

      // Simulate disconnect event
      disconnectedHandler();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB disconnected')
      );
    });

    it('should exit process on connection failure', async () => {
      const connectionError = new Error('Connection refused');
      mockConnect.mockRejectedValue(connectionError);

      const connectDB = require('../../../config/database');
      await connectDB();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection failed'),
        'Connection refused'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle SIGINT for graceful shutdown', async () => {
      const mockConnection = {
        connection: { host: 'localhost', name: 'test' }
      };
      mockConnect.mockResolvedValue(mockConnection);
      mockClose.mockResolvedValue();

      // Capture SIGINT handler
      let sigintHandler;
      const originalOn = process.on;
      process.on = jest.fn((event, handler) => {
        if (event === 'SIGINT') {
          sigintHandler = handler;
        }
        return process;
      });

      const connectDB = require('../../../config/database');
      await connectDB();

      // Verify SIGINT handler was registered
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      // Simulate SIGINT
      if (sigintHandler) {
        await sigintHandler();
      }

      expect(mockClose).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);

      // Restore
      process.on = originalOn;
    });
  });
});
