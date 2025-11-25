export interface AppointmentMessage {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
}

export interface IMessagePublisher {
  publish(message: AppointmentMessage): Promise<void>;
}
