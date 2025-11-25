import { CreateAppointmentUseCase } from '../../../src/application/use-cases/CreateAppointmentUseCase';
import { IAppointmentRepository } from '../../../src/domain/repositories/IAppointmentRepository';
import { IMessagePublisher } from '../../../src/domain/repositories/IMessagePublisher';
import { Appointment } from '../../../src/domain/entities/Appointment';
import { ValidationError } from '../../../src/shared/errors/ValidationError';

describe('CreateAppointmentUseCase', () => {
  let useCase: CreateAppointmentUseCase;
  let mockRepository: jest.Mocked<IAppointmentRepository>;
  let mockPublisher: jest.Mocked<IMessagePublisher>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByInsuredId: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new CreateAppointmentUseCase(mockRepository, mockPublisher);
  });

  describe('execute', () => {
    const validDto = {
      insuredId: '12345',
      scheduleId: 100,
      countryISO: 'PE',
    };

    it('should create an appointment and return success message', async () => {
      const result = await useCase.execute(validDto);

      expect(result.message).toBe('Appointment scheduling is in process');
      expect(result.appointmentId).toBeDefined();
      expect(typeof result.appointmentId).toBe('string');
    });

    it('should save the appointment to the repository', async () => {
      await useCase.execute(validDto);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            scheduleId: validDto.scheduleId,
          }),
        })
      );
    });

    it('should publish message to SNS', async () => {
      const result = await useCase.execute(validDto);

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        appointmentId: result.appointmentId,
        insuredId: validDto.insuredId,
        scheduleId: validDto.scheduleId,
        countryISO: validDto.countryISO,
      });
    });

    it('should work with Chile country code', async () => {
      const chileDto = { ...validDto, countryISO: 'CL' };

      const result = await useCase.execute(chileDto);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          countryISO: 'CL',
        })
      );
      expect(result.appointmentId).toBeDefined();
    });

    it('should throw ValidationError for invalid insuredId', async () => {
      const invalidDto = { ...validDto, insuredId: '123' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(ValidationError);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid countryISO', async () => {
      const invalidDto = { ...validDto, countryISO: 'US' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(ValidationError);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      mockRepository.save.mockRejectedValue(error);

      await expect(useCase.execute(validDto)).rejects.toThrow('Database error');
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should propagate publisher errors', async () => {
      const error = new Error('SNS error');
      mockPublisher.publish.mockRejectedValue(error);

      await expect(useCase.execute(validDto)).rejects.toThrow('SNS error');
    });
  });
});
