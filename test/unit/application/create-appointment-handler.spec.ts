import { Test, TestingModule } from '@nestjs/testing';
import { CreateAppointmentHandler } from '../../../src/application/handlers/create-appointment.handler';
import { CreateAppointmentCommand } from '../../../src/application/commands/create-appointment.command';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '../../../src/domain/repositories/appointment.repository.interface';
import {
  IMessagePublisher,
  MESSAGE_PUBLISHER,
} from '../../../src/domain/repositories/message-publisher.interface';
import { Appointment } from '../../../src/domain/entities/appointment.entity';

describe('CreateAppointmentHandler', () => {
  let handler: CreateAppointmentHandler;
  let mockRepository: jest.Mocked<IAppointmentRepository>;
  let mockPublisher: jest.Mocked<IMessagePublisher>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByInsuredId: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    };

    mockPublisher = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAppointmentHandler,
        {
          provide: APPOINTMENT_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: MESSAGE_PUBLISHER,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    handler = module.get<CreateAppointmentHandler>(CreateAppointmentHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create appointment and publish message for PE', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', 100, 'PE');
      mockRepository.save.mockResolvedValue(undefined);
      mockPublisher.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.appointmentId).toBeDefined();
      expect(result.message).toBe('Appointment scheduling is in process');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);

      // Verify the published message contains correct country
      const publishCall = mockPublisher.publish.mock.calls[0][0];
      expect(publishCall.countryISO).toBe('PE');
    });

    it('should create appointment and publish message for CL', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00002', 200, 'CL');
      mockRepository.save.mockResolvedValue(undefined);
      mockPublisher.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.appointmentId).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalledTimes(1);

      const publishCall = mockPublisher.publish.mock.calls[0][0];
      expect(publishCall.countryISO).toBe('CL');
    });

    it('should throw error for invalid insuredId', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('123', 100, 'PE'); // Invalid: not 5 digits

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should throw error for invalid countryISO', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', 100, 'US'); // Invalid country

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for invalid scheduleId', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', -1, 'PE'); // Invalid: negative

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', 100, 'PE');
      mockRepository.save.mockRejectedValue(new Error('DynamoDB error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('DynamoDB error');
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should handle publisher failure after save', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', 100, 'PE');
      mockRepository.save.mockResolvedValue(undefined);
      mockPublisher.publish.mockRejectedValue(new Error('SNS error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('SNS error');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should save appointment with pending status', async () => {
      // Arrange
      const command = new CreateAppointmentCommand('00001', 100, 'PE');
      mockRepository.save.mockResolvedValue(undefined);
      mockPublisher.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      const savedAppointment = mockRepository.save.mock.calls[0][0] as Appointment;
      expect(savedAppointment.status.value).toBe('pending');
    });
  });
});
