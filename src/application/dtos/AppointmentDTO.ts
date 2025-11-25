// DTOs de solicitud
export interface CreateAppointmentDTO {
  insuredId: string;
  scheduleId: number;
  countryISO: string;
}

// DTOs de respuesta
export interface AppointmentResponseDTO {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentResponseDTO {
  message: string;
  appointmentId: string;
}

export interface GetAppointmentsResponseDTO {
  appointments: AppointmentResponseDTO[];
  total: number;
}
