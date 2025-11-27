import { Appointment } from '@domain/entities/appointment.entity';

/**
 * Interfaz del repositorio de citas para MySQL (RDS)
 * Define el contrato para persistencia en las bases de datos por país
 *
 * Cada país (PE, CL) tiene su propia base de datos MySQL
 * Esta interfaz define las operaciones disponibles en ambas
 */
export interface IMySQLAppointmentRepository {
  /**
   * Guarda una cita en la base de datos MySQL del país correspondiente
   * @param appointment - La entidad de cita a guardar
   */
  save(appointment: Appointment): Promise<void>;

  /**
   * Busca una cita por su ID en MySQL
   * @param id - UUID de la cita
   * @returns La cita encontrada o null si no existe
   */
  findById(id: string): Promise<Appointment | null>;

  /**
   * Busca todas las citas de un asegurado en MySQL
   * @param insuredId - ID del asegurado
   * @returns Lista de citas del asegurado
   */
  findByInsuredId(insuredId: string): Promise<Appointment[]>;

  /**
   * Verifica la conectividad con la base de datos
   * @returns true si la conexión es exitosa
   */
  healthCheck(): Promise<boolean>;

  /**
   * Cierra las conexiones activas
   */
  disconnect(): Promise<void>;
}

/**
 * Token de inyección de dependencias
 */
export const MYSQL_APPOINTMENT_REPOSITORY = Symbol('IMySQLAppointmentRepository');
