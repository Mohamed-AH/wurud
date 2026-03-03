/**
 * Unit Tests for dateUtils utility
 * Tests Gregorian to Hijri date conversion
 */

const { convertToHijri, ensureHijriDate } = require('../../utils/dateUtils');

describe('DateUtils Utility', () => {
  describe('convertToHijri()', () => {
    it('should convert a valid Date object to Hijri', () => {
      // January 1, 2024 is approximately 19 Jumada al-Thani 1445
      const result = convertToHijri(new Date('2024-01-01'));
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
      expect(result).toContain('1445');
    });

    it('should convert a valid date string to Hijri', () => {
      const result = convertToHijri('2024-06-15');
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });

    it('should return null for null input', () => {
      expect(convertToHijri(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(convertToHijri(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(convertToHijri('')).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(convertToHijri('not-a-date')).toBeNull();
      expect(convertToHijri('invalid')).toBeNull();
    });

    it('should handle dates from different years', () => {
      // Test dates from different Hijri years
      const date2023 = convertToHijri('2023-07-15');
      const date2024 = convertToHijri('2024-07-15');
      const date2025 = convertToHijri('2025-07-15');

      expect(date2023).toBeTruthy();
      expect(date2024).toBeTruthy();
      expect(date2025).toBeTruthy();

      // Different dates should have different results
      expect(date2023).not.toBe(date2024);
    });

    it('should format output as YYYY/MM/DD', () => {
      const result = convertToHijri('2024-03-15');

      // Check format: 4 digits, slash, 2 digits, slash, 2 digits
      const parts = result.split('/');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^\d{4}$/); // Year
      expect(parts[1]).toMatch(/^\d{2}$/); // Month (padded)
      expect(parts[2]).toMatch(/^\d{2}$/); // Day (padded)
    });

    it('should handle ISO format dates', () => {
      const result = convertToHijri('2024-01-15T12:00:00.000Z');
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });

    it('should handle Date objects with time', () => {
      const dateWithTime = new Date('2024-06-15T18:30:00');
      const result = convertToHijri(dateWithTime);
      expect(result).toBeTruthy();
    });
  });

  describe('ensureHijriDate()', () => {
    it('should add Hijri date when dateRecorded exists but dateRecordedHijri is missing', () => {
      const lectureData = {
        titleArabic: 'محاضرة',
        dateRecorded: new Date('2024-01-15')
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri).toBeTruthy();
      expect(result.dateRecordedHijri).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });

    it('should not overwrite existing Hijri date', () => {
      const lectureData = {
        titleArabic: 'محاضرة',
        dateRecorded: new Date('2024-01-15'),
        dateRecordedHijri: '1445/07/03' // Pre-existing
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri).toBe('1445/07/03');
    });

    it('should not modify data when no dateRecorded', () => {
      const lectureData = {
        titleArabic: 'محاضرة بدون تاريخ'
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri).toBeUndefined();
      expect(result).toEqual(lectureData);
    });

    it('should convert empty string Hijri date', () => {
      const lectureData = {
        titleArabic: 'محاضرة',
        dateRecorded: new Date('2024-01-15'),
        dateRecordedHijri: '' // Empty string should trigger conversion
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri).toBeTruthy();
      expect(result.dateRecordedHijri).not.toBe('');
    });

    it('should convert whitespace-only Hijri date', () => {
      const lectureData = {
        titleArabic: 'محاضرة',
        dateRecorded: new Date('2024-01-15'),
        dateRecordedHijri: '   ' // Whitespace should trigger conversion
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri.trim()).toBeTruthy();
    });

    it('should preserve other lecture properties', () => {
      const lectureData = {
        titleArabic: 'محاضرة في العقيدة',
        titleEnglish: 'Aqeedah Lecture',
        sheikhId: '507f1f77bcf86cd799439011',
        category: 'Aqeedah',
        dateRecorded: new Date('2024-01-15')
      };

      const result = ensureHijriDate(lectureData);

      expect(result.titleArabic).toBe('محاضرة في العقيدة');
      expect(result.titleEnglish).toBe('Aqeedah Lecture');
      expect(result.sheikhId).toBe('507f1f77bcf86cd799439011');
      expect(result.category).toBe('Aqeedah');
    });

    it('should handle date string in dateRecorded', () => {
      const lectureData = {
        titleArabic: 'محاضرة',
        dateRecorded: '2024-06-15'
      };

      const result = ensureHijriDate(lectureData);

      expect(result.dateRecordedHijri).toBeTruthy();
    });
  });
});
