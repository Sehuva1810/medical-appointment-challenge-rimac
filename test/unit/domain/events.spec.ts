import {
  AppointmentCreatedEvent,
  AppointmentCompletedEvent,
  AppointmentFailedEvent,
} from '@domain/events/appointment.events';

describe('Domain Events', () => {
  describe('AppointmentCreatedEvent', () => {
    it('should create event with correct properties', () => {
      const event = new AppointmentCreatedEvent(
        'appt-123',
        '00001',
        100,
        'PE',
      );

      expect(event.aggregateId).toBe('appt-123');
      expect(event.eventType).toBe('appointment.created');
      expect(event.payload.insuredId).toBe('00001');
      expect(event.payload.scheduleId).toBe(100);
      expect(event.payload.countryISO).toBe('PE');
    });

    it('should have eventId and occurredOn', () => {
      const event = new AppointmentCreatedEvent('appt-123', '00001', 100, 'PE');

      expect(event.eventId).toBeDefined();
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should convert to EventBridge format', () => {
      const event = new AppointmentCreatedEvent('appt-123', '00001', 100, 'PE');
      const ebFormat = event.toEventBridgeFormat();

      expect(ebFormat.Source).toBe('medical-appointments');
      expect(ebFormat.DetailType).toBe('appointment.created');
      expect(ebFormat.Detail).toBeDefined();
    });
  });

  describe('AppointmentCompletedEvent', () => {
    it('should create event with correct type', () => {
      const event = new AppointmentCompletedEvent(
        'appt-456',
        '00002',
        200,
        'CL',
      );

      expect(event.eventType).toBe('appointment.completed');
      expect(event.aggregateId).toBe('appt-456');
    });
  });

  describe('AppointmentFailedEvent', () => {
    it('should create event with error message', () => {
      const event = new AppointmentFailedEvent(
        'appt-789',
        'PE',
        'Database connection failed',
      );

      expect(event.eventType).toBe('appointment.failed');
      expect(event.payload.error).toBe('Database connection failed');
      expect(event.payload.countryISO).toBe('PE');
    });
  });
});
