import { GetAppointmentsByInsuredIdUseCase } from '../../../src/application/use-cases/GetAppointmentsByInsuredIdUseCase';
import { IAppointmentRepository } from '../../../src/domain/repositories/IAppointmentRepository';
import { Appointment } from '../../../src/domain/entities/Appointment';
import { AppointmentStatus } from '../../../src/domain/value-objects/AppointmentStatus';
import { ValidationError } from '../../../src/shared/errors/ValidationError';

describe('GetAppointmentsByInsuredIdUseCase', () => {
  let useCase: GetAppointmentsByInsuredIdUseCase;
  let mockRepository: jest.Mocked<IAppointmentRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByInsuredId: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new GetAppointmentsByInsuredIdUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return appointments for a valid insuredId', async () => {
      const appointments = [
        Appointment.create({
          appointmentId: 'id-1',
          insuredId: '12345',
          scheduleId: 100,
          countryISO: 'PE',
        }),
        Appointment.create({
          appointmentId: 'id-2',
          insuredId: '12345',
          scheduleId: 101,
          countryISO: 'PE',
        }),
      ];

      mockRepository.findByInsuredId.mockResolvedValue(appointments);

      const result = await useCase.execute('12345');

      expect(result.total).toBe(2);
      expect(result.appointments).toHaveLength(2);
      expect(result.appointments[0].insuredId).toBe('12345');
      expect(result.appointments[0].status).toBe(AppointmentStatus.PENDING);
    });

    it('should return empty array when no appointments found', async () => {
      mockRepository.findByInsuredId.mockResolvedValue([]);

      const result = await useCase.execute('12345');

      expect(result.total).toBe(0);
      expect(result.appointments).toHaveLength(0);
    });

    it('should throw ValidationError for invalid insuredId', async () => {
      await expect(useCase.execute('123')).rejects.toThrow(ValidationError);
      expect(mockRepository.findByInsuredId).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for non-numeric insuredId', async () => {
      await expect(useCase.execute('abcde')).rejects.toThrow(ValidationError);
      expect(mockRepository.findByInsuredId).not.toHaveBeenCalled();
    });

    it('should accept insuredId with leading zeros', async () => {
      mockRepository.findByInsuredId.mockResolvedValue([]);

      const result = await useCase.execute('00001');

      expect(mockRepository.findByInsuredId).toHaveBeenCalledWith('00001');
      expect(result.total).toBe(0);
    });

    it('should return appointments with correct DTO format', async () => {
      const appointment = Appointment.create({
        appointmentId: 'id-1',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'CL',
      });

      mockRepository.findByInsuredId.mockResolvedValue([appointment]);

      const result = await useCase.execute('12345');

      const dto = result.appointments[0];
      expect(dto).toHaveProperty('appointmentId');
      expect(dto).toHaveProperty('insuredId');
      expect(dto).toHaveProperty('scheduleId');
      expect(dto).toHaveProperty('countryISO');
      expect(dto).toHaveProperty('status');
      expect(dto).toHaveProperty('createdAt');
      expect(dto).toHaveProperty('updatedAt');
      expect(dto.countryISO).toBe('CL');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findByInsuredId.mockRejectedValue(error);

      await expect(useCase.execute('12345')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
