export * from './create-appointment.handler';
export * from './process-appointment.handler';
export * from './confirm-appointment.handler';
export * from './get-appointments.handler';
export * from './get-appointment-by-id.handler';

import { CreateAppointmentHandler } from './create-appointment.handler';
import { ProcessAppointmentHandler } from './process-appointment.handler';
import { ConfirmAppointmentHandler } from './confirm-appointment.handler';
import { GetAppointmentsByInsuredIdHandler } from './get-appointments.handler';
import { GetAppointmentByIdHandler } from './get-appointment-by-id.handler';

/**
 * Lista de todos los Command y Query Handlers para registro en el módulo
 */
export const CommandHandlers = [
  CreateAppointmentHandler,
  ProcessAppointmentHandler,
  ConfirmAppointmentHandler,
];

export const QueryHandlers = [
  GetAppointmentsByInsuredIdHandler,
  GetAppointmentByIdHandler,
];

export const AllHandlers = [...CommandHandlers, ...QueryHandlers];
