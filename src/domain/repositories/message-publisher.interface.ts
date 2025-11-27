/**
 * Mensaje para publicar en SNS
 */
export interface AppointmentMessage {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  status: string;
  createdAt: string;
}

/**
 * Interfaz para publicador de mensajes
 * Abstrae la comunicación con SNS para enrutamiento por país
 */
export interface IMessagePublisher {
  /**
   * Publica un mensaje de cita en SNS
   * El mensaje será filtrado por countryISO para enrutarse al SQS correcto
   * @param message - El mensaje de la cita
   */
  publish(message: AppointmentMessage): Promise<void>;
}

/**
 * Token de inyección de dependencias
 */
export const MESSAGE_PUBLISHER = Symbol('IMessagePublisher');
