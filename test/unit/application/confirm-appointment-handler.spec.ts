import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmAppointmentHandler } from '@application/handlers/confirm-appointment.handler';
import { ConfirmAppointmentCommand } from '@application/commands/confirm-appointment.command';
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface';

describe('ConfirmAppointmentHandler', () => {
  let handler: ConfirmAppointmentHandler;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmAppointmentHandler,
        {
          provide: APPOINTMENT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<ConfirmAppointmentHandler>(ConfirmAppointmentHandler);
  });

  describe('execute', () => {
    it('should confirm appointment and update status to completed', async () => {
      const command = new ConfirmAppointmentCommand(
        'appt-123',
        '00001',
        100,
        'PE',
      );

      await handler.execute(command);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'appt-123',
        'completed',
      );
    });

    it('should handle appointments from different countries', async () => {
      const commandPE = new ConfirmAppointmentCommand('appt-pe', '00001', 100, 'PE');
      const commandCL = new ConfirmAppointmentCommand('appt-cl', '00002', 200, 'CL');

      await handler.execute(commandPE);
      await handler.execute(commandCL);

      expect(mockRepository.updateStatus).toHaveBeenCalledTimes(2);
    });
  });
});
