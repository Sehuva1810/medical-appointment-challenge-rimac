import { Test, TestingModule } from '@nestjs/testing';
import { GetAppointmentsByInsuredIdHandler } from '../../../src/application/handlers/get-appointments.handler';
import { GetAppointmentsByInsuredIdQuery } from '../../../src/application/queries/get-appointments.query';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '../../../src/domain/repositories/appointment.repository.interface';
import { Appointment } from '../../../src/domain/entities/appointment.entity';

describe('GetAppointmentsByInsuredIdHandler', () => {
  let handler: GetAppointmentsByInsuredIdHandler;
  let mockRepository: jest.Mocked<IAppointmentRepository>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByInsuredId: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAppointmentsByInsuredIdHandler,
        {
          provide: APPOINTMENT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAppointmentsByInsuredIdHandler>(GetAppointmentsByInsuredIdHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockAppointment = (overrides: Partial<{
    id: string;
    insuredId: string;
    scheduleId: number;
    countryISO: string;
    status: string;
  }> = {}): Appointment => {
    const defaults = {
      id: 'test-uuid-123',
      insuredId: '00001',
      scheduleId: 100,
      countryISO: 'PE',
      status: 'completed',
    };
    const data = { ...defaults, ...overrides };

    return Appointment.fromPersistence({
      id: data.id,
      insuredId: data.insuredId,
      scheduleId: data.scheduleId,
      countryISO: data.countryISO,
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('execute', () => {
    it('should return appointments for valid insuredId', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('00001');
      const mockAppointments = [
        createMockAppointment({ id: 'uuid-1' }),
        createMockAppointment({ id: 'uuid-2', scheduleId: 200 }),
      ];
      mockRepository.findByInsuredId.mockResolvedValue(mockAppointments);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.findByInsuredId).toHaveBeenCalledWith('00001');
    });

    it('should return empty array when no appointments found', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('00002');
      mockRepository.findByInsuredId.mockResolvedValue([]);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockRepository.findByInsuredId).toHaveBeenCalledWith('00002');
    });

    it('should throw error for invalid insuredId format', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('123'); // Invalid: not 5 digits

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow();
      expect(mockRepository.findByInsuredId).not.toHaveBeenCalled();
    });

    it('should throw error for non-numeric insuredId', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('abcde'); // Invalid: not numeric

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow();
    });

    it('should handle repository error', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('00001');
      mockRepository.findByInsuredId.mockRejectedValue(new Error('DynamoDB error'));

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('DynamoDB error');
    });

    it('should return appointments with correct properties', async () => {
      // Arrange
      const query = new GetAppointmentsByInsuredIdQuery('00001');
      const mockAppointment = createMockAppointment({
        id: 'test-uuid',
        insuredId: '00001',
        scheduleId: 150,
        countryISO: 'CL',
        status: 'pending',
      });
      mockRepository.findByInsuredId.mockResolvedValue([mockAppointment]);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].id).toBe('test-uuid');
      expect(result[0].insuredId.value).toBe('00001');
      expect(result[0].scheduleId).toBe(150);
      expect(result[0].countryISO.value).toBe('CL');
      expect(result[0].status.value).toBe('pending');
    });
  });
});
