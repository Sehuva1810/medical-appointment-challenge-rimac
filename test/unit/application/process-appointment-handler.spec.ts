import { Test, TestingModule } from '@nestjs/testing';
import { ProcessAppointmentHandler } from '@application/handlers/process-appointment.handler';
import { ProcessAppointmentCommand } from '@application/commands/process-appointment.command';
import { MYSQL_APPOINTMENT_REPOSITORY } from '@domain/repositories/mysql-appointment.repository.interface';
import { EVENT_PUBLISHER } from '@domain/repositories/event-publisher.interface';

describe('ProcessAppointmentHandler', () => {
  let handler: ProcessAppointmentHandler;
  let mockMySQLFactory: any;
  let mockEventPublisher: any;
  let mockMySQLRepo: any;

  beforeEach(async () => {
    mockMySQLRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockMySQLFactory = {
      getRepository: jest.fn().mockReturnValue(mockMySQLRepo),
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessAppointmentHandler,
        {
          provide: MYSQL_APPOINTMENT_REPOSITORY,
          useValue: mockMySQLFactory,
        },
        {
          provide: EVENT_PUBLISHER,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<ProcessAppointmentHandler>(ProcessAppointmentHandler);
  });

  describe('execute', () => {
    it('should process appointment for Peru', async () => {
      const command = new ProcessAppointmentCommand(
        'test-id-123',
        '00001',
        100,
        'PE',
      );

      await handler.execute(command);

      expect(mockMySQLFactory.getRepository).toHaveBeenCalled();
      expect(mockMySQLRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should process appointment for Chile', async () => {
      const command = new ProcessAppointmentCommand(
        'test-id-456',
        '00002',
        200,
        'CL',
      );

      await handler.execute(command);

      expect(mockMySQLFactory.getRepository).toHaveBeenCalled();
      expect(mockMySQLRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should publish AppointmentCompletedEvent', async () => {
      const command = new ProcessAppointmentCommand(
        'test-id-789',
        '00003',
        300,
        'PE',
      );

      await handler.execute(command);

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: 'test-id-789',
          eventType: 'appointment.completed',
        }),
      );
    });
  });
});
