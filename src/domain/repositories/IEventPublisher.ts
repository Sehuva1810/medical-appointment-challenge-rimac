export interface ConfirmationEvent {
  appointmentId: string;
  insuredId: string;
  countryISO: string;
  processedAt: string;
}

export interface IEventPublisher {
  publishConfirmation(event: ConfirmationEvent): Promise<void>;
}
