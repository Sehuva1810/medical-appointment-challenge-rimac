import { InsuredId } from '../../../src/domain/value-objects/InsuredId';
import { CountryISO, CountryCode } from '../../../src/domain/value-objects/CountryISO';
import { AppointmentStatus } from '../../../src/domain/value-objects/AppointmentStatus';
import { ValidationError } from '../../../src/shared/errors/ValidationError';

describe('InsuredId Value Object', () => {
  describe('create', () => {
    it('should create a valid InsuredId with 5 digits', () => {
      const insuredId = InsuredId.create('12345');
      expect(insuredId.value).toBe('12345');
    });

    it('should create a valid InsuredId with leading zeros', () => {
      const insuredId = InsuredId.create('00001');
      expect(insuredId.value).toBe('00001');
    });

    it('should trim whitespace from value', () => {
      const insuredId = InsuredId.create('  12345  ');
      expect(insuredId.value).toBe('12345');
    });

    it('should throw ValidationError for empty value', () => {
      expect(() => InsuredId.create('')).toThrow(ValidationError);
      expect(() => InsuredId.create('')).toThrow('InsuredId is required');
    });

    it('should throw ValidationError for less than 5 digits', () => {
      expect(() => InsuredId.create('1234')).toThrow(ValidationError);
      expect(() => InsuredId.create('1234')).toThrow(
        'InsuredId must be exactly 5 digits'
      );
    });

    it('should throw ValidationError for more than 5 digits', () => {
      expect(() => InsuredId.create('123456')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-numeric characters', () => {
      expect(() => InsuredId.create('1234a')).toThrow(ValidationError);
      expect(() => InsuredId.create('abcde')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('should return true for equal InsuredIds', () => {
      const id1 = InsuredId.create('12345');
      const id2 = InsuredId.create('12345');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different InsuredIds', () => {
      const id1 = InsuredId.create('12345');
      const id2 = InsuredId.create('12346');
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const insuredId = InsuredId.create('00123');
      expect(insuredId.toString()).toBe('00123');
    });
  });
});

describe('CountryISO Value Object', () => {
  describe('create', () => {
    it('should create a valid CountryISO for PE', () => {
      const countryISO = CountryISO.create('PE');
      expect(countryISO.value).toBe(CountryCode.PERU);
    });

    it('should create a valid CountryISO for CL', () => {
      const countryISO = CountryISO.create('CL');
      expect(countryISO.value).toBe(CountryCode.CHILE);
    });

    it('should accept lowercase values', () => {
      const pe = CountryISO.create('pe');
      const cl = CountryISO.create('cl');
      expect(pe.value).toBe(CountryCode.PERU);
      expect(cl.value).toBe(CountryCode.CHILE);
    });

    it('should trim whitespace', () => {
      const countryISO = CountryISO.create('  PE  ');
      expect(countryISO.value).toBe(CountryCode.PERU);
    });

    it('should throw ValidationError for empty value', () => {
      expect(() => CountryISO.create('')).toThrow(ValidationError);
      expect(() => CountryISO.create('')).toThrow('CountryISO is required');
    });

    it('should throw ValidationError for invalid country code', () => {
      expect(() => CountryISO.create('US')).toThrow(ValidationError);
      expect(() => CountryISO.create('US')).toThrow(
        "CountryISO must be either 'PE' or 'CL'"
      );
    });
  });

  describe('isPeru', () => {
    it('should return true for PE', () => {
      const countryISO = CountryISO.create('PE');
      expect(countryISO.isPeru()).toBe(true);
    });

    it('should return false for CL', () => {
      const countryISO = CountryISO.create('CL');
      expect(countryISO.isPeru()).toBe(false);
    });
  });

  describe('isChile', () => {
    it('should return true for CL', () => {
      const countryISO = CountryISO.create('CL');
      expect(countryISO.isChile()).toBe(true);
    });

    it('should return false for PE', () => {
      const countryISO = CountryISO.create('PE');
      expect(countryISO.isChile()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal CountryISOs', () => {
      const iso1 = CountryISO.create('PE');
      const iso2 = CountryISO.create('PE');
      expect(iso1.equals(iso2)).toBe(true);
    });

    it('should return false for different CountryISOs', () => {
      const iso1 = CountryISO.create('PE');
      const iso2 = CountryISO.create('CL');
      expect(iso1.equals(iso2)).toBe(false);
    });
  });
});

describe('AppointmentStatus Enum', () => {
  it('should have PENDING status', () => {
    expect(AppointmentStatus.PENDING).toBe('pending');
  });

  it('should have COMPLETED status', () => {
    expect(AppointmentStatus.COMPLETED).toBe('completed');
  });

  it('should have FAILED status', () => {
    expect(AppointmentStatus.FAILED).toBe('failed');
  });
});
