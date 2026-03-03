/**
 * Unit Tests for validators utility
 * Tests input validation, sanitization, and security functions
 */

const mongoose = require('mongoose');
const {
  isValidObjectId,
  sanitizeMongoQuery,
  handleValidationErrors
} = require('../../utils/validators');

describe('Validators Utility', () => {
  describe('isValidObjectId()', () => {
    it('should return true for valid ObjectId strings', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('000000000000000000000000')).toBe(true);
      expect(isValidObjectId('ffffffffffffffffffffffff')).toBe(true);
    });

    it('should return true for valid ObjectId instances', () => {
      const objectId = new mongoose.Types.ObjectId();
      expect(isValidObjectId(objectId)).toBe(true);
    });

    it('should return false for invalid ObjectId strings', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('12345')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // too short
      expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // too long
    });

    it('should return false for non-string types', () => {
      expect(isValidObjectId(null)).toBe(false);
      expect(isValidObjectId(undefined)).toBe(false);
      expect(isValidObjectId(123456789012345678901234)).toBe(false);
      expect(isValidObjectId({})).toBe(false);
      expect(isValidObjectId([])).toBe(false);
    });

    it('should return false for ObjectId-like strings with invalid characters', () => {
      expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // 'g' is invalid
      expect(isValidObjectId('507f1f77bcf86cd79943901!')).toBe(false);
    });
  });

  describe('sanitizeMongoQuery()', () => {
    it('should return primitive values unchanged', () => {
      expect(sanitizeMongoQuery('test')).toBe('test');
      expect(sanitizeMongoQuery(123)).toBe(123);
      expect(sanitizeMongoQuery(true)).toBe(true);
      expect(sanitizeMongoQuery(null)).toBe(null);
    });

    it('should sanitize objects by removing $ prefixed keys', () => {
      const input = {
        name: 'test',
        $gt: 100,
        $lt: 200
      };
      const result = sanitizeMongoQuery(input);

      expect(result).toEqual({ name: 'test' });
      expect(result).not.toHaveProperty('$gt');
      expect(result).not.toHaveProperty('$lt');
    });

    it('should sanitize objects by removing keys containing dots', () => {
      const input = {
        name: 'test',
        'nested.key': 'value',
        'another.nested.key': 'value2'
      };
      const result = sanitizeMongoQuery(input);

      expect(result).toEqual({ name: 'test' });
      expect(result).not.toHaveProperty('nested.key');
    });

    it('should sanitize nested objects recursively', () => {
      const input = {
        outer: {
          inner: 'valid',
          $where: 'malicious',
          'dotted.key': 'invalid'
        }
      };
      const result = sanitizeMongoQuery(input);

      expect(result.outer).toEqual({ inner: 'valid' });
      expect(result.outer).not.toHaveProperty('$where');
      expect(result.outer).not.toHaveProperty('dotted.key');
    });

    it('should sanitize arrays', () => {
      const input = [
        { name: 'valid' },
        { $gt: 100 }
      ];
      const result = sanitizeMongoQuery(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual({ name: 'valid' });
      expect(result[1]).toEqual({});
    });

    it('should handle deeply nested structures', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              valid: 'data',
              $regex: 'attack'
            }
          }
        }
      };
      const result = sanitizeMongoQuery(input);

      expect(result.level1.level2.level3).toEqual({ valid: 'data' });
    });

    it('should prevent NoSQL injection patterns', () => {
      // Common NoSQL injection patterns
      const injectionPatterns = [
        { $where: 'this.password.length > 0' },
        { $gt: '' },
        { $ne: null },
        { $regex: '.*' },
        { password: { $gt: '' } }
      ];

      injectionPatterns.forEach(pattern => {
        const result = sanitizeMongoQuery(pattern);
        // Result should not contain any $ prefixed keys at any level
        const hasInjection = JSON.stringify(result).includes('"$');
        expect(hasInjection).toBe(false);
      });
    });
  });

  describe('handleValidationErrors middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should call next() when there are no validation errors', () => {
      // Mock validationResult to return empty errors
      mockReq._validationErrors = [];

      // Create a request that passes validation
      const { validationResult } = require('express-validator');

      // Since we can't easily mock express-validator here,
      // we test the basic behavior - the middleware should call next
      // when validationResult returns empty
      handleValidationErrors(mockReq, mockRes, mockNext);

      // If there are no errors in the request, next should be called
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
