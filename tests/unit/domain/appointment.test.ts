import { Appointment } from '../../../src/domain/entities/Appointment';
import { AppointmentStatus } from '../../../src/domain/value-objects/AppointmentStatus';
import { ValidationError } from '../../../src/shared/errors/ValidationError';

describe('Appointment Entity', () => {
  const validParams = {
    appointmentId: '123e4567-e89b-12d3-a456-426614174000',
    insuredId: '12345',
    scheduleId: 100,
    countryISO: 'PE',
  };

  describe('create', () => {
    it('should create a valid appointment with pending status', () => {
      const appointment = Appointment.create(validParams);

      expect(appointment.appointmentId).toBe(validParams.appointmentId);
      expect(appointment.insuredId.value).toBe(validParams.insuredId);
      expect(appointment.scheduleId).toBe(validParams.scheduleId);
      expect(appointment.countryISO.value).toBe(validParams.countryISO);
      expect(appointment.status).toBe(AppointmentStatus.PENDING);
      expect(appointment.createdAt).toBeInstanceOf(Date);
      expect(appointment.updatedAt).toBeInstanceOf(Date);
    });

    it('should create appointment for Peru', () => {
      const appointment = Appointment.create({
        ...validParams,
        countryISO: 'PE',
      });

      expect(appointment.countryISO.isPeru()).toBe(true);
      expect(appointment.countryISO.isChile()).toBe(false);
    });

    it('should create appointment for Chile', () => {
      const appointment = Appointment.create({
        ...validParams,
        countryISO: 'CL',
      });

      expect(appointment.countryISO.isChile()).toBe(true);
      expect(appointment.countryISO.isPeru()).toBe(false);
    });

    it('should throw ValidationError for invalid insuredId', () => {
      expect(() =>
        Appointment.create({
          ...validParams,
          insuredId: '123', // Invalid - must be 5 digits
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid countryISO', () => {
      expect(() =>
        Appointment.create({
          ...validParams,
          countryISO: 'US', // Invalid - must be PE or CL
        })
      ).toThrow(ValidationError);
    });
  });

  describe('markAsCompleted', () => {
    it('should update status to completed', () => {
      const appointment = Appointment.create(validParams);
      const originalUpdatedAt = appointment.updatedAt;

      // Small delay to ensure updatedAt changes
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      appointment.markAsCompleted();

      expect(appointment.status).toBe(AppointmentStatus.COMPLETED);
      expect(appointment.isCompleted()).toBe(true);
      expect(appointment.isPending()).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('markAsFailed', () => {
    it('should update status to failed', () => {
      const appointment = Appointment.create(validParams);

      appointment.markAsFailed();

      expect(appointment.status).toBe(AppointmentStatus.FAILED);
      expect(appointment.isCompleted()).toBe(false);
      expect(appointment.isPending()).toBe(false);
    });
  });

  describe('isPending', () => {
    it('should return true for new appointments', () => {
      const appointment = Appointment.create(validParams);
      expect(appointment.isPending()).toBe(true);
    });

    it('should return false after completion', () => {
      const appointment = Appointment.create(validParams);
      appointment.markAsCompleted();
      expect(appointment.isPending()).toBe(false);
    });
  });

  describe('isCompleted', () => {
    it('should return false for new appointments', () => {
      const appointment = Appointment.create(validParams);
      expect(appointment.isCompleted()).toBe(false);
    });

    it('should return true after completion', () => {
      const appointment = Appointment.create(validParams);
      appointment.markAsCompleted();
      expect(appointment.isCompleted()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return a valid JSON representation', () => {
      const appointment = Appointment.create(validParams);
      const json = appointment.toJSON();

      expect(json.appointmentId).toBe(validParams.appointmentId);
      expect(json.insuredId).toBe(validParams.insuredId);
      expect(json.scheduleId).toBe(validParams.scheduleId);
      expect(json.countryISO).toBe(validParams.countryISO);
      expect(json.status).toBe(AppointmentStatus.PENDING);
      expect(typeof json.createdAt).toBe('string');
      expect(typeof json.updatedAt).toBe('string');
    });
  });
});
