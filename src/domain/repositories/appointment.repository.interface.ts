import { Appointment } from '@domain/entities/appointment.entity';

/**
 * Interfaz del repositorio de citas para DynamoDB
 * Define el contrato para persistencia en el almacén principal
 *
 * Implementa el patrón Repository para abstraer la capa de persistencia
 * Sigue el principio de Inversión de Dependencias (DIP)
 */
export interface IAppointmentRepository {
  /**
   * Guarda una cita en DynamoDB
   * @param appointment - La entidad de cita a guardar
   */
  save(appointment: Appointment): Promise<void>;

  /**
   * Busca una cita por su ID
   * @param id - UUID de la cita
   * @returns La cita encontrada o null si no existe
   */
  findById(id: string): Promise<Appointment | null>;

  /**
   * Busca todas las citas de un asegurado
   * @param insuredId - ID del asegurado (5 dígitos)
   * @returns Lista de citas del asegurado
   */
  findByInsuredId(insuredId: string): Promise<Appointment[]>;

  /**
   * Actualiza el estado de una cita
   * @param id - UUID de la cita
   * @param status - Nuevo estado
   */
  updateStatus(id: string, status: string): Promise<void>;

  /**
   * Elimina una cita
   * @param id - UUID de la cita a eliminar
   */
  delete(id: string): Promise<void>;
}

/**
 * Token de inyección de dependencias
 */
export const APPOINTMENT_REPOSITORY = Symbol('IAppointmentRepository');
