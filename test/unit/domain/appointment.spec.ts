import { Appointment } from '@domain/entities/appointment.entity';
import { ValidationException, BusinessRuleViolationException } from '@domain/exceptions/domain.exception';
import { AppointmentStatusEnum } from '@domain/value-objects/appointment-status.vo';

describe('Appointment Entity', () => {
  describe('create', () => {
    it('debe crear una cita válida con todos los campos', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      expect(appointment.id).toBeDefined();
      expect(appointment.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(appointment.insuredId.value).toBe('00001');
      expect(appointment.scheduleId).toBe(100);
      expect(appointment.countryISO.value).toBe('PE');
      expect(appointment.status.value).toBe(AppointmentStatusEnum.PENDING);
      expect(appointment.createdAt).toBeInstanceOf(Date);
      expect(appointment.updatedAt).toBeInstanceOf(Date);
    });

    it('debe crear cita para Chile', () => {
      const appointment = Appointment.create({
        insuredId: '12345',
        scheduleId: 200,
        countryISO: 'CL',
      });

      expect(appointment.countryISO.value).toBe('CL');
      expect(appointment.countryISO.isChile()).toBe(true);
    });

    it('debe lanzar error si scheduleId es 0', () => {
      expect(() =>
        Appointment.create({
          insuredId: '00001',
          scheduleId: 0,
          countryISO: 'PE',
        }),
      ).toThrow(ValidationException);
    });

    it('debe lanzar error si scheduleId es negativo', () => {
      expect(() =>
        Appointment.create({
          insuredId: '00001',
          scheduleId: -1,
          countryISO: 'PE',
        }),
      ).toThrow(ValidationException);
    });

    it('debe lanzar error si insuredId es inválido', () => {
      expect(() =>
        Appointment.create({
          insuredId: '123', // Solo 3 dígitos
          scheduleId: 100,
          countryISO: 'PE',
        }),
      ).toThrow(ValidationException);
    });

    it('debe lanzar error si countryISO no es soportado', () => {
      expect(() =>
        Appointment.create({
          insuredId: '00001',
          scheduleId: 100,
          countryISO: 'US',
        }),
      ).toThrow(ValidationException);
    });
  });

  describe('fromPersistence', () => {
    it('debe reconstruir una cita desde datos de persistencia', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:31:00.000Z',
      };

      const appointment = Appointment.fromPersistence(data);

      expect(appointment.id).toBe(data.id);
      expect(appointment.insuredId.value).toBe(data.insuredId);
      expect(appointment.scheduleId).toBe(data.scheduleId);
      expect(appointment.countryISO.value).toBe(data.countryISO);
      expect(appointment.status.value).toBe(AppointmentStatusEnum.COMPLETED);
    });
  });

  describe('transiciones de estado', () => {
    it('debe transicionar de pending a processing', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      expect(appointment.status.isPending()).toBe(true);

      appointment.markAsProcessing();

      expect(appointment.status.isProcessing()).toBe(true);
    });

    it('debe transicionar de processing a completed', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      appointment.markAsProcessing();
      appointment.markAsCompleted();

      expect(appointment.status.isCompleted()).toBe(true);
    });

    it('debe transicionar de processing a failed', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      appointment.markAsProcessing();
      appointment.markAsFailed();

      expect(appointment.status.isFailed()).toBe(true);
    });

    it('debe permitir cancelar desde pending', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      appointment.cancel();

      expect(appointment.status.isCancelled()).toBe(true);
    });

    it('debe permitir retry desde failed', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      appointment.markAsProcessing();
      appointment.markAsFailed();
      appointment.retry();

      expect(appointment.status.isPending()).toBe(true);
    });

    it('NO debe permitir completed directamente desde pending', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      expect(() => appointment.markAsCompleted()).toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('actualización de updatedAt', () => {
    it('debe actualizar updatedAt en transiciones de estado', async () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      const originalUpdatedAt = appointment.updatedAt;

      // Esperar un tick para que el tiempo cambie
      await new Promise(resolve => setTimeout(resolve, 10));

      appointment.markAsProcessing();

      expect(appointment.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('equals', () => {
    it('debe ser igual a otra cita con el mismo ID', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const appointment1 = Appointment.fromPersistence(data);
      const appointment2 = Appointment.fromPersistence(data);

      expect(appointment1.equals(appointment2)).toBe(true);
    });

    it('debe ser diferente a otra cita con diferente ID', () => {
      const appointment1 = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      const appointment2 = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      expect(appointment1.equals(appointment2)).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('debe convertir la entidad a formato de persistencia', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      const persistence = appointment.toPersistence();

      expect(persistence).toEqual({
        id: appointment.id,
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('toDTO', () => {
    it('debe convertir la entidad a DTO', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      const dto = appointment.toDTO();

      expect(dto).toEqual({
        appointmentId: appointment.id,
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('toString', () => {
    it('debe generar representación string legible', () => {
      const appointment = Appointment.create({
        insuredId: '00001',
        scheduleId: 100,
        countryISO: 'PE',
      });

      const str = appointment.toString();

      expect(str).toContain('Appointment');
      expect(str).toContain(appointment.id);
      expect(str).toContain('00001');
      expect(str).toContain('PE');
      expect(str).toContain('pending');
    });
  });
});
