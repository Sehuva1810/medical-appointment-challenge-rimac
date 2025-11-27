import {
  ValidationException,
  NotFoundException,
  BusinessRuleViolationException,
  InfrastructureException,
} from '@domain/exceptions/domain.exception';

describe('Domain Exceptions', () => {
  describe('ValidationException', () => {
    it('should create with field and constraints', () => {
      const exception = new ValidationException(
        'Invalid insured ID',
        'insuredId',
        ['must be 5 digits'],
      );

      expect(exception.message).toBe('Invalid insured ID');
      expect(exception.code).toBe('VALIDATION_ERROR');
      expect(exception.field).toBe('insuredId');
      expect(exception.constraints).toContain('must be 5 digits');
    });

    it('should convert to JSON', () => {
      const exception = new ValidationException('Error', 'field', ['constraint']);
      const json = exception.toJSON();

      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Error');
    });

    it('should have timestamp', () => {
      const exception = new ValidationException('Error', 'field', []);
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('NotFoundException', () => {
    it('should create with resource info', () => {
      const exception = new NotFoundException('Appointment', 'appt-123');

      expect(exception.code).toBe('NOT_FOUND');
      expect(exception.resourceType).toBe('Appointment');
      expect(exception.resourceId).toBe('appt-123');
      expect(exception.message).toContain('appt-123');
    });
  });

  describe('BusinessRuleViolationException', () => {
    it('should create with rule name', () => {
      const exception = new BusinessRuleViolationException(
        'appointment_cancellation',
        'Cannot cancel completed appointment',
      );

      expect(exception.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(exception.ruleName).toBe('appointment_cancellation');
    });
  });

  describe('InfrastructureException', () => {
    it('should create with service name', () => {
      const exception = new InfrastructureException(
        'DynamoDB',
        'Database connection failed',
      );

      expect(exception.code).toBe('INFRASTRUCTURE_ERROR');
      expect(exception.service).toBe('DynamoDB');
    });

    it('should store original error', () => {
      const originalError = new Error('Original');
      const exception = new InfrastructureException(
        'DynamoDB',
        'Failed',
        originalError,
      );

      expect(exception.originalError).toBe(originalError);
    });
  });
});
